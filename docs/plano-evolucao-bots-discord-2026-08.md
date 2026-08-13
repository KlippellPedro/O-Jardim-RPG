# Plano de evolução dos bots Discord — Banqueiro, Jornalista e ecossistema

**Data:** 2026-08-11 (plano original) — **atualizado em 2026-08-12** com as decisões de B3 aprovadas.
**Base:** `docs/auditoria-bots-discord-2026-08.md`
**Natureza:** planejamento. Nenhum código, banco, teste ou configuração foi alterado nesta etapa. Os achados de P1, P4, P5, P6, P7, P12, P13, P16 foram reverificados diretamente no código atual antes de qualquer conclusão abaixo.

> **Status (atualizado em 2026-08-12):**
> - **FASE B1 — ✅ CONCLUÍDA.** Banqueiro: 207 testes passando. Jornalista: 108 testes passando. Sem ressalvas pendentes.
> - **FASE B3 — ✅ CONCLUÍDA.** As 8 decisões da Parte 11 foram aprovadas pelo designer, mais uma premissa adicional ("propriedade econômica"). Nenhuma decisão foi alterada desde a aprovação.
> - **FASE B2 — 🟡 PARCIALMENTE CONCLUÍDA.** Tarefas 1 (resumo semanal), 2 (avisos na fila), 4 (`/banco_status`), 5 (DM em trocas) e 6 (P6/`abrir_todos`) entregues e testadas. **Tarefa 3 (enigmas temáticos) segue adiada/bloqueada**: `bots/jornalista/core/enigmas.py` já tinha alterações não commitadas de antes desta fase — não foi tocado. B2 não é considerada 100% concluída enquanto essa tarefa continuar adiada.
> - **Suítes de teste (após B1+B2):** Banqueiro **216 testes**, Jornalista **110 testes** — **total 326 testes passando.**
> - Implementação de código para B4/B5/B6 continua **não autorizada** — segue o mesmo roadmap revisado (Parte 10), só quando explicitamente pedida.

---

## PARTE 1 — Validação da Fase B1 (correções técnicas)

### P1 — `NameError` latente em `_vender_legado`
**Reverificado:** ainda presente. `cogs/economia.py:911-944` usa `ItemIndisponivel`/`CofreIndisponivel` (linhas 929, 932) sem importar; confirmei que nenhum dos três nomes é importado em nenhum ponto do arquivo, e que `_loja_legada`/`_comprar_legado`/`_vender_legado` (linhas 709, 725, 911) seguem sem `@app_commands.command` — código morto, não executável hoje.
- **Problema real:** sim, mas inofensivo enquanto o comando não existir.
- **Risco:** baixo hoje; alto se alguém reativar o comando sem notar o bug (erro só aparece em runtime, no primeiro clique).
- **Impacto:** nenhum em produção agora.
- **Dependências:** nenhuma.
- **Dificuldade:** trivial (é remoção de ~230 linhas mortas, ou um import de 2 tokens se decidirem manter o código "pra depois").
- **Corrigir agora?** Sim — mas como **remoção**, não como conserto. É a decisão mais barata do relatório: manter código morto com um bug latente não tem valor, e mantê-lo "consertado mas morto" só adiciona superfície de manutenção sem uso.
- **Estratégia recomendada:** deletar `_loja_legada`, `_comprar_legado`, `_vender_legado` inteiros. Se a intenção for reaproveitar a lógica de venda pro mestre no futuro (Parte 4 deste documento), vale extrair a ideia, não o código morto em si — a Parte 4 propõe uma arquitetura nova mesmo assim.
- **Testes necessários:** nenhum teste novo — é remoção. Rodar a suíte existente para confirmar que nada externo referenciava essas funções (a auditoria já confirmou que não há chamadas).

### P4 — Funções não-atômicas órfãs em `core/db.py`
**Reverificado:** ainda presentes e ainda órfãs. `dar_lance_leilao` (db.py:4195), `criar_investimento` (db.py:4361), `criar_emprestimo` (db.py:4454), `aceitar_emprestimo` (db.py:4526), `recusar_emprestimo` (db.py:4584), `pagar_emprestimo` (db.py:4625) — busca por `.dar_lance_leilao(`, `.criar_emprestimo(` etc. em `cogs/` não retornou nenhuma chamada real (só existem chamadas às versões corretas, com sufixo `_com_custodia`/`comprar_investimento`).
- **Problema real:** sim — é dívida de manutenção, não bug ativo.
- **Risco:** baixo agora, cresce com o tempo (quanto mais gente mexer no arquivo, maior a chance de alguém "consertar" a versão errada).
- **Impacto:** nenhum em produção hoje; impacto futuro é silencioso (um bug corrigido na função errada simplesmente não se manifesta em nenhum comando real, dando falsa sensação de que foi corrigido).
- **Dependências:** confirmar se `tests/` usa essas funções diretamente (a auditoria original apontou que sim, como fixtures) — remoção exigiria também limpar/adaptar esses testes.
- **Dificuldade:** baixa (remoção), mas com um passo extra de checar testes antes.
- **Corrigir agora?** Sim, mas é B1 de baixa prioridade dentro de B1 — não bloqueia nada, pode ser feito em lote com P1.
- **Estratégia recomendada:** remover as funções órfãs de `db.py` e adaptar os testes que hoje as chamam para usar as versões reais (`_com_custodia`) — isso tem o benefício colateral de aumentar a cobertura de teste do caminho realmente usado, e não só do caminho morto.
- **Testes necessários:** adaptar os testes existentes que hoje testam as funções órfãs para testar as funções reais equivalentes.

### P5 — Handler de erro de permissão duplicado
**Reverificado:** confirmado. `main.py:38` (`on_app_command_error`, global) e `cogs/admin.py:347` (`cog_app_command_error`) ambos tratam `MissingPermissions` com mensagens diferentes.
- **Problema real:** sim, mas é estético/manutenção, não funcional — o usuário sempre recebe alguma mensagem de erro de permissão.
- **Risco:** baixo — o risco é as duas mensagens divergirem mais no futuro sem ninguém perceber, não uma falha visível.
- **Impacto:** cosmético.
- **Dependências:** nenhuma.
- **Dificuldade:** trivial — fazer `Admin.cog_app_command_error` sempre delegar pro handler global em vez de tratar `MissingPermissions` de novo.
- **Corrigir agora?** Sim, é rápido e reduz uma fonte de inconsistência futura.
- **Estratégia recomendada:** remover o bloco duplicado em `admin.py`, deixando `cog_app_command_error` reencaminhar tudo pro handler global (que já é o padrão usado no resto do bot).
- **Testes necessários:** um teste que force `MissingPermissions` num comando do cog `Admin` e confirme que a mensagem é a mesma do handler global.

### P6 — `/abrir_todos` não avisa quando um tipo de baú é interrompido no meio
**Reverificado, com correção ao achado original:** a auditoria inicial dizia que a falha "não é reportada". Lendo o código completo (`economia.py:2464-2520`) agora, isso é **parcialmente impreciso**: existe sim um aviso (`interrompeu`, linhas 2481, 2497, 2501, 2512-2516) — mas ele só é ativado quando `_abrir_um_bau` falha (linha 2497, "banco fora do ar"). Quando é `db.remover_bau` que retorna `False` no meio de um tipo de baú (linha 2492), o `break` interno (linha 2493) **não** marca `interrompeu=True` — ele só sai do loop interno daquele tipo de baú e segue silenciosamente para o próximo tipo, sem nunca avisar que aquele tipo específico ficou incompleto.
- **Problema real:** sim, mas mais estreito do que a descrição original — é especificamente o caminho "`remover_bau` retornou False" (corrida entre duas leituras de estoque, ou estoque mudou entre a listagem e a abertura) que fica silencioso; o caminho "banco fora do ar" já é tratado corretamente.
- **Risco:** baixo — nada é perdido ou duplicado (`remover_bau` falha limpo), só a mensagem final pode ficar confusa ("abri 3 baús" sem dizer por que não abriu os outros 2 daquele tipo).
- **Impacto:** UX, não integridade de dados.
- **Dependências:** nenhuma.
- **Dificuldade:** trivial — mover o mesmo aviso (`interrompeu = True`) para também cobrir o `break` da linha 2493.
- **Corrigir agora?** Sim, é uma linha de mudança, mas não é urgente — pode entrar junto com B2 (é mais "melhoria de UX" do que "correção crítica").
- **Estratégia recomendada:** reclassificar como item de B2, não B1 — a severidade real (confirmada agora) é mais baixa do que os outros itens desta seção.
- **Testes necessários:** um teste que force `db.remover_bau` a retornar `False` no meio de `/abrir_todos` e confirme que a mensagem final avisa sobre a interrupção.

### P7 — `/resetar_tudo` escreve direto nas tabelas da plataforma
**Reverificado:** confirmado, sem mudança. `db.py:3420` (`resetar_economia_guild`) faz `DELETE FROM cofre_itens_usuario`, `cofre_saldos_usuario`, `reservas_cofre` diretamente (linhas 3473, 3475, 3477), fora da API da plataforma.
- **Problema real:** sim, é uma decisão de design consciente (documentada no próprio código), mas com um risco de concorrência real, não hipotético.
- **Risco:** médio — baixa probabilidade (comando raro, exige confirmação dupla com string exata), mas raio de explosão alto (apaga a economia inteira do servidor) se colidir com uma transação da plataforma em andamento no mesmo instante.
- **Impacto:** só se acionado; quando acionado, é grave por definição (é um reset intencional).
- **Dependências:** entender se a plataforma tem algum cache ou read-model que dependeria de um evento de escrita padronizado (a auditoria não confirmou isso — é uma pergunta em aberto, não um fato).
- **Dificuldade:** média — a correção "certa" (chamar um endpoint da plataforma que faça o mesmo DELETE dentro de uma transação isolada, com lock, em vez de escrever direto) exige coordenar os dois lados (bot + plataforma), não é só um `db.py`.
- **Corrigir agora?** Não com a mesma urgência dos outros — é um comando raro, protegido, e o próprio time já decidiu conscientemente aceitar esse risco. Recomendo **não tocar em B1**; revisar só se a Fase B3 (decisões de arquitetura) decidir que a plataforma precisa de um "barramento de eventos" mais rígido por outro motivo (Parte 7 deste documento) — nesse caso, `resetar_tudo` ganha o mesmo tratamento de graça.
- **Estratégia recomendada:** manter como está por ora; documentar explicitamente (no próprio comando ou num runbook) que rodar `/resetar_tudo` enquanto o site está em uso ativo é desaconselhado, como mitigação de processo em vez de código.
- **Testes necessários:** nenhum teste novo agora; se for revisado futuramente, precisa de um teste de concorrência (reset + escrita simultânea da plataforma).

