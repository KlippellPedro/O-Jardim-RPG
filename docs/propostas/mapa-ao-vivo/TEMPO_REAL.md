# Mapa ao vivo: por que demora e como deixar tudo instantâneo

Análise de 2026-11-02, feita a partir do relatório do GPT e de medições novas
(produção e ambiente local com duas telas). O pedido: o que um mexe, os outros
veem na hora, como nos VTTs conhecidos.

## O que foi medido

**Produção** (jardim-rpg.discloud.app, a partir do PC do Pedro, sem gravar nada:
mensagens de régua vazia e o batimento `oi`):

| Caminho | Mediana | Pior |
|---|---|---|
| Ida e volta pelo WebSocket (`oi`) | 142 ms | 147 ms |
| Repasse de uma conexão para outra (240 mensagens, 20 por segundo) | 141 ms | 155 ms |
| Plano B, descida pelo SSE | 142 ms | 180 ms |
| Plano B, subida pelo POST | 177 ms | 323 ms |
| GET do estado do mapa (cena vazia) | 178 ms | 192 ms |
| GET `/saude` (referência) | 159 ms | 170 ms |

A rede até a Discloud é estável: 142 ms de ida e volta, sem picos, nem no plano B.
Esses 142 ms são distância e rede; código nenhum tira. As cenas de produção
estavam sem tokens na hora da medida, então o custo de uma cena cheia foi medido
no ambiente local.

**Local** (banco descartável, cena com 8 tokens, Mestre e Ana em telas separadas,
mesmo relógio):

| O que | Tempo até a outra tela |
|---|---|
| Token arrastado pelo Mestre | 83 ms atrás da mão dele, constante, sem tranco ao soltar |
| Token novo criado pelo Mestre | 314 ms |
| Vida mudada na Sessão, barra no mapa | 314 ms |
| Redesenho de todos os tokens ao receber o estado | 0,6 ms |

**Estimativa em produção** (local + rede de 142 ms):

| O que | Hoje |
|---|---|
| Arrasto | uns 220 ms atrás da mão de quem arrasta |
| Token novo, edição, barras, condições, névoa, clima | uns 600 a 800 ms, mais o retrato do token |

Nenhum caminho medido chega a segundos. Os segundos que o Pedro viu vêm de uma
destas causas (as três primeiras estão no código; a última depende de como foi o
teste):

1. **Consulta ao banco dentro do laço do servidor.** O canal de eventos da
   campanha (`/api/v1/sessao/{campanha}/eventos`, `acompanhar` em
   `plataforma/routers/sessions.py`) é `async` e abre uma conexão do banco direto
   no laço. Todo aparelho abre esse canal (ficha, sessão, mapa) e reabre a cada
   queda. Enquanto ele espera o banco, o servidor inteiro para, inclusive o
   repasse do arrasto. Se as 10 conexões do pool estiverem ocupadas (logo depois
   de uma subida de versão, quando todos reconectam, ou numa rodada movimentada),
   a espera vai até 10 s.
2. **O plano B nunca volta ao WebSocket.** Depois de duas falhas seguidas do
   WebSocket (o que acontece em toda troca de versão na Discloud, como visto hoje
   no console), `ConexaoMapa` passa ao SSE + POST e fica nele até a aba ser
   recarregada. O plano B medido é só uns 100 ms mais lento, mas manda cada lote
   num POST novo, com mais chance de atraso numa rede ruim.
3. **Mensagens perdidas com a fila cheia.** Quando a fila de saída de uma
   conexão enche (aparelho lento, rede travando), `Conexao.entregar` descarta a
   mensagem, até a posição final de um token e o aviso `mudou`. A tela daquela
   pessoa fica errada até a próxima recarga, o que parece "o token demorou a
   mexer".
4. **Aba ou janela sem foco.** O navegador para de desenhar em aba de fundo e em
   janela minimizada ou coberta; o navegador embutido do app do Claude desenha a 2
   quadros por segundo sem foco. Num teste com duas abas ou janelas no mesmo PC, o
   token "pula" segundos depois, quando a aba volta à frente.

## O relatório do GPT

Acertos:

- A espera fixa de 250 ms seguida do GET completo é o maior atraso nas mudanças
  (token criado, editado, removido, barras). Vale trocar por mudanças que chegam
  prontas pelo WebSocket.
