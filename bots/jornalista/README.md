# Jornalista — O Jardim RPG

Bot de anúncios e cronista do mundo: solta baús que aparecem sozinhos, em
horário aleatório, num canal do servidor (primeiro a clicar "Abrir baú" leva
o prêmio — Lunaris + itens sorteados por raridade, ponderados pela estação
atual do Jardim); publica no canal do jornal os avisos que o Banqueiro
enfileira — recompensa colocada em alguém, jogador procurado por dívida e
quitação pública; e é dono do ciclo de **estação + clima** do Jardim e
das notícias customizadas do mestre.

Esse bot nasceu de um split do antigo **Consultor**: carteira, cofre, cartão,
câmbio e roubo ficaram no **Banqueiro** (`bots/banqueiro`), enquanto compras
de itens ficam na Loja do site. O Jornalista cuida do loot que aparece
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
- **Estação (`estacao`)**: é escrita pelo Jornalista com
  `/jornal estacao_definir`, pois influencia diretamente o sorteio dos baús.
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
  baús continuam soltando Lunaris, só sem item sorteado. O nome público
  **Mítico** é aceito junto do id legado `reliquia`; ambos são persistidos
  como `reliquia` para manter fichas antigas compatíveis.

Quando `PLATFORM_API_URL` e `SERVICE_API_KEY` estiverem configuradas (mesma
integração do Banqueiro), o loot dos baús vai direto pro cofre da conta no
site. Sem integração — ou pra contas ainda não vinculadas — o prêmio cai na
mesma `carteira`/`inventario` que o Banqueiro usa, e o jogador pode guardar
as moedas em segurança com `/cofre_depositar` no Banqueiro.

## Comandos

**Baús automáticos** (`cogs/baus.py`):

- `/bau_config` — [Mestre] liga/desliga os baús automáticos e define janela,
  itens-base e faixa-base de Lunaris. Cada raridade aplica automaticamente
  seus próprios multiplicadores. O parâmetro de canal antigo continua aceito.
- `/bau_canal_adicionar` / `/bau_canal_remover` — [Mestre] mantém a lista
  de destinos entre os quais cada novo baú é sorteado.
- `/bau_canais` — [Mestre] mostra os destinos válidos e os que estão sendo
  ignorados porque foram apagados ou perderam permissões.
- `/bau_pendentes` — [Mestre] lista entregas que ainda aguardam confirmação,
  com vencedor, prêmio exato, erro e ID da mensagem.
- `/bau_reprocessar <mensagem_id>` — [Mestre] tenta a entrega novamente para
  o mesmo vencedor, usando o prêmio persistido e a mesma chave idempotente.
- `/bau_agora [canal] [raridade]` — [Mestre] solta um baú imediatamente em um
  canal informado ou sorteado. A raridade opcional permite testar cada perfil.
- `/bau_canal_tema` — [Mestre] favorece um tipo de achado físico no canal.
  Veículos, peças/módulos de veículo e monstros não entram em baús: veículos
  pertencem a **Bens** e monstros são contratos do Bestiário, não itens de
  inventário. Configurações antigas com tema de veículo usam loot padrão até
  o mestre escolher um tema atual.

O baú em si não tem comando de jogador: aparece sozinho em um dos canais
válidos da rotação, com um botão "Abrir baú 🎁" — o primeiro clique leva.
O tipo também é sorteado: não existe mais um único baú genérico.

| Raridade do baú | Frequência normal | Enigma | Tempo no ar | Lunaris-base |
|---|---:|---|---:|---:|
| Comum | 55% | nenhum | 180 min | ×1 |
| Incomum | 29% | nenhum | 120 min | ×1,25 |
| Raro | 12% | fácil | 90 min | ×1,75 |
| Épico | 3% | médio | 60 min | ×2,5 |
| Lendário | 0,8% | difícil | 30 min | ×4 |
| Mítico | 0,2% | lendário | 15 min | ×8 |

Estações especiais usam uma distribuição mais generosa. Baús Épicos ou
superiores também recebem itens extras, até o limite de cinco. Cada perfil
favorece itens de raridade compatível; a estação continua modificando o peso.
Quanto mais raro, menos tempo o grupo tem para resolver. Relíquia da Criação
continua sendo uma raridade de **item**, mas não existe como raridade de baú.
Os enigmas misturam fatos do RPG, economia, ficha, vida cotidiana, objetos,
charadas clássicas, sequências, lógica e probabilidade. O card informa a
dificuldade e mostra exatamente quando o baú desaparecerá.

