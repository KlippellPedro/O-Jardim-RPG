# Construtor de mapas e extensões do mapa ao vivo

Pedido do Pedro em 2026-11-03: montar mapas dentro do VTT (chão, paredes,
portas, mobília) e trazer para o nosso mapa as extensões boas do Owlbear,
começando por calendário, dia e noite (nascer e pôr do sol) e portais que levam
um token ou objeto de um lado para o outro.

As levas 1 (tempo e portais), 2 (construtor, parte 1) e 3 (construtor, parte 2:
peças do Acervo, mobília, camadas, peças prontas, luzes fixas, água e lava, e a
licença no Acervo) e 4 (paredes vivas: portas na mesa, bloqueio e portal entre
cenas) foram feitas em 2026-11-03; as levas 5 e 6 continuam como proposta e
ordem de trabalho.

## O que já existe e vai ser aproveitado

- **Calendário da campanha** (`plataforma/routers/calendario.py`,
  `core/calendario.py`, tabela `campanha_calendario` com o estado em JSON):
  - dia de "hoje", avançar dias, atalhos de tempo (próxima Lua Cheia, próxima
    estação...);
  - estações, Noite Eterna e Eclipse;
  - lua de 28 dias com a Lua Carmesim, e o painel do Mestre
    (`src/pages/Mundo/PainelCalendarioMestre.tsx`).
  - Cada mudança já vira o evento `calendario` no tempo real, que o mapa hoje
    ignora (`EVENTOS_SEM_EFEITO` em `MapaPage.tsx`).
  - Não há hora do dia. Como o estado é JSON e `regras.completar` preenche o
    que falta, a hora entra sem migração.
- **Clima e luz**: a escuridão do clima já recebe as luzes dos tokens, com
  tremor (`motor/luzes.ts`, `motor/luzesConta.ts`), e os shaders da atmosfera
  já misturam cor e véu (`motor/climaShader.ts`). O dia e a noite são uma
  escuridão com cor que segue a hora.
- **Acervo**: o navegador corta a imagem em ladrilhos de 1024 px e o servidor
  só entrega os ladrilhos liberados pela névoa. O mapa montado no construtor
  sobe pelo mesmo caminho, ladrilho por ladrilho, sem montar uma imagem
  gigante. O acervo já tem o tipo "objeto".
- **Tempo real com segredo no servidor**: deltas por quem recebe, monstro na
  névoa some. Paredes, portas e portais seguem a mesma regra.
- **Pasta `tools/blender`**: a coleção das árvores já é gerada por script. As
  peças de mobília podem sair do mesmo jeito.

## O que o Owlbear tem (loja com 100 extensões)

Ideias que valem para nós. As extensões são de terceiros e servem só de
referência: Weather e Dynamic Fog são GPL-3.0, e escrevemos tudo do zero.

| Extensão | O que faz | Para nós |
| --- | --- | --- |
| Calendar!, Calendar of Harptos | calendário da sala | já temos o nosso; levar para dentro do mapa |
| OwlClock | relógio; à meia-noite avança o dia do Calendar! | hora do dia no nosso calendário |
| (nenhuma) | ciclo de dia e noite | só existe no Foundry (Day Night Cycle); seria nosso diferencial |
| Portals | soltar o token numa origem leva ao destino, só no mesmo mapa | portais, também entre cenas |
| Dynamic Fog, Smoke & Spectre!, Peekaboo | paredes, portas, luzes, visão por jogador | paredes vivas e visão, com segredo no servidor |
| Crawl!, One Page Importer | masmorra gerada e importada | gerador de sala no construtor, depois |
| Embers, AoE Shapes, Auras and Emanations, Token Auras | efeitos e auras | magia já feita; faltam auras presas ao token |
| Dark Torch, Ticker!, Count! | tocha que acaba, cronômetro, contadores | tocha que queima com o relógio do mundo, relógios de progresso |
| Theatre! | fala de NPC com retrato na tela de todos | falas na mesa |
| Short Rest! | pausa a mesa enquanto o Mestre prepara | pausa |
| Tracks | música e ambiente sincronizados | trilha da cena com arquivos do Mestre |
| Map Location Key, Tooltips, Journal!, GM Vault | notas no mapa, diário, handouts | notas no mapa e Documentos do Mestre na mesa |
| Character Distances, Movement Tracker, Bendy Ruler | distância e movimento usado | distância ao passar o mouse, movimento do turno |
| Prefabs, Outliner, Default View, Scry! | peças prontas, camadas, vista inicial, achar itens | dentro do construtor |

