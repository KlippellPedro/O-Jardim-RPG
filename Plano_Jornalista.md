# Plano do Jornalista — O cronista do mundo

> Base: plano do Gemini colado por Pedro em 17/07/2026, adaptado depois de
> revisar o que o Jornalista já tem construído hoje. Não é uma lista pra
> copiar e colar — em vários pontos eu proponho mudar a ideia original pra
> encaixar melhor no que já existe (ver "O que eu mudaria" em cada bloco).

## Status agora (17/07/2026)

- O Jornalista está **em erro de código na Discloud** (loop de restart) —
  confirmado no painel enquanto eu investigava o Banqueiro no mesmo dia.
  Não é o mesmo bug do Banqueiro (já conferi: nenhuma descrição de comando
  passa de 100 caracteres). Fica deferido como sempre — não vou mexer nisso
  agora, só registrando que continua quebrado.
- O que já está implementado e decidido:
  - **Baús automáticos**: sorteia local/horário e anuncia no canal
    configurado, com botão "Abrir baú 🎁" (primeiro clique leva).
  - **Fila de avisos** (`avisos_pendentes`): o Banqueiro grava (recompensa
    colocada, procurado por dívida, capturado, dívida quitada), o
    Jornalista lê a cada minuto e publica no canal do jornal.
  - **Leitura de catálogo/estação**: só leitura, quem grava é o Banqueiro.
  - O canal do jornal é configurado com **`/jornal_definir` — mas esse
    comando mora no Banqueiro**, não no Jornalista (fica no cog de admin
    dele, junto com `/estacao_definir`, `/setroubo`, `/setcambio` — todos
    comandos de configuração de servidor). Achei isso ao investigar: faz
    sentido manter assim (comandos de *configuração* ficam com o
    Banqueiro/admin; os novos comandos de *conteúdo* do plano abaixo vão
    para o Jornalista).
  - **Inconsistência que reparei, e que a Decisão 2 acabou resolvendo**:
    `/estacao_definir` hoje posta o embed **direto** no canal (o próprio
    Banqueiro busca o canal e manda a mensagem), enquanto
    recompensa/procurado/capturado passam pela fila `avisos_pendentes` que
    o Jornalista consome. Com `estacao` mudando de dono pro Jornalista (ver
    Decisão 2), esse comando passa a postar direto também, sem fila — fica
    tudo consistente com as outras coisas de conteúdo do Jornalista.
- **Adiado explicitamente por você antes** (ver memória
  `project_jornalista_avisos_visual.md`): diferenciar cor/ícone por tipo de
  aviso. Chegou a hora — ver "Decisão 4" abaixo.

## O plano do Gemini, item por item

### 1. Automação de sistema (entrada/saída de membro)

**Ideia original:** `on_member_join` posta uma notícia narrativa + um botão
que "redireciona" pro canal `#registro`; `on_member_remove` posta uma nota
de sumiço.

**O que eu mudaria:**
- Um botão não teleporta ninguém — o jeito real de "apontar" pro canal é
  mencionar `#registro` (`<#id_do_canal>`) na própria mensagem, que o
  Discord já renderiza como link clicável. Mais simples que um botão de
  link e faz a mesma coisa.
- Texto fixo sempre igual fica repetitivo rápido (o servidor vai ver a
  mesma frase dezenas de vezes). Proponho um **pool de 3–4 variações** por
  evento e sortear uma, do mesmo jeito que fiz com o flavor text de
  crítico/1-natural no Barista hoje.
- **Requisito técnico novo:** esses eventos só disparam com a intent
  privilegiada `Server Members Intent` ligada — isso é **outra** intent
  além da `Message Content` que o Barista já precisou (Developer Portal →
  Bot → Privileged Gateway Intents). Preciso que você ligue isso lá quando
  formos implementar.

**Considero decidido** (default razoável, não precisa aprovar cada frase):
seguir a ideia, com pool de variações e menção de canal em vez de botão.

### 2. Registro automático por cargo — RESOLVIDO: cosmético, por Árvore

**Ideia original do Gemini:** mensagem fixada em `#registro` com
botões/menu pra escolher **classe** (Guerreiro/Mago/Ladino, exemplo dele);
clicar atribui o cargo do Discord automaticamente e manda DM confirmando.

