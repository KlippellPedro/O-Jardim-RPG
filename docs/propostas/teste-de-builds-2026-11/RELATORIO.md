# Teste de builds: personagens de vários níveis (2026-11-11)

Pedido do Pedro: criar personagens de níveis e builds diferentes para ver se a
ficha funciona, se está balanceado e se não fica maçante com habilidade e poder
demais.

Nada do jogo foi alterado. Este relatório só mede e propõe. As propostas no fim
precisam de decisão sua antes de virar mudança.

## O que foi feito

1. **Subida de nível de verdade, pelo validador do servidor.** 24 personagens
   foram criados no nível 1 e subidos nível a nível como um jogador faria:
   aumento de atributo, graus de perícia, poderes, escolhas de habilidade,
   Legados e magias. Cada passo passou por `validar_regras_ficha`, o mesmo
   código que barra ficha inválida no site. (`scripts/subir.py`)
2. **Contagem de carga.** Para 29 classes e 22 builds, contei quantas peças de
   regra o jogador carrega em cada nível: cada estágio de habilidade, cada
   poder, cada escolha, magia, Selo, traço racial e Legado. Separei o que é
   passivo (a ficha resolve) do que pede decisão na mesa (ação, reação, ação
   livre). Usa as mesmas funções da ficha. (`scripts/carga.mjs`, `builds.mjs`,
   `por-classe.mjs`)
3. **Números de combate.** Chance de acerto dos dois lados, com e sem
   armadura, contra a curva de criaturas e contra o Bestiário real (298
   criaturas). Chance de conjurar e dano de magia contra arma.
   (`scripts/acerto.mjs`, `conjurar.mjs`)
4. **Testes que já existiam:** 169 testes de ficha e balanceamento, 135 de
   regras de personagem no servidor e `audit:balance --check`. Tudo passou.

A lista de peças de cada build está em [kits-das-builds.md](kits-das-builds.md).

## Resultado curto

| Assunto | Situação |
| --- | --- |
| Criar e subir personagem | **OK.** Os 24 sobem sem erro nem vaga travada (todo poder, escolha e Legado tem opção válida em todo nível). |
| Multiclasse | **OK.** A regra "segunda classe só depois do 20" impede pegar os níveis 1 a 3 de várias classes para juntar poder barato. |
| Carga até o nível 20 | **OK para quem luta, pesada para quem conjura.** Ver tabela 1. |
| Carga do 40 ao 60 | **Pesada.** Duas ou três classes completas somam 80 a 130 peças. |
| Armadura | **Problema.** A partir do nível 10 (e de vez no 25) armadura e escudo tornam o personagem quase impossível de acertar. |
| Acerto do jogador | **Problema leve.** Do nível 5 em diante quem investe na perícia de combate acerta 95%; o dado de ataque vira formalidade. |
| Conjuradores | **Problema.** Mais regras, menos Vida e menos dano por turno que quem usa arma; a magia do círculo mais alto falha metade das vezes e a Mana some na falha. |
| Poderes de classe | **Pouca escolha e muito "+2".** 10 poderes para 8 vagas, vários são bônus pequenos de ação livre com custo e contador. |

## 1. Carga de regras por nível

"Peças" soma tudo o que está na ficha. "Pedem decisão" são as peças que o
jogador precisa lembrar de usar na mesa (ação, reação ou ação livre), já com a
proporção média do catálogo para poderes e escolhas. Referência para comparar:
um personagem de nível 20 de D&D 5e tem perto de 25 a 35 peças.

| Build | Nível | Peças | Pedem decisão | Reações e ações livres | Contadores (por turno / por cena ou descanso) |
| --- | ---: | ---: | ---: | ---: | --- |
| Guerreiro (anão) | 1 | 3 | 1 | 1 | 1 / 0 |
| Canalizador (elfo) | 1 | 11 | 2 | 0 | 0 / 1 |
| Espadachim | 5 | 9 | 4 | 2 | 0 / 1 |
| Sintonizador | 5 | 17 | 7 | 0 | 0 / 0 |
| Ninja | 10 | 14 | 4 | 0 | 0 / 2 |
| Alquimista | 10 | 17 | 11 | 0 | 0 / 2 |
| Guardião | 15 | 25 | 11 | 6 | 4 / 3 |
| Guerreiro | 20 | 30 | 18 | 4 | 3 / 5 |
| Canalizador | 20 | 47 | 27 | 5 | 1 / 7 |
| Sintonizador | 20 | 48 | 28 | 5 | 1 / 4 |
| Espadachim 20 + Ninja 20 | 40 | 53 | 25 | 7 | 2 / 11 |
| Canalizador 20 + Sintonizador 20 | 40 | 91 | 55 | 10 | 2 / 11 |
| Guerreiro 20 + Guardião 20 + Campeão 20 | 60 | 81 | 45 | 15 | 9 / 14 |
| Canalizador 20 + Sintonizador 20 + Elementarista 20 | 60 | 132 | 77 | 11 | 4 / 14 |
| Ninja 50 + Devorador 10 | 60 | 45 | 17 | 2 | 0 / 7 |

