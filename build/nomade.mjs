// ---------------------------------------------------------------------------
// Nômade Bar & Restaurante — gerador do cardápio (identidade própria).
//
// Mesmo formato de dados dos demais (data/nomade.json: meta + sections com
// itens/preços), mas com a identidade do Nômade: header preto + wordmark,
// corpo creme, títulos em serifa, preços em dourado, tags em inglês.
// Paginação automática com AUTO-ESCALA medida (sem overflow, mesmo após
// edições pelo painel).
//
//   node build/nomade.mjs        (lê data/nomade.json, gera output/nomade.html + .pdf)
// ---------------------------------------------------------------------------

import puppeteer from 'puppeteer-core';
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const OUTDIR = join(ROOT, 'output');
const CHROME = process.env.CHROME_PATH || join(ROOT, 'chrome/linux-150.0.7871.24/chrome-linux64/chrome');

const m = JSON.parse(readFileSync(join(ROOT, 'data', 'nomade.json'), 'utf8'));
const META = m.meta || {};
const CURRENCY = META.currency || '';
const FOOTER = META.footer || 'NÔMADE BAR & RESTAURANTE';
const esc = (s) => String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

// ---- paginação (gulosa, por "linhas" estimadas) ---------------------------
// Cada página recebe seções até estourar um orçamento de linhas; a auto-escala
// posterior ajusta cada página para caber exatamente em A4.
const ROWS_PER_PAGE = 46;
function estimateRows(sec) {
  let rows = 3; // cabeçalho da seção + respiro
  const cols = 2;
  const perCol = Math.ceil(sec.items.length / cols);
  // cada linha de coluna ocupa 1 + ~1 se tiver descrição
  let unit = 0;
  for (const it of sec.items) unit += it.d ? 2.05 : 1;
  rows += Math.ceil(unit / cols);
  return rows + (sec.note ? 1 : 0);
}
function paginate(sections) {
  const pages = [];
  let cur = [], rows = 0;
  for (const sec of sections) {
    const r = estimateRows(sec);
    if (cur.length && rows + r > ROWS_PER_PAGE) { pages.push(cur); cur = []; rows = 0; }
    cur.push(sec); rows += r;
  }
  if (cur.length) pages.push(cur);
  return pages;
}

// ---- blocos ---------------------------------------------------------------
function renderItem(it) {
  const desc = it.d ? `<div class="item-desc">${esc(it.d)}</div>` : '';
  return `<div class="item"><div class="item-top">
        <span class="item-name">${esc(it.n)}</span>
        <span class="item-dots"></span>
        <span class="item-price">${esc(CURRENCY + it.p)}</span>
      </div>${desc}</div>`;
}
function renderSection(sec) {
  const tag = sec.en ? `<span class="sh-tag">${esc(sec.en)}</span>` : '';
  const note = sec.note ? `<div class="sec-note">${esc(sec.note)}</div>` : '';
  const items = sec.items.map(renderItem).join('\n        ');
  return `<section class="section">
      <div class="sh"><span class="sh-title">${esc(sec.title)}</span>${tag}<span class="sh-line"></span></div>
      <div class="g2">
        ${items}
      </div>${note}
    </section>`;
}
function renderPage(secs, n, total, scale) {
  const label = n === 1 ? esc(META.subtitle || '') : `${n} / ${total}`;
  return `  <div class="page" style="--s:${scale}">
    <header class="ph">
      <div class="brand"><span class="wm">N&Ocirc;MADE</span><span class="wm-sub">Bar &amp; Restaurante</span></div>
      <div class="header-range">${label || 'Bar &amp; Restaurante'}</div>
    </header>
    <main class="pc"><div class="flow">
      ${secs.map(renderSection).join('\n      ')}
    </div></main>
    <footer class="pf"><span class="foot-mark"></span><span class="foot-text">${esc(FOOTER)}</span><span class="foot-page">${n} / ${total}</span></footer>
  </div>`;
}

