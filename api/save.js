// POST /api/save — valida e grava o JSON do cardápio no GitHub (commit).
// Corpo: { password, key?, menu }.  Protegido por ADMIN_PASSWORD.
import { env, putJson, readJsonBody } from './_github.js';
import { resolveMenu, DEFAULT_MENU } from '../build/lib/menus.mjs';
import { validate, canonMenu, validatePacote, canonPacote } from '../build/lib/menu-core.mjs';

export default async function handler(req, res) {
  if (req.method !== 'POST') { res.status(405).json({ error: 'use POST' }); return; }
  try {
    const cfg = env();
    const { password, key = DEFAULT_MENU, menu } = await readJsonBody(req);

    const target = resolveMenu(key);
    if (!target) { res.status(400).json({ error: `cardápio desconhecido: ${key}` }); return; }
    if (!cfg.password) { res.status(500).json({ error: 'ADMIN_PASSWORD não configurada no servidor.' }); return; }
    if (password !== cfg.password) { res.status(401).json({ error: 'senha incorreta.' }); return; }
    if (!menu || typeof menu !== 'object') { res.status(400).json({ error: 'menu inválido.' }); return; }

    const errs = target.type === 'pacote' ? validatePacote(menu) : validate(menu);
    if (errs.length) { res.status(422).json({ error: 'integridade falhou', detalhes: errs }); return; }

    const canon = target.type === 'pacote' ? canonPacote(menu) : canonMenu(menu);
    const { commit } = await putJson(cfg, target.file, canon, `painel: atualiza ${target.label}`);
    res.status(200).json({ ok: true, commit });
  } catch (e) {
    res.status(500).json({ error: String(e.message || e) });
  }
}