Um mesmo baú nunca repete o mesmo item; se houver menos opções elegíveis que
o limite configurado, ele entrega apenas as opções distintas disponíveis.
Antes de entregar, o bot grava no PostgreSQL o vencedor, o prêmio completo e
a chave `bau-drop:<mensagem_id>`. O card muda para o estado final com vencedor,
prêmio e destino. Se a resposta da plataforma for ambígua, o botão não reabre:
a entrega fica pendente e pode ser reprocessada sem trocar o vencedor nem
duplicar o depósito. O fallback na carteira do Banqueiro conclui o prêmio e o
status na mesma transação. Se ninguém abrir dentro do prazo, o card mostra que
o baú desapareceu. O canal único salvo por versões antigas é migrado
automaticamente para a rotação. Baús prometidos por `/jornal rumor` só são
marcados como concluídos depois que a publicação chega ao Discord; falhas de
canal, permissão ou rede ficam pendentes para nova tentativa. Os avisos
(recompensas, procurados e quitações) também aparecem sozinhos, publicados
automaticamente na categoria **Dinheiro e economia** de `/jornal canal`. Se
ela não estiver configurada, o bot usa `/jornal principal` como fallback. O
Jornalista checa a fila a cada minuto.

**Jornal** (`cogs/jornal.py` — grupo `/jornal`, todo master-only via
`default_permissions`, exceto `/estacao` que é fora do grupo de propósito):

- `/jornal configurar <principal>` — configura o canal principal e permite
  definir, numa única execução, notícias, clima, economia, chegada, saída e
  um canal da rotação de baús.
- `/jornal status` — mostra canais ausentes, canais sem permissão, automações,
  estação, situação dos baús e publicações aguardando entrega. É o primeiro
  comando recomendado no diagnóstico.
- `/jornal automacao <tipo> <ligar>` / `/jornal automacoes` — controla e
  consulta tudo que o bot envia sozinho: entrevistas, horóscopo, avisos,
  loteria, boas-vindas, despedidas, resumo semanal, pautas, rumores, clima,
  estação e baús. O resumo semanal começa ligado; os recursos antigos
  preservam o estado que já possuíam.
- `/jornal pauta criar|listar|ver|publicar|agendar|cancelar` — fluxo editorial
  persistente. Toda pauta nasce como rascunho, pode ser revisada em prévia
  privada e só vira publicação por aprovação explícita ou agendamento. Datas
  aceitam `DD/MM/AAAA HH:MM` no horário de São Paulo.
- `/jornal fila` / `/jornal fila_reprocessar` — mostra mensagens automáticas
  que não chegaram ao Discord e reativa as que esgotaram as tentativas. A fila
  usa chave idempotente, espera progressivamente entre falhas e sobrevive a
  reinícios do bot.
- `/jornal orcamento [limite]` — consulta ou define o teto mensal das
  recompensas editoriais. Desafios abertos reservam o valor antes de serem
  publicados no orçamento do mês em que foram criados. Loteria não consome o teto porque é financiada pelos bilhetes;
  baús continuam sendo loot do sistema.
- `/jornal principal <canal>` — define o canal principal e fallback para
  conteúdos sem uma rota específica. Essa configuração agora pertence ao
  Jornalista.
- `/publicar_noticia` — abre um formulário com título, resumo, corpo, autoria
  e URL HTTPS de imagem opcional. Fora do grupo `/jornal` de propósito: o
  Discord só permite um `default_member_permissions` por comando raiz, e o
  grupo `/jornal` inteiro é restrito a Mestre/assistente. Quando o Mestre usa,
  mostra uma prévia privada com **Publicar** e **Cancelar** (nada chega ao
  canal antes da confirmação); quando um jogador usa, vira um rascunho de
  pauta que o Mestre aprova com `/jornal pauta publicar` ou `/jornal pauta
  agendar`.
