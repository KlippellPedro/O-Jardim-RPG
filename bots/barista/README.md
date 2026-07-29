# Barista — O Jardim RPG (descontinuado)

> **Bot em desativação (27/07/2026):** o Rollem/Rollen (bot externo) já cobre
> rolagem de dados e a mesa passou a compartilhar tela pra música, então o
> Barista inteiro — dados, música e o `/menu` de bebidas — está sendo
> removido. Este README fica só como registro histórico até a pasta ser
> apagada.

Segundo bot do Jardim: rolagem de dados, música nos canais de voz (com
playlists nomeadas) e um cardápio de bebidas (`/menu`) que debita a
carteira compartilhada com o Banqueiro.

## Arquitetura atual

- **Runtime:** Python 3.11 na Discloud.
- **Estado:** a fila de reprodução em si continua só em memória (reinicia
  com o processo). Playlists e o `/menu` usam o **mesmo PostgreSQL central
  do Banqueiro/Jornalista**, por VLAN (`docs/Plano_Banco_Central.md`) — mas essa
  conexão é **opcional pro Barista**: sem `DATABASE_URL` configurada (ou se
  a conexão falhar), o bot sobe normalmente e dados/música continuam
  funcionando; só `/playlist_*` e `/menu` ficam indisponíveis (ver
  `main.py` e `core/db.py`). Diferente do Banqueiro/Jornalista, que exigem
  o banco pra sequer iniciar.
- **Música:** toca direto com `yt-dlp` + Deno + FFmpeg no próprio processo do bot,
  sem Lavalink (ver `docs/Analise_Infra_Discloud.md` na raiz do repo — um
  servidor Lavalink separado não cabia no orçamento de RAM planejado). Essa
  escolha é mais simples de operar, mas usa mais CPU/rede durante a
  reprodução. O FFmpeg é instalado pelo `APT=ffmpeg` do
  `discloud.config`, conforme o mecanismo oficial da Discloud. O YouTube
  ainda pode bloquear a extração com "Sign in to confirm you're not a bot",
  porque o IP de datacenter da Discloud pode cair na verificação anti-bot.
  O bot usa `yt-dlp[default]`, o componente EJS oficial e o runtime Deno,
  configuração atualmente exigida pelo extrator. Isso corrige a execução de
  JavaScript, mas não burla bloqueio de IP/PO Token e não é garantia absoluta.
  Quando `YOUTUBE_COOKIES` aponta para um arquivo existente, ou existe um
  `cookies.txt` na raiz do Barista, o YouTube direto é tentado primeiro. Esse
  arquivo representa uma sessão autenticada: use somente uma conta dedicada,
  sem dados pessoais, e nunca versione ou compartilhe o cookie/ZIP de deploy.
- **YouTube e Spotify na Discloud:** o YouTube bloqueia a extração direta no
  IP atual da hospedagem mesmo com Deno/EJS, e o Spotify não fornece áudio
  completo pela Web API para este tipo de bot. O Barista consulta o oEmbed
  oficial do link para obter título/autor e procura no SoundCloud um áudio
  correspondente quando a extração direta não está disponível ou falha. A
  mensagem do comando informa essa troca de fonte. URLs são aceitas somente
  dos hosts HTTPS conhecidos de YouTube, Spotify e SoundCloud; outras URLs são
  recusadas. Como a correspondência é por metadados, ela deve ser conferida
  pelo título mostrado e não é garantia de ser a mesma gravação.
- `RAM=512` em `discloud.config` é a configuração atual para comandos de texto,
  extração e transcodificação de áudio; ajuste depois de ver o
  consumo real em produção (o painel da Discloud mostra o uso).

## Comandos

**Dados** (`cogs/dados.py`, lógica em `core/dados.py`):

- `/rolar <expressao> [motivo]` — rola uma expressão como `2d6+3` ou
  `1d20+1d4-2`. Aceita múltiplos termos de dado/número, com limites de
  segurança (até 100 dados por termo, até d1000, até 20 termos).

  Também aceita repetição no formato do Rollem: `2#d20` faz **duas rolagens
  separadas** de d20, e `3#2d6+3` faz três rolagens completas. É diferente de
  `2d20`, que soma os dois dados num resultado só. O limite é 20 repetições.

  A mesma sintaxe vale no site (`plataforma/core/dados.py`), então o comando
  que a mesa usa no Discord funciona igual na página da sessão.
