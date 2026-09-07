# Kits de combate — os cinco personagens jogáveis

**Natureza:** pré-produção; proposta de design pro jogo 2D, não lore
canônica nem stats de mesa. Ver
[`PLANEJAMENTO_INICIAL.md`](PLANEJAMENTO_INICIAL.md) pro contexto completo
(elenco, região, decisões de escopo).

Cada kit segue o molde já definido no plano: movimento/esquiva/ataque básico,
duas habilidades de classe, uma manifestação do Fluxo, uma técnica especial,
uma passiva racial, arma e acessórios. Nenhum desses cinco precisa bater
número por número com uma ficha de mesa (manifestação estilizada, já
decidido) — mas onde deu pra ancorar num Fluxo, raça ou poder real do
sistema, eu ancorei, em vez de inventar do zero. Está marcado onde é
adaptação livre.

Todos os cinco usam o esqueleto/rig compartilhado descrito no plano; nenhuma
habilidade abaixo pede uma animação fora do conjunto já previsto (idle,
correr, pular, esquivar, golpe leve, golpe forte, dano, morte) além de um
punhado de golpes especiais próprios por personagem.

---

## Ayato — dano corpo a corpo

Humano, katana, sem classe de mesa específica (nem Guerreiro nem Lutador
bateram com "dano bruto de katana" — arquétipo original de jogo, não
adaptação de uma classe existente). Fluxo: **Inconstância** (Vórtice/Ignis,
laranja).

Usa um recurso próprio, o **Fio da Lâmina**: sobe a cada acerto, decai com o
tempo parado, e alimenta a técnica especial.

- **Ataque básico:** combo de três cortes de katana, o terceiro mais lento e
  mais forte.
- **Esquiva/movimento:** passo curto de recuo, sem invencibilidade longa —
  Ayato joga no risco, não na fuga.
- **Habilidade de classe 1 — Investida Cortante:** avança e golpeia, fecha
  distância rápido.
- **Habilidade de classe 2 — Golpe Ascendente:** lança o alvo pro alto e
  permite continuar o combo no ar.
- **Manifestação do Fluxo — Lâmina Inconstante:** a katana pega fogo por
  alguns segundos; golpes nesse período aplicam dano contínuo (partícula
  laranja, paleta de Inconstância).
- **Técnica especial — Corte que Não Erra:** consome todo o Fio da Lâmina
  acumulado num golpe final; quanto mais acerto guardado, mais dano.
- **Passiva racial — Versatilidade** (adaptação de "Versatilidade" do
  Humano): pode cancelar a recuperação de um golpe leve pra emendar direto
  no próximo, dando mais fluidez de combo do que os outros quatro.
- **Arma:** katana. Sem escudo, sem armadura pesada.

## Galadriel — velocidade e dano à distância

Elfa, katana e shurikens, classe **Espadachim** (postura e combo — "trocar
de postura no meio da luta e encadear golpes que só fazem sentido em
sequência"), Linhagem **Sombras**. Fluxo: **Origem** (Gênese/Aethel, rosa —
o mesmo Fluxo que a raça Elfo já carrega por lore, `origem_natural` aponta
Elfo pra Nadalon/Gênese).

- **Ataque básico:** dois cortes rápidos de katana.
- **Esquiva/movimento — Passo Umbral** (da Linhagem Sombras real): dash
  curto entre sombras, reposiciona em vez de só afastar.
- **Habilidade de classe 1 — Golpe em W** (adaptação do poder real do
  Espadachim): golpe carregado, dano maior se soltar no tempo certo.
- **Habilidade de classe 2 — Corte à Distância** (poder real do
  Espadachim, reaproveitado pro shuriken): arremessa um shuriken, opção de
  poke à distância sem trocar de arma.
- **Manifestação do Fluxo — Corte que Abre Caminho:** o golpe abre uma
  fresta de luz rosada que expõe um ponto fraco no alvo por um instante
  (janela de crítico), ecoando a descrição de Origem como o Fluxo que "abre
  espaço pra que algo nasça".
