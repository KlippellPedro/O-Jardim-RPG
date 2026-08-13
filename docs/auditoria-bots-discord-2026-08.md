# Auditoria dos bots Discord — Banqueiro, Jornalista e ecossistema

**Data:** 2026-08-11 (auditoria original) — anotações de status atualizadas em 2026-08-12.
**Escopo:** `bots/banqueiro/`, `bots/jornalista/`, e a camada compartilhada com `plataforma/` (Postgres único + `platform_api.py`).
**Natureza:** auditoria + design. Nenhum código, banco, teste ou dado foi alterado nesta etapa.

> **Status de implementação (2026-08-12):** FASE B1 ✅ concluída (Banqueiro 207 testes, Jornalista 108 testes, sem ressalvas). FASE B2 🟡 parcialmente concluída — Tarefas 1, 2, 4, 5 e 6 entregues (Banqueiro 216 testes, Jornalista 110 testes, total 326); Tarefa 3 (enigmas temáticos) segue adiada/bloqueada porque `bots/jornalista/core/enigmas.py` já tinha alterações não commitadas de antes dessa fase. Achados marcados abaixo como ✅ RESOLVIDO ou ⏸️ ADIADO refletem esse estado; o restante do documento é a auditoria original, sem alteração de conteúdo. Detalhes completos em `docs/plano-evolucao-bots-discord-2026-08.md`.

## Achado que muda o enquadramento do relatório

O pedido original pede para "estudar a possibilidade" de construir venda entre jogadores, troca, leilão, roubo/reação e recompensas. **Boa parte disso já existe e está madura em produção:**

- `/oferecer` e `/trocar` (`bots/banqueiro/cogs/trocas.py`) já implementam venda e troca item↔item / item↔dinheiro entre jogadores, com proposta, aceite/recusa e reversão em caso de falha parcial.
- `/leilao_iniciar` (`cogs/mercado.py`) já é um leilão com lance via modal, custódia de dinheiro no momento do lance (não só no fechamento) e cancelamento.
- `/roubar`, `/roubar_cofre` (`cogs/economia.py`) já são um sistema de roubo com abordagens (Cuidadosa/Rápida/Disfarçada), calor, cooldown, proteção passiva comprável, e uma **janela de defesa por DM com botão** — que é, na prática, a mecânica de "reação" que o pedido original pergunta se vale a pena construir.
- `/recompensa_colocar`, `/recompensa_ver` e o cargo dinâmico "Procurado" já formam um sistema de bounty/reputação criminal, incluindo conversão automática de dívida vencida em recompensa.

Por isso, este relatório é menos "arquitetura do zero" e mais "aqui está o que existe, o que está pela metade, e como evoluir sem reconstruir". Isso é uma boa notícia — o investimento de engenharia (transação atômica, idempotência, custódia) já foi feito e pode ser reaproveitado.

---

## A. Estado atual do Banqueiro

O Banqueiro é o bot financeiro central: carteira, cofre, cartão de crédito, empréstimos, investimentos, seguro, câmbio, loteria (venda de bilhete), baús, roubo, troca/venda entre jogadores e leilão. É construído sobre uma classe `Database` única (~4850 linhas) em `core/db.py`, com PostgreSQL compartilhado com a plataforma web.

**Funcionando bem, sem ressalvas relevantes:**
- Carteira/transferência (`/pagar`), extrato, ranking, perfil — com controle de privacidade correto.
- Cofre bancário (poupança) com dois trilhos de upgrade (capacidade × segurança).
- Cartão de crédito/reputação, faturas, dívida.
- Câmbio flutuante e câmbio ajustado por reputação.
- Empréstimos entre jogadores, com custódia no aceite e juros compostos diários.
- Sistema de roubo (ver seção H) — o mais sofisticado do bot: calor, reserva de alvo, cooldown atômico, proteção de mestre validada dentro da mesma transação do roubo.
- Baús: compra, abertura, idempotência bem cuidada.
- Trocas/leilão (ver seção F) — atômicos no nível de cofre de conta, com escrow (`custodia_moeda`) e reversão em falha parcial.

