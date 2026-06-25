# Pé de Manga — Cardápio

Cardápio completo do restaurante **Pé de Manga**, com um *design system* tropical
(rústico-sofisticado) aplicado a um template A4 multipágina, gerado a partir dos
dados do cardápio e exportável para **PDF de alta resolução** e para um
**documento editável no Adobe Express**.

| Arquivo | Descrição |
| --- | --- |
| [`cardapio.html`](cardapio.html) | Cardápio final, HTML autocontido (A4, pronto para imprimir). |
| [`cardapio.pdf`](cardapio.pdf) | PDF de alta resolução gerado a partir do HTML (6 páginas, só itens). |
| [`data/menu.json`](data/menu.json) | **Fonte única da verdade** — todos os itens, preços, seções e layout. |
| [`build/menu.mjs`](build/menu.mjs) | **CLI de automação** — preço, edição, exclusão, inserção, CSV em lote. |
| [`build/menu-data.mjs`](build/menu-data.mjs) | Carregador: lê o `menu.json` e expõe os dados ao gerador. |
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

## Editando o cardápio — automação (CLI)

Todo o conteúdo vive em [`data/menu.json`](data/menu.json) e é gerenciado pela
CLI [`build/menu.mjs`](build/menu.mjs), que **valida** cada alteração e pode
**reconstruir o HTML/PDF automaticamente**. Não é preciso editar código.

```bash
node build/menu.mjs ajuda          # lista todos os comandos
node build/menu.mjs secoes         # ids das seções e nº de itens
node build/menu.mjs listar saladas # itens de uma seção (com ID e preço)
node build/menu.mjs validar        # checa integridade dos dados
```

Cada item tem um **ID estável** (`secaoId:itemId`, ex.: `petiscos:bolinho-de-risoto`).
Use `--build` para regenerar o `cardapio.html` e `--pdf` para também gerar o PDF.

| Operação | Comando |
| --- | --- |
| **Atualizar preço** | `node build/menu.mjs preco petiscos:bolinho-de-risoto 52,00 --build` |
| **Editar** (nome/desc/tam/preço) | `node build/menu.mjs editar saladas:caprese --desc "Nova descrição" --pdf` |
| **Inserir** | `node build/menu.mjs adicionar sobremesas --nome "Pudim" --preco 28,00 --build` |
| **Excluir** | `node build/menu.mjs remover doses:fireball --build` |
| **Mover** de seção | `node build/menu.mjs mover entradas-frias:burrata saladas --pos 1 --build` |

### Atualização de preços em lote (planilha)

```bash
node build/menu.mjs exportar-csv               # gera data/itens.csv (delimitador ";")
# edite preços/nomes/descrições no Excel/Google Sheets, salve, e:
node build/menu.mjs importar-csv data/itens.csv --build
```

O CSV casa pelos IDs: atualiza itens existentes e **insere** linhas novas (com
`item_id` vazio + nome + preço). Exclusões só pelo comando `remover`. O preço
aceita `48`, `48.5` ou `48,00` e é normalizado para `00,00`. O motor de
paginação **redistribui as páginas automaticamente** após qualquer alteração.

> Dica: `npm run menu -- <comando>` e `npm run validar` também funcionam.

### Operações de seção

```bash
node build/menu.mjs nova-secao --titulo "Vinhos do Mês" --tipo drink --icone wine --build
node build/menu.mjs renomear-secao sobremesas --titulo "Doces da Casa"
node build/menu.mjs remover-secao kids --build
```

## Painel web (sem terminal) + PDF automático

Para gerenciar o cardápio **pelo navegador ou celular**, há um painel em
[`web/`](web/) servido pela **Vercel**, que grava direto no `data/menu.json` do
GitHub. Ao salvar, uma **GitHub Action regenera o PDF sozinha**.

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2Fgustavobarakat1303-beep%2Fcardapios&env=GITHUB_TOKEN,GITHUB_REPO,GITHUB_BRANCH,ADMIN_PASSWORD&envDescription=Token%20do%20GitHub%20(Contents%3A%20write)%2C%20owner%2Frepo%2C%20branch%20e%20senha%20do%20painel&envLink=https%3A%2F%2Fgithub.com%2Fgustavobarakat1303-beep%2Fcardapios%2Fblob%2Fclaude%2Fbold-dijkstra-6wj1a5%2FREADME.md&project-name=cardapio-pe-de-manga&repository-name=cardapio-pe-de-manga)

> O botão acima abre a Vercel já pedindo as 4 variáveis. Ele **clona** o repositório
> para uma nova cópia na sua conta — use-o se quiser um repositório dedicado ao
> painel. Para usar **este mesmo** repositório (mantendo o histórico), prefira o
> fluxo *Import* descrito abaixo.

**Arquitetura:** painel estático (`web/`) → funções serverless (`api/menu.js`,
`api/save.js`) → commit no GitHub (Contents API) → Action
[`build-cardapio.yml`](.github/workflows/build-cardapio.yml) reconstrói
`cardapio.html`+`cardapio.pdf`. A Action [`validate-menu.yml`](.github/workflows/validate-menu.yml)
valida a integridade a cada push.

**Setup (uma vez, ~15 min):**

1. **Token do GitHub** — crie um *fine-grained PAT* limitado a este repositório,
   com permissão **Contents: Read and write**.
2. **Vercel** — *New Project → Import* deste repositório. Em **Environment Variables**, defina:
   | Variável | Valor |
   | --- | --- |
   | `GITHUB_TOKEN` | o PAT do passo 1 |
   | `GITHUB_REPO` | `gustavobarakat1303-beep/cardapios` |
   | `GITHUB_BRANCH` | a branch de trabalho (ex.: `claude/bold-dijkstra-6wj1a5` ou `main`) |
   | `ADMIN_PASSWORD` | uma senha à sua escolha (libera o botão *Salvar*) |
3. **Deploy.** Acesse o painel em `https://<seu-app>.vercel.app/web/`.
4. Edite preços/itens/seções e clique **Salvar no GitHub** (pede a senha 1×).
   Em ~1 min o `cardapio.pdf` aparece atualizado no repositório.

> O token fica **só no servidor** (variável da Vercel), nunca no navegador. O
> salvamento é protegido por senha e revalidado no servidor antes do commit.

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
- **Logotipo oficial** ([`assets/logo-pedemanga.png`](assets/logo-pedemanga.png))
  no rodapé de cada página, embutido como data URI; ao centro do rodapé fica o
  Instagram **@pedemanga** e, à direita, a paginação.

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
