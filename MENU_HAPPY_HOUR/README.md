# Menu Happy Hour - Pé de Manga

Menus por opção de Happy Hour para impressão em A4 horizontal.

Cada página é dividida em 3 partes iguais. Cada parte contém o mesmo menu da opção, pronto para recorte ou impressão interna.

## Arquivos principais

- `HAPPY_HOUR_OPCOES_A4_3_PARTES.pdf` - PDF geral com uma página para cada opção.
- `HAPPY_HOUR_OPCAO_1_A4_3_PARTES.pdf` em diante - PDF separado de cada opção.
- `happy_hour_opcoes.json` - arquivo editável com bebidas e cozinha de cada opção.
- `PREVIA_OPCAO_01.png` em diante - prévias das páginas.

## Como editar

Edite:

```text
MENU_HAPPY_HOUR/happy_hour_opcoes.json
```

Depois gere novamente:

```bash
npm run happy-hour
```
