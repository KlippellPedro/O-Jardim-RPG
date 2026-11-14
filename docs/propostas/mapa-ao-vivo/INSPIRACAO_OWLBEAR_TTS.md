# O que ainda vale trazer do Owlbear Rodeo e do Tabletop Simulator

Pedido do Pedro em 2026-11-14. O Gemini listou 13 ideias (7 do Owlbear, 6 do
Tabletop Simulator). Esta página confere cada uma contra o que o Mapa ao vivo já
faz (código lido em 2026-11-14, não só os docs), separa o que já existe do que
falta, diz se vale a pena e monta o plano do que sobrou.

Regras que valem para tudo abaixo: o que é segredo continua sendo decidido no
servidor, nada de arte ou código de terceiros (as extensões do Owlbear são GPL-3.0
e a JB2A tem licença própria), tudo que o jogador recebe passa pelo recorte do
papel dele, e nada entra no bundle que o Mestre queira esconder.

> Existe uma segunda lista (Foundry, TaleSpire, Alchemy, Roll20) em
> `INSPIRACAO_VTTS_MODERNOS.md`, com a ordem geral que junta as duas. Onde as
> levas dos dois documentos diferem, vale a seção 3 do segundo.

## Andamento (2026-11-14)

Feito, testado e conferido no navegador com Mestre e uma jogadora (cliente
WebSocket de verdade) contra o banco descartável: **régua dobrada** (Shift +
clique), **ping com contexto** (Alt + Shift = perigo; Alt + Ctrl, só o Mestre =
olhem aqui), **dado visto pela mesa** (opt-in, ver 1.2), **desenho livre**
(tecla L: lápis, linha, seta, círculo, retângulo; some em 5 s a 1 min; Ctrl + Z;
rascunho só do Mestre; traço de jogador que começa na névoa fica entre quem
comanda; no máximo 8 por 5 s), **faixa de iniciativa em retratos**, **troca de
arte do token pelas teclas 1 a 9**, **modo limpo** (`/mapa?limpo=1`, só para
conta que não comanda) e a régua de quem sai da mesa que ficava parada. Tudo
sem migração.

**Segunda rodada (2026-11-14), migração 80** (`mapa_campanha.encontros`),
conferida no navegador com o Mestre:
- **Cópias de token** (a "fonte" em versão simples): Ctrl + D ou o menu do
  botão direito ("Duplicar", "Fazer vários..." de 2 a 20). O servidor
  (`routers/mapa_encontros.py`, `core/encontros.py`) põe as cópias em casas livres
  em volta, com nome numerado sem repetir nenhum nome da cena nem da
  iniciativa, e a criatura da Sessão é copiada junto, com a Vida cheia. Personagem
  de jogador não se copia. Não há ainda o token-fonte que gera cópia ao arrastar.
- **Encontros salvos**: painel Encontros no menu Mesa. Guarda os inimigos da
  cena (ou os tokens pedidos) como moldes com a posição relativa ao centro do
  grupo (token + criatura da Sessão), solta o grupo no meio da tela em qualquer
  cena, à vista ou **escondido** (emboscada), revela todos os escondidos de uma
  vez e limpa os inimigos da cena (com opção de tirar também da iniciativa).
  Recipiente de loot e personagem de jogador ficam de fora do molde.
- **Cobertura total pela régua** (C2, a metade que as paredes decidem): a
  régua reta entre dois tokens pergunta ao servidor (mensagem `linha`, no máximo
  8 por segundo) se há parede ou porta fechada no caminho; janela e porta aberta
  deixam passar. A resposta é só sim ou não, e só vem a quem enxerga os dois
  tokens. Cobertura parcial e superior seguem fora: o servidor não tem como
  saber o que é "obstáculo baixo" numa imagem.