- `/teste [modificador] [modo] [motivo]` — teste de d20 (`normal`,
  `vantagem` ou `desvantagem`), seguindo a regra de
  `docs/regras/regras-publicas-v1.md`: com vantagem rola dois d20 e fica com o
  maior; com desvantagem, com o menor. Em 20/1 natural mostra um aviso de
  que o resultado melhora/piora um grau (regra do sistema, não é um
  "crítico" automático).
- Rolagens usam `random.SystemRandom()` (lê de `os.urandom`, CSPRNG do SO)
  como gerador padrão em vez do `random` do módulo — o Mersenne Twister
  padrão é previsível depois de observar outputs suficientes, o que abriria
  brecha pra prever/adulterar rolagens futuras.

**Música** (`cogs/musica.py`, núcleo em `core/musica.py`):

- `/tocar <busca>` — busca por nome ou aceita links HTTPS de YouTube, faixa do
  Spotify e SoundCloud. Com cookie, tenta o YouTube direto; sem ele, ou quando
  a tentativa falha, usa uma correspondência no SoundCloud. Outras URLs são
  recusadas por segurança. Cada extração tem prazo de 30 segundos e há no
  máximo quatro extrações simultâneas no processo inteiro.
- `!musica <busca>` (também `!tocar`/`!play`) — mesmo efeito de `/tocar`,
  via mensagem de texto em vez de slash command. **Precisa da intent
  privilegiada "Message Content" ligada no Developer Portal do bot** (Bot →
  Privileged Gateway Intents), além do `intents.message_content = True` já
  presente em `main.py` — sem isso o bot recusa conectar.
- `/pular`, `/pausar`, `/despausar`, `/parar` — controle de reprodução. Só
  funciona para quem está na mesma call do bot ou tem **Gerenciar Servidor**.
  `/parar` limpa a fila inteira e desconecta do canal. Uma sessão ativa não
  pode ser puxada por alguém de outra call; quando a fila termina, o Barista
  espera 90 segundos por uma nova música e sai automaticamente se continuar
  ocioso. Uma primeira busca que falha não faz o bot entrar na call.
- `/fila` — mostra a faixa atual e o que vem a seguir.
- `/volume <porcentagem>` — 0 a 200%, com a mesma restrição de call/permissão;
  para evitar depender da `libopus` compartilhada do Python, a alteração vale
  a partir da próxima faixa.

**Playlist** (`cogs/playlist.py`, persistência em `core/db.py` — precisa de
banco configurado):

- `/playlist_criar <nome>` — cria uma playlist nomeada vazia (nome único
  por servidor, sem diferenciar maiúscula/minúscula).
- `/playlist_adicionar <nome> <busca>` — resolve a música (mesma busca do
  `/tocar`) e guarda no fim da playlist. Até `MAX_FAIXAS_POR_PLAYLIST` (50)
  faixas por playlist.