**Funcionando, mas raso ou com dívida técnica:**
- Investimentos: produto único, prazo fixo de 7 dias, sem resgate parcial/antecipado.
- Loteria: o Banqueiro só vende bilhete — o sorteio é feito pelo Jornalista, sem qualquer verificação cruzada se o outro bot está de fato rodando.
- `core/db.py` como "God Class" de todos os domínios financeiros — qualquer mudança de schema mexe num arquivo gigante.

**Obsoleto / código morto:**
- `_vender_legado`, `_comprar_legado`, `_loja_legada` em `economia.py` — resquício da loja antiga via Discord, sem `@app_commands.command`, portanto nunca executado, mas contém um bug de import (`NameError` latente) que quebraria se reativado.
- Várias funções não-atômicas em `db.py` (`dar_lance_leilao`, `criar_emprestimo`, `aceitar_emprestimo`, `recusar_emprestimo`, `pagar_emprestimo`, `criar_investimento`) que não são chamadas por nenhum comando real — só aparecem em testes antigos.

---

## B. Estado atual do Jornalista

O Jornalista é um híbrido desequilibrado: as automações que **pagam recurso real** (baús, loteria, desafios com recompensa, avisos econômicos vindos do Banqueiro, resumo semanal) são genuinamente ligadas a dados reais do Postgres. Tudo que parece "jornalismo" no sentido narrativo (clima, horóscopo, enigmas) é **conteúdo autônomo e aleatório**, sorteado de listas estáticas, sem nenhuma relação com eventos reais da campanha. **Não há nenhum uso de IA/LLM em lugar nenhum do código hoje.**

**Funcionando bem:**
- Baús automáticos: o cog mais robusto do bot — botões dinâmicos persistentes que sobrevivem a reinício, 3 tasks com auto-recovery, cascata de fallback de entrega (API → Postgres direto → modo legado), raridade balanceada por estação.
- `/jornal publicar`, pautas com aprovação/agendamento, orçamento editorial com lock de concorrência — publicação manual bem construída.
- Entrevista semanal com recovery de pendências e fallback de DM→canal.
- Loteria (sorteio real, ordem de operações correta para não pagar duas vezes).
- Registro por reação (sobrevive a reinício por não depender de view em memória).

**Funcionando, mas puramente decorativo (não liga a eventos reais):**
- Clima/estação automática, horóscopo diário, enigmas dos baús (maioria são charadas genéricas, pouco temáticas do Jardim).
- **Resumo semanal** é a exceção — é a única automação 100% baseada em eventos reais agregados (extrato, baús, desafios, entrevistas) e ~~vem desligada por padrão~~ **✅ RESOLVIDO NA B2 (2026-08-12): agora vem ligada por padrão** (Decisão 6 da B3, implementada). Era a maior oportunidade perdida do bot; deixa de ser.

**Problema de design isolado:**
- ~~`avisos.py` (avisos econômicos vindos do Banqueiro) usa um caminho de entrega diferente e mais frágil do que o resto do bot — não passa pela fila durável (`jornal_publicacoes`) que todas as outras automações usam, então não tem contagem de tentativas nem aparece em `/jornal fila` para diagnóstico.~~ **✅ RESOLVIDO NA B2 (2026-08-12, Tarefa 2, P14): migrado pra `publicar_ou_enfileirar`.**

**Sem testes:**
- `cogs/boasvindas.py` não tem arquivo de teste dedicado.

---

## C. Problemas encontrados

