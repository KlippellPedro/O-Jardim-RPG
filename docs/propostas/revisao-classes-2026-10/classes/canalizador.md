# Revisão do Canalizador

Classe mágica comum (2/6/1). O Fluxo nativo e a escolha "só sem Árvore" já foram revistos em outubro (Decisão 1 da revisão das magias; ver `docs/propostas/revisao-magias-2026-10/classes/canalizador.md`). Nesta passada, o que sobra é repetição: a classe tem cinco formas diferentes de ganhar +2 ou repetir o teste de conjuração, e duas delas são a mesma coisa.

## Achados (do mais grave ao menos grave)

- [INCOERÊNCIA] `canalizacao-nativa` nv 20 × poder `apice-do-fluxo`: "Uma vez por sessão, trate o d20 de uma conjuração como 15" e "Uma vez por sessão, considere 15 o resultado natural de uma conjuração". São o mesmo efeito; o poder só custa 8 de Mana a mais. → O poder vira outra coisa, por exemplo "Ápice do Fluxo: uma vez por sessão, uma magia sua ignora a Resistência do alvo ao tipo de dano dela".
- [MELHORIA] bônus empilhados no mesmo teste: Pulso Nativo (+2 por 3 de Mana), Canalização Nativa 5 (+2 depois de rolar), Forma de Alvo (+2), Canalização Nativa 15 (repete), Canalização Nativa 20 e Ápice (d20 vira 15). Cinco das escolhas da classe mexem no mesmo número. → Trocar uma ou duas por efeitos que mudem a magia, no molde de Alcance Expandido e Manifestação Moldada (por exemplo: "Magia Silenciosa", conjura sem componente verbal uma vez por cena; "Duas Mãos", mantém duas magias de Concentração de até 3º círculo).
- [MELHORIA] poder `reserva-interior`: um poder inteiro por +2 de Mana máxima, quando a classe já tem 60 no nível 10. → "+1 de Mana máxima por nível de Canalizador".
