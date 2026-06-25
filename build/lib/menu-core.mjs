// ---------------------------------------------------------------------------
// Pé de Manga — núcleo compartilhado (CLI + painel web / serverless)
// Funções puras: slug, normalização de preço, ordem canônica e validação.
// Sem efeitos colaterais (não imprime, não sai do processo).
// ---------------------------------------------------------------------------

export const PRICE_RE = /^\d{1,4},\d{2}$/;

export function slug(s) {
  return (String(s).toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 40)) || 'item';
}

// Aceita "48", "48.0", "48,5", "48,00", "1.234,50" -> "00,00". Lança em erro.
export function normalizePrice(raw) {
  if (raw === true || raw === undefined || raw === null || raw === '')
    throw new Error('preço ausente.');
  let s = String(raw).trim().replace(/\s|R\$/gi, '');
  if (s.includes(',')) s = s.replace(/\./g, '').replace(',', '.');
  const num = Number(s);
  if (!Number.isFinite(num) || num < 0) throw new Error(`preço inválido: "${raw}"`);
  return num.toFixed(2).replace('.', ',');
}

export function canonItem(it) {
  const o = { id: it.id, n: it.n };
  if (it.sz) o.sz = it.sz;
  if (it.d) o.d = it.d;
  o.p = it.p;
  return o;
}

// Reescreve o menu em ordem canônica de campos (diffs limpos).
export function canonMenu(menu) {
  for (const s of menu.sections || []) s.items = (s.items || []).map(canonItem);
  return menu;
}

// Retorna um array de mensagens de erro (vazio = íntegro).
export function validate(menu) {
  const errs = [];
  if (!menu || typeof menu !== 'object') return ['menu inválido (não é um objeto).'];
  if (!Array.isArray(menu.sections)) return ['menu.sections ausente ou inválido.'];
  const sids = new Set();
  for (const s of menu.sections) {
    if (!s.id) { errs.push(`seção sem id (${s.title || '?'})`); continue; }
    if (sids.has(s.id)) errs.push(`seção duplicada: ${s.id}`);
    sids.add(s.id);
    if (!['food', 'drink'].includes(s.kind)) errs.push(`${s.id}: kind inválido "${s.kind}" (use food|drink)`);
    const iids = new Set();
    for (const it of s.items || []) {
      if (!it.id) errs.push(`${s.id}: item sem id (${it.n || '?'})`);
      if (iids.has(it.id)) errs.push(`${s.id}: id de item duplicado: ${it.id}`);
      iids.add(it.id);
      if (!it.n) errs.push(`${s.id}:${it.id}: nome vazio`);
      if (!PRICE_RE.test(it.p || '')) errs.push(`${s.id}:${it.id}: preço inválido "${it.p}"`);
    }
  }
  const pages = (menu.layout?.drinkPages || []).flat();
  for (const s of menu.sections) {
    if (s.kind === 'drink' && !pages.includes(s.id))
      errs.push(`seção de bebida "${s.id}" não está em layout.drinkPages (não seria impressa)`);
  }
  for (const id of pages) if (!sids.has(id)) errs.push(`drinkPages referencia seção inexistente: ${id}`);
  for (const id of (menu.layout?.foodBreaks || []))
    if (!sids.has(id)) errs.push(`foodBreaks referencia seção inexistente: ${id}`);
  return errs;
}

// ---------------------------------------------------------------------------
// Menus de evento "pacote" (Happy Hour, Almoço/Jantar): opções → seções →
// itens (texto, sem preço). Estrutura: { titulo, opcoes: [ { id, titulo,
// chamada?, secoes: [ { titulo, itens: [string] } ] } ] }.
// ---------------------------------------------------------------------------

// Retorna um array de mensagens de erro (vazio = íntegro).
export function validatePacote(menu) {
  const errs = [];
  if (!menu || typeof menu !== 'object') return ['arquivo inválido (não é um objeto).'];
  if (!String(menu.titulo || '').trim()) errs.push('título do menu ausente.');
  if (!Array.isArray(menu.opcoes) || !menu.opcoes.length) return [...errs, 'nenhuma opção definida.'];
  const oids = new Set();
  menu.opcoes.forEach((op, oi) => {
    const tag = op.titulo || op.id || `opção ${oi + 1}`;
    if (!String(op.id || '').trim()) errs.push(`${tag}: id ausente`);
    else if (oids.has(op.id)) errs.push(`id de opção duplicado: ${op.id}`);
    else oids.add(op.id);
    if (!String(op.titulo || '').trim()) errs.push(`${tag}: título ausente`);
    if (!Array.isArray(op.secoes) || !op.secoes.length) { errs.push(`${tag}: nenhuma seção`); return; }
    op.secoes.forEach((se, si) => {
      const setag = se.titulo || `seção ${si + 1}`;
      if (!String(se.titulo || '').trim()) errs.push(`${tag}: ${setag} sem título`);
      const itens = (se.itens || []).filter((t) => String(t || '').trim());
      if (!itens.length) errs.push(`${tag} / ${setag}: sem itens`);
    });
  });
  return errs;
}

// Normaliza um menu de pacote: apara textos, descarta itens vazios e mantém
// os metadados de topo (titulo, subtitulo, periodo, rodape, _como_editar…).
export function canonPacote(menu) {
  const out = { ...menu };
  out.opcoes = (menu.opcoes || []).map((op) => {
    const o = { id: String(op.id || '').trim(), titulo: String(op.titulo || '').trim() };
    if (op.chamada !== undefined) o.chamada = String(op.chamada || '').trim();
    o.secoes = (op.secoes || []).map((se) => ({
      titulo: String(se.titulo || '').trim(),
      itens: (se.itens || []).map((t) => String(t).trim()).filter(Boolean),
    }));
    return o;
  });
  return out;
}
