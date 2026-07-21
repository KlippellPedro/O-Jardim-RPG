# Banqueiro — O Jardim RPG

Bot de economia do RPG: carteira, cofre (itens **e** dinheiro guardado),
cartão de crédito, loja, câmbio, roubo e trocas entre jogadores. O Banqueiro
cuida só de dinheiro/posses — o loot que aparece sozinho pelo servidor
(baús automáticos) é anunciado por outro bot, o **Jornalista**
(`bots/jornalista`), que lê/grava a mesma base.

## Mecânicas

- **Carteira** (`/carteira`) — dinheiro "vivo". Recebe o Lunaris dos baús,
  compras, vendas etc. **Sempre vulnerável, sem chance nenhuma**:
  `/roubar <membro>` leva 50% fixo do saldo (`ROUBO_CARTEIRA_PERCENT`) —
  deixar dinheiro na carteira é escolha (ou risco) do jogador; não tem como
  se defender. Depois de ser roubada, a vítima fica um tempo protegida
  contra novo roubo de carteira (`ROUBO_PROTECAO_VITIMA_HORAS`) e recebe uma
  DM avisando quanto foi levado e por quem (silenciosamente ignorado se a
  vítima tiver DM fechada).
- **Cofre** (`/cofre`) — guarda itens (limitados pelo tier) e dinheiro
  (`/cofre_depositar`, `/cofre_sacar` — saque cobra uma taxa pequena). O
  dinheiro guardado é **defensável**: `/roubar_cofre` tenta arrombar e, se
  der certo, leva 50% fixo do saldo guardado (`ROUBO_COFRE_PERCENT`) — mas
  a *chance* de dar certo depende da **Segurança** que o dono comprou
  (`/cofre_seguranca_melhorar`). Segurança Básica (de fábrica) defende 50%
  das tentativas; cada tier comprado é um patamar fixo de defesa mais alto
  (nível 1 já defende 70%, e sobe dali — ver `SEGURANCA_TIERS` em
  `core/economia.py`). Se o roubo falhar, o ladrão paga multa pro alvo. O
  cofre também pode render juros (`/juros_cofre`, comando de mestre, tipo
  timeskip de fim de sessão) — só o saldo guardado, nunca a carteira.
- **Dívida e procurados** — usar a linha de crédito cria uma dívida separada
  do saldo da carteira. Receber Lunaris não paga essa dívida: o jogador escolhe
  quanto pagar com `/divida_pagar <quantia>`. A dívida cresce sozinha com o tempo (`DIVIDA_TICK_HORAS`,
  `DIVIDA_TAXA_CRESCIMENTO`) e corrói o crédito. Passar de um certo limiar
  de dívida (`DIVIDA_RECOMPENSA_LIMIAR`) coloca uma recompensa automática na
  cabeça do devedor — o Banqueiro avisa o Jornalista, que anuncia no jornal.
  Quem "capturar" o devedor (roubando a carteira ou o cofre dele) leva a
  recompensa e a dívida é perdoada. Se o devedor pagar por conta própria sem
  ser capturado, a recompensa de sistema é removida — só
  não some a parte que outro jogador colocou por conta dele. Fica em dia e o
  crédito se recupera sozinho aos poucos. Veja sua situação com `/divida`.
- **Recompensas entre jogadores** — qualquer um pode colocar recompensa na
  cabeça de outro (`/recompensa_colocar`, pago da própria carteira). Some
  com recompensas do sistema se houver. `/recompensa_ver` mostra quem tá
  mais procurado no servidor.
- **Extrato** (`/extrato [membro]`) — histórico das últimas 15 transações de
  qualquer jogador: compras, vendas, câmbio, depósito/saque do cofre,
  roubos (dos dois lados), multas, recompensas, pagamentos, juros de
  dívida e ações de mestre. Serve pra resolver "quem mexeu no meu dinheiro"
  numa disputa de mesa. Praticamente toda operação que move Lunaris/Solares
  grava uma linha via `db.registrar_extrato(...)`.

Todas essas constantes (chances, percentuais, prazos) vivem em
`core/economia.py`, fáceis de ajustar. O mestre também pode sobrescrever as
regras de `/roubar_cofre` por servidor com `/setroubo`, sem editar código.

## Arquitetura atual

- **Runtime:** Python 3.11 na Discloud.
- **Dados:** PostgreSQL hospedado em um template da Discloud — **o mesmo
  banco usado pelo Jornalista**, cada bot como aplicação separada na mesma
  VLAN privada.
- **Segredos:** `DISCORD_TOKEN` e `DATABASE_URL` somente nas Variáveis do painel.
- **Catálogo:** a tabela `catalogo_itens` é a fonte de verdade. O arquivo
  `data/catalogo.json` é usado uma única vez, para semear uma tabela vazia
  (só o Banqueiro semeia; o Jornalista só lê).

Na Discloud, Banqueiro e PostgreSQL continuam sendo **duas aplicações
separadas**, ligadas pela mesma VLAN privada. O banco não deve ser colocado no
mesmo processo ou no mesmo ZIP do bot.

O comando antigo `/importar` foi removido. Depois que um dashboard alterar o
catálogo central, o mestre pode usar `/catalogo_recarregar` para atualizar a
memória do bot sem reiniciá-lo.