### P12 — Endpoints internos de economia de personagem sem checagem de `dono_usuario_id`
**Reverificado:** confirmado. `plataforma/routers/internal.py:1005` (`/economia/moedas`) e `:1120` (`/economia/inventario`) usam `_character_in_campaign` (linha 42), que valida que o personagem existe e está ativo **naquela campanha**, mas não valida de quem é o personagem. Protegido só por `require_service_key` (`X-Service-Key`).
- **Problema real:** sim, mas é uma lacuna **latente**, não uma falha ativa — confirmei que nenhum bot (`bots/*/core/platform_api.py`) tem método algum que chame essas duas rotas hoje; elas não são alcançáveis por um jogador nem por um comando existente.
- **Risco:** baixo hoje (exige a chave de serviço, que só processos de confiança têm) — mas se vira alto no dia em que uma feature nova (comércio a nível de personagem, Parte 3 deste documento) decidir usá-las sem adicionar a checagem.
- **Impacto:** nenhum agora.
- **Dependências:** relevante especificamente se/quando K2 (Parte 3) for resolvido a favor de comércio no nível de personagem.
- **Dificuldade:** baixa — adicionar `AND dono_usuario_id=%s` (ou checagem equivalente) exigiria também que o chamador informe *quem* está autorizando a operação, o que essas rotas hoje não pedem (fazem sentido pra "o sistema credita/debita", não pra "o jogador X move algo do personagem Y").
- **Corrigir agora?** Não como um fix isolado — não há nada quebrado para corrigir ainda. Recomendo registrar como **pré-requisito bloqueante** de qualquer trabalho futuro que use essas rotas para operações iniciadas por jogador (não confundir com uso administrativo/sistema, que é o caso de uso atual e está correto para esse escopo).
- **Estratégia recomendada:** não mexer agora; adicionar a checagem apenas quando (e se) a Parte 3/B3 decidir que essas rotas passam a ser acionadas a partir de uma ação de jogador.
- **Testes necessários:** nenhum agora; quando for usado por ação de jogador, precisa de um teste que confirme que operar sobre o personagem de outro dono é rejeitado.

### P13 — Risco de falha no import por caminho do JSON de tiers do cofre
**Reverificado — achado original estava desatualizado / já mitigado.** O comentário no próprio código (`bots/jornalista/core/economia.py:31-34`) já cita explicitamente "achado 10 da auditoria 2026-08, escopo ampliado depois de descoberta na validação pós-correção" — ou seja, esse exato risco já foi identificado numa auditoria anterior (`docs/auditoria-integracao-sistema-2026-08.md`) e corrigido (`docs/validacao-pos-correcao-2026-08.md`, seção "Achado 10"). Confirmei três coisas:
1. `data/economia/cofre_seguranca_tiers.json` existe no repositório.
2. `tools/build-discloud-packages.ps1` (linhas 172-179) **já empacota** esse arquivo dentro do ZIP do Jornalista, em `bots/jornalista/data/cofre_seguranca_tiers.json` — exatamente o terceiro caminho de fallback que `_localizar_cofre_seguranca_tiers()` tenta.
3. O comentário do código já reflete essa correção.

- **Problema real:** o risco técnico bruto (código falha se nenhum caminho existir) ainda existe *como possibilidade*, mas **está coberto** pelo processo de build atual — não é mais um bug pendente de correção de código.
- **Risco residual:** é um risco de **processo**, não de código: se alguém gerar um ZIP manualmente sem passar por `build-discloud-packages.ps1`, ou esquecer de re-rodar o script após mexer nesse arquivo, o Jornalista quebra no boot. Isso já é coberto por uma memória de preferência salva (rodar o script sempre que o código muda) — não é um gap de auditoria, é disciplina de deploy já conhecida.
- **Impacto:** nenhum se o processo de build for seguido.
- **Dependências:** nenhuma correção de código pendente.
- **Dificuldade:** N/A.
- **Corrigir agora?** **Não é um item de B1** — remover da lista de correções pendentes. Sugiro, no máximo, um item de B2 de baixíssimo custo: um teste de smoke que roda `tools/build-discloud-packages.ps1` (ou verifica sua saída) e confirma que `cofre_seguranca_tiers.json` está presente nos dois ZIPs, para pegar uma regressão de processo automaticamente em vez de descobrir só no deploy.
- **Estratégia recomendada:** marcar P13 como **resolvido/mitigado**, com a ressalva de processo acima.
- **Testes necessários:** opcional — smoke test do script de build (não é teste do bot em si).

### P16 — Inconsistência de fuso horário no `dedupe_key` da loteria
**Reverificado:** confirmado, sem mudança. `bots/jornalista/cogs/loteria.py:45` usa `datetime.now(TZ)` (fuso `America/Sao_Paulo`, de `core.loot.TZ`) pra decidir "é domingo 21h", mas a linha 95 usa `datetime.now().date().isoformat()` (hora **local ingênua do host**, sem fuso) pra montar a chave de dedupe.
- **Problema real:** sim, é uma inconsistência real de fuso.
- **Risco:** baixo — o pagamento do prêmio já acontece **antes** de montar a `dedupe_key` (a ordem documentada em `loteria.py:71-74` é: credita → limpa bilhetes → registra extrato → só então usa a chave pra publicar o anúncio), então mesmo que a chave saia com a data "errada" perto da meia-noite, isso no máximo afeta a deduplicação da *mensagem de anúncio*, não o pagamento (que não é idempotente por essa chave).
- **Impacto:** cenário de pior caso é publicar o anúncio do mesmo sorteio duas vezes (ou não publicar) perto da virada do dia em hosts que rodam em UTC — cosmético, não financeiro.
- **Dependências:** nenhuma.
- **Dificuldade:** trivial — trocar `datetime.now()` por `datetime.now(TZ)` na linha 95, igual à linha 45.
- **Corrigir agora?** Sim, é uma linha, sem risco.
- **Estratégia recomendada:** padronizar as duas linhas para usar `TZ`.
- **Testes necessários:** um teste que rode o ciclo perto da meia-noite BRT com o host simulando UTC e confirme que a `dedupe_key` bate com o dia do sorteio.

### Resumo da Parte 1

| ID | Ainda válido? | Entra em B1? | Severidade real (pós-verificação) |
|---|---|---|---|
| P1 | Sim | Sim (remover código morto) | Baixa |
| P4 | Sim | Sim (remover + adaptar testes) | Baixa |
| P5 | Sim | Sim (trivial) | Baixa |
| P6 | Sim, mas mais estreito que o original | Rebaixado pra B2 (é UX, não correção crítica) | Baixa |
| P7 | Sim | Não entra em B1 — decisão consciente já tomada, revisar só se B3/B6 mexerem em barramento de eventos | Média (raro, raio de explosão alto) |
| P12 | Sim, mas latente/inofensivo hoje | Não entra em B1 — vira pré-requisito bloqueante de B4/B6 se usarem essas rotas | Média (latente) |
| P13 | **Não — já mitigado por correção anterior + build script** | Removido da lista; no máximo um smoke test opcional em B2 | N/A |
| P16 | Sim | Sim (trivial) | Baixa |

---

## PARTE 2 — Validação da Fase B2 (melhorias rápidas)

| # | Melhoria | Esforço | Risco | Valor pro jogador | Dependências | Antes ou depois do comércio? |
|---|---|---|---|---|---|---|
| 1 | Resumo semanal ligado por padrão — **✅ DECIDIDO (B3): sim, ligar por padrão; mestre mantém controle pra desligar** | Baixo (mudar um booleano + comunicar aos mestres) | Baixo | Médio — só quem já tem servidor ativo percebe | Nenhuma | Antes — zero acoplamento com comércio |
| 2 | Avisos econômicos na fila durável | Baixo-médio (mover `avisos.py` pro padrão de `publicar_ou_enfileirar`) | Baixo | Baixo direto pro jogador, médio pro mestre (diagnóstico) | Nenhuma | Antes |
| 3 | Correção do fuso da loteria (P16) | Trivial | Baixo | Baixo | Nenhuma | Antes |
| 4 | Remoção de código morto (P1, P4) | Baixo | Baixo | Nenhum direto — é saúde do código | Checar testes que usam as funções órfãs | Antes |
| 5 | Unificação de erros de permissão (P5) | Trivial | Baixo | Baixo | Nenhuma | Antes |
| 6 | ~~Teste `/ajuda` × comandos (Banqueiro)~~ | N/A | N/A | **Retirado (2026-08-12, ao implementar B1): `bots/banqueiro/tests/test_comandos.py` já existia**, com essa exata cobertura — a auditoria original só conferiu esse padrão no Jornalista e presumiu, sem checar, que faltava no Banqueiro. Nenhuma ação necessária. | — | — |
| 7 | Watchdog da loteria (Banqueiro↔Jornalista) | Médio (exige um sinal de "sorteio rodou" que hoje não existe entre os bots) | Baixo | Médio — evita bilhetes vendidos sem prêmio, sem ninguém perceber | Nenhuma bloqueante, mas se conecta naturalmente com a proposta de `eventos_campanha` (Parte 7) — pode ser mais barato de fazer **depois** dela do que antes | **Depois** de B6 (Jornalista/eventos), ou como uma versão simplificada standalone antes, à escolha |
| 8 | Jornalista anunciando leilões | Médio (novo assinante de evento) | Baixo | Alto — visibilidade de algo que já existe e é bom | Mais barato se vier depois de `eventos_campanha` (Parte 7); viável antes também, só reaproveitando `avisos_pendentes` como está | Pode vir antes (versão simples) ou depois (versão robusta) |
| 9 | Jornalista anunciando Procurados | Médio | Baixo | Alto — mesma lógica do item 8 | Mesma nota do item 8 | Mesma nota do item 8 |
| 10 | Enigmas temáticos do Jardim | Médio (é conteúdo, não código — exige escrever/curar novas charadas) | Baixo | Médio — melhora imersão sem mexer em mecânica | Nenhuma | Antes — é conteúdo puro, independente de tudo |
| 11 | `/banco_status` (painel de diagnóstico do Banqueiro) | Médio (replicar o padrão já existente de `/jornal status`) | Baixo | Médio, principalmente pro mestre | Nenhuma | Antes |
| 12 | Notificações DM opt-in — **correção (2026-08-12, ao planejar a execução da B2): a infraestrutura já existia inteira** (`ALERTAS`, `/alertas_banco`, `enviar_alerta_banco()` em `cogs/servicos.py`, já usada por pagamento/roubo/empréstimo/investimento/leilão) — a estimativa abaixo presumia, sem checar, que precisaria ser criada do zero. Ver Tarefa 5 concluída na Parte 10. | ~~Médio-alto (é a primeira peça de infraestrutura nova real desta lista — precisa de preferência por jogador, throttle anti-spam)~~ Baixo — só faltava estender o uso já existente a `/oferecer`/`/trocar` | Médio (spam mal calibrado irrita jogador) — throttle continua ausente, risco pré-existente em todos os call sites, não é regressão da B2 | Alto — item mais citado como fricção hoje (nada avisa quando uma oferta chega) | Nenhuma bloqueante, mas o comércio (B4) é o maior consumidor natural dela | Recomendo **antes** do comércio, especificamente para já nascer pronta pra notificar ofertas de `/mercado` assim que ele existir |