- **Técnica especial — Sequência sem Falha:** encadeia as duas habilidades
  de classe e o ataque básico num combo maior, mas errar qualquer golpe no
  meio cancela tudo (referência direta à descrição do Espadachim: "errar um
  estraga os outros").
- **Passiva racial — Sombra Viva** (adaptação da Linhagem Sombras): enxerga
  bem no escuro e ganha vantagem/crítico ao atacar vindo da penumbra.
- **Arma:** katana e shurikens.

## Adoxios — magia elemental (elemento escolhível)

Humano, classe **Canalizador** ("Fluxo puro, direto, sem intermediário
nenhum. É a forma mais simples de conjurar e a mais difícil de fazer bem").
Sem arma: canaliza com as próprias mãos.

**O Fluxo dele é a escolha do jogador**, não fixo — na criação/seleção,
escolhe 1 dos 11 Fluxos de `FLUXO_TEMAS`. A cor e a "família" de efeito já
vêm prontas dos dados; o trabalho de arte é desenhar a FORMA de cada golpe
de um jeito recolorível. Exemplos de leitura por elemento escolhido:
Inconstância = explosão; Vitalidade = pulso que cura área aliada; Vazio =
drena e enfraquece; Tempo = atrasa o próximo ataque do alvo.

Recomendado pro vertical slice: implementar só 2 a 4 Fluxos primeiro (ver
risco de escopo no plano), não os 11 de uma vez.

- **Ataque básico:** pulso de energia do elemento escolhido, curto alcance.
- **Esquiva/movimento:** passo defensivo comum (sem gimmick próprio — a
  identidade dele é toda na magia, não no deslocamento).
- **Habilidade de classe 1 — Pulso Nativo** (poder real do Canalizador):
  carrega o próximo golpe elemental, aumentando o dano dele.
- **Habilidade de classe 2 — Contrafluxo** (poder real do Canalizador):
  defesa mágica breve que anula um projétil inimigo.
- **Manifestação do Fluxo:** é o próprio kit elemental acima — não é uma
  habilidade a mais, é o que diferencia um Adoxios "de fogo" de um "do
  vazio".
- **Técnica especial — Fluxo sem Filtro** (nome direto da descrição real da
  classe): descarrega tudo numa explosão de área do elemento escolhido, mas
  fica vulnerável por um instante depois — alto risco, "difícil de fazer
  bem".
- **Passiva racial — Adaptável** (adaptação de "Versatilidade"/
  "Adaptabilidade" do Humano): pode trocar de elemento (Fluxo) num
  checkpoint fora de combate, em vez de ficar travado nele a campanha
  inteira.
- **Arma/acessórios:** nenhuma arma; um acessório visual simples (marca ou
  runa) que muda de cor conforme o elemento ativo.

## Netuno — tanque

Sereia/Tritão, tridente e escudo, classe **Guerreiro** ("Fica na frente
porque alguém tem que ficar. Aguenta pancada, puxa o inimigo pra si").
Fluxo: **Físico** (Baluarte/Moros, marrom — Baluarte significa
literalmente fortificação, encaixe direto com tanque).

- **Ataque básico:** golpe de tridente, combo curto e pesado.
- **Esquiva/movimento:** sem dash — em vez disso, postura de bloqueio
  segurando o botão de esquiva, reduz muito o dano recebido mas não some do
  lugar.
- **Habilidade de classe 1 — Alvo do Batalhão** (poder real do Guerreiro,
  adaptado de "aliados causam dano extra no alvo" pra solo): marca um
  inimigo; Netuno causa dano extra nele e ele fica mais propenso a mirar em
  Netuno por alguns segundos.
- **Habilidade de classe 2 — Escudo do Arsenal** (poder real do Guerreiro):
  levanta o escudo numa postura curta que reduz drasticamente o dano
  recebido.
- **Manifestação do Fluxo — Postura de Baluarte:** crava o tridente no
  chão, cria uma zona pequena que empurra pra trás inimigos que entrarem e
  reduz o dano de área nela.
- **Técnica especial — Canto das Profundezas** (adaptação de "Canto
  Fascinante" da Sereia, escalado pra ultimate): brado que força todo
  inimigo próximo a atacar Netuno por alguns segundos — taunt em área.
- **Passiva racial — Presença que Atrai** (versão pequena e sempre ativa do
  mesmo Canto Fascinante): inimigos fracos próximos tendem a preferir mirar
  em Netuno mesmo sem ele usar nada.
- **Arma:** tridente e escudo.

## Blanc — suporte etéreo

Espírito, estágio **Primordial**, a única Cor branca que existe (não
pertence a nenhum dos 11 Fluxos). Sem classe: Blanc não é um combatente
treinado, é a própria manifestação de um Espírito no ápice da maturação —
por isso o kit dele vem inteiro da raça, não de uma classe.

- **Ataque básico:** toque espectral de curto alcance, dano baixo.
- **Esquiva/movimento — Passagem Etérea** (poder real da raça Espírito):
  atravessa até 1,5 m de parede sólida. Serve pra explorar (segredos atrás
  de paredes) e como esquiva de emergência em combate (atravessar um
  ataque que acertaria em cheio).
- **Habilidade 1 — Toque Que Esvazia:** drena um pouco da energia do
  inimigo, enfraquecendo a próxima habilidade especial dele.
- **Habilidade 2 — Presença Alheia:** fica parcialmente intangível por um
  instante, ignorando o próximo golpe físico.
- **Manifestação do Fluxo — Cor Que Falta:** por não pertencer a nenhum dos
  11 Fluxos, Blanc pode neutralizar por um instante um efeito elemental
  próximo (um pequeno dispel), útil contra os monstros de Întuneric.
- **Técnica especial — Estágio Primordial** (referência direta à
  "Maturação Espiritual" real, que soma Mana e desperta mais características
  no estágio Primordial): por alguns segundos, Passagem Etérea fica sem
  custo e as outras três habilidades ficam mais fortes.
- **Passiva racial — Sem Corpo** (da fisiologia real do Espírito: não
  respira, enxerga no escuro, não veste armadura): imune a armadilhas
  físicas e veneno comuns, enxerga em áreas escuras — e por isso tem menos
  vida/defesa física que os outros quatro.
- **Arma/acessórios:** nenhum. Energia espectral própria; não veste
  armadura convencional.

---

## Notas de balanceamento pra Fase 1

Os cinco cobrem papéis bem separados: Ayato (dano bruto, sem defesa),
Galadriel (velocidade/precisão, punida por erro), Adoxios (dano em área,
frágil, mais lento), Netuno (tanque, sem mobilidade), Blanc (utilidade e
exploração, dano baixo). Pra prova de diversão da Fase 1, um personagem só
(sugestão: Ayato, o kit mais simples de testar — combo + um recurso) já
valida se o combate base é bom antes de produzir os outros quatro.