Já temos o equivalente de Initiative Tracker, dados, barras de vida, condições,
régua, Weather, AoE e Embers (magia), Token Anonymizer (desconhecido) e Loot!.

## Construtor de mapas

### A ideia: arte assada mais uma camada viva

- **Arte assada**: chão, paredes desenhadas e mobília de enfeite viram
  ladrilhos de imagem, como um mapa enviado hoje. A mesa continua igual e o
  segredo da névoa continua valendo sem nada novo.
- **Camada viva**: o que precisa mudar na mesa fica como dado da cena e é
  desenhado na hora:
  - paredes (para bloquear e, mais tarde, tapar a visão);
  - portas e janelas (abrem, fecham, trancam; porta secreta);
  - portais, luzes fixas (tocha na parede, braseiro);
  - água e lava animadas, e objetos que mudam (baú aberto ou fechado).

O projeto editável é só do Mestre. O jogador recebe a arte pronta e só as
paredes, portas e portais das casas que a névoa liberou para ele. Porta secreta
só chega a ele depois de descoberta.

### Dados

- Tabela nova `mapa_projetos` (entra em `TABELAS` de `core/backup.py`):
  - `id`, `campanha_id`, `nome`, `grade` (tamanho da casa, largura e altura em
    casas);
  - `conteudo` JSON com:
    - `chao`: material por casa, compactado em sequências;
    - `paredes`: segmentos nos cantos da grade, com material e espessura;
    - `aberturas`: porta, janela ou porta secreta, presas a uma parede, com
      estado;
    - `pecas`: peça, posição, giro, escala, espelho, camada, viva ou não;
    - `luzes`, `portais`, `notas`.
  - `cena_id` da última publicação e `atualizado_em`.
- A cena ganha a camada viva (coluna `estrutura` em `mapa_cenas`): paredes,
  aberturas, portais e luzes fixas. Vem do projeto ao publicar e pode ser
  mexida na mesa (abrir porta).

### Editor

É uma aba "Construtor" no mapa, só do Mestre, desenhada no mesmo Pixi.

**Ferramentas**:
- Selecionar e mover.
- Sala: retângulo ou polígono, faz chão e paredes de uma vez.
- Pincel de chão e Parede (linha que encaixa nos cantos da grade).
- Porta e Janela: clique numa parede.
- Peça: galeria com busca e categorias. R gira 45 graus (com Shift, giro
  livre), F espelha, Ctrl+D duplica, [ e ] mudam a camada.
- Luz fixa, Portal, Nota e Borracha.

**Comportamento**:
- Desfazer e refazer (Ctrl+Z e Ctrl+Y) e salvamento automático.
- Lista de camadas (o Outliner).
- Grupos salvos como peça pronta (os Prefabs).
- Prévia "como o jogador vê".

**Publicar**: o navegador do Mestre desenha o projeto ladrilho por ladrilho
(1024 px) e sobe ao acervo como um mapa (origem "construtor", ligado ao
projeto). Depois troca o fundo da cena e grava a camada viva. Publicar de novo
atualiza a mesma cena.

### Materiais e peças

**Chão e parede** com texturas nossas, geradas por shader ou script:
- chão: laje de pedra, pedra bruta, tábua, terra, grama, areia, mármore, rocha
  de caverna, neve, água e lava (estas duas animadas, na camada viva);
