# Mapa ao vivo (VTT da sessão)

Plano revisado em 2026-11-02 com as ideias do Pedro, e conferido na internet no
mesmo dia (seção "O que foi confirmado"). Nada foi implementado ainda.

## O que mudou em relação ao primeiro plano

- O arrasto em tempo real é obrigatório: quando alguém arrasta um token, os outros
  veem o token andando, no estilo do Owlbear.
- Oficina de tokens: a foto do personagem vira token com a moldura escolhida, e o
  site ganha remoção de fundo e melhoria de qualidade de imagem.
- Clima e atmosfera: chuva, neve, neblina e outros efeitos.
- Acervo de mapas e imagens dentro do site, sem limite de quantidade.
- Tela cheia pensada para PC, com iniciativa, ficha e barras de recurso ao lado.

## O que foi confirmado (pesquisa de 2026-11-02)

| Dúvida | Resposta | Fonte |
| --- | --- | --- |
| WebSocket passa pelo proxy da Discloud? | **Sim.** A documentação oficial diz que a Discloud "usa HTTPS/WSS com proxy reverso" e ensina a conectar por `wss://` na porta 443 em apps `TYPE=site`. | Discloud, página do Lavalink |
| O que o plano Diamond dá? | 4 GB de RAM e 4 vCPUs no total da conta, SSD NVMe, banda ilimitada, até 8 sites, VLAN, domínio próprio e banco gerenciado (o banco gerenciado exige Diamond ou acima). Snapshots e backup automático de apps só a partir do Ruby. | discloud.com/plans e API de bancos |
| A RAM do banco conta no plano? | Sim, entra no total de 4 GB junto com os apps. O Postgres pede no mínimo 512 MB. | Discloud, Bancos de Dados |
| Quanto disco o Diamond dá? | **Nenhum teto aparece em lugar nenhum.** A página do plano no Dashboard mostra só RAM (4 GB) e vCPU (4). O `jardim-db` mostra "Armazenamento em uso: 87M", sem limite ao lado. Os únicos add-ons de disco são para VPS (mínimo 100 GB), não para apps e bancos. Os Termos (5.1) dizem que os limites aparecem no Dashboard "conforme o caso"; para disco, não aparece. O número exato só o suporte da Discloud responde. | Dashboard da conta, lido em 2026-11-02 |
| Uso de RAM da conta hoje | 3,67 GB de 4 GB (92%): 2,67 GB em 7 apps e 1 GB em 2 bancos de 512 MB. O `jardim-rpg` tem 650 MB e usa uns 101 MB; o `jardim-db` usa 18% dos 512 MB. Sobra pouco para subir RAM de alguém sem tirar de outro app. | Dashboard da conta |
| Object Storage da Discloud | Existe no menu e nos add-ons como "Em breve": armazenamento de arquivos compatível com S3. Ainda não dá para contratar. | Dashboard da conta, aba Add-ons |
| Backup do banco gerenciado | A Discloud faz backup do banco gerenciado sob demanda (gera dump e link de download). | API da Discloud, Bancos de Dados |
| Cloudflare R2 se faltar disco | 10 GB por mês grátis, download (egress) grátis sempre, depois US$ 0,015 por GB por mês. | Cloudflare, preços do R2 |
| `@pixi/react` serve no site? | **Não.** A versão 8.0.5 exige React 19, e o site está no 18.3. O mapa usa o Pixi direto. | npm |
| Motor do mapa | `pixi.js` 8.22.0 (MIT), com renderizador WebGPU, filtros e `ParticleContainer` nativos. `pixi-viewport` 7.0.0 (MIT, pede Pixi 8). `pixi-filters` 6.1.5 (MIT, pede Pixi 8). | npm e unpkg |
| Emissor de partículas pronto? | `@pixi/particle-emitter` (MIT) não suporta Pixi 8. Os efeitos de clima são escritos por nós com o `ParticleContainer` do Pixi 8. | npm |
| Efeitos do Owlbear | `owlbear-rodeo/weather` e `owlbear-rodeo/dynamic-fog` são GPL-3.0: não dá para copiar o código para o site. | GitHub |
| Projeto Adventure | **Corrigido:** não é MIT. O LICENSE diz "All Rights Reserved". Saiu do plano, nem como referência de código. | GitHub, LICENSE do repositório |
| Remover fundo e melhorar imagem no navegador | Transformers.js 4.3.2 (Apache 2.0) faz as duas coisas: tem a tarefa `background-removal` e a `image-to-image` (Swin2SR), rodando na placa de vídeo com `device: 'webgpu'`. | README do Transformers.js |
| Modelos de remover fundo | BiRefNet lite (MIT, 115 MB em fp16) e MODNet (Apache 2.0, 26 MB em fp32). Na fase 0 só o MODNet rodou certo, sem a placa de vídeo (ver `FASE0.md`). | Hugging Face e medição da fase 0 |
| Modelos de melhorar qualidade | Real-ESRGAN oficial (BSD 3): o `realesr-general-x4v3` tem só 5 MB; o `x4plus` 67 MB; o de desenho 18 MB. Swin2SR (Apache 2.0, 32 MB em fp16) como alternativa pelo Transformers.js. | GitHub xinntao/Real-ESRGAN, Hugging Face |
| O que fica de fora por licença | `@imgly/background-removal` (AGPL-3.0, conferido no LICENSE), RMBG 1.4 e 2.0 da Bria (licença própria, sem uso comercial), ISNet em ONNX (AGPL-3.0), `upscalejs` (não declara licença). | npm, unpkg, Hugging Face |

