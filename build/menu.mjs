#!/usr/bin/env node
// ---------------------------------------------------------------------------
// Pé de Manga — CLI de automação do cardápio
//
// Fonte de verdade: data/menu.json
// Toda alteração (preço, edição, exclusão, inserção) passa por aqui, com
// validação, e pode reconstruir o HTML/PDF automaticamente.
//
//   node build/menu.mjs ajuda
//
// Exemplos:
//   node build/menu.mjs preco petiscos:bolinho-de-risoto 52,00 --build
//   node build/menu.mjs editar saladas:caprese --desc "Nova descrição" --pdf
//   node build/menu.mjs adicionar sobremesas --nome "Pudim" --preco 28,00 --build
//   node build/menu.mjs remover doses:fireball --build
//   node build/menu.mjs mover entradas-frias:burrata saladas --pos 1 --build
//   node build/menu.mjs exportar-csv
//   node build/menu.mjs importar-csv data/itens.csv --build
// ---------------------------------------------------------------------------

import { readFileSync, writeFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, join, resolve } from 'node:path';
import { slug, normalizePrice, canonItem, validate } from './lib/menu-core.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const DEFAULT_JSON = join(ROOT, 'data', 'menu.json');

// ---- utilidades de cor (saída amigável) -----------------------------------
const tty = process.stdout.isTTY;
const c = (n, s) => (tty ? `\x1b[${n}m${s}\x1b[0m` : String(s));
const bold = (s) => c('1', s), green = (s) => c('32', s), yellow = (s) => c('33', s),
  red = (s) => c('31', s), dim = (s) => c('2', s), cyan = (s) => c('36', s);

function die(msg) { console.error(red('✗ ') + msg); process.exit(1); }
function ok(msg) { console.log(green('✓ ') + msg); }

// ---- parsing de argumentos ------------------------------------------------
// Retorna { _: [posicionais], flags: Map(nome -> valor|true) }
function parseArgs(argv) {
  const _ = [];
  const flags = new Map();
  for (let i = 0; i < argv.length; i++) {
    const t = argv[i];
    if (t.startsWith('--')) {
      const name = t.slice(2);
      const next = argv[i + 1];
      if (next === undefined || next.startsWith('--')) { flags.set(name, true); }
      else { flags.set(name, next); i++; }
    } else { _.push(t); }
  }
  return { _, flags };
}

// ---- preço (normalização do núcleo, com erro amigável) --------------------
const price = (raw) => { try { return normalizePrice(raw); } catch (e) { die(e.message); } };

// ---- carga / gravação -----------------------------------------------------
function load(flags) {
  const path = flags.get('json') ? resolve(String(flags.get('json'))) : DEFAULT_JSON;
  let menu;
  try { menu = JSON.parse(readFileSync(path, 'utf8')); }
  catch (e) { die(`não consegui ler ${path}: ${e.message}`); }
  return { path, menu };
}

function save(path, menu) {
  for (const s of menu.sections) s.items = s.items.map(canonItem);
  const errs = validate(menu);
  if (errs.length) die('alterações não salvas — integridade falhou:\n  ' + errs.join('\n  '));
  writeFileSync(path, JSON.stringify(menu, null, 2) + '\n', 'utf8');
}

// ---- busca ----------------------------------------------------------------
function getSection(menu, id) {
  return menu.sections.find((s) => s.id === id);
}

// ref pode ser "secaoId:itemId" ou só "itemId" (se único globalmente)
function findItem(menu, ref) {
  if (!ref || ref === true) die('informe o item (ex.: secao:item).');
  let secId = null, itemId = ref;
  if (String(ref).includes(':')) { [secId, itemId] = String(ref).split(':'); }
  const hits = [];
  for (const s of menu.sections) {
    if (secId && s.id !== secId) continue;
    const idx = s.items.findIndex((it) => it.id === itemId);
    if (idx >= 0) hits.push({ section: s, item: s.items[idx], index: idx });
  }
  if (hits.length === 0) die(`item não encontrado: "${ref}". Use "listar" para ver os IDs.`);
  if (hits.length > 1) {
    die(`"${itemId}" existe em várias seções — qualifique com secao:item.\n  candidatos: `
      + hits.map((h) => cyan(`${h.section.id}:${h.item.id}`)).join(', '));
  }
  return hits[0];
}

