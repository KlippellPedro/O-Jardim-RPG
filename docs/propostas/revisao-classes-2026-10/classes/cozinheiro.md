# Revisão do Chef

Classe comum (3/4/2). Vinte receitas com nome de prato de verdade, escada de cinco níveis, porções que se gastam e um único lote de Mantimentos por descanso. O desenho é limpo. Os achados: uma receita que fala em rolar a Iniciativa (que não se rola), a escala de condição "leve" sem regra e uma capstone repetida em três classes.

## Achados (do mais grave ao menos grave)

- [ERRO] receita `cuscuz-nordestino`: "+2 na próxima iniciativa que rolar" e, no nível 5, "a iniciativa recebe vantagem". O tópico Combate diz que a Iniciativa não se rola: é um número da ficha. → "+2 de Iniciativa no próximo combate antes do descanso seguinte"; no nível 5, "+4 de Iniciativa e o alvo não pode ficar Surpreendido nesse combate". *(Aplicado, com a duração "Até o próximo combate".)*
- [INCOERÊNCIA] "condição leve que Cura possa tratar" (Ramen nível 3, Mesa da Celebração). Ver o problema transversal 3 do README.
- [INCOERÊNCIA] `mesa-da-celebracao`: "você e até cinco aliados recuperam metade da Vida, da Mana e da Estamina máximas e encerram uma condição" é o mesmo pacote do Mestre da Vida do Médico e da Panaceia da Pedra Filosofal do Alquimista. Três classes terminam com a mesma capstone. A do Chef pelo menos é fora de combate (dez minutos). → Manter a do Chef (é a que combina com refeição) e dar outra cara às do Médico e do Alquimista. Ver o problema transversal 9 do README.
- [MELHORIA] Mana: 4 por nível, e só três poderes custam Mana (Toque Final 2, Harmonização 4, Cozinha Impossível 6). As porções são o recurso de verdade, e a Mana sobra. → Ou um poder que troque Mana por porção ("Reforço da Casa", 5 de Mana, uma porção a mais nesta cena), ou a classe troca 1 de Mana por 1 de Estamina, que é o que paga Marmita de Combate e Serviço Sincronizado.
- [MELHORIA] receita `curry-de-legumes`: "Escolha uma afinidade elemental". → "Escolha um dos sete elementos".
- [MELHORIA] receita `brigadeiro` nível 5: "testes contra medo" → "testes contra Amedrontado". *(Aplicado.)*
