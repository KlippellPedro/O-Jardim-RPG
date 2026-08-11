# Correção da Integração de Modificações + Validação E2E — 2026-08

Continuação de [implementacao-final-pos-validacao-2026-08.md](implementacao-final-pos-validacao-2026-08.md), que fechou a etapa anterior registrando duas pendências técnicas reais: (1) o mismatch entre `aplicacao` (campo real do catálogo) e `categorias_alvo`/`tipos_alvo_permitidos` (campos que a checagem de compatibilidade lia mas que nenhuma das 461 entradas do catálogo populava), e (2) a falta de testes E2E rodados de fato contra um banco Postgres real (os anteriores validavam lógica isolada, não a cadeia HTTP → banco → SSE).

## 1. Correções realizadas

- **`plataforma/routers/shop.py`** — adicionada uma segunda camada de checagem de compatibilidade, ativada pelo campo real `aplicacao` do catálogo (a checagem antiga por `categorias_alvo`/`tipos_alvo_permitidos` foi mantida intacta, já que ela nunca dispara com dado real e não faz mal nenhum continuar existindo). A nova checagem roda depois da validação de `pre_requisitos` e antes das checagens de slots/exclusividade, como uma camada independente.
- **`plataforma/tests/test_modificacoes_loja.py`** — 8 testes novos usando o catálogo real (`data/loja/catalogo.json`) em vez de `conteudo` inventado à mão: matriz de compatibilidade (arma→arma, arma→armadura, armadura→armadura, armadura→arma, escudo→armadura, escudo→arma, geral→qualquer categoria) mais o teste combinado de pré-requisito+aplicação (seção 3). Também um helper `_dar_saldo` para financiar os testes em Lunaris, já que os itens reais de modificação custam Lunaris e não Solares.
- **`plataforma/tests/test_modificacao_compatibilidade_catalogo.py`** (novo arquivo, sem banco) — valida as 51 modificações reais do catálogo contra o modelo de compatibilidade, detectando drift entre `shop.py` e o catálogo sem precisar de Postgres.
- **`plataforma/tests/test_mana_sessao_e2e.py`** (novo arquivo, com banco real) — 9 testes cobrindo a cadeia completa de Mana em sessão contra Postgres de verdade.

Nenhuma regra de preço, Legado, veículo/propriedade ou balanceamento foi tocada.

## 2. Modelo final de compatibilidade de modificações

A cadeia de validação na compra de uma modificação (`purchase_batch` em `shop.py`) agora tem, nesta ordem: **pré-requisito → compatibilidade `aplicacao` → slots → exclusividade → duplicata**.

`aplicacao` é o único campo que o catálogo real popula (`Armas`, `Armaduras`, `Escudos`, `Itens gerais e mágicos` — 18/12/9/12 modificações, 51 no total). O mapeamento implementado:

| `aplicacao` | Categoria de inventário aceita | Por quê |
|---|---|---|
| Armas | `arma` | único valor de categoria que existe pra armas |
| Armaduras | `armadura` | idem |
| Escudos | `armadura` | `_inventory_category()` não distingue escudo de armadura comum (ambos caem em `armadura`; a distinção só existe no `subtipo` do item, que a tela de compra nunca usou pra filtrar alvo). Diferenciar aqui rejeitaria instalações que a própria tela sempre permitiu — registrado como decisão consciente, não como bug corrigido. |
| Itens gerais e mágicos | (sem restrição) | as 12 modificações dessa aplicação descrevem efeitos genéricos ("Vinculado", "Protetor") sem amarração a arma/armadura específica |
| — | `veiculo` sempre isento | nenhuma das 51 modificações reais declara aplicação pra veículo, mas a tela de compra sempre ofereceu veículo como alvo. **Não há dado suficiente pra decidir se isso é intencional** — mantido isento de propósito, não implementei uma regra nova aqui. Pendência de design registrada, não resolvida. |

A checagem antiga por `categorias_alvo`/`tipos_alvo_permitidos` foi preservada como está (nunca dispara com dado real, só é exercitada pelos testes antigos que constroem `conteudo` manualmente) — não foi substituída por uma estrutura nova, conforme pedido.

## 3. Testes de modificações