const CSS = `
    :root{
      --black:#12100d; --paper:#f6f1e7; --ink:#22201b; --muted:#8b8073;
      --gold:#b0894c; --gold2:#caa15c; --soft:#9a8f80;
      --rule:rgba(176,137,76,.55); --line:rgba(120,108,92,.4);
    }
    @page { size: A4; margin: 0; }
    * { box-sizing: border-box; }
    html, body { margin:0; padding:0; width:210mm; background:#e9e4d9; color:var(--ink);
      -webkit-print-color-adjust:exact; print-color-adjust:exact; }
    body { font-family:"Jost", Arial, sans-serif; }

    .page { width:210mm; height:297mm; overflow:hidden; display:flex; flex-direction:column;
      background:var(--paper); page-break-after:always; break-after:page; }
    .page:last-child { page-break-after:auto; break-after:auto; }

    .ph { height:15mm; flex:0 0 15mm; padding:0 13mm; background:var(--black); color:#f4ead4;
      display:grid; grid-template-columns:auto 1fr; align-items:center; gap:6mm; border-bottom:.5mm solid var(--gold); }
    .brand { display:flex; flex-direction:column; justify-content:center; line-height:1; }
    .wm { font-size:15.5pt; font-weight:500; letter-spacing:3.2px; color:#fbf4e4; }
    .wm-sub { margin-top:1mm; font-size:4.4pt; font-weight:600; letter-spacing:3.4px; text-transform:uppercase; color:var(--gold2); }
    .header-range { color:var(--gold2); font-size:6.2pt; font-weight:700; letter-spacing:2.6px;
      text-transform:uppercase; text-align:right; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }

    .pc { flex:1 1 auto; min-height:0; overflow:hidden; padding:calc(8mm * var(--s)) 13mm calc(5mm * var(--s)); }
    .flow { display:flex; flex-direction:column; row-gap:calc(5.6mm * var(--s)); }

    .pf { height:9mm; flex:0 0 9mm; margin:0 13mm; border-top:.5pt solid var(--rule);
      display:grid; grid-template-columns:24mm 1fr 24mm; align-items:center;
      color:var(--soft); font-size:6pt; font-weight:700; letter-spacing:2.2px; text-transform:uppercase; }
    .foot-mark { width:14mm; height:0; border-top:.7pt solid var(--gold); align-self:center; }
    .foot-text { text-align:center; color:#7d7163; }
    .foot-page { text-align:right; color:var(--gold); letter-spacing:1.5px; }

    .section { break-inside:avoid; min-width:0; }
    .sh { display:flex; align-items:baseline; gap:calc(3mm * var(--s)); margin-bottom:calc(2.6mm * var(--s)); min-width:0; }
    .sh-title { font-family:"Cormorant Garamond", Georgia, serif; font-size:calc(19pt * var(--s)); line-height:.9;
      font-weight:600; color:var(--ink); white-space:nowrap; }
    .sh-tag { font-size:calc(5.6pt * var(--s)); line-height:1; font-weight:600; color:var(--gold);
      letter-spacing:2.4px; text-transform:uppercase; white-space:nowrap; }
    .sh-line { height:0; flex:1; min-width:8mm; border-top:.5pt solid var(--rule); align-self:center; }
    .sec-note { margin-top:calc(1.4mm * var(--s)); font-size:calc(5.2pt * var(--s)); font-style:italic; color:var(--soft); }

    .g2 { display:grid; grid-template-columns:repeat(2, minmax(0,1fr)); column-gap:calc(11mm * var(--s)); row-gap:0; }
    .g2 > * { min-width:0; overflow:hidden; }
    .item { margin:0 0 calc(3.0mm * var(--s)); break-inside:avoid; }
    .item-top { display:grid; grid-template-columns:auto minmax(6mm,1fr) auto; align-items:baseline; column-gap:calc(1.6mm * var(--s)); min-width:0; }
    .item-name { font-size:calc(7.7pt * var(--s)); line-height:1.05; font-weight:600; color:var(--ink); min-width:0; overflow-wrap:anywhere; }
    .item-dots { border-bottom:.6pt dotted var(--line); transform:translateY(-1.2pt); min-width:3mm; }
    .item-price { font-size:calc(7.5pt * var(--s)); line-height:1; font-weight:600; color:var(--gold); white-space:nowrap; }
    .item-desc { margin-top:calc(.5mm * var(--s)); padding-right:calc(3mm * var(--s)); font-size:calc(5.7pt * var(--s));
      line-height:1.24; font-weight:400; font-style:italic; color:var(--muted); overflow-wrap:anywhere; }

    @media screen { body { padding:16px; width:auto; } .page { margin:0 auto 16px; box-shadow:0 8px 28px rgba(0,0,0,.18); } }`;

