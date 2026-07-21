# Arquitetura da Plataforma O Jardim

## Decisão

PostgreSQL é a fonte única de verdade. Site, bots e futuro VTT acessam os
dados pela API. Somente a API e serviços internos autorizados recebem
credenciais; o navegador nunca conhece a senha do banco.

```text
Navegador  ── HTTPS/cookie ──┐
                            ├── Plataforma/API ── VLAN ── PostgreSQL
Bots Discord ── VLAN/chave ──┘
```

## Endereços do site

A API serve o front. Cada módulo tem um endereço limpo — `/`, `/ficha`,
`/mundo`, `/regras`, `/loja` — e `/templates/*.html` continua válido para links
antigos. Um endereço desconhecido devolve uma página HTML com o caminho de
volta; só chamadas sob `/api/` respondem 404 em JSON.

Ao abrir qualquer página, o navegador busca `GET /api/v1/contexto`, que devolve
conta, campanhas, campanha atual, membros, personagens e a contagem de avisos
em uma única viagem. Antes eram quatro requisições encadeadas antes do primeiro
pixel.

## Peso das respostas e dos ativos

Três regras que o projeto segue para não repetir problemas já corrigidos:

- **Ficha completa só sai por `/personagens`.** O contexto manda um resumo
  (`core/character_summary.py`) com raça, classes e vida — uma ficha chega a
  1 MB e apareceria em toda página do mestre.
- **Listagem resolve seus agregados.** `/personagens?completo=true` traz
  carteira e inventário de todos de uma vez, em duas consultas, no lugar de uma
  requisição por personagem.
- **Ícones são WebP de 192 px.** Os PNGs de origem têm 1254 px e ~1,5 MB cada;
  `tools/otimizar-icones.py` gera as versões web a partir deles.

## Quem pode criar conta

`CADASTRO` decide: `aberto`, `convite` ou `fechado`. Produção assume `convite`
quando a variável não está definida — esquecer de configurar não pode resultar
em cadastro aberto para a internet, ainda mais sem confirmação de e-mail.

No modo `convite`, o código é o mesmo do convite de campanha: a conta nasce já
dentro da mesa de quem convidou, com o papel do convite, e o mestre recebe
aviso. Pedir o código no cadastro e de novo depois seria a mesma pergunta duas
vezes.

A conta de `CREATOR_EMAIL` se cadastra em qualquer modo. Sem essa exceção o
primeiro acesso ficaria travado: não há campanha para convidar ninguém antes de
existir a primeira conta.

## Limite de tentativas

`core/limites.py` guarda a contagem no banco — reiniciar o container não pode
servir de reset para quem está martelando a porta. Cada ação tem sua política:

| Ação | Teto | Chave |
| --- | --- | --- |
| login | 5 em 15 min | e-mail + origem |
| cadastro | 3 em 60 min | origem |
| pedido de senha | 5 em 60 min | origem |
| troca de senha | 5 em 15 min | conta |

A contagem roda em transação própria (`limites.cobrar`). A conexão do pool faz
rollback quando a rota levanta exceção — contar na mesma transação do trabalho
apagaria justamente as tentativas recusadas, que são as que precisam contar, e
o teto nunca seria atingido.

O login usa e-mail + origem para que errar a senha de uma conta não tranque o
acesso das outras a partir do mesmo lugar. As demais usam só a origem: ali o
que se quer barrar é o volume vindo de um ponto.

## Senha esquecida

Não há envio de e-mail. Quem esquece a senha pede a um administrador, que gera
uma senha provisória no painel — mostrada uma única vez, para ser entregue pelo
Discord ou pessoalmente. O reset derruba todas as sessões daquela conta, então
uma conta perdida para outra pessoa é recuperada na hora.

Na tela de entrada há **Esqueceu a senha? Pedir uma nova**: o pedido entra numa
fila que aparece no topo do painel de administração, com o botão que gera a
provisória. A resposta ao pedido é sempre a mesma, exista ou não a conta — senão
a rota viraria um jeito de descobrir quem tem cadastro aqui.

A conta entra normalmente com a provisória, mas o site fica preso na tela de
troca até ela escolher uma senha própria; a troca exige a provisória e derruba
as demais sessões.

**Quando ninguém consegue entrar** — a senha do dono se perdeu e não há outro
administrador —, `tools/conta-admin.py` fala direto com o banco:

```
python tools/conta-admin.py listar
python tools/conta-admin.py senha dono@exemplo.com
python tools/conta-admin.py promover dono@exemplo.com
```

Só quem tem a `DATABASE_URL` roda isso, o que o torna a última chave da casa. A
conta criador não é redefinível pelo painel justamente para que um admin comum
não possa tomá-la; por este script, sim.

## Sessão ao vivo

Uma campanha tem no máximo uma sessão aberta por vez (índice parcial em
`sessoes_mesa`). A sessão guarda rodada, turno e os participantes — personagens
da campanha mais os inimigos que o mestre criar na hora.

O tempo real usa Server-Sent Events em `/api/v1/sessao/{campanha}/eventos`. O
evento carrega **apenas a versão nova**, nunca o estado: cada cliente refaz o
GET e recebe o recorte permitido para o papel dele. Assim a regra de sigilo
mora em um lugar só, e um evento perdido numa reconexão não deixa a tela
mentindo.

O que o jogador vê é decidido no servidor, nunca escondido só no CSS:

- participante com `visivel=false` não é enviado;
- vida com `vida_visivel=false` vira estado em palavras ("Ferido"), sem números;
- o personagem do próprio jogador sempre mostra números.

Como só há uma instância de uvicorn, o registro de assinantes vive em memória
(`core/live_session.py`). Com mais de um processo isso vira LISTEN/NOTIFY do
Postgres sem mudar o formato do evento.

## Rolagem de dados e log da mesa

Os dados são rolados **no servidor** (`core/dados.py`), nunca no navegador. Um
resultado sorteado no cliente não serve como prova: bastaria o console para
escolher o 20. O bônus continua vindo da ficha — validá-lo exigiria
reimplementar o cálculo de perícias em Python —, mas é gravado junto com a
origem declarada (perícia, grau, arma), então o mestre vê de onde saiu.

A sintaxe de expressão é a mesma do Rollem, que a mesa já usava no Discord, e
vale igual no site e no Barista: `2d6+3`, `1d20+1d4-2` e `2#d20`. O `#` separa
"repetir a rolagem" de "somar mais dados" — `2#d20` devolve dois resultados
independentes; `2d20` devolve um só, somado.

`registros_mesa` guarda no mesmo lugar as rolagens e os usos de poder,
habilidade, magia e item. Quando há sessão aberta, o registro é amarrado a ela.
O nome do autor é congelado na linha para o log continuar legível depois de o
personagem ser renomeado ou arquivado.

No log, o mestre vê tudo — é o ponto do registro. O jogador vê só o que ele
mesmo registrou: descobrir pelo log que outro rolou Furtividade entregaria a
cena. O recorte é feito na consulta, não na tela.

## Avisos

Toda ação de painel que muda a vida de outra pessoa grava uma notificação para
os afetados: cargo alterado, conta reativada, papel na campanha, entrada e saída
de membros, conteúdo publicado, informação revelada e recompensa do Discord no
cofre. Quem executou a ação não recebe aviso da própria ação.

Os avisos ficam em `notificacoes`, aparecem no sino do portal e são marcados
como lidos pelo dono. Apagar só é possível depois de lido.

## Autorização

A autorização possui duas camadas independentes.

Cargo global da conta:

- `player`: entra em campanhas por convite;
- `mestre`: pode criar campanhas;
- `admin`: acessa o painel de usuários e atribui `player`, `mestre` ou `admin`;
- `criador`: cargo único configurado por `CREATOR_USER_ID`, com acesso de
  administrador e de mestre. O painel nunca concede, remove ou rebaixa esse
  cargo.

Papel por campanha:

- `mestre`: dono e autoridade final da campanha;
- `assistente`: administra conteúdo e liberações, mas não substitui o dono;
- `jogador`: controla os próprios personagens;
- `observador`: recebe apenas informações explicitamente visíveis/liberadas.

Uma mesma conta pode ser mestre em uma campanha e jogador em outra.

Contas são desativadas em vez de apagadas fisicamente para preservar fichas,
economia e auditoria. Uma conta que ainda possui campanha ativa não pode ser
desativada até que essas campanhas sejam arquivadas ou transferidas.

## Informações liberadas

Cada recurso de campanha possui:

- tipo e chave estável;
- título;
- texto de rumor;
- dados parciais;
- dados completos;
- acesso padrão.

O mestre pode elevar o acesso para um usuário, personagem ou papel inteiro:

```text
oculto < rumor < parcial < completo
```

O servidor calcula o maior nível aplicável e envia somente aquele conteúdo.
Informação oculta não é enviada ao navegador.

## Personagens

A ficha mecânica flexível permanece em JSONB, mas identidade, campanha, dono,
versão e status ficam em colunas relacionais. A versão impede que duas abas
sobrescrevam silenciosamente a alteração uma da outra.

Carteira, inventário e saldo legado `lunaris` são removidos do JSON livre no
servidor. Eles vivem em tabelas próprias, usadas tanto pela ficha quanto pelos
bots.

## Discord

O usuário gera no site um código de dez minutos e o envia ao bot. O bot confirma
o ID Discord pela rota interna. Isso impede que alguém digite manualmente o ID
de outra pessoa no site.

O mestre vincula um servidor Discord a uma campanha por um comando interno.
Os bots então resolvem servidor, conta vinculada, campanha e personagem ativo.

## Economia

Cada alteração gera um lançamento imutável. Rotas internas exigem
idempotência: repetir a mesma requisição devolve o resultado anterior, sem
duplicar recompensa. Atualizações concorrentes são serializadas no PostgreSQL.

Recompensas do Discord não escolhem personagem automaticamente. Elas entram no
`cofre_itens_usuario`/`cofre_saldos_usuario`, vinculados à conta e campanha. O
jogador transfere depois para um personagem próprio; a operação é atômica,
versionada e auditada.

## Migração da ficha atual

1. Login, cadastro e seleção de campanha: concluído.
2. Personagens da API e salvamento versionado: concluído.
3. Migração automática, uma única vez, das fichas locais para a primeira
   campanha escolhida: concluído; a cópia antiga é preservada.
4. Carteira, inventário e cofre de recompensas central: concluído.
5. Loja/Mundo sem importação, publicados pelo mestre: concluído.
6. Liberações por campanha, usuário, personagem ou papel: concluído.
7. Mapa/VTT colaborativo: etapa futura sobre esta mesma API.

O `localStorage` antigo não será limpo automaticamente durante essas etapas.