**Decidido (17/07/2026):** não é classe — é **puramente cosmético, "qual
Árvore você é"**, igual um cargo de time/facção. O Jardim já tem exatamente
essas 10 Árvores definidas em `src/mundo/config/arvores.js` (mesma fonte
que a cena 3D usa), cada uma com nome e cor oficiais:

| Árvore | Cor (RGB) |
| --- | --- |
| Gênese | 214,120,156 (rosa) |
| Alétheia | 222,198,88 (amarelo) |
| A.X.I.S | 53,216,236 (azul-neon) |
| Anima | 86,172,92 (verde) |
| Vórtice | 222,114,42 (laranja) |
| Baluarte | 116,82,52 (marrom) |
| Matriz | 132,84,188 (roxo) |
| Éon | 168,138,72 (dourado envelhecido) |
| Abismo | 34,30,40 (preto) |
| Limiar | 134,28,48 (vinho) |

Como já são as cores oficiais de cada Árvore no resto do projeto, dá pra
criar os 10 cargos do Discord **com essas mesmas cores** — o cargo "Anima"
fica verde, "Abismo" fica preto, etc. Fica visualmente consistente com a
cena 3D de Árvores sem eu ter que inventar nada novo.

**Simplificação que estou assumindo:** "A.X.I.S" tem uma identidade
escondida ("Parley", só revelada narrativamente explorando a Árvore no
Mundo) — pro cargo cosmético de registro, uso só o nome dominante
"A.X.I.S" mesmo, sem tentar reproduzir esse mistério no Discord. Se
quiser, dá pra revisar depois.

**UI:** com 10 opções, um **menu de seleção** (`discord.ui.Select`, mesmo
padrão que `/ajuda` já usa em `cogs/ajuda.py`) fica mais limpo do que 10
botões separados numa mensagem só. Escolher uma Árvore troca a anterior
(um cargo por pessoa, não acumula).

**Requisitos técnicos:**
- O Jornalista precisa de permissão **Gerenciar Cargos**, e o cargo dele
  no servidor precisa estar **acima** dos 10 cargos de Árvore na hierarquia
  (senão o Discord bloqueia silenciosamente — pegadinha clássica). Isso é
  configuração manual sua no servidor, não em código.
- Os 10 cargos precisam já existir no servidor — o bot não vai criar cargo
  sozinho (posso te dar a lista de nome+cor pra criar rapidinho, ou faço um
  comando de admin que cria os 10 de uma vez, se preferir). Um comando tipo
  `/registro_configurar_cargo <arvore> <cargo>` guarda o mapeamento
  Árvore → ID do cargo por servidor (mesmo padrão do `/jornal_definir`).

### 3. Ciclo de clima e estações — redesenhado (17/07/2026)

**Ideia original do Gemini:** `/jornal avancar_mes` (só mestre) sorteia um
clima de uma lista interna (Ensolarado, Tempestade, Névoa Maldita), define
um efeito mecânico e publica em formato de capa de jornal.

**Ainda tinha uma pendência aqui:** o Jardim já tem um sistema chamado
`estacao` no Banqueiro (Equilíbrio/Florada/Colheita/Estiagem/Eclipse, muda
o peso de raridade do loot dos baús) — nome parecido, conceito vizinho.
Você decidiu (17/07/2026): fazer **6 estações** (as 4 normais + Noite
Eterna e Eclipse) e um conjunto maior de **climas**, com climas específicos
só podendo acontecer em certas estações. Isso é mais rico que "dois
sistemas totalmente separados" — vira uma hierarquia: **estação** (muda
devagar, é a "camada de fundo") **restringe quais climas** podem ser
sorteados no mês.

**Resolvido (17/07/2026):** substitui a do Banqueiro — e mais que isso,
**muda de dono**. Seu raciocínio: `estacao` nasceu pra influenciar o loot
dos baús *automáticos*, mas os baús automáticos já foram movidos pro
Jornalista nesta mesma leva de sessões (é ele quem sorteia local/horário e
anuncia). Então não faz sentido `estacao` continuar sendo escrita pelo
Banqueiro — o dono lógico agora é o Jornalista, que é quem realmente
consome esse valor pra sortear o loot dos baús.

**O que isso muda no código, concretamente:**
- `/estacao_definir` **sai do Banqueiro** (`cogs/admin.py`) — o mestre não
  define mais a estação por lá.
