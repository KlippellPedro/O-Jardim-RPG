# Relatório de balanceamento v1

Gerado por `npm run audit:balance`. Esta é uma verificação quantitativa, não substitui playtest.

## Premissas

- Força 12, Destreza 14, Constituição 14, Inteligência 13, Sabedoria 10, Carisma 8 e Fluxo 8.
- Depois do nível 20, a referência usa uma segunda classe neutra com 3,5 de Vida e 3,5 de Mana por nível.
- Mede recursos, vagas, dano médio e palavras de risco. Efeitos narrativos e controle ainda exigem playtest.

## Resultado automático

- 24 classes analisadas.
- 87 armas analisadas.
- 0 classes fora do orçamento de 7 pontos de Vida + Mana.
- 0 armas acima de 75 de dano médio sem bloqueio do Mestre.

Cada célula mostra `Vida/Mana/vagas de poder`.

| Classe | Tipo | Orçamento | N1 | N5 | N10 | N15 | N20 | N30 | N40 | Alertas qualitativos |
|---|---|---:|---: | ---: | ---: | ---: | ---: | ---: | ---:|---|
| Guerreiro | comum | 7 | 16/8/0 | 44/16/1 | 79/26/3 | 114/36/5 | 149/46/8 | 204/81/8 | 259/116/8 | nenhum |
| Piloto | comum | 7 | 16/8/0 | 40/20/1 | 70/35/3 | 100/50/5 | 130/65/8 | 185/100/8 | 240/135/8 | nenhum |
| Ninja | comum | 7 | 16/8/0 | 40/20/1 | 70/35/3 | 100/50/5 | 130/65/8 | 185/100/8 | 240/135/8 | nenhum |
| Pop Star | comum | 7 | 16/8/0 | 36/24/1 | 61/44/3 | 86/64/5 | 111/84/8 | 166/119/8 | 221/154/8 | Publi |
| Espadachim | comum | 7 | 16/8/0 | 44/16/1 | 79/26/3 | 114/36/5 | 149/46/8 | 204/81/8 | 259/116/8 | nenhum |
| Lutador | comum | 7 | 16/8/0 | 44/16/1 | 79/26/3 | 114/36/5 | 149/46/8 | 204/81/8 | 259/116/8 | Não Levanta |
| Atirador | comum | 7 | 16/8/0 | 40/20/1 | 70/35/3 | 100/50/5 | 130/65/8 | 185/100/8 | 240/135/8 | nenhum |
| Médico | comum | 7 | 16/8/0 | 36/24/1 | 61/44/3 | 86/64/5 | 111/84/8 | 166/119/8 | 221/154/8 | nenhum |
| Guardião | comum | 7 | 16/8/0 | 44/16/1 | 79/26/3 | 114/36/5 | 149/46/8 | 204/81/8 | 259/116/8 | nenhum |
| Caçador | comum | 7 | 16/8/0 | 40/20/1 | 70/35/3 | 100/50/5 | 130/65/8 | 185/100/8 | 240/135/8 | nenhum |
| Engenheiro | comum | 7 | 16/8/0 | 36/24/1 | 61/44/3 | 86/64/5 | 111/84/8 | 166/119/8 | 221/154/8 | nenhum |
| Alquimista | comum | 7 | 16/8/0 | 36/24/1 | 61/44/3 | 86/64/5 | 111/84/8 | 166/119/8 | 221/154/8 | nenhum |
| Comerciante | comum | 7 | 16/8/0 | 40/20/1 | 70/35/3 | 100/50/5 | 130/65/8 | 185/100/8 | 240/135/8 | nenhum |
| Campeão Dimensional | especial | 7 | 16/8/0 | 44/16/1 | 79/26/3 | 114/36/5 | 149/46/8 | 204/81/8 | 259/116/8 | Marcha |
| Pirata Amaldiçoado | especial | 7 | 16/8/0 | 40/20/1 | 70/35/3 | 100/50/5 | 130/65/8 | 185/100/8 | 240/135/8 | nenhum |
| Cartista Arcano | especial | 7 | 16/8/0 | 36/24/1 | 61/44/3 | 86/64/5 | 111/84/8 | 166/119/8 | 221/154/8 | Morte |
| Guia Dimensional | especial | 7 | 16/8/0 | 36/24/1 | 61/44/3 | 86/64/5 | 111/84/8 | 166/119/8 | 221/154/8 | nenhum |
| Caçador de Entidades | especial | 7 | 16/8/0 | 40/20/1 | 70/35/3 | 100/50/5 | 130/65/8 | 185/100/8 | 240/135/8 | nenhum |
| Escritor de Contos | especial | 7 | 16/8/0 | 36/24/1 | 61/44/3 | 86/64/5 | 111/84/8 | 166/119/8 | 221/154/8 | nenhum |
| Invocador | especial | 7 | 16/8/0 | 36/24/1 | 61/44/3 | 86/64/5 | 111/84/8 | 166/119/8 | 221/154/8 | nenhum |
| Viajante | especial | 7 | 16/8/0 | 40/20/1 | 70/35/3 | 100/50/5 | 130/65/8 | 185/100/8 | 240/135/8 | nenhum |
| Elementarista | especial | 7 | 16/8/0 | 36/24/1 | 61/44/3 | 86/64/5 | 111/84/8 | 166/119/8 | 221/154/8 | nenhum |
| Decodificador | especial | 7 | 16/8/0 | 36/24/1 | 61/44/3 | 86/64/5 | 111/84/8 | 166/119/8 | 221/154/8 | nenhum |
| Codificador | especial | 7 | 16/8/0 | 36/24/1 | 61/44/3 | 86/64/5 | 111/84/8 | 166/119/8 | 221/154/8 | nenhum |

