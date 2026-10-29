# Revisão do Ninja

Classe comum (4/2/3). A Hierarquia (Aprendiz a Kage) dá cor e uso real em cada posto, a Arma Ninja tem doze melhorias e a Substituição fecha bem o nível 18. Os problemas estão nas melhorias de crítico, que furam uma regra do livro, e em dois poderes com texto que não fecha.

## Achados (do mais grave ao menos grave)

- [ERRO] `arma-ninja` op. `golpe-certeiro` e `corte-fatal`: o tópico Combate diz "Margem larga e multiplicador alto não andam juntos: 18-20 e 19-20 sempre com x2; x3 e x4 sempre com margem 20". As duas melhorias juntas na mesma arma dão 19-20/x3, e como as duas são "bônus numérico", repetem: quatro Corte Fatal levam a arma a x6, e quatro Golpe Certeiro numa arma 19-20 levam a 15-20. → Cada uma vale uma vez por arma, e as duas não entram na mesma arma. Ver o problema transversal 2 do README (Espadachim, Atirador e Caçador fazem o mesmo).
- [ERRO] poder `aplicacao-inteligente`: "dano adicional igual a +1 dado do seu Mod. Inteligência" não diz que dado é esse. A ficha técnica repete a frase. → "some o seu Mod. Inteligência ao dano (o dobro com uma Arma Ninja)".
- [INCOERÊNCIA] poder `mensagem-oculta`: pré-requisito "Inteligência 5". Os atributos do jogo começam perto de 10 (a referência usa 12 a 14), então a trava não trava nada. Parece sobra de uma escala antiga de 1 a 5. → "Inteligência 14" ou sem pré-requisito.
- [MELHORIA] poder `ataque-oculto`: repete até três vezes (+3d8) e só custa Estamina, sem limite por rodada. Junto com quatro Fio Mortal, o golpe furtivo do 20 passa de 7 dados. → "uma vez por rodada" no texto, que é o que a mesa já supõe.
- [MELHORIA] DT do Ninja (Furtividade): nenhuma técnica atual manda testar resistência. O bloco existe porque o teste da classe exige. Não é erro; fica registrado para quando entrar um poder que use.