| ID | Sistema | Problema | Severidade | Confiança |
|---|---|---|---|---|
| P1 | Banqueiro/economia.py | `_vender_legado` referencia `ItemIndisponivel`/`CofreIndisponivel` sem importar — `NameError` se reativado (código morto hoje) | Baixa | Alta |
| P2 | Banqueiro/trocas.py | Janela de não-atomicidade entre custódia de dinheiro e movimento de item se o processo cair exatamente entre as duas operações — sem log/reprocessamento automático | Baixa | Alta (risco documentado no próprio código) |
| P3 | Banqueiro/mercado.py | Leilões legados pré-custódia cobram o vencedor só no fechamento — dá pra "ganhar" um leilão de propósito sem ter o dinheiro e cancelar sem custo, atrasando quem queria comprar de verdade | Média | Média (só afeta leilões anteriores à migração para custódia) |
| P4 | Banqueiro/db.py | Funções não-atômicas órfãs (`dar_lance_leilao`, `criar_emprestimo` etc.) nunca chamadas por nenhum comando — risco de "consertar" a versão errada no futuro | Baixa | Alta |
| P5 | Banqueiro/main.py + admin.py | Handler de erro de permissão duplicado com mensagens ligeiramente diferentes — pode divergir silenciosamente | Baixa | Alta |
| P6 | Banqueiro/economia.py | `/abrir_todos` não avisa claramente quando um tipo de baú é interrompido no meio — nada é perdido, mas a mensagem final confunde | Baixa | Alta |
| P7 | Banqueiro/db.py | `/resetar_tudo` escreve direto nas tabelas da plataforma sem passar pela API dela — sem garantia de concorrência com uma operação em andamento no site no mesmo instante | Média (raio de explosão alto, comando raro/protegido) | Média |
| P8 | Banqueiro/db.py | Coluna `cartao.credito` na verdade é reputação bancária, não limite de crédito — nome enganoso, risco de bug de manutenção futuro | Baixa | Alta |
| P9 | Banqueiro/db.py | `core/db.py` é uma "God Class" de ~4850 linhas cobrindo todos os domínios financeiros | Média (manutenibilidade) | Alta |
| P10 | Banqueiro/ajuda.py | ~~`/ajuda`/`/comandos` sem teste de sincronismo com comandos reais~~ — **CORREÇÃO (2026-08-12, ao implementar B1): achado incorreto.** `bots/banqueiro/tests/test_comandos.py` já existia e já cobria isso (`test_inventario_de_comandos_nao_regride`, `test_ajuda_lista_todos_os_comandos_de_jogador_e_mestre`); a auditoria original só verificou esse padrão no Jornalista e presumiu, sem checar, que faltava no Banqueiro. Nenhuma ação necessária. | N/A | N/A (achado retirado) |
| P11 | Banqueiro↔Jornalista | Banqueiro vende bilhete de loteria sem checar se o Jornalista está de fato rodando o sorteio — sem watchdog cruzado | Média | Média |
| P12 | Plataforma/internal.py | Endpoints internos `/interno/discord/economia/moedas` e `/economia/inventario` não validam `dono_usuario_id` (só existência do personagem na campanha) — hoje inofensivo porque nenhum bot os chama, mas é uma lacuna a fechar antes de qualquer feature nova usá-los | Média (latente) | Alta |
| P13 | Jornalista/economia.py | `_localizar_cofre_seguranca_tiers()` pode falhar no *import* do módulo se nenhum dos 3 caminhos de arquivo existir no ambiente de deploy — derrubaria o processo inteiro antes mesmo de validar token/DB | Alta (se ocorrer) | Média (não confirmado em produção) |
| P14 | Jornalista/avisos.py | ~~Avisos econômicos usam entrega direta (`canal.send`), fora da fila durável `jornal_publicacoes` — sem retry contável nem visibilidade em `/jornal fila`~~ **✅ RESOLVIDO NA B2 (2026-08-12, Tarefa 2)**: migrado para `publicacoes.publicar_ou_enfileirar`; `marcar_aviso_publicado` só roda após o enfileiramento ser aceito. | Média | Alta |
| P15 | Jornalista/db.py | `get_opcao_clique` nunca é chamado (fluxo real usa `get_opcao_por_reacao`) — código morto | Baixa | Alta |
| P16 | Jornalista/loteria.py | `dedupe_key` da loteria usa hora local ingênua do host enquanto a checagem de "é domingo" usa fuso `America/Sao_Paulo` — inconsistência perto da meia-noite se o host rodar em UTC | Baixa | Média |
| P17 | Jornalista/loot.py, catalogo.py | Raridade de baú `"mitico"` e raridade de item `"reliquia"` (ambas rotuladas "Mítico" na UI) são conceitos internos diferentes com o mesmo nome visível — armadilha de manutenção | Baixa | Alta |
| P18 | Jornalista/boasvindas.py | Sem teste dedicado — regressão em `on_member_join`/`on_member_remove` não seria pega em CI | Baixa | Alta |
| P19 | Compartilhado | Itens não têm identidade individual (chave é `item_id` + dono, sem UUID por instância) — duas unidades do mesmo item são sempre um único stack, mesmo se uma tiver modificações | Média (limitação de design) | Alta |
| P20 | Compartilhado | Cofre de conta (`cofre_itens_usuario`) e inventário de personagem (`inventario_personagem`) são dois modelos de posse distintos — comércio hoje só é atômico no nível de cofre de conta, não no de personagem | Média (decisão de arquitetura pendente) | Alta |
| P21 | Compartilhado | Leilão do tipo `bau` nunca passa pelo cofre da plataforma (fica só na tabela local do bot) — uma troca "item da plataforma por baú legado" não é atômica entre os dois sistemas | Média | Alta |

