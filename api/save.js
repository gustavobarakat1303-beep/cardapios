// POST /api/save — valida e grava o menu.json no GitHub (commit).
// Corpo: { password, menu }.  Protegido por ADMIN_PASSWORD.
import { env, putMenu, readJsonBody } from './_github.js';
import { validate, canonMenu } from '../build/lib/menu-core.mjs';

// Valida um evento por opções (Happy Hour): opções → seções → itens (texto).
function validateOpcoes(menu) {
  const errs = [];
  if (!String(menu.titulo || '').trim()) errs.push('título do menu ausente.');
  if (!Array.isArray(menu.opcoes) || !menu.opcoes.length) return [...errs, 'nenhuma opção definida.'];
  const ids = new Set();
  menu.opcoes.forEach((op, oi) => {
    const tag = op.titulo || op.id || `opção ${oi + 1}`;
    if (!String(op.id || '').trim()) errs.push(`${tag}: id ausente`);
    else if (ids.has(op.id)) errs.push(`id de opção duplicado: ${op.id}`); else ids.add(op.id);
    if (!String(op.titulo || '').trim()) errs.push(`${tag}: título ausente`);
    if (!Array.isArray(op.secoes) || !op.secoes.length) { errs.push(`${tag}: nenhuma seção`); return; }
    op.secoes.forEach((se, si) => {
      const setag = se.titulo || `seção ${si + 1}`;
      if (!String(se.titulo || '').trim()) errs.push(`${tag}: ${setag} sem título`);
      if (!Array.isArray(se.itens) || !se.itens.some((t) => String(t || '').trim()))
        errs.push(`${tag} / ${setag}: sem itens`);
    });
  });
  return errs;
}

export default async function handler(req, res) {
  if (req.method !== 'POST') { res.status(405).json({ error: 'use POST' }); return; }
  try {
    const cfg = env();
    const { password, menu, sha, slug, type } = await readJsonBody(req);
    const menuSlug = slug || 'completo';

    if (!cfg.password) { res.status(500).json({ error: 'ADMIN_PASSWORD não configurada no servidor.' }); return; }
    if (password !== cfg.password) { res.status(401).json({ error: 'senha incorreta.' }); return; }
    if (!menu || typeof menu !== 'object') { res.status(400).json({ error: 'dados inválidos.' }); return; }

    if (type === 'evento') {
      if (Array.isArray(menu.opcoes)) {
        // Evento por opções (Happy Hour): pacote fechado, sem preço.
        const errs = validateOpcoes(menu);
        if (errs.length) { res.status(422).json({ error: 'integridade falhou', detalhes: errs }); return; }
      } else {
        // Evento por seleção (Almoço/Jantar): 1 salada + 3 pratos principais.
        if (!menu.saladaSelecionada || !menu.saladaSelecionada.nome)
          { res.status(422).json({ error: 'selecione exatamente 1 salada.' }); return; }
        if (!Array.isArray(menu.principaisSelecionados) || menu.principaisSelecionados.length !== 3)
          { res.status(422).json({ error: 'selecione exatamente 3 pratos principais.' }); return; }
      }
      const out = await putMenu(cfg, menuSlug, menu, `painel: atualiza evento (${menuSlug})`, sha);
      res.status(200).json({ ok: true, commit: out.commit, sha: out.sha });
      return;
    }

    if (!Array.isArray(menu.sections)) { res.status(400).json({ error: 'menu inválido.' }); return; }
    const errs = validate(menu);
    if (errs.length) { res.status(422).json({ error: 'integridade falhou', detalhes: errs }); return; }

    const out = await putMenu(cfg, menuSlug, canonMenu(menu), `painel: atualiza cardápio (${menuSlug})`, sha);
    res.status(200).json({ ok: true, commit: out.commit, sha: out.sha });
  } catch (e) {
    if (e && e.code === 409) {
      res.status(409).json({ error: 'O cardápio foi alterado por outra sessão. Recarregue a página (sem perder suas edições não salvas) e tente de novo.' });
      return;
    }
    res.status(500).json({ error: String(e.message || e) });
  }
}