const doc = (body) => `<!doctype html>
<html lang="pt-BR"><head><meta charset="utf-8" />
<title>${esc(META.brand || 'Nômade')} — ${esc(META.subtitle || '')}</title>
<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@500;600;700&family=Jost:wght@300;400;500;600;700&display=swap" rel="stylesheet">
<style>${CSS}</style></head><body>
${body}
</body></html>`;

// ---- render com auto-escala -----------------------------------------------
const pages = paginate(m.sections);
const total = pages.length;
let scales = pages.map(() => 1);

mkdirSync(OUTDIR, { recursive: true });
const browser = await puppeteer.launch({ executablePath: CHROME, headless: 'new', args: ['--no-sandbox', '--disable-setuid-sandbox', '--font-render-hinting=none'] });
const page = await browser.newPage();
await page.setViewport({ width: 794, height: 1123, deviceScaleFactor: 2 });

async function renderAndMeasure() {
  const body = pages.map((secs, i) => renderPage(secs, i + 1, total, scales[i])).join('\n');
  const html = doc(body);
  writeFileSync(join(OUTDIR, 'nomade.html'), html, 'utf8');
  await page.goto('file://' + join(OUTDIR, 'nomade.html'), { waitUntil: 'networkidle0', timeout: 60000 });
  try { await page.evaluateHandle('document.fonts.ready'); } catch {}
  await new Promise((r) => setTimeout(r, 600));
  return page.$$eval('.page', (els) => els.map((el) => {
    const pc = el.querySelector('.pc'); const flow = el.querySelector('.flow');
    return flow.scrollHeight / pc.clientHeight; // >1 => estoura
  }));
}

// passo 1: mede a escala 1 e ajusta cada página que estoura
let ratios = await renderAndMeasure();
scales = scales.map((s, i) => (ratios[i] > 1 ? Math.max(0.6, +(s / ratios[i] * 0.985).toFixed(3)) : s));
// passo 2: confirma/ajusta de novo (margem de segurança)
ratios = await renderAndMeasure();
for (let i = 0; i < ratios.length; i++) if (ratios[i] > 1) scales[i] = Math.max(0.55, +(scales[i] / ratios[i] * 0.985).toFixed(3));
ratios = await renderAndMeasure();

await page.emulateMediaType('print');
await page.pdf({ path: join(OUTDIR, 'nomade.pdf'), format: 'A4', printBackground: true, preferCSSPageSize: true });
await browser.close();

const over = ratios.map((r, i) => (r > 1.005 ? i + 1 : null)).filter((x) => x);
const nItems = m.sections.reduce((a, s) => a + s.items.length, 0);
console.log(`nomade -> output/nomade.html + .pdf | ${total} págs, ${m.sections.length} seções, ${nItems} itens`);
console.log(`escalas: ${scales.map((s) => s.toFixed(2)).join(', ')}`);
if (over.length) { console.error(`<<< OVERFLOW nas páginas: ${over.join(', ')}`); process.exit(1); }
console.log('OK: sem overflow.');
