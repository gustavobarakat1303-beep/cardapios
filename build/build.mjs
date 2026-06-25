// ---------------------------------------------------------------------------
// Pé de Manga — gerador do cardápio (design "papel-creme" / faixas escuras)
// Lê data/menu.json (via menu-data.mjs) e produz um HTML A4 de 6 páginas,
// autocontido, pronto para impressão em PDF.
//
//   node build/build.mjs   -> escreve cardapio.html na raiz
//
// Visual portado do layout aprovado pelo cliente: fundo creme, faixa preta no
// topo (logo + categoria) e no rodapé (logo + @pedemanga + paginação),
// tipografia Cormorant Garamond + Jost, ícones por seção e marca d'água.
// A composição das páginas e a escala (--s) vêm de data/menu.json (layout).
// ---------------------------------------------------------------------------

import { sections, meta, PAGES, SCALES } from './menu-data.mjs';
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');

const LOGO_URI = 'data:image/png;base64,' +
  readFileSync(join(ROOT, 'assets/logo-pedemanga.png')).toString('base64');
const ICONS = JSON.parse(readFileSync(join(__dirname, 'icons.json'), 'utf8'));

const byId = Object.fromEntries(sections.map((s) => [s.id, s]));
const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

// ---- blocos ----------------------------------------------------------------
function renderItem(it, featured) {
  const desc = it.d ? `<div class="item-desc">${esc(it.d)}</div>` : '';
  const inner = `<div class="item-top">
        <span class="item-name">${esc(it.n)}</span>
        <span class="item-dots"></span>
        <span class="item-price">${esc(it.p)}</span>
      </div>${desc}`;
  return featured
    ? `<div class="featured-item">${inner}</div>`
    : `<div class="item">${inner}</div>`;
}

function renderSection(sec) {
  const featured = !!sec.highlight;
  const icon = ICONS[sec.id] || '';
  const tag = sec.en ? `<span class="sh-tag">${esc(sec.en)}</span>` : '';
  const items = sec.items.map((it) => renderItem(it, featured)).join('\n        ');
  return `<section class="section ${featured ? 'featured' : 'standard'}">
      <div class="sh">
        <span class="sh-icon"><svg viewBox="0 0 24 24">${icon}</svg></span>
        <span class="sh-title">${esc(sec.title)}</span>
        ${tag}
        <span class="sh-line"></span>
      </div>
      <div class="g2">
        ${items}
      </div>
    </section>`;
}

function renderPage(ids, n, total) {
  const scale = SCALES[n - 1] || 1;
  const blocks = ids.map((id) => renderSection(byId[id])).join('\n      ');
  return `  <div class="page" data-page="${n}" data-canvas-width="794" data-canvas-height="1123" style="--s:${scale}">
    <header class="ph">
      <div class="brand" role="img" aria-label="${esc(meta.brand)}"></div>
      <div class="header-range">Bar &amp; Restaurante</div>
    </header>
    <main class="pc">
      <div class="watermark"></div>
      <div class="flow">
      ${blocks}
      </div>
    </main>
    <footer class="pf">
      <div class="footer-logo"></div>
      <div class="footer-social">@pedemanga</div>
      <div class="footer-page">${n} / ${total}</div>
    </footer>
  </div>`;
}

