# Etapa 2: medições do bestiário e da magia (2026-09-29)

> Atualização de 2026-09-30: as decisões saíram daqui e foram aplicadas (curva solo com Vida opção B, XP ÷ 5, famílias, e na magia: Fluxo mínimo virou recomendação e a rolagem passou a somar metade do nível). A Parte 2 abaixo mede a regra **antiga** de magia (sem metade do nível), e o resumo do que vale hoje está em `docs/sistema/BALANCEAMENTO.md`.

Texto original, escrito antes da decisão: só medição e proposta, sem mexer em criatura, magia, classe, XP nem regra. As decisões já foram aplicadas (ver a atualização acima). Cada bloco termina na decisão que o Pedro tomou na época. Os números saem dos mesmos módulos da ficha (`referenciaBalanceamento.ts`, `progressaoNiveis.ts`) e do catálogo, então se algo mudar dá para refazer.

## Parte 1. Curva do bestiário

### O que o bestiário atual já é

- São 121 criaturas escritas à mão (mais 10 modelos genéricos, "Modelo de Criatura (VD n)"). Nível de 3 a 50, VD de 1 a 10 (cada VD é uma faixa de 5 níveis).
- **Elas já seguem a fórmula da ficha.** Comparando com o personagem de referência do mesmo nível: ataque igual (0 a +2), testes de resistência iguais ao ataque (-1 a +1), Defesa de 1 a 4 pontos abaixo (criatura não veste armadura) e dano por acerto entre 19% e 23% da Vida média de um personagem, que é a fatia que o Guia do Mestre manda (20% a 25%).
- **A Vida é a do encontro inteiro.** A Vida mediana é 0,81x a "Vida de inimigo padrão" do nível (a que aguenta 4,5 rodadas de um grupo de quatro). Por faixa: níveis 1 a 15 = 0,77x, 16 a 30 = 0,8x, 31 a 50 = 0,89x. Ou seja, cada criatura escrita é uma **criatura solo**: sozinha, ela é o encontro. Nenhuma está perto dos 10% de um lacaio ou dos 25% de um inimigo padrão do Guia.
- Só 26 dos 50 níveis têm criatura. Os níveis se concentram em 3, 8, 13, 18, 23, 28 e 33, porque o campo `nivel` era o meio da faixa do VD. Ficam vazios: 1, 2, 7, 9, 11, 15, 17, 19, 21, 24, 25, 27, 29, 31... (o gerador da Etapa 4 preenche).
- Quase metade do que está em `tipo: monstro` nem é inimigo: 67 de 121 são aliados que o jogador contrata (Ajudante 33, Invocação 16, Servo 11, Familiar 7). Só Criatura (39) e Ser Lendário (15) são adversários.

### Curva proposta para VD = nível (1 a 500)

Regra para criatura **solo** de qualquer VD, tudo tirado da tabela de referência de NPCs (que já vai a 500):

- **Ataque** e **testes de resistência** = ataque de referência do nível (nível/2 + modificador + maior grau permitido, agora com os graus novos).
- **Defesa** = Defesa natural de referência menos 3.
- **Dano por acerto** = 21% da Vida média de um personagem do nível (a fatia do Guia).
- **Vida** = 0,8 da Vida de inimigo padrão do nível. É o que o bestiário já faz.

A Vida tem um problema conhecido: o dano do personagem quase não cresce depois do nível 35 (a arma para nas Relíquias da Criação e o resto é modificador), então a "Vida que dura 4,5 rodadas" fica parada em torno de 1.100. Na tabela, três jeitos de tratar isso acima do 40:

- **A (fiel à conta):** Vida parada, luta com a mesma duração em qualquer nível. O que cresce é dano por acerto, ataque e ações. Um VD 200 é perigoso, mas não é um saco de Vida.
- **B (cresce com o nível):** Vida x nível/40. Um VD 100 tem 2,5x, um VD 200 tem 5x. Só funciona se o dano do grupo também crescer (atributo, Legados, itens especiais), senão a luta vira maratona: no VD 200 seriam mais de 20 rodadas.
- **C (meio termo):** Vida cresce 0,5% por nível depois do 50 (VD 100 = 1,25x, VD 200 = 1,75x, VD 500 = 3,25x). Dá a sensação de "isso é enorme" sem estourar a duração da luta.