- parede: pedra, tijolo, madeira, caverna, cerca, sebe.

**Mobília**: um pacote nosso feito no Blender (`tools/blender`), visto de cima,
com fundo transparente e duas ou três variações por peça. Primeira leva com uns
50 itens:
- móveis: mesa, cadeira, banco, cama, baú, estante, armário, barril, caixote;
- casa e taverna: tapete, lareira, fogão, balcão de taverna;
- templo e salão: altar, estátua, coluna, trono;
- passagem e luz: escada, alçapão, poço, tocha de parede, braseiro;
- ofícios: bigorna, carroça;
- natureza: árvore, arbusto, pedra, tronco caído;
- ruínas: entulho, ossos.

**Imagens do acervo** (tipo objeto) também viram peça, com campos de autoria,
origem e licença. O acervo é da campanha e não é público. Mesmo assim, imagem
de Pinterest raramente vem com licença de reuso, e o formulário avisa isso.

Nada de terceiros entra no repositório: ele é público e serve arquivos pelo
jsDelivr.

## Tempo no mapa: calendário e dia e noite

- **Hora no calendário da campanha**: `hoje` ganha a hora em minutos. Avançar
  horas passa da meia-noite para o dia seguinte, e a hora vale para o mundo
  todo (o `/mundo/calendario` mostra a mesma).
- **Painel Tempo no mapa (Mestre)**:
  - avançar +10 min, +1 h e +8 h (descanso);
  - ir para amanhecer, meio-dia, entardecer e meia-noite;
  - pular dias com os atalhos que o calendário já tem.
- **Topo do mapa (todos)**: data, hora, período e fase da lua, por exemplo
  "12 do 3º mês, 18:40, entardecer, lua crescente". Se o calendário estiver
  oculto, o jogador não vê.
- **Luz do sol**: cada cena escolhe como segue a hora.
  - Exterior: a luz segue a hora com cor e troca devagar:
    - madrugada azul escura, amanhecer laranja e rosa;
    - dia claro, entardecer âmbar e roxo, noite escura onde só as luzes abrem.
  - Interior: fica na luz do lugar, e as janelas do construtor deixam entrar
    o sol.
  - Fora do tempo: o Mestre fixa (sonho, outro plano).
- **O mundo pesa na luz**:
  - Noite Eterna é sempre noite, e o Eclipse escurece o meio-dia em vermelho;
  - a Lua Carmesim tinge a noite de vermelho;
  - a lua cheia clareia a noite um pouco.
- **Tocha que queima**: a luz do token pode ter duração em horas de jogo e
  apaga quando o relógio do mundo passa dela (o Dark Torch).

## Portais

- **Como funciona**: um par origem e destino. Soltar um token ou objeto na
  origem leva ao destino com uma animação na cor de um Fluxo, e a tela de quem
  moveu acompanha.
- **Opções**:
  - ida e volta ou mão única, pedir confirmação;
  - visível ou só do Mestre, ligado ou desligado;
  - quem usa: todos, jogadores ou só o Mestre.
- **Onde fica a regra**: no servidor, ao gravar a posição (`core/mapa.py`).
  Portal escondido não é entregue ao jogador.
- **Alcance**: primeiro na mesma cena. Depois entre cenas, o que o Portals do
  Owlbear não faz: o token muda de cena e quem estava vendo a origem o vê sumir.

## Paredes vivas e visão

- **Portas na mesa**:
  - o jogador abre e fecha uma porta destrancada ao lado do próprio token;
  - o Mestre tranca, destranca e revela porta secreta.
- **Bloqueio**: parede segura o arrasto do jogador, e o Mestre atravessa.
- **Visão por personagem**: é a maior peça.
  - O servidor calcula, pelas paredes, o que cada personagem enxerga dentro da
    luz que tem.
  - Libera só os ladrilhos e tokens dentro disso, com o mesmo segredo de hoje.
  - Guarda o que já foi explorado, que fica apagado.
  - Vem depois do construtor porque precisa das paredes.