- Um comando equivalente entra no **Jornalista**, dentro do grupo `/jornal`
  pra ficar junto dos outros comandos de conteúdo — proponho
  `/jornal estacao_definir`, com as 6 opções novas no lugar das 5 antigas.
- A tabela `estacao` no Postgres compartilhado não muda de lugar (continua
  a mesma, é só config de servidor) — só troca quem tem permissão de
  **escrever** nela: `db.set_estacao(...)` deixa de ser chamado pelo
  Banqueiro e passa a ser chamado pelo Jornalista. O Jornalista já lê essa
  tabela hoje (pros baús), só falta o método de escrita.
- Isso também resolve de graça a inconsistência que eu tinha notado (ver
  "Status agora" no topo do arquivo): hoje `/estacao_definir` posta o
  aviso de mudança de estação direto no canal, sem passar pela fila
  `avisos_pendentes`. Com o comando morando no Jornalista, ele já está no
  bot que tem o canal — posta direto, sem precisar de fila, do mesmo jeito
  que `/jornal avancar_mes` e `/jornal publicar` vão fazer.

#### As 6 Estações

| Estação | Tipo | Pesos de loot (comum / incomum / raro / épico / lendário) | Clima exclusivo dela |
| --- | --- | --- | --- |
| 🌸 Primavera | Normal | 50 / 32 / 14 / 4 / 0 | Chuva de Flores |
| ☀️ Verão | Normal | 70 / 22 / 7 / 1 / 0 | Onda de Calor |
| 🍂 Outono | Normal | 60 / 28 / 10 / 2 / 0 | Ventania de Folhas |
| ❄️ Inverno | Normal | 85 / 13 / 2 / 0 / 0 | Nevasca |
| 🌑 Noite Eterna | Especial | 15 / 25 / 32 / 20 / 8 | Silêncio Absoluto |
| 🌘 Eclipse | Especial | 20 / 25 / 30 / 18 / 7 (igual ao que já existe hoje) | Tempestade Arcana |

Lógica dos pesos: Verão/Inverno são as mais "mundanas" (fartura de coisas
comuns / escassez), Primavera/Outono ficam no meio, e as duas especiais
(Noite Eterna, Eclipse) são bem mais arriscadas-e-recompensadoras — jogo
de alto risco/alta recompensa quando calham. Tudo isso é ponto de partida,
ajusto fácil se algum peso não jogar bem na mesa.

#### Os climas

Padrão do Gemini (Ensolarado/Tempestade/Névoa) + mais alguns pra ficar
imersivo, com o novo requisito de "clima que só acontece em certa
estação":

**Comuns, qualquer uma das 4 estações normais:**

| Clima | Efeito narrativo (combine com o mestre) |
| --- | --- |
| ☀️ Ensolarado | Nenhum efeito — dia comum de aventura. |
| ☁️ Nublado | Nenhum efeito mecânico, só atmosfera. |
| 🌧️ Chuva | Trilhas de barro atrapalham rastreamento, mas passos ficam abafados — desvantagem ou vantagem em Furtividade dependendo do que a cena pede. |
| 💨 Vento Forte | Desvantagem em ataques à distância — as flechas desviam. |

**Exclusivos de uma estação normal específica:**

| Clima | Só em | Efeito narrativo |
| --- | --- | --- |
| 🌸 Chuva de Flores | Primavera | +1 narrativo em testes sociais/Carisma. |
| 🔥 Onda de Calor | Verão | Desvantagem em Fortitude em esforços prolongados (marchas, trabalho pesado). |
| 🍂 Ventania de Folhas | Outono | Vantagem em Furtividade — o barulho das folhas cobre os passos. |
| ❄️ Nevasca | Inverno | Desvantagem em Percepção à distância; terreno difícil. |

**Exclusivos das estações especiais:**

| Clima | Só em | Efeito narrativo |
| --- | --- | --- |
| 🌑 Silêncio Absoluto | Noite Eterna | Vantagem em Furtividade, mas desvantagem em Percepção auditiva — dá pra se esconder, mas também não se ouve o perigo chegando. |
| ⚡ Tempestade Arcana | Eclipse | Magos ganham +1 em testes de conjuração; arqueiros têm desvantagem por causa dos ventos (a ideia original do Gemini, realocada especificamente pro Eclipse). |

**Raros, podem cair em qualquer estação (chance bem menor no sorteio):**