**Terceira rodada (2026-11-14): ponte da ficha com o mapa (O7), sem servidor
nem migração.** Com a ficha aberta dentro do mapa (`?embutida=1`), cada magia
ganha "Mirar no mapa". A ficha manda um `postMessage` (mesma origem) e o mapa abre
a ferramenta de magia na forma, na cor do Fluxo e com o alcance e a área da
magia: anel de alcance em volta do token do personagem, círculo com o raio da
magia (o centro fica dentro do anel), cone e linha que saem do conjurador com o
tamanho dela, impacto limitado ao alcance. Magia pessoal avisa que não há o que
mirar; magia universal pega o Fluxo escolhido na barra. As contas moram em
`motor/miraDaMagia.ts`, sem tocar no conteúdo: leem o texto padrão de `alcance`
e `alvo` ("Longo (25 m); área de 9 m", "Uma linha de até 3 m") e um teste lê as
355 magias e falha se uma delas sair do padrão. É só o efeito visual: custo,
teste e dano continuam no Conjurar da ficha.
**Para você decidir/escrever:** a ponte trata "área de N m" como o **raio** do
círculo (a mesma medida da ferramenta de magia). O Livro não diz se a área é
raio ou diâmetro; se for diâmetro, é uma linha no `miraDaMagia.ts` e uma frase
no Livro. Também não há campo de forma no catálogo: círculo é o padrão para
"Área", cone e linha só aparecem onde o texto os escreve.

**Quarta rodada (2026-11-14), migração 81** (`mapa_tokens.formas`,
`forma_ativa` e `fonte`): estados do token e token-fonte.
- **Formas** (os "estados" do Tabletop, T2), `core/formas_token.py` e
  `routers/mapa_formas.py`: o token de criatura, NPC ou objeto veste até 8
  imagens do Acervo, e a 1 é a imagem de base. As teclas 1 a 9 com o token
  escolhido trocam a forma (o token de personagem de jogador segue com as artes
  da ficha, na mesma tecla). A aba "Formas" do menu do token lista, renomeia,
  tira e adiciona (o botão abre o Acervo e o clique numa imagem vira a forma, com
  Esc para cancelar). A forma ativa troca o `imagem_id` do token na leitura
  (`aplicar_forma`), então a versão da imagem, a rota da imagem e as regras de
  quem vê a identidade seguem as de sempre; o jogador nunca recebe a lista de
  formas nem os ids das imagens. Só o Mestre mexe.
- **Fonte** (a "fonte de tokens" do T3), `routers/mapa_encontros.py`: o Mestre
  liga o token como fonte (limite de cópias opcional, "Recarregar"); arrastar a
  fonte e soltar deixa uma cópia numerada onde caiu (a criatura da Sessão entra
  na iniciativa com a Vida cheia) e a fonte volta para o lugar; Shift apertado
  move a fonte de verdade. Um "+" dourado marca as fontes. A cópia nasce com a
  imagem que a fonte mostrava na hora (forma ativa vira a base dela) e sem
  formas nem fonte própria.
- **Gatilhos de forma** (ligar uma forma a uma condição ou à faixa de Vida) ficaram
  de fora de propósito: mostrar "ferido" sozinho entregaria a Vida do monstro a
  quem só vê o degrau parcial, então pede uma decisão sua.

**Quinta rodada (2026-11-14), migração 82** (`mapa_tokens.elevacao` e
`nota_jogador`). Tudo abaixo tem teste e a mesma regra de segredo: o servidor
decide, e o jogador só recebe o que o Mestre deixou à vista.
- **Imagem na mesa** (`core/imagens_mostradas.py`, `routers/mapa_imagens.py`): o
  botão Mostrar do Acervo libera a imagem por 8 horas para a campanha (ou para
  quem o Mestre escolher, no máximo 12 por vez) e manda a todos o aviso `imagem`.
  A rota do pedaço do Acervo confere essa lista antes de negar.
- **Cena narrativa** (A3, `mesa.narrativa`): a arte vira o fundo em tela cheia,
  sem grade, com até 6 falantes embaixo e o Mestre falando como eles; o mapa volta
  como estava. Só entram os tokens que o jogador enxerga.