// ---- reconstrução ---------------------------------------------------------
function rebuild(flags) {
  const wantPdf = flags.has('pdf');
  const wantBuild = wantPdf || flags.has('build') || flags.has('gerar');
  if (!wantBuild) return;
  try {
    console.log(dim('→ gerando cardapio.html...'));
    execFileSync('node', [join(__dirname, 'build.mjs')], { stdio: 'inherit', cwd: ROOT });
    if (wantPdf) {
      console.log(dim('→ renderizando cardapio.pdf...'));
      execFileSync('node', [join(__dirname, 'render.mjs')], { stdio: 'inherit', cwd: ROOT });
    }
  } catch { die('falha ao reconstruir (veja o erro acima).'); }
}

// ---- CSV (delimitador ';' — compatível com Excel pt-BR) -------------------
const CSV_COLS = ['secao_id', 'item_id', 'secao', 'nome', 'tamanho', 'descricao', 'preco'];
const csvCell = (v) => {
  const s = v == null ? '' : String(v);
  return /[";\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
};
function toCSV(menu) {
  const rows = [CSV_COLS.join(';')];
  for (const s of menu.sections) for (const it of s.items)
    rows.push([s.id, it.id, s.title, it.n, it.sz || '', it.d || '', it.p].map(csvCell).join(';'));
  return rows.join('\n') + '\n';
}
function parseCSV(text) {
  const rows = []; let row = [], cell = '', q = false;
  const t = text.replace(/\r\n?/g, '\n');
  for (let i = 0; i < t.length; i++) {
    const ch = t[i];
    if (q) {
      if (ch === '"') { if (t[i + 1] === '"') { cell += '"'; i++; } else q = false; }
      else cell += ch;
    } else if (ch === '"') q = true;
    else if (ch === ';') { row.push(cell); cell = ''; }
    else if (ch === '\n') { row.push(cell); rows.push(row); row = []; cell = ''; }
    else cell += ch;
  }
  if (cell !== '' || row.length) { row.push(cell); rows.push(row); }
  return rows.filter((r) => r.some((x) => x !== ''));
}

// ===========================================================================
// COMANDOS
// ===========================================================================
const commands = {};

commands.ajuda = () => {
  console.log(`${bold('Pé de Manga — automação do cardápio')}

${bold('Uso:')} node build/menu.mjs <comando> [args] [flags]

${bold('Consulta')}
  ${cyan('secoes')}                         lista as seções (id, título, nº de itens)
  ${cyan('listar')} [secaoId]               lista itens com ID e preço
  ${cyan('validar')}                        checa integridade dos dados

${bold('Itens')}
  ${cyan('preco')} <ref> <novoPreco>        atualiza o preço
  ${cyan('editar')} <ref> [--nome] [--desc] [--tam] [--preco]
  ${cyan('adicionar')} <secaoId> --nome <> --preco <> [--desc] [--tam] [--pos N] [--id]
  ${cyan('remover')} <ref>                  exclui um item
  ${cyan('mover')} <ref> <secaoId> [--pos N]  move o item para outra seção

${bold('Seções')}
  ${cyan('nova-secao')} --titulo <> --tipo food|drink [--icone] [--en] [--destaque] [--pagina N]
  ${cyan('renomear-secao')} <secaoId> [--titulo] [--en] [--icone]
  ${cyan('remover-secao')} <secaoId>        exclui a seção e seus itens

${bold('Planilha (lote)')}
  ${cyan('exportar-csv')} [arquivo]         exporta itens p/ CSV (padrão data/itens.csv)
  ${cyan('importar-csv')} <arquivo>         aplica preços/nomes/descrições do CSV

${bold('Geração')}
  ${cyan('gerar')} [--pdf]                  reconstrói cardapio.html (e .pdf com --pdf)

${bold('Flags globais')}
  --build       reconstrói o HTML após a alteração
  --pdf         reconstrói HTML e renderiza o PDF (implica --build)
  --json <path> usa outro arquivo de dados (padrão data/menu.json)

${dim('ref = "secaoId:itemId" (ex.: petiscos:bolinho-de-risoto) ou só "itemId" se único.')}`);
};

commands.secoes = (a, menu) => {
  console.log(bold(`${menu.sections.length} seções:\n`));
  for (const s of menu.sections) {
    const tag = s.kind === 'drink' ? yellow('bebida') : green('comida ');
    console.log(`  ${tag} ${cyan(s.id.padEnd(20))} ${s.items.length.toString().padStart(2)} itens  ${dim(s.title)}`);
  }
};

commands.listar = (a, menu) => {
  const only = a._[1];
  const secs = only ? menu.sections.filter((s) => s.id === only) : menu.sections;
  if (only && !secs.length) die(`seção não encontrada: ${only}`);
  for (const s of secs) {
    console.log(`\n${bold(s.title)} ${dim('(' + s.id + ')')}`);
    for (const it of s.items) {
      const sz = it.sz ? dim(' [' + it.sz + ']') : '';
      console.log(`  ${cyan(it.id.padEnd(34))} ${green((it.p + '').padStart(8))}  ${it.n}${sz}`);
    }
  }
};

commands.validar = (a, menu) => {
  const errs = validate(menu);
  if (!errs.length) { ok(`tudo certo — ${menu.sections.length} seções, ` +
    `${menu.sections.reduce((n, s) => n + s.items.length, 0)} itens.`); return; }
  console.log(red(`${errs.length} problema(s):`));
  for (const e of errs) console.log('  ' + red('•') + ' ' + e);
  process.exit(1);
};

commands.preco = (a, menu, path, flags) => {
  const ref = a._[1];
  const novo = price(a._[2]);
  const { item, section } = findItem(menu, ref);
  const antigo = item.p; item.p = novo;
  save(path, menu);
  ok(`preço de ${bold(item.n)} (${section.id}): ${yellow(antigo)} → ${green(novo)}`);
  rebuild(flags);
};

commands.editar = (a, menu, path, flags) => {
  const { item, section } = findItem(menu, a._[1]);
  const f = a.flags;
  let changed = [];
  if (f.has('nome')) { item.n = String(f.get('nome')); changed.push('nome'); }
  if (f.has('preco')) { item.p = price(f.get('preco')); changed.push('preço'); }
  if (f.has('tam')) { const v = String(f.get('tam') === true ? '' : f.get('tam')); if (v) item.sz = v; else delete item.sz; changed.push('tamanho'); }
  if (f.has('desc')) { const v = String(f.get('desc') === true ? '' : f.get('desc')); if (v) item.d = v; else delete item.d; changed.push('descrição'); }
  if (!changed.length) die('nada para editar — use --nome/--preco/--tam/--desc.');
  save(path, menu);
  ok(`editado ${bold(item.n)} (${section.id}): ${changed.join(', ')}`);
  rebuild(flags);
};

commands.adicionar = (a, menu, path, flags) => {
  const secId = a._[1];
  const sec = getSection(menu, secId);
  if (!sec) die(`seção não encontrada: ${secId}. Use "secoes".`);
  const f = a.flags;
  if (!f.has('nome')) die('--nome é obrigatório.');
  if (!f.has('preco')) die('--preco é obrigatório.');
  const nome = String(f.get('nome'));
  let id = f.has('id') ? slug(f.get('id')) : slug(nome);
  const existing = new Set(sec.items.map((i) => i.id));
  if (existing.has(id)) { let k = 2; while (existing.has(`${id}-${k}`)) k++; id = `${id}-${k}`; }
  const item = { id, n: nome, p: price(f.get('preco')) };
  if (f.has('tam') && f.get('tam') !== true) item.sz = String(f.get('tam'));
  if (f.has('desc') && f.get('desc') !== true) item.d = String(f.get('desc'));
  let pos = sec.items.length;
  if (f.has('pos')) { pos = Math.max(0, Math.min(sec.items.length, parseInt(f.get('pos'), 10) - 1)); }
  sec.items.splice(pos, 0, item);
  save(path, menu);
  ok(`adicionado ${bold(item.n)} (${green(item.p)}) em ${sec.title} como ${cyan(secId + ':' + id)} [pos ${pos + 1}]`);
  rebuild(flags);
};

commands.remover = (a, menu, path, flags) => {
  const { section, index, item } = findItem(menu, a._[1]);
  section.items.splice(index, 1);
  save(path, menu);
  ok(`removido ${bold(item.n)} de ${section.title}`);
  rebuild(flags);
};

commands.mover = (a, menu, path, flags) => {
  const src = findItem(menu, a._[1]);
  const destId = a._[2];
  const dest = getSection(menu, destId);
  if (!dest) die(`seção destino não encontrada: ${destId}`);
  src.section.items.splice(src.index, 1);
  // garante id único no destino
  let id = src.item.id; const ex = new Set(dest.items.map((i) => i.id));
  if (ex.has(id)) { let k = 2; while (ex.has(`${id}-${k}`)) k++; id = `${id}-${k}`; }
  src.item.id = id;
  let pos = dest.items.length;
  if (a.flags.has('pos')) pos = Math.max(0, Math.min(dest.items.length, parseInt(a.flags.get('pos'), 10) - 1));
  dest.items.splice(pos, 0, src.item);
  save(path, menu);
  ok(`movido ${bold(src.item.n)} de ${src.section.title} → ${dest.title} (${cyan(destId + ':' + id)})`);
  rebuild(flags);
};

commands['exportar-csv'] = (a, menu) => {
  const out = a._[1] ? resolve(String(a._[1])) : join(ROOT, 'data', 'itens.csv');
  writeFileSync(out, toCSV(menu), 'utf8');
  const n = menu.sections.reduce((x, s) => x + s.items.length, 0);
  ok(`${n} itens exportados → ${out}`);
  console.log(dim('  edite na planilha (delimitador ";") e use: node build/menu.mjs importar-csv ' + out));
};

commands['importar-csv'] = (a, menu, path, flags) => {
  const file = a._[1];
  if (!file) die('informe o arquivo CSV.');
  let rows;
  try { rows = parseCSV(readFileSync(resolve(String(file)), 'utf8')); }
  catch (e) { die(`não consegui ler ${file}: ${e.message}`); }
  const header = rows.shift();
  const col = Object.fromEntries(CSV_COLS.map((name) => [name, header.indexOf(name)]));
  if (col.secao_id < 0 || col.preco < 0) die('cabeçalho do CSV inválido (esperado: ' + CSV_COLS.join(';') + ').');
  let upd = 0, ins = 0;
  for (const r of rows) {
    const secId = (r[col.secao_id] || '').trim();
    const itemId = (r[col.item_id] || '').trim();
    const sec = getSection(menu, secId);
    if (!sec) { console.log(yellow(`  ! seção desconhecida ignorada: ${secId}`)); continue; }
    const nome = col.nome >= 0 ? (r[col.nome] || '').trim() : '';
    const tam = col.tamanho >= 0 ? (r[col.tamanho] || '').trim() : '';
    const desc = col.descricao >= 0 ? (r[col.descricao] || '').trim() : '';
    const preco = (r[col.preco] || '').trim();
    const it = itemId ? sec.items.find((x) => x.id === itemId) : null;
    if (it) { // atualiza existente
      if (nome) it.n = nome;
      it.sz = tam || undefined; if (!it.sz) delete it.sz;
      it.d = desc || undefined; if (!it.d) delete it.d;
      if (preco) it.p = price(preco);
      upd++;
    } else if (!itemId && nome && preco) { // linha nova -> insere
      let id = slug(nome); const ex = new Set(sec.items.map((i) => i.id));
      if (ex.has(id)) { let k = 2; while (ex.has(`${id}-${k}`)) k++; id = `${id}-${k}`; }
      const ni = { id, n: nome, p: price(preco) };
      if (tam) ni.sz = tam; if (desc) ni.d = desc;
      sec.items.push(ni); ins++;
    }
  }
  save(path, menu);
  ok(`CSV importado — ${upd} atualizado(s), ${ins} inserido(s). ${dim('(remoções só via "remover")')}`);
  rebuild(flags);
};

commands.gerar = (a, menu, path, flags) => {
  flags.set('build', true); // força build
  rebuild(flags);
  ok('geração concluída.');
};

// ---- seções ---------------------------------------------------------------
const ICONS = ['appetizer','bread','salad','meat','fish','pasta','burger','dessert',
  'kids','beer','cocktail','mocktail','caipirinha','bottle','wine','soda'];

commands['nova-secao'] = (a, menu, path, flags) => {
  const f = a.flags;
  if (!f.has('titulo')) die('--titulo é obrigatório.');
  const titulo = String(f.get('titulo'));
  const tipo = String(f.has('tipo') ? f.get('tipo') : 'food');
  if (!['food', 'drink'].includes(tipo)) die('--tipo deve ser food ou drink.');
  let id = f.has('id') ? slug(f.get('id')) : slug(titulo);
  if (getSection(menu, id)) { let k = 2; while (getSection(menu, `${id}-${k}`)) k++; id = `${id}-${k}`; }
  const icon = f.has('icone') ? String(f.get('icone')) : (tipo === 'drink' ? 'cocktail' : 'appetizer');
  if (!ICONS.includes(icon)) die(`ícone inválido. Opções: ${ICONS.join(', ')}`);
  const sec = { id, title: titulo, kind: tipo, icon, items: [] };
  if (f.has('en') && f.get('en') !== true) sec.en = String(f.get('en'));
  if (f.has('destaque')) sec.highlight = true;
  menu.sections.push(sec);
  if (tipo === 'drink') { // precisa estar numa página de bebidas p/ ser impressa
    menu.layout = menu.layout || {}; menu.layout.drinkPages = menu.layout.drinkPages || [[]];
    const pages = menu.layout.drinkPages;
    let pg = pages.length - 1;
    if (f.has('pagina')) pg = Math.max(0, Math.min(pages.length - 1, parseInt(f.get('pagina'), 10) - 1));
    pages[pg].push(id);
    console.log(dim(`  (adicionada à página de bebidas ${pg + 1})`));
  }
  save(path, menu);
  ok(`seção criada: ${cyan(id)} — ${bold(titulo)} (${tipo})`);
  rebuild(flags);
};

commands['renomear-secao'] = (a, menu, path, flags) => {
  const sec = getSection(menu, a._[1]);
  if (!sec) die(`seção não encontrada: ${a._[1]}`);
  const f = a.flags; let changed = [];
  if (f.has('titulo')) { sec.title = String(f.get('titulo')); changed.push('título'); }
  if (f.has('en')) { const v = f.get('en') === true ? '' : String(f.get('en')); if (v) sec.en = v; else delete sec.en; changed.push('EN'); }
  if (f.has('icone')) { const v = String(f.get('icone')); if (!ICONS.includes(v)) die(`ícone inválido. Opções: ${ICONS.join(', ')}`); sec.icon = v; changed.push('ícone'); }
  if (!changed.length) die('nada para alterar — use --titulo/--en/--icone.');
  save(path, menu);
  ok(`seção ${sec.id} atualizada: ${changed.join(', ')}`);
  rebuild(flags);
};

commands['remover-secao'] = (a, menu, path, flags) => {
  const id = a._[1];
  const i = menu.sections.findIndex((s) => s.id === id);
  if (i < 0) die(`seção não encontrada: ${id}`);
  const sec = menu.sections[i];
  menu.sections.splice(i, 1);
  if (menu.layout?.drinkPages)
    menu.layout.drinkPages = menu.layout.drinkPages.map((p) => p.filter((x) => x !== id)).filter((p) => p.length);
  if (menu.layout?.foodBreaks) menu.layout.foodBreaks = menu.layout.foodBreaks.filter((x) => x !== id);
  save(path, menu);
  ok(`seção removida: ${bold(sec.title)} (${sec.items.length} itens)`);
  rebuild(flags);
};

// ---- dispatch -------------------------------------------------------------
const argv = process.argv.slice(2);
if (!argv.length || argv[0] === 'ajuda' || argv[0] === '--help' || argv[0] === '-h') {
  commands.ajuda(); process.exit(0);
}
const a = parseArgs(argv);
const cmd = a._[0];
if (!commands[cmd]) die(`comando desconhecido: "${cmd}". Veja: node build/menu.mjs ajuda`);
const { path, menu } = load(a.flags);
commands[cmd](a, menu, path, a.flags);