Leituras:

- **Até o nível 10 a carga é boa.** As classes seguem o mesmo molde (habilidade
  em estágios no 1, 5, 10, 15, 20; habilidade de escolha no 3, 8, 14, 20; fecho
  no 18 e 20; poder a cada 2 ou 3 níveis). Uma classe de luta chega ao 10 com
  14 peças e 4 a 8 decisões.
- **Classe de magia já nasce pesada.** O Canalizador abre o nível 1 com 11
  peças contra 3 a 5 das outras, e chega ao 20 com 47. O Sintonizador fecha o
  20 com 48. São as classes com mais regra e, ao mesmo tempo, as mais frágeis
  (ver seção 4).
- **O salto está no 40 e no 60.** O padrão do jogo (duas comuns e uma especial)
  dá três kits completos. Um lutador fica em 81 peças, um conjurador triplo em
  132, com 30 magias, 24 poderes e 14 contadores de "uma vez por cena".
- **Os dois caminhos depois do 20 são muito diferentes.** Subir a mesma classe
  até o 50 não dá nada novo (só Vida, Mana, Estamina e Maestria): o Ninja 50
  chega ao 60 com 45 peças. Abrir classes dá o dobro ou o triplo de opções. É
  simples para quem quer simples, mas a escolha de poder entre os dois é
  desigual.

## 2. Armadura deixa o personagem impossível de acertar

A Defesa Total soma Defesa Natural + armadura + escudo, sem teto. A curva das
criaturas (e o Bestiário real, que segue a curva) calcula o ataque do inimigo
pela **Defesa Natural**, sem armadura. O bônus das armaduras cresce muito mais
rápido que o ataque:

| Raridade | Armadura (mediana / máx.) | Escudo (máx.) |
| --- | --- | --- |
| Comum | +2 / +3 | +1 |
| Incomum | +4 / +7 | +3 |
| Rara | +9 / +13 | +5 |
| Épica | +10 / +15 | +8 |
| Lendária | +21 / +25 | +16 |
| Relíquia da Criação | +28 / +35 | +20 |

Chance do **inimigo padrão** do mesmo nível acertar o personagem:

| Nível | Sem armadura | Armadura típica | Melhor armadura + escudo | Chefe contra a melhor |
| ---: | ---: | ---: | ---: | ---: |
| 1 | 55% | 45% | 35% | 55% |
| 5 | 70% | 45% | 20% | 40% |
| 10 | 80% | 35% | 5% | 10% |
| 15 | 90% | 45% | 5% | 5% |
| 20 | 95% | 60% | 5% | 10% |
| 25 | 95% | 5% | 5% | 5% |
| 40 | 95% | 15% | 5% | 5% |

5% é só o 20 natural. No nível 25 um personagem com uma armadura lendária
comum, sem escudo, já só é acertado no 20 natural; com o escudo, nem o chefe
passa disso. Ao mesmo tempo o conjurador sem armadura é acertado em 95%. O
resultado na mesa: o tanque deixa de rolar Defesa de verdade, o Mestre só
consegue machucar o grupo por teste de resistência e área, e o ataque comum
do inimigo vira formalidade.

**Atualização (2026-11-11, aplicada).** A conta acima ainda subestimava o
problema: a Loja vende cada modelo em qualquer raridade, e a raridade comprada
soma +0 a +4 de Defesa por peça. O bônus do catálogo é o da versão Comum, que
saía no primeiro balcão por até 80 Lunaris, sem nível mínimo; com isso,
armadura e escudo davam 5% de acerto já no nível 1.

Uma primeira versão baixou tudo para +1 a +5, e uma segunda deixou o Lendário
em +12. O Pedro quer números altos do Épico em diante, que acompanhem o resto
da ficha no nível 40, segurados por pré-requisitos e preço. Ficou assim:
armadura Épica +10 a +15 e Lendária +16 a +22 (escudo até +11); o modelo exige
nível 5, 10, 15 ou 25 conforme a raridade original, Força ou Constituição 15 no
Épico e 18 no Lendário, e a versão Comum custa ×2 a ×16. Tabela completa no
[BALANCEAMENTO.md](../../sistema/BALANCEAMENTO.md).