## A tela

```
+----------------------------------------------------------------------+
| Cena: Ruínas   | 5 online | Clima: chuva forte |            [tela cheia]|
+----+---------------------------------------------------+-------------+
| Sel|                                                   | Iniciativa  |
| Mão|                                                   | Ficha       |
| Rég|                                                   | Rolagens    |
| Pin|              MAPA (ocupa a tela toda)             | Mesa        |
| Des|                                                   |             |
| Név|                                                   | (recolhe e  |
| Cli|                                                   |  muda de    |
| Ace|                                                   |  largura)   |
+----+---------------------------------------------------+-------------+
| Cenas do Mestre:  [Taverna]  [Estrada]  [Ruínas]  [+]                 |
+----------------------------------------------------------------------+
```

- **Ferramentas à esquerda:** selecionar e mover token, mover o mapa, régua, ping,
  desenho, névoa de guerra (Mestre), clima (Mestre), acervo (Mestre).
- **Painel à direita**, recolhível e com largura ajustável:
  - *Iniciativa:* o `InitiativeTracker` em versão compacta. Clicar num nome
    centraliza o mapa no token dele.
  - *Ficha:* o jogador abre a própria ficha no formato do Modo Mesa, que já existe
    (`src/pages/Ficha/components/ModoMesa.tsx`), e rola dali mesmo.
  - *Rolagens:* o registro da mesa.
  - *Mesa:* relógios, cronômetros, bilhetes e votação, que já existem.
- **Faixa de cenas embaixo**, só para o Mestre: os mapas preparados para a sessão.
  Um clique troca a cena de todo mundo.
- Botão de tela cheia de verdade (Fullscreen API), sem barra do navegador.
- No celular a tela abre e funciona (pinça para zoom, o painel vira gaveta de baixo),
  mas o desenho é para PC.

## Tokens

- **Origem:** a foto da ficha (já salva em 512 px), uma imagem do acervo ou uma
  imagem nova.
- **Transformar em token:** recorte redondo (arrastar e dar zoom, como o ajuste de
  foto da ficha), escolha da moldura, e o token fica salvo no acervo.
- **Molduras:**
  - *Moldura do nível:* a mesma do retrato da ficha, que muda a cada 5 níveis até
    o 500 (`molduraDoRetrato` em `src/pages/Ficha/utils/retrato.ts`), redesenhada
    para o mapa.
  - *Catálogo de molduras* feitas por nós: ferro, ouro, madeira, osso, runa,
    cristal, raiz, sombra e uma por Fluxo. Sem arte de terceiros.
  - O Mestre pode travar uma moldura para a mesa inteira (todos usam a mesma).
  - A cor do aro marca o lado: jogador, aliado, inimigo, neutro.
