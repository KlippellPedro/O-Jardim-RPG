# Banqueiro — O Jardim RPG

Bot de economia do RPG: carteira, cofre (itens **e** dinheiro guardado),
cartão de crédito, loja, câmbio, roubo e trocas entre jogadores. O Banqueiro
cuida só de dinheiro/posses — o loot que aparece sozinho pelo servidor
(baús automáticos) é anunciado por outro bot, o **Jornalista**
(`bots/jornalista`), que lê/grava a mesma base.

## Mecânicas

- **Reputação bancária e Cartão Lunar** — são valores diferentes. A reputação
  é a confiança do Banqueiro no jogador: ela libera raridades da loja, baús,
  níveis de cartão, cofre e segurança, além de benefícios como descontos,
  cashback e aumento de limite. Itens Comuns são livres; Incomum exige 100,
  Raro 250, Épico 450, Lendário 700, Relíquia 1.000 e Relíquia da Criação
  1.500 pontos. O **limite do cartão** é o teto em Lunaris que
  pode financiar uma compra quando a carteira não cobre o preço. A parte já
  usada vira fatura; portanto,
  `limite disponível = limite total - faturas pendentes - dívida`.
  O banco ainda armazena a reputação na coluna legada `cartao.credito`, mas
  comandos e mensagens usam os nomes corretos.
- **Fatura em sete dias** — o Banqueiro tenta cobrar somente a carteira. Se
  faltar Lunaris e o limite disponível cobrir todo o restante, mostra uma
  confirmação privada com preço, saldo, valor financiado, limite restante e
  vencimento. Nada é financiado sem confirmação. A compra confirmada cria uma
  fatura consultável em `/fatura`, pagável com `/fatura_pagar`. Quitar uma
  fatura inteira no prazo concede de 3 a 50 pontos de reputação, conforme o
  valor originalmente financiado. Depois de sete dias, somente o saldo ainda
  aberto vira dívida e passa a sofrer as regras de devedor. Reputação negativa
  pode se recuperar até zero depois da quitação; reputação positiva só é ganha
  mantendo faturas em dia.
- **Carteira** (`/carteira`) — dinheiro "vivo". Recebe o Lunaris dos baús,
  compras, vendas etc. `/roubar <membro>` abre uma tentativa pública e a
  vítima tem **5 segundos** para clicar em `Impedir o roubo`. Se o prazo
  acabar, o ladrão leva 100% do saldo exposto (`ROUBO_CARTEIRA_PERCENT`). A
  tentativa consome o cooldown mesmo quando é impedida. Depois de ser roubada,
  a vítima fica um tempo protegida
  contra novo roubo de carteira (`ROUBO_PROTECAO_VITIMA_HORAS`) e recebe uma
  DM avisando quanto foi levado e por quem (silenciosamente ignorado se a
  vítima tiver DM fechada).
- **Cofre** (`/cofre`) — guarda itens (limitados pelo tier) e dinheiro
  (`/cofre_depositar`, `/cofre_sacar` — saque cobra uma taxa pequena). O
  tamanho possui 15 níveis e termina no Cofre Sem-Fim, sem limite prático.
  `/cofre` mostra somente o estado atual; `/cofre_melhorias` reúne os próximos
  upgrades disponíveis, ganhos e preços. Os primeiros níveis usam Lunaris;
  a progressão passa a combinar Solares, Fragmentos de Estrela e Créditos
  Sombrios, até o pacote final com as quatro moedas. A cobrança é atômica:
  se faltar qualquer material, nenhum saldo ou nível é alterado. Descontos
  de reputação alcançam Lunaris e Solares, mas não os materiais raros. O dinheiro guardado é
  **defensável**: `/roubar_cofre` também dá 5 segundos
  para a vítima impedir. Sem reação, tenta arrombar e, se der certo, leva 50%
  fixo do saldo guardado (`ROUBO_COFRE_PERCENT`) — mas a *chance* de dar certo
  depende da **Segurança** que o dono comprou
  (`/cofre_seguranca_melhorar`). Segurança Básica (de fábrica) defende 50%
  das tentativas; cada tier comprado é um patamar fixo de defesa mais alto
  (a progressão agora possui 15 níveis e chega a 99% — ver `SEGURANCA_TIERS` em
  `core/economia.py`). Se o roubo falhar, o ladrão paga multa pro alvo. O
  cofre também pode render juros (`/juros_cofre`, comando de mestre, tipo
  timeskip de fim de sessão) — só o saldo guardado, nunca a carteira.
- **Proteção do mestre** — `/mestre_proteger <membro>` define uma única conta
  imune aos dois tipos de roubo no servidor; chamar o comando sem membro remove
  a proteção. Tentar roubar essa conta consome o cooldown e queima no máximo
  1 Lunaris da carteira do ladrão, apenas como punição cômica. A conta
  protegida também não pode receber novas recompensas.
- **Dívida e procurados** — o valor financiado fica primeiro em uma fatura e
  somente o saldo não pago após sete dias vira uma dívida separada da carteira.
  Receber Lunaris não paga essa dívida: o jogador escolhe
  quanto pagar com `/divida_pagar <quantia>`. A dívida cresce sozinha com o tempo (`DIVIDA_TICK_HORAS`,
  `DIVIDA_TAXA_CRESCIMENTO`) e reduz a reputação bancária. Passar de um certo limiar
  de dívida (`DIVIDA_RECOMPENSA_LIMIAR`) coloca uma recompensa automática na
  cabeça do devedor — o Banqueiro avisa o Jornalista, que anuncia no jornal.
  Quem "capturar" o devedor (roubando a carteira ou o cofre dele) leva a
  recompensa e a dívida é perdoada. Se o devedor pagar por conta própria sem
  ser capturado, a recompensa de sistema é removida — só
  não some a parte que outro jogador colocou por conta dele. Fica em dia e o
  reputação se recupera sozinha aos poucos. Veja sua situação com `/divida`.
- **Recompensas entre jogadores** — qualquer um pode colocar recompensa na
  cabeça de outro (`/recompensa_colocar`, pago da própria carteira). Some
  com recompensas do sistema se houver. `/recompensa_ver` mostra quem tá
  mais procurado no servidor.
- **Extrato** (`/extrato [membro]`) — histórico das últimas 15 transações de
  qualquer jogador: compras, vendas, câmbio, depósito/saque do cofre,
  roubos (dos dois lados), multas, recompensas, pagamentos, juros de
  dívida e ações de mestre. Serve pra resolver "quem mexeu no meu dinheiro"
  numa disputa de mesa. Praticamente toda operação que move qualquer moeda
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
- **Catálogo em execução:** a tabela `catalogo_itens` é a fonte lida pelos
  bots. O arquivo versionado `data/loja/catalogo.json` serve de semente inicial e
  também de fonte para republicações controladas pelo mestre.

Na Discloud, Banqueiro e PostgreSQL continuam sendo **duas aplicações
separadas**, ligadas pela mesma VLAN privada. O banco não deve ser colocado no
mesmo processo ou no mesmo ZIP do bot.

O comando antigo `/importar` foi removido. Para publicar adições, edições e
remoções feitas em `data/loja/catalogo.json`, use `/catalogo_republicar`. O comando
`/catalogo_recarregar` apenas atualiza a memória do bot com o conteúdo que já
está no PostgreSQL.

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
- `GUILD_ID` — opcional; quando definido, publica os comandos somente nesse
  servidor e remove cópias globais antigas para não exibir duplicados;
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
└── ../../data/loja/catalogo.json # fonte única no monorepositório
```
