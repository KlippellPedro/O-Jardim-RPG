# Revisão do Devorador

Classe especial de conquista da Mulher Carmesim (4/2/3), criada em outubro. A ideia (pegar emprestado de quem morreu, um slot por estômago) é forte. O problema central é que a vítima precisa ter classe, e quase nada que morre numa sessão tem. Também tem uma cura sem limite e dois bônus que a ficha não somava.

## Achados (do mais grave ao menos grave)

- [ERRO] `banquete-de-poder` nv 1: "Escolha uma habilidade ou um poder que a classe dele tinha". As criaturas do Bestiário, inclusive os Humanoides (bandidos, guardas, cultistas), não têm classe: têm VD, ataques e habilidades de ficha. Fora de luta contra personagens com classe, o Devorador não tem o que devorar, e a classe inteira para. → "uma habilidade ou poder da classe dela; se a vítima for criatura do Bestiário, uma das habilidades da ficha dela, desde que o VD não passe do seu nível de Devorador". A mesma frase no Banquete Final.
- [INCOERÊNCIA] poder `regeneracao-de-banquete`: Ação Padrão, 5 de Estamina, 2d6 + Mod. Constituição de Vida, sem limite por combate. Com 3 de Estamina por nível, o Devorador de nível 10 se cura sete vezes numa luta. → "uma vez por combate", ou "só na rodada seguinte a devorar", que amarra a cura ao tema.
- [ERRO] instintos `pele-curtida` (+2 de Defesa) e `reflexos-de-predador` (+2 de Iniciativa): bônus permanentes que a ficha não somava, porque a opção não tinha o campo de efeito que a ficha lê (como a Pele de Tubarão do Pirata tem). *(Aplicado: os dois ganharam `efeitos_por_nivel`.)*
- [INCOERÊNCIA] instinto `mandibula-reforcada`: "1d8 em vez do dano desarmado padrão", e as regras não publicam dano desarmado padrão. Ver o relatório do Lutador.
- [MELHORIA] poder `investida-predatoria`: +2 dados por 3 de Estamina. O Golpe em W do Espadachim dá os mesmos +2 dados por 6. Ver o problema transversal 7 do README.
- [MELHORIA] poder `paralisia-do-medo`: o nome diz Paralisia e o efeito é Imobilizado. Como Paralisado também é condição, a mesa vai confundir. → Trocar o título (o id fica), por exemplo "Olhar de Predador".
- [MELHORIA] poder `ultima-refeicao`: "ao consumir a última porção de um slot vazio antes de dormir" não se entende (slot vazio não tem porção). → "Uma vez por sessão, ao esvaziar um slot de propósito antes de dormir, recupere metade da Mana e da Estamina máximas ao acordar".
