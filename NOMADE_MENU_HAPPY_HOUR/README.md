# Menu Happy Hour - Nômade

Menus por opção de Happy Hour para impressão em A4 horizontal.

Cada página é dividida em 3 partes iguais. Cada parte contém o mesmo menu da opção, pronto para recorte ou impressão interna.

## Arquivos principais

- `NOMADE_HAPPY_HOUR_OPCOES_A4_3_PARTES.pdf` - PDF geral com uma página para cada opção.
- `NOMADE_HAPPY_HOUR_OPCAO_01_A4_3_PARTES.pdf` em diante - PDF separado de cada opção.
- `happy_hour_opcoes.json` - arquivo editável com bebidas e cozinha de cada opção.
- `CLAUDE_APP_BRIEF.md` - explicativo para subir no app.

## Como editar

Edite:

```text
NOMADE_MENU_HAPPY_HOUR/happy_hour_opcoes.json
```

Depois gere novamente:

```bash
npm run nomade:eventos
```
