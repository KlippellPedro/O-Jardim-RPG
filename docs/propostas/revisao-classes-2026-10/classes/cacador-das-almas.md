# Revisão do Caçador das Almas

Classe especial de conquista de Haemus (4/3/2). A Zanpakutō com 21 Aspectos (Shikai e Bankai), as quatro Artes do Ceifeiro e o Konsō dão a classe com mais escolhas do jogo. Os problemas: o tipo de dano que define a classe não existe na tabela, dois poderes do nível 2 rendem mais que magia do 3º círculo, e o Konsō fala numa "rolagem de Defesa" que o jogo não tem.

## Achados (do mais grave ao menos grave)

- [ERRO] "dano espiritual" (21 vezes: Asauchi, sete Aspectos, Hakuda, Hadō, Corte da Lua): não está na tabela de Tipos de Dano, que diz que toda Resistência aponta para um tipo de lá. Como ninguém resiste a um tipo que não existe, a Zanpakutō escolhe a cada acerto entre o dano da arma e um dano que fura qualquer Resistência. → Decisão: (A) dano de Essência, o Fluxo da natureza verdadeira e do nome, que conversa com o "nome da lâmina"; (B) dano de Vitalidade, o Fluxo nativo de Haemus; (C) criar "Espiritual" como tipo novo da família Mágico, com quem resiste a ele (espíritos, mortos-vivos). A recomendação é A.
- [INCOERÊNCIA] poder `hado-raio-branco`: 3d8 (13,5) a 18 m por 4 de Mana, no nível 2, com metade no sucesso. Pela referência, uma magia de 2º círculo causa 9 por 4 de Mana e uma de 3º, 10,5 por 7. O poder rende mais que uma magia de 3º círculo pelo preço de uma de 2º. → 2d8 (9) no nível 2, subindo um dado a cada 5 níveis; ou custo 7. Ver o problema transversal 7 do README.
- [INCOERÊNCIA] poder `kido-de-cura`: 3d8 de cura (13,5) por 5 de Mana no nível 2. O Médico, a classe de cura, cura 1d6 no Socorro de Emergência do nível 3. → 2d8 no nível 2 e escada por nível, ou subir o Médico (ver o relatório dele).
- [INCOERÊNCIA] `konso-funeral-da-alma`: em sucesso, o alvo "recebe -2 na primeira rolagem de Defesa contra você". A Defesa não se rola; é um número da ficha. → "sofre −2 de Defesa contra o seu próximo ataque, até o fim do seu próximo turno".
- [INCOERÊNCIA] Aspecto `ressonancia`: "fica Surdo", que não é condição (a revisão das raças propôs criá-la, Decisão 4 de lá), e a penalidade dura "até o fim do combate" sem teste repetido. → Usar Desorientado (que já tem teste no fim do turno) ou esperar a Decisão 4 das raças, e trocar "até o fim do combate" por "até o fim do próximo turno dele".
- [ERRO] arte `hoho`: "Seu movimento aumenta em 3 m" não chegava à ficha, porque a opção não tinha o campo de efeito que a ficha lê. *(Aplicado: ganhou `efeitos_por_nivel` com +3 m de Movimento.)*
- [MELHORIA] Aspectos `incendio` e `veneno`: criam queima e veneno paralelos às condições Queimando e Envenenado. → "fica Queimando" e "fica Envenenado (Fortitude contra a DT do Caçador no fim do turno encerra)".
- [MELHORIA] Aspecto `colapso`: "num raio de 4 m" foge da grade. → 4,5 m.
- [MELHORIA] Aspecto `cinzas`: 1d6 (2d6 na Bankai) em quem entra ou termina o turno na nuvem, sem teste. → Reflexos contra a DT do Caçador para metade. Ver o problema transversal 6 do README.