| Clima | Efeito narrativo |
| --- | --- |
| 🌫️ Névoa Maldita | Desvantagem em Percepção visual; gancho pro mestre encaixar um encontro inesperado. |
| 🩸 Chuva de Cinzas | Só presságio — algo grande aconteceu em outro lugar do Jardim. |
| ✨ Estrelas Cadentes | +1 narrativo num teste à escolha do jogador nessa sessão (fez um pedido). |

**Mecânica do sorteio:** a estação muda devagar (o mestre define quando
quiser, tipo hoje). `/jornal avancar_mes` sorteia só o clima do mês, dentro
do conjunto permitido pela estação atual (4 comuns + o exclusivo dela +
os 3 raros universais, esses com peso bem menor que os outros). Não faço o
avanço de estação virar automático — evita inventar um calendário que
ninguém pediu; o mestre continua escolhendo a estação explicitamente.

**Importante, mesma lógica do `/menu` do Barista:** o Jornalista não tem
acesso à ficha nem ao motor de rolagem — "magos ganham +1" é só texto
narrativo no anúncio, não um bônus que o bot aplica sozinho em nenhuma
rolagem. Isso fica explícito no texto publicado, pra ninguém achar que é
automático.

### 4. Notícias customizadas

**Ideia original:** `/jornal publicar [titulo] | [conteudo]` — mestre
digita, bot formata num embed estilo jornal impresso.

**O que eu mudaria:** o formato `titulo | conteudo` com pipe é frágil (o
mestre tem que lembrar do `|`, e se o conteúdo tiver um `|` dentro quebra o
parse). Comandos de barra do Discord já suportam **múltiplos parâmetros
de verdade** — `/jornal publicar titulo:<...> conteudo:<...>` vira dois
campos de texto separados na própria UI do Discord, sem parsing nenhum.
Estritamente melhor, mesma ideia.

**Considero decidido:** seguir como o Gemini descreveu, só trocando o `|`
por dois parâmetros nomeados.

## Decisões em aberto

| # | Pergunta | Status |
| --- | --- | --- |
| 1 | Registro por cargo: cosmético ou ligado à ficha de verdade? | ✅ **Resolvido 17/07/2026** — cosmético, "qual Árvore você é". |
| 2 | As 6 estações substituem o `estacao` do Banqueiro, ou ficam paralelas? | ✅ **Resolvido 17/07/2026** — substitui, e muda de dono pro Jornalista (ver justificativa na seção 3). |
| 3 | Cor/ícone por tipo de aviso — adiado desde a sessão do Banqueiro. | Em aberto — proposta concreta abaixo, só precisa de um "ok" ou ajustes. |
| 4 | Nomes/cargos pro registro. | ✅ **Resolvido 17/07/2026** — as 10 Árvores de `src/mundo/config/arvores.js`, ver tabela acima. |

### Proposta pra Decisão 3 (cor/ícone por tipo)

Mesmo padrão de `core/ui.py` que Banqueiro e Barista já usam (uma cor por
categoria):

| Categoria | Cor | Ícone |
| --- | --- | --- |
| Chegada/partida de membro | azul-acinzentado | 📢 / 🍂 |
| Registro concluído | verde | ✅ |
| Recompensa colocada | vermelho | 🎯 |
| Procurado por dívida | laranja | 🚨 |
| Capturado | roxo | ⛓️ |
| Dívida quitada | verde | 💸 |
| Baú anunciado | dourado | 🎁 |
| Clima do mês | azul | 📰 |
| Notícia do mestre | branco/cinza-claro | 📰 |

## Ordem sugerida de implementação

1. ✅ **Implementado (17/07/2026).** Notícias customizadas (`/jornal
   publicar`) + a base de cores/ícones (Decisão 3, aprovada como proposta).
   Arquivos novos: `core/ui.py` (10 categorias, cor+ícone cada, mesmo
   padrão do Banqueiro/Barista), `cogs/jornal.py` (grupo `/jornal`,
   master-only via `default_permissions`, subcomando `publicar` com
   `titulo`/`conteudo` como parâmetros nomeados de verdade — nada de pipe).
   Registrado em `main.py`. Compilei, conferi que nada passa dos limites de
   tamanho da API do Discord (mesma checagem que achou o bug do Banqueiro)
   e rodei os testes existentes — tudo passou. **Não testado ao vivo no
   Discord** — o Jornalista continua em erro de código não relacionado
   (ver "Status agora"), então não dá pra confirmar na prática até isso
   ser resolvido separadamente.