Com números assim, a opção (c) entrou junto: do VD 15 em diante, o golpe das
criaturas soma o que a armadura típica do nível tira dele (coluna
`ajusteDeArmadura` da curva, +7 no 15, +11 a +13 do 25 ao 50), aplicado também
nas 194 fichas do Bestiário com VD 15 ou mais. Os testes de resistência das
criaturas não mudaram. Resultado (`scripts/acerto-escala.mjs`):

| Nível | Sem armadura | Armadura típica | Melhor armadura + escudo, sem raridade | Melhor armadura + escudo, com raridade |
| ---: | ---: | ---: | ---: | ---: |
| 1 | 55% | 45% | 35% | 35% |
| 5 | 70% | 45% | 25% | 15% |
| 10 | 80% | 40% | 20% | 5% |
| 15 | 95% | 50% | 15% | 5% |
| 20 | 95% | 50% | 15% | 5% |
| 25 | 95% | 50% | 5% | 5% |
| 40 | 95% | 50% | 5% | 5% |
| 60 | 95% | 50% | 5% | 5% |

A armadura típica fica em 50% do 15 em diante. A melhor armadura com o melhor
escudo continua perto do 20 natural: é a combinação mais cara do jogo, e pede
nível, Força e, na raridade Lendária, o Mestre.

## 3. O jogador acerta quase sempre

O ataque de referência (metade do nível + atributo + o maior grau) passa a
Defesa das criaturas cedo. Contra o inimigo do mesmo nível, quem investe na
perícia de combate acerta **95% desde o nível 5** (a curva dá à criatura a
Defesa Natural menos 3). O Bestiário real confirma: VD 10 a 14 tem ataque
mediano +16 e Defesa mediana 16.

O [BALANCEAMENTO.md](../../sistema/BALANCEAMENTO.md) diz que isso acontece "do
nível 29"; pelos números de hoje acontece do 5. Somado à seção 2, a partir do
meio do jogo os dois lados rolam d20 sem tensão: o jogador sempre acerta e o
tanque nunca é acertado. Isso também pesa no "maçante": muita rolagem que não
decide nada.

## 4. Conjurador: mais regra, menos efeito

Teste de conjuração = d20 + Fluxo + metade do nível + grau de Misticismo,
contra DT 7 + 3 × círculo. A Mana é gasta ao declarar e não volta se falhar.
Canalizador com Fluxo como atributo principal, contra a arma de referência do
mesmo nível (dano médio da magia pelo catálogo, sem bônus de classe):

| Nível | Círculo | Chance | Dano esperado por turno | Turnos até a Mana acabar | Arma de referência por turno |
| ---: | ---: | ---: | ---: | ---: | ---: |
| 5 | 4 (máx.) | 55% | 11,6 | 3 | 11,4 |
| 10 | 6 (máx.) | 50% | 15,0 | 3 | 19,5 |
| 10 | 4 | 80% | 16,8 | 6 | 19,5 |
| 15 | 8 (máx.) | 40% | 15,6 | 3 | 27,5 |
| 20 | 10 (máx.) | 40% | 23,6 | 2 | 28,5 |
| 20 | 8 | 70% | 28,0 | 4 | 28,5 |

- A magia mais alta é a pior escolha: conjurar dois círculos abaixo dá mais
  dano esperado e dura o dobro.
- Mesmo assim fica abaixo da arma, e a arma não gasta nada.
- O conjurador tem 2 de Vida por nível (Canalizador e Sintonizador): no 20 são
  50 de Vida contra 80 da média e 118 do Guerreiro, e é acertado em 95%.
- Os bônus da classe ajudam pouco: Ajuste Fino (+2, uma vez por cena), Pulso
  Nativo (+2, 3 de Mana), Segunda Chance (uma vez por cena).

Ressalva: magia em área acerta vários alvos, e controle não aparece nesta
conta. Ainda assim o conjurador carrega o dobro de regra para render menos no
turno comum.

## 5. Poderes de classe: pouca escolha, muito detalhe

- Todas as classes têm de 10 a 13 poderes para 8 vagas. Na prática o jogador
  pega quase o catálogo inteiro, então a escolha é pequena.
- Muitos são ação livre com custo e contador. Exemplo do Canalizador no 20:
  Pulso Nativo, Alcance Expandido, Fluxo Persistente, Manifestação Moldada,
  Canalização Rápida e Ápice do Fluxo são seis ações livres, cada uma com custo
  de Mana, quatro com limite por cena ou sessão. Espadachim, Ninja, Caçador,
  Cartista, Escritor e Sintonizador têm o mesmo padrão (6 a 8 ações livres).