- `/playlist_tocar <nome>` — conecta na call, **limpa a fila atual** e toca
  a playlist inteira do começo (pensado pra trocar a cena rápido, ex.: "vai
  começar o combate"). Faixas são resolvidas de novo no momento de tocar
  (com concorrência limitada, pra não parecer uma rajada de bot pro
  YouTube); uma faixa que falhar é pulada, o resto toca normalmente.
- `/playlist_listar` — lista as playlists do servidor com a contagem de
  faixas.
- `/playlist_ver <nome>` — mostra as faixas de uma playlist.
- `/playlist_apagar <nome>` — apaga a playlist inteira.

Todos os comandos de nome de playlist têm autocomplete.

**Menu** (`cogs/menu.py`, cardápio em `core/menu.py` — precisa de banco
configurado):

- `/menu` — mostra o cardápio com um botão por bebida (view persistente:
  continua funcionando depois de um restart do bot). Qualquer pessoa pode
  clicar em qualquer botão da mensagem — cada clique debita a **carteira de
  quem clicou** (não de quem rodou `/menu`), na mesma tabela `carteira` que
  o Banqueiro usa, e registra a compra no `extrato` (aparece no `/extrato`
  do Banqueiro). O "efeito" de cada bebida é só narrativo — o Barista não
  tem acesso à ficha do personagem, então não aplica nenhum bônus mecânico
  sozinho; o texto do pedido deixa isso explícito ("combine com o mestre").
  Cardápio/preços/efeitos ficam em `core/menu.py`, fácil de ajustar.

**Ajuda:** `/ajuda` mostra um menu com as categorias acima.

## Variáveis

Veja `.env.example`:

- `DISCORD_TOKEN` — obrigatória;
- `GUILD_ID` — opcional; quando definido, publica os comandos somente nesse
  servidor e remove cópias globais antigas para não exibir duplicados;
- `DATABASE_URL` — opcional. Sem ela, `/playlist_*` e `/menu` ficam
  indisponíveis, mas o resto do bot funciona normalmente;
- `DATABASE_STARTUP_TIMEOUT` — opcional (padrão 12s), tempo máximo pra
  validar o banco na inicialização;
- `YOUTUBE_COOKIES` — opcional, caminho para um `cookies.txt`. Se ficar vazio,
  o bot procura `cookies.txt` na própria raiz. O script de build inclui esse
  arquivo no ZIP quando ele existe; portanto o ZIP também deve ser tratado
  como segredo e nunca commitado ou compartilhado.

Nunca envie o `.env` real ao Git. O `.gitignore` e o `.discloudignore`
protegem esse arquivo; em produção, configure o valor no painel.

## Rodar localmente

Requer Python 3.11+ e o binário `ffmpeg` instalado e no PATH para rodar
localmente (necessário só pros comandos de música — dados funcionam sem ele).
Na Discloud ele é instalado automaticamente pelo `discloud.config`:

```bash
cd bots/barista
python -m venv .venv
.venv/Scripts/activate
python -m pip install -r requirements.txt
copy .env.example .env
python main.py
```

## Testes

`core/dados.py` e `core/menu.py` são lógica/dado puro (sem discord.py, sem
banco) — `tests/test_dados.py` e `tests/test_menu.py` rodam sempre:

```bash
cd bots/barista
python -m pip install pytest
python -m pytest tests/
```

`core/db.py` (playlist e carteira/extrato compartilhados) tem testes de
integração em `tests/test_db.py`, que só rodam com um Postgres descartável
(nunca contra produção — `tests/db_utils.py` cria um schema isolado por
teste e recusa rodar se `TEST_DATABASE_URL` estiver igual a `DATABASE_URL`):

```bash
TEST_DATABASE_URL=postgresql://... python -m pytest tests/test_db.py
```

`core/musica.py` tem testes unitários da fila, validação de links Spotify e
integração simulada com yt-dlp/oEmbed. A extração real do YouTube e a conexão
de voz ainda precisam ser validadas num servidor depois do deploy.

## Estrutura

```text
bots/barista/
├── main.py
├── discloud.config
├── requirements.txt
├── .env.example
├── core/
│   ├── config.py
│   ├── ui.py
│   ├── dados.py
│   ├── musica.py
│   ├── menu.py
│   └── db.py
├── cogs/
│   ├── dados.py
│   ├── musica.py
│   ├── playlist.py
│   ├── menu.py
│   └── ajuda.py
└── tests/
    ├── test_dados.py
    ├── test_menu.py
    ├── test_db.py
    └── db_utils.py
```

## Próximos passos sugeridos

- Antes do próximo deploy: ligar "Message Content Intent" no Developer
  Portal do bot (Bot → Privileged Gateway Intents) — o código já pede essa
  intent (`!musica`) e o bot não conecta se ela não estiver ligada lá.
- Configurar `DATABASE_URL` (mesmo Postgres do Banqueiro/Jornalista) e
  `VLAN=true` nas Variáveis da Discloud pra habilitar `/playlist_*` e
  `/menu` em produção — sem isso o bot funciona normalmente, só essas duas
  categorias ficam fora do ar (ver "Arquitetura atual" acima).
- O `DATABASE_URL` já presente no `.env` local está falhando autenticação
  no Postgres (descoberto ao testar a conexão opcional) — vale conferir se
  a senha está certa antes de depender dele localmente.
- Observar o consumo real de RAM/CPU durante a reprodução e ajustar `RAM`
  em `discloud.config`.
- Se o bloqueio anti-bot do YouTube persistir mesmo com Deno/EJS e cookie de
  conta dedicada, avaliar um provedor de PO Token compatível com yt-dlp. Não
  usar cookie de conta pessoal.
- Rodar `tests/test_db.py` contra um Postgres de teste real pelo menos uma
  vez antes de confiar na lógica de playlist/carteira em produção — só foi
  verificada por leitura/espelhamento do padrão já provado no Banqueiro,
  nunca executada de fato (sem `TEST_DATABASE_URL` neste ambiente).
