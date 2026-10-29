# Revisão do Autômato

Raça especial da A.X.I.S: construto consciente, oito chassis (bípede ou quadrúpede, de Pequeno a Enorme) e um catálogo de 17 modificações que se instalam por vaga (1 + metade do Nível Total). É a raça com mais números do jogo e a que mais destoa das outras. Várias modificações entregam no nível 1 a 15 o que as outras raças só alcançam no 28 a 40, e o chassi maior é melhor em tudo. A medida dos bípedes também está errada.

## Achados (do mais grave ao menos grave)

- [ERRO] `corpo-macico` (modificação, nível 1): Resistência 10 permanente a dano físico, já no nível 1. O acerto médio de um NPC no nível 1 é 8, então o Autômato fica imune a quase todo golpe comum até o nível 5 ou mais. As outras raças só chegam a Resistência 10 no 28 a 40, e por tempo limitado (Slime, Gigante, Mímico parado, Onírico). → Resistência 2 a corte, perfuração e impacto (como a Liga Endurecida e a Solda sobre Solda), subindo 1 a cada 10 níveis, ou nível mínimo alto.
- [ERRO] `pulso-estridente` (nível 4): Atordoado por 1d4+1 rodadas em todos a 6 m, sem teste repetido. Atordoado tira ação e reação e baixa a Defesa em 5. Nenhuma magia do 2º círculo trava assim. → "até o fim do próximo turno", ou Fortitude no fim de cada turno, e nível mínimo maior.
- [ERRO] `raio-inferno` (nível 4): 4d6+4 a 20 m sem limite de usos, só 4 Mana por disparo. Média 18 contra 11 do acerto de NPC do nível. → "uma vez por cena", ou 2d6+2.
- [ERRO] `laser` (nível 15): 8d10+8 (média 52) em todos numa linha de 30 m, e "em sucesso, evita o dano". O acerto de NPC no 15 é 29. → 4d10+4 com metade no sucesso, ou nível mínimo 30.
- [ERRO] chassis bípedes (`medida_m`, `descricao`): "Pequeno, aproximadamente 3,5 m", "Normal, aproximadamente 5 m", Grande 6 m, Enorme 9 m. Um Autômato de tamanho Normal com 5 m de altura não cabe em lugar nenhum; os quadrúpedes têm 0,7 / 1,5 / 3 / 4,5 m. → Sugestão 1 / 1,8 / 3 / 4,5 m. Pergunta para o questionário final.
- [INCOERÊNCIA] `eletrificar` (nível 5): reação toda rodada, 3d8+4 em todos a 5 m, sem limite por cena. → "duas vezes por cena".
- [INCOERÊNCIA] `resistente` (nível 10): +2 de Vida por Nível Total, o que dá +120 de Vida no 60. A escada de Vida do Golem soma 22. → +1 por nível, como o Organismo Otimizado do Clone.
- [INCOERÊNCIA] chassis: quanto maior, melhor em tudo. O Enorme dá +10 Vida, +5 Estamina, Força +5, arma 3d6 (4d6 com Esmagador, média 14 no nível 1) e Blindagem +6; o Pequeno dá +3/+2, arma 1d6 e +2. Pacote 5 no Pequeno e 15 no Enorme já no nível 1, o maior do jogo nessa altura depois do Deus. → Dar ao chassi pequeno algo próprio (Furtividade, Reflexos, passar por frestas) ou cobrar no Enorme (portas, equipamento, alvo fácil).
- [INCOERÊNCIA] `arquitetura-modular`: 1 + metade do Nível Total dá 11 vagas no 20 e 31 no 60, para um catálogo de 17 modificações. → Teto de vagas (sugestão: 8) ou mais modificações.
- [ERRO] `resistente`: o texto na tela dizia "Este valor substitui o antigo +5 por nível, incompatível com a progressão atual", que é nota de desenvolvimento. *(Aplicado: a frase saiu.)*
- [INCOERÊNCIA] `compartimento-de-carga`: "equivalente a um mochilão, com capacidade adicional para quinze itens". O Mochilão dá 10 espaços e a carga do jogo é em espaços. *(Aplicado: "+15 espaços de carga, sem a perda de Movimento de um mochilão".)*
- [MELHORIA] `nucleo-autonomo`: não dizia que a Tecnologia é o Fluxo nativo do Autômato, que é a regra da Decisão 1 da revisão das magias. *(Aplicado na raça e na página `Automato.tsx`: "O núcleo roda o Fluxo da Tecnologia, que é o seu Fluxo nativo.")*
- [MELHORIA] `corpo-artificial` (`descricao`, `imunidades`): imune a "encantamentos, enjoo, fadiga, sono". Nenhum desses é condição, e fadiga é o Cansaço. → Listar condições oficiais e Cansaço.
- [MELHORIA] `laser`, `raio-inferno`, `eletrificar`: dano de raio e de fogo saindo de máquina. A tabela tem a família Tecnológica, que é justamente o dano da A.X.I.S. → Pergunta para o questionário final.
- [MELHORIA] alcances de 5 m e 20 m (`eletrificar`, `deteccao`, `raio-inferno`) fogem da grade de 1,5 m do resto do jogo. → 4,5 m e 18 m.