- 3 a 4 poderes por classe (Guerreiro, Espadachim, Canalizador...) são "+1 a
  +3 em alguma coisa". Cada um é pouco sozinho e é mais uma coisa a lembrar.

## O que está bom

- A ficha e o servidor concordam: 24 personagens, 656 subidas de nível, zero
  erro, zero vaga sem opção válida.
- Classe especial presa à Árvore e "segunda comum só depois do 20" funcionam
  como o livro diz.
- Recursos (Vida, Mana, Estamina) seguem o orçamento de 9 por nível em todas as
  29 classes; a auditoria está em dia.
- Ataques extras são raros e todos limitados (uma vez por combate ou rodada).
  Não achei classe de luta muito acima das outras em dano por turno.
- Até o nível 10, classe de luta tem carga parecida com D&D 5e.

## Propostas (precisam de decisão)

Em ordem do que mais muda a mesa:

1. **Armadura.** *Feito em 2026-11-11: bônus alto do Épico em diante, com nível
   mínimo, atributo mínimo e preço, e a (c) junto: o golpe das criaturas soma a
   armadura típica do VD 15 em diante. Ver a atualização da seção 2.* Caminhos considerados:
   - a) Diminuir as faixas altas: Lendária perto de +12 (armadura) e +6
     (escudo), Relíquia perto de +15 e +8. Mexe no catálogo da Loja; dá para
     fazer com um normalizador como o `normalize-arsenal-balance.mjs`.
   - b) Teto de bônus de armadura + escudo por nível (por exemplo, metade do
     nível + 4).
   - c) Subir o ataque da curva de criaturas contando uma armadura típica.
     Resolve o tanque, mas o conjurador sem armadura passa a ser acertado
     sempre.
   Recomendo a (a): a meta seria o tanque ser acertado perto de 35% a 45% e
   quem não usa armadura perto de 70%.
2. **Acerto do jogador.** Tirar o "−3" da Defesa das criaturas na curva (ou
   tirar metade dele), para o jogador acertar perto de 70% a 80% no meio do
   jogo. Isso pede gerar a curva de novo (`npm run audit:balance`) e conferir a
   Vida de inimigo padrão, que hoje assume 95% de acerto.
3. **Conjuração.** Uma de três: DT menor nos círculos altos (por exemplo
   5 + 3 × círculo), devolver metade da Mana na falha, ou somar o grau de
   Misticismo também à DT da magia do círculo máximo. A meta seria o círculo
   máximo sair perto de 65%.
4. **Vida do conjurador.** Avaliar 3 de Vida por nível para Canalizador e
   Sintonizador, tirando 1 de Mana (o orçamento de 9 continua).
5. **Enxugar poderes de "+2".** Juntar os pequenos bônus de ação livre em menos
   poderes, maiores e sem contador. Começar pelos conjuradores e pelo
   Espadachim.
6. **Carga do 40 ao 60.** Caminho de tela, sem mudar regra: no Modo Mesa,
   mostrar só o que pede decisão, agrupado por ação, reação e ação livre, com
   os contadores de cena à vista. Vale conferir o que o Modo Mesa já mostra
   antes de mexer.

## Como rodar de novo

Da raiz do projeto:

```bash
node --import ./tests/frontend/registerTsLoader.mjs docs/propostas/teste-de-builds-2026-11/scripts/por-classe.mjs "C:/D.E.V/T.D.S/Diversos/RPG/Pessoais/O-Jardim-RPG/docs/propostas/teste-de-builds-2026-11/scripts"
node --import ./tests/frontend/registerTsLoader.mjs docs/propostas/teste-de-builds-2026-11/scripts/builds.mjs "C:/D.E.V/T.D.S/Diversos/RPG/Pessoais/O-Jardim-RPG/docs/propostas/teste-de-builds-2026-11/scripts"
node --import ./tests/frontend/registerTsLoader.mjs docs/propostas/teste-de-builds-2026-11/scripts/acerto.mjs
cd plataforma && python ../docs/propostas/teste-de-builds-2026-11/scripts/subir.py subir.json
```

Como a contagem foi feita: cada estágio de habilidade conta como uma peça;
"pede decisão" vem do campo `acao` (Passivo e fora de combate não contam);
poderes e escolhas usam a proporção de ativos do catálogo da classe; Legados
contam 40% como decisão. A armadura "típica" é a mediana da melhor raridade que
o nível alcança (comum 1, incomum 5, rara 10, épica 15, lendária 25, a mesma
tabela da referência de balanceamento).