---

## D. Funcionalidades incompletas

- **Investimentos**: um único produto, prazo fixo, sem resgate parcial/antecipado — funciona, mas não escala para "carteira de títulos ativamente gerida".
- **Empréstimos → recompensa automática**: conversão de dívida vencida em bounty só funciona em Lunaris/Solares; Fragmentos e Créditos Sombrios caem em aviso manual para o mestre (decisão de design documentada, não bug).
- **Loja legada** (`_vender_legado`/`_comprar_legado`/`_loja_legada`): pela metade, morta, deveria ser removida de vez ou isolada.
- **Avisos econômicos do Jornalista**: entrega funciona, mas fora do padrão de robustez do resto do bot.
- **Resumo semanal do Jornalista**: a única automação "jornalística" ligada a eventos reais, mas desligada por padrão.
- **Enigmas dos baús**: majoritariamente charadas genéricas, pouco temáticas do Jardim.
- **Clima/horóscopo**: flavor text puro, o próprio código comenta que "pressupõe aprovação do mestre" — nunca amarrado a eventos reais.
- **Loteria (acoplamento entre bots)**: Banqueiro vende, Jornalista sorteia, sem verificação cruzada.

---

## E. Melhorias recomendadas

Muitas das perguntas da seção 17-19 do pedido original ("o Banqueiro tem histórico financeiro? notificações? menus em vez de comando cru?") **já têm resposta parcial em produção**, vale registrar antes de propor mais:

- `/extrato`, `/perfil`, `/ranking` já existem com privacidade correta.
- Autocomplete já é usado em `/oferecer`, `/trocar`, `/leilao_iniciar` (não pede para o jogador digitar um ID cru de item).
- `/oferecer` já notifica o alvo com uma proposta e botões Aceitar/Recusar — o "modelo de venda com confirmação" pedido na seção 3 do briefing já existe nesse formato.
- `/jornal status` já é um painel de diagnóstico (canais, permissões, automações, fila) — bom padrão de UX de mestre a replicar em outros lugares (ex.: um `/banco_status` equivalente no Banqueiro não existe hoje e faria sentido).

Melhorias reais ainda não feitas:
1. ~~Padronizar a entrega de avisos econômicos do Jornalista na mesma fila durável do resto do bot (P14).~~ **✅ FEITO NA B2 (2026-08-12, Tarefa 2).**
2. ~~Adicionar teste de sincronismo `/ajuda` × comandos reais no Banqueiro~~ — **retirado (2026-08-12): já existia** (`test_comandos.py`), ver correção em P10.
3. ~~Notificações DM opt-in para eventos que hoje só aparecem se o jogador estiver olhando o canal certo (leilão terminou, investimento venceu, oferta recebida) — com throttle para não virar spam.~~ **✅ PARCIALMENTE FEITO NA B2 (2026-08-12, Tarefa 5)**: a infraestrutura de opt-in já existia (pagamento/roubo/empréstimo/investimento/leilão); a B2 estendeu pra `/oferecer`/`/trocar` (categoria "mercado"), a lacuna real que faltava. Throttle continua não implementado — risco pré-existente registrado, não é regressão.
4. ~~Um `/banco_status` (mestre) espelhando o `/jornal status` do Jornalista, dado que o Banqueiro tem mais superfície de configuração (câmbio, roubo, seguro, orçamento) sem um painel único de diagnóstico.~~ **✅ FEITO NA B2 (2026-08-12, Tarefa 4)**, integrado à `/ajuda`.
5. Reduzir a dívida técnica de `core/db.py` (P9) dividindo por domínio antes de crescer mais.

---

## F. Sistema de comércio entre jogadores — proposta

