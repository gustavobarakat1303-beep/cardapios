# Briefing Para Subir No App - Menu Almoço ou Jantar

## Objetivo

Criar no app uma tela para gerar o menu impresso de eventos do Pé de Manga quando o cliente fecha almoço ou jantar.

O menu final não deve mostrar preços, taxas, valores por pessoa nem condições comerciais. O cliente já contratou um pacote fechado.

## Identificação Para Claude/App

Este projeto corresponde ao menu de eventos `MENU_ALMOCO_JANTAR`.

Arquivos que o app deve usar:
- Dados editáveis: `MENU_ALMOCO_JANTAR/almoco_jantar_menus.json`
- Gerador local: `scripts/build_pe_de_manga_almoco_jantar.cjs`
- Comando de geração: `npm run almoco-jantar`
- PDF geral: `MENU_ALMOCO_JANTAR/ALMOCO_JANTAR_OPCOES_A4_3_PARTES.pdf`
- PDF sem álcool: `MENU_ALMOCO_JANTAR/ALMOCO_JANTAR_BEBIDAS_NAO_ALCOOLICAS_A4_3_PARTES.pdf`
- PDF com álcool: `MENU_ALMOCO_JANTAR/ALMOCO_JANTAR_BEBIDAS_ALCOOLICAS_A4_3_PARTES.pdf`

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

## Conteúdo Fixo

Entradas:
- Pastel de queijo
- Bruschettas pomodoro
- Canapé de carpaccio

Sobremesas:
- Sorvete de creme e chocolate com caldas
- Brigadeiro de colher
- Frutas da estação

## Saladas Disponíveis

- Caesar Salad: alface americana, frango desfiado, croutons, parmesão e molho de queijos.
- Caprese: mozarela de búfala, tomate fresco, rúcula e pesto de manjericão.

## Pratos Principais Disponíveis

- Polvo grelhado: azeite trufado, arroz negro e tomate-cereja.
- Camarão: arroz vermelho, molho beurre blanc e caviar.
- Salmão grelhado: risoto de banana-da-terra e molho agridoce.
- Robalo com crosta de ervas: molho de tangerina, risoto de limão siciliano e farofa crocante.
- Picanha grelhada: farofa da casa, vinagrete, arroz e fritas.
- Medalhão de filet: molho de vinho tinto e funghi com purê de mandioquinha.
- Medalhão de filet: molho gorgonzola e risoto de rúcula com tomates secos.
- Medalhão mignon: risoto de shitake ao molho cumberland.
- Filé mignon ao poivre: arroz e batata wave.
- Penne: tomate seco, mozarela de búfala e manjericão.
- Nhoque de mandioquinha: molho de tomates, shimeji e shitake.
- Fusile de arroz: azeite com legumes - vegano.

## Bebidas Não Alcoólicas

- Água
- Café
- Refrigerantes: Pepsi, Pepsi Light, Guaraná e Diet Guaraná
- Suco natural: laranja, melancia e abacaxi

## Bebidas Alcoólicas

Inclui as bebidas não alcoólicas e também:
- Chopp Claro Brahma
- Caipirinha: limão, abacaxi e maracujá
- Caipiroska: limão, abacaxi e morango
- Gin tônica
- Moscow Mule

## Regras De Validação

- Bloquear geração se não houver exatamente 1 salada.
- Bloquear geração se não houver exatamente 3 pratos principais.
- Não permitir campo de preço no impresso.
- Manter formato A4 horizontal, com 3 menus iguais por página.
- Gerar PDF separado por versão e um PDF geral com as duas versões.
