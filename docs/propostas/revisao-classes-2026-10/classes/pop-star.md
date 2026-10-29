# Revisão da Pop Star

Classe comum (3/4/2). Está muito bem amarrada a sistemas que já existem: a Fama é a tabela de Facções, a atitude sobe na escada do Prestígio, e os dez contratos da Publi têm cara própria e escada de quatro níveis. O que falta é combate: com 4 de Mana por nível, a classe não tem nenhum poder de combate que gaste Mana.

## Achados (do mais grave ao menos grave)

- [INCOERÊNCIA] Mana sem uso em combate: os quatro poderes que custam Mana (Minha Voz Vale Ouro, Autógrafo, Clipe Polêmico, Trendsetter) são todos sociais. Em combate a Pop Star tem Pose de Diva, Meu Cabelo (−2 num ataque), Faz o L (tira a reação) e Lançamento Surpresa (+2 em Vontade), todos pagos em Estamina. No nível 10 ela tem 40 de Mana que não servem para a luta. → Um ou dois poderes de palco em combate pagos em Mana, que usem condições que já existem: por exemplo "Refrão", Ação Padrão, 4 Mana, até três aliados a 9 m ficam Inspirados; e "Bis", Reação, 3 Mana, um aliado que acabou de falhar repete o teste.
- [INCOERÊNCIA] poderes `pose-de-diva` e `faz-o-l-de-luz`: o texto diz "contra a sua DT de Pop Star", e a classe chama a DT de "DT de Palco" (no campo `dt_efeitos` e na ficha técnica dos mesmos poderes). → "contra a sua DT de Palco". *(Aplicado.)*
- [MELHORIA] `estrela-eterna`: "imunidade a medo" (a condição é Amedrontado) e "A Mana temporária desaparece ao fim da cena" esquece a Estamina temporária, que o mesmo texto dá. → "imunidade a Amedrontado" e "A Mana e a Estamina temporárias desaparecem ao fim da cena e não se acumulam". *(Aplicado.)*
- [MELHORIA] `publi` op. `casa-de-moda` nível 3: "conta como armadura leve". As armaduras do jogo são simples ou marciais. → "conta como uma armadura simples de +2".
- [MELHORIA] `fama` nv 5: "Com um teste de Atuação você acalma ou anima uma multidão" sem DT. → "Atuação DT 15 (DT 20 se a multidão estiver hostil)".