- **Porte:** 1x1, 2x2, 3x3, 4x4, pelo tamanho da criatura.
- **Barras em cima do token:** Vida, Mana e Estamina vêm do participante da sessão;
  Sanidade vem da ficha (`status.sanidadeAtual`). Cada dono escolhe quais barras
  aparecem e para quem: todos, só ele e o Mestre, ou ninguém. No monstro, o jogador
  continua vendo só a barra aproximada que já vê hoje, porque o servidor manda o
  recorte do papel dele.
- Ícones de condição no token (as condições já existem na sessão).
- O token da vez acende quando a iniciativa chega nele.

## Tempo real

- **WebSocket por campanha** (`wss://`, confirmado na documentação da Discloud).
  Durante o arrasto, o navegador manda a posição umas 20 vezes por segundo e o
  servidor só repassa, sem gravar. Ao soltar, o servidor grava no banco e todos
  recebem a posição final.
- Do outro lado, o token desliza entre as posições recebidas (interpolação), com
  um colchão que se ajusta à rede (maior atraso recente + maior intervalo entre
  envios). Medido na fase 0: liso como no Mestre, uns 200 ms atrás numa rede
  comum e uns 430 ms numa rede ruim. Sem o colchão ajustável, tremia.
- A mesma conexão leva ping, régua que os outros veem, cursores (opcional) e desenho.
- Batimento a cada 20 segundos, como o SSE de hoje já faz, para o proxy não cortar
  uma conexão parada. A documentação não informa tempo limite de conexão ociosa.
- **Segredos:** token escondido, desenho do Mestre e névoa só seguem para conexões
  de quem comanda a mesa. O servidor confere cada mensagem: o jogador mexe só no
  próprio token, e o Mestre pode liberar "qualquer um mexe em qualquer token".
- **Segurança:** a conexão usa o cookie de login, então o servidor confere a origem
  (`Origin`) na abertura para outro site não abrir a conexão em nome do jogador.
- **Plano B**, só se algo der errado na prática: o mesmo protocolo roda em SSE para
  descer (já funciona lá) e POST para subir.
- **Carga:** a plataforma tem 650 MB no Dashboard e usa uns 101 MB. Uma mesa de 6
  pessoas com um token sendo arrastado dá cerca de 20 mensagens pequenas por
  segundo para cada pessoa, e o arrasto não toca no banco. Cabe na folga que já
  existe; a conta está em 92% dos 4 GB, então subir RAM exigiria tirar de outro app.
  As imagens são processadas no navegador, nunca no servidor, justamente para não
  pesar na RAM.

## Acervo

- Biblioteca do Mestre dentro do site, com pastas, etiquetas, busca e miniaturas.
  Tipos: mapas, tokens e objetos (porta, baú, fogueira).
- Subir a pasta inteira do PC de uma vez, mantendo as subpastas (o navegador deixa
  escolher uma pasta). Arrastar arquivos do Explorador direto para o acervo ou para
  o mapa.
- **Sem limite de quantidade.** Só um teto por arquivo (por exemplo 50 MB) para um
  arquivo quebrado não travar o servidor, e um contador de quanto o acervo ocupa no
  Painel, comparado com o disco do plano.
- O navegador converte para WebP e gera a miniatura antes de subir. O servidor
  guarda e serve com cache longo, então a segunda abertura de um mapa vem do PC.
- **Envio em pedaços:** a Discloud não documenta o tamanho máximo de uma requisição
  no proxy, então nenhum envio passa de uns 2 MB. Cada ladrilho vai num pedido, e o
  original vai fatiado.
- **Ladrilhos:** mapas grandes são cortados em pedaços de 1024 px. Isso resolve o
  limite de textura da placa de vídeo (um mapa de 12000 px não cabe numa textura
  só) e permite a névoa de guerra com segredo de verdade (ver abaixo).
- **Níveis de detalhe:** além dos ladrilhos inteiros, uma versão em 1/4 do
  tamanho para quando o zoom está longe. Um mapa de 8000 px ocupa 256 MB de
  memória de vídeo inteiro; numa placa integrada isso pesa.
- **Onde guardar:** começa no Postgres, numa tabela própria, que é o caminho sem
  conta nova (o banco tem 87 MB hoje). O código do acervo fala com uma camada de
  armazenamento com duas versões: Postgres e S3. A versão S3 serve tanto para o
  Cloudflare R2 (10 GB grátis, download grátis) quanto para o Object Storage da
  Discloud, que está "em breve" e também é compatível com S3. Trocar de lugar vira
  uma configuração e uma cópia, sem reescrever o acervo.