### Ordem recomendada dentro de B2

**Onda 1 (sem dependências, pura correção/qualidade — fazer tudo junto com B1):** itens 3, 4, 5, 6.

**Onda 2 (conteúdo e UX independentes, baixo risco):** itens 1, 10, 11.

**Onda 3 (infraestrutura que o comércio vai precisar — vale adiantar antes de B4):** item 2 (fila durável — o `/mercado` vai gerar notificações que devem usar o mesmo padrão robusto), item 12 (notificações DM).

**Onda 4 (mais barata depois de `eventos_campanha`, Parte 7 — pode esperar B6, ou entrar como versão simples antes se preferir ver valor mais cedo):** itens 7, 8, 9.

---

## PARTE 3 — Comércio entre jogadores: decisões K1, K2, K3

### K1 — Conta vinculada obrigatória? · ✅ DECIDIDO (B3, 2026-08-12) — Opção C

**Decisão aprovada:** manter a exigência de conta vinculada para qualquer operação que envolva dinheiro, troca, leilão ou mercado — preservando a atomicidade atual. Única exceção: uma doação simples entre dois jogadores **sem vínculo**, via `/dar_item_local @jogador item quantidade`.

**Escopo definitivo de `/dar_item_local`** (conforme aprovado, com uma precisão técnica necessária pra implementação futura):
- Não pode envolver dinheiro, preço, troca bilateral ou qualquer recurso da plataforma.
- É uma transferência local atômica dentro do Postgres do bot — **o que só é tecnicamente possível quando os dois jogadores envolvidos estão em modo legado (nenhum vinculado)**, porque é exatamente esse o caso em que as duas linhas afetadas (doador e receptor) vivem na mesma tabela local `inventario`, numa única transação SQL sem chamada HTTP nem cofre da plataforma envolvidos. Essa condição não estava explícita na frase aprovada, mas é uma consequência direta de "não pode envolver recurso da plataforma" — documentando aqui pra não virar ambiguidade na hora de implementar.
- **Caso limite explicitamente fora do escopo desta decisão:** doação de um jogador vinculado para um não-vinculado (ou vice-versa) continua bloqueada, exatamente como qualquer outra operação multi-recurso hoje (`CofreIndisponivel`) — não é uma lacuna nova, é a mesma regra atual, só reafirmada. Não abrir esse caso não foi pedido e não deveria ser assumido.
- Não abre modalidade de comércio completo sem vínculo — venda, troca com dinheiro, leilão e mercado continuam exigindo vínculo dos dois lados, sem exceção.

### K2 — Comércio no nível de conta/cofre ou de personagem/ficha? · ✅ DECIDIDO (B3, 2026-08-12) — Opção C (híbrido)

**Decisão aprovada:** o comércio continua sendo efetivamente processado no nível de conta/cofre, usando a infraestrutura transacional já existente. O personagem é informado na negociação como contexto narrativo/metadado — aparece na confirmação e pode ser registrado no `extrato`/`movimentos_cofre`. Nenhuma segunda infraestrutura transacional para `saldos_personagem`/`inventario_personagem` será criada neste momento. A migração para comércio realmente baseado em personagem (Opção B pura) fica registrada como evolução futura, condicionada a demanda real — ver Decisão 8 na Parte 11, que resolve a premissa (múltiplos personagens ativos por conta) que sustentaria essa possível revisão futura.

### Decisão adicional aprovada — "propriedade econômica" (regra do sistema)

O designer registrou explicitamente uma premissa que vale documentar como regra formal do sistema, para eliminar ambiguidade em qualquer implementação futura:

> Os recursos econômicos utilizados pelo comércio pertencem à conta/cofre do jogador. `Jogador → Conta/Cofre → recursos econômicos`. `Personagem → contexto narrativo da operação`, sem patrimônio financeiro transacional independente **para efeito do sistema de comércio**.

**Precisão necessária para não contradizer o que a auditoria original já confirmou** (e que continua verdadeiro, sem conflito com a regra acima): `saldos_personagem`/`inventario_personagem` existem no schema da plataforma e já são alimentados **hoje**, de forma manual, quando um jogador "saca" do cofre da conta pra um personagem específico (`plataforma/routers/vault.py`, endpoints `/transferir-item`/`/transferir-moeda`, já em produção, fora do escopo dos bots). Isso não muda — a ficha do personagem continua existindo e sendo alimentada normalmente. A regra aprovada diz respeito especificamente ao **sistema de comércio** (`/oferecer`, `/trocar`, futuro `/mercado`): ele **transaciona** no nível de conta/cofre, não no nível de personagem — o saque cofre→personagem continua sendo uma etapa manual e posterior, exatamente como já é hoje para prêmios de baú.

**Fora do escopo desta regra, sem conflito com ela:** veículos e propriedades (`campanha_veiculos`, `campanha_propriedades`) já são vinculados a `personagem_id` no schema da plataforma, e isso não muda — eles nunca foram parte do fluxo de item/inventário/comércio (a Parte 4 já os trata como categoria à parte, sempre mediada pelo mestre). A regra de "propriedade econômica" acima se aplica a moedas e itens negociáveis via comércio, não a bens estruturais de campanha.

### K3 — Identidade individual de itens · ✅ DECIDIDO (B3, 2026-08-12) — Opção B

**Decisão aprovada:** itens comuns continuam empilhados normalmente por `item_id`. Itens com modificação ou outro dado individualizante podem ser destacados do stack e receber identidade própria/UUID de instância. Sem UUID para todos os itens neste momento — a solução deve minimizar migração do inventário existente e preservar o comportamento atual para consumíveis, materiais e demais itens indistinguíveis.

**A** e **C** ficam descartadas nesta etapa; **B** é a opção aprovada.

- **A**: zero esforço, mas impede vender "esta espada modificada" separadamente do stack de espadas base — a limitação que motivou a pergunta.
- **C**: resolve o problema por completo, mas é desproporcional — a maioria dos ~277 itens do catálogo são consumíveis/materiais/armas sem modificação, onde ninguém se importa com "qual unidade específica" tem (uma Poção de Cura é idêntica à outra). Dar UUID a todo item vira 40 linhas de "Poção de Cura" em vez de uma linha com quantidade 40 — pior UX de inventário pro caso comum, só para resolver o caso raro.
- **B**: resolve exatamente o problema real (itens com `dados` não-vazio — que já é como modificações são registradas hoje, segundo a auditoria) sem penalizar o caso comum. Regra prática: enquanto um item não tiver `dados` com conteúdo individualizante, ele continua empilhado normalmente por `item_id`; no momento em que ganha uma modificação, uma unidade é "destacada" do stack pra uma linha própria com um identificador de instância — o resto do stack (itens não-modificados) permanece como está.

**Consequência de cada escolha:** B é o único que resolve o problema sem reformular todo o modelo de inventário dos dois bots + plataforma. É também o que menos migração de dados existentes exige (só itens já modificados precisam ser "destacados" — o resto do inventário de todo mundo continua exatamente como está).

---

## PARTE 4 — Venda para o mestre/sistema · ✅ DECIDIDO (B3, 2026-08-12) — Opção B+C

**Decisão aprovada: modelo híbrido B+C, com D explicitamente adiado para depois de haver dados reais de uso — sem percentual global de recompra (Modelo A) em nenhum momento desta etapa.**

- **Preço padrão de recompra por item** (base do Modelo B): cada item do catálogo (`data/loja/catalogo.json`) ganha um campo opcional `preco_recompra`. Itens sem esse campo simplesmente não são vendáveis ao sistema por padrão (não caem num percentual genérico — evita ter que curar 277 itens de uma vez; cura-se sob demanda, começando pelos itens mais comuns).
- **Mestre pode sobrescrever** (Modelo C como válvula de escape): um comando administrativo tipo `/mestre_comprar_item @jogador item valor` (citado na seção 6 do pedido original de auditoria, e confirmado como **não existente hoje**) cobre qualquer caso que a curadoria de catálogo não previu, sem exigir que todo item tenha preço definido de antemão.
- **Itens marcados como não vendáveis**: um campo booleano (`vendavel: false`, default `true` só quando `preco_recompra` existir) no catálogo, aplicado por padrão a: itens de recompensa/quest (perdem sentido narrativo se forem "farmáveis"), itens únicos/lendários (valor é narrativo, não deveria ter preço de sistema — mas continuam livres para negociar com **outro jogador** via `/oferecer`/futuro `/mercado`, onde o preço é acordado entre pessoas, não ditado pelo sistema), veículos/propriedades (são entidades estruturais do jogo, não itens de inventário comuns — uma venda desses precisa ser sempre mediada pelo mestre, nunca um comando de auto-venda).
- **Mercado dinâmico (Modelo D)** fica como evolução natural depois que B+C estiverem rodando e houver dados reais de uso pra calibrar uma fórmula — o precedente técnico já existe (câmbio flutuante de moeda, `cambio_fluxo`), então o salto de engenharia quando chegar a hora é menor do que parece.

