// ---------------------------------------------------------------------------
// Pé de Manga — carregador dos dados do cardápio
//
// A FONTE DE VERDADE é o arquivo data/menu.json (na raiz do projeto).
// Edite o cardápio pela CLI de automação:
//
//     node build/menu.mjs ajuda
//
// Este módulo apenas lê o JSON e expõe as estruturas que o gerador
// (build/build.mjs) consome. Não edite os itens aqui.
// ---------------------------------------------------------------------------

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
export const MENU_PATH = join(__dirname, '..', 'data', 'menu.json');

const menu = JSON.parse(readFileSync(MENU_PATH, 'utf8'));

export const meta = menu.meta;
export const BANNERS = menu.banners || {};
export const sections = menu.sections;
export const DRINK_PAGES = menu.layout?.drinkPages || [];
export const FOOD_BREAKS = menu.layout?.foodBreaks || [];
// Composição/escala das páginas vivem AQUI (lado do gerador), não no menu.json —
// assim o painel pode reescrever o conteúdo sem nunca quebrar o layout.
let _layout = { pages: [], scales: [] };
try { _layout = JSON.parse(readFileSync(join(__dirname, 'layout.json'), 'utf8')); } catch {}
export const PAGES = _layout.pages || [];
export const SCALES = _layout.scales || [];

// Compatibilidade: `flow` é a lista de seções na ordem do arquivo.
export const flow = sections;