- **Teto de disco:** a Discloud não mostra teto de disco no Diamond. Até o suporte
  responder, o contador do Painel avisa quando o acervo passar de 2 GB, para
  decidir com calma se migra para S3.
- **Backup:** imagem dentro do backup diário em JSONL deixaria o arquivo enorme, e
  imagem quase não comprime. A tabela dos arquivos fica fora do JSONL (em
  `TABELAS_IGNORADAS`, com o motivo escrito ao lado) e ganha um backup próprio, que
  baixa um ZIP só com o que entrou desde o último. A tabela dos metadados (pastas,
  nomes, etiquetas) entra em `TABELAS` normalmente. O backup do banco gerenciado da
  Discloud cobre tudo junto, como segunda rede.

## Oficina de imagem

Roda no navegador de quem usa, com a placa de vídeo (WebGPU). Não pesa no servidor
e não custa nada. Cada modelo baixa uma vez e fica guardado no navegador.

- **Remover fundo:** Transformers.js com MODNet (Apache 2.0, 26 MB) rodando sem a
  placa de vídeo: 1,4 s por imagem e 94% de acerto no teste da fase 0. Na placa
  de vídeo ele sai errado e o BiRefNet nem roda, por defeitos do ONNX Runtime
  WebGPU de hoje (ver `FASE0.md`); testar de novo a cada atualização. Depois do
  corte automático, pincel de apagar e de restaurar para os acertos finos.
- **Melhorar qualidade:** Real-ESRGAN (BSD 3) no ONNX Runtime Web (MIT), 2x ou 4x,
  processado em ladrilhos para não estourar a memória. O modelo geral tem 5 MB e o
  de desenho 18 MB. O arquivo ONNX é exportado por nós a partir dos pesos oficiais
  e servido pelo próprio site, em vez de baixar de um envio desconhecido. Na fase
  0, o geral fez 1,5 s por megapixel na placa de vídeo: um mapa de 2000 px leva
  uns 6 s, um de 4000 px uns 25 s, com barra de progresso. O original fica
  guardado e a versão melhorada entra como nova versão no acervo.
- **Inimigo na hora:** imagem, remover fundo, recorte, moldura, e o token vai para o
  mapa. Se o Mestre quiser, já nasce o participante da sessão ligado a uma criatura
  do bestiário, e o token entra na iniciativa.

## Névoa de guerra

- O Mestre revela e esconde com pincel, retângulo e polígono. O jogador vê escuro
  onde não foi revelado; o Mestre vê tudo, com a névoa translúcida por cima.
- **Segredo de verdade:** com os ladrilhos, o servidor só entrega ao jogador os
  pedaços do mapa que tocam área revelada. O resto nunca sai do servidor, nem pelo
  DevTools. Fica exposta no máximo a borda de um ladrilho em volta do que foi
  revelado, e na tela ela continua coberta.
- Token escondido sob a névoa também não vai para o jogador.

## Clima e atmosfera

Nada pronto serve: as extensões do Owlbear são GPL-3.0, o Adventure é proprietário,
o emissor de partículas do Pixi não roda no Pixi 8 e o tsParticles não desenha
dentro do mapa acompanhando o zoom. Os efeitos são escritos por nós, com o
`ParticleContainer` e os filtros do Pixi 8, e `pixi-filters` (MIT) para extras como
raios de luz, filme antigo (bom para flashback) e distorção (calor, água).

- **Lista inicial:** chuva (fraca, forte, tempestade com relâmpago), neve, neblina
  que se move, tempestade de areia, cinzas e brasas, folhas, escuridão com luz em
  volta dos tokens.
- **Depois:** efeitos do Jardim, como um véu do Vazio ou partículas na cor de um
  Fluxo.
- **Controles do Mestre:** intensidade, direção e força do vento, mapa inteiro ou
  só uma área.

## Motor do mapa

- **PixiJS 8** (MIT), em WebGPU com volta automática para WebGL: aguenta mapa
  grande, dezenas de tokens e os efeitos.
