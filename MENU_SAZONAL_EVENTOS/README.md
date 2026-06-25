# Menu Sazonal Eventos - Pé de Manga

Esta pasta guarda o menu sazonal para eventos em formato 10x15 cm.

## Arquivos principais

- `MENU_SAZONAL_EVENTOS_10X15.pdf` - arquivo final para impressão.
- `MENU_SAZONAL_EVENTOS_10X15.html` - versão em HTML do mesmo layout.
- `menu_sazonal_eventos.json` - arquivo editável com textos, itens e valores.
- `PREVIA_PAGINA_01.png` em diante - prévias renderizadas do PDF.

## Como editar

Edite:

```text
MENU_SAZONAL_EVENTOS/menu_sazonal_eventos.json
```

Depois gere novamente:

```bash
npm run sazonal:eventos
```

O PDF final atualizado ficará em:

```text
MENU_SAZONAL_EVENTOS/MENU_SAZONAL_EVENTOS_10X15.pdf
```