- A interpolação atrasa o arrasto de propósito, para o movimento ficar liso.
- Medir antes de mexer, e não subir o ritmo de envio às cegas por causa do limite
  de 60 mensagens por segundo.

Ajustes:

- Os "200 ms e 430 ms" citados são da prova da fase 0, com rede simulada. A rede
  real medida agora é de 142 ms estáveis, e o colchão da interpolação local é de
  83 ms.
- Ficaram de fora as três causas de travada no código (banco no laço do servidor,
  plano B que não volta, fila que descarta a posição final) e o efeito de aba sem
  foco nos testes.

## Andamento

- **Etapas 1 e 2 feitas em 2026-11-02, sem commit.** O medidor abre pelo ícone de
  conexão ou com Ctrl+Shift+D (`src/pages/Mapa/medidor.ts` e
  `componentes/Medidor.tsx`; o batimento `oi` leva `c` e o servidor devolve, e o
  arrasto leva `tm`, a hora do gesto). No servidor: `acompanhar` consulta o banco
  numa thread; as regras vencidas recarregam em segundo plano, com a geração da
  sala capturada na hora do pedido; ao soltar, a posição é repassada antes de
  gravar; a fila de cada conexão junta as posições do mesmo token e da régua de
  cada pessoa, e cheia vira `mudou` com `motivo: "fila"`. No navegador, o plano B
  tenta o WebSocket a cada 30 s. Conferido com duas telas: o medidor mostra o
  arrasto chegando, e uma página presa no plano B voltou ao WebSocket 30 s depois
  de ele voltar a passar.
- **Etapa 3 feita em 2026-11-03, sem commit.** Depois de cada mudança (rotas do
  mapa e `live_session.publicar`, menos os eventos que não mexem no mapa), o hub
  junta o que chega em 30 ms e pede à rota o estado de cada conexão
  (`_estados_sync`, a mesma `_montar` do GET, numa thread). `tempo_real.diferenca`
  compara com o último mandado àquela conexão e manda `estado` (primeira vez ou
  outra cena) ou `delta` (campos, `mudar`, `tirar`, `ordem`), numerados (`seq`).
  O navegador aplica (`src/pages/Mapa/delta.ts`); número pulado, outra cena ou
  `mudou` ainda baixam o mapa inteiro. O Mestre avisa a cena que olha (`vendo`).
  Com o tempo real ligado, os eventos da campanha não recarregam mais o mapa.
  Medido com duas telas no local: token novo de 314 ms para 104 ms, barra de vida
  de 319 ms para 85 ms, e nenhuma recarga do mapa inteiro na tela da jogadora.
- **Etapa 4 feita em 2026-11-03, sem commit.** O arrasto sai 30 vezes por segundo,
  junto com o quadro da tela (a última posição sai mesmo com a mão parada, e ela
  é repetida uma vez quando a mão para). Quem recebe interpola pela hora do gesto
  (`tm`), que tem o espaçamento de quem arrasta, em vez da hora de chegada ao
  servidor. O colchão usa o percentil 95 do atraso de chegada (3 s) e o percentil
  90 do intervalo; o relógio do desenho só anda para a frente e corrige a
  diferença de leve (até 10% mais rápido, 30% mais devagar, com faixa morta de
  8 ms). Faltando a próxima posição, o token segue na direção em que ia por até um
  intervalo e meio. Limite por conexão de 60 para 90 mensagens por segundo.
  Medido no navegador com rede simulada de 60 a 120 ms de ida: de 220 ms para 162
  a 184 ms atrás da mão; sem rede, de 100 para 75 ms; sem recuos. Na simulação com
  as mesmas entradas para o antigo e o novo (arrasto de 10 s): rede comum de 234
  para 207 ms e liso; rede com variação de 323 para 265 ms sem recuos; rede com
  picos de 250 ms em 3% das mensagens de 484 para 379 ms, maior parada de 203
  para 127 ms. Uma memória do pico que se apaga aos poucos foi testada e ficou de
  fora: ganhava 3 quadros parados e custava 19 ms.
- Etapa 5: por fazer.

## Plano

Ordem pensada para tirar primeiro as travadas e depois cortar o atraso que sobra.
Cada etapa fecha com testes e medição antes e depois.