- **pixi-viewport 7** (MIT) para arrastar, dar zoom e pinça.
- O mapa roda o Pixi direto dentro de um componente, sem o `@pixi/react` (que exige
  React 19). Assim o arrasto a 60 quadros por segundo não passa pelo React, e os
  painéis em volta continuam em React normal.
- **Camadas:** mapa, grade, objetos, tokens, desenhos, névoa de guerra, clima e
  interface (régua, ping, seleção).
- **Grade** quadrada ou hexagonal, calibrável em cima do mapa (arrastar e esticar a
  grade até casar com a do desenho). 1 quadrado = 1,5 m, como nas regras; a régua
  mostra metros e quadrados.

## Peças no código

Segue o molde da mesa ao vivo (`plataforma/core/mesa.py`):

- `plataforma/core/mapa.py`: regras puras, sem banco nem HTTP. Recebe estado, ação
  e quem age, valida e devolve o estado novo; `visao` recorta por papel.
- `plataforma/core/tempo_real.py`: o hub do WebSocket, em memória (um processo só,
  como o `live_session.py`).
- `plataforma/routers/mapa.py` e `plataforma/routers/acervo.py`.
- Migrações: cenas, tokens, acervo (metadados) e acervo (arquivos e ladrilhos).
- `src/pages/Sessao/mapa/`: o motor Pixi, as ferramentas e a tela cheia.
- `src/pages/Mestre/acervo/` e `src/pages/Mestre/oficina/`.
- `src/store/useMapaStore.ts`.

## Fases

0. **Provas curtas, antes de tudo** (feitas em 2026-11-02, ver `FASE0.md`)
   - Pixi 8 + pixi-viewport no React 18, mapa de 8000 px e 30 tokens: 60 quadros
     por segundo em WebGPU e WebGL, inclusive com o processador 4x mais lento.
   - Arrasto em tempo real com rede simulada: liso, uns 200 ms de atraso.
   - Remover fundo (MODNet, 1,4 s) e melhorar qualidade (Real-ESRGAN, 1,5 s por
     megapixel) rodando no PC.
   - Falta: um WebSocket de verdade na Discloud. Precisa subir uma versão, então
     só com pedido seu; pode ir junto com a primeira entrega da fase 1.
1. **Mapa ao vivo:** tela cheia, acervo (pastas, subir pasta, sem limite), cena com
   grade, tokens dos participantes com foto e moldura do nível, arrasto em tempo
   real, permissões, token escondido, ping, régua, painel com iniciativa, ficha e
   rolagens, barras com opção de esconder.
   **Entregue em 2026-11-02, sem commit.** Peças: migração 59 (`acervo_*`,
   `mapa_cenas`, `mapa_tokens`), `core/mapa.py`, `core/acervo.py`,
   `core/tempo_real.py`, `routers/mapa.py`, `routers/acervo.py`, a página
   `/mapa` (`src/pages/Mapa/`) e o botão Mapa na Sessão. Conferido com duas
   pessoas em Chrome de verdade contra o banco descartável: o Mestre vê o token
   da jogadora andando antes de ela soltar, o token encaixa na grade, o oculto e
   o desconhecido seguem os degraus da Sessão, esconder um token tira ele da tela
   do jogador na hora, ping e régua chegam ao outro lado, a ficha abre embutida
   no painel. Em produção (2026-11-02), o WebSocket abriu pelo Cloudflare e pelo
   proxy da Discloud em 0,4 s, com ida e volta de uns 173 ms do PC do Pedro, e o
   Mapa mostrou "Tempo real ligado". Ficou de fora ou falta conferir:
   - uso no celular (o layout existe, não foi testado);
   - backup próprio do acervo (os ladrilhos estão fora do JSONL, ver `core/backup.py`).
