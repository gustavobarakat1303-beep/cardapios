# PROMPT — Cardápio Pé de Manga Bar & Restaurante

---

## CONTEXTO

Você já criou o cardápio completo do **Nômade Bar & Restaurante** (arquivo `nomade_final17.html`). Agora vai criar o cardápio do **Pé de Manga Bar & Restaurante**, seguindo exatamente o mesmo processo, padrão técnico e qualidade visual, adaptando identidade, paleta e conteúdo.

---

## MISSÃO

Criar um **PDF A4 vertical, 6 páginas, pronto para impressão**, com o cardápio completo do Pé de Manga, usando o mesmo pipeline técnico do Nômade:

1. **HTML** com CSS escalado por página  
2. **PDF gerado via Playwright/Chromium** (`page.pdf(format='A4', print_background=True)`)  
3. **Medição de altura real** de cada página antes de finalizar (sem overflow, sem espaço em branco excessivo)  
4. **Verificação visual** via screenshot de cada página antes de entregar

---

## ARQUIVOS QUE VOCÊ PRECISARÁ

O Gustavo vai enviar:

- [ ] **Logo oficial branco** (PNG transparente) — para header preto  
- [ ] **Logo oficial preto** (PNG transparente) — para uso alternativo  
- [ ] **Ícone/símbolo** (PNG transparente) — para marca d'água discreta  
- [ ] **Cardápio completo** — PDF ou lista com todos os itens, preços e descrições  
- [ ] **Referência visual** — se houver cardápio anterior ou identidade visual definida

---

## IDENTIDADE VISUAL

O Pé de Manga tem personalidade distinta do Nômade:

- **Conceito:** bar e restaurante na Vila Madalena com forte identidade ligada à natureza, paisagismo, ambiente ao ar livre, acolhimento  
- **Paleta sugerida** (ajustar conforme material do Gustavo):  
  - Base: tons de terra, verde musgo, off-white quente  
  - Destaque: verde oliva profundo ou terracota  
  - Tipografia: manter `Cormorant Garamond` para títulos \+ `Jost` para corpo  
- **Tom:** mais casual e acolhedor que o Nômade, menos "fine dining", mais "boteco premium"

⚠️ Confirmar paleta com o Gustavo antes de começar. Perguntar: *"Quer manter a mesma paleta do Nômade ou adaptar para a identidade do Pé de Manga?"*

---

## REGRAS TÉCNICAS (não negociáveis)

### Geração do PDF

```py
page.pdf(
    path='pe_de_manga_cardapio.pdf',
    format='A4',
    print_background=True,
    margin={'top':'0','bottom':'0','left':'0','right':'0'}
)
```

### Estrutura de cada página

```
.page { width: 210mm; height: 297mm; overflow: hidden; display: flex; flex-direction: column; }
.ph   { height: 13mm; background: var(--preto); }   /* header */
.pc   { flex: 1; overflow: hidden; display: flex; flex-direction: column; justify-content: space-between; }
.pf   { height: 8mm; border-top: 1px solid var(--areia2); } /* footer */
/* pc disponível = 297mm - 13mm - 8mm = 276mm = ~1039px */
```

### Escala por página

- Medir altura real do conteúdo com Playwright **antes** de gerar o PDF  
- Calcular `scale = pc_disponível / content_height`  
- Aplicar via CSS: `font-size`, `margin`, `padding` — **nunca `transform: scale()`**  
- Meta: **88–98%** de preenchimento, sem overflow

### Verificação obrigatória

```py
# Para cada página, checar:
total = content_height + padding_top + padding_bottom
assert total <= pc_height, f"Pg{i} overflow: +{total - pc_height}px"
```

### Grid de 2 colunas

```css
.g2 { display: grid; grid-template-columns: 1fr 1fr; gap: 0 8mm; }
.g2 > * { min-width: 0; overflow: hidden; }  /* crítico para evitar sobreposição */
```

### Gradientes — evitar rosa

```css
/* CORRETO: usar rgba, nunca 'transparent' com cores douradas */
.sep { border-top: 1px solid #B89A5A; }  /* linha sólida, sem gradiente */
.pf-line { background: linear-gradient(to right, #B89A5A, rgba(184,154,90,0)); }
```