- **Zonas de terreno** (B1, C2 completo, B2 parte do telhado,
  `core/zonas.py`, `routers/mapa_zonas.py`, em `estrutura.zonas`, sem migração): um
  retângulo com até quatro funções. Cobertura parcial (+2) ou superior (+5), que a
  régua diz entre dois tokens sem nunca entregar onde fica; gatilho escondido (texto
  para quem pisou, texto para a mesa e aviso ao Mestre com o cartão de uma das 6
  armadilhas do Livro; dano e condição nunca saem sozinhos; "uma vez" com rearmar);
  terreno à vista (10 marcas, cada uma com uma "ideia de mesa" que não é regra) e
  telhado (cobre o interior até alguém do grupo entrar; o jogador recebe só o
  retângulo, sem o nome). As marcas de terreno persistentes que o plano previa são
  as próprias zonas com terreno, que ficam até o Mestre apagar.
- **Contorno de condição e dano contínuo** (B3, `motor/condicoesVisuais.ts`,
  `motor/contornoCondicao.ts`): 8 famílias de contorno animado (fogo, sangue,
  veneno, raio, gelo, medo, atordoado, bênção), no máximo duas por token e parado
  para quem pediu menos movimento. Na virada do turno o Mestre recebe o lembrete
  com o dano que o Livro dá (lido do texto de Queimando, Envenenado e Sangramento;
  um teste varre o catálogo para nenhuma escapar) e o botão "Rolar e aplicar", que
  rola em público e tira da Vida do participante.
- **Efeitos de magia por Fluxo** (O5, `motor/estiloDeMagia.ts`): cada um dos 11
  Fluxos ganhou um movimento próprio por cima da cor. Como o dano da magia segue o
  Fluxo (Livro, Magia e Fluxo), isto resolve "efeito por tipo de dano" sem protocolo
  novo. Subir efeito animado próprio continua fora.
- **Altura e queda** (B2, parte da altura): campo em metros no menu do token (só
  o Mestre muda, todos veem o selo), a régua soma o desnível em 3D e "Deixar cair"
  mostra o dano de queda do Livro com o botão de rolar. Limites -50 a 300 m,
  travados com o servidor por teste.
- **Lembrete do jogador no token** (D2): 240 caracteres, só o dono e o Mestre
  recebem. Resolvi como coluna própria no token, não nas notas da ficha, porque
  aquelas são uma lista estruturada com autosave próprio.
- **Resultado do dado sobre o token** (resultado flutuante): o número sobe do
  token de quem mostrou o dado, com CRÍTICO! e FALHA! só no 20 e no 1 naturais. O
  servidor manda o `token_id` junto do dado público. Nunca diz se passou da Defesa
  ou da DT.
- **Efeitos sonoros do Mestre** (A1, `motor/efeitosSonoros.ts`): 12 sons
  sintetizados no navegador (WebAudio), sem arquivo, tocados na mesa toda por uma
  mensagem `sfx` que só o Mestre manda (lista fixa travada com o servidor, no máximo
  6 a cada 5 s).
- **Quadro de investigação** (C3, `core/quadro.py`, `routers/mapa_quadro.py`, em
  `mesa.quadro`): mural de cortiça com cartas e barbantes, ao vivo. Cada jogador
  pode ter 12 cartas, qualquer um move e liga, só o autor e o Mestre editam e
  apagam, e o Mestre guarda cartas escondidas que o servidor nem manda aos jogadores
  (os barbantes que chegam nelas somem junto).

- **Desenho fixo do Mestre** (`core/desenhos_fixos.py`, `routers/mapa_desenhos.py`,
  em `estrutura.desenhos`): a duração "Fixo" da ferramenta Desenhar guarda o traço
  na cena até o Mestre apagar (Ctrl + Z desfaz o último, "Apagar os fixos" limpa a
  cena, no máximo 80 por cena). Não passa pelo tempo real: o servidor guarda e a
  cena já traz os desenhos. O jogador só recebe os que o Mestre deixou públicos, sem
  o campo `publico`.