**Estado atual (não é uma proposta do zero, é o que já roda):** `/oferecer` (venda unidirecional item/baú por dinheiro) e `/trocar` (troca bidirecional item/baú por item/baú/dinheiro), ambos em `bots/banqueiro/cogs/trocas.py`, atômicos no nível de **cofre de conta** via `POST /interno/discord/cofre/transferir` na plataforma — uma única transação Postgres, locks ordenados por usuário, checagem de capacidade, idempotência por chave derivada do ID da interação do Discord. Reversão automática (`_reverter`) se qualquer perna da troca falhar após a outra já ter sido executada.

**Restrição de design já embutida e correta**: jogadores sem conta vinculada à plataforma **não podem** participar dessas operações — o sistema recusa explicitamente (`CofreIndisponivel`) em vez de arriscar uma operação não-atômica entre o inventário legado do bot e o cofre da plataforma. Isso deveria continuar sendo a regra (ver decisão K1).

**O que falta para "comércio de verdade" além do que já existe:**

1. **Mercado persistente (`/mercado`)** — hoje toda venda exige escolher um comprador específico. Um marketplace onde qualquer jogador lista um item com preço e qualquer outro compra (sem negociação prévia) reaproveitaria o mesmo padrão de custódia (`reservas_cofre` já tem TTL/expiração, usado hoje pelo leilão) — a peça nova é só a tabela de listagens e o comando de "comprar direto de uma listagem".
2. **Identidade individual de item (P19)** — para vender "esta espada modificada" separada de "espadas base no stack", seria necessário um identificador de instância (ex.: uma coluna opcional `instancia_id`, só usada quando `dados` não é vazio, mantendo o stack simples para itens comuns). Sem isso, vender um item modificado remove do mesmo stack que itens não-modificados do mesmo `item_id` — tecnicamente funciona hoje (quantidade desce 1), mas não garante *qual* unidade saiu se houver mistura de modificadas/não-modificadas.
3. **Nível de personagem vs. nível de conta (P20)** — hoje o comércio opera sobre o cofre da conta, não sobre o inventário do personagem na ficha. Se o objetivo é "o personagem X vende para o personagem Y" (não "a conta de Pedro vende para a conta de Ana"), é necessário decidir se isso importa para o jogo (ver decisão K2) — e, se importar, estender o mesmo padrão de transação (locks ordenados + idempotência) para `saldos_personagem`/`inventario_personagem`, que hoje não têm um "transferir atômico entre dois personagens" equivalente ao do cofre.

---

## G. Sistema de venda para o mestre/sistema — proposta

Hoje **não existe** um comando de venda genérica ao "mercado do mestre" em produção (o único código relacionado, `_vender_legado`, está morto — P1). Quatro modelos, sem escolher um:

| Modelo | Como funciona | Vantagem | Desvantagem |
|---|---|---|---|
| **A — Percentual do preço original** | Sistema paga X% (ex. 40%) do preço de catálogo automaticamente | Simples, sem manutenção de dados, previsível | Não diferencia itens raros de comuns na prática; pode ser "farmável" (comprar caro, vender por %, repetir só perde a diferença) |
| **B — Preço de recompra por item** | Cada item no catálogo ganha um campo `preco_recompra` explícito | Controle fino por item, permite itens "não recomprável" | Trabalho de curadoria manual em ~277 itens do catálogo; precisa manutenção quando itens novos entram |
| **C — Só o mestre define (caso a caso)** | Comando tipo `/mestre_comprar_item @jogador item valor` (já mapeado como funcionalidade administrativa desejada na seção 6 do pedido, e não existe hoje) | Máxima flexibilidade narrativa, zero risco de exploit automatizado | Não escala (exige o mestre online e atento), não serve pra loop de gameplay automático |
| **D — Mercado dinâmico** | Preço de recompra flutua com oferta/demanda (o câmbio flutuante de moeda, `cambio_fluxo`, já existe como precedente técnico direto) | Mais imersivo, reaproveita padrão já validado em produção | Mais complexo, exige decidir o que move o mercado (volume de vendas? eventos do mestre?) e pode ser instável sem tuning |