## Outras extensões, em ordem de valor

1. **Auras presas ao token**, em casas, com a cor do Fluxo (aura de
   paladino, área de controle).
2. **Notas no mapa**: um marcador numerado abre um texto, e a nota do Mestre
   é secreta.
3. **Falas na mesa**: o Mestre manda a fala de um NPC com retrato, e ela
   aparece na tela de todos.
4. **Pausa da mesa**: os jogadores veem uma tela de espera enquanto o Mestre
   arruma a cena.
5. **Relógios de progresso e cronômetro** que todos veem.
6. **Trilha da cena**: música e ambiente sincronizados, com arquivos do
   próprio Mestre.
7. **Distância ao passar o mouse** e movimento usado no turno.
8. **Documentos do Mestre na mesa**: mostrar um dos modelos (carta, cartaz,
   mapa velho) para todos ou para um jogador.
9. **Vista inicial da cena** e achar um token ou peça pelo nome.

## Ordem em levas

Cada leva fecha com testes, mural e commit só com pedido.

1. **Tempo e portais. Feita em 2026-11-03.**
   - **Hora do mundo**: `minuto` no estado do calendário (padrão 8h, sem
     migração), `avancar_tempo` e a rota `POST /calendario/{id}/avancar-tempo`.
     Passar da meia-noite muda o dia, e desfazer volta a hora junto.
   - **Hora no mapa**: o estado do mapa leva `tempo` (hora, estação, lua, Lua
     Carmesim e a data, que vem null para o jogador com o calendário oculto).
     O calendário saiu de `EVENTOS_SEM_EFEITO_NO_MAPA`, então mudar a hora
     chega pelo tempo real.
   - **Luz da cena**: `clima.ceu` com o modo (não muda, segue o mundo ou hora
     fixa). As contas ficam em `motor/ceuConta.ts` e o desenho em
     `motor/ceu.ts`, com a escuridão na cor da hora, a tinta multiplicada e
     as luzes dos tokens abrindo caminho.
   - **Topo e painel Tempo**: relógio no topo e o painel Tempo do Mestre
     (`componentes/PainelTempo.tsx`).
   - **Portais**: migração 63 (`mapa_cenas.estrutura`), `normalizar_portais`,
     `portal_atingido` e `portais_de` em `core/mapa.py`, e a rota
     `PUT .../portais`.
   - **Travessia**: o servidor decide no `soltar` do tempo real e na rota de
     mover, e a mensagem `portal` sai para a mesa e para quem soltou. O portal
     que pergunta só leva com `atravessar`, e o escondido não pergunta ao
     jogador.
   - **Na tela**: `motor/portais.ts` (redemoinho na cor do Fluxo) e a
     ferramenta O do Mestre (dois cliques; arrastar uma boca muda o lugar).
   - **Conferido**: com Mestre e jogadora, a noite chega às 22h, o +8 h vai ao
     amanhecer na tela da jogadora, os dois portais levam e o que pergunta
     abre a caixa do site, e o console ficou limpo.
