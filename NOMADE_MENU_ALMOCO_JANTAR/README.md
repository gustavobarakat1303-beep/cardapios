# Menu Almoço ou Jantar - Nômade

Menus de almoço ou jantar para eventos, em A4 horizontal dividido em 3 partes iguais.

Cada página tem 3 cópias do mesmo menu, prontas para recorte ou impressão interna.

## Estrutura do menu

- Entradas: completas.
- Salada: 1 opção escolhida pelo cliente.
- Pratos principais: 3 opções escolhidas pelo cliente.
- Sobremesa: completa.
- Bebidas: versão não alcoólica ou versão alcoólica.

## Arquivos principais

- `NOMADE_ALMOCO_JANTAR_OPCOES_A4_3_PARTES.pdf` - PDF geral com as duas versões.
- `NOMADE_ALMOCO_JANTAR_BEBIDAS_NAO_ALCOOLICAS_A4_3_PARTES.pdf` - versão sem bebidas alcoólicas.
- `NOMADE_ALMOCO_JANTAR_BEBIDAS_ALCOOLICAS_A4_3_PARTES.pdf` - versão com bebidas alcoólicas.
- `almoco_jantar_menus.json` - arquivo editável com salada e pratos principais selecionados.
- `CLAUDE_APP_BRIEF.md` - explicativo para subir no app.

## Como editar

Edite:

```text
NOMADE_MENU_ALMOCO_JANTAR/almoco_jantar_menus.json
```

Atualize:

- `saladaSelecionada`
- `principaisSelecionados` com exatamente 3 pratos

Depois gere novamente:

```bash
npm run nomade:eventos
```
