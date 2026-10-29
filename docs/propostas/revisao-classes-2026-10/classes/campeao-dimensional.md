# Revisão do Campeão Dimensional

Classe especial de conquista (5/1/3), restrita e com liberação do Mestre. A fantasia é de pico de poder contado, e os poderes entregam isso. O problema é que entregam cedo demais: no nível 2, os poderes de golpe rendem o dobro de dano por Estamina do que os de qualquer marcial comum, e o Número 1 usa um tipo de dano que não existe.

## Achados (do mais grave ao menos grave)

- [ERRO] "dano verdadeiro" (`numero-1` nv 20, 4d12; poder `rasgar`, 2d10): verdadeiro não é tipo de dano. Pela leitura, a intenção é "ignora Resistência". → "4d12 de impacto que ignora Resistência" e "2d10 de impacto que ignora Resistência", ou dano de Espaço no Rasgar, que é um teleporte.
- [INCOERÊNCIA] poderes `soco` (+2d12 por 5 de Estamina) e `impacto` (+3d10 e empurrão de 6 m por 6 de Estamina), sem trava de nível: no nível 2, um golpe com Impacto soma 16,5 de dano ao ataque, quase o dobro do acerto médio de NPC (9). O Golpe em Z do Espadachim dá +1 dado por 3 de Estamina, metade do rendimento. O Punho, do nível 12, dá +4d12 uma vez por combate, pouco acima do Impacto do nível 2. → Travas de nível (Soco no 6, Impacto no 9) ou dados que crescem (Impacto com +1d10 no 2, +2d10 no 8, +3d10 no 14). Classe especial pode ser mais forte, mas o salto deve vir com o nível.
- [INCOERÊNCIA] poder `pisada`: 2d10 de impacto em todos a 3 m sem teste; a Fortitude só decide quem cai. A convenção das magias pede resistência com metade do dano em efeito de área. → "testam Fortitude contra a DT do Campeão: em falha, sofrem 2d10 e ficam Caídos; em sucesso, metade e ficam de pé".
- [INCOERÊNCIA] `pilar-da-dimensao`: "Resistência 10 contra todo dano". Ver o problema transversal 4 do README. No mesmo texto, "não pode ser derrubado" → "não pode ficar Caído".
- [MELHORIA] `numero-1` nv 1: "+2 em testes físicos" não diz se inclui ataque. Se incluir, é +2 permanente para acertar no nível 1. → "+2 em testes de perícia de Força, Destreza e Constituição (ataques não contam)".
- [MELHORIA] `numero-1` nv 15: "imunidade a paralisia" → "imunidade a Paralisado". *(Aplicado.)*
- [ERRO] `alem-do-comum`: o +1 no atributo escolhido não chegava à ficha, porque as opções não tinham o campo de efeito que a ficha lê. *(Aplicado: as três opções ganharam `efeitos_por_nivel`, e escolher Força duas vezes dá +2.)*
- [MELHORIA] `alem-do-comum`: quatro estágios de +1 em atributo, com teto de +2 em cada um. Como o modificador sobe a cada 2 pontos, a habilidade inteira rende +1 de Mod. em dois atributos, a habilidade principal mais fraca do jogo. → Somar um efeito por estágio (por exemplo, Força: +1,5 m em empurrão e +5 espaços de carga; Destreza: +1 de Iniciativa; Constituição: +2 de Vida por estágio), ou dar +2 por estágio com teto de +4.
- [MELHORIA] poder `avanco`: "empurradas 1 m" foge da grade. → 1,5 m.