| Teste | Cenário | Resultado |
|---|---|---|
| `test_mod_de_arma_real_instala_em_arma` | Arma + mod de Arma | ✅ passa |
| `test_mod_de_arma_real_bloqueia_em_armadura` | Armadura + mod de Arma | ✅ bloqueia (422) |
| `test_mod_de_armadura_real_instala_em_armadura` | Armadura + mod de Armadura | ✅ passa |
| `test_mod_de_armadura_real_bloqueia_em_arma` | Arma + mod de Armadura | ✅ bloqueia (422) |
| `test_mod_de_escudo_real_instala_em_item_categoria_armadura` | Armadura + mod de Escudo | ✅ passa (decisão registrada acima) |
| `test_mod_de_escudo_real_bloqueia_em_arma` | Arma + mod de Escudo | ✅ bloqueia (422) |
| `test_mod_geral_real_instala_em_qualquer_categoria_sem_restricao` | Arma **e** Armadura + mod "Itens gerais e mágicos" | ✅ ambas passam |
| `test_pre_requisito_atendido_nao_ignora_aplicacao_incompativel` | Nível atendido + alvo incompatível | ✅ bloqueia mesmo com pré-requisito ok — prova que as duas camadas são independentes |
| `test_instalar_modificacao_bloqueia_pre_requisito_nao_atendido` / `..._permite_quando_pre_requisito_e_atendido` / `..._mestre_ignora...` | Camada de pré-requisito isolada (já existia da etapa anterior) | ✅ passam |
| `test_todas_as_51_modificacoes_reais_tem_aplicacao_reconhecida` e mais 3 no `test_modificacao_compatibilidade_catalogo.py` | Validação estática do catálogo | ✅ 4/4 passam |

Todos os 20 testes de `test_modificacoes_loja.py` + 4 de `test_modificacao_pre_requisitos.py` + 4 de `test_modificacao_compatibilidade_catalogo.py` = **28 testes de modificação**, todos passando contra o Postgres de teste real.

## 4. Testes E2E de Mana

Novo arquivo `test_mana_sessao_e2e.py`, rodado contra Postgres real (schema isolado por teste), exercitando a rota HTTP `registrar_uso` de ponta a ponta — não só `_descontar_mana_na_sessao` isolada (essa parte já estava coberta por `test_mana_sessao.py`, mantido como está).

| # | Caso | Resultado |
|---|---|---|
| 1 | Uso normal desconta Mana e publica `participante_atualizado` com a versão correta | ✅ — versão do evento SSE conferida contra `sessoes_mesa.versao` no banco |
| 2 | Mana insuficiente nunca bloqueia, zera em vez de negativo | ✅ |
| 3 | Custo zero não desconta nem publica `participante_atualizado` | ✅ |
| 4 | Usos múltiplos acumulam o desconto em sequência | ✅ |
| 5 | Edição manual do mestre no HUD sincroniza `ficha.status.manaAtual` | ✅ |
| 6 | Recuperação de Mana pelo mestre (edição pra cima) soma e sincroniza | ✅ |
| 7 | Personagem fora da cena (sem `sessao_participantes`) não quebra nem desconta | ✅ |
| 8 | Sem sessão ativa, registra o uso com `sessao_id` nulo, sem erro | ✅ |
| 9 | Concorrência: 10 usos simultâneos via threads, `FOR UPDATE` evita desconto perdido | ✅ — 100 Mana inicial, 10× custo 1, resultado final exatamente 90 |

9/9 sub-casos pedidos passam. O evento `participante_atualizado` foi verificado carregando a versão nova real (capturado via `live_session.assinar` antes da chamada, lido da fila depois).

## 5. Testes E2E de loja

Cobertos pela seção 3 (compra de modificação) mais os testes pré-existentes de `test_modificacoes_loja.py` (slots, exclusividade, duplicata, venda, desinstalação) — todos rodados contra o mesmo Postgres real, não mais só contra lógica isolada. 20 testes desse arquivo, todos passando.

## 6. Validação do catálogo

`test_modificacao_compatibilidade_catalogo.py` varre as 51 modificações reais e confirma:
- Todas têm `aplicacao` reconhecida (nenhuma desconhecida/não mapeada).
- Nenhuma das 4 aplicações ficou sem nenhuma modificação (ou seja, o mapeamento não rejeita implicitamente uma categoria inteira por falta de dado).
- As categorias que `_ALVOS_POR_APLICACAO` promete (`arma`/`armadura`) são exatamente as que `_inventory_category()` de fato produz.