2. **Oficina de tokens:** transformar em token, catálogo de molduras, moldura da
   mesa, remover fundo, melhorar qualidade, inimigo na hora, porte, condições no
   token.

   **Feita em 2026-11-02.** Migração 60 (`mapa_tokens.moldura`, `personagem_token`
   com moldura e enquadramento da foto, `mapa_campanha.moldura_mesa`); molduras
   desenhadas por nós em `src/pages/Mapa/motor/molduras.ts` (do nível, Simples,
   8 de material e uma por Fluxo, com as cores travadas por teste contra
   `FLUXO_TEMAS`); ordem de prioridade: mesa, token, personagem, padrão; o
   desconhecido sempre recebe o aro simples. A Oficina
   (`src/pages/Mapa/oficina/`) roda no PC do Mestre com ONNX Runtime Web: MODNet
   sem a placa de vídeo para remover fundo (o modelo vem do Hugging Face) e
   Real-ESRGAN na placa para melhorar 2x ou 4x (o modelo é o nosso, em
   `modelos/`, servido pelo jsDelivr; o `.wasm` do ONNX Runtime também vem do
   CDN, pela condição `onnxruntime-web-use-extern-wasm` no `vite.config.ts`,
   para o ZIP não passar de 100 MB). Conferido com duas pessoas: recorte com 70%
   de transparência na imagem de teste, 2x em 1,6 s, token novo na cena e na
   iniciativa com a moldura escolhida, moldura e zoom do jogador gravados,
   moldura da mesa valendo para todos.
3. **Névoa de guerra e clima:** névoa com ladrilhos e os efeitos de atmosfera.

   **Feita em 2026-11-02.** Migração 61 (`mapa_cenas.nevoa`, `nevoa_ladrilhos`,
   `clima`). A névoa é uma lista de formas em ordem (retângulo, polígono, pincel;
   cada uma revela ou esconde) e a conta mora em `plataforma/core/nevoa.py`: um
   ponto está à vista quando a última forma que o contém revela. A cada mudança
   da névoa ou do mapa, o servidor refaz a lista de ladrilhos que o jogador pode
   baixar (grade de até 256 células por lado, generosa para o lado da imagem: a
   célula tocada por uma forma que revela conta inteira); o acervo confere a chave
   pedida contra essa lista. A versão em 1/4 de um pedaço só sai quando todos os
   ladrilhos cheios dele saem, e a miniatura nunca sai com a névoa ligada.
   Monstro, NPC e objeto com o centro coberto não vão para o jogador, nem pelo GET
   nem pelo arrasto em tempo real; saindo da névoa no meio do arrasto, a posição
   vai para o banco e a mesa recarrega; entrando, os jogadores recebem `sumiu`.
   Personagem de jogador segue sempre à vista. O que o jogador baixou antes de a
   névoa ligar fica no aparelho dele (o pedaço tem cache longo); a barra da névoa
   avisa o Mestre disso numa cena que já está na mesa.
   Na tela, a névoa é pintada numa textura do tamanho do mapa (opaca para o
   jogador, translúcida para o Mestre) e o clima (`src/pages/Mapa/motor/clima.ts`)
   é escrito por nós com o `ParticleContainer`: chuva, tempestade com clarão
   (desligado para quem pede menos movimento), neve, neblina, tempestade de areia,
   cinzas e brasas, folhas, escuridão com luz em volta de jogadores e aliados, véu
   do Vazio e partículas na cor de um Fluxo; até 4 juntos, cada um no mapa inteiro
   ou numa área de borda suave, com vento da cena. Cada aparelho pode desligar os
   efeitos só para si. Conferido com duas pessoas no Chrome com placa de vídeo: a
   jogadora que abriu o mapa com a névoa ligada pediu só o ladrilho revelado, e
   pedir os outros direto (sem cache) deu 404, inclusive a versão reduzida e a
   miniatura; o dragão apareceu para ela ao sair da névoa no arrasto do Mestre e
   sumiu ao voltar; 60 quadros por segundo com chuva e neblina.