**Casos específicos, resolvidos pela estrutura acima:**
- **Exploit de comprar e revender**: `preco_recompra` deve ser sempre definido abaixo do preço de compra (a curadoria decide a margem, mas a regra de design é "nunca ≥ preço de compra" — evita o ciclo infinito de comprar-vender-comprar gerar dinheiro do nada, inclusive combinado com bônus de câmbio/reputação).
- **Itens de recompensa**: não-vendáveis por padrão (acima).
- **Itens únicos**: não-vendáveis ao sistema por padrão; negociáveis entre jogadores (acima).
- **Itens modificados**: **não elegíveis para venda ao sistema** — o sistema não tem como precificar justamente uma modificação customizada; forçar o jogador a negociar com outro jogador (`/oferecer`) é a saída correta aqui, e conecta diretamente com K3 (se a modificação já tem uma instância própria, fica claro qual unidade está sendo oferecida).
- **Itens sem preço definido**: bloqueados por padrão ("Item sem preço de recompra definido — fale com o mestre"), não caem num percentual genérico arbitrário.
- **Itens ligados à campanha** (veículos, propriedades): fora do fluxo de item comum, sempre mediado pelo mestre (acima).
- **Moedas diferentes**: recompra sempre paga na mesma moeda em que o item foi originalmente precificado no catálogo (evita arbitragem via câmbio flutuante — comprar em Solares e "vender" convertendo indiretamente pra Lunaris com vantagem).

---

## PARTE 5 — Desenho do `/mercado`

Sem implementar — desenho conceitual reaproveitando o máximo possível do que já existe e está provado (leilão com custódia, trocas com reversão, `reservas_cofre`, `extrato`).

- **Listagem** (`/mercado_vender item quantidade preco [moeda]`): no momento da listagem, o item já sai do cofre do vendedor pra custódia (reaproveitando `reservas_cofre`, que a auditoria confirmou já ter suporte a expiração) — igual ao leilão novo (com custódia), nunca o padrão antigo/falho do leilão legado (P3 da auditoria original) que só cobrava/reservava no fechamento.
- **Compra** (`/mercado_comprar listagem_id [quantidade]`): transação única — debita o comprador, credita o vendedor (menos taxa), libera o item da custódia pro comprador. Mesmo padrão de `transfer_discord_vault`/custódia já usado por `/oferecer`.
- **Cancelamento**: só o próprio vendedor, só enquanto não vendido; devolve o item da custódia pro cofre do vendedor (mesmo padrão do cancelamento de leilão).
- **Expiração**: TTL por listagem (sensata: 7 dias por padrão, sem precisar de decisão do designer agora — é uma constante, não uma decisão de arquitetura), com uma task (`tasks.loop`) que devolve automaticamente itens de listagens expiradas, no mesmo padrão de recovery já usado em `cogs/baus.py`.
- **Custódia**: reaproveita `reservas_cofre` — não precisa de tabela nova para o item. Só a listagem em si (`mercado_listagens`: id, guild_id, vendedor, item_id, quantidade, preco, moeda, status, criado_em, expira_em) é tabela nova.
- **Taxa**: percentual pequeno sobre a venda, cobrado do vendedor no momento da compra — reaproveita o mesmo campo de taxa que `/seteconomia` já expõe para leilão/saque, sem precisar de uma constante nova por sistema.
- **Filtros/categorias**: reaproveita o agrupamento já existente em `core/catalogo.py` (`CATEGORIA_DE`) — `/mercado [categoria]` com autocomplete, mesmo padrão de UX já usado em `/loja_baus`.
- **Histórico**: nova entrada no `extrato` compartilhado com origem `mercado:{listagem_id}`, mesmo padrão de `troca:{chave}`/`leilao:{id}` já usados.
- **Logs**: mesma chave de idempotência derivada da interação do Discord, mesmo padrão usado em `/oferecer`/leilão.
- **Notificações**: vendedor notificado quando a listagem vende — reaproveita a proposta de notificação DM opt-in (Parte 2, item 12); se essa peça ainda não existir quando `/mercado` for construído, cai de volta pra uma mensagem no canal configurado, sem bloquear o lançamento do mercado por causa disso.
- **Concorrência**: compra de uma listagem com `quantidade` limitada precisa de `SELECT ... FOR UPDATE` na linha da listagem antes de decrementar — mesmo padrão de lock usado no lance de leilão, evita duas compras simultâneas "vencerem" a mesma unidade.
- **Idempotência**: chave por interação, mesmo padrão de tudo o mais.
- **Prevenção de fraude**: vendedor não pode comprar a própria listagem (mesma regra já existente em leilão); posse do item revalidada no momento da listagem, não confiada a partir de autocomplete (mesmo padrão de `/oferecer`/`/trocar`).
- **Integração com `/oferecer`/`/trocar`/`/leilao`**: `/mercado` é, na prática, "leilão sem lance, preço fixo, sem comprador específico" — arquiteturalmente é o primo mais próximo do leilão (reaproveita o padrão de custódia-no-momento-da-listagem que o leilão *novo* já usa corretamente) e do `/oferecer` (reaproveita o padrão de compra instantânea com transferência única). Não é um sistema novo do zero — é uma recombinação dos dois padrões que já existem e já foram validados em produção.

---

## PARTE 6 — Sistema de ações reativas

### Arquitetura conceitual: `AcaoReativaView`

Generalização do padrão já provado em `DefesaRouboView` (janela de tempo + botão de resposta + resolução idempotente sob concorrência).

- **Ciclo de vida**: (1) evento dispara → (2) sistema identifica elegíveis (vítima, testemunhas no canal, quem tem um cargo específico — parametrizável por tipo de ação) → (3) envia interface de reação (DM ou mensagem com botão, prazo configurável por tipo) → (4) aguarda a primeira resposta válida dentro do prazo → (5) resolve via callback específico do tipo de ação → (6) se ninguém reagir a tempo, resolve com o resultado padrão definido pelo tipo (ex.: "roubo bem-sucedido" se não houver defesa).
- **Timeout**: por tipo de ação, não fixo — herdando a ideia já usada no roubo (5-10s), mas outros tipos (ex. contraproposta de venda) podem justificar janelas maiores.
- **Concorrência**: mesmo padrão já provado — `time.monotonic()` + `asyncio.Event` garante que só o primeiro clique válido "vence" mesmo sob múltiplos cliques quase simultâneos, sem depender de `await` entre checagem e mudança de estado.
- **Idempotência**: resolução final feita dentro de uma transação/lock (reaproveitando o padrão de `UPDATE ... WHERE status='pendente'` já usado em `_reservar_cooldown_roubo`) — garante que mesmo se dois caminhos tentarem resolver a mesma ação (ex. timeout disparando quase ao mesmo tempo que um clique), só um vence.
- **Elegibilidade**: função parametrizável por tipo de ação — quem pode ver/clicar no botão (só a vítima? qualquer um no canal? só quem tem um cargo?).
- **Persistência necessária**: uma tabela genérica (`acoes_reativas_pendentes`: id, tipo, guild_id, alvo(s), payload, prazo, estado, criado_em) — análoga em espírito a `roubo_alvo_reserva`, mas parametrizada por tipo em vez de ser específica de roubo.
- **Recuperação após restart**: uma task de recovery no boot (mesmo padrão já usado em `cogs/baus.py`) que reprocessa ações que expiraram enquanto o bot estava fora, resolvendo com o resultado padrão de timeout — e, para ações ainda dentro do prazo, recriando a view com `discord.ui.DynamicItem` (mesmo padrão dos botões persistentes de baú, que já sobrevivem a reinício por não depender de estado em memória).
- **Logs**: cada resolução gera uma entrada em `extrato` e, se a proposta da Parte 7 for adotada, em `eventos_campanha`.

### Generalizar agora ou esperar um segundo caso de uso real? · ✅ DECIDIDO (B3, 2026-08-12) — esperar (Opção B)

**Decisão aprovada: esperar.** Hoje só existe **um** caso de uso concreto (`DefesaRouboView`). Extrair uma abstração genérica a partir de uma única instância é o tipo de generalização prematura que tende a errar a forma real do problema — a abstração "certa" só fica clara depois de ver como um segundo caso (ex.: fuga/perseguição) se parece e onde ele diverge do primeiro. Isso também é consistente com a preferência já registrada do projeto de não introduzir abstração antes dela ser necessária.

**Proposta prática**: implementar o **segundo** caso de uso (o candidato mais natural é fuga/perseguição, citado na auditoria original) como uma view própria, deliberadamente inspirada no padrão de `DefesaRouboView` mas sem forçar uma classe-base comum ainda. Só extrair `AcaoReativaView` quando existirem **dois ou três** casos reais rodando em produção — nesse ponto a abstração se desenha sozinha a partir do que de fato se repete entre eles, em vez de ser adivinhada com um único exemplo.

---

## PARTE 7 — Evolução do Jornalista: de "conteúdo automático" a "jornal vivo"

### Quais eventos valem registrar em `eventos_campanha`

**Valem** (alto sinal, baixo volume, cada ocorrência é narrativamente relevante):
- Leilão criado / leilão vencido (com item e valor).
- Recompensa/Procurado criado e resgatado.
- Roubo bem-sucedido/malsucedido acima de um valor mínimo (não todo roubo — só os que movem quantia relevante, pra não virar ruído; e sem expor a identidade da vítima se o roubo em si já for tratado como sigiloso em algum ponto do fluxo atual).
- Compra grande (acima de um limiar configurável pelo mestre).
- Baú de raridade alta encontrado.
- Propriedade/veículo comprado.
- Investimento resgatado com resultado significativo (ganho ou perda grande).
- Dívida grande gerada (sinaliza risco de "Procurado" chegando).
- Resultado agregado do resumo semanal (não é um evento único, é um "instantâneo" — mas pode ser tratado como um tipo de evento também, por consistência).

**Não valem** (ruído, ou risco de privacidade/spam):
- Toda transação pequena entre jogadores (`/pagar` de rotina).
- Toda venda de baú comum.
- Toda interação de rotina do dia a dia.
- **Morte/incapacitação de personagem**: verifiquei o schema da plataforma (`personagens.status`, `plataforma/core/schema.py`) e **esse conceito não existe hoje** — só `'ativo'`/`'arquivado'`, sem semântica de "morreu em combate" vs. "foi removido/arquivado por outro motivo". Isso não é algo pra registrar em `eventos_campanha` até (e se) o sistema de fichas ganhar esse conceito — é uma dependência de outro módulo, fora do escopo dos bots.

### Estrutura conceitual do payload

