# Revisão geral (2026-11-12)

Duas partes. A primeira confere o que mudou nos commits 66d28f6 e a2e74fd
(armaduras, golpe e Defesa das criaturas, conjuradores, poderes e Modo mesa) e
corrige o que estava errado. A segunda mede o resto do jogo atrás de mais pontos
de balanceamento e do que deixa a mesa lenta ou confusa. Os números da segunda
parte saem de `scripts/auditoria.mjs`, que grava `auditoria.md`.

## 1. Erros no que fizemos (corrigidos)

1. **O atributo mínimo da Loja ignorava a raça.** A ficha guarda em
   `atributosFinais` a base e os aumentos de nível; o ajuste da raça é somado
   na hora da conta. O aviso "exige Força 18" disparava para quem chegava lá
   com a raça. Agora o servidor usa `_atributo_efetivo` (a mesma conta da ficha,
   com o teto racial) e o navegador usa `aplicarAjustesAtributosRaciais`. Teste
   novo nos dois lados, com o Amálgamo (+2 de Constituição).
2. **Partes de chefe com Defesa escrita no texto ficaram para trás.** As placas
   de coral da Rainha dos Corais, os retratos do Inquilino, o coração da Vó
   Benta e a corrente do Agrimensor tinham Defesa pensada perto da Defesa antiga
   da criatura. Com a Defesa nova, viraram acerto quase certo. Subiram o mesmo
   tanto que a criatura (20→32, 14→22, 11→15, 19→30). O script do Bestiário
   passou a mover esses números sozinho se a curva mudar de novo; "Defesa 5
   menor" é relativo e fica como está.
3. **Deidades e Soberanos seguiam a conta antiga.** As fichas
   (`deidades-v1.json`) e o Guia do Mestre tinham a Defesa e a Vida de antes.
   Receberam a mesma conta do Bestiário: Defesa +24 a +33 conforme o VD e Vida
   × 0,789. A Keryx continua com metade de tudo enquanto está presa (Defesa 145
   e 274). PDFs do Livro gerados de novo.
4. **Uma linha do BALANCEAMENTO.md** ainda descrevia a criatura com "Defesa 3
   abaixo da natural". Corrigida.

Conferido sem problema:

- O catálogo da Loja é regravado inteiro no banco a cada deploy
  (`sync_shop_catalog`), então armaduras, criaturas e preços chegam ao site sem
  migração.
- Nenhum texto do site, dos bots ou dos documentos cita os nomes antigos de
  poder (Golpe em W, Muralha de Ouro, Pulso Nativo...) nem a fórmula antiga da
  DT de conjuração.
- Os bônus de ataque escritos nas fases dos chefes são todos relativos ("+5 no
  ataque"), então continuam certos.

## 2. O que mora no banco e não muda sozinho

Lembrete, sem mudança desta revisão:

- armaduras já compradas (o inventário guarda uma cópia do bônus);
- criaturas que o Mestre editou numa campanha, fichas dos Registros Universais
  e criaturas já em cena na Sessão (golpe, Defesa e Vida antigos);
- aliados comprados antes desta leva (Vida e Defesa antigas).

## 3. Efeitos a observar na mesa

- **Aliados comprados ficaram mais difíceis de acertar.** Uma criatura do
  Bestiário comprada como aliado traz a Defesa nova (+4 a +18 conforme o VD);
  a Vida dela continua limitada a 2 vezes a de um personagem.
- **Invocações do Invocador** têm Defesa fixa de 11 a 23 pelo Catálogo e são
  acertadas quase sempre do meio do jogo em diante. Já era assim; o golpe novo
  das criaturas piora do nível 15 em diante. Ver a proposta 3.
- **Magia de efeito** (a que pede resistência) passa perto de 50% contra a
  criatura do mesmo nível, porque é rolagem contra rolagem com bônus parecidos.
  É o desenho atual; só vale confirmar na mesa que agrada.

## 4. Propostas de balanceamento

Em ordem do que mais muda a mesa.

### 1. Quem luta sem armadura (prioridade alta)

O Lutador é "sem arma e sem armadura" por conceito e tem só +1 ou +2 de Defesa
de classe. Desde que o golpe das criaturas passou a contar a armadura típica do
nível, quem luta sem armadura é acertado 95% das vezes do nível 15 em diante,
contra 50% de quem veste a armadura da sua faixa.

Proposta: **Guarda Aberta** (Lutador, passivo): sem armadura e sem escudo, some à
Defesa a mesma escada da armadura típica: +2, +5 no nível 5, +8 no 10, +15 no
15 e +24 no 25. Fica empatado com quem veste armadura e não passa dela.

| Nível | Sem armadura hoje | Armadura típica | Com a Guarda Aberta |
| ---: | ---: | ---: | ---: |
| 1 | 55% | 45% | 45% |
| 10 | 80% | 40% | 40% |
| 15 | 95% | 50% | 50% |
| 25 | 95% | 50% | 50% |
| 60 | 95% | 50% | 50% |

O Pirata Amaldiçoado (Pele de Tubarão) e qualquer outra classe que tenha
"mesmo sem armadura" no texto podem usar a mesma escada.

### 2. Resistência que vira tudo ou nada

O teste de resistência contra a DT padrão de criatura (15 + metade do VD) e o
teste de perícia contra a DT padrão do Guia (15 + metade do nível) separam demais
quem investiu de quem não:

| Nível | Investido | Treinado (2 graus abaixo) | Sem treino |
| ---: | ---: | ---: | ---: |
| 1 | 50% | 40% | 35% |
| 10 | 75% | 50% | 35% |
| 20 | 95% | 70% | 35% |
| 40 | 95% | 80% | 35% |

Do nível 20 em diante, o investido só falha no 1 natural e o sem treino fica
parado em 35%. É o mesmo problema que o ataque tinha: a metade do nível sobe
igual para todos, mas os 12 graus de perícia (+2 cada, até +22) só sobem para
quem investe.

Caminhos:

- a) **DT de efeito de criatura soma metade do bônus do maior grau do VD**
  (+5 no 20, +6 no 30). No nível 20: investido 75%, treinado 45%, sem treino
  10%. É a mesma ideia do ataque: a regra conta com o grau que o nível
  costuma ter.
