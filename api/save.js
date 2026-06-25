// POST /api/save — valida e grava o menu.json no GitHub (commit).
// Corpo: { password, menu }.  Protegido por ADMIN_PASSWORD.
import { env, putMenu, readJsonBody } from './_github.js';
import { validate, canonMenu } from '../build/lib/menu-core.mjs';

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
      if (!menu.saladaSelecionada || !menu.saladaSelecionada.nome)
        { res.status(422).json({ error: 'selecione exatamente 1 salada.' }); return; }
      if (!Array.isArray(menu.principaisSelecionados) || menu.principaisSelecionados.length !== 3)
        { res.status(422).json({ error: 'selecione exatamente 3 pratos principais.' }); return; }
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
