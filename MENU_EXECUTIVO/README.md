# MENU EXECUTIVO - Pé de Manga

Esta pasta guarda somente o Menu Executivo, separado do cardápio principal.

## Arquivos principais

- `MENU_EXECUTIVO_PE_DE_MANGA.pdf` - arquivo final para impressão.
- `MENU_EXECUTIVO_PE_DE_MANGA.html` - versão em HTML do mesmo layout.
- `menu_executivo.json` - arquivo simples para editar a quinzena, itens e preços.
- `PREVIA_MENU_EXECUTIVO.png` - prévia visual da página gerada.

## Como editar a cada quinzena

Edite o arquivo:

```text
MENU_EXECUTIVO/menu_executivo.json
```

Atualize apenas os campos de conteúdo:

- `periodo`
- `subtitulo`
- `resumo`
- `secoes[].titulo`
- `secoes[].tag`
- `secoes[].itens[].nome`
- `secoes[].itens[].descricao`
- `secoes[].itens[].preco`

Depois gere novamente:

```bash
npm run executivo
```

O PDF final atualizado ficará em:

```text
MENU_EXECUTIVO/MENU_EXECUTIVO_PE_DE_MANGA.pdf
```