Nenhum dado incompatível, não mapeado ou impossível foi encontrado no catálogo atual.

## 7. Regressões

Suíte completa, contra o mesmo Postgres de teste real (Docker, porta 5434, nunca o banco de produção):

| Suíte | Resultado |
|---|---|
| plataforma (`pytest`) | 317 passed, **1 failed** (ver abaixo), 33 subtests passed |
| bots/banqueiro | 201 passed |
| bots/jornalista | 107 passed |
| bots/Gerente | 19 passed |
| TypeScript (`tsc -b --force`) | sem erros |
| frontend (`npm run test:frontend`, node test runner) | 194 passed (após 2 correções, ver abaixo) |

**A 1 falha da plataforma** (`test_create_character_bloqueia_raca_fora_da_arvore`) é **pré-existente e não relacionada** a esta etapa: investigação mostrou que `routers/characters.py::create_character` já não bloqueia mais criação de ficha fora da Árvore com HTTPException 422 — uma mudança não commitada de uma etapa anterior trocou o bloqueio por uma notificação ao mestre (`"Alerta de Regras na Criação"`), permitindo a criação seguir mesmo com a regra violada. O teste antigo ainda espera o comportamento de bloqueio duro. Não toquei nem no comportamento nem no teste — é uma decisão de design de uma etapa anterior que precisa ser resolvida separadamente (reverter para bloqueio duro, ou atualizar o teste pra refletir o "avisa mas permite"). Fora do escopo desta tarefa (que era só `aplicacao`/compatibilidade + E2E).

**As 2 falhas do frontend**, encontradas ao rodar a suíte pela primeira vez nesta etapa, eram igualmente pré-existentes (mudanças não commitadas de etapas anteriores, não desta etapa) e **foram corrigidas** por serem puramente mecânicas — sem decisão de design envolvida:
- `equipmentEffects.test.ts` referenciava o campo antigo `vantagensPericias`, renomeado para `vantagens` em `equipamentoService.ts` numa etapa anterior (o rename passou a cobrir efeitos de poderes/habilidades, não só perícias de equipamento). Corrigido o teste pra usar o nome atual.
- `lojaCommands.test.ts` esperava que itens do payload de compra não tivessem a chave `alvo_item_id` quando ausente; `lojaApi.ts::normalizeItems` (adicionado numa etapa anterior pro fluxo de compra de modificação) sempre inclui a chave, mesmo como `undefined` — que `JSON.stringify` descarta no payload real de rede, mas que `assert.deepEqual` enxerga como diferente de "chave ausente". Corrigido o teste pra refletir a forma real do objeto.

Nenhuma alteração de comportamento de produção foi feita para essas duas correções — só os testes foram ajustados para bater com código já existente.

## 8. Pendências

- **`test_create_character_bloqueia_raca_fora_da_arvore`** (seção 7): decisão de design pendente sobre bloqueio duro vs. notificação — não é desta etapa, precisa de instrução explícita sobre qual comportamento é o pretendido.
- **Alvo "veiculo" isento de checagem de `aplicacao`** (seção 2): nenhuma das 51 modificações reais declara aplicação pra veículo, mas a tela sempre ofereceu veículo como alvo possível. Mantido isento por não haver dado suficiente pra decidir — segue como estava antes desta etapa, não é uma regressão nova.

Nada mais ficou pendente das duas lacunas que motivaram esta etapa.

## 9. Estado do sistema

**Pronto para design/balanceamento.**

A cadeia de modificação (`dados reais → aplicacao/compatibilidade → pré-requisito → slots → exclusividade → compra/instalação`) está provada ponta a ponta contra banco real, incluindo o cenário combinado das duas camadas de validação. A cadeia de Mana (`uso → desconto → banco → sessão → SSE → HUD`) está provada nos 9 sub-casos pedidos, incluindo a verificação explícita da versão do evento `participante_atualizado` e um teste de concorrência real com lock de linha. As duas pendências técnicas que fecharam a etapa anterior estão resolvidas. As duas únicas pendências restantes (bloqueio-vs-notificação na criação de ficha, e o alvo "veículo" isento) são decisões de design de escopo anterior a esta tarefa, não bloqueadores técnicos novos.
