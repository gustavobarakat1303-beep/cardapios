// GET /api/menus — devolve a lista de cardápios disponíveis (registro).
import { env, getRegistry } from './_github.js';

export default async function handler(req, res) {
  try {
    const menus = await getRegistry(env());
    res.setHeader('Cache-Control', 'no-store');
    res.status(200).json({ menus });
  } catch (e) {
    res.status(500).json({ error: String(e.message || e) });
  }
}
