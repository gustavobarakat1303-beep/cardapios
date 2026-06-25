# Menu Executivo - Pé de Manga

O menu executivo quinzenal é editado em:

```text
data/menu_executivo.json
```

Edite apenas os campos de conteúdo:

- `periodo`
- `subtitulo`
- `secoes[].titulo`
- `secoes[].tag`
- `secoes[].itens[].nome`
- `secoes[].itens[].descricao`
- `secoes[].itens[].preco`

Quando terminar, gere novamente:

```bash
npm run executivo
```

Saídas principais:

- `executivo.html`
- `executivo.pdf`
- `output/pdf/executivo/executivo_pe_de_manga.pdf`
- `output/pdf/executivo/rendered/page-1.png`

O layout foi mantido na mesma linha visual do cardápio completo, mas a paleta foi convertida para tons de cinza e linhas de maior contraste para impressão local em preto e branco.
