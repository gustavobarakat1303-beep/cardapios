// ---------------------------------------------------------------------------
// Pé de Manga — gerador do MENU DE EVENTO (Almoço / Jantar)  [design monocromático]
//
// Menu de mesa para evento (pacote fechado): SEM preços. Montado por seleção
// (exatamente 1 salada + 3 pratos principais; entradas/sobremesas completas).
// A4 HORIZONTAL dividido em 3 partes iguais (3 cópias). Visual portado do
// material aprovado do cliente.
//
//   node build/evento.mjs          (lê data/almoco-jantar.json)
//
// Saídas (output/): almoco-jantar-nao_alcoolicas.pdf · -alcoolicas.pdf · -geral.pdf
// ---------------------------------------------------------------------------

import puppeteer from 'puppeteer-core';
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const OUTDIR = join(ROOT, 'output');
const CHROME = process.env.CHROME_PATH || join(ROOT, 'chrome/linux-150.0.7871.24/chrome-linux64/chrome');

const data = JSON.parse(readFileSync(join(ROOT, 'data', 'almoco-jantar.json'), 'utf8'));
const LOGO = 'data:image/png;base64,' + readFileSync(join(ROOT, 'assets/logo-pedemanga.png')).toString('base64');
const esc = (s) => String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

// ---- validação ------------------------------------------------------------
function die(msg) { console.error('✗ ' + msg); process.exit(1); }
if (!data.saladaSelecionada || !data.saladaSelecionada.nome) die('selecione exatamente 1 salada (saladaSelecionada).');
if (!Array.isArray(data.principaisSelecionados) || data.principaisSelecionados.length !== 3)
  die(`selecione exatamente 3 pratos principais (principaisSelecionados). Há ${(data.principaisSelecionados || []).length}.`);

// ---- render ---------------------------------------------------------------
function sec(title, tag, items) {
  const lis = items.map((it) => (typeof it === 'string'
    ? `<li><strong>${esc(it)}</strong></li>`
    : `<li><strong>${esc(it.nome)}</strong>${it.descricao ? `<span>${esc(it.descricao)}</span>` : ''}</li>`)).join('');
  return `<div class="section"><div class="section-title"><span>${esc(title)}</span><em>${esc(tag)}</em><i></i></div><ul>${lis}</ul></div>`;
}

function panel(v) {
  return `<div class="panel">
    <div class="panel-head"><div class="logo"></div><div>Bar &amp; Restaurante</div></div>
    <div class="panel-body">
      <div class="kicker">${esc(data.subtitulo)}</div>
      <h1>${esc(data.titulo)}</h1>
      <div class="option-row"><strong>${esc(v.titulo)}</strong><span>${esc(data.periodo)}</span></div>
      <div class="lead">${esc(v.chamada)}</div>
      <div class="sections">
        ${sec('Entradas', 'Completo', data.entradas)}
        ${sec('Salada', '1 opção', [data.saladaSelecionada])}
        ${sec('Principais', '3 opções', data.principaisSelecionados)}
        ${sec('Sobremesa', 'Completo', data.sobremesas)}
        ${sec('Bebidas', v.titulo, v.bebidas)}
      </div>
    </div>
    <div class="panel-foot"><span>${esc(data.rodape)}</span><span>${esc(v.titulo)}</span></div>
  </div>`;
}

const sheet = (v) => `<div class="sheet">${panel(v)}${panel(v)}${panel(v)}</div>`;