2. Cor/ícone por categoria — feito junto com o passo 1 (o `core/ui.py` já
   nasceu com as 10 categorias completas, não só a de notícia).
3. ✅ **Implementado (17/07/2026).** Estação + clima. `/estacao_definir`
   saiu do Banqueiro (`cogs/admin.py`, `core/economia.py`, `core/db.py`,
   `core/ui.py`, `cogs/ajuda.py`, `tests/test_extras.py` — tudo limpo, zero
   referência sobrando, confirmado por import). No Jornalista: `core/
   economia.py` tem as 6 estações novas (pesos somam 100% cada, testado);
   `core/clima.py` (novo) tem os 13 climas com o gate de estação; `/jornal
   estacao_definir` e `/jornal avancar_mes` entraram no grupo; `/estacao`
   (leitura, qualquer jogador) ficou fora do grupo de propósito, já que o
   grupo inteiro é master-only. 17 testes passando (8 novos). Mesma
   ressalva do Passo 1: não testado ao vivo ainda.
4. ✅ **Implementado (17/07/2026).** Entrada/saída de membro.
   `intents.members = True` em `main.py` (privilegiada — precisa ligar
   também no Developer Portal, Bot → Privileged Gateway Intents → Server
   Members Intent). `cogs/boasvindas.py` (novo): `on_member_join` sorteia
   uma de 4 variações de texto e menciona o canal de registro se já
   estiver configurado; `on_member_remove` sorteia uma de 4 variações de
   "nota de desaparecimento". Publica no mesmo canal do jornal
   (`jornal_canal_id`) — não criei canal separado, decisão de escopo
   minha (default razoável, sem pergunta nova).
5. ✅ **Implementado (17/07/2026).** Registro por Árvore. Precisou de uma
   peça nova não prevista no plano original: **canal de registro** vira
   config própria do Jornalista (`registro_config`, tabela nova, dona
   dele mesmo — não do Banqueiro) via `/jornal registro_definir <canal>`,
   porque a mensagem de chegada (Passo 4) precisa saber o ID pra
   mencionar. `core/arvores.py` (novo) tem as 10 Árvores com nome+cor
   exatas de `src/mundo/config/arvores.js` (RGB convertido pra hex,
   conferido por código, não de cabeça). `/jornal registro_criar_cargos`
   cria os 10 cargos do Discord com nome+cor corretos (ou reaproveita se
   já existirem pelo nome) e guarda o mapeamento Árvore→cargo
   automaticamente — não precisei de 10 comandos manuais de mapeamento.
   `/jornal registro_publicar` posta uma view persistente (menu de
   seleção, sobrevive a restart do bot) no canal atual; escolher troca a
   Árvore anterior (uma por pessoa) e manda DM de confirmação. Único
   ponto que ainda depende de você: dar permissão **Gerenciar Cargos** ao
   Jornalista e posicionar o cargo dele **acima** dos 10 cargos de Árvore
   na hierarquia do servidor — sem isso `/jornal registro_criar_cargos`
   ou a troca de cargo falham silenciosamente do lado do Discord.

Também criei `cogs/ajuda.py` pro Jornalista (não existia nenhum) — sem
isso os comandos novos ficariam praticamente invisíveis pros jogadores.
24 testes passando no total (7 novos de `core/arvores.py`). Mesma
ressalva de sempre: nada testado ao vivo no Discord ainda.

## Diagnóstico do erro de código do Jornalista (17/07/2026)

**Não é bug de código.** Log de 3 dias mostrou primeiro
`ERRO: DISCORD_TOKEN nao definido`, repetindo a cada ~5s, depois
`discord.errors.LoginFailure: Improper token has been passed` quando um
valor foi colado. O bot carrega o catálogo do Postgres e os cogs
normalmente antes de tentar logar — o código está saudável, só falta a
credencial certa nas Variáveis da Discloud. Isso eu não posso resolver
(nunca devo ver/digitar token de bot) — precisa conferir/colar o token
certo em Discloud → Jornalista → Variáveis → `DISCORD_TOKEN` (pegando de
novo no Developer Portal → Bot → Reset Token se precisar). Sem isso, nada
do que está implementado aqui roda de verdade — é o bloqueador real pro
"100% funcional".
(estação + clima).