**O que ficou de fora desta rodada, e por quê:**
- **Gatilhos de forma do token** e **ressonância entre Fluxos** (C1): seguem
  pedindo decisão de regra sua, como antes.
- **Outliner** e **zonas por jogador**: adiados de propósito, como antes.
- Telhado feito como zona (retângulo com telhas desenhadas), não como imagem do
  Acervo: não depende de arte de ninguém, mas não acompanha a forma de um
  telhado irregular.

## 1. Conferência item por item

| # | Ideia do Gemini | Já temos? | O que falta | Vale? |
| --- | --- | --- | --- | --- |
| O1 | Paredes, portas, janelas, luz presa ao token, visão | **Sim, e vai além.** Paredes que barram, portas que o jogador abre, janelas, luzes com tremor, visão por personagem calculada no servidor com memória do explorado, dia e noite, portais entre cenas (levas 3 a 5) | nada | feito |
| O2 | Barras e bolhas no token | **Sim.** Vida, Mana, Estamina e Sanidade no token, cada dono escolhe quem vê, número com + ou - no campo, condições e aflições no token com carta | nada | feito |
| O3 | Régua dobrada e alcance de área | **Em parte.** Régua reta com metros e casas, medida no arrasto, auras presas ao token, magia em círculo, cone, linha e impacto | régua que dobra (pontos de passagem) | sim, pequeno |
| O4 | Outliner (árvore de camadas) | **Em parte.** 5 camadas com ver e esconder por camada, camada ativa, trancar, esconder e ordem para cada mapa colocado, busca de qualquer token na Central (Ctrl+K) | lista de todos os objetos da cena, um a um | adiar |
| O5 | Efeitos de magia animados | **Em parte.** Efeitos nossos (`motor/magia.ts`) com projétil, nas cores dos 11 Fluxos, passam pelo tempo real | efeitos por tipo de dano (fogo, gelo, raio, cura...) e subir efeito próprio | sim, a parte do tipo de dano |
| O6 | Theatre e handouts | **Em parte.** Documentos do Mestre na mesa (para todos ou um jogador), falas de NPC com retrato, pausa com recado | mostrar uma imagem avulsa do Acervo (retrato, ilustração) | sim |
| O7 | Ponte entre a ficha e o canvas | **Não.** A ficha abre embutida no painel do mapa, mas rolar um ataque ou lançar uma magia na ficha não mexe no mapa | clicar na magia mira no mapa e dispara o efeito | **sim, é a melhor do lote** |
| T1 | Zonas de ocultação por jogador | **Em parte.** Token oculto ou desconhecido por degrau, nota secreta, névoa e visão por paredes já individual | área do mapa escondida só de alguns jogadores | adiar |
| T2 | Estados do mesmo objeto (teclas 1, 2, 3) | **Em parte.** Até 8 artes por personagem (uma foto da ficha e extras), troca por clique em todas as cenas; condições no token; porta aberta e fechada | troca por tecla, troca rápida na barra do token, estados para criaturas e NPCs, troca ligada a condição ou Vida | sim |
| T3 | Sacos infinitos e de sorteio | **Em parte.** Baús, caixotes e bolsas com chance por item e abrir rola no servidor (migração 77) | fonte que gera cópias de token ao arrastar, e saco que sorteia criatura | sim, a fonte |
| T4 | Cena montada com um clique | **Em parte.** Cenas preparadas com troca rápida, "trazer participantes", peças prontas no construtor | encontro salvo (bando com posições) que se solta de uma vez, e "limpar inimigos" | sim |
| T5 | Desenho livre, setas e ping | **Ping sim** (tecla P e Alt + clique). **Desenho livre não**: está na lista da fase 4 desde 2026-11-02 e nunca foi feito. Só existe texto no mapa | traço, seta, forma, com tempo de sumir | **sim, a mais pedida em mesa remota** |
| T6 | Dados 3D com física e histórico | **Em parte.** Dado 3D com física (Three.js) e histórico (Rolagens) já existem. O dado só cai na tela de **quem rolou** | os outros verem o dado cair, cor por jogador | sim, pequeno |

