// ---------------------------------------------------------------------------
// Pé de Manga — gerador do cardápio
// Lê build/menu-data.mjs e produz um HTML A4 multipágina, autocontido,
// pronto para impressão em PDF e para importação no Adobe Express.
//
//   node build/build.mjs            -> escreve cardapio.html na raiz
//
// A paginação é determinística: cada página é uma tela A4 fixa (794×1123 px
// @96dpi) e o motor empacota itens em duas colunas respeitando um orçamento
// de altura, criando páginas conforme necessário (sem overflow).
// ---------------------------------------------------------------------------

import { flow, meta, BANNERS } from './menu-data.mjs';
import { writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');

// ---- Design tokens --------------------------------------------------------
const C = {
  verde: '#1B5E20',      // verde-manga profundo (primária)
  verdeClaro: '#2E7D32',
  amarelo: '#FFB74D',    // amarelo-manga (secundária)
  amareloEsc: '#E69A2E',
  marrom: '#5D4037',     // marrom-madeira (barras / divisores)
  creme: '#FFF8E1',      // creme claro (fundos suaves)
  branco: '#FFFFFF',
  cinza: '#F5F5F5',
  texto: '#2E2A26',      // corpo
  textoSuave: '#6B5E54', // descrições
};

const FONT_LINK = '<link rel="stylesheet" href="https://use.typekit.net/auq6wta.css">';
const SERIF = '"playfair-display", Georgia, serif';
const SANS = '"montserrat", "Segoe UI", sans-serif';

// ---- Geometria A4 (px @96dpi) ---------------------------------------------
const PAGE_W = 794, PAGE_H = 1123;
const MARGIN_X = 50;          // ~1,3 cm — um pouco mais de área útil
const CONTENT_TOP = 48;       // topo
const FOOTER_RESERVE = 46;    // rodapé + folga de segurança acima dele
const CONTENT_W = PAGE_W - 2 * MARGIN_X;          // 694
const COLS = 2;               // duas colunas
const COL_GAP = 20;
const COL_W = (CONTENT_W - COL_GAP) / COLS;       // 337
const BUDGET = PAGE_H - CONTENT_TOP - FOOTER_RESERVE; // ~1035
const CONTENT_H = BUDGET;     // altura útil do corpo (distribuição elástica)

// ---- Estimativa de altura (conservadora) — modo compacto p/ 6 páginas -----
const NAME_LH = 12.5, NAME_CPL = 40;
const DESC_LH = 10.4, DESC_CPL = 62;
const ITEM_PAD = 8;           // respiro inferior de cada item (linha entre produtos)
const HEADER_H = 38;          // cabeçalho de seção completo
const CONT_HEADER_H = 24;     // cabeçalho "(continuação)"
const SECTION_GAP = 9;
const BANNER_H = 96;
const HL_EXTRA = 16;          // cartões destacados são mais altos

const lines = (txt, cpl) => Math.max(1, Math.ceil((txt || '').length / cpl));

function itemHeight(it, highlight) {
  const nameFull = it.sz ? `${it.n}  ${it.sz}` : it.n;
  const nh = lines(nameFull, NAME_CPL) * NAME_LH;
  const dh = it.d ? lines(it.d, DESC_CPL) * DESC_LH + 3 : 0;
  return nh + dh + ITEM_PAD + (highlight ? HL_EXTRA : 0);
}

// altura de uma seção dado um conjunto de itens (grid de 2 colunas, fluxo por linha)
function itemsHeight(items, highlight) {
  let h = 0;
  for (let i = 0; i < items.length; i += 2) {
    const a = itemHeight(items[i], highlight);
    const b = i + 1 < items.length ? itemHeight(items[i + 1], highlight) : 0;
    h += Math.max(a, b);
  }
  return h;
}

// quantos itens (em pares) cabem em `avail` px de altura
function itemsThatFit(items, highlight, avail) {
  let h = 0, count = 0;
  for (let i = 0; i < items.length; i += 2) {
    const a = itemHeight(items[i], highlight);
    const b = i + 1 < items.length ? itemHeight(items[i + 1], highlight) : 0;
    const row = Math.max(a, b);
    if (h + row > avail) break;
    h += row;
    count = Math.min(items.length, i + 2);
  }
  return count;
}

// ---- Ícones (SVG inline, traço fino) --------------------------------------
function icon(name, color) {
  const s = `fill="none" stroke="${color}" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"`;
  const paths = {
    appetizer: `<path ${s} d="M7 3v8M5 3v4a2 2 0 0 0 4 0V3M7 11v10"/><path ${s} d="M17 3c-1.5 0-2.5 2-2.5 5s1 4 2.5 4 2.5-1 2.5-4-1-5-2.5-5zM17 16v5"/>`,
    bread: `<path ${s} d="M5 10a4 4 0 0 1 4-4h6a4 4 0 0 1 0 8H9a4 4 0 0 1-4-4z"/><path ${s} d="M9 10.5l1.5 1.5M12 10l1.5 1.5"/>`,
    salad: `<path ${s} d="M4 11h16a8 8 0 0 1-16 0z"/><path ${s} d="M12 11c0-3 1.5-5 4-6M12 11c0-2-1-3.5-3-4.5M9 11c-1-1.5-1-3 0-4.5"/>`,
    meat: `<path ${s} d="M14.5 4a5.5 5.5 0 0 1 0 11l-7 5a3 3 0 0 1-3-5l5-7a5.5 5.5 0 0 1 5-4z"/><circle ${s} cx="14" cy="9" r="2"/>`,
    fish: `<path ${s} d="M3 12c3-4 9-5 13-3 2 1 4 3 5 3-1 0-3 2-5 3-4 2-10 1-13-3z"/><path ${s} d="M16 12h.01"/><path ${s} d="M3 12c-1-1.5-1-3 0-5M3 12c-1 1.5-1 3 0 5"/>`,
    pasta: `<path ${s} d="M4 12h16a8 8 0 0 1-16 0z"/><path ${s} d="M8 4c0 3 0 5 0 7M12 3c0 3 0 5 0 8M16 4c0 3 0 4 0 7"/>`,
    burger: `<path ${s} d="M4 9a8 8 0 0 1 16 0z"/><path ${s} d="M4 13h16M5 16h14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2z"/>`,
    dessert: `<path ${s} d="M8 9a4 4 0 0 1 8 0z"/><path ${s} d="M8 9l4 12 4-12"/><circle ${s} cx="12" cy="5" r="1.4"/>`,
    kids: `<path ${s} d="M12 3l2.2 4.6 5 .7-3.6 3.5.9 5-4.5-2.4L7.5 19l.9-5L4.8 8.3l5-.7z"/>`,
    beer: `<path ${s} d="M6 7h9v11a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2z"/><path ${s} d="M15 9h2a2 2 0 0 1 2 2v3a2 2 0 0 1-2 2h-2"/><path ${s} d="M8.5 10v7M11.5 10v7"/>`,
    cocktail: `<path ${s} d="M5 6h14l-7 7z"/><path ${s} d="M12 13v6M9 21h6"/><circle ${s} cx="15.5" cy="7.5" r="1"/>`,
    mocktail: `<path ${s} d="M7 7h10l-2 12H9z"/><path ${s} d="M9 11h6"/><path ${s} d="M14 7c0-2 1-3 3-3"/>`,
    caipirinha: `<path ${s} d="M7 8h10l-1 11a1 1 0 0 1-1 1H9a1 1 0 0 1-1-1z"/><path ${s} d="M9 12h6"/><path ${s} d="M12 5v3M10.5 6.5h3"/>`,
    bottle: `<path ${s} d="M10 3h4M11 3v3l-1 2v12a1 1 0 0 0 1 1h2a1 1 0 0 0 1-1V8l-1-2V3"/><path ${s} d="M10 12h4"/>`,
    wine: `<path ${s} d="M8 4h8c0 4-1.5 7-4 7s-4-3-4-7z"/><path ${s} d="M12 11v6M9 21h6"/>`,
    soda: `<path ${s} d="M8 4h8l-1 16a1 1 0 0 1-1 1h-4a1 1 0 0 1-1-1z"/><path ${s} d="M8.5 9h7"/><path ${s} d="M11 4v3"/>`,
  };
  return `<svg viewBox="0 0 24 24" width="26" height="26" aria-hidden="true">${paths[name] || paths.appetizer}</svg>`;
}

// galho/folha decorativo para divisores e capa
function branch(color, w = 240) {
  return `<svg viewBox="0 0 240 24" width="${w}" height="24" aria-hidden="true" preserveAspectRatio="none">
    <path d="M0 12h94" fill="none" stroke="${color}" stroke-width="1"/>
    <path d="M146 12h94" fill="none" stroke="${color}" stroke-width="1"/>
    <g fill="${color}">
      <path d="M120 2c-7 3-10 7-10 10 0 3 3 6 10 8 7-2 10-5 10-8 0-3-3-7-10-10z" opacity=".95"/>
      <path d="M120 4c0 5 0 11 0 14" stroke="${C.creme}" stroke-width="1" fill="none"/>
    </g>
    <path d="M104 12c2-3 4-4 6-4-1 2-3 4-6 4zM136 12c-2-3-4-4-6-4 1 2 3 4 6 4z" fill="${color}" opacity=".8"/>
  </svg>`;
}

const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

// ---- Render de blocos ------------------------------------------------------
function renderItem(it, accent, highlight) {
  const name = esc(it.n) + (it.sz ? ` <span class="sz">${esc(it.sz)}</span>` : '');
  const desc = it.d ? `<div class="desc">${esc(it.d)}</div>` : '';
  return `<div class="item${highlight ? ' hl' : ''}">
      <div class="row">
        <span class="name">${name}</span>
        <span class="leader"></span>
        <span class="price">${esc(it.p)}</span>
      </div>${desc}
    </div>`;
}

function renderSectionHead(sec, accent, cont) {
  if (cont) {
    return `<div class="sec-head cont">
        <span class="sec-title-sm">${esc(sec.title)} <em>continuação</em></span>
      </div>`;
  }
  const en = sec.en ? `<span class="sec-en">${esc(sec.en)}</span>` : '';
  return `<div class="sec-head">
      <span class="sec-ic" style="color:${accent}">${icon(sec.icon, accent)}</span>
      <span class="sec-title">${esc(sec.title)}</span>
      ${en}
      <span class="sec-rule"></span>
    </div>`;
}

function renderSectionBlock(sec, items, accent, cont) {
  const rows = items.map((it) => renderItem(it, accent, sec.highlight)).join('');
  return `<section class="sec">
      ${renderSectionHead(sec, accent, cont)}
      <div class="items${sec.highlight ? ' items-hl' : ''}">${rows}</div>
    </section>`;
}

function renderBanner(key) {
  const b = BANNERS[key];
  return `<div class="banner">
      ${branch(C.amarelo, 150)}
      <div class="banner-txt">
        <span class="banner-label">${esc(b.label)}</span>
        <span class="banner-note">${esc(b.note)}</span>
      </div>
      ${branch(C.amarelo, 150)}
    </div>`;
}

// ---- Paginação -------------------------------------------------------------
function paginate() {
  const pages = [];      // cada página = { blocks: [html...] }
  let cur = { blocks: [], used: 0 };
  const pushPage = () => { if (cur.blocks.length) pages.push(cur); cur = { blocks: [], used: 0 }; };
  const remaining = () => BUDGET - cur.used;

  for (const node of flow) {
    if (node.banner) continue; // faixas de grupo removidas — apenas os itens

    const sec = node;
    const accent = sec.kind === 'drink' ? C.marrom : C.verde;
    let idx = 0;
    let first = true;

    while (idx < sec.items.length) {
      const headH = first ? HEADER_H : CONT_HEADER_H;
      // espaço mínimo para valer a pena abrir a seção nesta página: cabeçalho + 1 linha
      const minRow = itemsHeight(sec.items.slice(idx, idx + 2), sec.highlight);
      if (remaining() < headH + minRow) { pushPage(); }

      const avail = remaining() - headH - SECTION_GAP;
      let take = itemsThatFit(sec.items.slice(idx), sec.highlight, avail);
      if (take === 0) { // não coube nem uma linha: nova página
        pushPage();
        const avail2 = remaining() - headH - SECTION_GAP;
        take = itemsThatFit(sec.items.slice(idx), sec.highlight, avail2);
        if (take === 0) take = 2; // salvaguarda
      }
      const slice = sec.items.slice(idx, idx + take);
      cur.blocks.push(renderSectionBlock(sec, slice, accent, !first));
      cur.used += headH + itemsHeight(slice, sec.highlight) + SECTION_GAP;
      idx += take;
      first = false;
    }
  }
  pushPage();
  return pages;
}

// ---- Capa ------------------------------------------------------------------
function renderCover() {
  // mangas e folhas estilizadas no canto
  const leaf = (x, y, r, sc, op) => `<g transform="translate(${x} ${y}) rotate(${r}) scale(${sc})" opacity="${op}">
      <path d="M0 0c20 6 30 22 30 40 0 6-2 12-6 18-14-4-24-18-24-36C0 14 0 6 0 0z" fill="${C.verdeClaro}"/>
      <path d="M2 4c8 14 14 30 16 50" fill="none" stroke="${C.creme}" stroke-width="1.4"/>
    </g>`;
  const mango = (x, y, r, sc, op) => `<g transform="translate(${x} ${y}) rotate(${r}) scale(${sc})" opacity="${op}">
      <path d="M0 22c-2-12 8-22 22-22 10 0 18 6 20 14 2 10-6 20-20 22C8 38 1 32 0 22z" fill="${C.amarelo}"/>
      <path d="M30 2c-2 4-2 7 0 10" fill="none" stroke="${C.marrom}" stroke-width="1.4"/>
    </g>`;
  return `<div class="page cover" data-canvas-width="${PAGE_W}" data-canvas-height="${PAGE_H}">
    <div class="cover-frame"></div>
    <svg class="cover-art tl" viewBox="0 0 220 220">${leaf(40, 10, 15, 1.6, .9)}${leaf(95, 0, 55, 1.1, .7)}${mango(20, 120, -10, 1.3, .95)}</svg>
    <svg class="cover-art br" viewBox="0 0 220 220">${leaf(150, 150, 200, 1.6, .9)}${leaf(60, 180, 250, 1.1, .7)}${mango(120, 40, 170, 1.3, .95)}</svg>
    <div class="cover-center">
      <div class="cover-logo">
        <svg viewBox="0 0 120 120" width="92" height="92" aria-hidden="true">
          <circle cx="60" cy="60" r="56" fill="none" stroke="${C.amarelo}" stroke-width="2"/>
          <path d="M60 24c14 6 22 18 22 33 0 9-4 17-10 24-12-5-20-17-20-32 0-10 3-18 8-25z" fill="${C.amarelo}"/>
          <path d="M62 30c-3 18-3 36 0 52" fill="none" stroke="${C.verde}" stroke-width="1.6"/>
          <path d="M44 72c-8-2-14-8-16-16 9-1 16 2 20 9" fill="${C.verdeClaro}"/>
        </svg>
      </div>
      <div class="cover-kicker">Restaurante</div>
      <h1 class="cover-title">${esc(meta.brand)}</h1>
      <div class="cover-branch">${branch(C.amarelo, 260)}</div>
      <div class="cover-sub">${esc(meta.subtitle)}</div>
      <div class="cover-slogan">${esc(meta.slogan)}</div>
    </div>
    <div class="cover-foot">cozinha • bar • tropical</div>
  </div>`;
}

// ---- Página de conteúdo ----------------------------------------------------
// Distribui as seções pela altura real da página com espaçadores elásticos:
// o conteúdo renderizado costuma ser menor que a estimativa conservadora, então
// o flex absorve a sobra distribuindo-a entre as seções (sem dobra no rodapé).
function renderPage(page, n, total) {
  const SP = '<div class="vspacer"></div>';
  const END = '<div class="vspacer end"></div>';
  const body = END + page.blocks.join(SP) + END;
  return `<div class="page" data-canvas-width="${PAGE_W}" data-canvas-height="${PAGE_H}">
    <div class="page-body">${body}</div>
    <div class="page-foot">
      <span class="foot-mark">
        <svg viewBox="0 0 24 24" width="15" height="15" aria-hidden="true"><path d="M12 3c5 2 8 7 8 12 0 3-1 5-3 7-4-2-7-7-7-12 0-3 1-5 2-7z" fill="${C.verde}"/></svg>
        ${esc(meta.brand)}
      </span>
      <span class="foot-page">${n} / ${total}</span>
    </div>
  </div>`;
}

// ---- CSS -------------------------------------------------------------------
const CSS = `
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { background: ${C.cinza}; font-family: ${SANS}; color: ${C.texto}; -webkit-font-smoothing: antialiased; }
  .doc { display: flex; flex-direction: column; align-items: center; gap: 20px; padding: 24px 0; }

  .page {
    position: relative; width: ${PAGE_W}px; height: ${PAGE_H}px;
    background: ${C.branco}; overflow: hidden;
    box-shadow: 0 6px 28px rgba(0,0,0,.14);
  }
  .page-body { position: absolute; top: ${CONTENT_TOP}px; left: ${MARGIN_X}px; width: ${CONTENT_W}px;
    height: ${CONTENT_H}px; display: flex; flex-direction: column; }

  /* espaçadores elásticos: preenchem a sobra real da página distribuindo-a
     entre as seções, evitando a "dobra" vazia no rodapé */
  .vspacer { flex: 1 1 0; min-height: ${SECTION_GAP}px; max-height: 130px; }
  .vspacer.end { flex: 0.35 1 0; min-height: 0; max-height: 46px; }

  /* ---- rodapé ---- */
  .page-foot {
    position: absolute; left: ${MARGIN_X}px; right: ${MARGIN_X}px; bottom: 16px;
    display: flex; justify-content: space-between; align-items: center;
    border-top: 1px solid ${C.amarelo};
    padding-top: 5px; font-size: 8px; letter-spacing: .12em; text-transform: uppercase; color: ${C.marrom};
  }
  .foot-mark { display: inline-flex; align-items: center; gap: 5px; font-weight: 600; }
  .foot-page { font-weight: 600; color: ${C.verde}; }

  /* ---- cabeçalho de seção ---- */
  .sec { break-inside: avoid; flex: 0 0 auto; }
  .sec-head { display: flex; align-items: center; gap: 7px; margin-bottom: 5px; }
  .sec-ic { display: inline-flex; flex: 0 0 auto; }
  .sec-ic svg { width: 18px; height: 18px; }
  .sec-title {
    font-family: ${SERIF}; font-weight: 700; font-size: 16px; line-height: 1;
    color: ${C.verde}; letter-spacing: .2px; white-space: nowrap;
  }
  .sec-en {
    font-family: ${SANS}; font-weight: 500; font-size: 7.5px; letter-spacing: .16em;
    text-transform: uppercase; color: ${C.amareloEsc}; padding-top: 3px;
  }
  .sec-rule { flex: 1 1 auto; height: 1px; margin-left: 4px;
    background: linear-gradient(90deg, ${C.amarelo}, rgba(93,64,55,.25)); }
  .sec-head.cont { margin-bottom: 4px; }
  .sec-title-sm { font-family: ${SERIF}; font-weight: 700; font-size: 12px; color: ${C.verde}; }
  .sec-title-sm em { font-family: ${SANS}; font-style: normal; font-weight: 500; font-size: 7.5px;
    letter-spacing: .14em; text-transform: uppercase; color: ${C.textoSuave}; }

  /* ---- itens em duas colunas ---- */
  .items { display: grid; grid-template-columns: repeat(${COLS}, 1fr); column-gap: ${COL_GAP}px; align-items: start; }
  .item { padding-bottom: ${ITEM_PAD}px; }
  .row { display: flex; align-items: baseline; gap: 4px; }
  .name { font-family: ${SANS}; font-weight: 600; font-size: 9.5px; color: ${C.texto}; line-height: 1.2; }
  .name .sz { font-weight: 500; font-size: 7.5px; color: ${C.textoSuave}; letter-spacing: .03em; }
  .leader { flex: 1 1 auto; min-width: 6px; align-self: stretch;
    border-bottom: 1px dotted ${C.marrom}; opacity: .4; transform: translateY(-3px); }
  .price { font-family: ${SANS}; font-weight: 700; font-size: 9.5px; color: ${C.verde}; white-space: nowrap; }
  .desc { font-family: ${SANS}; font-weight: 400; font-size: 8px; line-height: 1.3;
    color: ${C.textoSuave}; margin-top: 0.5px; max-width: 97%; }

  /* ---- cartões destacados (amarelo-manga) ---- */
  .items-hl { column-gap: 14px; }
  .item.hl { background: ${C.creme}; border: 1px solid ${C.amarelo};
    border-radius: 6px; padding: 5px 9px 6px; margin-bottom: 4px; }
  .item.hl .name { color: ${C.marrom}; }
  .item.hl .price { color: ${C.amareloEsc}; }
  .item.hl .leader { opacity: .3; }
  .item.hl .desc { color: #7a6a52; }

  /* ---- faixa de grupo ---- */
  .banner { display: flex; align-items: center; justify-content: center; gap: 16px;
    margin: 6px 0 18px; }
  .banner-txt { display: flex; flex-direction: column; align-items: center; }
  .banner-label { font-family: ${SERIF}; font-weight: 900; font-size: 26px; color: ${C.verde};
    letter-spacing: .5px; }
  .banner-note { font-family: ${SANS}; font-weight: 500; font-size: 9px; letter-spacing: .26em;
    text-transform: uppercase; color: ${C.marrom}; margin-top: 2px; }

  /* ===================== CAPA ===================== */
  .cover { background: ${C.verde};
    background-image: radial-gradient(circle at 30% 20%, ${C.verdeClaro} 0%, ${C.verde} 55%, #14491a 100%); }
  .cover-frame { position: absolute; inset: 26px; border: 1.5px solid rgba(255,183,77,.6); border-radius: 4px; }
  .cover-art { position: absolute; width: 300px; height: 300px; }
  .cover-art.tl { top: -10px; left: -10px; }
  .cover-art.br { bottom: -10px; right: -10px; transform: scaleX(-1); }
  .cover-center { position: absolute; left: 0; right: 0; top: 50%; transform: translateY(-50%);
    display: flex; flex-direction: column; align-items: center; text-align: center; padding: 0 60px; }
  .cover-logo { margin-bottom: 18px; }
  .cover-kicker { font-family: ${SANS}; font-weight: 500; font-size: 13px; letter-spacing: .5em;
    text-transform: uppercase; color: ${C.amarelo}; margin-left: .5em; }
  .cover-title { font-family: ${SERIF}; font-weight: 900; font-size: 76px; line-height: 1.02;
    color: ${C.branco}; margin: 8px 0 4px; text-shadow: 0 2px 18px rgba(0,0,0,.25); }
  .cover-branch { margin: 10px 0 12px; }
  .cover-sub { font-family: ${SERIF}; font-style: italic; font-weight: 400; font-size: 30px; color: ${C.amarelo}; }
  .cover-slogan { font-family: ${SANS}; font-weight: 300; font-size: 13px; letter-spacing: .18em;
    text-transform: uppercase; color: rgba(255,248,225,.85); margin-top: 16px; }
  .cover-foot { position: absolute; bottom: 48px; left: 0; right: 0; text-align: center;
    font-family: ${SANS}; font-weight: 500; font-size: 11px; letter-spacing: .4em;
    text-transform: uppercase; color: rgba(255,183,77,.85); }

  /* ===================== IMPRESSÃO ===================== */
  @page { size: A4; margin: 0; }
  @media print {
    body { background: #fff; }
    .doc { gap: 0; padding: 0; }
    .page { box-shadow: none; page-break-after: always; break-after: page; }
    .page:last-child { page-break-after: auto; }
  }
`;

// ---- Montagem do documento -------------------------------------------------
function build() {
  const pages = paginate();
  const total = pages.length; // sem capa — apenas páginas de itens
  const body = pages.map((p, i) => renderPage(p, i + 1, total)).join('\n');

  const html = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${esc(meta.brand)} — ${esc(meta.subtitle)}</title>
  <meta name="hz:slide-selector" content=".page" />
  <meta name="hz:canvas-width" content="${PAGE_W}" />
  <meta name="hz:canvas-height" content="${PAGE_H}" />
  ${FONT_LINK}
  <style>${CSS}</style>
</head>
<body>
  <div class="doc">
${body}
  </div>
</body>
</html>`;

  writeFileSync(join(ROOT, 'cardapio.html'), html, 'utf8');

  // relatório de ocupação para verificar que nenhuma página estourou
  const maxFill = Math.max(...pages.map((p) => p.used));
  const over = pages.filter((p) => p.used > BUDGET);
  console.log(`Páginas geradas: ${total} (apenas itens, sem capa)`);
  console.log(`Orçamento por página: ${Math.round(BUDGET)}px | maior ocupação: ${Math.round(maxFill)}px`);
  pages.forEach((p, i) => console.log(`  pág ${String(i + 1).padStart(2)} — ${Math.round(p.used)}px (${Math.round((p.used / BUDGET) * 100)}%)`));
  if (over.length) console.warn(`AVISO: ${over.length} página(s) acima do orçamento — ajuste a distribuição.`);
  else console.log('OK: nenhuma página excede o orçamento de altura.');
}

build();
