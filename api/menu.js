// GET /api/menu?menu=<slug> — devolve o cardápio atual (sempre fresco) + sha.
import { env, getMenu } from './_github.js';

export default async function handler(req, res) {
  try {
    const cfg = env();
    const slug = new URL(req.url, 'http://x').searchParams.get('menu') || 'completo';
    const { json, sha } = await getMenu(cfg, slug);
    res.setHeader('Cache-Control', 'no-store');
    res.status(200).json({ menu: json, sha, slug });
  } catch (e) {
    res.status(500).json({ error: String(e.message || e) });
  }
}
