// ---------------------------------------------------------------------------
// Pé de Manga — carregador multi-cardápio
//
// Cada cardápio é um arquivo data/<slug>.json (conteúdo) + um opcional
// build/layouts/<slug>.json (composição/escala das páginas, lado do gerador).
// O registro data/menus.json lista os cardápios disponíveis.
//
//   import { listMenus, loadMenu } from './menu-data.mjs'
// ---------------------------------------------------------------------------

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const DATA = join(ROOT, 'data');
const LAYOUTS = join(__dirname, 'layouts');

export const dataPath = (slug) => join(DATA, `${slug}.json`);

export function listMenus() {
  const reg = JSON.parse(readFileSync(join(DATA, 'menus.json'), 'utf8'));
  return reg.menus || [];
}

export function menuName(slug) {
  return (listMenus().find((m) => m.slug === slug) || {}).name || slug;
}

export function loadMenu(slug) {
  const menu = JSON.parse(readFileSync(dataPath(slug), 'utf8'));
  let layout = { pages: [], scales: [] };
  try { layout = JSON.parse(readFileSync(join(LAYOUTS, `${slug}.json`), 'utf8')); } catch {}
  return {
    slug,
    meta: menu.meta || { brand: 'Pé de Manga', subtitle: slug },
    BANNERS: menu.banners || {},
    sections: menu.sections || [],
    drinkPages: menu.layout?.drinkPages || [],
    foodBreaks: menu.layout?.foodBreaks || [],
    pages: layout.pages || [],
    scales: layout.scales || [],
  };
}