2. **Construtor, parte 1. Feita em 2026-11-03.**
   - **Servidor**: migração 64 (`mapa_projetos`, no backup), regras em
     `core/construtor.py` e rotas em `routers/construtor.py` (listar, criar,
     salvar, apagar e `POST .../projetos/{id}/publicar`). O projeto guarda o
     chão como uma letra por casa e as paredes nas arestas `h,x,y` e `v,x,y`,
     com as aberturas presas a elas.
   - **Publicar**: confere se a imagem tem o tamanho do mapa, põe o fundo na
     cena (nova ou a escolhida) com a grade do projeto e grava em
     `mapa_cenas.estrutura` as paredes em trechos e as aberturas em px,
     sem mexer nos portais.
   - **Recorte**: o jogador recebe as aberturas da cena sem a porta secreta e
     só onde a névoa deixa ver (`aberturas_de`).
   - **Navegador**: tudo em `src/pages/Mapa/construtor/`.
     - `projeto.ts`: operações puras (sala, pincel, parede reta, abrir,
       borracha, mudar o tamanho, área que mudou).
     - `materiais.ts`: 11 chãos e 6 paredes gerados por ruído com semente
       fixa, nada de imagem de terceiros.
     - `desenho.ts`: o mesmo desenho no editor e na publicação.
     - `editor.ts`: palco Pixi próprio em WebGL, redesenhando só os pedaços
       tocados.
     - `publicar.ts`: desenha cada ladrilho que o acervo pede e sobe na pasta
       Construtor.
     - `ConstrutorMapa.tsx`: a lista e o editor, que salva sozinho e tem
       desfazer.
   - **Na mesa**: as portas são desenhadas vivas por `motor/aberturas.ts`
     (fechada, aberta na dobradiça, trancada com cadeado, secreta tracejada
     só para o Mestre). A janela vem na imagem. O mapa da mesa fica parado
     enquanto o construtor está aberto.
   - **Conferido**: o Mestre montou duas salas, parede, grama, duas portas,
     janela e porta secreta, com desfazer e refazer, e publicou numa cena
     nova. A jogadora viu as portas e a janela, sem a secreta, e o console
     ficou limpo.
3. **Construtor, parte 2**:
   - **Primeiro recorte feito em 2026-11-03:** imagens do tipo Objeto no Acervo podem ser colocadas no construtor, movidas, redimensionadas, giradas e espelhadas. O projeto guarda a referência da imagem, e a publicação incorpora a peça no mapa final. O editor usa ladrilhos em resolução maior que a miniatura e reduz a fonte conforme a quantidade de imagens únicas para limitar o uso de memória. O Acervo protege imagens que ainda estão sendo usadas por projetos editáveis; só Mestres com acesso ao projeto leem essas referências.
   - **Resto da leva feito em 2026-11-03:**
     - **Mobília do Jardim**: 44 peças feitas no Blender por
       `tools/blender/gerar_mobilia.py` (Cycles, vista de cima, sombra em
       catcher) e convertidas por `tools/mobilia_construtor.py` para
       `public/assets/construtor/mobilia/<id>.webp` (192 px por casa) e
       `src/data/construtor-mobilia.json`. `tools/blender/gerar_mobilia.ps1`
       refaz tudo. A peça guarda `pacote` em vez de `imagem_id` e não passa
       pelo Acervo.
     - **Camadas**: cada peça tem `camada` (chão, objetos, alto). Chão e
       objetos são desenhados antes das paredes; alto, depois das janelas.
       Dentro da camada vale a ordem da lista (Para trás, Para a frente,
       Duplicar), e o painel mostra a lista por camada.
     - **Peças prontas**: Shift + clique junta peças, e o grupo anda junto.
       "Salvar como peça pronta" guarda o grupo com posições relativas ao
       centro em `mapa_campanha.prontas` (migração 65; até 40 por campanha,
       32 peças cada). As rotas são `GET` e `PUT /mapa/{campanha}/prontas`,
       e o clique no mapa põe o grupo com ids novos.
     - **Luzes fixas**: ferramenta Luz (vela, tocha, braseiro, lanterna, luz
       mágica), com alcance, cor e chama trêmula. Vão para
       `estrutura.luzes` na publicação. Na mesa entram nas fontes de luz do
       escuro, e o servidor só manda ao jogador a luz que está em lugar
       revelado.
     - **Água e lava**: as casas `W` e `V` viram retângulos em
       `estrutura.liquidos`. `motor/liquidos.ts` corre uma textura de brilho
       por cima, debaixo da névoa, e fica parada com
       `prefers-reduced-motion`.
     - **Licença no Acervo**: `acervo_itens` ganhou autoria, origem e licença
       (migração 65; lista em `core/acervo.py`, `LICENCAS`), anotadas no botão
       de informação da gaveta. Imagem sem licença mostra um aviso. O mapa
       publicado só com mobília do Jardim sai anotado como próprio.
     - **Correção**: o pincel de chão e a borracha passam pela linha inteira
       entre dois eventos do mouse e não pulam casas.
   - **Conferido**: o Mestre montou uma sala de tábua com rio de água e poça
     de lava e pôs mesa e cadeira da mobília. Juntou as duas com Shift, moveu
     o grupo, salvou como peça pronta e a pôs de novo noutro canto. Pôs uma
     tocha e um braseiro e publicou: a cena chegou com 2 luzes, 10 faixas de
     água e 1 de lava, e a imagem ficou anotada como própria. O painel de
     licença abriu no Acervo e o console ficou limpo.
