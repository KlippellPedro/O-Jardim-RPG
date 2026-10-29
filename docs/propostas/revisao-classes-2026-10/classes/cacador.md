# Revisão do Caçador

Classe comum (4/3/2). A Agência dos Caçadores tem doze benefícios com escada e é um dos catálogos mais completos do jogo; o Companheiro tem ficha. O ponto que mais pesa está na Especialização: desde agosto ela escolhe raças jogáveis, e a maior parte do que o grupo caça no Bestiário não é raça jogável.

## Achados (do mais grave ao menos grave)

- [INCOERÊNCIA] `especializacao`: a escolha é entre as 23 raças jogáveis, por decisão de agosto. Das 287 criaturas do catálogo, só as Humanoides (58) costumam ter raça; dragões, elementais, mortos-vivos, criaturas do Vazio, espíritos e golens do Bestiário ficam fora, e a própria descrição da classe fala em "toda a família" da presa. O Bestiário já tem famílias publicadas (espírito, elemental, vazio, dragão, morto-vivo, golem, cão e lobo, planta, feérico, mar...). → Pergunta para o questionário: a Especialização aceita também uma família do Bestiário, além das raças? A sugestão é aceitar as duas listas na mesma vaga.
- [INCOERÊNCIA] `especializacao` nv 5, 10, 15 e 20: os textos ainda dizem "categoria" e "categoria especializada", sobra da taxonomia antiga. A vaga hoje é de raça. → Trocar "categoria" por "raça" (ou "raça ou família", se a pergunta acima passar). *(Aplicado: "raça".)*
- [ERRO] `predador-perfeito`: "acerto crítico com resultado natural 18, 19 ou 20" em qualquer arma. Numa arma x3 vira 18-20/x3, que o tópico Combate proíbe. → Ver o problema transversal 2 do README.
- [MELHORIA] poder `companheiro`: o ataque do bicho fica em 1d6 do nível 2 ao 20, enquanto a Vida dele cresce (5 por nível). No 15, 1d6 é um oitavo do acerto médio. → Dado que cresce: 1d6, 1d8 no 5, 2d6 no 10, 2d8 no 15 e 3d8 no 20.
- [MELHORIA] `marca-do-cacador`: "Resistência 3 contra o dano dela" é Resistência por criatura, e as regras só conhecem Resistência por tipo. → "reduza em 3 o dano de cada ataque dela" (redução, que não é Resistência) ou escolher o tipo. Ver o problema transversal 4 do README.
- [MELHORIA] poder `camuflagem`: "Fique invisível" sem condição publicada. A única referência das regras é a condição Revelado, que tira invisibilidade. → "Fique invisível (ataques contra você têm desvantagem e você recebe +5 em Furtividade) até o começo do próximo turno ou até atacar", ou criar Invisível nas Condições.
- [MELHORIA] Agência op. `avaliacao-de-trofeus`: "+10% no valor narrativo do troféu" não tem número em lugar nenhum. → Usar o preço de venda da Loja (metade do valor) como base: "a Guilda paga +10% sobre a venda".