- b) **No Guia, trocar a DT de referência pelo nível**: do 20 em diante, a DT
  "padrão" de cena vira a "difícil". Mexe só em texto, mas depende de o Mestre
  lembrar.

Recomendo a (a) para criaturas e a (b) para perícias de cena.

### 3. Invocações com Defesa da curva

A Defesa de cada invocação poderia vir da curva, como a das criaturas: Defesa
natural do Invocador mais a armadura típica do nível (a mesma escada da
proposta 1), no lugar do número fixo do Catálogo. Mantém a invocação viva por
tantas rodadas quanto um personagem de armadura.

### 4. Escudos de raridade alta (observar)

Com a melhor armadura e o melhor escudo, os dois com raridade alta, o inimigo
acerta só no 20 natural do nível 10 em diante. O preço e os requisitos seguram
isso. Se aparecer na mesa, o ajuste é a raridade somar metade nos escudos.

## Resultado das propostas 1 a 4 (aplicadas em 2026-11-12)

Medido com `scripts/medir-propostas.mjs` depois de aplicar.

**1. Guarda Aberta.** Resolveu: o Lutador sem armadura é acertado como quem
veste a armadura da faixa (40% a 50%), contra 95% antes. A ficha soma sozinha.

**2. Resistência.** A fórmula proposta (somar metade do grau) não serviu:
endurecia o começo do jogo (quem investe caía para 60% no nível 10) e voltava a
95% no 60, porque o atributo também sobe. Ficou a maior entre 15 + metade do
nível e o bônus de quem investe + 6, a mesma ideia do ataque:

| Nível | DT (antes → agora) | Investido | Treinado (2 graus abaixo) | Sem treino |
| ---: | ---: | ---: | ---: | ---: |
| 1 | 15 → 15 | 50% | 40% | 35% |
| 10 | 20 → 20 | 75% | 50% | 35% |
| 15 | 22 → 24 | 75% | 50% | 25% |
| 20 | 25 → 30 | 75% | 45% | 10% |
| 40 | 35 → 43 | 80% | 40% | 5% |
| 60 | 45 → 56 | 80% | 35% | 5% |

A mesma conta virou a escada de DT de cena do Guia, gerada por nível, e as DTs
escritas no Bestiário, nas Deidades e nas aventuras do kit andaram a diferença.

**3. Invocações.** Resolveu: 40% a 55% em todos os níveis, contra 95% do meio do
jogo em diante.

| Nível total | Caçador de Feras (antes → agora) | Colosso de Ferro (antes → agora) |
| ---: | ---: | ---: |
| 1 | 60% → 50% | 50% → 40% |
| 10 | 85% → 45% | 75% → 35% |
| 15 | 95% → 55% | 95% → 45% |
| 40 | 95% → 55% | 95% → 45% |

**4. Escudos.** Só a metade da raridade não resolveu (o tanque continuava no 20
natural do nível 10 em diante). O escudo encolheu também na escala: Comum +1,
Incomum e Raro +1 a +2, Épico e Lendário +2 a +3, Relíquia +3 a +5. As armaduras
continuam altas.

