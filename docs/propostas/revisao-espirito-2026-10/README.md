# Revisão do Espírito: Pecados, Virtudes, Possessão e Encarnação (2026-10-28)

Rodada 5 do questionário final (pergunta 20, resposta A): uma rodada só dos 14 Pecados e Virtudes, da Possessão e da Encarnação, com auditoria por script e relatório. As marcas naturais (os 11 Fluxos e o Universal) passaram pela revisão das raças e ficam fora daqui, a não ser na tabela da régua.

O que foi lido: as 7 marcas demoníacas e as 7 angelicais (6 traços cada, do 1 ao 60), as duas escadas (Mediano, Maior, Superior, Arquidemônio ou Arcanjo e Primordial) e a Possessão e a Encarnação, que moram na própria Natureza. São 116 habilidades, dentro das 202 que a auditoria lê.

## A auditoria

`node tools/audit-espirito.mjs` já comparava os dados de cada habilidade com o acerto de NPC do nível e cobrava a Provação no 60. Ela ganhou cinco regras, que valem só para as Naturezas demoníaca e angelical:

| Regra | O que cobra | De onde vem |
|---|---|---|
| `area-sem-metade` | dano em várias criaturas tem teste, e quem passa sofre metade | pergunta 8 |
| `trava-sem-teste-repetido` | paralisar, atordoar, mandar ou possuir pede teste repetido no fim de cada turno | pergunta 8 |
| `duracao-de-1-minuto` | nada de 1 minuto em efeito de luta, em qualquer degrau (antes só no 60) | pergunta 8 |
| `nome-fora-das-regras` | sem "encantamento" no sentido de controle mental, sem psíquico, sem espiritual | perguntas 4, 12 e 13 |
| `perde-a-acao-seguida` | ninguém perde a ação em duas rodadas seguidas | pergunta 8 |

Contra o texto de antes, as regras novas acham 17 violações. Depois das correções, nenhuma. Depois da Decisão 1, entrou a sexta regra, `acima-da-regua`. O teste `racialStages.test.ts` já exige zero violação, então as regras ficam travadas.

A auditoria também mostra quantas magias do mesmo custo cada habilidade rende (coluna `emMagiaDeMesmoCusto`); ver a Decisão 1.

## Aplicado (sem commit)

- **Possessão:**
  - quem não aceitou repete a Vontade no fim de cada turno do Espírito, e um sucesso o expulsa na hora (convenção das travas);
  - na Possessão Aprimorada, o dono do corpo tem desvantagem nesse teste repetido, e o corpo ainda tem vantagem contra exorcismo de fora;
  - a Posse Plena diz que o teste repetido continua valendo. A Posse Absoluta do 60 segue sem teste para quem tem VD até o nível.
- **Absolutos e Corpos espelhados:**
  - Pecado Absoluto e Virtude Absoluta agora dão o mesmo pacote: custo 0, um uso a mais, alcance de 30 m e preço dobrado. Antes a Virtude alcançava 30 m sem pagar nada, e o Pecado pagava o dobro sem alcance a mais;
  - Corpo de Brasa Eterna ganhou imunidade a Queimando e a Amedrontado, para espelhar o Corpo de Luz (Cego, Amedrontado e escuridão).
- **Coro dos Céus e Santuário:** a mesma criatura não perde a ação em duas rodadas seguidas, e o Coro limpa condições pelo nome (Amedrontado, Fascinado, Envenenado e controle mental).
- **Luxúria e Castidade:** "encantamento" virou controle mental ou Fascinado em sete textos. A Voz de Veludo usa Diplomacia, Enganação e Intuição no lugar de "persuasão, sedução e leitura de intenção".
- **Travas com teste repetido:** Promessa Doce (até 3 rodadas), Vício Irresistível (era 1 minuto, virou até 3 rodadas) e Eternidade Parada (Paralisado por até 2 rodadas, e o primeiro sucesso troca por Lento).
- **Mente Intocada (Voto Inquebrável):** 3 rodadas no lugar de 1 minuto, e 2d6 de dano mental no lugar de 4d6, porque dano mental usa dados pequenos.
- **Gula:** o Banquete Final e a Fome que Devora o Mundo ganharam Fortitude com metade no sucesso. O Banquete causa dano de Essência. A Mordida Funda cura metade do dano, como o Dente Faminto, no lugar do dano inteiro.
- **Inveja:** a Troca de Vidas causa dano de Essência.
- **Preguiça:** no Mundo em Câmera Lenta, o teste é no começo de cada turno da criatura, como o texto sugeria e não dizia.

## O que está bom

- Os pares espelhados (Soberba e Humildade, Ganância e Caridade, Luxúria e Castidade, Inveja e Gratidão, Gula e Moderação, Ira e Paciência, Preguiça e Diligência) têm o mesmo degrau de custo: 2 Mana no 1, passivo no 8, 3 ou 4 no 15, 5 no 28, 8 no 40 (duas vezes por sessão) e 12 no 60 (uma vez por sessão, com Provação).
- Quase todo traço tem um "em troca" escrito, que é o que a Natureza promete.
- Raiz e Voto, Fonte do Pecado e Fonte da Virtude, e os dois Eternos são espelhos limpos.
- Os dados ficam abaixo de um acerto de NPC do nível em todos os degraus.

## Decisões (respondidas em 2026-10-28)

1. **Régua de magia no Espírito alto: subir o custo.** As oito que rendiam mais de uma vez e meia a magia do mesmo custo passaram a custar o que a régua pede:

   | Habilidade | Nível | Média | Custo antes | Custo agora |
   |---|---|---|---|---|
   | Ceifa (Fim, natural) | 60 | 70 | 12 | 70 |
   | Coro dos Céus | 60 | 70 de cura | 12 | 70 |
   | Presságio do Fim (natural) | 40 | 49 | 8 | 51 |
   | Labareda Infernal | 40 | 28 | 4 | 25 |
   | Chuva do Inferno | 60 | 56 | 12 | 56 |
   | Mordida Funda (Gula) | 28 | 21 | 5 | 15 |
   | Troca de Vidas (Inveja) | 60 | 35 | 12 | 32 |
   | Coro Redentor | 40 | 14 de cura | 4 | 9 |

   A régua é a mediana do dano por círculo em `magias.json`, e além do 10º círculo conta 1 de dano por Mana. Como é uma mediana, a auditoria aceita até uma vez e meia a magia (regra `acima-da-regua`, que vale para o Espírito inteiro). Outras 13 habilidades ficam entre 1,05 e 1,45 vez, dentro dessa folga, e não mudaram.
2. **Paz Imposta: fica uma vez por sessão**, porque a trava em área é mais forte que as outras do degrau 40.
3. **Dia Inteiro numa Hora: fica como está**, porque é o ápice e pede a Provação.
4. **Possessão e Encarnação: o dano do corpo sai da Vida do Espírito.** Os dois textos dizem isso agora: "O dano que o corpo sofre sai da sua Vida; se ela chegar a 0, você é expulso".

## Fora do escopo

- Os Símbolos do rito (`data/ficha/pecados-e-virtudes.json`) são outra coisa: catorze Legados de rito, um por pessoa, e não marcas do Espírito.
- As marcas naturais com "1 minuto" (Origem de Tudo, Portal Menor, Silêncio Absoluto, Fantasma na Rede) ficaram como a revisão das raças deixou.