| VD | Ataque e testes | Defesa | Dano por acerto | Vida solo (A) | Vida solo (C) | Vida solo (B) |
|---:|---:|---:|---:|---:|---:|---:|
| 1 | +4 | 9 | 3 | 70 | 70 | 70 |
| 3 | +7 | 10 | 4 | 90 | 90 | 90 |
| 5 | +9 | 11 | 5 | 140 | 140 | 140 |
| 8 | +13 | 13 | 8 | 150 | 150 | 150 |
| 10 | +14 | 14 | 9 | 260 | 260 | 260 |
| 15 | +18 | 16 | 13 | 400 | 400 | 400 |
| 20 | +24 | 19 | 17 | 410 | 410 | 410 |
| 25 | +26 | 21 | 23 | 810 | 810 | 810 |
| 30 | +31 | 24 | 27 | 810 | 810 | 810 |
| 35 | +33 | 27 | 32 | 1.040 | 1.040 | 1.040 |
| 40 | +37 | 30 | 36 | 1.060 | 1.060 | 1.060 |
| 45 | +39 | 32 | 41 | 1.060 | 1.060 | 1.190 |
| 50 | +42 | 35 | 45 | 1.060 | 1.060 | 1.320 |
| 60 | +50 | 40 | 51 | 1.060 | 1.110 | 1.590 |
| 80 | +60 | 50 | 66 | 1.060 | 1.220 | 2.120 |
| 100 | +73 | 61 | 81 | 1.080 | 1.350 | 2.700 |
| 150 | +101 | 86 | 113 | 1.100 | 1.650 | 4.120 |
| 200 | +126 | 112 | 145 | 1.100 | 1.920 | 5.500 |
| 250 | +154 | 137 | 176 | 1.110 | 2.220 | 6.940 |
| 500 | +285 | 264 | 336 | 1.160 | 3.770 | 14.500 |

Até o VD 40 as três colunas de Vida são iguais.

### XP por VD

Hoje `XP_POR_VD` tem 10 linhas, para o VD antigo de 1 a 10. Com VD = nível, a proposta é `XP = custo de sair do nível VD, dividido por 5`, para uma criatura solo (um encontro). Isso fica entre 13% abaixo e 23% acima da tabela antiga em todo o intervalo, e continua valendo depois do 100, onde o custo do nível vira faixa fixa.

| VD antigo | XP antigo | VD novo equivalente | XP novo | Novo / antigo |
|---:|---:|---:|---:|---:|
| 1 | 500 | 3 | 600 | 120% |
| 2 | 1.300 | 8 | 1.600 | 123% |
| 3 | 2.200 | 13 | 2.600 | 118% |
| 4 | 3.000 | 18 | 3.600 | 120% |
| 5 | 3.800 | 23 | 4.600 | 121% |
| 6 | 4.800 | 28 | 5.600 | 117% |
| 7 | 5.800 | 33 | 6.600 | 114% |
| 8 | 7.200 | 38 | 7.600 | 106% |
| 9 | 9.000 | 43 | 8.600 | 96% |
| 10 | 11.000 | 48 | 9.600 | 87% |

Acima do 50:

| VD | Custo de sair do nível | XP da criatura solo |
|---:|---:|---:|
| 60 | 60.000 | 12.000 |
| 80 | 80.000 | 16.000 |
| 100 | 100.000 | 20.000 |
| 150 | 150.000 | 30.000 |
| 200 | 150.000 | 30.000 |
| 250 | 250.000 | 50.000 |
| 500 | 500.000 | 100.000 |

Papéis entram como fatia do encontro (lacaio 10%, padrão 25%, elite 50%, chefe 100%), então um lacaio de VD 30 paga 10% do XP de um chefe de VD 30.

### Papéis

Como todas as 121 são solo, marcar uma delas como "lacaio" ou "padrão" sem mexer na Vida seria mentira. Proposta: as escritas à mão ficam com papel **solo** (nada muda nos números), e lacaio, padrão, elite e chefe existem só no gerador da Etapa 4, com as fatias do Guia. Assim ninguém precisa reescrever 121 fichas.