Quando `PLATFORM_API_URL` e `SERVICE_API_KEY` estiverem configuradas, o bot
também oferece:

- `/vincular` — confirma no Discord o código criado no perfil web;
- `/campanha_vincular` — liga o servidor Discord a uma campanha do mestre;
- `/minhas_campanhas` — lista campanhas e personagens da conta vinculada.

A economia antiga ainda acessa diretamente as tabelas atuais. A troca para as
rotas idempotentes da plataforma será feita depois que o PostgreSQL real e a API
estiverem publicados e testados, evitando migrar saldo no escuro.

## Configurar o PostgreSQL na Discloud

1. No menu lateral da Discloud, vá em **Banco de dados** (é uma seção
   própria, separada de Aplicações/Templates) e clique em **Criar
   database** para criar uma instância PostgreSQL.
2. Ative `VLAN=true` no banco. O Banqueiro já está com `VLAN=true` em
   `discloud.config`.
3. Na página do banco na Discloud, seção **Conexão privada**, copie o
   **Host** exibido ali — cada banco criado ganha um hostname
   auto-gerado (tipo `klippell1422`), não é algo que você escolhe. Use
   esse valor exato (não adivinhe/não copie de exemplo antigo) pra montar
   o `DATABASE_URL` da aplicação Banqueiro.
4. Configure também `DISCORD_TOKEN` e, opcionalmente, `GUILD_ID`.
5. Faça commit/rebuild do Banqueiro.
6. Repita a `DATABASE_URL` (mesmo banco, mesmo host) na aplicação do
   Jornalista, com um `DISCORD_TOKEN` **próprio** — é um app Discord
   separado.

Formato ilustrativo (não use estes valores — troque pelo host real da
seção Conexão privada):

```env
DATABASE_URL=postgresql://USUARIO:SENHA@HOST_REAL_DO_PAINEL:5432/BANCO
```

Use a string gerada pela Discloud; não monte credenciais reais manualmente se o
painel já oferecer a URL pronta. Senhas com caracteres especiais precisam estar
corretamente codificadas na URL.

Documentação oficial relevante:

- [Bancos de dados na Discloud](https://docs.discloud.com/api-and-integrations/databases)
- [VLAN e hostname privado](https://docs.discloud.com/configurations/discloud.config/vlan)
- [Variáveis de ambiente](https://docs.discloud.com/faq/general-questions/em-andamento-arquivo-.env)

## Variáveis

Veja `.env.example` para a lista sem segredos:

- `DISCORD_TOKEN` — obrigatória;
- `DATABASE_URL` — obrigatória;
- `GUILD_ID` — opcional, acelera a sincronização de comandos num servidor;
- `DATABASE_STARTUP_TIMEOUT` — opcional, padrão 12 segundos.

Nunca envie o `.env` real ao Git. O `.gitignore` e o `.discloudignore` protegem
esse arquivo; em produção, configure os valores no painel.

## Inicialização do banco

No primeiro boot, o Banqueiro:

1. valida a conexão antes de entrar no Discord;
2. cria as tabelas ausentes com `CREATE TABLE IF NOT EXISTS`;
3. semeia `catalogo_itens` somente se ela estiver vazia;
4. carrega o catálogo do PostgreSQL;
5. conecta o bot e sincroniza os slash commands.

Se a conexão falhar, o pool é encerrado de forma limpa e o log mostra uma
mensagem curta sobre `DATABASE_URL`/VLAN, em vez de aguardar repetidamente por 30
segundos e terminar com erro de finalização do Python.

## Diagnóstico dos logs antigos

- `Network is unreachable` para um IP IPv6: a URL ainda apontava para o host
  externo do Supabase, sem rota IPv6 na máquina da Discloud.
- `PoolTimeout`: consequência da falha de rede acima.
- `PyNaCl is not installed` e `davey is not installed`: avisos de recursos de
  voz. O Banqueiro é um bot de texto; esses avisos não derrubam o processo.

## Rodar localmente

Requer Python 3.11+ e um PostgreSQL separado para desenvolvimento:

```bash
cd bots/banqueiro
python -m venv .venv
.venv/Scripts/activate
python -m pip install -r requirements.txt
copy .env.example .env
python main.py
```

Não rode testes destrutivos contra o banco de produção. `TEST_DATABASE_URL`
deve apontar para uma instância descartável de testes.

## Estrutura

```text
bots/banqueiro/
├── main.py
├── discloud.config
├── requirements.txt
├── core/
│   ├── config.py
│   ├── db.py
│   ├── catalogo.py
│   ├── economia.py       # constantes de segurança, roubo, dívida e recompensa
│   ├── loot.py            # só o sorteio (sortear_bau); agendamento é do Jornalista
│   └── ui.py               # marca, cores, barra de progresso — toda embed usa isso
├── cogs/
│   ├── economia.py         # carteira, loja, cofre (itens + dinheiro), cartão, roubo
│   ├── recompensas.py       # dívida crescente, procurados, recompensas entre jogadores
│   ├── admin.py             # comandos de mestre, incluindo /juros_cofre e /setroubo
│   ├── ajuda.py             # /ajuda (por categoria) e /comandos (lista tudo)
│   ├── integracao.py
│   └── trocas.py
└── data/catalogo.json      # somente semente inicial
```
