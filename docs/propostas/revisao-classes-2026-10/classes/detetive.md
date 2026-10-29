# Revisão do Detetive

Classe comum (4/3/2), criada em outubro. As habilidades de investigação vêm com limite escrito (a dedução não revela plano futuro nem fato sem vestígio, o Caso Encerrado não entrega a resposta certa), que é o que o Mestre precisa. Os achados são pequenos: um campo de cadastro trocado e um poder de combate que depende de um teste sem DT.

## Achados (do mais grave ao menos grave)

- [INCOERÊNCIA] cadastro: a classe é `categoria: padrao` e tem `patamar: conquista`. Nenhuma outra classe padrão tem patamar; ele é das especiais (conquista). O `requer_autorizacao_mestre: false` confirma que é comum. → Tirar o `patamar`, ou, se o Detetive for especial de propósito, mudar a categoria.
- [MELHORIA] poder `golpe-certeiro-de-logica`: pede "sucesso em Investigação para identificar o ponto fraco de um alvo", sem dizer a ação nem a DT desse teste. → "Ação de Movimento, Investigação contra a DT padrão do VD do alvo (15 + metade do VD)", a mesma régua que o Interceptador usa contra criatura.
- [MELHORIA] combate: fora o Golpe Certeiro de Lógica e o Instinto de Perigo, a classe é toda de cena de investigação. Para uma classe comum, aberta a todos, é pouco para a parte da sessão que é luta. → Ver o problema transversal 8 do README; uma sugestão barata é a Leitura Rápida (estágio 10) revelar também uma Resistência ou vulnerabilidade do alvo examinado.