## Parte 2. Magia

Conjurador de referência: Canalizador que põe todos os aumentos de atributo em Fluxo, sem raça, item, Legado nem Fruto (Fluxo 15 no nível 1), com o maior grau de Misticismo que o nível permite. A rolagem é `d20 + mod. Fluxo + grau de Misticismo` (o livro diz que metade do nível NÃO entra, de propósito). "Save de criatura" é o teste de resistência de uma criatura do mesmo nível, do bestiário até o 50 e da tabela de referência depois.

| Nível | Aumentos de atributo | Fluxo (mod.) | Círculo pelo Fluxo | Círculo pela classe | Círculo real | DT | Grau de Misticismo | Bônus da rolagem | Save de criatura | Passa a DT | Vence o save do alvo |
|---:|---:|---|---:|---:|---:|---:|---|---:|---:|---:|---:|
| 1 | 0 | 15 (+2) | 1 | 2 | 1 | 10 | Aprendiz | +4 | +4 | 75% | 48% |
| 5 | 1 | 16 (+3) | 1 | 4 | 1 | 10 | Treinado | +7 | +8 | 90% | 43% |
| 10 | 2 | 17 (+3) | 1 | 6 | 1 | 10 | Especialista | +9 | +12 | 100% | 34% |
| 20 | 5 | 20 (+5) | 2 | 10 | 2 | 13 | Veterano | +15 | +20 | 100% | 26% |
| 30 | 7 | 22 (+6) | 3 | 10 | 3 | 16 | Renomado | +18 | +28 | 100% | 11% |
| 50 | 12 | 27 (+8) | 4 | 10 | 4 | 19 | Renomado | +20 | +44 | 100% | 0% |
| 60 | 13 | 28 (+9) | 4 | 10 | 4 | 19 | Lendário | +23 | +49 | 100% | 0% |
| 100 | 18 | 33 (+11) | 5 | 10 | 5 | 22 | Mítico | +27 | +73 | 100% | 0% |
| 150 | 21 | 36 (+13) | 6 | 10 | 6 | 25 | Cósmico | +31 | +100 | 100% | 0% |
| 200 | 24 | 39 (+14) | 7 | 10 | 7 | 28 | Cósmico | +32 | +126 | 100% | 0% |
| 250 | 27 | 42 (+16) | 8 | 10 | 8 | 31 | Eterno | +36 | +154 | 100% | 0% |
| 500 | 43 | 58 (+24) | 10 | 10 | 10 | 37 | Absoluto | +46 | +285 | 100% | 0% |

O que isso mostra:

1. **O portão real é o Fluxo, não a classe.** O Canalizador abre o 10º círculo no nível 20 pela classe, mas o Fluxo dele no nível 20 é 20, que só dá o 2º círculo (precisa de 18). Com todos os aumentos em Fluxo: círculo 4 no nível 50, 5 no 100, 7 no 200, e o 10º só perto do nível 370 (Fluxo 50). A não ser que raça, item, Fruto ou algo que você ainda vai me contar ("as coisas novas") suba o Fluxo, os marcos de círculo 3 a 10 da classe ficam sem uso na maior parte do jogo.
2. **A DT nunca é problema.** Ela vai de 10 a 37 e o bônus do conjurador passa dela já no nível 10. Estabilizar a magia é sempre certo.
3. **Vencer o teste do alvo é o problema.** Se a mesma rolagem é comparada com o teste de resistência do alvo (lendo "compare a mesma rolagem com Reflexos, Fortitude ou Vontade dele" como disputa d20 contra d20), a chance cai de 48% no nível 1 para 26% no 20, 1% no 40 e zero do 50 em diante. Motivo: o alvo soma metade do nível, o conjurador não. Se você quis dizer outra leitura, os números mudam; confirmo antes de propor conserto.
4. **Mana sobra.** O Canalizador de referência aguenta 27 a 36 conjurações do círculo mais alto que o Fluxo permite, em qualquer nível. Então o limite de magia em campo é o Fluxo e o número de vagas, não a Mana.
5. **Dano de magia não acompanha.** A mediana do dano das magias do catálogo vai de 4,5 (1º círculo) a 55 (10º). O golpe de arma do personagem de referência é 77 a 85 do nível 40 em diante. Magia de dano perde para arma no fim da escala, e magia não cresce com o nível.