Recomendação de leitura (não é decisão final — cabe ao designer): **B para itens curados + C como válvula de escape do mestre** cobre a maior parte do valor com o menor risco de exploit, e D fica como evolução natural do modelo B mais adiante (ver ideias grandes, J).

---

## H. Sistema de roubo/reação — proposta

**Não é um conceito a validar — já está implementado e é o sistema mais sofisticado do Banqueiro.** `/roubar`, `/roubar_cofre`, `/roubo_planejar`, `/preparo_roubo_comprar`, `/protecao_comprar`, `/mestre_proteger`, `/setroubo` (mestre).

Mecânica já em produção (todas as peças que o pedido pergunta "vale a pena ter"):
- **Abordagens** com trade-off risco/recompensa (Cuidadosa/Rápida/Disfarçada), a Disfarçada exigindo item consumível (Kit de Disfarce).
- **Calor**: penalidade que decai com o tempo, aumenta cooldown e reduz chance de sucesso — desincentiva abuso repetido sem banir.
- **Janela de reação real**: a vítima recebe uma DM com botão de defesa numa janela de 5-10 segundos (`DefesaRouboView`) — resolvida com `time.monotonic()` + `asyncio.Event` para garantir que só um clique "vence" mesmo sob concorrência.
- **Reserva de alvo**: impede dois ladrões simultâneos na mesma vítima (janela de 30s).
- **Proteção comprável** (passiva) e **seguro do cofre** (indenização parcial pós-roubo).
- **Consequência automática**: dívida vencida vira "Procurado" (cargo dinâmico), roubar um Procurado perdoa a dívida do sistema e paga a recompensa na mesma transação, dando ao ladrão o cargo temporário "Caçador de Recompensas".

**O que vale propor agora não é "criar reação", é generalizar o padrão que já existe.** `DefesaRouboView` é, na prática, um framework de "ação com janela de tempo + botão de resposta + resolução idempotente" só que acoplado ao roubo. Extrair isso para um componente reutilizável (`AcaoReativaView` genérico: evento dispara → alvo(s) elegíveis recebem botão(ões) → primeira resposta válida dentro do prazo vence → callback de resolução) permitiria aplicar o mesmo padrão a outros gatilhos sem reescrever a lógica de concorrência: fuga (`/perseguir` reagindo a alguém fugindo), venda relâmpago (contraproposta numa janela curta), testemunha de crime (denunciar dentro de X minutos). Isso é uma peça de arquitetura de tamanho médio (extrair + generalizar código já testado), não um sistema novo do zero.

---

## I. Expansão do Jornalista — proposta

O maior gargalo não é falta de comandos, é a falta de uma **fonte estruturada de eventos** que o Jornalista possa consumir sem depender de string livre pré-formatada. Hoje o único gancho (`avisos_pendentes`) carrega texto já pronto escrito pelo Banqueiro — o Jornalista nunca vê "o que aconteceu", só "o que já foi decidido dizer sobre isso".

Proposta em camadas:

1. **Tabela de eventos estruturados** (`eventos_campanha`: `tipo`, `guild_id`, `payload jsonb`, `timestamp`), escrita por qualquer sistema (Banqueiro ao resolver leilão/roubo/recompensa, plataforma ao registrar compra grande/morte/propriedade comprada) — substituindo/complementando `avisos_pendentes`. O Jornalista passa a ter fatos estruturados para compor a notícia, não apenas texto fixo.
2. **Ligar o resumo semanal por padrão** (é a única automação hoje que já soma eventos reais — está pronta, só desligada).
3. **Divulgação automática do que já existe no Banqueiro**: leilões (`/leilao_iniciar`/vencedor), Procurados (recompensa), grandes transações — o Jornalista já tem a infraestrutura de publicação (fila durável, canais configuráveis); falta só assinar os eventos certos.
4. **Redação assistida por IA (opcional, com decisão do designer — ver K7)**: usar um LLM apenas para transformar o payload estruturado em prosa de jornal, nunca para inventar fatos — os dados estruturados continuam sendo a fonte de verdade, e a publicação final passa pelo fluxo de pauta com aprovação do mestre que já existe (`/jornal pauta`).
5. **Reputação/crime pública**: já existe o "Procurado" no Banqueiro — o Jornalista poderia publicar isso automaticamente como uma seção fixa ("Mural de Procurados") em vez de ser algo que só aparece dentro do Banqueiro.