Resumo: 2 ideias já estão feitas e superadas (O1, O2), 9 têm uma parte feita e uma
lacuna real, e 2 não existiam (O7, T5). Nada do que o Gemini descreveu como "super
novo" é impossível aqui. O ponto forte do Jardim, que o Owlbear não tem, é o
sistema ser nosso, e por isso a ponte ficha para mapa vale mais que tudo.

## 2. O que fazer, com o desenho de cada peça

Tamanho: P (um dia de conversa), M (alguns dias), G (uma semana ou mais). Todas
seguem o molde que já funciona: regra pura em `plataforma/core/`, rota fina,
mensagem no tempo real conferida pelo servidor, desenho no `motor/`.

### Leva 1: pequenas e de muito efeito na mesa remota

**1.1 Régua dobrada (P).** Hoje `pontosRegua` já é uma lista de pontos e a régua
remota já recebe uma lista, então falta só a interação: clique durante a régua
fixa um ponto de passagem, Esc ou duplo clique termina, e o rótulo soma os
trechos (casas e metros). Conferir o teto de pontos que o servidor aceita na
mensagem `regua` e, se faltar, pôr um (ex. 12). Depois: a régua poder virar o
caminho de um token (arrastar o token ao longo dela).

**1.2 Dado visto por todos (P). FEITO em 2026-11-14**, com uma correção do
desenho: o log de rolagens da mesa só mostra ao jogador as rolagens dele (o
Mestre vê tudo), e só o 20 e o 1 natural viram destaque para todos. Então ver o
dado dos outros não podia ser automático. Ficou como escolha de quem rola: na
bandeja de dados do mapa, a chave "A mesa vê o dado" (`publica` no pedido de
rolagem). O jogador começa mostrando, o Mestre começa rolando só para si. O
servidor só publica `dado_mesa` com a sessão aberta e leva só os dados, o bônus
e o total (`core/dados.py`, `resumo_publico`: nada de DT nem de grau). Na tela
dos outros o dado cai sem escurecer, sem pegar clique e sem capturar tecla,
some sozinho 3,6 s depois de pousar, e nunca passa por cima do resultado de
quem está rolando. Fica de fora: cor do dado por jogador.

**1.3 Desenho livre e setas (M).** Ferramenta nova (sugestão: tecla L), em todas as
telas, com lápis, linha, seta, círculo e retângulo, na cor da pessoa (a mesma da
régua e do ping).
- **Passageiro por padrão**: some em 10 s depois de soltar, no estilo do ping.
  Vai pelo tempo real (mensagem `traco`, no molde da `magia`: limite de envios,
  `normalizar_traco` no servidor, nada gravado).
- **Fixo** só para o Mestre: fica guardado em `mapa_cenas.estrutura.desenhos` (sem
  migração, como as portas), com teto de traços e de pontos. "Só o Mestre vê"
  funciona como rascunho tático e nunca vai ao jogador, na mesma regra da nota
  secreta.
- **Névoa**: o servidor não entrega ao jogador o traço cujo ponto de partida está
  coberto para ele, e descarta traço de jogador que começa em área que ele não vê.
- Desfazer o último (Ctrl+Z) e "limpar os meus". O motor do pincel da névoa
  (`nevoaGeometria.ts`: traço leve e liso) serve de base.
- Testes: segredo do traço fixo, teto, névoa, limite de envios.

### Leva 2: o Mestre montando a mesa

**2.1 Estados do token (M).** Já existem as artes por personagem; falta usar
isso como o "States" do Tabletop.
- Token selecionado + teclas 1 a 8 troca a arte; a barra do token ganha as
  miniaturas das artes para trocar com um clique.
- Criaturas e NPCs ganham artes próprias do token: coluna JSON pequena em
  `mapa_tokens` (migração), no máximo 8, com nome ("Ferido", "Forma de lobo").