Mana do conjurador de referência (para calibrar vagas por círculo):

| Nível | Mana | Círculo pelo Fluxo | Conjurações do círculo mais alto |
|---:|---:|---:|---:|
| 10 | 63 | 1 | 31 |
| 20 | 123 | 2 | 30 |
| 30 | 195 | 3 | 27 |
| 50 | 339 | 4 | 33 |
| 100 | 507 | 5 | 36 |
| 200 | 807 | 7 | 32 |
| 500 | 1.707 | 10 | 31 |

Catálogo: 352 magias, cerca de 35 por círculo.

| Círculo | Magias | Dano médio mediano | Mana base |
|---:|---:|---:|---:|
| 1 | 35 | 4,5 | 2 |
| 2 | 35 | 9 | 4 |
| 3 | 36 | 10,5 | 7 |
| 4 | 35 | 18 | 10 |
| 5 | 35 | 17,5 | 14 |
| 6 | 35 | 27 | 19 |
| 7 | 35 | 24,5 | 25 |
| 8 | 35 | 36 | 32 |
| 9 | 36 | 31,5 | 42 |
| 10 | 35 | 55 | 55 |

### O que preciso de você para a magia

- Sua explicação das "coisas novas" (acesso, DT, o que você tem em mente).
- Confirmar a leitura do teste do alvo do achado 3.
- Depois disso eu proponho: vagas totais + teto por círculo, marcos de 25 a 50, e o que fazer com o Fluxo mínimo dos círculos altos e com a DT fixa.

## Parte 3. Classificação das 121 criaturas

Regras usadas, todas para você corrigir:

- **VD proposto = o `nivel` atual** (a migração 1:1 que você aprovou). O campo `nivel` se aposenta depois.
- **Uso:** adversário (Criatura, Ser Lendário) ou aliado contratável (Ajudante, Servo, Familiar, Invocação). Isso já está no campo `classe`, só dei nome.
- **Família:** agrupei por corpo e tema. 11 famílias cobrem 68 criaturas; 53 ficam sem família (humanoides de ofício, feras avulsas, monstros clássicos).
- **Único:** todo "Ser Lendário" que não é topo de família (Dragão Ancião e Golem de Obsidiana ficam de fora) (13 criaturas). É a regra mais chutada, revise essa coluna.
- **Papel:** solo para todas (ver Parte 1).

Famílias e onde cada uma tem membro (nível de cada criatura):

| Família | Criaturas | Níveis |
|---|---:|---|
| Vazio | 16 | 3, 8, 12, 13, 18, 18, 23, 28, 33, 33, 33, 38, 42, 45, 48, 48 |
| Espírito | 12 | 3, 8, 8, 8, 13, 13, 14, 23, 23, 33, 33, 40 |
| Golem | 10 | 3, 8, 13, 18, 23, 23, 28, 33, 33, 43 |
| Morto-vivo | 8 | 4, 10, 16, 18, 23, 30, 30, 43 |
| Mar | 5 | 3, 8, 13, 23, 43 |
| Cão e lobo | 5 | 3, 5, 8, 8, 23 |
| Elemental | 4 | 8, 10, 33, 33 |
| Dragão | 3 | 22, 23, 40 |
| Autômato | 2 | 3, 18 |
| Fênix | 2 | 35, 50 |
| Aranha | 1 | 18 |

Ficha por ficha. "Vida/enc." é a Vida dividida pela Vida de inimigo padrão do nível: 1,00 = encontro inteiro.