const CSS = `
    :root{ --paper:#ffffff; --ink:#181818; --muted:#565656; --line:#8f8f8f; --soft:#777777; --logo:url('${LOGO}'); }
    @page { size: A4 landscape; margin: 0; }
    * { box-sizing: border-box; }
    html, body { margin:0; padding:0; background:#eeeeee; color:var(--ink); font-family:"Jost",Arial,sans-serif;
      -webkit-print-color-adjust:exact; print-color-adjust:exact; }
    .sheet { width:297mm; height:210mm; overflow:hidden; display:grid; grid-template-columns:repeat(3,1fr);
      background:var(--paper); break-after:page; page-break-after:always; }
    .sheet:last-child{ break-after:auto; page-break-after:auto; }
    .panel { position:relative; width:99mm; height:210mm; overflow:hidden; padding:6mm 6.2mm 5.2mm;
      display:flex; flex-direction:column; border-left:.35pt dashed #b6b6b6; text-align:center; }
    .panel:first-child{ border-left:none; }
    .panel::after { content:""; position:absolute; right:4.5mm; bottom:14mm; width:30mm; height:30mm;
      background:var(--logo) center/contain no-repeat; opacity:.035; filter:grayscale(1); pointer-events:none; }
    .panel-head { height:16mm; flex:0 0 16mm; display:flex; flex-direction:column; align-items:center; justify-content:center;
      gap:1.15mm; border-bottom:.45pt solid var(--line); padding-bottom:2.4mm; }
    .panel-head .logo { width:12mm; height:9.2mm; background:var(--logo) center/contain no-repeat; filter:grayscale(1) contrast(1.25); }
    .panel-head div { font-size:4.6pt; line-height:1; font-weight:800; letter-spacing:1.4px; text-align:center; text-transform:uppercase; white-space:nowrap; }
    .panel-body { flex:1 1 auto; min-height:0; padding-top:4mm; position:relative; z-index:1; }
    .kicker { font-size:5pt; line-height:1; font-weight:800; letter-spacing:1.3px; color:var(--muted); text-transform:uppercase; }
    h1 { margin:1.45mm 0 1.8mm; font-family:"Cormorant Garamond",Georgia,serif; font-size:24pt; line-height:.9; font-weight:700; color:var(--ink); }
    .option-row { display:flex; flex-direction:column; align-items:center; gap:1mm; padding:0 0 2mm; }
    .option-row strong { font-size:8.2pt; line-height:1; font-weight:800; letter-spacing:1.2px; text-transform:uppercase; }
    .option-row span { font-size:4.6pt; line-height:1; font-weight:800; color:var(--muted); letter-spacing:1px; white-space:nowrap; }
    .lead { margin:0 0 2.5mm; padding:1.7mm 3mm 0; border-top:.45pt solid var(--line); font-size:5.5pt; line-height:1.18; font-weight:600; color:var(--muted); }
    .sections { display:flex; flex-direction:column; gap:2.05mm; }
    .section { padding-top:.4mm; break-inside:avoid; }
    .section + .section { border-top:.35pt solid #d2d2d2; padding-top:1.8mm; }
    .section-title { display:flex; flex-direction:column; align-items:center; justify-content:center; gap:.65mm; margin-bottom:1mm; }
    .section-title span { font-family:"Cormorant Garamond",Georgia,serif; font-size:12.9pt; line-height:.92; font-weight:700; color:var(--ink); white-space:nowrap; }
    .section-title em { font-style:normal; font-size:3.9pt; line-height:1; font-weight:800; color:var(--soft); letter-spacing:1.1px; text-transform:uppercase; white-space:nowrap; }
    .section-title i { display:block; width:12mm; height:0; border-top:.45pt solid var(--line); }
    ul { list-style:none; margin:0; padding:0; display:grid; row-gap:.55mm; }
    li { margin:0; padding:0; font-size:6.05pt; line-height:1.1; font-weight:600; overflow-wrap:anywhere; }
    li strong { display:block; font-size:6.35pt; line-height:1.08; font-weight:800; }
    li span { display:block; margin-top:.2mm; color:var(--muted); font-size:5.1pt; line-height:1.1; font-weight:500; }
    .panel-foot { height:6.4mm; flex:0 0 6.4mm; display:flex; flex-direction:column; align-items:center; justify-content:flex-end;
      gap:1mm; border-top:.45pt solid var(--line); color:var(--muted); font-size:4.6pt; line-height:1; font-weight:800;
      letter-spacing:1.15px; text-transform:uppercase; position:relative; z-index:1; }
    .panel-foot span:last-child { color:var(--ink); }
    @media screen { body { padding:16px; } .sheet { margin:0 auto 16px; box-shadow:0 8px 28px rgba(0,0,0,.18); } }
`;

const doc = (sheets) => `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8" />
<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@600;700&family=Jost:wght@400;500;600;700;800&display=swap" rel="stylesheet">
<style>${CSS}</style></head><body>${sheets}</body></html>`;

const versions = data.versoes.map((v) => ({ slug: `almoco-jantar-${v.id}`, html: doc(sheet(v)) }));
versions.push({ slug: 'almoco-jantar-geral', html: doc(data.versoes.map(sheet).join('')) });

// ---- render ---------------------------------------------------------------
mkdirSync(OUTDIR, { recursive: true });
const browser = await puppeteer.launch({ executablePath: CHROME, headless: 'new', args: ['--no-sandbox', '--disable-setuid-sandbox', '--font-render-hinting=none'] });
console.log(`Menu de evento — salada: ${data.saladaSelecionada.nome} | pratos: ${data.principaisSelecionados.map((p) => p.nome).join(', ')}`);
for (const v of versions) {
  writeFileSync(join(OUTDIR, `${v.slug}.html`), v.html, 'utf8');
  const page = await browser.newPage();
  await page.setViewport({ width: 1200, height: 850, deviceScaleFactor: 2 });
  await page.goto('file://' + join(OUTDIR, `${v.slug}.html`), { waitUntil: 'networkidle0', timeout: 60000 });
  try { await page.evaluateHandle('document.fonts.ready'); } catch {}
  await new Promise((r) => setTimeout(r, 1200));
  await page.emulateMediaType('print');
  await page.pdf({ path: join(OUTDIR, `${v.slug}.pdf`), format: 'A4', landscape: true, printBackground: true });
  const over = await page.$$eval('.panel-body', (els) => els.some((el) => el.scrollHeight > el.clientHeight + 2));
  console.log(`  ${v.slug}.pdf${over ? '  <<< OVERFLOW' : '  ok'}`);
  await page.close();
}
await browser.close();
console.log('OK — PDFs do menu de evento em output/.');