- `/jornal canal` / `/jornal canais` — define e consulta rotas específicas
  para notícia, clima, entrada, saída de membros, avisos de dinheiro, o
  resultado da Loteria Dominical, **Sessão** (sessão começou, lembretes,
  crítico) e **Liberações do Mestre e mural**. Os dois últimos são os avisos
  que o site enfileira; cada um pode ir para um canal próprio (também em
  `/jornal configurar`, opções `sessao` e `liberacoes`). Sem rota, caem no
  canal principal. Quais avisos são enviados continua sendo escolhido no site.
- `/jornal estacao_definir <estacao>` — define a estação do Jardim (as 6:
  Primavera/Verão/Outono/Inverno/Noite Eterna/Eclipse — ver
  `core/economia.py`), muda o peso de raridade do
  loot dos baús automáticos, e avisa no canal do jornal.
- `/jornal avancar_mes` — sorteia o clima do mês (`core/clima.py`),
  restrito ao que a estação atual permite (4 comuns + o exclusivo da
  estação + 3 raros universais bem menos prováveis), e publica em formato
  de "capa de jornal". Efeito é sempre narrativo — o Jornalista não toca
  no motor de rolagem, o texto já deixa isso explícito.
- `/registro criar`, `/registro opcao` e `/registro publicar` — criam os
  painéis atuais de cargos por reação. `/registro preset_arvores` prepara o
  painel das 10 Árvores; `/registro paineis` e `/registro opcoes` consultam
  a configuração.
- `/conquistas` — mostra, em resposta privada, somente os títulos secretos
  já descobertos pelo jogador e tenta entregar seus cargos pendentes.
- `/conquistas_config listar` — [Mestre] consulta os critérios secretos.
- `/conquistas_config sincronizar [jogador]` — [Mestre] reavalia as conquistas
  do jogador ou do servidor e tenta entregar os cargos.
- `/estacao` — qualquer jogador pode ver a estação atual (só leitura).

### Cargos secretos

O Jornalista verifica conquistas a cada cinco minutos, usando os registros
confirmados do PostgreSQL compartilhado. A automação começa ligada e pode
ser pausada em `/jornal automacao` escolhendo **Cargos secretos por conquistas**.
Pausar não remove títulos ou cargos já entregues.

Os cargos são criados no primeiro desbloqueio, sem permissões, cor própria
ou menção liberada. São permanentes e cumulativos. O bot precisa de
**Gerenciar Cargos** e de estar acima deles na hierarquia. Uma entrega que
falhar será tentada novamente; reiniciar o bot não apaga a conquista.
Os critérios não aparecem na consulta do jogador, mas um cargo criado pode
ser visto normalmente nas listas e perfis do Discord.

Catálogo administrativo (critérios de design do bot, sem efeito na ficha):

| Cargo | Critério |
| --- | --- |
| Dedos Leves | 1 roubo bem-sucedido de carteira ou cofre |
| Sombra do Banco Lunar | 10 roubos bem-sucedidos |
| Lenda do Submundo | 50 roubos bem-sucedidos |
| Chave Mestra | 10 arrombamentos de cofre bem-sucedidos |
| Fortuna Alheia | 5.000 Lunaris recebidos em roubos |
| Farejador de Tesouros | 10 baús do Jornalista entregues |
| Colecionador de Fechaduras | 50 baús do Jornalista entregues |
| Lenda dos Tesouros | 100 baús do Jornalista entregues |
| Toque do Impossível | 1 baú Mítico do Jornalista entregue |
| Decifrador do Jardim | 5 desafios do jornal resolvidos |
| Voz do Jardim | 3 entrevistas publicadas |
| Pena da Lua | 3 pautas de sua autoria publicadas |
| Queridinho do Destino | 1 vitória com prêmio na Loteria Dominical |
| Olho da Rua | 5 furos comprados pelo Jornalista |
| Caçador de Lendas | 5 recompensas por captura recebidas |

Roubos e capturas usam os créditos positivos em Lunaris do extrato do
Banqueiro. Débitos da vítima, multas e tentativas malsucedidas não contam.
Os títulos de baús consideram `baus_entregas.status='entregue'`: incluem os
baús automáticos, manuais e de rumores do Jornalista, mas não os baús
comprados no Banqueiro. Reprocessar uma entrega não aumenta a contagem.
O histórico existente conta quando há registros suficientes. Furos antigos
sem lançamento no extrato não podem ser reconstruídos com segurança.

### Fofocas e classificados

