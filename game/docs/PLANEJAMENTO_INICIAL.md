# Planejamento inicial — jogo 2D de O Jardim RPG

**Estado:** pré-produção concluída; Fase 1 (prova de diversão) jogada pela
primeira vez em 01/09/2026 e aprovada na reação inicial ("ta bem legal,
fiquei animado com o jogo") — a ideia central do jogo está validada no
nível mais básico. Ainda cabe ajuste fino de números por sensação, e o
resto do plano (Fase 2 em diante) continua por fazer.
**Data do levantamento:** 30 de agosto de 2026, com decisões adicionadas em
01 de setembro de 2026  
**Natureza:** pré-produção; as propostas criativas abaixo não são lore canônica

## Objetivo

Investigar um jogo 2D de ação e exploração, inspirado pela sensação de um
metroidvania como *Hollow Knight*, mas com identidade própria de O Jardim. O
principal diferencial seria poder usar personagens criados na plataforma do
RPG sem reduzir o resultado a um jogo simples, genérico ou visualmente sem
personalidade.

O objetivo inicial não é reproduzir a escala de *Hollow Knight*. É construir um
trecho curto com movimento, combate, arte, áudio e integração suficientes para
provar que a proposta é divertida e tem qualidade.

## Contexto técnico já existente

O repositório não começaria do zero. No levantamento desta data, ele já possuía:

- frontend React/TypeScript;
- API FastAPI e PostgreSQL;
- contas, campanhas, personagens e seleção de personagem ativo;
- ficha flexível em JSON, com concorrência otimista por versão;
- carteira e inventário centralizados fora do JSON da ficha;
- classes, raças, perícias, Legados, equipamentos e magia em `data/`;
- sessão de mesa, iniciativa, participantes e avisos em tempo real;
- conteúdo oficial separado de publicações editoriais globais e por campanha.

O catálogo observado possuía 28 classes, 25 entradas de raça e 11 Fluxos. A
documentação de dados registrava 330 magias, além de rituais, selos e
encantamentos. Esses números são um retrato da data do levantamento e precisam
ser recalculados quando o projeto for retomado.

**Reconferido em 01/09/2026:** classes (28), raças (25) e Fluxos (11)
continuam batendo. Magias subiram de 330 pra **352** (`data/ficha/magias.json`
tem hoje 352 magias, 35 rituais, 33 selos e 33 encantamentos) — alguém
adicionou magias novas desde 30/08, sem mexer no total de classes/raças/
Fluxos.

Consequência: a plataforma atual pode ser a fonte da identidade do personagem,
mas o jogo precisa de uma camada própria de adaptação. Tentar executar
automaticamente todo texto narrativo da ficha produziria regras ambíguas e um
escopo inviável.

## Direção de jogo recomendada

Um jogo solo de ação e exploração lateral, com estrutura de
**metroidvania de expedições**:

- um pequeno hub no Jardim;
- portais ou manifestações que levam a regiões associadas às Árvores;
- mapas artesanais com caminhos interligados, atalhos e segredos;
- combate responsivo, chefes e habilidades de travessia;
- capítulos ou expedições que permitam acrescentar regiões gradualmente;
- personagens diferentes compartilhando a mesma campanha de jogo.

### Gancho criativo provisório

Uma manifestação instável do Jardim poderia gerar “ecos” dos personagens e
levá-los a regiões fraturadas das Árvores. Isso explicaria personagens de
campanhas, níveis e origens diferentes no mesmo espaço e permitiria separar a
progressão do videogame da ficha de mesa.

Esse gancho é apenas uma proposta de design. Não deve ser promovido a lore nem
publicado sem aprovação explícita do Criador.

## Direção confirmada em 01 de setembro de 2026

Após uma sessão de alinhamento com o Criador, quatro pontos da seção anterior
saíram do campo de proposta e viraram decisão:

- **Estrutura de mundo:** mantém-se o metroidvania contíguo, não o formato de
  hub com expedições repetíveis cogitado como alternativa na Fase 5. O mundo
  continua sendo um mapa único interligado, com progressão por habilidades de
  travessia.
- **Progressão pela base:** o hub do Jardim ganha upgrades funcionais reais
  (vida, dano, novos slots de equipamento, estações de criação), comprados
  com materiais e moeda farmados durante a exploração. É o mesmo padrão que
  Hollow Knight já usa (Geo, Charms e melhorias de Nail/Spell compradas no
  hub) e resolve, dentro do metroidvania contíguo, o desejo de farmar item e
  melhorar tudo sem precisar do formato de expedições. Parte do bloqueio de
  áreas pode combinar habilidade de travessia (obtida no mundo) com upgrade
  de base (comprado com farm), não apenas uma das duas.
- **Elenco jogável alvo:** cinco personagens, não três. Isso substitui a
  recomendação anterior de três personagens no restante deste documento; ver
  risco de escopo atualizado abaixo.
- **Direção visual:** decisão original de cutout substituída em 02/09/2026.
  A direção vigente é arte 2D desenhada à mão: personagens simples e legíveis
  com animação tradicional quadro a quadro; cenários mais detalhados, pintados
  e montados em camadas com parallax. Não é pixel art.

Decisões tomadas em conversas seguintes (ver "Decisões pendentes para a
retomada" pra detalhe e data de cada uma): alvo **Windows**, primeira região
**Gênese/Întuneric**, elenco, tom de conteúdo, solo (pelo menos até o
vertical slice) e experiência **paralela** (nada que acontece no jogo,
incluindo morte, volta pra canon da mesa), e manifestação **estilizada**
(não precisa bater exatamente com a aparência de referência). Só falta
decidir se o jogo vai além de privado pra mesa — deixado em aberto de
propósito até ver o resultado.

Consequência prática: ir de três para cinco personagens no vertical slice
multiplica o custo de desenho, animação e retrato antes da prova de diversão da
Fase 1. Se o orçamento de tempo apertar, as Fases 1 e 2 podem continuar
validando com um único personagem placeholder, adiando a produção dos cinco
kits completos para a Fase 3 em diante, sem mudar a decisão de elenco.

### Elenco confirmado em 01 de setembro de 2026

| Personagem | Papel de combate | Observações |
| --- | --- | --- |
| **Blanc** | suporte etéreo | Espírito Primordial, o único Espírito Branco existente. É o próprio Blanc canônico de [`data/mundo/Jardim/registros-universais.json`](../../data/mundo/Jardim/registros-universais.json) (confirmado pelo Criador em 01/09/2026). |
| **Galadriel** | dano à distância / velocidade | Elfa espadachim, katana e shurikens. |
| **Ayato** | dano corpo a corpo | Guerreiro lutador, também usa katana; foco oposto ao de Galadriel (dano bruto em vez de velocidade). |
| **Adoxios** | magia elemental | Usuário de Fluxo elemental com elemento escolhível pelo jogador. Mecanicamente equivale a escolher, na criação/seleção, qual dos 11 Fluxos (`FLUXO_TEMAS` em `magiaService.ts`) ele manifesta — a cor e a "família" do efeito já vêm prontas dos dados; falta só desenhar a forma do golpe elemental (projétil, explosão, etc.) de um jeito que sirva pra ser recolorida por Fluxo. Recomendado começar o vertical slice com um subconjunto pequeno de Fluxos (2 a 4) em vez dos 11 de uma vez, por causa do risco de escopo. |
| **Netuno** | tanque | Personagem próprio do jogo, **sem relação** com o Soberano das Montanhas. Esse Soberano já se chamava "Netuno Laufey" (confirmado por acaso ao cruzar os nomes); pra não ter dois "Netuno" com significados diferentes, ele foi renomeado para **Bergelmir Laufey** em [`data/mundo/Gênese/realidade-0-soberanos.json`](../../data/mundo/Gênese/realidade-0-soberanos.json) (01/09/2026, a pedido do Criador). |

Blanc entrando no jogo como o próprio Espírito Primordial canônico já encaixa
no gancho criativo provisório descrito acima (ecos de personagens de origens
diferentes reunidos no jogo). Os outros quatro (Galadriel, Ayato, Adoxios,
Netuno) são personagens próprios do jogo, sem vínculo obrigatório com lore do
universo.

Os cinco seguem o **mesmo contrato visual**, mas cada um terá seus próprios
quadros completos de animação. O contrato fixa proporção, escala de tela,
posição dos pés no quadro, espessura de contorno, paleta e lista de ações
(idle, correr, pular, esquivar, golpe leve, golpe forte, dano e morte). O
design de cada personagem já existe fora deste projeto; o trabalho aqui é
adaptá-lo para essa linguagem comum sem apagar sua silhueta. A tela de seleção
de personagem pode mostrar ilustrações mais detalhadas, pois não precisa manter
a legibilidade imediata exigida durante o combate.

Os cinco kits de combate completos (habilidades, Fluxo, técnica especial,
passiva racial, arma) estão em
[`KITS_COMBATE.md`](KITS_COMBATE.md). As regras de paleta, silhueta, luz e
animação destiladas do moodboard estão em
[`BIBLIA_VISUAL.md`](BIBLIA_VISUAL.md).

## Tradução da ficha para o jogo

O jogo não deve consumir a ficha inteira e tentar interpretar descrições em
linguagem natural. A API deve produzir um **manifesto jogável**, sanitizado e
versionado, a partir de adaptadores escritos e testados.

| Campo do RPG | Uso proposto no jogo |
| --- | --- |
| Nome e retrato | Identidade, seleção e diálogos |
| Árvore | Origem, apresentação e possíveis afinidades narrativas |
| Raça | Identidade visual planejada, uma passiva e, quando adequado, mobilidade |
| Classe | Arquétipo, ataques e habilidades principais |
| Fluxo | Magias, tipo de efeito, paleta e efeitos visuais |
| Poderes | Habilidades equipáveis somente quando houver adaptador explícito |
| Armas e itens | Equipamentos reconhecidos por uma lista compatível |
| Atributos | Valores normalizados para as escalas do jogo de ação |
| Nível | Libera opções; não é copiado diretamente como poder bruto |

Um kit jogável de referência teria:

- movimento, pulo, esquiva e ataque básico;
- duas habilidades de classe;
- uma manifestação do Fluxo;
- uma técnica especial;
- uma passiva racial;
- arma e acessórios suportados.

Conteúdo ainda não adaptado deve aparecer como não suportado, sem criar efeitos
por adivinhação. Uma ficha pode manter nome e aparência mesmo que parte de seu
kit ainda não tenha implementação.

## Progressão e integridade

Na primeira versão, a integração deve ser **somente leitura**:

- importar o personagem não altera a ficha da mesa;
- XP, desbloqueios e save do videogame vivem num perfil separado;
- recompensas do jogo não entram automaticamente na carteira ou inventário da
  campanha;
- o cliente nunca recebe chave interna dos bots ou credencial administrativa;
- nenhuma decisão importante de economia pode confiar no executável do jogador.

Caso recompensas sincronizadas sejam desejadas no futuro, o servidor precisará
validar e autorizar os resultados. Um jogo cliente pode ser modificado e não é
uma fonte confiável para moeda, itens ou progressão oficial.

## Integração proposta com a plataforma

Fluxo de autenticação recomendado para uma aplicação nativa:

1. o jogo solicita e mostra um código temporário;
2. o jogador confirma o código no site já autenticado;
3. a API entrega um token curto, revogável e limitado ao jogo;
4. o jogo lista os personagens permitidos;
5. um endpoint próprio entrega apenas o manifesto jogável publicado.

Não enviar ao jogo:

- senha do usuário;
- `SERVICE_API_KEY`;
- rascunhos editoriais;
- `corpoMestre`;
- conteúdo oculto para aquele personagem ou campanha;
- o JSON completo quando o manifesto sanitizado for suficiente.

O Mundo efetivo continua seguindo
[`../../docs/EDITOR_CONTEUDO_CAMPANHA.md`](../../docs/EDITOR_CONTEUDO_CAMPANHA.md):
base oficial em `data/`, publicação global e, onde aplicável, publicação da
campanha. O jogo deve consumir somente conteúdo resolvido e autorizado pela
API, nunca snapshots editoriais diretamente.

**Revisão de 01/09/2026 — o que já existe de verdade na API pra apoiar isso:**

- `plataforma/routers/content.py` já serve o Mundo efetivo (o editor de
  conteúdo por campanha, commitado em 25/08, deixou de ser só uma promessa
  do documento). O jogo pode ler desse endpoint em vez de desenhar um do
  zero na Fase 3.
- Já existe um precedente real de "resumo sanitizado de personagem":
  `_complex_ally_summary` em `plataforma/routers/characters.py:525` expõe só
  nome, foto, vida/mana atual e máxima, defesa, movimento, iniciativa e
  nível de um personagem pra outro jogador (o cartão de Aliado), sem
  inventário, notas, poderes ou o resto da ficha privada. É o mesmo
  princípio do manifesto jogável da Fase 3 — vale estender esse formato em
  vez de inventar um novo do zero.
- **Não existe ainda** nenhum vínculo por código temporário (o fluxo descrito
  acima). O que já existe de parecido é o vínculo de conta com Discord
  (`plataforma/routers/discord_links.py`) — mesmo princípio de "ligar uma
  identidade externa à conta", mas pra Discord, não pra um jogo nativo. É
  referência de padrão a seguir na Fase 3, não um atalho pronto.
- A validação de regras da ficha (`plataforma/core/character_summary.py` —
  apesar do nome, é quase toda validação de regra, não resumo) cobre
  raça/Árvore, multiclasse, atributos, perícias, magias/rituais/selos/
  encantamentos, Legados, fragmentos raciais e catalisadores de Fluxo, tudo
  num arquivo só, testado. Bom pro jogo (uma fonte só de verdade sobre o que
  é uma ficha válida) e reforça o Risco 1 (muitas combinações): o adaptador
  da Fase 3 vai precisar decidir explicitamente o que ignorar (catalisadores
  de Fluxo, fragmentos raciais etc.), não tentar espelhar tudo.

**Releitura de `docs/EDITOR_CONTEUDO_CAMPANHA.md` em 01/09/2026** — pontos
que mudam o desenho do adaptador da Fase 3:

- O endpoint `GET /conteudo/resolvido` já existe pra Regras/Loja por
  campanha (base oficial + publicação da campanha). Pro Mundo/Lore global
  (Árvore, Fluxo, Galho, Dimensão), a resolução é base oficial +
  `conteudo_global_editorial`, mas esse documento só descreve os endpoints
  do **editor** (exigem cargo de Criador); o caminho de leitura pública que
  o site usa pros jogadores não está detalhado aqui — confirmar isso quando
  a Fase 3 realmente começar, em vez de presumir.
- **Lore/Cronologia são globais (valem pra toda campanha); liberação de
  raça/classe especial é por campanha.** O manifesto jogável da Fase 3
  precisa combinar as duas coisas: a identidade de Árvore/Fluxo do
  personagem não muda entre campanhas, mas se uma raça ou classe dele for
  `categoria: esquecida` (como visto em `character_summary.py`), o jogo só
  pode reconhecer isso se a campanha daquele personagem realmente liberou —
  não dá pra resolver o manifesto sem saber de qual campanha o personagem é.
- Confirma quase palavra por palavra uma regra que o plano já tinha:
  snapshots editoriais (`data/editorial/**/*.json`) "podem conter material
  privado" e "nunca devem ser entregues diretamente a jogadores" — mesma
  regra de "nunca snapshots editoriais diretamente" já escrita acima.
- **Achado à parte, sobre o rename de Bergelmir Laufey feito nesta mesma
  sessão** (ver "Elenco confirmado"): a rename trocou o id de
  `netuno-laufey` pra `bergelmir-laufey` direto na base oficial
  (`data/mundo/`). Se esse Soberano já tinha sido publicado alguma vez pelo
  Painel do Criador (`conteudo_global_editorial`), a publicação antiga
  ficaria presa no id velho, órfã, enquanto o id novo não tem publicação
  nenhuma ainda. Não dá pra verificar isso sem acesso ao Postgres de
  produção — vale o Pedro conferir no próprio Painel do Criador antes de
  considerar o rename totalmente resolvido.

## Tecnologia recomendada no levantamento

- **Motor:** Godot 4;
- **linguagem:** GDScript;
- **primeiro alvo:** Windows, teclado e controle;
- **estrutura:** projeto em `game/`, mantendo referências por ID aos dados
  oficiais;
- **dados específicos:** adaptadores próprios do jogo, sem alterar a semântica
  das regras de mesa;
- **testes:** validação do contrato do manifesto no backend e testes de lógica
  do jogo executáveis sem interface quando possível.

Em 30 de agosto de 2026, a versão estável observada era Godot 4.7.2. A versão
deve ser confirmada novamente antes de criar `project.godot`. GDScript foi
preferido originalmente por simplicidade e por manter possível uma
demonstração Web; na data do levantamento, Godot 4 com C# ainda não tinha
exportação Web oficial.

**Atualização 01/09/2026:** o alvo foi confirmado como Windows (ver "Direção
confirmada" acima) — a razão de manter Web em aberto deixou de existir. Isso
não obriga trocar de GDScript pra C#, mas remove o motivo original que
descartava C#; se performance de um mapa grande e contínuo vier a pesar mais
que simplicidade de scripting, vale reavaliar C# nesse momento, não antes.

Fontes verificadas na data:

- <https://godotengine.org/download/archive/>
- <https://docs.godotengine.org/en/stable/tutorials/2d/introduction_to_2d.html>
- <https://docs.godotengine.org/en/stable/tutorials/2d/2d_sprite_animation.html>
- <https://docs.godotengine.org/en/stable/tutorials/export/exporting_for_web.html>

## Direção visual recomendada

Os fundos e modelos existentes ajudam a indicar clima, mas não constituem um
pacote completo de produção para um jogo 2D. Ainda seriam necessários sprites
animados, inimigos, objetos, cenários em camadas,
colisões, interface, efeitos e áudio de combate.

Direção sugerida:

- cenários 2D pintados, sombrios e com silhueta clara;
- parallax, luzes 2D, partículas e shaders;
- personagens desenhados à mão e animados quadro a quadro;
- proporção, escala, pivô dos pés e lista de animações padronizados;
- retrato original do personagem em seleção e diálogo;
- linguagem visual distinta para cada Fluxo;
- animações com boa antecipação, impacto, pausa curta no acerto e resposta
  sonora forte.

O contrato visual compartilhado reduz inconsistências, mas não elimina o custo
de desenhar cada personagem. Arte e animação provavelmente serão o maior
gargalo de produção. Todo asset
existente ou novo precisa ter autoria e licença verificadas antes de uma
publicação, sobretudo se houver intenção comercial.

### Moodboard de referência

Um primeiro lote de referências visuais está em `game/referencias/`: silhueta,
proporção e poses em `personagens/`, e castelo gótico, trem de ossos e
arquitetura opressiva de colônia em `ambientes/`. A origem de cada imagem
está anotada em `game/referencias/fontes.md`. Essa pasta **não é versionada
no git** — é só material de apoio local, nunca para traçar ou publicar como
asset final. Ainda falta referência de floresta/vegetação retorcida de
Întuneric.

## Primeiro vertical slice

Escopo de referência, ainda sujeito a aprovação:

- jogo solo para Windows;
- teclado e controle;
- um hub pequeno;
- uma região artesanal ligada a uma única Árvore (Gênese, Dimensão
  Întuneric);
- cerca de 10 a 15 salas interligadas;
- atalhos, checkpoint, save e pelo menos um segredo — o Trem de Ossos da
  lore de Întuneric é candidato natural a virar a estação de fast travel
  entre pontos do mapa;
- três famílias de inimigos;
- um mini-chefe e um chefe;
- os cinco personagens confirmados (Blanc, Galadriel, Ayato, Adoxios, Netuno —
  ver seção "Elenco confirmado" acima);
- uma cena narrativa curta;
- interface, som, partículas e iluminação próximos da direção final.

Essas quantidades são limites de escopo propostos, não estimativas garantidas
de prazo ou custo.

## Ordem de produção

### Fase 0 — decisões de pré-produção

- ~~escolher cinco personagens reais como casos de teste~~ decidido em
  01/09/2026: Blanc, Galadriel, Ayato, Adoxios e Netuno;
- ~~definir Windows ou Web como alvo prioritário~~ decidido: Windows;
- ~~confirmar solo ou cooperativo~~ decidido: solo por enquanto;
- ~~aprovar a direção visual~~ decisão vigente desde 02/09/2026: arte 2D
  desenhada à mão, personagem quadro a quadro e cenário pintado em camadas;
  manifestação estilizada;
- ~~escolher a primeira Árvore e o enquadramento narrativo~~ decidido:
  Gênese/Dimensão Întuneric, experiência paralela (ver "Decisões pendentes");
- ~~escrever os kits jogáveis desses personagens~~ feito, ver
  `KITS_COMBATE.md`;
- verificar licença dos assets que servirão como referência ou produção.

### Fase 1 — prova de diversão

- ~~personagem temporário numa arena cinza~~ feito;
- ~~correr, pular, cair, esquivar e atacar~~ feito (esquivar dá invulnerabilidade
  temporária, igual um dash de Hollow Knight/Dead Cells);
- ~~hitboxes, dano, invulnerabilidade, câmera e controle~~ feito — componente
  `Vida` reutilizável (jogador/inimigo/boneco), `Hitbox`/`Hurtbox` em Area2D
  com 7 camadas de física dedicadas (ver `project.godot`), Camera2D simples
  seguindo o jogador;
- ~~um inimigo e um boneco de treino~~ feito — inimigo patrulha e machuca no
  toque, boneco tem vida praticamente infinita só pra apanhar;
- **testar repetidamente antes de produzir conteúdo visual — primeira
  reação em 01/09/2026: o Pedro jogou e gostou** ("ta bem legal, fiquei
  animado com o jogo"). Isso é sinal real, mas ainda é só a primeira
  sessão — "testar repetidamente" continua valendo conforme a ideia
  amadurece, não é um passo que se marca como concluído de vez. Ver "Como
  testar" logo abaixo.

Implementado em 01/09/2026 (`game/scripts/`, `game/scenes/`). Não incluir
banco, login, lore completa ou criação modular nesta fase — nada disso
entrou.

#### Ajustes de "juice" (01/09/2026, primeira rodada)

Sem feedback específico do que incomodou, a rodada de ajuste focou em
técnicas de "game feel" que quase sempre ajudam sem mudar a mecânica: hit-
stop (pausa curtíssima em todo acerto, dado ou recebido — autoload
`Impacto`), tremor de câmera ao tomar dano, e um indicador visual do golpe
(retângulo translúcido que aparece durante a janela do hitbox — antes o
ataque era sequência de eventos, não algo que aparecia na tela). Nenhum
número de velocidade/tempo mudou. Se o Pedro apontar algo específico, o
próximo ajuste vira sobre isso, não sobre "juice" genérico de novo.

#### Como testar

Abrir `game/project.godot` no Godot 4.7.2 e rodar a cena
`scenes/arena/arena_teste.tscn` (F6, ou F5 já que é a cena principal). Setas
ou A/D pra mover, Espaço pra pular, Shift pra esquivar, clique esquerdo ou J
pra atacar. Os números de dano aparecem no console de saída (Output), não
na tela ainda — não tem UI de vida nesta fase de propósito.

O que vale ajustar por sensação, jogando (todos os números estão em
constantes no topo de `personagem_controller.gd`): velocidade de
movimento/pulo, alcance e duração do hitbox de ataque, janela de
invulnerabilidade da esquiva, cooldown do ataque. Nenhum desses valores foi
testado de verdade — são só um primeiro palpite razoável pra ter algo
jogável na tela.

### Fase 2 — prova visual

- ~~uma sala com aparência próxima do resultado final~~ primeira versão em
  02/09/2026: `scenes/regioes/sala_intuneric.tscn` (castelo) — parallax
  (céu/lua/silhueta de castelo, árvores retorcidas, névoa), tom frio via
  `CanvasModulate` e um único ponto quente (janela acesa), seguindo as
  regras de `BIBLIA_VISUAL.md`. Ordem de prioridade decidida pelo Pedro:
  estruturar o mundo/ambiente primeiro, personagens de verdade só no final
  — faz sentido porque ambiente/silhueta distante é mais viável sem
  ferramenta de ilustração do que personagem em close, que é sempre o
  centro das atenções na tela. Segunda sala em 02/09/2026:
  `scenes/regioes/colonia_intuneric.tscn` — prédios altos e apertados
  (vãos bem mais estreitos que o castelo, sensação claustrofóbica), tom
  ainda mais frio e dessaturado, **nenhum ponto quente** (ao contrário do
  castelo) e uma calha discreta no chão — a mesma regra de hierarquia
  visual (castelo tem uma centelha de vida, colônia não tem nenhuma) já
  definida na decisão de tom de Întuneric, sem depiction explícita de
  nada;
- ~~um personagem provisório animado~~ primeira versão em 02/09/2026: ver nota
  abaixo — é vetorial (formas geométricas), não ilustração pintada;
- um inimigo finalizado;
- iluminação, parallax, partículas, impacto e áudio;
- teste de desempenho no hardware-alvo.

**Sobre o personagem provisório animado, 02/09/2026:** o maior risco que o
plano já tinha identificado ("Arte: qualidade visual exige um pipeline
consistente") é real — quem está fazendo esse trabalho não tem uma
ferramenta de geração de ilustração. O que dá pra fazer, e foi feito pro
Ayato: formas geométricas planas (`Polygon2D`/`ColorRect`, sem textura
externa nenhuma) na paleta e no estilo de silhueta que `BIBLIA_VISUAL.md`
já define, com um balanço de "respiração" simples (`bob_idle.gd`). Isso é
honestamente mais "vetorial estilizado" do que a ilustração pintada que
`VISAO_DO_JOGO.md` e a bíblia visual descrevem como objetivo final — serve
pra validar escala, silhueta e paleta por Fluxo, mas arte de produção de
verdade (a que vai valer pra publicar) ainda depende do Pedro desenhar ou
contratar alguém. Ainda faltam os desenhos completos das animações de idle,
correr e atacar (por enquanto o placeholder só balança parado).

**Decisão de 02/09/2026:** o Pedro vai desenhar a arte de verdade ele
mesmo (descartou contratar artista e usar IA de imagem, por enquanto). Ver
[`GUIA_DE_ARTE.md`](GUIA_DE_ARTE.md) — Krita é a ferramenta principal;
Aseprite não é adequado porque a direção não é pixel art. O guia
`referencia_proporcao.svg` continua útil para manter a escala dos cinco, mas
as marcações de junta não definem mais um rig de produção.

**Nova capacidade de verificação, 02/09/2026:** o Godot instalado permite
rodar `--headless --path <projeto> --quit-after N` numa CÓPIA isolada do
projeto (pra não brigar com o editor aberto) e ler os erros de
carregamento no console. Isso já pegou um bug de verdade (ver "Riscos
principais" e o registro em memória) antes de pedir pro Pedro testar de
novo. Vale usar isso a cada mudança de cena/script daqui pra frente, não só
confiar que o formato "parece certo".

### Fase 3 — contrato de personagem

- definir o schema versionado do manifesto jogável;
- criar adaptadores para os cinco personagens;
- validar IDs de classe, raça, Fluxo, poderes e itens;
- implementar vínculo por código temporário;
- garantir que a API só exponha conteúdo autorizado e publicado.

### Fase 4 — vertical slice

- hub, região, salas, atalhos e checkpoints;
- três famílias de inimigos;
- mini-chefe e chefe;
- narrativa curta;
- save separado da ficha;
- interface, acessibilidade básica e suporte a controle;
- testes com jogadores e revisão do escopo.

### Fase 5 — decisão de produção

Somente após testar o vertical slice decidir entre:

- metroidvania maior e contínuo;
- capítulos artesanais por Árvore;
- expedições repetíveis com hub;
- combinação controlada dessas estruturas.

## Fora do primeiro escopo

- implementar as 28 classes de uma vez;
- adaptar todas as raças, magias e equipamentos;
- multiplayer ou cooperativo online;
- PvP;
- mundo procedural completo;
- sincronizar recompensas com a economia oficial;
- reproduzir literalmente níveis e fórmulas da mesa;
- permitir que o jogo edite lore ou regras;
- publicar, empacotar ou distribuir antes da validação do vertical slice.

Multiplayer deve ser tratado como um projeto próprio, porque altera arquitetura,
combate, câmera, pausa, save, segurança e testes.

## Riscos principais

1. **Escopo:** muitas combinações de classe, raça, Fluxo, poderes e itens; o
   elenco confirmado em cinco personagens (em vez de três) aumenta ainda mais
   essa combinatória antes da prova de diversão.
2. **Arte:** qualidade visual exige um pipeline consistente, não apenas
   fundos. Confirmado em 02/09/2026: sem ferramenta de geração de
   ilustração disponível, o que se produz sem o Pedro desenhar ou contratar
   alguém é forma geométrica estilizada (ver nota em "Fase 2" acima), não a
   arte pintada que a visão do jogo descreve.
3. **Animação:** cinco personagens com desenhos completos próprios multiplicam
   a quantidade de quadros e dificultam manter escala, timing e qualidade
   consistentes.
4. **Ambiguidade:** textos narrativos não são regras executáveis.
5. **Balanceamento:** níveis de mesa não cabem diretamente num jogo de ação.
6. **Segurança:** o cliente não pode decidir recompensas oficiais.
7. **Conteúdo privado:** rascunhos e campos de Mestre não podem chegar ao jogo.
8. **Licenças:** imagens, músicas, fontes e referências precisam de procedência.
9. **Manutenção:** IDs oficiais podem evoluir; adaptadores precisam de testes.

## Decisões pendentes para a retomada

1. ~~O alvo inicial será Windows ou navegador?~~ Decidido em 01/09/2026:
   **Windows**. Razão do Criador: o plano é ter um mapa grande no futuro, e
   isso pede desempenho que Web comprometeria; além disso, Windows deixa
   aberta a porta de publicar de verdade se o jogo sair bom (ver item 8).
   Consequência prática: **a Discloud deixa de ser onde o jogo "mora"** — ela
   continua fazendo sentido pra hospedar a API do manifesto/login (é só mais
   um serviço web, igual ao site e aos bots), mas a build do jogo em si
   (o `.exe`) precisa de um canal de distribuição próprio ainda não decidido
   (download direto, itch.io, Steam mais adiante). Isso é uma pendência nova,
   não existia quando o alvo era Web.
2. O primeiro jogo será estritamente solo? Recomendação registrada em
   01/09/2026: sim, pelo menos até o vertical slice provar que o combate
   sozinho já é divertido. O Criador cogitou co-op tipo *Little Nightmares 3*
   (online) ou *Castle Crashers* (local); mesmo o co-op local, mais simples
   dos dois, já mexe em câmera compartilhada, balanceamento de inimigo pra
   N jogadores e save antes da prova de diversão — o mesmo risco que "Fora do
   primeiro escopo" já tinha decidido adiar pra Fase 5. Se avançar um dia, o
   caminho mais barato é co-op local (Castle Crashers), não online (Little
   Nightmares 3, que exige sincronizar estado entre máquinas pela rede).
3. ~~Quais cinco personagens existentes serão os casos de teste?~~ Decidido em
   01/09/2026: Blanc, Galadriel, Ayato, Adoxios e Netuno (ver "Elenco
   confirmado"). Blanc é o Espírito Primordial canônico; Netuno é um
   personagem à parte (o Soberano homônimo foi renomeado para evitar
   conflito, ver tabela acima).
4. ~~Qual Árvore receberá a primeira região?~~ Decidido em 01/09/2026:
   **Gênese**, especificamente a **Dimensão Întuneric** (vampírica, sombria,
   dentro do Galho Realidade 0 — ver `data/mundo/Gênese/genese.json` e
   `realidade-0-dimensoes.json`). Escolhida pelo tom sombrio, pela variedade
   de monstros e porque o Trem de Ossos já descrito na lore (locomotivas de
   metal fundido com esqueletos de gigantes, sobre trilhos parecidos com
   veias) vira a base natural de um sistema de viagem rápida entre partes do
   mapa. Visão de longo prazo sinalizada pelo Criador: o plano é que cada
   Árvore ganhe sua própria região no jogo (não só Gênese) — isso não muda o
   escopo do vertical slice, mas deve pesar na decisão da Fase 5
   (provavelmente aponta pra "metroidvania maior e contínuo").

   **Decisão de tom, 01/09/2026:** o jogo mostra Întuneric como ela é na
   lore, incluindo o sistema de colônias humanas — o Criador quer que os
   jogadores conheçam esse lado da dimensão e tirem suas próprias conclusões
   sobre a história. Isso aponta pra **storytelling ambiental** (arquitetura,
   objetos coletáveis com texto curto, diálogo de NPC, cenário de fundo) em
   vez de forçar o jogador por uma sequência interativa explícita de
   tortura/abate — mostrar o sistema existindo no mundo, não necessariamente
   dramatizá-lo passo a passo. Antes de distribuir de qualquer jeito (mesmo
   que só entre a mesa), vale um aviso curto de conteúdo (temas sombrios:
   violência, escravidão, horror corporal) — sem um Mestre presente pra dosar
   o tom ao vivo, quem joga precisa saber com antecedência no que está
   entrando. Isso fica mais formal ainda se a intenção de lançamento público
   do item 8 vingar: lojas como Steam pedem classificação etária declarada.
5. ~~O visual será pintura recortada, animação quadro a quadro, pixel art ou
   2.5D?~~ A primeira decisão, de 01/09/2026, foi cutout; ela foi substituída
   em 02/09/2026 por **arte 2D desenhada à mão**, com personagens animados
   quadro a quadro e cenários pintados em camadas. Não é pixel art.
6. ~~O personagem precisa reproduzir exatamente sua aparência ou uma
   manifestação estilizada é aceitável?~~ Decidido em 01/09/2026:
   **manifestação estilizada**. Não precisa bater exatamente com a aparência
   da ficha/arte de referência de cada personagem. A estilização é uma escolha
   artística confirmada, não uma consequência de um rig compartilhado.
7. ~~A experiência será canônica, paralela ou explicitamente uma
   simulação?~~ Decidido em 01/09/2026: **paralela**. Todos os personagens
   existem no jogo, mas nada que acontece lá volta pra canon da mesa —
   inclusive morte. Matar alguém em Întuneric dentro do jogo não significa
   que essa entidade está morta na lore oficial. Isso estende o princípio de
   "somente leitura" que a seção "Progressão e integridade" já definia pra
   ficha/carteira/inventário: agora cobre também o estado de NPCs e do mundo
   de Întuneric, não só a progressão do próprio personagem jogável.
8. O jogo será gratuito, privado para a mesa ou candidato a lançamento
   público? Ainda não fechado, mas o Criador já sinalizou em 01/09/2026 que,
   "se o resultado do jogo for bom", quer poder publicar de verdade — isso
   foi inclusive parte da razão de escolher Windows no item 1. Não fechar
   preço ou plataforma de venda agora; só manter em mente que asset final
   (arte, música, fontes) vai precisar de autoria/licença própria antes
   dessa hipótese virar real, como o documento já avisava antes.

## Checklist de retomada

- [x] Recontar classes, raças, Fluxos e conteúdo mágico atual (01/09/2026:
      28 classes, 25 raças, 11 Fluxos batendo; magias subiram de 330 pra
      352).
- [x] Revisar alterações feitas na ficha e na API desde agosto de 2026 (ver
      "Revisão de 01/09/2026" na seção "Integração proposta com a
      plataforma").
- [x] Ler novamente a documentação editorial (01/09/2026, ver "Releitura de
      EDITOR_CONTEUDO_CAMPANHA.md" na seção "Integração proposta com a
      plataforma").
- [x] Escolher cinco personagens e registrar seus dados permitidos (Blanc,
      Galadriel, Ayato, Adoxios, Netuno).
- [x] Escrever uma página de visão do jogo (`VISAO_DO_JOGO.md`).
- [x] Escrever os cinco kits de combate (`KITS_COMBATE.md`).
- [x] Fazer uma pequena bíblia visual (`BIBLIA_VISUAL.md`).
- [x] Confirmar licenças dos assets de referência (01/09/2026: nenhuma das
      44 imagens do moodboard tem ou vai ter licença confirmada — ver
      "Status de licença" em `../referencias/fontes.md`; regra é uso interno
      apenas, já garantido pelo `.gitignore` da pasta).
- [x] Confirmar a versão estável do Godot e plataformas suportadas
      (reconferido em 01/09/2026: ainda 4.7.2-stable).
- [x] Criar o projeto Godot somente depois dessas decisões (01/09/2026:
      `game/project.godot`, Godot 4.7.2, GDScript, GL Compatibility — ver
      `../README.md` "Estrutura do projeto Godot"). Só o esqueleto e um
      sanity-check de movimento, não a Fase 1 de verdade.
- [x] Construir a prova de diversão antes da integração com a plataforma
      (01/09/2026: implementada e jogada — reação inicial positiva do
      Pedro. Ajuste fino de números por sensação continua em aberto por
      natureza, não é algo que "termina" — ver "Como testar" na Fase 1).

## Resumo da decisão atual

A ideia é tecnicamente viável porque O Jardim já tem dados estruturados e uma
plataforma de personagens. A abordagem recomendada é importar a identidade da
ficha por uma API segura e converter somente conteúdos com adaptadores
explícitos. O primeiro objetivo deve ser um vertical slice solo, pequeno e
visualmente convincente. O projeto permanece pausado até que as prioridades
atuais do RPG sejam concluídas.