### Etapa 1: medidor na tela (pequena)

Um painel escondido no mapa (Ctrl+Shift+D) com, ao vivo:

- tipo da conexão (WebSocket ou plano B) e ida e volta, medida pelo `oi` a cada 2 s;
- o colchão atual da interpolação e o atraso do último movimento recebido;
- quanto levou a última atualização do estado e quantas chegaram no último minuto;
- quadros por segundo e se a aba está em segundo plano.

Serve para a próxima sessão de verdade: se alguém disser "demorou", o painel
mostra onde (rede, servidor, aparelho ou aba sem foco).

### Etapa 2: tirar as travadas (pequena a média)

1. `acompanhar`: a consulta ao banco vai para uma thread (`run_in_threadpool`),
   como o mapa já faz. Nenhuma espera de banco congela o tempo real.
2. `ConexaoMapa`: no plano B, tenta o WebSocket de novo a cada 30 s e troca de
   volta quando ele abre.
3. Regras do tempo real: com as regras vencidas (a cada 5 s), o arrasto usa as
   antigas e a recarga acontece em segundo plano. Hoje a mensagem espera o banco.
4. Soltar o token: repassa a posição final antes de gravar no banco (hoje grava e
   depois repassa). Se a gravação falhar, avisa e a mesa recarrega.
5. Fila de saída: a posição de arrasto fica só a mais nova de cada token (as
   intermediárias velhas saem), e uma fila cheia vira "recarregue a cena" em vez
   de perder a posição final ou o `mudou`.

### Etapa 3: mudanças chegam prontas (média a grande, o maior ganho)

Hoje cada mudança manda só "mudou"; cada aparelho espera 250 ms e baixa o mapa
inteiro. A troca:

- Depois de cada mudança (token criado, editado, removido ou movido pela rota;
  névoa, clima, grade, troca de cena, moldura; e, vindo da Sessão, vida, mana,
  estamina, condições, visibilidade e iniciativa), o servidor calcula o recorte de
  cada pessoa conectada e manda só o que mudou: `{t: 'delta', seq, tokens: {mudar,
  tirar}, cena}`.
- O recorte usa as mesmas funções de hoje (`core/mapa.py` e `core/nevoa.py`), então
  o segredo continua no servidor: token oculto, desconhecido ou na névoa não sai
  para jogador. Um teste por tipo de mudança trava isso.
- O navegador aplica o delta direto. Se pular um número da sequência, reconectar
  ou receber "recarregue", aí sim baixa o estado completo.
- O retrato de um token novo começa a carregar no mesmo instante em que o delta
  chega.

Ganho estimado em produção: de 600 a 800 ms para uns 150 a 250 ms (o tempo da rede
mais alguns milissegundos).

### Etapa 4: arrasto mais colado (pequena)

- Envio do arrasto a 30 por segundo, junto com o quadro da tela (hoje 20).
- Interpolação: o colchão usa o percentil 90 do atraso mais a variação, em vez do
  maior atraso dos últimos 3 s, e encolhe devagar quando a rede melhora. Um pico
  isolado deixa de atrasar os 3 s seguintes.
- Limite por conexão de 60 para 90 mensagens por segundo (arrasto 30, régua 30 e
  folga), conferido com teste.

Ganho estimado: o arrasto fica uns 180 a 190 ms atrás da mão em produção (hoje
uns 220). Abaixo disso só com um servidor mais perto (os 142 ms são a distância
até a Discloud).

### Etapa 5: provar com rede de verdade

- Teste automático com duas telas e atraso de rede simulado, que falha se o
  arrasto passar de 250 ms ou uma mudança passar de 350 ms.
- Teste com seis conexões arrastando ao mesmo tempo.
- Uma sessão de teste com o Pedro e um celular, com o medidor ligado.

## Metas

| O que | Hoje (produção) | Depois |
|---|---|---|
| Arrasto visto pelos outros | uns 220 ms | uns 180 ms |
| Token novo, edição, barras, névoa, clima | 600 a 800 ms | 150 a 250 ms |
| Travadas de segundos | possíveis (banco no laço, fila cheia, plano B) | sem causa conhecida; o medidor mostra qualquer uma que aparecer |