`/vender_furo` aceita uma tentativa por hora por jogador e servidor, inclusive
se a história for recusada. O intervalo sobrevive a reinícios. A chance de
compra continua em 30%, pagando de 50 a 150 Solares; pagamento, extrato e
criação da fofoca são gravados juntos. Não aceita o próprio jogador ou bots.

`/subornar_jornalista` só cobra uma fofoca ainda dentro do prazo; cobrança e
cancelamento são atômicos. Após o prazo, a fofoca entra na fila durável.
`/anunciar_classificado` aceita texto de 1 a 3.000 caracteres e custa pelo
menos 50 Solares. O débito e o anúncio são gravados juntos, sem nova cobrança
ao repetir a mesma interação. Falhas de Discord são recuperadas pela fila.

**Entrada/saída de membro** (`cogs/boasvindas.py` — sem comando, dispara
sozinho):

- `on_member_join` — anuncia a chegada no canal do jornal (uma de 4
  variações de texto) e menciona o canal de registro, se configurado.
- `on_member_remove` — anuncia a partida (uma de 4 variações). Precisa da
  intent privilegiada `Server Members Intent` ligada no Developer Portal
  (Bot → Privileged Gateway Intents), além do `intents.members = True` já
  em `main.py` — sem isso os eventos nunca disparam.

## Mecânicas próprias do bot

Estas mecânicas servem para movimentar o Discord, mas não são regras da ficha:

- **Estação e clima:** a estação altera a raridade dos baús e dos itens;
  os efeitos de clima são sugestões narrativas e dependem do mestre.
- **Horóscopo:** escolhe uma Árvore por dia. Quem possui o cargo correspondente
  recebe Lunaris em dobro nos baús daquele dia; isso é um bônus econômico do bot.
- **Entrevista semanal:** seleciona alguém sem entrevista pendente. Se a DM
  estiver fechada, publica a pergunta no jornal e permite responder com
  `/entrevista_responder`; a pergunta também aparece dentro do modal. Cada
  jogador pode entrar ou sair do sorteio com `/entrevista_participar`.
- **Desafio:** a recompensa é paga e registrada na mesma transação que encerra
  o desafio, evitando desafio concluído sem pagamento.
- **Loteria Dominical:** usa os bilhetes vendidos pelo Banqueiro e anuncia o
  resultado no canal de dinheiro/economia.
- **Resumo semanal:** quando ativado, reúne baús entregues, desafios,
  entrevistas e movimentações em Lunaris registradas nos últimos sete dias.
  A mensagem deixa explícito que atividades fora dos bots não entram no total.

**Ajuda:** `/ajuda` mostra um menu com as categorias acima.

## Variáveis

Veja `.env.example`:

- `DISCORD_TOKEN` — obrigatória (token do app Discord do Jornalista);
- `DATABASE_URL` — obrigatória (mesmo Postgres do Banqueiro);
- `GUILD_ID` — opcional; quando definido, publica os comandos somente nesse
  servidor e remove cópias globais antigas para não exibir duplicados;
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
│   ├── publicacoes.py    # persistência e entrega idempotente de mensagens
│   ├── ui.py            # cores e ícones por categoria
│   └── loot.py
├── cogs/
│   ├── baus.py          # agendamento + anúncio + entrega dos baús
│   ├── avisos.py         # publica a fila de avisos que o Banqueiro enfileira
│   ├── publicacoes.py    # ciclo de retentativas das publicações automáticas
│   ├── jornal.py         # grupo /jornal: modal de notícia, canais, estação e boas-vindas
│   ├── registro.py       # painéis configuráveis de cargos por reação
│   ├── boasvindas.py      # on_member_join/on_member_remove
│   └── ajuda.py           # /ajuda
└── tests/
    ├── test_comandos.py
    ├── test_economia.py
    ├── test_clima.py
    ├── test_arvores.py
    └── test_jornal_ui.py
```

## Testes

Os testes usam dublês locais de Discord e um PostgreSQL descartável para
integração. Defina `TEST_DATABASE_URL` com um banco local de testes, diferente
de `DATABASE_URL`; cada teste cria e remove somente seu próprio schema.
Os testes não devem apontar para o PostgreSQL de produção:

```bash
cd bots/jornalista
python -m pip install pytest
python -m pytest tests/ -q
```