```
eventos_campanha(
  id,
  guild_id,
  tipo,                 -- 'leilao_vencido', 'procurado_criado', 'roubo_grande', ...
  ator_user_id,         -- nullable — nem todo evento tem "autor" claro, e alguns tipos podem optar por omitir por privacidade
  payload jsonb,        -- dados específicos do tipo (item, valor, moeda, etc.)
  origem,               -- qual processo gravou (banqueiro, plataforma, jornalista)
  idempotencia,         -- UNIQUE (origem, idempotencia), mesmo padrão já usado em lancamentos_economia/movimentos_cofre
  criado_em,
  publicado boolean default false,
  publicado_em
)
```

- **Retenção**: indefinida — é histórico de campanha, tem valor de lore permanente. Se crescer demais com o tempo, paginação/arquivamento é um problema de escala a resolver bem depois, não uma decisão de agora.
- **Idempotência**: mesmo padrão já validado em `lancamentos_economia`/`movimentos_cofre` — nenhuma novidade arquitetural, só aplicar o padrão existente a mais uma tabela.
- **Origem**: qualquer processo com acesso ao Postgres compartilhado pode escrever (Banqueiro ao resolver leilão/roubo/recompensa, plataforma ao registrar compra grande/propriedade) — sempre identificando quem gravou.
- **Consumo pelo Jornalista**: um novo ciclo (`tasks.loop`) lê eventos não publicados e aplica uma regra por tipo: eventos de alto impacto narrativo (ex. leilão de item raro, Procurado) viram **pauta com aprovação do mestre** (reaproveitando o fluxo `/jornal pauta` que já existe); eventos mais rotineiros (mas ainda acima do limiar de "vale registrar") podem ser publicados automaticamente, sem aprovação — essa distinção (o que é automático vs. o que vira pauta) é uma configuração por tipo de evento, ajustável pelo mestre via o mesmo padrão de `/jornal automacao` que já existe para outras automações.

Isso substitui/complementa `avisos_pendentes` (que hoje só carrega texto pronto do Banqueiro): o Jornalista passa a enxergar **fatos**, não só "o que já foi decidido dizer".

---

## PARTE 8 — IA no Jornalista · ✅ DECIDIDO (B3, 2026-08-12) — autorizada, Opção C (restrita por tipo de evento)

**Decisão aprovada:** IA autorizada apenas para tipos de conteúdo previamente definidos em configuração, atuando exclusivamente como ferramenta de redação — nunca como fonte de verdade, nunca publicando diretamente.

Fluxo obrigatório (aprovado tal como proposto):
1. Evento estruturado (`eventos_campanha`) é a única fonte de verdade sobre o que aconteceu.
2. Quando o **tipo de evento está configurado para usar IA** (configuração explícita por tipo, não um interruptor global — ver nota abaixo), o payload estruturado (fatos, não prosa) é enviado a um LLM com uma instrução restrita: "transforme estes fatos em um parágrafo de jornal, sem adicionar nenhum fato que não esteja na lista".
3. O texto gerado entra como **rascunho de pauta** no fluxo `/jornal pauta` já existente — nunca publica sozinho.
4. O mestre revisa, edita se quiser, e só então aprova/publica (gate humano obrigatório sempre que IA estiver envolvida — nunca 100% automático).

**Nota de implementação (não é uma nova decisão de arquitetura, só um detalhe a resolver durante a B6):** a lista exata de *quais* tipos de evento usam IA vs. permanecem 100% manuais não foi definida agora — o designer pediu que a configuração **permita** essa escolha por tipo, não que a lista seja fechada nesta etapa. Fica sinalizado para ser decidido (ou delegado ao mestre de cada servidor) quando os tipos de evento da Parte 7 forem finalizados na implementação da B6.

**Registro de versões** (na mesma tabela de pauta já existente, ou uma extensão pequena dela):
- **Versão original**: o payload estruturado (fatos-fonte) + timestamp.
- **Versão gerada**: o texto bruto que o LLM produziu, sem edição.
- **Versão final**: o texto efetivamente publicado, depois de qualquer edição do mestre.

Isso dá rastreabilidade completa (o que aconteceu de fato vs. o que a IA escreveu vs. o que foi publicado de verdade) sem exigir nenhuma tabela nova complexa — é uma extensão do fluxo de pauta que já existe.

**Dados que podem sair para o provedor de LLM**: nome de personagem/apelido já público na campanha (é o que já aparece nas notícias hoje de qualquer forma), tipo de evento, valores relativos quando fizer sentido narrativo ("uma fortuna", "uma pechincha") em vez de sempre o valor exato — a granularidade exata (expor valor numérico ou não) deveria ser uma escolha do mestre por tipo de evento, não uma regra fixa do sistema.

**Dados que não deveriam sair**: `discord_user_id` bruto, qualquer identificador de conta (nunca precisa — o nome do personagem já é suficiente pra narrativa), e qualquer dado de outro jogador que não seja parte do evento sendo narrado.

**Por que a IA nunca pode ser fonte de verdade**: mesmo que o LLM "invente" um detalhe fora do payload (alucinação), isso é sempre pego pelo gate humano do passo 3-4 antes de publicar — o sistema não depende da IA ser factualmente perfeita, depende do mestre revisar. Isso é a mesma garantia que já existe hoje pra pautas manuais, só estendida pra pautas geradas.

---

## PARTE 9 — Ideias novas (sem repetir a lista da auditoria original)

### 10 pequenas

1. **`/testemunhar`** — jogador que vê uma tentativa de roubo no mesmo canal pode testemunhar, acelerando o ganho de Calor do ladrão. Reaproveita o sistema de Calor já existente, só uma nova função que soma. *Valor: médio. Dificuldade: baixa. Dependências: nenhuma. Risco de exploit: baixo (testemunhar contra um aliado combinado não gera vantagem pra quem testemunha). Prioridade: 🟢.*
2. **`/denunciar @jogador`** — não acusa automaticamente; gera um rascunho de pauta pro mestre avaliar. *Valor: médio. Dificuldade: baixa. Dependências: fluxo de pauta já existente. Risco: baixo (não tem efeito automático). Prioridade: 🟢.*
3. **Emblema/título temporário no `/perfil`** para quem tem a maior recompensa ativa. *Valor: baixo-médio (cosmético). Dificuldade: baixa (query sobre dado já existente). Risco: nenhum. Prioridade: 🟢.*
4. **`/mercado_alertar item_id preco_max`** — notifica por DM quando o item aparece no `/mercado` abaixo do preço-alvo. *Valor: médio. Dificuldade: baixa (depende do `/mercado` existir). Dependências: Parte 5 + notificação DM (Parte 2, item 12). Risco: baixo. Prioridade: 🟡.*
5. **Rodapé de embed citando clima/estação atual** nas mensagens de compra/venda do Banqueiro. *Valor: baixo (imersão passiva). Dificuldade: baixa (leitura cross-bot já é tecnicamente possível hoje). Risco: nenhum. Prioridade: 🟢.*
6. **Resumo semanal automático por DM ao mestre** (`/economia_diagnostico`). *Valor: médio pro mestre. Dificuldade: baixa (reaproveita cron existente). Risco: nenhum. Prioridade: 🟡.*
7. **Reação automática do bot** (emoji) em compras grandes. *Valor: baixo (mas barato e divertido). Dificuldade: trivial. Risco: nenhum. Prioridade: 🟢.*
8. **`/ranking` com categorias "mais assaltado" e "mais ativo no crime"**. *Valor: médio (gamifica o sistema de roubo). Dificuldade: baixa (dado já existe em `roubo_calor`/`roubo_cooldown`). Risco: privacidade leve — avaliar se "mais assaltado" deveria ser opt-in. Prioridade: 🟡.*
9. **Cor de embed diferente pra transações grandes**. *Valor: baixo. Dificuldade: trivial. Risco: nenhum. Prioridade: 🟢.*
10. **Atalho "Transformar em pauta"** a partir de um evento de alto valor narrativo (depende de `eventos_campanha`, Parte 7). *Valor: médio pro mestre (economiza cliques). Dificuldade: baixa, mas depende da Parte 7 existir primeiro. Risco: nenhum. Prioridade: 🟡 (depois de B6).*

### 10 médias

1. **Sistema de "informante"** — pagar Lunaris pra descobrir pistas sobre um crime recente (consulta filtrada a `eventos_campanha`, com chance de informação falsa). *Valor: alto (cria economia de informação). Dificuldade: média. Dependências: Parte 7. Risco de exploit: médio — precisa de limite de consultas/preço calibrado pra não virar "detetive perfeito" barato. Prioridade: 🔵.*
2. **`/aposta` entre dois jogadores** mediada pelo bot (custódia + resultado por dado ou consenso). *Valor: alto (interação social direta). Dificuldade: média (reaproveita custódia já madura). Dependências: nenhuma bloqueante. Risco: baixo, já que a infraestrutura de custódia já é comprovada. Prioridade: 🟢.*
3. **"Ondas de crime"** — Jornalista publica alerta automático quando o Calor agregado do servidor passa de um limiar. *Valor: alto (torna visível pra quem não joga com roubo). Dificuldade: média. Dependências: Parte 7 (ou uma leitura direta de `roubo_calor` sem esperar a tabela de eventos). Risco: baixo. Prioridade: 🟡.*
4. **Sistema de "patrulha"** — cargo voluntário que reduz cooldown de defesa de outros jogadores no canal. *Valor: médio (incentiva cooperação). Dificuldade: média (nova regra de bônus social). Risco: baixo, mas precisa de limite pra não neutralizar o roubo por completo. Prioridade: 🔵.*
5. **Item "amuleto de sorte"** vinculado ao horóscopo do dia com efeito real além do bônus de baú já existente. *Valor: médio (liga conteúdo decorativo a mecânica real). Dificuldade: baixa-média. Dependências: sistema de horóscopo já existente. Risco: nenhum. Prioridade: 🟡.*
6. **Segundo produto de investimento** (curto prazo, maior variância). *Valor: médio (mais opções financeiras). Dificuldade: baixa-média (extensão do produto atual, sem tocar nele). Risco: precisa calibrar risco/retorno com cuidado, mesmo tipo de trabalho já feito pro produto atual. Prioridade: 🟡.*
7. **"Itens do dia" com desconto rotativo**, anunciado pelo Jornalista, aplicado pelo Banqueiro. *Valor: alto (motivo recorrente de engajamento diário). Dificuldade: média (coordenação entre os dois bots). Dependências: nenhuma bloqueante. Risco: baixo. Prioridade: 🟡.*
8. **Cobrança pública de dívida entre jogadores** ("processo" narrativizado se não pago, via mestre/Jornalista). *Valor: médio (narrativiza a inadimplência entre jogadores, hoje só via `/emprestar_para`). Dificuldade: média. Dependências: sistema de empréstimo já existente. Risco: baixo. Prioridade: 🔵.*
9. **`/jornal enquete`** — votação pública (reação = voto) sobre uma decisão de mundo, cujo resultado altera uma variável de economia por um período. *Valor: alto (decisão coletiva com consequência real). Dificuldade: média. Dependências: nenhuma bloqueante. Risco: baixo, desde que o efeito tenha teto/prazo. Prioridade: 🟡.*
10. **Cargo dinâmico "Magnata"/"Falido"** baseado em patrimônio, publicado automaticamente quando muda. *Valor: médio (visibilidade social sem expor valor exato). Dificuldade: baixa-média. Dependências: nenhuma. Risco: privacidade leve — deveria ser opt-in ou pelo menos avisado. Prioridade: 🟡.*

