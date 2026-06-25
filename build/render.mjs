// Renderiza output/<slug>.html -> output/<slug>.pdf (A4) + checagem de overflow.
//   node build/render.mjs            -> renderiza todos os cardápios do registro
//   node build/render.mjs executivo  -> renderiza só esse
import puppeteer from 'puppeteer-core';
import { existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { listMenus } from './menu-data.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const OUTDIR = join(ROOT, 'output');
const CHROME = process.env.CHROME_PATH || join(ROOT, 'chrome/linux-150.0.7871.24/chrome-linux64/chrome');

const arg = process.argv[2];
const registry = listMenus();
const eventoSlugs = new Set(registry.filter((x) => x.type === 'evento').map((x) => x.slug));
const slugs = (arg ? [arg] : registry.map((x) => x.slug))
  .filter((s) => !eventoSlugs.has(s))
  .filter((s) => existsSync(join(OUTDIR, `${s}.html`)));

const browser = await puppeteer.launch({
  executablePath: CHROME,
  headless: 'new',
  args: ['--no-sandbox', '--disable-setuid-sandbox', '--font-render-hinting=none'],
});

let anyBad = false;
for (const slug of slugs) {
  const page = await browser.newPage();
  await page.setViewport({ width: 900, height: 1300, deviceScaleFactor: 2 });
  await page.goto('file://' + join(OUTDIR, `${slug}.html`), { waitUntil: 'networkidle0', timeout: 60000 });
  try { await page.evaluateHandle('document.fonts.ready'); } catch {}
  await new Promise((r) => setTimeout(r, 1500)); // Google Fonts

  await page.emulateMediaType('print');
  await page.pdf({ path: join(OUTDIR, `${slug}.pdf`), format: 'A4', printBackground: true });

  const info = await page.$$eval('.page', (els) =>
    els.map((el) => {
      const pc = el.querySelector('.pc'); const flow = el.querySelector('.flow');
      return { fill: pc && flow ? Math.round(flow.getBoundingClientRect().height / pc.clientHeight * 100) : 0,
        overflow: flow && pc ? flow.scrollHeight > pc.clientHeight + 2 : false };
    })
  );
  const bad = info.filter((p) => p.overflow).length;
  if (bad) anyBad = true;
  console.log(`${slug.padEnd(12)} -> output/${slug}.pdf | ${info.length} págs, preenchimento [${info.map((p) => p.fill + '%').join(', ')}]${bad ? `  <<< ${bad} OVERFLOW` : ''}`);
  await page.close();
}

await browser.close();
console.log(anyBad ? 'AVISO: há páginas com overflow.' : 'OK: sem overflow.');
