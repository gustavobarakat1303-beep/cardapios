// ---------------------------------------------------------------------------
// Pé de Manga — registro dos cardápios editáveis pelo painel web.
//
// Cada cardápio aponta para um arquivo JSON versionado no repositório e um
// "tipo" que define como o painel o edita e como o servidor o valida:
//
//   - 'sections'  cardápio com seções/itens e preços  (data/menu.json)
//   - 'pacote'    menu de evento fechado por opção,    (MENU_*/*.json)
//                 sem preços: opções → seções → itens (texto)
//
// O painel só consegue carregar/salvar os arquivos listados aqui (whitelist).
// ---------------------------------------------------------------------------

export const MENUS = {
  principal: {
    file: 'data/menu.json',
    type: 'sections',
    label: 'Cardápio Principal',
    pdf: 'cardapio.pdf',
  },
  'happy-hour': {
    file: 'MENU_HAPPY_HOUR/happy_hour_opcoes.json',
    type: 'pacote',
    label: 'Happy Hour (evento)',
    pdf: 'MENU_HAPPY_HOUR/HAPPY_HOUR_OPCOES_A4_3_PARTES.pdf',
  },
};

export const DEFAULT_MENU = 'principal';

// Resolve uma chave de menu para sua configuração (ou null se desconhecida).
export function resolveMenu(key) {
  return Object.prototype.hasOwnProperty.call(MENUS, key) ? MENUS[key] : null;
}

// Lista enxuta para o seletor do painel (sem expor caminhos de arquivo).
export function menuList() {
  return Object.entries(MENUS).map(([key, m]) => ({ key, label: m.label, type: m.type }));
}
