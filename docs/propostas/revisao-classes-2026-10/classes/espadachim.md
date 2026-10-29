# Revisão do Espadachim

Classe marcial comum (5/1/3). O vínculo com a espada, as oito Posturas e o Combo do 18 funcionam. O que pesa é a lista de poderes: metade dela é a versão II de outra metade, todos são "o próximo ataque ganha +X", e a descrição da classe promete troca de postura que a mecânica não tem.

## Achados (do mais grave ao menos grave)

- [INCOERÊNCIA] poderes: cinco dos dez são a versão II de outro (Golpe em Z/W, Corte Cirúrgico I/II, Penetrar Armadura I/II, Corte à Distância I/II, Proteção da Espada I/II), e oito dos dez são "o próximo ataque com espada ganha +X" pago em Estamina. O Espadachim de nível 19 escolheu os oito poderes e tem quase a mesma jogada em todos. → Fundir cada par num poder que cresce com o nível (como os contratos da Publi) e abrir cinco vagas para técnicas com cara própria: Desarme (Luta contra a defesa passiva, a arma cai a 3 m), Finta (o alvo fica Exposto), Aparar Projétil (Reação contra ataque à distância), Corte Giratório (um ataque contra cada inimigo adjacente, metade do dano) e Riposte (Contra-Ataque sem o −2).
- [ERRO] Posturas op. `fio-afiado`: alarga a margem de ameaça de qualquer espada, inclusive das 20/x3, que viram 19-20/x3. O tópico Combate proíbe margem larga com multiplicador alto. → Ver o problema transversal 2 do README.
- [INCOERÊNCIA] Posturas op. `guarda-alta`: "A margem de ameaça de ataques corpo a corpo contra você sobe em 1". "Subir a margem" se lê como alargar, que é o contrário do que o parêntese explica, e contra uma arma de margem 20 a regra fica sem saída. → "Ataques corpo a corpo contra você precisam de um número natural 1 maior para ser crítico; um 20 natural continua sendo crítico."
- [INCOERÊNCIA] `descricao` da classe: "Muda de postura no meio da luta". Desde agosto toda postura aprendida fica ativa ao mesmo tempo, então ninguém muda de postura. → "Acumula posturas ao longo da carreira e encadeia golpes em sequência...".
- [MELHORIA] `arte-da-espada`: os cinco estágios não têm título, ao contrário de todas as outras habilidades em estágio do jogo. → Títulos como Vínculo, Corte Firme, Abertura, Fio Implacável e Golpe Perfeito.
- [MELHORIA] `arte-da-espada` nv 15: "Ao derrubar uma criatura relevante" usa o verbo da manobra Derrubar (que deixa Caído). → "Ao levar uma criatura relevante a 0 de Vida". *(Aplicado.)*
- [MELHORIA] poder `corte-a-distancia-ii`: gasta 7 de Estamina a mais, por uso, só para dobrar o alcance de 9 para 18 m. → Se o par continuar, a II vira passiva: "o Corte à Distância passa a alcançar 18 m".
