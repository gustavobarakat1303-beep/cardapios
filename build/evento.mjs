// ---------------------------------------------------------------------------
// Pé de Manga — gerador do MENU DE EVENTO (Almoço / Jantar)
//
// Menu de mesa para evento (pacote fechado): SEM preços. Montado por seleção
// (exatamente 1 salada + exatamente 3 pratos principais; entradas e sobremesas
// entram completas). Impresso em A4 HORIZONTAL dividido em 3 partes iguais,
// com 3 cópias do mesmo menu por folha. Conteúdo centralizado, sem linhas
// pontilhadas, divisórias finas entre seções.
//
//   node build/evento.mjs
//   node build/evento.mjs --salada caprese --pratos polvo,camarao,salmao
//
// Saídas (output/):
//   almoco-jantar-nao-alcoolicas.pdf   almoco-jantar-alcoolicas.pdf
//   almoco-jantar-geral.pdf  (as duas versões)
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
const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

// ---- seleção (com overrides por flag) -------------------------------------
function parseArgs(argv) { const f = {}; for (let i = 0; i < argv.length; i++) { if (argv[i].startsWith('--')) { f[argv[i].slice(2)] = argv[i + 1]; i++; } } return f; }
const args = parseArgs(process.argv.slice(2));
const sel = {
  salada: args.salada || data.selecao.salada,
  pratos: args.pratos ? args.pratos.split(',').map((s) => s.trim()) : data.selecao.pratos,
};

// ---- validação ------------------------------------------------------------
function die(msg) { console.error('✗ ' + msg); process.exit(1); }
const saladaById = Object.fromEntries(data.saladas.map((s) => [s.id, s]));
const pratoById = Object.fromEntries(data.pratos.map((p) => [p.id, p]));

if (!sel.salada || !saladaById[sel.salada]) die(`escolha exatamente 1 salada válida (--salada). Opções: ${data.saladas.map((s) => s.id).join(', ')}`);
const pratos = [...new Set(sel.pratos || [])];
if (pratos.length !== 3) die(`escolha exatamente 3 pratos principais (--pratos a,b,c). Você passou ${pratos.length}.`);
for (const id of pratos) if (!pratoById[id]) die(`prato inválido: "${id}". Opções: ${data.pratos.map((p) => p.id).join(', ')}`);

const chosen = {
  entradas: data.fixos.entradas,
  salada: [saladaById[sel.salada]],
  pratos: pratos.map((id) => pratoById[id]),
  sobremesas: data.fixos.sobremesas,
};

// ---- render ---------------------------------------------------------------
function sectionHTML(title, items) {
  const rows = items.map((it) => {
    if (typeof it === 'string') return `<div class="it"><div class="it-n">${esc(it)}</div></div>`;
    return `<div class="it"><div class="it-n">${esc(it.n)}</div>${it.d ? `<div class="it-d">${esc(it.d)}</div>` : ''}</div>`;
  }).join('');
  return `<div class="sec"><div class="sec-t">${esc(title)}</div>${rows}</div>`;
}

function columnHTML(bebidas) {
  return `<div class="menu">
    <div class="head">
      <div class="logo"></div>
      <div class="kicker">${esc(data.meta.subtitle || '')}</div>
    </div>
    <div class="body">
      ${sectionHTML('Entradas', chosen.entradas)}
      ${sectionHTML('Salada', chosen.salada)}
      ${sectionHTML('Pratos Principais', chosen.pratos)}
      ${sectionHTML('Sobremesas', chosen.sobremesas)}
      ${sectionHTML('Bebidas', bebidas)}
    </div>
    <div class="foot">@pedemanga</div>
  </div>`;
}

function sheetHTML(bebidas) {
  const col = columnHTML(bebidas);
  return `<div class="sheet">${col}${col}${col}</div>`;
}

const bevNaoAlc = data.bebidas.naoAlcoolicas;
const bevAlc = [...data.bebidas.naoAlcoolicas, ...data.bebidas.alcoolicas];