### 10 grandes

1. **Facções/guildas com tesouraria compartilhada e disputa territorial simples**. *Valor: muito alto (novo eixo inteiro de gameplay social). Dificuldade: alta. Dependências: modelo de comércio (Parte 3) já resolvido. Risco de exploit: alto sem design cuidadoso (tesouraria compartilhada é um alvo natural de abuso). Prioridade: 🔵.*
2. **Bolsa de valores entre servidores/campanhas**. *Valor: alto, mas nicho (só interessa a quem já domina investimentos). Dificuldade: alta. Dependências: câmbio flutuante já existente como base técnica. Risco: alto (complexidade de balanceamento). Prioridade: 🔴 — escopo desproporcional ao público provável.*
3. **Estações econômicas formais** (estação muda preços/juros/taxas automaticamente, não só drop rate de baú). *Valor: alto (unifica o decorativo com efeito real amplo). Dificuldade: alta (toca em muitos sistemas ao mesmo tempo). Risco: alto de desbalancear tudo de uma vez — recomendo faseamento cuidadoso mesmo se aprovado. Prioridade: 🔵.*
4. **"Tribunal"** — acusações formais com votação/testemunho e pena econômica automática. *Valor: alto (narrativa emergente forte). Dificuldade: alta. Dependências: `/denunciar` (pequena, item 2) e sistema de reação (Parte 6) como bases. Risco: alto de abuso social (linchamento coordenado) — precisa de salvaguardas de design fortes. Prioridade: 🔴 até haver desenho de salvaguarda específico.*
5. **Contratos de longo prazo com marcos e penalidade por quebra**. *Valor: alto (comércio narrativo mais rico que "entregar 10 itens"). Dificuldade: média-alta. Dependências: Parte 3 (comércio) resolvida. Risco: médio (precisa de mediação clara em caso de disputa). Prioridade: 🔵.*
6. **Janelas de risco por horário real** (roubo mais fácil/recompensador à noite no fuso da campanha). *Valor: médio-alto (dá ritmo temporal real). Dificuldade: média (é principalmente ajuste de parâmetro por horário, reaproveitando o sistema de roubo já existente). Risco: baixo. Prioridade: 🟡 — mais barato do que parece, poderia subir de categoria.*
7. **Espionagem entre facções** (só faz sentido se facções, item 1, existirem). *Valor: alto, mas condicional. Dificuldade: alta. Dependências: item 1. Risco: alto (mesma categoria de risco de abuso). Prioridade: 🔴 por ora — dependente de outra feature grande ainda não aprovada.*
8. **Recompensa dinâmica que cresce sozinha** se ninguém resgatar em X dias. *Valor: alto (tensão crescente, boa "história" pro Jornalista contar). Dificuldade: média (reaproveita o sistema de recompensa já existente, só adiciona crescimento automático). Risco: baixo. Prioridade: 🟢 — mais simples do que parece, forte candidato a subir pra "médio".*
9. **Seguro expandido** (vida de personagem, veículo, propriedade — hoje só cofre). *Valor: médio-alto. Dificuldade: média-alta (cada tipo de seguro tem sua própria lógica de sinistro). Dependências: nenhuma bloqueante. Risco: baixo. Prioridade: 🔵.*
10. **Painel web "Gazeta do Jardim"** — arquivo histórico navegável de eventos/notícias. *Valor: alto (visibilidade permanente fora do Discord). Dificuldade: média (é principalmente front-end consumindo `eventos_campanha` já estruturado). Dependências: Parte 7 resolvida. Risco: baixo. Prioridade: 🔵.*

---

## PARTE 10 — Roadmap final

> **Atualização 2026-08-12**: B3 está **concluída** (decisões aprovadas — ver Parte 11). B1/B2/B4/B5/B6 seguem **não iniciadas** — aprovação de decisão de arquitetura não é autorização de implementação; cada fase de código começa só quando pedida explicitamente.

A ordem sugerida no pedido (B1→B2→B3→B4→B5→B6→B7) está correta na dependência lógica principal — decisões de arquitetura (B3) realmente precisam vir antes de comércio (B4), que depende delas. Duas correções ao sequenciamento:

1. **Jornalista/eventos (B6) não depende de comércio (B4) nem de ações reativas (B5)** — pode rodar em paralelo a partir do momento em que B2 terminar, não precisa esperar B4/B5. Só a ideia "pequena #10" (atalho de pauta a partir de evento) e os itens de watchdog/anúncio de leilão-e-procurado (B2, itens 7-9) se beneficiam de vir depois de `eventos_campanha` existir — o resto de B6 é independente.
2. **Ações reativas (B5)**, pela recomendação da Parte 6, não deveria começar tentando generalizar `AcaoReativaView` — deveria começar implementando um segundo caso de uso concreto (fuga/perseguição) como view própria, só extraindo a abstração depois.

### FASE B1 — Correções técnicas · ✅ CONCLUÍDA (2026-08-12)
- **Objetivo**: eliminar dívida técnica confirmada sem tocar em nenhuma decisão de produto.
- **Tarefas**: remover código morto (P1, P4 + adaptar testes), unificar erro de permissão (P5), corrigir fuso da loteria (P16).
- **Dependências**: nenhuma.
- **Riscos**: baixíssimo — tudo aqui é remoção/correção pontual sem mudança de comportamento visível ao jogador.
- **Critério de conclusão**: ✅ suíte de testes passando nos dois bots (Banqueiro: 207 testes; Jornalista: 108 testes, ambos contra Postgres de teste descartável). Nenhuma função órfã remanescente em `db.py`. `/ajuda` do Banqueiro já estava sincronizado — item 6 de B2 retirado por já existir, ver nota abaixo.
- **Achado durante a implementação**: `bots/banqueiro/tests/test_comandos.py` já existia com a mesma cobertura que a auditoria original (P10) descrevia como faltante — a auditoria checou esse padrão só no Jornalista e presumiu, sem checar, que faltava no Banqueiro. Corrigido em `docs/auditoria-bots-discord-2026-08.md` (P10) e na tabela da B2 acima. Uma tentativa inicial de "adicionar" o teste sobrescreveu por engano o arquivo existente (perdendo 3 testes sem relação: juros automático do cofre × 2, e a checagem de que `/loja`/`/comprar`/`/vender` não existem mais) — revertido para o conteúdo original antes de seguir; nenhum teste foi perdido no resultado final.
- **P5, correção mais severa do que o descrito**: ao investigar o dispatch de erro do discord.py antes de corrigir, confirmei que `CommandTree._dispatch_error` chama o handler do cog e o handler global **sempre em sequência** (`finally`), não um-ou-outro — então o duplicado em `admin.py` não era só "mensagens podem divergir", era o jogador recebendo **duas mensagens de erro toda vez** que um comando do Admin era chamado sem permissão. Corrigido removendo o handler do cog por completo (o binding fica `None`, então só o handler global roda).
- **Escopo real das tarefas executadas**: P1 (removidos `_loja_legada`/`_comprar_legado`/`_executar_compra`/`_finalizar_compra_item`/`_vender_legado`, ~235 linhas mortas), P4 (removidas 6 funções não-atômicas órfãs de `core/db.py`: `dar_lance_leilao`, `criar_investimento`, `criar_emprestimo`, `aceitar_emprestimo`, `recusar_emprestimo`, `pagar_emprestimo`; adaptado `test_db_resetar_economia_guild.py` para usar `comprar_investimento` real), P5 (removido `Admin.cog_app_command_error`, teste novo `test_erro_permissao.py`), P16 (dedupe_key da loteria agora usa o mesmo `agora` com fuso de `_sortear_guild`, teste novo cobrindo a virada de domingo à meia-noite BRT/UTC). P6 (rebaixado pra B2 no plano original) e P7/P12/P13 (não entram em B1 por decisão já registrada) não foram tocados nesta fase.

