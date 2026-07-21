# Jornalista — O Jardim RPG

Bot de anúncios e cronista do mundo: solta baús que aparecem sozinhos, em
horário aleatório, num canal do servidor (primeiro a clicar "Abrir baú" leva
o prêmio — Lunaris + itens sorteados por raridade, ponderados pela estação
atual do Jardim); publica no canal do jornal os avisos que o Banqueiro
enfileira — recompensa colocada em alguém, jogador procurado por dívida,
captura de procurado; e é dono do ciclo de **estação + clima** do Jardim e
das notícias customizadas do mestre (ver `Plano_Jornalista.md` na raiz do
repo pro plano completo, decisões e o que ainda falta).

Esse bot nasceu de um split do antigo **Consultor**: toda a parte de
economia (carteira, loja, cofre, cartão, câmbio, roubo) ficou no
**Banqueiro** (`bots/banqueiro`); o Jornalista cuida do loot que aparece
sozinho pelo mundo e de tudo que é "conteúdo"/narrativa pro servidor.

## Arquitetura atual

- **Runtime:** Python 3.11 na Discloud.
- **Dados:** o **mesmo** PostgreSQL central do Banqueiro — Jornalista e
  Banqueiro são aplicações separadas na Discloud, ligadas pela mesma VLAN
  privada, apontando pro mesmo banco. O Jornalista só cria/usa as tabelas
  que ele mesmo precisa (`baus_config`, `estacao`, `catalogo_itens`,
  `avisos_pendentes` — fila de anúncios que o Banqueiro escreve e o
  Jornalista publica e marca como lida — e, pro fallback de entrega,
  `carteira`/`inventario`/`cofre` e o `jornal_canal_id` de `config` — as
  mesmas tabelas que o Banqueiro usa).
- **Estação (`estacao`)**: até 17/07/2026 era escrita pelo Banqueiro
  (`/estacao_definir`) e só lida pelo Jornalista. Passou a ser **escrita
  pelo Jornalista** (`/jornal estacao_definir`) — ver
  `Plano_Jornalista.md`, Decisão 2: o dono lógico é quem consome o valor
  (o sorteio de loot dos baús automáticos), não quem mexe com dinheiro.
- **Segredos:** `DISCORD_TOKEN` e `DATABASE_URL` somente nas Variáveis do
  painel — precisam de um app Discord e um token **próprios**, diferentes
  do Banqueiro. **Causa real de um erro de código já visto em produção**:
  não é bug de código — foi `DISCORD_TOKEN` ausente/inválido nas Variáveis
  da Discloud (o log mostra primeiro "DISCORD_TOKEN nao definido", depois
  "Improper token has been passed" quando um valor errado foi colado).
  Confira essa variável primeiro se o bot aparecer com erro sem motivo
  aparente no código.
- **Catálogo:** o Jornalista nunca semeia `catalogo_itens` — ele só lê. Quem
  semeia é o Banqueiro (ou o site). Se a tabela ainda estiver vazia, os
  baús continuam soltando Lunaris, só sem item sorteado.

Quando `PLATFORM_API_URL` e `SERVICE_API_KEY` estiverem configuradas (mesma
integração do Banqueiro), o loot dos baús vai direto pro cofre da conta no
site. Sem integração — ou pra contas ainda não vinculadas — o prêmio cai na
mesma `carteira`/`inventario` que o Banqueiro usa, e o jogador pode guardar
as moedas em segurança com `/cofre depositar` no Banqueiro.

## Comandos

**Baús automáticos** (`cogs/baus.py`):

- `/bau_config` — [Mestre] liga/desliga os baús automáticos, define canal,
  janela de horário e itens por baú.
- `/bau_agora` — [Mestre] solta um baú imediatamente (pra testar).

O baú em si não tem comando de jogador: aparece sozinho no canal
configurado, com um botão "Abrir baú 🎁" — o primeiro clique leva. Os avisos
(recompensas, procurados, capturas) também aparecem sozinhos, publicados
automaticamente no canal definido com `/jornal_definir` no Banqueiro — o
Jornalista checa a fila a cada minuto.

**Jornal** (`cogs/jornal.py` — grupo `/jornal`, todo master-only via
`default_permissions`, exceto `/estacao` que é fora do grupo de propósito):

- `/jornal publicar <titulo> <conteudo>` — publica uma notícia customizada,
  formatada como embed de jornal.