const CSS = `
  :root{ --paper:#f7f3eb; --ink:#2b241d; --muted:#6f6055; --green:#0f4e22; --green2:#17672c; --ochre:#c58a31; --line:rgba(95,79,64,.42); }
  @page{ size:A4 landscape; margin:0; }
  *{ box-sizing:border-box; }
  html,body{ margin:0; padding:0; background:#ece7dd; color:var(--ink); -webkit-print-color-adjust:exact; print-color-adjust:exact; font-family:"Jost",Arial,sans-serif; }
  .sheet{ width:297mm; height:210mm; display:grid; grid-template-columns:1fr 1fr 1fr; background:var(--paper);
    page-break-after:always; break-after:page; }
  .sheet:last-child{ page-break-after:auto; break-after:auto; }
  .menu{ position:relative; height:210mm; padding:10mm 8mm 7mm; display:flex; flex-direction:column; text-align:center;
    border-right:.4pt dashed rgba(95,79,64,.5); }
  .menu:last-child{ border-right:0; }

  .head{ display:flex; flex-direction:column; align-items:center; gap:1.5mm; }
  .logo{ width:24mm; height:19mm; background:url('${LOGO}') center/contain no-repeat; }
  .kicker{ font-size:7.6pt; font-weight:700; letter-spacing:2.2px; text-transform:uppercase; color:var(--ochre); }

  .body{ flex:1; display:flex; flex-direction:column; justify-content:space-between; padding:3mm 2mm 0; }
  .sec{ padding:2.0mm 0; }
  .sec + .sec{ border-top:.5pt solid var(--line); }
  .sec-t{ font-family:"Cormorant Garamond",Georgia,serif; font-size:12.5pt; font-weight:700; color:var(--green); margin-bottom:1.0mm; letter-spacing:.3px; }
  .it{ margin:.8mm 0; }
  .it-n{ font-size:8.2pt; font-weight:700; color:var(--ink); line-height:1.12; }
  .it-d{ font-size:6.4pt; font-weight:400; color:var(--muted); line-height:1.18; margin-top:.3mm; }

  .foot{ margin-top:2.5mm; font-size:6.4pt; font-weight:800; letter-spacing:1.4px; text-transform:uppercase; color:var(--green2); }
`;

function docHTML(sheets) {
  return `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8" />
<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@600;700&family=Jost:wght@400;700;800&display=swap" rel="stylesheet">
<style>${CSS}</style></head><body>${sheets}</body></html>`;
}

const versions = [
  { slug: 'almoco-jantar-nao-alcoolicas', html: docHTML(sheetHTML(bevNaoAlc)) },
  { slug: 'almoco-jantar-alcoolicas', html: docHTML(sheetHTML(bevAlc)) },
  { slug: 'almoco-jantar-geral', html: docHTML(sheetHTML(bevNaoAlc) + sheetHTML(bevAlc)) },
];

mkdirSync(OUTDIR, { recursive: true });
const browser = await puppeteer.launch({ executablePath: CHROME, headless: 'new', args: ['--no-sandbox', '--disable-setuid-sandbox', '--font-render-hinting=none'] });
console.log(`Menu de evento — salada: ${sel.salada} | pratos: ${pratos.join(', ')}`);
for (const v of versions) {
  writeFileSync(join(OUTDIR, `${v.slug}.html`), v.html, 'utf8');
  const page = await browser.newPage();
  await page.setViewport({ width: 1200, height: 850, deviceScaleFactor: 2 });
  await page.goto('file://' + join(OUTDIR, `${v.slug}.html`), { waitUntil: 'networkidle0', timeout: 60000 });
  try { await page.evaluateHandle('document.fonts.ready'); } catch {}
  await new Promise((r) => setTimeout(r, 1200));
  await page.emulateMediaType('print');
  await page.pdf({ path: join(OUTDIR, `${v.slug}.pdf`), format: 'A4', landscape: true, printBackground: true });
  const over = await page.$$eval('.menu', (els) => els.some((el) => el.scrollHeight > el.clientHeight + 2));
  console.log(`  ${v.slug}.pdf${over ? '  <<< OVERFLOW' : '  ok'}`);
  await page.close();
}
await browser.close();
console.log('OK — 3 PDFs (não alcoólicas, alcoólicas, geral) em output/.');
