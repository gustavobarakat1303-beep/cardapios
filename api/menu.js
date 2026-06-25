// GET /api/menu[?menu=<chave>] — devolve o JSON do cardápio pedido (sem cache).
// Resposta: { key, type, label, menus: [...], menu: <conteúdo> }.
import { env, getJson, menuKey } from './_github.js';
import { resolveMenu, menuList, DEFAULT_MENU } from '../build/lib/menus.mjs';

export default async function handler(req, res) {
  try {
    const key = menuKey(req, DEFAULT_MENU);
    const cfg = resolveMenu(key);
    if (!cfg) { res.status(400).json({ error: `cardápio desconhecido: ${key}` }); return; }
    const { json } = await getJson(env(), cfg.file);
    res.setHeader('Cache-Control', 'no-store');
    res.status(200).json({ key, type: cfg.type, label: cfg.label, pdf: cfg.pdf, menus: menuList(), menu: json });
  } catch (e) {
    res.status(500).json({ error: String(e.message || e) });
  }
}