| VD | Criatura | Classe | Uso | Família | Único | Vida | Vida/enc. | Nota |
|---:|---|---|---|---|---|---:|---:|---|
| 3 | Autômato de Guarda | Ajudante | aliado contratável | Autômato |  | 95 | 0,86 |  |
| 3 | Caranguejo Luminoso | Criatura | adversário | Mar |  | 110 | 1 |  |
| 3 | Corvo Mensageiro | Familiar | aliado contratável | sem família |  | 70 | 0,64 |  |
| 3 | Cozinheiro de Guarnição | Ajudante | aliado contratável | sem família |  | 85 | 0,77 |  |
| 3 | Cão de Guarda | Ajudante | aliado contratável | Cão e lobo |  | 80 | 0,73 |  |
| 3 | Enxame de Ratos | Criatura | adversário | sem família |  | 60 | 0,55 |  |
| 3 | Escriba Contador | Ajudante | aliado contratável | sem família |  | 75 | 0,68 |  |
| 3 | Falcão Mensageiro | Familiar | aliado contratável | sem família |  | 55 | 0,5 |  |
| 3 | Fogo-Fátuo | Familiar | aliado contratável | Espírito |  | 80 | 0,73 |  |
| 3 | Golem de Argila | Invocação | aliado contratável | Golem |  | 125 | 1,14 |  |
| 3 | Grumete Aprendiz | Ajudante | aliado contratável | sem família |  | 80 | 0,73 |  |
| 3 | Javali Selvagem | Criatura | adversário | sem família |  | 100 | 0,91 |  |
| 3 | Mercenário Novato | Ajudante | aliado contratável | sem família |  | 95 | 0,86 |  |
| 3 | Sentinela de Portão | Ajudante | aliado contratável | sem família |  | 105 | 0,95 |  |
| 3 | Sussurrante de Frestas | Criatura | adversário | Vazio |  | 115 | 1,05 |  |
| 4 | Esqueleto Guerreiro | Servo | aliado contratável | Morto-vivo |  | 95 | 0,73 |  |
| 5 | Lobo Cinzento | Criatura | adversário | Cão e lobo |  | 95 | 0,56 |  |
| 5 | Trepadeira Devoradora | Criatura | adversário | sem família |  | 110 | 0,65 |  |
| 6 | Coruja Encantada | Familiar | aliado contratável | sem família |  | 170 | 1 |  |
| 8 | Batedor de Estrada | Ajudante | aliado contratável | sem família |  | 145 | 0,76 |  |
| 8 | Cultista Fanático | Servo | aliado contratável | sem família |  | 150 | 0,79 |  |
| 8 | Elemental de Fogo Menor | Invocação | aliado contratável | Elemental |  | 170 | 0,89 |  |
| 8 | Escolta de Caravana | Ajudante | aliado contratável | sem família |  | 175 | 0,92 |  |
| 8 | Fantasma Afogado | Servo | aliado contratável | Espírito |  | 150 | 0,79 |  |
| 8 | Golem de Sal | Invocação | aliado contratável | Golem |  | 190 | 1 |  |
| 8 | Guardião de Aethel | Ajudante | aliado contratável | Espírito |  | 170 | 0,89 |  |
| 8 | Hiena Risonha | Criatura | adversário | Cão e lobo |  | 170 | 0,89 |  |
| 8 | Informante de Rua | Ajudante | aliado contratável | sem família |  | 130 | 0,68 |  |
| 8 | Mastim de Guerra | Ajudante | aliado contratável | Cão e lobo |  | 180 | 0,95 |  |
| 8 | Moreia de Coral | Criatura | adversário | Mar |  | 170 | 0,89 |  |
| 8 | Rastejante do Vazio | Criatura | adversário | Vazio |  | 200 | 1,05 |  |
| 8 | Serpente de Guarda do Templo | Criatura | adversário | sem família |  | 165 | 0,87 |  |
| 8 | Sombra Parasita | Servo | aliado contratável | Espírito |  | 140 | 0,74 |  |
| 8 | Tratador de Feras | Ajudante | aliado contratável | sem família |  | 180 | 0,95 |  |
| 8 | Vigia Noturno | Ajudante | aliado contratável | sem família |  | 150 | 0,79 |  |
| 10 | Curandeiro Errante | Ajudante | aliado contratável | sem família |  | 170 | 0,52 |  |
| 10 | Elemental de Gelo Menor | Criatura | adversário | Elemental |  | 200 | 0,61 |  |
| 10 | Vespa Feérica | Criatura | adversário | sem família |  | 160 | 0,48 |  |
| 10 | Zumbi Bruto | Servo | aliado contratável | Morto-vivo |  | 170 | 0,52 |  |
| 12 | Besta do Umbral | Criatura | adversário | Vazio |  | 265 | 0,8 | nível 12, mas é Aberração do Vazio |
| 12 | Urso das Cavernas | Criatura | adversário | sem família |  | 265 | 0,8 |  |
| 13 | Armadura Assombrada | Invocação | aliado contratável | Espírito |  | 290 | 0,83 |  |
| 13 | Arqueiro de Torre | Ajudante | aliado contratável | sem família |  | 240 | 0,69 |  |
| 13 | Arraia Elétrica | Criatura | adversário | Mar |  | 250 | 0,71 |  |
| 13 | Artilheiro de Bordo | Ajudante | aliado contratável | sem família |  | 250 | 0,71 |  |
| 13 | Cão do Vazio | Criatura | adversário | Vazio |  | 335 | 0,96 |  |
| 13 | Duelista Renegado | Criatura | adversário | sem família |  | 245 | 0,7 |  |
| 13 | Espírito do Lar | Ajudante | aliado contratável | Espírito |  | 200 | 0,57 |  |
| 13 | Golem de Bronze | Invocação | aliado contratável | Golem |  | 310 | 0,89 |  |
| 13 | Gárgula de Telhado | Criatura | adversário | sem família |  | 250 | 0,71 |  |
| 13 | Lamia | Criatura | adversário | sem família |  | 250 | 0,71 |  |
| 13 | Timoneiro Contratado | Ajudante | aliado contratável | sem família |  | 230 | 0,66 |  |
| 14 | Gato Espectral | Familiar | aliado contratável | Espírito |  | 265 | 0,76 |  |
| 16 | Carniçal | Servo | aliado contratável | Morto-vivo |  | 380 | 0,76 |  |
| 16 | Guarda-Costas | Ajudante | aliado contratável | sem família |  | 380 | 0,76 |  |
| 18 | Alquimista Residente | Ajudante | aliado contratável | sem família |  | 300 | 0,6 |  |
| 18 | Aranha Gigante | Criatura | adversário | Aranha |  | 380 | 0,76 |  |
| 18 | Autômato de Ronda | Ajudante | aliado contratável | Autômato |  | 400 | 0,8 |  |
| 18 | Golem de Pedra | Invocação | aliado contratável | Golem |  | 380 | 0,76 |  |
| 18 | Guardião de Tumba | Servo | aliado contratável | Morto-vivo |  | 400 | 0,8 |  |
| 18 | Harpia da Tempestade | Criatura | adversário | sem família |  | 360 | 0,72 |  |
| 18 | Mecânico de Bordo | Ajudante | aliado contratável | sem família |  | 340 | 0,68 |  |
| 18 | Navegador de Rotas | Ajudante | aliado contratável | sem família |  | 330 | 0,66 |  |
| 18 | Saltador de Fendas | Criatura | adversário | Vazio |  | 470 | 0,94 |  |
| 18 | Troll Regenerador | Criatura | adversário | sem família |  | 420 | 0,84 |  |
| 18 | Vulto do Vazio | Invocação | aliado contratável | Vazio |  | 380 | 0,76 |  |
| 20 | Cervo Espinhoso | Criatura | adversário | sem família |  | 420 | 0,82 |  |
| 20 | Colônia de Fungos | Criatura | adversário | sem família |  | 400 | 0,78 |  |
| 22 | Dragonete | Familiar | aliado contratável | Dragão |  | 515 | 1,01 |  |
| 22 | Mestre Ferreiro | Ajudante | aliado contratável | sem família |  | 515 | 1,01 |  |
| 23 | Cão Infernal | Criatura | adversário | Cão e lobo |  | 500 | 0,98 |  |
| 23 | Espectro Vingativo | Servo | aliado contratável | Espírito |  | 480 | 0,94 |  |
| 23 | Golem de Ferro | Invocação | aliado contratável | Golem |  | 600 | 1,18 |  |
| 23 | Golem de Raízes | Invocação | aliado contratável | Golem |  | 570 | 1,12 |  |
| 23 | Lâmina Jurada | Ajudante | aliado contratável | sem família |  | 540 | 1,06 |  |
| 23 | Megalodon do Vazio | Criatura | adversário | Vazio |  | 620 | 1,22 |  |
| 23 | Médico de Enfermaria | Ajudante | aliado contratável | sem família |  | 420 | 0,82 |  |
| 23 | Necromante | Servo | aliado contratável | Morto-vivo |  | 460 | 0,9 | humanoide que anda com Mortos-Vivos |
| 23 | Noiva do Espelho | Servo | aliado contratável | Espírito |  | 480 | 0,94 |  |
| 23 | Runista de Barreira | Ajudante | aliado contratável | sem família |  | 440 | 0,86 |  |
| 23 | Tubarão de Sucata | Criatura | adversário | Mar |  | 560 | 1,1 |  |
| 23 | Wyvern das Montanhas | Criatura | adversário | Dragão |  | 560 | 1,1 |  |
| 26 | Demônio Menor | Invocação | aliado contratável | sem família |  | 670 | 0,66 |  |
| 28 | Aranha do Vazio | Criatura | adversário | Vazio |  | 865 | 0,86 | também é Aranha (Aranha Gigante 18) |
| 28 | Basilisco | Criatura | adversário | sem família |  | 670 | 0,66 |  |
| 28 | Capitão da Guarda | Ajudante | aliado contratável | sem família |  | 700 | 0,69 |  |
| 28 | Hidra de Duas Cabeças | Criatura | adversário | sem família |  | 720 | 0,71 |  |
| 28 | Minotauro Guardião | Criatura | adversário | sem família |  | 700 | 0,69 |  |
| 28 | Sentinela de Cristal | Invocação | aliado contratável | Golem |  | 640 | 0,63 |  |
| 30 | Cavaleiro da Morte | Servo | aliado contratável | Morto-vivo |  | 670 | 0,66 |  |
| 30 | Rei Carniçal | Criatura | adversário | Morto-vivo |  | 780 | 0,77 |  |
| 33 | Arconte | Ser Lendário | adversário | sem família | sim | 845 | 0,84 |  |
| 33 | Arquimago Banido | Criatura | adversário | sem família |  | 780 | 0,77 |  |
| 33 | Behemoth | Criatura | adversário | sem família |  | 900 | 0,89 |  |
| 33 | Capitão de Guerra | Ajudante | aliado contratável | sem família |  | 850 | 0,84 |  |
| 33 | Caríbdis | Ser Lendário | adversário | Vazio | sim | 1140 | 1,13 |  |
| 33 | Colecionador de Membros | Criatura | adversário | Vazio |  | 1015 | 1,0 |  |
| 33 | Coral Vivo | Invocação | aliado contratável | Elemental |  | 900 | 0,89 |  |
| 33 | Efreeti do Deserto | Invocação | aliado contratável | Elemental |  | 800 | 0,79 |  |
| 33 | Escriba Fantasma | Invocação | aliado contratável | Espírito |  | 820 | 0,81 |  |
| 33 | Fantasma de Naufrágio | Ser Lendário | adversário | Espírito | sim | 820 | 0,81 |  |
| 33 | Golem de Espelhos | Invocação | aliado contratável | Golem |  | 880 | 0,87 |  |
| 33 | Golem de Portão | Ajudante | aliado contratável | Golem |  | 1000 | 0,99 |  |
| 33 | Guarda Juramentado | Ajudante | aliado contratável | sem família |  | 900 | 0,89 |  |
| 33 | Mestre de Máquinas | Ajudante | aliado contratável | sem família |  | 820 | 0,81 |  |
| 33 | Rastejante de Olhos | Criatura | adversário | Vazio |  | 780 | 0,77 |  |
| 35 | Fênix Menor | Familiar | aliado contratável | Fênix |  | 845 | 0,65 | decidir: Fênix é única ou tem estágio menor? |
| 38 | Multidão sem Rosto | Ser Lendário | adversário | Vazio | sim | 1300 | 0,98 |  |
| 38 | Quimera | Criatura | adversário | sem família |  | 1040 | 0,79 |  |
| 38 | Titã de Gelo | Ser Lendário | adversário | sem família | sim | 1100 | 0,83 |  |
| 40 | Anjo Guardião | Invocação | aliado contratável | Espírito |  | 1040 | 0,79 |  |
| 40 | Dragão Ancião | Ser Lendário | adversário | Dragão |  | 1040 | 0,79 | topo da família Dragão (Dragonete 22, Wyvern 23) |
| 42 | Kraken | Ser Lendário | adversário | Vazio | sim | 1505 | 1,14 | também marinho |
| 43 | Baleia de Recife | Ser Lendário | adversário | Mar | sim | 1340 | 1,02 |  |
| 43 | Golem de Obsidiana | Ser Lendário | adversário | Golem |  | 1450 | 1,1 | topo dos Golens (nível 43) |
| 43 | Procissão dos Mortos | Ser Lendário | adversário | Morto-vivo | sim | 1200 | 0,91 | Procissão dos Mortos, também Espírito |
| 43 | Sombra Viva | Ser Lendário | adversário | sem família | sim | 1255 | 0,95 |  |
| 45 | Leviatã | Ser Lendário | adversário | Vazio | sim | 1505 | 1,14 | também marinho |
| 48 | Devorador de Estrelas | Ser Lendário | adversário | Vazio | sim | 1900 | 1,44 | irmão do Devorador de Mundos (mesmo nível 48) |
| 48 | Devorador de Mundos | Ser Lendário | adversário | Vazio | sim | 1920 | 1,45 | irmão do Devorador de Estrelas (mesmo nível 48) |
| 50 | Fênix | Ser Lendário | adversário | Fênix | sim | 1490 | 1,13 | única por natureza |

