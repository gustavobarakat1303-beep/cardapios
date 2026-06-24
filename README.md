# Pé de Manga — Cardápio

Cardápio completo do restaurante **Pé de Manga**, com um *design system* tropical
(rústico-sofisticado) aplicado a um template A4 multipágina, gerado a partir dos
dados do cardápio e exportável para **PDF de alta resolução** e para um
**documento editável no Adobe Express**.

| Arquivo | Descrição |
| --- | --- |
| [`cardapio.html`](cardapio.html) | Cardápio final, HTML autocontido (A4, pronto para imprimir). |
| [`cardapio.pdf`](cardapio.pdf) | PDF de alta resolução gerado a partir do HTML (6 páginas, só itens). |
| [`build/menu-data.mjs`](build/menu-data.mjs) | Conteúdo do cardápio (nomes, descrições, preços) — fonte única da verdade. |
| [`build/build.mjs`](build/build.mjs) | Gerador: design system + motor de paginação A4 determinístico. |
| [`build/render.mjs`](build/render.mjs) | Renderiza HTML → PDF + screenshots (verificação visual). |
| [`assets/cardapio-original.pdf`](assets/cardapio-original.pdf) | PDF original recebido (referência de conteúdo). |

## Como gerar

```bash
npm run build      # gera cardapio.html a partir dos dados
npm run render     # gera cardapio.pdf + build/preview/*.png (requer Chrome local)
npm run all        # faz os dois
```

> Para gerar **apenas** o HTML não é preciso instalar nada (Node 18+).
> O `render` usa `puppeteer-core` + um Chrome baixado em `chrome/` (ver `.gitignore`).
> Para exportar um PDF rapidamente sem o Node, basta abrir `cardapio.html` no
> navegador e usar **Imprimir → Salvar como PDF** (papel A4, margens “Nenhuma”,
> “Gráficos de plano de fundo” ligado).

## Editando o cardápio

Todo o conteúdo vive em [`build/menu-data.mjs`](build/menu-data.mjs). Para
alterar um item, basta editar `n` (nome), `d` (descrição), `p` (preço) ou `sz`
(porção/observação) e rodar `npm run build`. O motor de paginação **redistribui
as páginas automaticamente** — não é preciso ajustar layout à mão.

---

## Design System — Pé de Manga

### 1. Paleta de cores

| Token | Hex | Uso |
| --- | --- | --- |
| Verde-manga profundo | `#1B5E20` | Cor primária — títulos de seção, preços, fundo da capa. |
| Verde-manga claro | `#2E7D32` | Gradientes e folhas. |
| Amarelo-manga | `#FFB74D` | Cor secundária — réguas, ícones de destaque, cartões de coquetéis. |
| Amarelo-manga escuro | `#E69A2E` | Texto sobre creme, rótulos. |
| Marrom-madeira | `#5D4037` | Barras, divisores, ícones de bebidas, rodapé. |
| Creme claro | `#FFF8E1` | Fundo dos cartões destacados. |
| Branco / Cinza suave | `#FFFFFF` / `#F5F5F5` | Fundo das páginas / fundo do documento. |
| Texto / Texto suave | `#2E2A26` / `#6B5E54` | Corpo / descrições. |

As cores foram escolhidas dentro de uma faixa segura para impressão (sem RGB
super-saturado) e mantêm contraste legível (WCAG AA) entre texto e fundo.

### 2. Tipografia (Adobe Fonts)

| Papel | Fonte | Tamanho |
| --- | --- | --- |
| Títulos de seção | Playfair Display Bold | 16 px |
| Nome do item | Montserrat SemiBold | 9,5 px |
| Preço | Montserrat Bold | 9,5 px |
| Descrição | Montserrat Regular | 8 px |
| Rótulos / EN / rodapé | Montserrat Medium (maiúsculas, espaçadas) | 7,5–8 px |

A hierarquia usa **tamanho + peso + cor** (não só tamanho): serifada elegante
nos títulos, sem serifa limpa no corpo. As fontes são carregadas via Adobe Fonts
(kit Typekit embutido no `<head>`), o que garante fidelidade na importação para o
Adobe Express. *Observação:* o corpo usa 9–11 px (≈ 7–8 pt) em vez dos 10–12 pt
sugeridos, para acomodar com elegância as ~240 itens em duas colunas — prática
comum em cardápios impressos; ajuste os tokens em `build/build.mjs` se preferir
tipos maiores e mais páginas.

### 3. Elementos gráficos

- **Ícones minimalistas** de traço fino por categoria (garfo & faca, folha,
  peixe, taça, garrafa, drink, sobremesa…), em SVG inline.
- **Divisores** — réguas finas em degradê amarelo→marrom e um **galho estilizado
  com manga/folha** nas faixas de grupo, na cor marrom/amarelo-madeira.
- **Logotipo** — marca de manga/folha desenhada na capa (topo) e uma marca
  reduzida no rodapé de cada página. Há área reservada para substituir pelo
  logotipo oficial do Pé de Manga quando disponível.

### 4. Layout e margens

- Página **A4** (794 × 1123 px @ 96 dpi).
- Tipografia compacta para acomodar **todo o cardápio em 6 páginas**, apenas itens
  (sem capa e sem faixas de grupo).
- Sistema de **duas colunas** para as listas.
- Preços alinhados à direita com **linha de condução pontilhada** (leader).

### 5. Templates

- **Páginas de seção** — cabeçalho serifado com ícone de categoria + régua; itens
  em duas colunas com preço à direita.
- **Destaques** — coquetéis autorais e Sangrias/Clericot em **cartões
  amarelo-manga** sobre creme.

> Há também um modo com **capa ilustrada** e **faixas de grupo** (“Pratos
> Principais” / “Bebidas”) no histórico do gerador — basta reativar a capa e as
> faixas em `build/build.mjs` se quiser a versão estendida.

### 6. Ordem das seções

Petiscos → Porções → Bruschettas → Saladas → Entradas Frias → Pratos
(Carnes / Mar / Massas/Veganos) → Hambúrguer → Sobremesas → Menu Kids → Chopp →
Cervejas → Drinks Autorais → Clássicos → Outros Coquetéis → Sugestões → Moquetel →
Caipirinhas → Whisky → Cachaças → Doses → Sangria e Clericot →
Vinhos (Tintos / Brancos / Rosé / Taças) → Licores → Diversos.

### 7. Exportação

- **PDF de alta resolução** (`cardapio.pdf`) para impressão e uso digital.
- **Adobe Express** — o HTML é compatível com o importador (metadados
  `hz:slide-selector` / `hz:canvas-*`, fontes Adobe Fonts, canvas fixo por
  página), gerando um documento nativo e editável.