### FASE B2 — Melhorias rápidas · 🟡 PARCIALMENTE CONCLUÍDA (2026-08-12)
- **Objetivo**: entregar valor visível ao jogador/mestre sem exigir decisão de arquitetura.
- **Tarefas**: ondas 1-3 da Parte 2 (fila durável de avisos, resumo semanal ligado, enigmas temáticos, `/banco_status`, notificações DM opt-in). P6 (aviso de `/abrir_todos` interrompido) entra aqui, não em B1.
- **Dependências**: nenhuma bloqueante; notificações DM (item 12) idealmente conclui antes de B4 começar, pra já nascer pronta pro `/mercado`.
- **Riscos**: baixo — o item de maior risco é calibrar o throttle das notificações DM pra não virar spam.
- **Critério de conclusão**: ✅ Tarefas 1 (P6), 4 (`/banco_status`), 5 (DM em trocas), 2 (avisos na fila) e 1 (resumo semanal) entregues e testadas. ⏸️ **Tarefa 3 (enigmas temáticos) segue adiada/bloqueada** — `bots/jornalista/core/enigmas.py` já tinha alterações não commitadas de antes desta sessão, perseguindo aparentemente o mesmo objetivo; por instrução explícita, esse arquivo não foi tocado. **B2 não é considerada 100% concluída enquanto a Tarefa 3 continuar adiada.** Onda 4 (watchdog/anúncios, itens 7-9 da Parte 2) segue explicitamente adiada pra depois de B6, como já documentado.
- **Suítes de teste após B2** (Banqueiro + B1 + B2, Jornalista + B1 + B2): Banqueiro **216 testes** passando (207 da B1 + 9 novos: 2 de P6, 3 de `/banco_status`, 4 de DM em trocas); Jornalista **110 testes** passando (108 da B1 + 2 novos: 1 de avisos na fila, 1 de resumo semanal na fila). **Total: 326 testes passando.**
- **Correções a achados desta análise (mesmo padrão do achado sobre `test_comandos.py` na B1 — reafirma a lição: sempre confirmar a existência de um arquivo de teste antes de presumir que falta)**:
  1. **Tarefa 2**: a análise de execução dizia "não encontrei teste dedicado a `cogs/avisos.py` hoje". Isso estava **errado** — `bots/jornalista/tests/test_avisos.py` já existia, com 4 testes. Os testes existentes foram **preservados e adaptados** (não recriados do zero): 2 ficaram intocados (não dependiam do mecanismo de entrega), 2 foram ajustados pra inspecionar a chamada à fila durável em vez do `canal.send` direto, e 1 teste novo cobre especificamente "não marca como publicado se o enfileiramento falhar".
  2. **Tarefa 1**: a análise original (Decisão 6, Parte 11) dizia "Impacto técnico: nenhum — muda um valor default". Na implementação real, o default de `resumo_semanal` estava hardcoded em **três pontos coordenados, em dois arquivos** (`AUTOMACOES["resumo_semanal"]` e o gate do `ciclo_resumo` em `cogs/jornal.py`; o caso especial `padrao=(automacao != "resumo_semanal")` em `core/publicacoes.py`) — mudar só o primeiro deixaria `/jornal automacoes` mostrando "ligado" enquanto a publicação real continuaria sendo adiada pra sempre. Os três pontos foram alterados juntos; ver Decisão 6 abaixo para a nota de implementação.
  3. **Tarefa 5**: a infraestrutura de notificação DM opt-in (`ALERTAS`, `/alertas_banco`, `enviar_alerta_banco()` em `cogs/servicos.py`) **já existia inteira antes da B2**, em produção, usada por pagamento/roubo/empréstimo/investimento/leilão. A Tarefa 5 **apenas estendeu** esse uso já existente para `/oferecer` e `/trocar` (categoria `"mercado"`, já rotulada "Leilões e trocas"), que eram os únicos pontos do comércio sem esse aviso. Nenhuma infraestrutura nova foi criada. Throttle continua ausente (mesma limitação pré-existente em todos os outros call sites) — registrado como risco conhecido, não virou tarefa nova.

### FASE B3 — Decisões de arquitetura · ✅ CONCLUÍDA (2026-08-12)
- **Objetivo**: resolver K1, K2, K3, K4 e as decisões de IA/eventos antes de qualquer código de comércio ser escrito.
- **Tarefas**: nenhuma tarefa de código — é a fase de aprovação das recomendações desta Parte 3/4/7/8, ou de decisão alternativa do designer (ver Parte 11).
- **Dependências**: nenhuma técnica; dependia só do designer.
- **Riscos**: o risco real desta fase era **pular ela** — mitigado, todas as decisões foram fechadas antes de qualquer código de B4/B5/B6.
- **Critério de conclusão**: ✅ todas as 8 decisões da Parte 11 aprovadas, mais a premissa adicional de "propriedade econômica". Nenhuma ficou adiada sem gatilho — a única reavaliação futura registrada (nível de personagem em K2) está condicionada explicitamente à Decisão 8 mudar de resposta.

### FASE B4 — Comércio
- **Objetivo**: `/mercado` persistente (Parte 5), com o modelo de venda ao mestre (Parte 4) implementado em paralelo (são independentes entre si).
- **Tarefas**: tabela `mercado_listagens`, comandos de listar/comprar/cancelar, task de expiração, `preco_recompra`+`vendavel` no catálogo, `/mestre_comprar_item`, `/dar_item_local` (Decisão 1).
- **Dependências**: ✅ B3 concluída (K1, K2, K3, K4 todas decididas). Notificação DM (B2) recomendada, não bloqueante. **Pronta para ser planejada/iniciada quando autorizada — não iniciada nesta etapa.**
- **Riscos**: médio — é a fase que mais mexe em dinheiro/item real; testar concorrência (duas compras simultâneas da mesma listagem) é obrigatório antes de liberar.
- **Critério de conclusão**: testes de concorrência e idempotência cobrindo listar/comprar/cancelar/expirar; nenhum caminho de duplicação de item ou dinheiro identificado em revisão.

### FASE B5 — Ações reativas/crime
- **Objetivo**: um segundo caso de uso real de "reação" (fuga/perseguição), não a abstração genérica ainda.
- **Tarefas**: implementar a view de fuga/perseguição inspirada em `DefesaRouboView`, sem extrair classe-base ainda; registrar explicitamente o aprendizado de onde ela diverge do padrão de roubo, como insumo pra uma eventual generalização futura.
- **Dependências**: nenhuma bloqueante de B4 — pode rodar em paralelo.
- **Riscos**: baixo — reaproveita um padrão de concorrência já provado.
- **Critério de conclusão**: segundo caso de uso em produção; decisão explícita (não implícita) sobre extrair `AcaoReativaView` agora ou esperar um terceiro caso.

### FASE B6 — Jornalista/eventos
- **Objetivo**: tabela `eventos_campanha` + Jornalista consumindo eventos reais, resumo semanal já ligado desde B2.
- **Tarefas**: schema de `eventos_campanha`, escrita de eventos pelo Banqueiro/plataforma nos pontos listados na Parte 7, ciclo de consumo no Jornalista, decisão por tipo de evento (automático vs. pauta com aprovação), IA de redação (Parte 8) se aprovada em B3.
- **Dependências**: B3 concluída (decisão de IA e de quais eventos valem). Pode começar em paralelo a B4/B5 — não depende deles.
- **Riscos**: médio — é a fase com mais superfície nova (tabela nova, múltiplos pontos de escrita, novo ciclo de leitura); risco principal é volume de eventos virar ruído se os limiares não forem calibrados com cuidado.
- **Critério de conclusão**: eventos sendo escritos pelos pontos definidos, Jornalista publicando (automático ou via pauta) a partir deles, resumo semanal confirmado ligado.

### FASE B7 — Sistemas maiores
- **Objetivo**: avaliar os itens 🔵/🔴 da Parte 9 (grandes) individualmente, um de cada vez, só depois que B4-B6 estiverem estáveis em produção por um tempo.
- **Tarefas**: nenhuma definida ainda — esta fase é deliberadamente "a definir", porque cada item grande (facções, tribunal, bolsa de valores) merece sua própria rodada de design antes de entrar em roadmap de verdade.
- **Dependências**: varia por item (ver dependências listadas na Parte 9).
- **Riscos**: varia por item — os marcados 🔴 têm risco de abuso social ou escopo desproporcional identificados explicitamente e não deveriam avançar sem um desenho de salvaguarda dedicado.
- **Critério de conclusão**: N/A nesta etapa — só entra em critério de conclusão quando um item específico for escolhido e planejado à parte.

---

## PREMISSAS INVARIÁVEIS (B3 oficialmente concluída em 2026-08-12)

Confirmadas pelo designer como travadas para toda a implementação subsequente (B1/B2/B4/B5/B6). Qualquer código, PR ou decisão de implementação que precise contrariar uma destas exige **sinalizar explicitamente a necessidade de uma nova decisão arquitetural** antes de prosseguir — não deve ser mudada silenciosamente durante a implementação.

1. Comércio continua transacionando no nível de conta/cofre.
2. Personagem é contexto narrativo/metadado da negociação (não proprietário econômico usado pelo comércio) — sem negar que `saldos_personagem`/`inventario_personagem` continuem existindo e sendo alimentados via saque manual cofre→personagem, fora do escopo do comércio.
3. `/dar_item_local` é exclusivamente para legado-legado (os dois lados sem vínculo) e não envolve dinheiro.
4. Itens modificados podem possuir identidade própria (UUID de instância); itens comuns continuam em stack por `item_id`.
5. Recompra automática depende de `preco_recompra` + regra de vendabilidade — sem percentual global de fallback.
6. Mestre continua sendo a válvula de escape para itens sem preço automático.
7. IA nunca é fonte de verdade e nunca publica sem aprovação humana.
8. Resumo semanal fica ligado por padrão, com possibilidade de desativação pelo mestre.
9. `AcaoReativaView` não será generalizada antes de existir um segundo caso de uso concreto em produção.
10. Um personagem ativo por jogador/campanha continua sendo a premissa de design atual.
11. Comércio baseado diretamente em personagem (K2 puro) e recompra dinâmica (K4-D) continuam adiados.

---

## PARTE 11 — Decisões para o designer

> **Todas as 8 decisões abaixo foram aprovadas pelo designer em 2026-08-12, mais uma premissa adicional (Decisão 2-A). Esta seção documenta a versão final aprovada de cada uma, com a pergunta/opções originais preservadas para rastreabilidade.** Constantes numéricas (TTL de listagem, percentual de taxa, limiares de evento) continuam com default sensato já proposto nas partes anteriores, sem exigir aprovação — como já valia antes desta rodada.

### Decisão 1 — K1: conta vinculada obrigatória para comércio? · ✅ APROVADA — Opção C
1. **Pergunta**: manter a exigência de conta vinculada pra qualquer operação multi-recurso (venda/troca/leilão/mercado), com uma exceção pontual de doação simples entre dois jogadores legado?
2. **Opções**: (A) manter só a exigência atual, sem exceção; (B) permitir comércio completo mesmo sem vínculo, com garantias mais fracas; (C) manter a exigência + exceção de doação legado-legado.
3. **Decisão final**: C. Comércio com dinheiro/troca/leilão/mercado exige vínculo dos dois lados, sem exceção. Doação simples (`/dar_item_local @jogador item quantidade`, sem dinheiro, sem recurso de plataforma) liberada especificamente entre dois jogadores sem vínculo — ver Parte 3 para o detalhe técnico de escopo (ambos precisam estar em modo legado).
4. **Consequência**: garantia de atomicidade preservada onde dinheiro está envolvido; fricção de "não consigo nem doar um item" resolvida para o caso mais comum de quem ainda não vinculou conta.
5. **Impacto técnico**: um comando novo pequeno e isolado, sem tocar na infraestrutura de custódia existente.

