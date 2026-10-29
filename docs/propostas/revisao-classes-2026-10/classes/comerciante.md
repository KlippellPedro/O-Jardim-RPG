# Revisão do Comerciante

Classe comum (3/4/2). Bem resolvida: Ofício (Comércio) concedido, sete Praças, dez linhas de Estoque com teto pela escada de preços, e um capstone com limite claro (não vende, não desmonta, volta ao fornecedor). A DT diz com todas as letras que não obriga ninguém. O único ponto fraco é em combate, onde o Estoque é a arma da classe e nada ajuda a usá-lo.

## Achados (do mais grave ao menos grave)

- [MELHORIA] combate: o Comerciante luta com o que tirou do Estoque (explosivos, poções, venenos, munição), mas usar um consumível custa a Ação Padrão como para qualquer um, e o único poder de combate (Oferta Relâmpago) dá +2 no teste de usar um item. Com 4 de Mana por nível, os poderes que gastam Mana são todos de negócio. → Um poder de "mão no bolso", pago em Mana: "Saque e Uso", Ação de Movimento, 3 Mana, use um consumível do seu Estoque; e um de "Demonstração", Reação, 3 Mana, quando um aliado a 9 m usar um consumível que você vendeu ou consignou, ele soma +1 dado ao efeito.
- [MELHORIA] `estoque`: o teto do nível 4 é "até 2.000 (Épico de entrada)". A escada da economia multiplica por 4 (60, 240, 960), e o próximo degrau seria 3.840. → Ou escrever que 2.000 é um teto de propósito, abaixo do degrau, ou usar 3.840.
- [MELHORIA] `rede-de-negocios` nv 10 e 15: os estágios não têm ação declarada, e o 10 e o 15 dependem de "uma hora de perguntas" e "sem cobrar na hora", o que é ação fora de combate. → "Fora de combate" no campo `acao`, como as outras classes fazem.