3.5. **Dar vida aos efeitos** (pedido do Pedro em 2026-11-02, depois de comparar
   com o Owlbear). As extensões dele (Weather, Dynamic Fog) servem só de
   referência visual: são GPL-3.0 e rodam no motor do próprio Owlbear. Os efeitos
   são escritos do zero, em shaders nossos (GLSL para WebGL e WGSL para WebGPU),
   sem traduzir código de lá. Ordem:
   1. **Névoa viva. Feita em 2026-11-02.** Um shader desenha a névoa por cima da
      mesma máscara de antes (`src/pages/Mapa/motor/nevoa.ts`): fumaça que anda
      devagar, borda que treme e esfiapa (com grão fino para o zoom de perto),
      dissolve de 0,75 s ao revelar, esconder, ligar e desligar (duas máscaras
      que se revezam), parada para quem pede menos movimento. O ruído é uma
      textura que emenda, e não conta feita por pixel: 8 leituras de textura
      por pixel. Medido no Chrome com placa de vídeo: 60 quadros em 1600x900 e
      2560x1440, em WebGPU e em WebGL (`?motor=webgl` força o WebGL). Sem placa
      (desenho no processador, pior caso), 32 quadros sem a névoa e 23 com ela.
   2. **Clima em shader. Feito em 2026-11-02.** `src/pages/Mapa/motor/climaShader.ts`
      tem a "atmosfera" (um retângulo sobre o pedaço do mapa na tela) com três
      partes que cada efeito liga: chuva em três camadas de profundidade com
      respingos no chão (só de perto), sombras de nuvens que andam com o vento e
      o clarão do relâmpago passando mais forte onde as nuvens abrem, e um véu
      de ruído com forma ajustável (neblina macia, poeira de areia esticada no
      vento, Véu do Vazio que pulsa, brilho de Fluxo que soma luz). O calor é
      um filtro na camada do mapa e da grade (os tokens ficam firmes). Neve,
      folhas, cinzas, brasas e grãos de areia seguem em partículas. Dois
      efeitos novos no servidor e no painel: `nuvens` (Sombras de nuvens) e
      `calor`. A textura de ruído é uma só para a névoa e o clima
      (`motor/ruido.ts`) e vive enquanto a aba estiver aberta. Medido: 60
      quadros com tempestade, neblina, nuvens e calor juntos, em 1600x900 e
      2560x1440, em WebGPU e WebGL. Os shaders são travados por teste
      (`tests/frontend/climaShader.test.ts`).
   3. **Luz que vive. Feita em 2026-11-03.** Migração 62 (`mapa_tokens.luz`:
      raio em casas, cor, se tremula; `normalizar_luz` em `core/mapa.py`); o
      Mestre e o dono do token mudam pelo menu do token (atalhos vela, tocha,
      lanterna e luz mágica). Cada luz soma um brilho na cor dela embaixo do
      token (`motor/luzes.ts`) e abre a escuridão do clima no próprio alcance,
      com o mesmo tremor de chama (`motor/luzesConta.ts`); personagem de
      jogador e aliado sem luz própria segue abrindo a escuridão no alcance
      padrão do efeito.
   4. **Efeitos de magia. Feitos em 2026-11-03.** Ferramenta de magia (tecla M)
      para todos: círculo, cone de 60 graus, linha de uma casa e impacto (com
      projétil quando há distância), na cor de um dos 11 Fluxos, desenhados por
      nós (`motor/magia.ts`, sem JB2A). A mira mostra o tamanho em casas e
      metros. O efeito passa pelo tempo real (mensagem `magia`, conferida por
      `normalizar_magia`; no máximo 3 a cada 2 segundos por pessoa) com o nome
      de quem lançou, e nada é gravado. Fora da cena na mesa, só quem lança vê.
   5. **Vida nos tokens. Feita em 2026-11-03.** `motor/token.ts`: entrada com
      quique, saída encolhendo (tirado, escondido, entrou na névoa), clarão
      vermelho com tremor quando a Vida que a pessoa vê cai e anel verde quando
      sobe, brilho dourado com arcos girando na vez, e o token "no ar" com
      sombra no arrasto, também na tela de quem só assiste. A textura de brilho
      é de todos os palcos e não é destruída ao fechar o mapa (sem isso, voltar
      ao mapa deixava a tela preta).
   Conferido em 2026-11-03 com Mestre e jogadora (Vite e API paralelos, banco
   descartável): tocha da jogadora chega ao Mestre e tremula, magias nos dois
   sentidos com o nome de quem lançou, clarão de dano pela rota da Sessão,
   token no ar nas duas telas, saída e entrada animadas, 61 quadros por
   segundo e nenhum aviso no console.
