# Briefing Para Subir No App - Menu Happy Hour Nômade

## Objetivo

Criar no app uma tela para gerar o menu impresso de eventos do Nômade quando o cliente fecha uma opção de Happy Hour.

O menu final não deve mostrar preços, taxas, valores por pessoa nem condições comerciais. O cliente já contratou um pacote fechado.

## Identificação Para Claude/App

Este projeto corresponde ao menu de eventos `NOMADE_MENU_HAPPY_HOUR`.

Arquivos que o app deve usar:
- Dados editáveis: `NOMADE_MENU_HAPPY_HOUR/happy_hour_opcoes.json`
- Gerador local: `scripts/build_nomade_eventos.cjs`
- Comando de geração: `npm run nomade:eventos`
- PDF geral: `NOMADE_MENU_HAPPY_HOUR/NOMADE_HAPPY_HOUR_OPCOES_A4_3_PARTES.pdf`

Direção visual:
- Menu de mesa para evento, não orçamento.
- Conteúdo centralizado.
- Sem linhas pontilhadas após os itens.
- Divisórias finas apenas entre seções.
- A4 horizontal dividido em 3 partes iguais.

## Fluxo De Uso

1. Usuário escolhe a opção de Happy Hour: 1, 2 ou 3.
2. O app carrega as bebidas e cozinha dessa opção.
3. O app gera um A4 horizontal dividido em 3 partes iguais, com 3 cópias do mesmo menu na folha.

## Regras De Validação

- Não permitir campo de preço no impresso.
- Manter formato A4 horizontal, com 3 menus iguais por página.
- Gerar PDF separado por opção e um PDF geral com todas as opções.
