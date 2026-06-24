// Renderiza cardapio.html -> PDF (A4) + PNGs de páginas para verificação visual.
import puppeteer from 'puppeteer-core';
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const CHROME = join(ROOT, 'chrome/linux-150.0.7871.24/chrome-linux64/chrome');
const OUT = join(ROOT, 'build/preview');
mkdirSync(OUT, { recursive: true });

const browser = await puppeteer.launch({
  executablePath: CHROME,
  headless: 'new',
  args: ['--no-sandbox', '--disable-setuid-sandbox', '--font-render-hinting=none'],
});
const page = await browser.newPage();
await page.setViewport({ width: 820, height: 1160, deviceScaleFactor: 2 });
const url = 'file://' + join(ROOT, 'cardapio.html');
await page.goto(url, { waitUntil: 'networkidle0', timeout: 60000 });
await new Promise((r) => setTimeout(r, 1200)); // fontes typekit

// PDF print
await page.pdf({
  path: join(ROOT, 'cardapio.pdf'),
  width: '794px', height: '1123px', printBackground: true, pageRanges: '',
});

// screenshots por página + checagem de overflow real
const info = await page.$$eval('.page', (els) =>
  els.map((el, i) => {
    const body = el.querySelector('.page-body');
    const foot = el.querySelector('.page-foot');
    const bodyBottom = body ? body.getBoundingClientRect().bottom - el.getBoundingClientRect().top : 0;
    const footTop = foot ? foot.getBoundingClientRect().top - el.getBoundingClientRect().top : 1123;
    return { i: i + 1, scrollH: el.scrollHeight, clientH: el.clientHeight,
      bodyBottom: Math.round(bodyBottom), footTop: Math.round(footTop),
      overflow: el.scrollHeight > el.clientHeight + 1 || bodyBottom > footTop - 4 };
  })
);

const handles = await page.$$('.page');
for (let i = 0; i < handles.length; i++) {
  await handles[i].screenshot({ path: join(OUT, `page-${String(i + 1).padStart(2, '0')}.png`) });
}

writeFileSync(join(OUT, 'report.json'), JSON.stringify(info, null, 2));
const bad = info.filter((p) => p.overflow);
console.log(`Páginas: ${info.length}`);
info.forEach((p) => console.log(`  pág ${String(p.i).padStart(2)} — corpo termina em ${p.bodyBottom}px (rodapé em ${p.footTop}px)${p.overflow ? '  <<< OVERFLOW' : ''}`));
console.log(bad.length ? `AVISO: ${bad.length} página(s) com overflow real.` : 'OK: sem overflow real.');
await browser.close();