### Preços

- **Sem "R$"** — apenas o valor: `48,00`  
- Usar `&nbsp;` entre vírgula e centavos se necessário

### Sub-itens (unidades/gramagem)

- Aparecem **depois** do nome, na linha da descrição  
- Formato: `8 un. · Descrição do item`  ou  `400g · Descrição`  
- **Nunca antes do nome** nem em linha separada acima

---

## ESTRUTURA DO CARDÁPIO (6 PÁGINAS)

Organizar conforme o conteúdo enviado pelo Gustavo. Referência do Nômade:

| Página | Conteúdo |
| :---- | :---- |
| 1 | Petiscos \+ Bruschettas/Entradas \+ Porções |
| 2 | Entradas Frias \+ Saladas \+ Pratos Principais \+ Sobremesas |
| 3 | Almoço Executivo \+ Drinks Autorais \+ Mocktails |
| 4 | Clássicos \+ Sugestões \+ Gin Tônicas \+ Caipirinhas |
| 5 | Whisky \+ Vodkas \+ Tequilas \+ Cachaças \+ Doses \+ Garrafas |
| 6 | Chopp \+ Cervejas \+ Licores \+ Sangria \+ Bebidas |

Ajustar conforme o cardápio real do Pé de Manga.

---

## COMPONENTES HTML

### Item com descrição

```py
def it(name, price, desc='', sub=''):
    sub_html = f'<div class="item-desc">{sub} · {desc}</div>' if sub and desc else \
               f'<div class="item-desc">{desc}</div>' if desc else \
               f'<div class="item-desc">{sub}</div>' if sub else ''
    return f'''<div class="item">
  <div class="item-body">
    <div class="item-top">
      <span class="item-name">{name}</span>
      <span class="item-dots"></span>
      <span class="item-price">{price}</span>
    </div>
    {sub_html}
  </div>
</div>'''
```

### Drink simples

```py
def dr(name, price):
    return f'<div class="dr"><span class="dr-name">{name}</span><span class="dr-dots"></span><span class="dr-price">{price}</span></div>'
```

### Drink autoral (com descrição)

```py
def ai(name, price, desc=''):
    desc_html = f'<div class="ai-desc">{desc}</div>' if desc else ''
    return f'<div class="ai"><div class="ai-body"><div class="ai-name">{name}</div>{desc_html}</div><span class="ai-price">{price}</span></div>'
```

### Separador

```py
def sep():
    return '<div class="sep"></div>'
# CSS: .sep { border-top: 1px solid #[COR_DESTAQUE]; margin: Xmm 0; }
```

---

## CHECKLIST ANTES DE ENTREGAR

- [ ] Logo branco no header de todas as páginas (PNG base64 embutido)  
- [ ] Ícone no canto inferior direito (opacidade \~7%)  
- [ ] Nenhuma linha rosa (gradientes com `rgba`, separadores com `border-top` sólido)  
- [ ] Preços sem "R$"  
- [ ] Sub-itens (unidades/gramagem) após o nome, na linha da descrição  
- [ ] Grupos (Vodkas, Cachaças, etc.) como `.sh` títulos de seção — mesmo visual dos outros  
- [ ] Texto contido nas colunas (`min-width: 0` no grid)  
- [ ] Todas as páginas: 88–98% preenchidas, sem overflow  
- [ ] Footer visível em todas as páginas  
- [ ] PDF: 210,2 × 297,4 mm (A4 exato)  
- [ ] Screenshot de cada página conferida antes de entregar

---

## PERGUNTAS PARA O GUSTAVO ANTES DE COMEÇAR

1. **Paleta de cores:** manter dourado/preto do Nômade ou adaptar para o Pé de Manga?  
2. **Header:** fundo preto como no Nômade ou outra cor?  
3. **Quantas páginas:** o cardápio do Pé de Manga é maior, menor ou similar ao Nômade?  
4. **Descrições dos pratos:** já estão no DGuests (`dguests.com.br/cardapio/pe-de-manga`) ou virão no arquivo?  
5. **Almoço executivo:** tem? Com quais opções?

---

*Prompt gerado com base no processo completo de criação do cardápio Nômade Bar & Restaurante — maio/2026*  