## Maiores danos do arsenal

| Arma | Raridade | Dano | Média normal | Média com crítico | Nível recomendado | Mestre |
|---|---|---|---:|---:|---:|---|
| Excalibur | relíquia da criação | 8d12+20 | 72.0 | 82.8 | 35 | sim |
| Mjolnir | relíquia da criação | 8d12+18 | 70.0 | 80.5 | 35 | sim |
| Martelo das Chamas | relíquia da criação | 8d12+16 | 68.0 | 78.2 | 35 | sim |
| Gungnir | relíquia da criação | 8d12+14 | 66.0 | 75.9 | 35 | sim |
| Masamune | relíquia da criação | 10d10+10 | 65.0 | 74.8 | 35 | sim |
| Rhaast | relíquia da criação | 8d12+12 | 64.0 | 73.6 | 35 | sim |
| Triceratops | relíquia da criação | 10d10+8 | 63.0 | 72.4 | 35 | sim |
| Zangetsu | relíquia da criação | 8d12+10 | 62.0 | 71.3 | 35 | sim |
| Bazuca | lendario | 10d8+4d4 | 55.0 | 60.5 | não definido | não |
| Excalibur | lendario | 6d10+12 | 45.0 | 51.7 | 25 | sim |
| Mjölnir | lendario | 6d10+12 | 45.0 | 51.7 | 25 | sim |
| Martelo das Chamas | lendario | 6d10+10 | 43.0 | 49.4 | 25 | sim |
| Masamune | lendario | 6d10+10 | 43.0 | 49.4 | 25 | sim |
| Rhaast | lendario | 5d12+10 | 42.5 | 48.9 | 25 | sim |
| Triceratops | lendario | 6d10+8 | 41.0 | 47.1 | 25 | sim |

## Magias publicadas para playtest

- 28 magias analisadas.
- 0 magias fora do custo, teto de dano, crítico ou acesso ritual.

| Magia | Círculo | Perfil | Mana | Dano | Média | Alertas |
|---|---:|---|---:|---|---:|---|
| Projétil Elemental | 1 | alvo | 2 | 2d8 | 9.0 | nenhum |
| Surto Elemental | 1 | area | 2 | 2d6 | 7.0 | nenhum |
| Bastião Elemental | 1 | defesa | 2 | sem dano | n/a | nenhum |
| Passo Elemental | 1 | movimento | 2 | sem dano | n/a | nenhum |
| Amarras Elementais | 1 | controle | 2 | sem dano | n/a | nenhum |
| Lança Elemental | 2 | alvo | 4 | 4d8 | 18.0 | nenhum |
| Erupção Elemental | 2 | area | 4 | 4d6 | 14.0 | nenhum |
| Muralha Elemental | 2 | defesa | 4 | sem dano | n/a | nenhum |
| Travessia Elemental | 2 | movimento | 4 | sem dano | n/a | nenhum |
| Prisão Elemental | 2 | controle | 4 | sem dano | n/a | nenhum |
| Ruptura Elemental | 3 | area | 6 | 6d8 | 27.0 | nenhum |
| Tempestade Elemental | 3 | area | 6 | 6d6 | 21.0 | nenhum |
| Manto Elemental | 3 | defesa | 6 | sem dano | n/a | nenhum |
| Asas Elementais | 3 | movimento | 6 | sem dano | n/a | nenhum |
| Contrafluxo Elemental | 3 | controle | 6 | sem dano | n/a | nenhum |
| Impacto Primordial | 4 | alvo | 8 | 8d8 | 36.0 | nenhum |
| Cataclismo Elemental | 4 | area | 8 | 8d6 | 28.0 | nenhum |
| Fortaleza Elemental | 4 | defesa | 8 | sem dano | n/a | nenhum |
| Avatar Elemental Menor | 4 | defesa | 8 | sem dano | n/a | nenhum |
| Estase Elemental | 4 | controle | 8 | sem dano | n/a | nenhum |
| Extinção Elemental | 5 | alvo | 10 | 10d8 | 45.0 | nenhum |
| Horizonte Devastado | 5 | area | 10 | 10d6 | 35.0 | nenhum |
| Cidadela Elemental | 5 | defesa | 10 | sem dano | n/a | nenhum |
| Ascensão Primordial | 5 | defesa | 10 | sem dano | n/a | nenhum |
| Domínio Elemental Absoluto | 5 | controle | 10 | sem dano | n/a | nenhum |
| Ritual do Limiar Seguro | ritual | ritual | 8 | sem dano | n/a | nenhum |
| Ritual da Leitura de Resíduos | ritual | ritual | 8 | sem dano | n/a | nenhum |
| Ritual da Passagem Preparada | ritual | ritual | 12 | sem dano | n/a | nenhum |

## Interpretação

O orçamento estrutural das classes está fechado. Alertas qualitativos indicam efeitos que alteram economia de ações ou escala e precisam de cenários de mesa. Armas lendárias normalizadas começam no nível 25; relíquias da criação no 35 e exigem autorização do Mestre.