- `/jornal estacao_definir <estacao>` — define a estação do Jardim (as 6:
  Primavera/Verão/Outono/Inverno/Noite Eterna/Eclipse — ver
  `core/economia.py` e `Plano_Jornalista.md`), muda o peso de raridade do
  loot dos baús automáticos, e avisa no canal do jornal.
- `/jornal avancar_mes` — sorteia o clima do mês (`core/clima.py`),
  restrito ao que a estação atual permite (4 comuns + o exclusivo da
  estação + 3 raros universais bem menos prováveis), e publica em formato
  de "capa de jornal". Efeito é sempre narrativo — o Jornalista não toca
  no motor de rolagem, o texto já deixa isso explícito.
- `/jornal registro_definir <canal>` — define o canal de registro (ex.:
  `#registro`) — usado pra mencionar em `on_member_join` e como referência
  pro registro por Árvore.
- `/jornal registro_criar_cargos` — cria (ou reaproveita, se já existirem
  pelo nome) os 10 cargos de Árvore com nome+cor oficiais
  (`core/arvores.py`) e guarda o mapeamento automaticamente.
- `/jornal registro_publicar` — publica a mensagem de registro (menu de
  seleção com as 10 Árvores) no canal atual. Escolher uma Árvore troca a
  anterior (uma por pessoa) e manda DM de confirmação. É puramente
  cosmético — muda só a cor do cargo, sem ligação com classe/ficha.
- `/estacao` — qualquer jogador pode ver a estação atual (só leitura).

**Entrada/saída de membro** (`cogs/boasvindas.py` — sem comando, dispara
sozinho):

- `on_member_join` — anuncia a chegada no canal do jornal (uma de 4
  variações de texto) e menciona o canal de registro, se configurado.
- `on_member_remove` — anuncia a partida (uma de 4 variações). Precisa da
  intent privilegiada `Server Members Intent` ligada no Developer Portal
  (Bot → Privileged Gateway Intents), além do `intents.members = True` já
  em `main.py` — sem isso os eventos nunca disparam.

**Ajuda:** `/ajuda` mostra um menu com as categorias acima.

## Variáveis

Veja `.env.example`:

- `DISCORD_TOKEN` — obrigatória (token do app Discord do Jornalista);
- `DATABASE_URL` — obrigatória (mesmo Postgres do Banqueiro);
- `GUILD_ID` — opcional, acelera a sincronização de comandos num servidor;
- `DATABASE_STARTUP_TIMEOUT` — opcional, padrão 12 segundos;
- `PLATFORM_API_URL` / `SERVICE_API_KEY` — opcional, integração com o site.

## Rodar localmente

Requer Python 3.11+ e um PostgreSQL separado para desenvolvimento:

```bash
cd bots/jornalista
python -m venv .venv
.venv/Scripts/activate
python -m pip install -r requirements.txt
copy .env.example .env
python main.py
```

## Estrutura

```text
bots/jornalista/
├── main.py
├── discloud.config
├── requirements.txt
├── core/
│   ├── config.py
│   ├── db.py           # só as tabelas que o Jornalista precisa
│   ├── catalogo.py
│   ├── economia.py      # fatia de economia usada pro loot (cofre, estação)
│   ├── clima.py         # clima do mês, restrito pela estação
│   ├── arvores.py        # as 10 Árvores (nome/cor) pro registro cosmético
│   ├── ui.py            # cores/ícones por categoria (Plano_Jornalista.md, Decisão 3)
│   └── loot.py
├── cogs/
│   ├── baus.py          # agendamento + anúncio + entrega dos baús
│   ├── avisos.py         # publica a fila de avisos que o Banqueiro enfileira
│   ├── jornal.py         # grupo /jornal: publicar, estacao_definir, avancar_mes, registro_*, /estacao
│   ├── boasvindas.py      # on_member_join/on_member_remove
│   └── ajuda.py           # /ajuda
└── tests/
    ├── test_economia.py
    ├── test_clima.py
    └── test_arvores.py
```

## Testes

`core/economia.py`, `core/clima.py` e `core/arvores.py` são lógica/dado
puro (sem discord.py, sem banco) — rodam sempre:

```bash
cd bots/jornalista
python -m pip install pytest
python -m pytest tests/ -k "not test_db"
```

Os testes prefixados `test_db_` precisam de um Postgres descartável (mesmo
padrão do Banqueiro — `tests/db_utils.py`, nunca roda contra produção).