- **Gatilhos opcionais**, escolhidos pelo dono ou Mestre: ligar um estado a uma
  condição ("Transformado" põe a forma) ou a uma faixa de Vida **que a pessoa
  vê** (o jogador nunca descobre a Vida exata do monstro, só o degrau que a
  Sessão já entrega). Bom para Animália, Espírito, Vampiro e druidas.
- O desconhecido continua recebendo o aro simples, sem trocar de arte.

**2.2 Encontros salvos e limpar a cena (M).** No molde das peças prontas do
construtor (`mapa_campanha.prontas`, migração 65).
- "Salvar encontro" guarda os tokens escolhidos: criatura do bestiário, posições
  relativas ao centro, escondido ou não, luz, aura e recipiente. Fica em
  `mapa_campanha.encontros` (migração; teto por campanha, teto de tokens por
  encontro).
- "Soltar encontro" num ponto cria os participantes da Sessão e os tokens, pelo
  mesmo caminho do "Trazer participantes" e do "Inimigo na hora", entrando na
  iniciativa. Ideal para emboscada: solta escondido e um botão revela todos de
  uma vez, com a animação de entrada que já existe.
- "Limpar os inimigos da cena", com confirmação e desfazer: tira os tokens de
  criatura e NPC (nunca de jogador). Reaproveita a saída animada.
- Os ids das criaturas vêm do catálogo (cuidado com a regra do AGENTS sobre mudar
  id de criatura: aqui o encontro guarda o id, então a migração 50 já cobre).

**2.3 Fonte de tokens (M).** Um token marcado como fonte (ex. "Esqueletos"):
arrastar a partir dele cria uma cópia numerada (Esqueleto 1, 2, 3) em vez de
mover. Serve para bando do Mestre e para invocações dos jogadores (necromante,
druida, invocador).
- O limite de cópias é livre (campo do Mestre), porque o limite de invocações de
  cada classe é regra e não decidimos aqui. Para jogador, a cópia nasce como
  Aliado editável, como a compra de monstro já faz.
- Variante opcional: **saco de sorteio de criaturas**, o `LootDoRecipiente` com
  uma lista de criaturas e chance em vez de itens. Só se a fonte pegar.

### Leva 3: a ficha conversando com o mapa

**3.1 Ficha para o mapa (G, a maior e a melhor).** Hoje a ficha embutida
(`/ficha/{id}?embutida=1`) roda em iframe dentro do painel, e magia e ataque só
rolam o dado. O botão novo, "Mirar no mapa", dispara a ferramenta de magia que já
existe.
- **Dados que já temos**: as 355 magias de `data/ficha/magias.json` trazem
  `alcance` em texto padronizado ("Longo (25 m); área de 9 m"), `alvo` ("Área",
  "Uma criatura"), `fluxo` (a cor), `perfil` e `dano`. Não há campo de forma
  (círculo, cone, linha), então o padrão é círculo e quem mira troca.
- **Extração por script, não no olho**: um script lê `alcance` e `alvo` e gera um
  arquivo derivado (como `sync:modificacoes`), com teste que falha se algum
  texto fugir do padrão. Nada vira campo editável novo, de acordo com o AGENTS.
  O resultado (quantas têm área, quantas só alcance) vai para você revisar antes.
- **Como a ficha fala com o mapa**: `postMessage` do iframe para a página, com
  a origem conferida. O mapa abre a mira na cor do Fluxo, com o raio e o alcance
  da magia, saindo do token do personagem.
- **O que não muda**: o dano e o custo continuam como estão (Modo Mesa); o efeito
  é só visual e só vai ao tempo real se a mesa estiver aberta (mesma regra da
  magia de hoje).
- **Resultado flutuante**: depois da rolagem de ataque, um texto curto sobe do
  token ("18, acerta") e some. Só mostra o que a pessoa já vê nas Rolagens.
- Poderes e ataques de arma entram depois, com o mesmo botão.