4. **Paredes vivas**: portas na mesa, bloqueio do arrasto e portais entre
   cenas.
   - **Feito em 2026-11-03**, sem migração (tudo em `mapa_cenas.estrutura`):
     - **Bloqueio** (`plataforma/core/paredes.py`): parede, janela, porta
       secreta e porta fechada ou trancada seguram o token do jogador; a
       porta aberta é um vão. O hub confere o caminho desde a última posição
       gravada no arrastar e no soltar (`RegraToken.x/y`, `Regras.barram` e
       `vaos`), e a rota `mover` faz o mesmo. O token para 0,3 casa antes da
       parede, e quem soltou recebe a posição certa com `barrado`. O Mestre
       atravessa tudo. As paredes não vão ao jogador, porque entregariam o
       que a névoa cobre.
     - **Portas na mesa**: `PUT /mapa/{campanha}/cenas/{cena}/portas`
       `{id, estado?, revelar?}`. O jogador abre e fecha a porta destrancada
       com um token dele a até 1,6 casa do batente, na cena ao vivo. Porta
       secreta ou coberta pela névoa não existe para ele (404). O Mestre abre,
       fecha, tranca e revela a secreta, que vira porta com `era_secreta` (o
       jogador não recebe esse campo) e pode ser escondida de novo. Na mesa,
       o clique na linha da porta (`motor/portasConta.ts`) abre e fecha para
       o jogador, mesmo em cima do token dele; para o Mestre, abre o menu
       (`componentes/MenuPorta.tsx`).
     - **Portal entre cenas**: o portal ganha `cena` (e `cena_nome`), e `b`
       fica na outra cena. Ele é só de ida; a volta é outro portal na outra
       cena. Soltar na entrada grava o token lá (`_levar_para_cena`). Se o
       personagem já tem token na outra cena, aquele vai para a saída e este
       some. A mesa recarrega, quem atravessou recebe `portal_cena`, e quem
       comanda recebe um `aviso` com o nome. O jogador vê só a entrada. No
       painel do portal, "Leva para" escolhe a cena, e "Chegada" escolhe o
       meio dela ou a boca de um portal de lá.
   - **Conferido no navegador**: a parede segurou a Ana (com aviso), o clique
     no batente abriu a porta e ela saiu da sala. A secreta não aparecia para
     ela até o Mestre revelar pelo menu. O portal levou a Mira para a cena
     Medida, com aviso para os dois, e o painel mostrou o destino.
5. **Visão pelas paredes**, com segredo no servidor e memória do explorado.
6. **Extras**: auras, notas, falas, pausa, relógios, trilha, distâncias e
   documentos na mesa.

## Decisões para o Pedro

1. **A hora**: uma só para o mundo, no calendário da campanha, com cenas
   "fora do tempo". A alternativa é uma hora por cena. Recomendação: a do
   calendário.
2. **As peças**: pacote nosso no Blender mais as imagens do acervo, com
   licença anotada. Nenhum pacote de terceiros no repositório.
3. **As portas**: o jogador abre porta destrancada ao lado do token?
   Recomendação: sim. Feito assim na leva 4.
4. **Portal entre cenas**: leva o token mesmo quando a mesa está noutra cena?
   Recomendação: sim, e o Mestre recebe um aviso. Feito assim na leva 4.