Casos que merecem sua atenção:

- **Fênix Menor (35) e Fênix Imortal (50):** você citou a Fênix como exemplo de única. Hoje são duas fichas. Ou a Fênix é única e a Menor vira outra coisa (um filhote, um familiar), ou a Fênix é família com estágios.
- **Devorador de Estrelas e Devorador de Mundos (ambos 48):** dois únicos do mesmo nível, com a Vida mais alta do bestiário (1,44x). Provavelmente os dois maiores do Vazio.
- **Dragão:** só Dragonete (22), Wyvern (23) e Dragão Ancião (40). Faltam os estágios do meio (jovem, adulto) e depois do Ancião. É o candidato natural para a primeira família gerada.
- **Golem:** já é uma escada pronta (argila 3, sal 8, bronze 13, pedra 18, ferro 23, raízes 23, cristal 28, espelhos 33, portão 33, obsidiana 43). Talvez precise de pouco mais que rótulo.
- **Aliados no bestiário:** 67 fichas são contratáveis. Se elas ganham VD = nível, o XP de sessão de um "Cozinheiro de Guarnição" (VD 3) passa a existir como se fosse inimigo. Proponho que aliado contratável não pague XP quando entra numa sessão como aliado (hoje o XP só conta para inimigo).

## Decisões pedidas

1. **Curva (Parte 1):** aprova a regra de Ataque, testes, Defesa, dano e Vida solo? E qual Vida acima do 40: **A** (recomendo), B ou C?
2. **XP:** aprova `custo do nível / 5` para a criatura solo, com papéis como fatia (10/25/50/100%)?
3. **Papéis:** as 121 escritas ficam "solo" e só o gerador tem lacaio/padrão/elite/chefe?
4. **Classificação (Parte 3):** corrija famílias, únicos e a Fênix (única ou família). Se responder "ok", vale como está.
5. **Magia (Parte 2):** me conte as "coisas novas" e confirme a leitura do teste do alvo.

Como reproduzir: `node --import ./tests/frontend/registerTsLoader.mjs <script>` importando `referenciaBalanceamento.ts`, `progressaoNiveis.ts` e `magiaService`/`magias.json`. Os scripts desta etapa ficaram só na pasta temporária; se você quiser, viram `tools/medir-bestiario.mjs`.