3.6. **Página arrumada. Feita em 2026-11-03** (pedido do Pedro). Barra da esquerda
   em grupos rotulados (Mesa: mover, régua, ping, magia; Vista: ver o mapa inteiro,
   ir até o meu personagem, centralizar no escolhido, clima neste aparelho;
   Mestre: névoa, clima, trazer participantes, acervo, oficina), cada botão com a
   dica do site (nome e atalho, `componentes/BotaoFerramenta.tsx`) no lugar do
   `title` do navegador. O topo mostra a rodada e de quem é a vez (o nome só sai
   quando a entidade da vez está na iniciativa de quem olha, então o jogador não
   descobre quem está escondido). Painel lateral: Iniciativa só com número e nome
   (clicar centraliza o token); Fichas com um cartão por personagem de jogador no
   mapa (retrato, nível, barras e condições que o token já mostra), e o clique
   abre a ficha embutida (`/ficha/{id}?embutida=1`) para o dono e o Mestre, os
   únicos que recebem o `personagem_id`. Nenhum `window.prompt` sobrou no mapa:
   nova cena e nova pasta usam `pedirTexto` (caixa do site com campo), o medidor
   mostra o resumo num campo quando o navegador não deixa copiar, e os erros com
   o mapa aberto saem nos avisos do site. Nome comprido no token fica abreviado
   numa palavra inteira (`abreviarNome`, 18 letras) e aparece inteiro com o
   mouse em cima ou com o token escolhido.
4. **Extras:** cenas preparadas e troca rápida, desenho livre, áreas de magia (cone,
   linha, círculo, com o tamanho tirado da magia), luz e visão com paredes,
   cursores, dado 3D caindo no mapa.

Cada fase fecha com testes, entrada no mural de novidades e commit só com pedido.

## Decisões abertas

1. **Teto de disco:** perguntar ao suporte da Discloud qual o limite de disco de um
   banco gerenciado no Diamond. Não trava o começo: o acervo nasce no Postgres com
   a porta para S3 pronta.
2. **Quem mexe em quê:** proposta é jogador só no próprio token, Mestre em tudo, e
   uma chave do Mestre para liberar geral.
3. **WebSocket de teste no ar:** só com pedido seu.

## Fontes da pesquisa

- [Discloud: Lavalink (HTTPS/WSS com proxy reverso)](https://docs.discloud.com/api-and-integrations/lavalink.md)
- [Discloud: Websites e APIs](https://docs.discloud.com/how-to-host/websites-and-apis.md)
- [Discloud: planos](https://discloud.com/plans)
- [Discloud: Termos (5.1, limites no Dashboard)](https://discloud.com/legal)
- [Discloud: Bancos de Dados](https://docs.discloud.com/api-and-integrations/databases.md)
- [Discloud: API de bancos (Diamond, backups)](https://docs.discloud.com/api-and-integrations/api-overview/database.md)
- [Cloudflare R2: preços](https://developers.cloudflare.com/r2/pricing/)
- [PixiJS](https://github.com/pixijs/pixijs), [pixi-viewport](https://github.com/pixijs-userland/pixi-viewport), [pixi-filters](https://github.com/pixijs/filters)
- [@pixi/react no npm (peer React 19)](https://www.npmjs.com/package/@pixi/react)
- [@pixi/particle-emitter no npm (Pixi abaixo do 8)](https://www.npmjs.com/package/@pixi/particle-emitter)
- [Owlbear weather (GPL-3.0)](https://github.com/owlbear-rodeo/weather), [Owlbear dynamic-fog (GPL-3.0)](https://github.com/owlbear-rodeo/dynamic-fog)
- [Adventure (All Rights Reserved)](https://github.com/Talador12/adventure)
- [Transformers.js](https://github.com/huggingface/transformers.js)
- [BiRefNet lite em ONNX (MIT)](https://huggingface.co/onnx-community/BiRefNet_lite-ONNX), [MODNet (Apache 2.0)](https://huggingface.co/Xenova/modnet)
- [Real-ESRGAN (BSD 3)](https://github.com/xinntao/Real-ESRGAN), [Swin2SR (Apache 2.0)](https://huggingface.co/caidas/swin2SR-realworld-sr-x4-64-bsrgan-psnr)
- [@imgly/background-removal (AGPL-3.0)](https://www.npmjs.com/package/@imgly/background-removal), [RMBG 1.4 da Bria](https://huggingface.co/briaai/RMBG-1.4)
