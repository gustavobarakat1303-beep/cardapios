// GET /api/menu — devolve o menu.json atual (sempre fresco, sem cache).
import { env, getMenu } from './_github.js';

export default async function handler(req, res) {
  try {
    const cfg = env();
    const { json } = await getMenu(cfg);
    res.setHeader('Cache-Control', 'no-store');
    res.status(200).json(json);
  } catch (e) {
    res.status(500).json({ error: String(e.message || e) });
  }
}
