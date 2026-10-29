# Revisão do Guardião

Classe marcial comum (5/1/3). O vínculo do Protegido com oito Juramentos e o Castelo do 18 dão um tanque com cara. Dois números destoam: a cadeia de Muralhas chega a Resistência física 10 permanente no nível 11, sem trava de nível, e a provocação, que é o coração de um tanque, vale uma rodada por combate e tem um estágio que só fica mais caro.

## Achados (do mais grave ao menos grave)

- [ERRO] `provocar` nv 20: o estágio só diz "O custo sobe para 7 Estamina". É o único estágio do jogo que piora a habilidade sem dar nada. → Dar ao 20 o que a provocação ainda não tem, por exemplo: "quem falhar fica preso a você até o fim do próximo turno dele (−5 para atacar outros alvos) e, se atacar outro alvo mesmo assim, você ganha um Contra-Ataque contra ele".
- [INCOERÊNCIA] poderes `muralha-de-cobre` → `muralha-de-diamante`: sem nenhuma trava de nível, quatro poderes seguidos (níveis 2, 6, 9 e 11) dão Resistência física 10 permanente no nível 11, quando o acerto médio de NPC é 22. Com o Juramento de Pedra (mais 3) e a redução do Provocar, o Guardião ignora metade de cada golpe físico. A revisão das raças marcou como erro a Resistência 10 do Autômato no nível 1 pelo mesmo motivo. → Travas de nível na cadeia: Ouro no 6, Ferro no 11 e Diamante no 16.
- [INCOERÊNCIA] `provocar` nv 3: a provocação vale uma vez por combate e por uma rodada (−2 para atacar outros alvos). Para a habilidade que define o tanque, ela some no segundo turno da luta. → "uma vez por rodada, gastando a Estamina" e "até o fim do próximo turno de quem falhou, com Vontade no fim de cada turno para encerrar", como a convenção de efeitos que travam.
- [INCOERÊNCIA] `coracao-unificado`: "Resistência 10 contra todo dano" fura a regra de que Resistência vale por tipo. Ver o problema transversal 4 do README.
- [INCOERÊNCIA] Juramento `juramento-de-sangue` nível 5: "encerra uma condição leve". Ver o problema transversal 3 do README.
- [MELHORIA] `protegido` nv 15: "invoque um espírito aliado" que dá +2 de Defesa ou "uma informação que ele conhecia" não diz que espírito é esse, e destoa de uma classe sem nada de espiritual. → "Uma vez por sessão, por uma cena, você e o protegido recebem +2 de Defesa e Resguardado quando ficarem a 1,5 m um do outro".
- [MELHORIA] `protegido`: os cinco estágios não têm título. → Juramento, Escudo Dividido, Ordem dos Guardiões, Vigília e Último Laço, por exemplo.
- [MELHORIA] poder `escudo-humano`: "a até 8 m" foge da grade de 1,5 m. → 9 m.