// ---- CSS -------------------------------------------------------------------
const CSS = `
    :root{
      --black:#14100d; --paper:#f7f3eb; --paper2:#fbf8f1; --ink:#251f19;
      --muted:#706158; --green:#17672c; --green2:#0f4e22; --ochre:#c58a31;
      --line:rgba(95,79,64,.48); --rule:rgba(197,138,49,.78);
      --logo:url('${LOGO_URI}');
    }
    @page { size: A4; margin: 0; }
    * { box-sizing: border-box; }
    html, body { margin:0; padding:0; width:210mm; background:#ece7dd; color:var(--ink);
      -webkit-print-color-adjust:exact; print-color-adjust:exact; }
    body { font-family:"Jost", Arial, sans-serif; }

    .page { width:210mm; height:297mm; overflow:hidden; display:flex; flex-direction:column;
      background:linear-gradient(90deg, rgba(23,103,44,.035), transparent 19mm, transparent calc(100% - 19mm), rgba(197,138,49,.04)), var(--paper);
      page-break-after:always; break-after:page; }
    .page:last-child { page-break-after:auto; break-after:auto; }

    .ph { height:13mm; flex:0 0 13mm; padding:0 11mm; background:var(--black); color:#fffaf0;
      display:grid; grid-template-columns:40mm 1fr; align-items:center; gap:5mm; border-bottom:.75mm solid var(--green); }
    .brand { width:34mm; height:10.6mm; background:var(--logo) left center/contain no-repeat; }
    .header-range { color:#d9c7a4; font-size:6pt; font-weight:700; letter-spacing:1.4px;
      text-transform:uppercase; text-align:right; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }

    .pc { height:276mm; flex:1 1 auto; min-height:0; position:relative; overflow:hidden;
      display:flex; flex-direction:column; justify-content:space-between; padding:calc(6.6mm * var(--s)) 11mm calc(5.2mm * var(--s)); }
    .flow { min-height:100%; position:relative; z-index:1; display:flex; flex-direction:column;
      justify-content:space-between; row-gap:calc(4.5mm * var(--s)); }
    .watermark { position:absolute; z-index:0; width:42mm; height:34mm; right:9mm; bottom:9mm;
      opacity:.07; background:var(--logo) center/contain no-repeat; pointer-events:none; }

    .pf { height:8mm; flex:0 0 8mm; margin:0 11mm; border-top:.55pt solid var(--rule);
      display:grid; grid-template-columns:32mm 1fr 32mm; align-items:center; color:#6f5b51; font-size:6.8pt; font-weight:800; letter-spacing:1.2px; }
    .footer-logo { width:11mm; height:6mm; background:var(--logo) left center/contain no-repeat; }
    .footer-social { text-align:center; }
    .footer-page { text-align:right; color:var(--green); }

    .section { break-inside:avoid; min-width:0; }
    .sh { display:flex; align-items:center; gap:calc(2.3mm * var(--s)); margin-bottom:calc(2.0mm * var(--s)); min-width:0; }
    .sh-icon { width:calc(5.8mm * var(--s)); min-width:calc(5.8mm * var(--s)); height:calc(5.8mm * var(--s));
      display:inline-flex; align-items:center; justify-content:center; color:#6e5145; }
    .sh-icon svg { width:100%; height:100%; fill:none; stroke:currentColor; stroke-width:1.9; stroke-linecap:round; stroke-linejoin:round; }
    .sh-title { font-family:"Cormorant Garamond", Georgia, serif; font-size:calc(15.2pt * var(--s)); line-height:.95;
      font-weight:700; color:var(--green2); white-space:nowrap; }
    .sh-tag { font-size:calc(5.4pt * var(--s)); line-height:1; font-weight:700; color:var(--ochre);
      letter-spacing:1.8px; text-transform:uppercase; white-space:nowrap; padding-top:calc(1mm * var(--s)); }
    .sh-line { height:0; flex:1; min-width:10mm; border-top:.55pt solid var(--rule); }

    .g2 { display:grid; grid-template-columns:minmax(0,1fr) minmax(0,1fr); column-gap:calc(8mm * var(--s)); row-gap:0; }
    .g2 > * { min-width:0; overflow:hidden; }
    .item { margin:0 0 calc(2.75mm * var(--s)); break-inside:avoid; }
    .item-top { display:grid; grid-template-columns:auto minmax(8mm,1fr) auto; align-items:baseline; column-gap:calc(1.4mm * var(--s)); min-width:0; }
    .item-name { font-size:calc(7.35pt * var(--s)); line-height:1.02; font-weight:800; color:#272119; min-width:0; overflow-wrap:anywhere; }
    .item-dots { border-bottom:.65pt dotted var(--line); transform:translateY(calc(-1.2pt * var(--s))); min-width:3mm; }
    .item-price { font-size:calc(7.15pt * var(--s)); line-height:1; font-weight:800; color:var(--green); white-space:nowrap; }
    .item-desc { margin-top:calc(.38mm * var(--s)); padding-right:calc(2mm * var(--s)); font-size:calc(5.55pt * var(--s));
      line-height:1.22; font-weight:400; color:var(--muted); overflow-wrap:anywhere; }

    .featured .g2 { column-gap:calc(5mm * var(--s)); }
    .featured-item { border:.55pt solid rgba(197,138,49,.74); border-radius:calc(3mm * var(--s));
      padding:calc(2.0mm * var(--s)) calc(2.5mm * var(--s)); background:rgba(255,247,225,.72); margin-bottom:calc(2.65mm * var(--s)); }
    .featured-item .item-desc { padding-right:0; }
    .featured-item .item-price { color:var(--ochre); }

    @media screen {
      body { padding:16px; width:auto; background:#ece7dd; }
      .page { margin:0 auto 16px; box-shadow:0 8px 28px rgba(0,0,0,.18); }
    }`;

// Resolve a composição de páginas de forma robusta: ignora ids inexistentes,
// acomoda seções órfãs (ex.: criadas pelo painel) e NUNCA devolve vazio.
function resolvePages() {
  let pages = PAGES.map((p) => p.filter((id) => byId[id])).filter((p) => p.length);
  const used = new Set(pages.flat());
  const missing = sections.filter((s) => !used.has(s.id)).map((s) => s.id);
  for (let i = 0; i < missing.length; i += 5) pages.push(missing.slice(i, i + 5));
  if (!pages.length) {
    const all = sections.map((s) => s.id);
    for (let i = 0; i < all.length; i += 5) pages.push(all.slice(i, i + 5));
  }
  return pages;
}

// ---- montagem --------------------------------------------------------------
function build() {
  const resolved = resolvePages();
  const total = resolved.length;
  const body = resolved.map((ids, i) => renderPage(ids, i + 1, total)).join('\n');

  const html = `<!doctype html>
<html lang="pt-BR">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${esc(meta.brand)}</title>
  <meta name="hz:slide-selector" content=".page" />
  <meta name="hz:canvas-width" content="794" />
  <meta name="hz:canvas-height" content="1123" />
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@600;700&family=Jost:wght@400;500;600;700;800&display=swap" rel="stylesheet">
  <style>${CSS}
  </style>
</head>
<body>
${body}
</body>
</html>`;

  writeFileSync(join(ROOT, 'cardapio.html'), html, 'utf8');

  const counts = resolved.map((p) => p.length);
  const items = resolved.reduce((a, p) => a + p.reduce((b, id) => b + byId[id].items.length, 0), 0);
  console.log(`Páginas: ${total} | seções/página: [${counts.join(', ')}] | itens: ${items}`);
}

build();
