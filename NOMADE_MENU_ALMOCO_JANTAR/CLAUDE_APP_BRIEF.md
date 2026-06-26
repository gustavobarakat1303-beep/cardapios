# Briefing Para Subir No App - Menu Almoço ou Jantar Nômade

## Objetivo

Criar no app uma tela para gerar o menu impresso de eventos do Nômade quando o cliente fecha almoço ou jantar.

O menu final não deve mostrar preços, taxas, valores por pessoa nem condições comerciais. O cliente já contratou um pacote fechado.

## Identificação Para Claude/App

Este projeto corresponde ao menu de eventos `NOMADE_MENU_ALMOCO_JANTAR`.

Arquivos que o app deve usar:
- Dados editáveis: `NOMADE_MENU_ALMOCO_JANTAR/almoco_jantar_menus.json`
- Gerador local: `scripts/build_nomade_eventos.cjs`
- Comando de geração: `npm run nomade:eventos`
- PDF geral: `NOMADE_MENU_ALMOCO_JANTAR/NOMADE_ALMOCO_JANTAR_OPCOES_A4_3_PARTES.pdf`
- PDF sem álcool: `NOMADE_MENU_ALMOCO_JANTAR/NOMADE_ALMOCO_JANTAR_BEBIDAS_NAO_ALCOOLICAS_A4_3_PARTES.pdf`
- PDF com álcool: `NOMADE_MENU_ALMOCO_JANTAR/NOMADE_ALMOCO_JANTAR_BEBIDAS_ALCOOLICAS_A4_3_PARTES.pdf`

Direção visual:
- Menu de mesa para evento, não orçamento.
- Conteúdo centralizado.
- Sem linhas pontilhadas após os itens.
- Divisórias finas apenas entre seções.
- A4 horizontal dividido em 3 partes iguais.

## Fluxo De Uso

1. Usuário escolhe a versão de bebidas:
   - Bebidas não alcoólicas.
   - Bebidas alcoólicas.
2. Usuário escolhe exatamente 1 salada.
3. Usuário escolhe exatamente 3 pratos principais.
4. Entradas entram sempre completas.
5. Sobremesas entram sempre completas.
6. O app gera um A4 horizontal dividido em 3 partes iguais, com 3 cópias do mesmo menu na folha.

## Regras De Validação

- Bloquear geração se não houver exatamente 1 salada.
- Bloquear geração se não houver exatamente 3 pratos principais.
- Não permitir campo de preço no impresso.
- Manter formato A4 horizontal, com 3 menus iguais por página.
- Gerar PDF separado por versão e um PDF geral com as duas versões.
