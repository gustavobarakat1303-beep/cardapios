// ---------------------------------------------------------------------------
// Pé de Manga — conteúdo do cardápio
// Transcrito fielmente do PDF original (assets/cardapio-original.pdf).
// Nomes, descrições e preços NÃO foram alterados.
//
// Cada item: { n: nome, d: descrição (pode ser ""), p: preço (string "00,00") }
// Cada seção: { id, title, kind, icon, highlight?, items: [...] }
//   kind:  "food" | "drink"  (define o ícone padrão e a cor de acento)
//   highlight: true -> itens renderizados como cartões destacados (amarelo-manga)
// ---------------------------------------------------------------------------

export const meta = {
  brand: 'Pé de Manga',
  subtitle: 'Cardápio',
  slogan: 'Cozinha tropical · ambiente que abraça',
};

// Faixas (banners) que separam grandes blocos do cardápio.
export const BANNERS = {
  pratos: { label: 'Pratos Principais', note: 'do fogo e do mar' },
  bebidas: { label: 'Bebidas', note: 'da torneira à taça' },
};

const SABORES = 'Sabores tradicionais (limão, abacaxi, morango, maracujá, lichia, limão siciliano, manga e frutas da estação)';

export const flow = [
  // ===================================================================== FOOD
  {
    id: 'petiscos', title: 'Petiscos', kind: 'food', icon: 'appetizer',
    en: 'Appetizers',
    items: [
      { n: 'Bolinho de Risoto', sz: '8 unidades', d: 'Bolinho de arroz arbóreo italiano, gorgonzola e ervas', p: '48,00' },
      { n: 'Bolinho de Picanha', sz: '8 unidades', d: 'Bolinho de picanha acompanha vinagrete (08 unidades)', p: '55,00' },
      { n: 'Bolinho de Costelinha', sz: '8 unidades', d: 'Bolinho de costelinha de porco (08 unidades)', p: '55,00' },
      { n: 'Bolinho de Bacalhau', sz: '8 unidades', d: 'Cod Dumpling', p: '55,00' },
      { n: 'Pastel de Carne Seca', sz: '10 unidades', d: 'Pastel de carne seca e requeijão', p: '49,00' },
      { n: 'Dadinho de Tapioca', d: 'Dadinho de tapioca com queijo coalho e geleia de pimenta', p: '55,00' },
      { n: 'Pastel de Queijo', sz: '10 unidades', d: 'Cheese pastry', p: '48,00' },
      { n: 'Mini Acarajé', sz: '8 unidades', d: 'Crocante por fora e macio por dentro, servido em 8 unidades; ideal para compartilhar e iniciar a experiência com identidade e sabor, transformando uma refeição simples em experiência', p: '85,00' },
      { n: 'Casquinha de Siri', sz: '2 unidades', d: 'Shredded crab with gratin cheese', p: '65,00' },
      { n: 'Croquete de Mandioca', sz: '8 unidades', d: 'Croquete de mandioca c/ carne seca e requeijão', p: '55,00' },
      { n: 'Coxinha de Bobó de Camarão', sz: '8 unidades', d: 'Brazilian fried shrimp balls', p: '55,00' },
      { n: 'Coxinha de Mix de Cogumelos', sz: 'vegana · 8 unidades', d: 'Massa vegana com recheio de cogumelos', p: '52,00' },
      { n: 'Bolinho de Feijoada', sz: '8 unidades', d: 'Bolinho de feijoada com molho de pimenta', p: '52,00' },
    ],
  },
  {
    id: 'porcoes', title: 'Porções', kind: 'food', icon: 'appetizer',
    en: 'Portions',
    items: [
      { n: 'Filé Aperitivo Madeira', d: 'Filé aperitivo c/ molho madeira com cebola', p: '85,00' },
      { n: 'Filé Aperitivo Queijo', d: 'Diced steak with cheese sauce', p: '85,00' },
      { n: 'Lulinha Flambada', d: 'Lulinha flambada ao azeite de ervas e conhaque, servido com aioli de limão siciliano', p: '89,00' },
      { n: 'Filé à Milanesa', d: 'Filé à milanesa com creme de gorgonzola e farofa de nozes', p: '85,00' },
      { n: 'Fritas', d: 'Fritas c/ alho confit, alecrim e maionese da casa', p: '48,00' },
      { n: 'Polvo à Provençal', d: 'Octopus to Provençal', p: '92,00' },
      { n: 'Carne Seca Acebolada', d: 'Carne seca acebolada na manteiga de garrafa, com mandioca frita', p: '85,00' },
    ],
  },
  {
    id: 'bruschettas', title: 'Bruschettas', kind: 'food', icon: 'bread',
    items: [
      { n: 'Pomodoro', sz: '6 unidades', d: 'Pão italiano, alho, parmesão, pedaços de tomate fresco, azeite e manjericão', p: '53,00' },
      { n: 'Brie, Rúcula e Geleia', sz: '6 unidades', d: 'Pão italiano, queijo brie, rúcula e geleia de damasco', p: '57,00' },
      { n: 'Shimeji e Shitake', sz: '6 unidades', d: 'Pão italiano, alho, parmesão c/ azeite, shimeji e shitake', p: '57,00' },
      { n: 'Gorgonzola e Geleia', sz: '6 unidades', d: 'Pão italiano, queijo gorgonzola, alho e geleia de amora', p: '56,00' },
    ],
  },
  {
    id: 'saladas', title: 'Saladas', kind: 'food', icon: 'salad',
    en: 'Salads',
    items: [
      { n: 'Caprese', d: 'Mussarela de búfala, tomate fresco, rúcula e pesto de manjericão', p: '49,00' },
      { n: 'Salada da Casa', d: 'Mix de folhas com tomate seco, palmito, mussarela de búfala, peito de peru e molho de manga', p: '49,00' },
      { n: 'Carpaccio Salada', d: 'Carpaccio de carne, alface americana, molho mostarda, alcaparras e parmesão', p: '66,00' },
      { n: 'Caesar Salad', d: 'Alface americana, frango desfiado, croutons, parmesão e molho de queijos', p: '49,00' },
      { n: 'Salada Maya', d: 'Mix de folhas, tomate cereja, mussarela de búfala, pimentão assado, guacamole, sour cream e frango', p: '49,00' },
      { n: 'Tartare de Salmão com Mix de Folhas', d: 'Tartar de salmão com guacamole e mix de folhas', p: '66,00' },
      { n: 'Carpaccio de Polvo', d: 'Carpaccio de polvo com azeite de ervas, azeite trufado, brotos coloridos e flor de sal', p: '68,00' },
    ],
  },
  {
    id: 'entradas-frias', title: 'Entradas Frias', kind: 'food', icon: 'salad',
    en: 'Cold Starters',
    items: [
      { n: 'Burrata', d: 'Fresh cream cheese with pesto and cherry tomatoes, com torradas', p: '59,00' },
      { n: 'Canapés de Carpaccio', d: 'Mini toast com carpaccio de carne, molho de mostarda, alcaparras e parmesão', p: '72,00' },
      { n: 'Carpaccio de Salmão', d: 'Lâminas finas de salmão fresco com sabor suave, rico em vitamina D e ômega-3, servido cru; basta adicionar tempero', p: '60,00' },
    ],
  },

  { banner: 'pratos' },

  {
    id: 'pratos-carnes', title: 'Pratos · Carnes', kind: 'food', icon: 'meat',
    en: 'Main Course · Meat',
    items: [
      { n: 'Medalhão de Filé Mignon', d: 'Ao molho cumberland e risoto de shitake', p: '94,00' },
      { n: 'Filé Mignon', d: 'Ao molho poivre com arroz e batata wave', p: '90,00' },
      { n: 'Picanha Grelhada', d: 'Farofa da casa, molho chimichurri, arroz e batata frita', p: '93,00' },
      { n: 'Filé de Cordeiro', d: 'Com couscuz marroquino com frutas secas ao molho de hortelã', p: '98,00' },
      { n: 'Medalhão de Filé Mignon', d: 'Ao molho vinho tinto e funghi com purê de mandioquinha', p: '94,00' },
      { n: 'Medalhão de Filé Mignon', d: 'Ao molho gorgonzola e risoto de rúcula com tomate seco', p: '94,00' },
    ],
  },
  {
    id: 'pratos-mar', title: 'Pratos · Mar', kind: 'food', icon: 'fish',
    en: 'Main Course · Seafood',
    items: [
      { n: 'Salmão Grelhado', d: 'Com risoto de banana da terra ao molho agridoce', p: '98,00' },
      { n: 'Polvo Grelhado', d: 'No azeite trufado com arroz negro e tomate cereja', p: '115,00' },
      { n: 'Filé de Robalo', d: 'Com crosta de ervas ao molho de tangerina, risoto de limão siciliano e farofa crocante', p: '98,00' },
      { n: 'Salmão com Crosta de Castanha do Pará', d: 'Ao molho brisque de camarão, batata noizete e mini legumes', p: '96,00' },
      { n: 'Camarão com Arroz Vermelho', d: 'Camarão servido com arroz vermelho ao molho beurre blanc e caviar', p: '130,00' },
    ],
  },
  {
    id: 'massas', title: 'Massas, Veganos e Vegetarianos', kind: 'food', icon: 'pasta',
    items: [
      { n: 'Penne', d: 'C/ tomate seco, mussarela de búfala e manjericão', p: '76,00' },
      { n: 'Nhoque de Mandioquinha', d: 'Com ragu de costela', p: '94,00' },
      { n: 'Opção Vegetariana', d: 'Nhoque de mandioquinha com cogumelos no molho vermelho', p: '72,00' },
      { n: 'Opção Vegana', d: 'Fusilli com legumes no azeite (cenoura, abobrinha, berinjela e aspargos)', p: '72,00' },
    ],
  },
  {
    id: 'hamburguer', title: 'Hambúrguer', kind: 'food', icon: 'burger',
    items: [
      { n: 'Hambúrguer de Picanha', d: 'Alface, tomate, queijo mussarela, bacon e fritas. Picanha steak hamburger, lettuce, tomato, mozzarella cheese and bacon', p: '57,00' },
      { n: 'Hambúrguer de Picanha', d: 'Queijo cheddar inglês, costelinha, maionese de repolho e fritas. Picanha steak hamburger with English cheddar cheese', p: '56,00' },
      { n: 'Hambúrguer de Picanha', d: 'Queijo gruyere, cogumelo puxado nas ervas, no pão de brioche e fritas. Picanha steak hamburger with gruyere cheese, herb-pulled mushroom served on brioche bread', p: '56,00' },
      { n: 'Hambúrguer Vegano', d: 'Mix de legumes, cogumelos, proteína de soja natural, tomate e salada mista, com molho de pesto vegano de manjericão. Obs: não acompanha pão e fritas', p: '55,00' },
      { n: 'Sanduíche de Polvo', d: 'Pão ciabata, polvo, chips de cebola, acompanha onion rings e chutney de manga', p: '65,00' },
    ],
  },
  {
    id: 'sobremesas', title: 'Sobremesas', kind: 'food', icon: 'dessert',
    en: 'Desserts',
    items: [
      { n: 'Cheesecake com Calda de Nutella', d: '', p: '42,00' },
      { n: 'Crepe de Brigadeiro', d: 'Com sorvete de creme e farofa crocante', p: '45,00' },
      { n: 'Churros', d: 'C/ doce de leite, sorvete de creme e farofa crocante', p: '49,00' },
      { n: 'Torta de Maçã', d: 'Com sorvete de creme e calda de caramelo', p: '46,00' },
      { n: 'Frutas da Estação', d: 'Seasonal fruits', p: '30,00' },
      { n: 'Brigadeiro de Colher', d: 'Chocolate in the spoon', p: '25,00' },
      { n: 'Petit Gateau', d: 'Com sorvete de creme', p: '49,00' },
      { n: 'Chocolamour', d: 'Sorvete de creme, chocolate, farofa crocante, chantilly com calda de chocolate', p: '48,00' },
      { n: 'Sorvete em Taça', d: 'Ice cream in a glass', p: '40,00' },
      { n: 'Sandwich Cookies', d: 'Bolacha de cookies com três sabores de sorvete com calda de chocolate', p: '49,00' },
      { n: 'Café Expresso', d: 'Três Corações', p: '9,00' },
    ],
  },
  {
    id: 'kids', title: 'Menu Kids', kind: 'food', icon: 'kids',
    en: 'Até 9 anos',
    items: [
      { n: 'Hamburguinho com Arroz e Fritas', d: 'Hamburguinho com arroz e batata frita', p: '45,00' },
      { n: 'Nuguets de Frango com Arroz e Fritas', d: 'Nuguets de frango com arroz e batata frita', p: '45,00' },
      { n: 'Hamburguinho c/ Espaghetti', d: 'Hamburguinho com espaghetti na manteiga', p: '45,00' },
      { n: 'Nuguets de Frango c/ Espaghetti', d: 'Nuguets de frango c/ espaghetti na manteiga', p: '45,00' },
    ],
  },

  // ==================================================================== DRINKS
  { banner: 'bebidas' },

  {
    id: 'chopp', title: 'Chopp', kind: 'drink', icon: 'beer',
    en: 'Draft Beer',
    items: [
      { n: 'Chopp Claro Brahma', sz: '300 ml', d: '', p: '15,00' },
      { n: 'Garotinho Brahma', d: '', p: '12,00' },
      { n: 'Chopp Brahma Black', d: '', p: '19,00' },
      { n: 'Chopp Patagônia Ipa', d: '', p: '25,00' },
    ],
  },
  {
    id: 'cervejas', title: 'Cervejas', kind: 'drink', icon: 'beer',
    en: 'Beer',
    items: [
      { n: 'Stella Artois', sz: '330 ml', d: 'Cervejas do estilo American India Pale Ale (IPAs Americanas) costumam ter cor dourada a âmbar e são caracterizadas por aromas cítricos', p: '20,00' },
      { n: 'Stella Artois', sz: '600 ml', d: 'Cervejas do estilo American India Pale Ale (IPAs Americanas) costumam ter cor dourada a âmbar e são caracterizadas por aromas cítricos', p: '26,00' },
      { n: 'Corona Extra', sz: '355 ml', d: 'É cerveja lager suave, refrescante e com leves toques cítricos', p: '25,00' },
      { n: 'Corona Zero', d: 'American lager sem álcool com vitamina D, leve e refrescante, com apenas 48 calorias', p: '22,00' },
      { n: 'Becks', sz: '600 ml', d: 'É uma legítima German Lager Puro Malte que segue à risca a Lei da Pureza da Cerveja desde 1873', p: '27,00' },
      { n: 'Goose Island Midway', sz: '355 ml', d: 'Com 4,1% de teor alcoólico, 30 IBU e aroma de frutas tropicais; uma Session IPA leve com lúpulo americano e malte caramelizado', p: '25,00' },
      { n: 'Colorado Ribeirão', sz: '600 ml', d: 'É uma lager leve e refrescante, mas com a cara de Colorado, cerveja clara com laranja, com IBU 20 e 4,5% de teor alcoólico', p: '30,00' },
      { n: 'Colorado Appia', sz: '600 ml', d: 'Cerveja de trigo, turva e adocicada, com espuma abundante e cremosa. Possui adição de mel de laranjeira', p: '30,00' },
    ],
  },
  {
    id: 'autorais', title: 'Carta de Drinks · Autorais', kind: 'drink', icon: 'cocktail', highlight: true,
    items: [
      { n: 'Lychee Sunset', d: 'Vodka, lichia, cranberry e limão tahiti', p: '52,00' },
      { n: 'Tropical Spritz', d: 'Aperol, espumante brut, manga, maracujá, cordial de grapefruit', p: '52,00' },
      { n: 'Pink Velvet', d: 'Vodka, frutas vermelhas, hibisco, limão siciliano', p: '52,00' },
      { n: 'Espresso Manga', d: 'Vodka, café espresso, licor de café, xarope de cacau, espuma de baunilha', p: '52,00' },
      { n: 'Botanic Tonic', d: 'Gin, cordial de grapefruit, água tônica premium, óleo cítrico', p: '55,00' },
      { n: 'Mango Sunset', d: 'Vodka, manga fresca, maracujá, limão tahiti, espuma leve de coco', p: '55,00' },
      { n: 'Spyce Tamarindo', d: 'Drink com tamarindo, notas cítricas e especiarias', p: '56,00' },
      { n: 'Coco Cloud', d: 'Vodka, água de coco, xarope de cumaru, suco de limão', p: '56,00' },
    ],
  },
  {
    id: 'classicos', title: 'Clássicos', kind: 'drink', icon: 'cocktail',
    items: [
      { n: 'Old Fashioned', d: 'Bulleit Bourbon, angostura e club soda', p: '45,00' },
      { n: 'Mojito', d: 'Rum, hortelã, água gaseosa, limão e açúcar', p: '45,00' },
      { n: 'Cuba Libre', d: 'Rum, cola e limão', p: '48,00' },
      { n: 'Blood Mary', d: 'Suco de tomate temperado e vodka', p: '45,00' },
      { n: 'Dry Martini', d: 'Gin e vermouth dry', p: '45,00' },
      { n: 'Kir', d: 'Vinho branco e licor de cassis', p: '45,00' },
      { n: 'Kir Royal', d: 'Champagne e licor de cassis', p: '45,00' },
      { n: 'Manhattan', d: 'Bulleit Bourbon, vermouth tinto e angostura', p: '45,00' },
      { n: 'Aperol Sprits', d: 'Aperol, Prosecco, laranja e água com gás', p: '47,00' },
      { n: 'Negroni', d: 'Campari, gin e vermute doce', p: '50,00' },
    ],
  },
  {
    id: 'outros-coqueteis', title: 'Outros Coquetéis', kind: 'drink', icon: 'cocktail',
    items: [
      { n: 'Moscow Mule', d: 'Vodka, gingerbeer artesanal (limão Taiti, xarope de açúcar e especiarias) e espuma de limão', p: '49,00' },
      { n: 'Boulevardier', d: 'Bulleit Bourbon, Campari, vermute tinto', p: '49,00' },
      { n: 'Basil Smash', d: 'Tanqueray London Dry, manjericão, limão e xarope de açúcar', p: '49,00' },
      { n: 'Fitzgerald', d: 'Tanqueray Ten, limão siciliano, xarope de açúcar e bitter', p: '53,00' },
      { n: 'Carpano Tonic', d: 'Vermute Carpano e água tônica', p: '45,00' },
      { n: 'Fernet Cola', d: 'Fernet Branca e refrigerante cola', p: '45,00' },
    ],
  },
  {
    id: 'sugestoes', title: 'Sugestões', kind: 'drink', icon: 'cocktail',
    items: [
      { n: 'Cuervo Margarita', d: 'Tequila Jose Cuervo, contreau, suco de limão', p: '45,00' },
      { n: 'Carajillo 43', d: 'Mistura café e licor 43 criando uma bebida refrescante', p: '45,00' },
      { n: 'Pisco Sour Capel', d: 'Coquetel sul-americano com pisco e limão', p: '45,00' },
      { n: 'New York Sour', d: 'Bulleit Bourbon, xarope de açúcar, suco de limão siciliano, vinho tinto', p: '50,00' },
      { n: 'Red Mojito', d: 'Rum oro, geleia de frutas vermelhas da casa, hortelã, suco de limão e soda limonada', p: '49,00' },
      { n: 'Pink Mule', d: "Gin Gordon's Pink, xarope de cranberry, soda limonada, espuma frutas vermelhas", p: '49,00' },
      { n: 'Clover Club', d: 'Gin London Dry, framboesa, suco de limão siciliano, albumina e grenadine', p: '49,00' },
      { n: 'Whiskey Sour', d: 'Bulleit Bourbon, suco de limão, xarope simples e albumina', p: '50,00' },
      { n: 'Villa Massa Amaretto Sour', d: 'Coquetel que equilibra licor de amaretto com limão, oferecendo notas de amêndoa, marzipã e um toque cítrico com final suave', p: '47,00' },
      { n: 'Villa Massa Limoncello Spirits', d: 'Lemon Ciello Villa Massa, Prosecco e água com gás', p: '47,00' },
      { n: 'Mini Beer', d: 'Shot em camadas de Licor 43 gelado coberto com creme, criando um contraste doce e cremoso', p: '40,00' },
      { n: 'Licor 43 com Limão', d: 'Licor 43 Original, sumo de limão Taiti', p: '47,00' },
    ],
  },
  {
    id: 'moquetel', title: 'Moquetel', kind: 'drink', icon: 'mocktail',
    en: 'Drinks não alcoólicos',
    items: [
      { n: 'Red Waves', d: 'Morangos, amoras, xarope de morango e soda limonada', p: '37,00' },
      { n: 'Primavera e Verão', d: 'Calda de jabuticaba, água gaseificada, limão cravo', p: '35,00' },
      { n: 'Santo Tropical', d: 'Purê de manga, capim santo, soda limão', p: '35,00' },
      { n: 'Raio Solar', d: 'Calda de maracujá, manjericão fresco, água de coco', p: '35,00' },
      { n: 'Pra Relaxar', d: 'Sumo de abacaxi com maçã vermelha, hortelã fresca, ginger ale', p: '35,00' },
    ],
  },
  {
    id: 'caipirinhas', title: 'Caipirinhas & Caipiroskas', kind: 'drink', icon: 'caipirinha',
    items: [
      { n: 'Caipiroska da Casa', d: 'Vodka, manga, maracujá e lichia', p: '46,00' },
      { n: 'Vodka Absolut', d: SABORES, p: '55,00' },
      { n: 'Saké', d: SABORES, p: '46,00' },
      { n: 'Vodka Ciroc', sz: 'Importada', d: SABORES, p: '62,00' },
      { n: 'Smirnoff Red', sz: 'Nacional', d: SABORES, p: '46,00' },
      { n: 'Espírito de Minas', d: SABORES, p: '49,00' },
      { n: 'Seleta', d: SABORES, p: '47,00' },
    ],
  },
  {
    id: 'whisky', title: 'Whisky', kind: 'drink', icon: 'bottle',
    items: [
      { n: 'Black Label', sz: '12 anos', d: '12 anos', p: '45,00' },
      { n: 'Red Label', sz: '8 anos', d: '8 anos', p: '37,00' },
    ],
  },
  {
    id: 'cachacas', title: 'Cachaças', kind: 'drink', icon: 'bottle',
    items: [
      { n: 'Cachaça Salinissima', d: 'Produzida em Salinas (MG); celebra a cultura local com simplicidade e tradição', p: '36,00' },
      { n: 'Epírito de Minas', d: 'Cachaça artesanal produzida em fazenda colonial em São Tiago (MG), com cor dourada, aroma doce e sabor intenso', p: '40,00' },
      { n: 'Seleta', d: 'Cachaça tradicional de Minas Gerais envelhecida por dois anos em barris de umburana, com sabor forte e persistente', p: '35,00' },
      { n: 'Busca Vida', d: 'Bebida de aguardente, mel e limão que equilibra sabores doces, amargos e cítricos, resultando em um drink suave e fácil de beber', p: '40,00' },
      { n: 'Cachaça Salinissima Amburana', d: 'Envelhecida em madeira amburana com notas de baunilha, amêndoas e especiarias', p: '40,00' },
    ],
  },
  {
    id: 'doses', title: 'Doses', kind: 'drink', icon: 'bottle',
    en: 'Shots',
    items: [
      { n: 'Tanqueray', d: 'Gin London Dry equilibrado com quatro botânicos e destilado quatro vezes; zimbro em destaque, ideal para coquetéis', p: '49,00' },
      { n: 'Saquê Dourado Azuma Kirin', d: 'Saquê de aroma delicado, paladar frutado com notas de cítricos, cogumelos e banana, acidez equilibrada e corpo leve', p: '40,00' },
      { n: 'Baileys', d: 'Licor irlandês que combina uísque e creme de leite com chocolate e baunilha para uma bebida indulgente, apreciada pura ou em coquetéis', p: '40,00' },
      { n: 'Jose Cuervo Especial Silver', d: 'Sabor suave com notas de agave; ideal para reinventar clássicos', p: '40,00' },
      { n: 'Tequila Jose Cuervo Especial Gold', d: 'Tequila mais vendida do mundo; envelhecida por 6 meses em carvalho americano', p: '40,00' },
      { n: 'Licor 43', d: 'Licor espanhol feito com 43 ingredientes naturais (citrus, ervas e baunilha)', p: '40,00' },
      { n: 'Fireball', d: 'Licoor de uísque canadense com sabor natural de canela', p: '35,00' },
      { n: 'Carpano Punt e Mes', d: 'Vermute com um ponto de doçura e meio de amargor; aromas de vinho do Porto, ervas, caramelo e cravo', p: '40,00' },
      { n: 'Pisco Capel Reservado', d: 'Pisco elaborado com uva Pedro Jimenez, duplamente destilado e de sabor suave', p: '40,00' },
      { n: 'Fernet Branca', d: 'Bebida amarga de ervas secretas, apreciada com cola ou em coquetéis como Hanky Panky', p: '35,00' },
      { n: 'Rum Nacional Ouro', d: '', p: '40,00' },
      { n: 'Rum Nacional Prata', d: '', p: '35,00' },
      { n: 'Campari', d: 'Licor italiano de sabor amargo com notas de laranja, ervas e especiarias, essencial em coquetéis clássicos', p: '40,00' },
      { n: 'Cointreau', d: 'Licor de laranja feito com cascas de laranjas doces e amargas, destilado na França sem aromatizantes artificiais', p: '40,00' },
      { n: 'Frangélico', d: 'Licor italiano de avelã com ervas, de coloração âmbar e notas doces de nougat; apresentado em garrafa em forma de frade', p: '35,00' },
      { n: 'Jose Cuervo Tradicional', sz: '100% Agave', d: 'Tequila 100% agave', p: '46,00' },
    ],
  },
  {
    id: 'sangria', title: 'Sangria e Clericot', kind: 'drink', icon: 'cocktail', highlight: true,
    items: [
      { n: 'Tinto', d: 'Refrescante mistura de vinho tinto com frutas frescas e especiarias', p: '120,00' },
      { n: 'Branco', d: 'Refrescante mistura de vinho branco com frutas frescas e especiarias', p: '120,00' },
      { n: 'Rosé', d: 'Refrescante mistura de vinho rosé com frutas frescas e especiarias', p: '120,00' },
      { n: 'Espumante', d: 'Refrescante mistura de espumante com frutas frescas e especiarias', p: '120,00' },
    ],
  },
  {
    id: 'vinhos-tintos', title: 'Carta de Vinhos · Tintos', kind: 'drink', icon: 'wine',
    en: 'Red',
    items: [
      { n: 'Carmen Carménère', sz: 'Viña Carmen · Chile', d: 'Vinho chileno com notas complexas de ameixas, cerejas e ervas, nuances de mocha e especiarias e taninos equilibrados', p: '170,00' },
      { n: 'Bordeaux Chevalier Lassalle', d: 'Mistura de Cabernet Sauvignon e Merlot amadurecida em carvalho francês; apresenta cor rubi, aromas de frutas vermelhas e negras com toques de tabaco e taninos suaves', p: '190,00' },
      { n: 'Alamos Malbec', d: 'Uva: Malbec · Região: Mendoza – Argentina', p: '170,00' },
      { n: 'Uxmal Malbec', d: 'Uva: Malbec · Região: Mendoza – Argentina', p: '170,00' },
      { n: 'Miluna Rosso', d: 'Uvas: Malvasia Nera, Negroamaro e Sangiovese · Região: Puglia – Itália', p: '170,00' },
      { n: 'Robertson Pinotage', d: 'Uva: Pinotage · Região: Robertson Valley – África do Sul', p: '160,00' },
      { n: 'Los Vascos Cabernet Sauvignon', d: 'Uva: Cabernet Sauvignon · Região: Valle de Colchagua – Chile', p: '190,00' },
      { n: 'Chevalier Lassalle', d: 'Uvas: Cabernet Sauvignon e Merlot · Região: Bordeaux – França', p: '190,00' },
      { n: 'La Vieille Ferme Rouge', d: 'Uvas: Carignan, Cinsault, Grenache e Syrah · Região: Rhône – França', p: '230,00' },
      { n: 'Catena Malbec', d: 'Uva: Malbec · Região: Mendoza – Argentina', p: '290,00' },
      { n: 'Alma Negra M Blend', d: 'Uvas: Bonarda e Malbec · Região: Mendoza – Argentina', p: '290,00' },
      { n: 'Animal Malbec Orgânico', d: 'Uva: Malbec · Região: Mendoza – Argentina', p: '265,00' },
      { n: 'DV Catena Cabernet-Malbec', d: 'Uvas: Malbec e Cabernet Sauvignon · Região: Mendoza – Argentina', p: '330,00' },
      { n: 'El Enemigo Bonarda El Barranco', d: 'Uva: Bonarda · Região: Mendoza – Argentina', p: '340,00' },
      { n: 'Carmen Reserva Pinot Noir', d: 'Uva: Pinot Noir (100%) · Região: Valle de San Antonio – Chile', p: '220,00' },
      { n: 'Padrillos Pinot Noir', d: 'Uva: Pinot Noir (100%) · Região: Luján de Cuyo – Argentina', p: '260,00' },
      { n: 'Posadas Viejas Tempranillo', d: 'Uva: Tempranillo · Região: Castilla la Mancha – Espanha', p: '160,00' },
      { n: 'Trofeo Cabernet Sauvignon', d: 'Vinho tinto chileno', p: '160,00' },
    ],
  },
  {
    id: 'vinhos-brancos', title: 'Carta de Vinhos · Brancos', kind: 'drink', icon: 'wine',
    en: 'White',
    items: [
      { n: 'Freixenet Pinot Grigio', d: 'Vinho branco elegante com final leve, caráter floral e frutado delicado e notas de citrinos; ideal com frutos do mar ou massas', p: '145,00' },
      { n: 'Miluna Bianco Puglia', d: 'Vinho branco da Puglia produzido pela Terre di Sava que combina Chardonnay e Malvasia Bianca, resultando em um vinho equilibrado e refrescante de excelente valor', p: '160,00' },
      { n: 'Posadas Viejas Blanco', d: 'Uvas: Cosecheros y Criadores (Martinez Bujanda) · Região: Viura – Espanha', p: '160,00' },
      { n: 'Alamos Chardonnay', d: 'Uva: Chardonnay · Região: Mendoza – Argentina', p: '170,00' },
      { n: 'Miluna Bianco', d: 'Uva: Terre di Sava · Região: Puglia – Itália', p: '160,00' },
      { n: 'Robertson Chenin Blanc', d: 'Uva: Chenin Blanc · Região: Robertson Valley – África do Sul', p: '160,00' },
      { n: 'Lagoalva', d: 'Uvas: Fernão Pires, Arinto, Sauvignon Blanc · Região: Tejo – Portugal', p: '260,00' },
      { n: 'La Vieille Ferme Blanc', d: 'Uvas: Bourboulenc, Grenache Blanc, Ugni Blanc e Vermentino · Região: Rhône – França', p: '235,00' },
      { n: 'Catena Chardonnay', d: 'Uva: Chardonnay · Região: Mendoza – Argentina', p: '270,00' },
      { n: 'Carmen Insigne Sauvignon Blanc', d: 'Uva: Sauvignon Blanc · Região: Mendoza – Argentina', p: '220,00' },
    ],
  },
  {
    id: 'vinhos-rose', title: 'Carta de Vinhos · Rosé', kind: 'drink', icon: 'wine',
    items: [
      { n: 'Freixenet Spain Rosado', d: 'Espumante rosé espanhol fresco e elegante com notas de morango, framboesa, cereja e raspas de citrinos, combinando frutas vermelhas e bolhas vivas', p: '145,00' },
      { n: 'Carmen Rosé Aperitif', d: 'Vinho rosé chileno de cor rosa pálido com reflexos salmão; aromas de morango e framboesa com toques cítricos e paladar equilibrado entre acidez e doçura', p: '170,00' },
      { n: 'Posadas Viejas Tempranillo Rosé', d: 'Uva: Tempranillo · Região: Castilla la Mancha – Espanha', p: '160,00' },
      { n: 'Los Vascos Rosé', d: 'Uvas: Syrah, Grenache Noir e Mourvèdre · Região: Chile', p: '190,00' },
      { n: 'La Vieille Ferme Rosé', d: 'Uvas: Cinsault, Grenache e Syrah · Região: Rhône – França', p: '230,00' },
    ],
  },
  {
    id: 'vinhos-tacas', title: 'Carta de Vinhos · Taças', kind: 'drink', icon: 'wine',
    en: '187 ml',
    items: [
      { n: 'Alamos Chardonnay', sz: 'taça 187 ml', d: 'Uva: Chardonnay · Região: Mendoza – Argentina', p: '65,00' },
      { n: 'Alamos Malbec', sz: 'taça 187 ml', d: 'Uva: Malbec · Região: Mendoza – Argentina', p: '65,00' },
    ],
  },
  {
    id: 'licores', title: 'Licores', kind: 'drink', icon: 'bottle',
    en: 'Liquors',
    items: [
      { n: 'Baileys', d: 'The original Irish Cream', p: '40,00' },
      { n: 'Cointreau', d: 'Licor com notas de casca de laranja e cítricos', p: '40,00' },
      { n: 'Licor 43', d: 'Licor espanhol de sabor único; leve notas de agave', p: '40,00' },
      { n: 'Fireball', d: 'Uísque canadense com sabor de canela', p: '35,00' },
      { n: 'Villa Massa Limoncello', d: 'Licor de limão autêntico de Sorrento feito com limões IGP; as cascas são maceradas e combinadas com xarope de açúcar, resultando em bebida doce, cítrica e suave servida gelada', p: '35,00' },
      { n: 'Villa Massa Amaretto', d: 'Licor de amêndoas doces e amargas baseado em receita italiana, feito com amêndoas da Sicília e notas de marzipã, baunilha, cereja e cacau', p: '46,00' },
      { n: 'Peachtree', d: 'Licor de pêssego pioneiro com aroma e sabor de pêssegos maduros; cristalino, levemente doce e ideal para coquetéis', p: '35,00' },
      { n: 'Licor 43 · Chocolate', d: 'Licor espanhol de sabor único, com notas marcantes de agave e nuances de chocolate', p: '40,00' },
      { n: 'Licor 43 · Creme Brûlée', d: 'Licor espanhol com notas de baunilha e caramelo, inspirado na sobremesa creme brûlée', p: '40,00' },
    ],
  },
  {
    id: 'diversos', title: 'Diversos', kind: 'drink', icon: 'soda',
    items: [
      { n: 'Soda Limonada', d: 'Lata', p: '10,00' },
      { n: 'Soda Zero', d: 'Lata', p: '10,00' },
      { n: 'H2O Limão', sz: '500 ml', d: '', p: '12,00' },
      { n: 'Água', d: '', p: '8,00' },
      { n: 'Água com Gás', d: '', p: '8,00' },
      { n: 'Sucos Naturais', d: 'Abacaxi, melancia, abacaxi com hortelã, laranja e limão-taiti', p: '15,00' },
      { n: 'Suco de Tomate Temperado', d: '', p: '18,00' },
      { n: 'Pepsi Twist', d: '', p: '10,00' },
      { n: 'Red Bull', d: '', p: '22,00' },
      { n: 'Pepsi Zero', d: '', p: '10,00' },
      { n: 'Guaraná Antarctica', d: '', p: '10,00' },
      { n: 'Guaraná Zero', d: '', p: '10,00' },
      { n: 'Pepsi', d: '', p: '10,00' },
    ],
  },
];