| Nível | Sem armadura | Lutador (Guarda Aberta) | Armadura típica | Melhor armadura + escudo, raridade alta | Chefe contra essa defesa |
| ---: | ---: | ---: | ---: | ---: | ---: |
| 1 | 55% | 45% | 45% | 35% | 55% |
| 5 | 70% | 45% | 45% | 25% | 45% |
| 10 | 80% | 40% | 40% | 15% | 35% |
| 15 | 95% | 50% | 50% | 15% | 35% |
| 25 | 95% | 50% | 50% | 15% | 35% |
| 60 | 95% | 50% | 50% | 15% | 35% |

O tanque com tudo no máximo fica em 15% contra o inimigo padrão e 35% contra o
chefe; o escudo ainda vale uns 25 pontos de chance.

## 5. Propostas de carga e clareza

### 5. Um vocabulário só para o tipo de ação

As classes usam **78 textos diferentes** no campo de ação, e 56 deles aparecem
uma vez só ("Ação de Movimento para varrer", "Ação Completa para trabalhar a
multidão", "Entregue no descanso longo"). O jogador precisa ler cada um para
saber que tipo de ação é, e o Modo mesa precisa adivinhar.

Proposta: o campo `acao` fica com sete valores (Passivo, Ação Livre, Ação de
Movimento, Ação Padrão, Ação Completa, Reação, Fora de combate) e o resto vira
um campo `momento` ("antes do ataque", "ao ser atingido"). A ficha mostra os
dois juntos, então o texto que o jogador lê não muda; só fica previsível. Dá
para fazer por script com revisão dos 56 casos raros.

### 6. Quatro janelas de uso, não oito

O "uma vez por..." aparece em oito janelas: sessão (325), cena (274), combate
(60), rodada (50), turno (39), descanso (22), descanso longo (7) e rito (2).
Combate e cena, turno e rodada, descanso e descanso longo dizem quase a mesma
coisa e confundem na hora de zerar.

Proposta: **rodada, cena, descanso e sessão**. "Combate" vira cena, "turno" vira
rodada, "descanso longo" vira descanso (o curto, quando existir, diz "descanso
curto" por extenso). Com isso os botões do Modo mesa (Nova cena, Descansei, Nova
sessão) cobrem tudo.

Vale pensar também nos 325 usos "por sessão": eles dependem do tamanho da
sessão real, que muda de mesa para mesa. Os de combate podiam virar "por
descanso", e "por sessão" ficaria para efeito de história.

### 7. Livro: separar o núcleo dos módulos

São 53 tópicos, cerca de 56 mil palavras para o jogador (mais 30 mil do Guia do
Mestre). 47 aparecem como "Regra oficial" e nenhum como opcional, mesmo os que
só servem quando a mesa quer: Perseguições a Pé, Batalha em Massa, Infiltração,
Venenos, Doenças e Vícios, Marcas e Cicatrizes, Prestígio, Fama e Procura,
Tempo Entre Aventuras, Devoção, Facções em Movimento, Navegação.

Proposta: um selo **Núcleo** (o que todo jogador precisa: criação, testes,
combate, magia, condições de combate, descanso) e **Módulo** (o resto, "use se a
sua mesa quiser"), mais uma folha de regras de mesa de duas páginas para imprimir.
Muda só a apresentação.

### 8. Condições em camadas

São 98 condições: 28 de combate e corpo, 6 crises de Sanidade, 47 de longo
prazo e 17 aflições, sem nomes repetidos. Na mesa só as 28 aparecem toda hora.
Proposta: a aba de condições abre nas 28, e longo prazo e aflições ficam numa
segunda aba "Fora do combate", como os passivos do Modo mesa.

### 9. Criação de personagem

20 das 25 raças pedem duas ou três camadas de escolha na criação (variante,
linhagem, natureza, estágio, fragmentos), e o Espírito sozinho tem 96 mil
caracteres de texto, três vezes a segunda maior raça. Proposta: cada raça ganha
uma **escolha pronta** sugerida no assistente ("comece com esta"), e o Espírito
ganha um resumo de uma tela antes das Naturezas.

### 10. Magias

São 355 magias, mais 35 rituais, 33 selos e 33 encantamentos, e um conjurador de
três classes conhece 30 magias no nível 60. Proposta: **listas sugeridas por
Fluxo** (cinco magias por círculo que funcionam juntas) para quem não quer
garimpar o catálogo inteiro.

### 11. Moedas (baixa)

Quatro moedas: Lunaris (802 itens), Solares (497), Fragmentos de Estrela (135) e
Créditos Sombrios (35). Os Créditos Sombrios aparecem em pouca coisa; podiam
virar Solares com a marca de mercado negro que a Loja já usa.

## Resultado das propostas 5 a 11 (2026-11-12)

**5. Tipo de ação.** Feito por script (`tools/normalizar-acoes-classes.mjs`,
com `--check` para travar regressão). Os 71 textos que fugiam dos sete tipos
viraram `acao` + `momento`; os sinônimos foram unificados ("depois do acerto",
"após acertar" e "depois de acertar" viraram um só). Hoje o campo tem só os sete
tipos (Passivo 217, Ação Livre 185, Ação Padrão 132, Ação de Movimento 66,
Fora de combate 65, Reação 62, Ação Completa 31) e há 62 momentos diferentes.
A ficha, a página da classe, a Progressão, o Modo mesa e o Compêndio do PDF
mostram os dois juntos ("Ação Livre · antes do ataque"), então o jogador lê o
mesmo texto de antes. O tópico Poderes e Habilidades ganhou "Como ler a ação e
o limite de uso".

**6. Janelas de uso.** "Por combate" virou "por cena" e "descanso longo" ou
"completo" virou "por descanso" (o curto é o Relaxar, que não devolve usos).
Contagem nos catálogos depois da troca: cena 392, sessão 355, rodada 78, turno
50, descanso 41, dia 7, rito 2. Turno e rodada **ficaram separados**: "por
turno" vale uma vez em cada turno, de qualquer criatura, então um gatilho por
turno pode disparar várias vezes na mesma rodada; juntar com rodada cortaria o
poder dessas habilidades. O Modo mesa mostra as cinco janelas com o nome certo
(rodada e turno sem contador, as outras com contador e botão de zerar). A troca
dos "por sessão" de combate por "por descanso" fica para decidir: muda poder de
muitas habilidades e pede uma passada classe a classe.

**7. Núcleo e Módulo.** Feito. 18 tópicos são Núcleo (Como Jogar, Criação,
Sistema Base, Raças, Classes, Poderes e Habilidades, Perícias, XP, Legados,
Combate, Tipos de Dano, Distâncias, Ferimentos, Descanso, Condições,
Equipamentos, Magia e Fluxo, Loja) e os outros 34 do jogador são Módulo. O selo
aparece no cabeçalho de cada tópico (no lugar de "Regra oficial"; "Comece por
aqui", "Catálogo oficial" e "Somente Mestre" ficam como estavam), na navegação
(uma etiqueta "Núcleo") e na legenda da página inicial do Livro. O PDF do livro
leva o mesmo selo e uma seção "Núcleo e módulos" em "Como usar este livro". A
lista mora em `data/regras/livro.ts` (`TOPICOS_DO_NUCLEO`), com teste.

A **folha de regras de mesa** está em `docs/mestre/Folha-de-Regras-de-Mesa.pdf`
(`tools/documentos-mundo/folha-regras-mesa.mjs`, gerada com `npm run
docs:mestre`): duas páginas com teste, turno, ataque, reações, magia, queda e
morte, descanso, Cansaço, limites de uso, 16 condições e a escada de DT. Graus,
DT por nível, qualidade do descanso e nomes de condição saem das mesmas fontes
da ficha e do livro.

**8. Condições em camadas.** Já existia: a aba Condições da ficha abre no filtro
"Em cena" (as de combate e corpo), com Lesões, Perdas e sequelas e Mente em
filtros à parte, e Aflições e Ambiente em abas próprias. Nada a fazer.

**9. Criação de personagem.** O número da auditoria (20 de 25 raças com duas
ou três camadas) estava inflado. Contando só o que o assistente da criação pede
de fato, 7 raças não pedem escolha nenhuma, 17 pedem uma e só o Divino pede
duas. O Espírito, o texto mais longo, já é raça especial que depende de
liberação do Mestre. Não mexi.

**10. Magias.** A aba Magias já filtra pelo Fluxo nativo e pelos círculos que o
personagem alcança, então ninguém garimpa as 355. Listas sugeridas por Fluxo
continuam uma boa ideia de conteúdo, mas são escrita nova e ficam para quando o
Pedro quiser.

**11. Moedas.** Não recomendo. Os Créditos Sombrios estão ligados ao cassino, às
trocas, ao Cofre, aos implantes, ao bot do Banqueiro e ao saldo das carteiras já
salvas no banco; tirar a moeda pede migração de saldo e mexe em economia que
está funcionando. O ganho (uma moeda a menos para explicar) não paga o risco.

## Como rodar de novo

Da raiz do projeto:

```bash
node --import ./tests/frontend/registerTsLoader.mjs docs/propostas/revisao-geral-2026-11/scripts/auditoria.mjs
```