**3.2 Mostrar imagem na mesa (M).** Imagem do Acervo para todos ou para um
jogador, com fade e botão de fechar, no estilo do Theatre!.
- O jogador só baixa ladrilho liberado, então a imagem mostrada ganha uma
  liberação curta (poucas horas, em memória, como a lista da névoa) conferida pelo
  acervo, só para quem recebeu. Vai pelo tempo real e não fica gravada, como os
  documentos.
- Pedir à pessoa que mostra que a imagem tenha licença anotada (o Acervo já tem
  o campo).

### Leva 4: visual

**4.1 Efeitos de magia por tipo de dano (M).** Hoje são 4 formas na cor do
Fluxo. Acrescentar um catálogo de "estilos": fogo (explosão e brasas), gelo
(cristais), raio (zigue-zague), ácido, necrótico, radiante, psíquico e cura
(partículas que sobem), todos em shader e partículas nossos, no mesmo palco da
magia. O servidor só passa a aceitar `estilo` em `normalizar_magia`. Com a ponte
da leva 3, o estilo vem da magia sozinho (`dano`).
- Subir um efeito animado próprio (WebM ou PNG animado) no Acervo **não entra
  agora**: o acervo guarda imagem em ladrilhos, vídeo é outro tipo e pesaria no
  disco e na RAM da Discloud (conta em 92% dos 4 GB). Fica anotado como ideia.

## 3. O que ficou de fora de propósito

- **Outliner completo (O4).** Com as camadas, o menu de cada mapa colocado e a
  busca da Central (Ctrl+K) já se acha e se tranca tudo. Se uma cena ficar com
  dezenas de peças e isso doer na prática, vira uma lista dentro da Central.
- **Zonas de ocultação por jogador (T1).** O uso do Tabletop (mão de cartas) não
  existe no Jardim; emboscada já é token oculto; separar o grupo já é visão por
  paredes ou cena e portal. Fazer de verdade obrigaria ladrilhos individuais
  mesmo na névoa manual, com risco de cache e de segredo. Só se a mesa pedir.
- **Efeito animado enviado pelo Mestre (parte de O5).** Ver o fim da leva 4.

## 4. Ordem sugerida e por quê

1. **Leva 1** (régua dobrada, dado visto por todos, desenho livre): três peças
   pequenas que mudam como a mesa remota "sente" o mapa, e quase nada de servidor.
2. **Leva 2** (estados, encontros, fonte): é o que o Mestre mais usa antes e
   durante a sessão.
3. **Leva 3** (ficha para o mapa, mostrar imagem): a maior, e a que nenhum VTT
   genérico tem. Começa pela medição das magias (um script, sem tocar no
   conteúdo) para decidir o tamanho real.
4. **Leva 4** (estilos de efeito): fica melhor depois da ponte, quando o estilo
   vem da magia.

Cada leva fecha com testes, entrada no mural de novidades em linguagem de
jogador e commit só com pedido, como as anteriores.

## 5. Decisões para o Pedro

1. **Desenho**: some em 10 s por padrão e só o Mestre fixa? (recomendado)
2. **Dado dos outros**: ligado por padrão, com opção por aparelho, e rolagem
   secreta nunca anima? (recomendado)
3. **Ponte ficha para mapa**: pode gerar o arquivo derivado das áreas por script
   e te mostrar o resultado antes de ligar o botão? (recomendado)
4. **Fonte de tokens**: limite de cópias livre, sem amarrar à regra de invocação
   de cada classe? (recomendado)
5. **Ordem**: segue a das levas acima, ou a ponte da ficha vai primeiro?

## Referências

- Plano geral: `PLANO.md`; construtor e extensões: `CONSTRUTOR_E_EXTENSOES.md`;
  tempo real: `TEMPO_REAL.md`.
- Extensões do Owlbear como referência visual apenas: `owlbear-rodeo/weather` e
  `owlbear-rodeo/dynamic-fog` (GPL-3.0).