---

## J. Novas funcionalidades

### 10 pequenas (baixo custo, alto retorno imediato)

1. **Ligar resumo semanal por padrão** — já existe, só está desligado (`jornal.py:56`). 🟢 **✅ FEITO NA B2 (2026-08-12, Tarefa 1).**
2. **Mover avisos econômicos para a fila durável** (P14) — reaproveita `publicar_ou_enfileirar` já usado em todo o resto do bot. 🟢 **✅ FEITO NA B2 (2026-08-12, Tarefa 2).**
3. **Corrigir fuso horário do dedupe_key da loteria** (P16). 🟢 **✅ FEITO NA B1 (2026-08-12).**
4. **Remover código morto**: `_vender_legado`/`_comprar_legado`, funções não-atômicas órfãs em `db.py`, `get_opcao_clique`. Reduz superfície de manutenção enganosa. 🟢 **✅ FEITO NA B1 (2026-08-12)**, exceto `get_opcao_clique` (Jornalista, fora do escopo de B1/B2 até agora).
5. **Padronizar mensagem de erro de permissão** entre `main.py` e `admin.py` (P5). 🟢 **✅ FEITO NA B1 (2026-08-12).**
6. ~~Teste de sincronismo `/ajuda` × comandos reais no Banqueiro~~ — **retirado (2026-08-12): já existia**, ver correção em P10.
7. **Watchdog simples de loteria**: Banqueiro registra se o Jornalista não sorteou na janela esperada, avisa o mestre. 🟡
8. **Jornalista publica leilões automaticamente** (criação/vencedor), usando a fila existente. 🟡
9. **Jornalista publica "Procurado" automaticamente** quando alguém vira alvo de recompensa. 🟡
10. **Enriquecer enigmas com conteúdo temático do Jardim** (hoje maioria é charada genérica). 🟡 **⏸️ ADIADA/BLOQUEADA na B2 (2026-08-12, Tarefa 3)**: `bots/jornalista/core/enigmas.py` já tinha alterações não commitadas de antes desta sessão, perseguindo aparentemente o mesmo objetivo — não foi tocado.

### 10 médias (exigem arquitetura nova moderada)

1. **Tabela de eventos estruturados** (`eventos_campanha`) — base para tudo em I. 🟢
2. **`/mercado`** — marketplace persistente de listagens, reaproveitando `reservas_cofre`. 🟡
3. **Generalizar `DefesaRouboView`** em framework de ação reativa reutilizável (fuga, contraproposta, denúncia). 🟡
4. **Extrato consolidado cross-bot** (juntar `extrato` do Banqueiro + `lancamentos_economia` da plataforma numa visão única). 🟡
5. **`/contrato`** — recompensa por entrega de itens, sem UI de leilão (mais simples que bounty de monstro). 🟡
6. **Notificações DM opt-in** com throttle anti-spam (oferta recebida, leilão terminado, investimento venceu). 🟡
7. **Resgate antecipado/parcial de investimentos**, com penalidade. 🔵
8. **Suporte a Fragmentos/Créditos Sombrios em recompensa automática de dívida** (hoje só Lunaris/Solares). 🔵
9. **Identidade individual para itens modificados** (P19) — coluna opcional de instância, só quando o item tem `dados` não-vazio. 🟡
10. **Refatorar `core/db.py` por domínio** (P9) — dívida técnica que só cresce. 🟡

### 10 grandes (mudam significativamente a experiência)

