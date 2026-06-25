// Renderiza cardapio.html -> PDF (A4) + PNGs de páginas para verificação visual.
import puppeteer from 'puppeteer-core';
import { writeFileSync, mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const CHROME = process.env.CHROME_PATH || join(ROOT, 'chrome/linux-150.0.7871.24/chrome-linux64/chrome');
const OUT = join(ROOT, 'build/preview');
mkdirSync(OUT, { recursive: true });

const browser = await puppeteer.launch({
  executablePath: CHROME,
  headless: 'new',
  args: ['--no-sandbox', '--disable-setuid-sandbox', '--font-render-hinting=none'],
});
const page = await browser.newPage();
await page.setViewport({ width: 900, height: 1300, deviceScaleFactor: 2 });
const url = 'file://' + join(ROOT, 'cardapio.html');
await page.goto(url, { waitUntil: 'networkidle0', timeout: 60000 });
try { await page.evaluateHandle('document.fonts.ready'); } catch {}
await new Promise((r) => setTimeout(r, 1500)); // Google Fonts

// PDF print (A4 real, com fundo)
await page.emulateMediaType('print');
await page.pdf({ path: join(ROOT, 'cardapio.pdf'), format: 'A4', printBackground: true });

// checagem de overflow: conteúdo (.flow) não pode exceder a área útil (.pc)
const info = await page.$$eval('.page', (els) =>
  els.map((el, i) => {
    const pc = el.querySelector('.pc');
    const flow = el.querySelector('.flow');
    const fill = pc && flow ? flow.getBoundingClientRect().height / pc.clientHeight : 0;
    const overflow = flow && pc ? flow.scrollHeight > pc.clientHeight + 2 : false;
    return { i: i + 1, fill: Math.round(fill * 100), overflow };
  })
);

// screenshots por página (mídia print p/ bater com o PDF)
const handles = await page.$$('.page');
for (let i = 0; i < handles.length; i++) {
  await handles[i].screenshot({ path: join(OUT, `page-${String(i + 1).padStart(2, '0')}.png`) });
}

writeFileSync(join(OUT, 'report.json'), JSON.stringify(info, null, 2));
const bad = info.filter((p) => p.overflow);
console.log(`Páginas: ${info.length}`);
info.forEach((p) => console.log(`  pág ${String(p.i).padStart(2)} — preenchimento ${p.fill}%${p.overflow ? '  <<< OVERFLOW' : ''}`));
console.log(bad.length ? `AVISO: ${bad.length} página(s) com overflow.` : 'OK: sem overflow.');
await browser.close();