### Decisão 2 — K2: comércio no nível de conta ou de personagem? · ✅ APROVADA — Opção C (híbrido)
1. **Pergunta**: o comércio deve mexer diretamente no inventário/saldo do personagem (ficha), ou continuar operando no cofre da conta como hoje, com o personagem só como rótulo?
2. **Opções**: (A) nível de conta, como hoje; (B) nível de personagem, exigindo nova camada de transação; (C) híbrido — transação no cofre de conta, personagem como metadado narrativo.
3. **Decisão final**: C. Nenhuma segunda infraestrutura transacional para `saldos_personagem`/`inventario_personagem` nesta etapa. Migração para B puro registrada como evolução futura condicional (ver Decisão 8).
4. **Consequência**: maior parte do valor narrativo de B entregue a uma fração do custo; P12 (validação de ownership nos endpoints internos de personagem) permanece adiada, sem uso hoje.
5. **Impacto técnico**: nenhuma tabela nova além do que a Parte 5 já propõe.

**Decisão adicional aprovada, ligada a esta — "propriedade econômica":** `Jogador → Conta/Cofre → recursos econômicos`; `Personagem → contexto narrativo da operação`, sem patrimônio financeiro transacional independente para efeito do sistema de comércio. Ver o texto completo, com a precisão técnica necessária pra não contradizer o schema existente, na Parte 3 (logo após K2).

### Decisão 3 — K3: identidade individual de itens? · ✅ APROVADA — Opção B
1. **Pergunta**: itens modificados devem virar unidades individualmente endereçáveis (com identificador próprio), separadas do stack comum?
2. **Opções**: (A) manter tudo em stack por `item_id`, sem exceção; (B) UUID só para itens com `dados` não-vazio (modificados); (C) UUID pra todo item do jogo.
3. **Decisão final**: B. Itens comuns seguem empilhados por `item_id`; só itens com modificação ganham identidade própria/UUID de instância, minimizando migração do inventário existente.
4. **Consequência**: resolve o problema real (vender/negociar item modificado separadamente) sem penalizar consumíveis/materiais/itens indistinguíveis.
5. **Impacto técnico**: extensão do modelo atual, não uma reforma.

### Decisão 4 — K4: modelo de venda para o mestre/sistema? · ✅ APROVADA — Opção B+C
1. **Pergunta**: qual estrutura de precificação usar quando um jogador vende um item de volta pro sistema (não pra outro jogador)?
2. **Opções**: (A) percentual fixo do preço original; (B) preço de recompra curado por item; (C) só o mestre decide, caso a caso; (D) mercado dinâmico; ou uma combinação.
3. **Decisão final**: B+C. Catálogo ganha `preco_recompra` opcional + flag de vendável; item só é auto-vendável ao sistema com os dois definidos. Sem `preco_recompra`, o jogador é direcionado ao mestre — **sem fallback de percentual global (A) em nenhum caso**. Mestre tem operação administrativa (`/mestre_comprar_item` ou equivalente) para cobrir o que a tabela de recompra não prevê. Itens modificados nunca são auto-vendáveis ao sistema. Itens únicos, recompensas, veículos e propriedades seguem as regras especiais já descritas na Parte 4. Mercado dinâmico (D) fica para depois de haver dados reais de uso.
4. **Consequência**: controle fino sem exigir curadoria completa do catálogo de uma vez; risco de exploit de comprar-e-revender mitigado por nunca ter um percentual genérico como rede de segurança.
5. **Impacto técnico**: dois campos novos no catálogo + um comando administrativo — baixo esforço.

### Decisão 5 — Uso de IA no Jornalista está autorizado? · ✅ APROVADA — Opção C
1. **Pergunta**: o Jornalista pode usar um LLM externo para redigir notícias a partir de eventos estruturados (nunca como fonte de fato, sempre com aprovação do mestre antes de publicar)?
2. **Opções**: (A) autorizar para todos os tipos de evento; (B) não autorizar por ora; (C) autorizar só para tipos de evento previamente configurados.
3. **Decisão final**: C. Fluxo obrigatório: evento estruturado → fatos conhecidos → IA gera rascunho → pauta → revisão humana → publicação. IA nunca publica diretamente. `discord_user_id` e identificadores de conta nunca são enviados ao provedor — só nomes/apelidos públicos da campanha e fatos estruturados relevantes. Configuração deve permitir definir, por tipo de evento, se usa IA ou permanece manual.
4. **Consequência**: acelera produção de conteúdo só onde o designer autorizar, sem abrir mão de controle sobre dados sensíveis nem sobre veracidade (gate humano sempre presente).
5. **Impacto técnico**: extensão pequena da tabela de pauta (Parte 8) para registrar versão original/gerada/final.

### Decisão 6 — Resumo semanal ligado por padrão agora? · ✅ APROVADA — Opção A
1. **Pergunta**: vale ativar o resumo semanal do Jornalista por padrão em todos os servidores (hoje é opt-in), já na Fase B2?
2. **Opções**: (A) ligar por padrão agora; (B) manter opt-in.
3. **Decisão final**: A. Mestre mantém controle para desativar caso não queira a automação.
4. **Consequência**: ganho imediato de "mundo vivo" sem esperar a Fase B6.
5. **Impacto técnico**: nenhum — muda um valor default já implementado e testado.
   - **Nota de implementação (B2, 2026-08-12, decisão inalterada):** o "valor default" citado acima na verdade estava duplicado em três pontos coordenados (`AUTOMACOES["resumo_semanal"]` e o gate do `ciclo_resumo` em `cogs/jornal.py`, mais o caso especial de `tentar_publicacao` em `core/publicacoes.py`) — os três precisaram mudar juntos pra a automação realmente ficar ligada de ponta a ponta, não só na exibição de `/jornal automacoes`. Detalhe técnico descoberto na implementação; não muda a decisão em si (Opção A continua aprovada e é o que foi implementado).

### Decisão 7 — Generalizar `AcaoReativaView` agora ou depois de um segundo caso? · ✅ APROVADA — Opção B
1. **Pergunta**: vale investir na abstração genérica de "ação reativa" já na Fase B5, ou primeiro validar com um segundo caso de uso concreto (fuga/perseguição)?
2. **Opções**: (A) generalizar agora, direto da Parte 6; (B) implementar o segundo caso como view própria primeiro, comparar padrões, e só então decidir se a abstração deve existir.
3. **Decisão final**: B. Evitar generalização prematura.
4. **Consequência**: pequena duplicação de código entre roubo e fuga por um tempo, em troca de uma abstração final (se vier) fundamentada em padrões reais.
5. **Impacto técnico**: baixo — a diferença é só *quando* a extração acontece, não se o recurso existe.

### Decisão 8 — Múltiplos personagens por conta na mesma campanha: é um caso de uso real? · ✅ APROVADA — Opção A
1. **Pergunta**: jogadores do Jardim RPG costumam (ou deveriam poder) ter mais de um personagem ativo na mesma campanha?
2. **Opções**: (A) não é um padrão de uso esperado — um personagem ativo por jogador por campanha é a premissa de design atual; (B) é comum/esperado ter vários.
3. **Decisão final**: A, como premissa de design. O schema pode permitir múltiplos personagens, mas isso não obriga o sistema de comércio a implementar uma economia independente por personagem neste momento.
4. **Consequência**: reduz a urgência prática da limitação do híbrido C (Decisão 2) — se essa premissa mudar no futuro, a Decisão 2 deve ser revisitada junto com ela, não isoladamente.
5. **Impacto técnico**: nenhum por si só — recalibra a urgência da Decisão 2, já registrada acima como condição explícita de reavaliação futura.

---

### Consolidação — o que ficou decidido, o que ficou adiado, o que continua em aberto

**Decidido nesta rodada (B3, 2026-08-12), sem pendência:**
- K1 (conta vinculada + exceção de doação legado-legado)
- K2 (comércio a nível de cofre de conta, personagem como metadado) + a premissa de propriedade econômica
- K3 (UUID de instância só para itens modificados)
- K4 (venda ao mestre = preço curado + mestre como válvula de escape, sem percentual global)
- Uso de IA no Jornalista (autorizado, restrito por tipo de evento configurável, sempre com gate humano)
- Resumo semanal ligado por padrão
- Não generalizar `AcaoReativaView` agora
- Premissa de um personagem ativo por jogador por campanha

**Adiado explicitamente, com gatilho de revisão já registrado (não é uma lacuna, é uma decisão consciente de adiar):**
- Comércio a nível de personagem puro (Opção B de K2) — só reavaliar se a premissa da Decisão 8 mudar (demanda real por múltiplos personagens ativos comerciando entre si).
- Mercado dinâmico de recompra (Modelo D de K4) — só depois de B+C rodarem e gerarem dados reais de uso.
- Fechar a validação de `dono_usuario_id` nos endpoints internos de personagem (P12) — só necessário se/quando o comércio a nível de personagem (acima) for reaberto.
- Extração de `AcaoReativaView` — só depois de um segundo caso de uso concreto (fuga/perseguição) rodar em produção.
- Revisão de `/resetar_tudo` escrever direto nas tabelas da plataforma (P7) — não foi pauta desta rodada de decisões; segue como estava no plano original (não entra em B1, revisar só se B6 mexer em barramento de eventos por outro motivo).

**Continua sendo pergunta futura, sem gatilho definido ainda (não é uma decisão pendente de B3 — é um detalhe de implementação a resolver durante a B6, sinalizado para não ser esquecido):**
- A lista exata de quais tipos de evento do Jornalista usam redação assistida por IA vs. permanecem 100% manuais — a Decisão 5 aprovou o **mecanismo** (configurável por tipo), não a lista em si.

### Verificação de contradições

Nenhuma contradição real foi encontrada entre as decisões aprovadas e o restante do plano. Um ponto exigiu precisão adicional para não *parecer* contraditório, já incorporado ao texto: a regra de "propriedade econômica" (Decisão 2) fala de recursos econômicos movidos pelo comércio (moedas e itens de inventário), não nega que `saldos_personagem`/`inventario_personagem` existam ou sejam usados por outros fluxos já em produção (saque manual cofre→personagem) — essa distinção está agora explícita na Parte 3, logo após K2, para qualquer implementação futura não confundir as duas coisas.

### Sinalização — nenhuma decisão nova foi inventada para preencher lacuna

Conforme pedido, nenhuma decisão arbitrária foi criada. O único item sinalizado acima ("lista exata de tipos de evento com IA") não é uma decisão de arquitetura pendente — é um parâmetro de configuração a preencher durante a implementação da B6, coberto pelo mecanismo já aprovado na Decisão 5. Se, ao planejar a B6 em detalhe, surgir alguma decisão de arquitetura genuinamente nova (não coberta por nenhuma das 8 acima), ela será trazida para aprovação separadamente, e não presumida.