1. **Leilão personagem-a-personagem verdadeiro** — hoje é conta-a-conta; estender o padrão de locks+idempotência do cofre para `saldos_personagem`/`inventario_personagem`. 🔵
2. **Sistema de reputação/fama pública ampliado**, unificando o que já existe (recompensa + cargos) numa seção fixa do Jornalista. 🔵
3. **Jornal gerado a partir de eventos reais** (item I.1 + I.4), com redação assistida por IA e aprovação do mestre obrigatória. 🔵
4. **Sistema genérico de "reações"** cobrindo múltiplos gatilhos além de roubo (extensão de J-médio #3). 🔵
5. **Mercado dinâmico de itens** (preço flutua com oferta/demanda), espelhando o câmbio flutuante de moeda que já existe. 🔵
6. **Camada de comércio no nível de personagem/ficha**, não só no cofre de conta (P20). 🔵
7. **Painel web cruzando dados do Banqueiro+Jornalista em tempo real** (extrato consolidado já em J-médio #4, elevado a painel completo no site). 🔵
8. **Sistema de guildas/facções com tesouraria compartilhada** — novo domínio econômico. 🔴 (grande escopo, sem sinal de demanda hoje — avaliar depois dos itens acima)
9. **Eventos globais de campanha automatizados por métricas reais** (inflação, crise), hoje só manual via `/crise_declarar`. 🔵
10. **IA para redigir notícias com revisão obrigatória do mestre** (mesmo item de I.4, mas como sistema formal com histórico de revisões/edições). 🔵

---

## K. Decisões necessárias

Perguntas que só o designer (você) pode responder — não são bugs, são rumo de produto:

1. **Comércio deve continuar exigindo conta vinculada à plataforma** para participar de trocas/vendas/leilões (comportamento atual)? Ou vale um "modo legado" mais limitado (ex.: só doação direta, sem leilão/mercado) para quem ainda não vinculou?
2. **O comércio deve operar no nível de conta (cofre, como hoje) ou no nível de personagem (ficha)?** Isso muda toda a modelagem de "quem vende o quê" e é a decisão de maior impacto arquitetural (P20).
3. **Vale o custo de dar identidade individual a itens modificados (P19)**, ou é aceitável que "vender uma espada modificada" sempre afete o stack inteiro do `item_id`?
4. **Qual modelo de venda para o mestre/sistema (seção G)**: A (percentual fixo), B (preço de recompra por item), C (só o mestre define), D (mercado dinâmico), ou uma combinação (ex. B+C)?
5. **Vale ligar o resumo semanal do Jornalista por padrão agora** (baixo risco, já pronto), ou prefere manter opt-in?
6. **O framework de "ação reativa" (H) deve nascer generalizado desde já**, ou vale primeiro validar mais um ou dois casos de uso concretos (ex. fuga) antes de extrair a abstração?
7. **Uso de IA para redigir notícias do Jornalista está autorizado?** Se sim, que dados podem ser expostos a um provedor de LLM externo (nomes de jogadores, valores de economia, eventos da campanha)?
8. **Prioridade real do leilão personagem-a-personagem (J-grande #1)** frente ao esforço de nova camada de transação — vale a pena antes ou depois do mercado persistente (J-médio #2)?

---

## L. Roadmap recomendado

**FASE B1 — Correções** (P1, P4, P5, P6, P7 revisão, P12, P13 confirmação de deploy, P16)
Bugs e riscos concretos, sem decisão de produto pendente. Pode começar imediatamente.

**FASE B2 — Melhorias rápidas** (as 10 ideias pequenas de J)
Baixo custo, alto retorno, sem necessidade de nova arquitetura.

**FASE B3 — Comércio**
Depende das decisões K1, K2, K3, K4. Inclui `/mercado` persistente, decisão sobre venda ao mestre, e possivelmente identidade individual de item.

**FASE B4 — Interações/Crime**
Depende de K6. Generalizar o framework de ação reativa a partir do roubo já existente; estender a novos gatilhos (fuga, contraproposta).

**FASE B5 — Jornalista avançado**
Depende de K5 e K7. Tabela de eventos estruturados, resumo semanal ligado, divulgação automática de leilão/procurado, redação assistida por IA (se autorizada).

**FASE B6 — Sistemas maiores**
Depende de K2 e K8. Leilão personagem-a-personagem, mercado dinâmico, camada de comércio no nível de ficha, painel web consolidado.

---

## Critério de encerramento

Como estão os bots hoje: financeiramente maduros (Banqueiro) e narrativamente subutilizados (Jornalista). O que está errado é majoritariamente dívida técnica pontual e código morto, não falhas de segurança — a validação de ownership/campanha é consistentemente bem feita em todos os fluxos auditados, com uma única lacuna latente (P12, hoje inofensiva por falta de uso). O que mais vale construir primeiro: **FASE B1 (correções) seguida de FASE B2 (melhorias rápidas)**, porque destravam valor imediato sem exigir nenhuma decisão de produto — o resto do roadmap depende das respostas em K.
