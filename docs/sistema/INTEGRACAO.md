# Integração e segurança

Consolidado em **7 de setembro de 2026** a partir da sequência de auditoria,
correção, validação e E2E de agosto, acrescida do fechamento de segurança de
setembro. [Relatórios originais](../HISTORICO.md#integracao).

Um problema registrado na descoberta não continua aberto quando uma etapa
posterior o corrigiu. A tabela abaixo preserva os IDs da auditoria inicial e
seu encaminhamento, sem apresentar o relatório inicial como diagnóstico atual.

## Fechamento dos achados de integração

| Achado original | Encaminhamento consolidado |
| --- | --- |
| 1 — Classes, Raças, Legados e Perícias ausentes no livro | O gerador passou a usar os catálogos reais. Para geração e PDFs atuais, seguir o guia de manutenção. |
| 2 — Tabelas incompletas de condições/crises | O livro passou a consumir os catálogos oficiais, em vez de manter outra tabela manual. |
| 3 — Nota dizendo que habilidades não produzem efeito | Diagnóstico textual corrigido para distinguir progressão publicada de recursos provisórios. |
| 4 — Artesão e Ofício | Bônus ligado ao título normalizado da perícia personalizada. “Ofício de Ferreiro” não deve ser presumido equivalente a “Ofício” sem conferir a regra de correspondência. |
| 5 — Cartista Arcano sem magia inicial | Progressão antecipada no catálogo. A fonte atual é `classes.json`, não os números do relatório de descoberta. |
| 6 — Requisitos de compra | Infrações passaram a ser devolvidas ao comprador e comunicadas na interface. Bônus condicional de classe não é automaticamente uma proibição de compra. |
| 7 — Itens com efeitos vagos | Textos de itens foram ajustados. Texto publicado e efeito automatizado são estados distintos; conferir o consumidor antes de afirmar automação. |
| 8–9 — Mana e condições | Sincronização ficha/sessão e evento de atualização do participante corrigidos; seletor oficial incorporado à sessão. Detalhes abaixo. |
| 10 — Cópias de tiers de Cofre | Plataforma, Banqueiro e Jornalista passaram a consumir o JSON compartilhado. A validação ampliou o escopo ao descobrir a terceira cópia. |
| 11 — Modificações | Tipagem, pré-requisitos e compatibilidade por `aplicacao` conectados à compra. O relatório intermediário que dizia “compatibilidade desconectada” foi superado pelo E2E posterior. |
| 12 — Compra e ativação de bens | Fluxo em duas etapas preservado e comunicado. Automatizar continua sendo mudança de produto. |
| 13 — Seis Legados novos | A marcação de procedência foi corrigida. O exame posterior reconheceu limitadores já existentes; os seis são oficiais e não têm pendência de revisão em aberto (ver [Balanceamento](BALANCEAMENTO.md#decisoes-de-legados)). |
| 14 — Grafias de raridade | Normalização aplicada ao catálogo. Valores e enum atuais devem ser conferidos nas fontes. |
| 15 — Preços destoantes | Os exemplos antigos mudaram depois da auditoria; ver Balanceamento, sem reaplicar os preços sugeridos naquela etapa. |
| 16 — `limites.py` ambíguo | Módulo de autenticação renomeado para `rate_limit_auth.py`. Não confundir rate limit de login com limite de uso de poder. |
| 17 — Sistemas sem gancho de classe | Oportunidade de conteúdo, não defeito técnico confirmado. |
| 18 — Sedenta e Sangramento | Texto de Sedenta passou a referenciar a condição oficial. |
| 19 — Atordoado e Inconsciente | Distinção de uso documentada; não implica novas automações para todos os efeitos. |

Esses encaminhamentos são o fechamento documental de agosto. Não representam
uma nova execução integral de todos os fluxos em produção em setembro.

## Modificações de equipamento

A implementação atual de [shop.py](../../plataforma/routers/shop.py) valida
pré-requisitos, compatibilidade, slots, exclusividade e duplicação antes de
concluir a instalação. O catálogo real preenche `aplicacao`; os campos
opcionais `categorias_alvo`/`tipos_alvo_permitidos` não substituem essa checagem.

| `aplicacao` | Tratamento atual |
| --- | --- |
| Armas | Aceita categoria de inventário `arma`. |
| Armaduras | Aceita categoria `armadura`. |
| Escudos | Também aceita categoria `armadura`; o fluxo não faz essa distinção apenas pelo subtipo. |
| Itens gerais e mágicos | Não recebe restrição por essa tabela de aplicações. As demais validações continuam valendo. |
| Alvo veículo | Isento da checagem por `aplicacao`; não significa isenção das permissões do recurso. |

**Questões de design mantidas:** decidir se escudos precisam de categoria de
alvo própria e quais modificações podem ser aplicadas a veículos. A revisão de
documentos não escolhe essas regras. A isenção atual não deve ser apresentada
como uma validação granular que ainda não existe.

Cobertura de referência:

- [test_modificacoes_loja.py](../../plataforma/tests/test_modificacoes_loja.py): compra/instalação, incompatibilidade, slots, venda e desinstalação.
- [test_modificacao_pre_requisitos.py](../../plataforma/tests/test_modificacao_pre_requisitos.py): requisitos.
- [test_modificacao_compatibilidade_catalogo.py](../../plataforma/tests/test_modificacao_compatibilidade_catalogo.py): integração com o catálogo real.

## Ficha, Mana e sessão

O problema original não era “a ficha nunca desconta Mana”. A ficha já fazia o
desconto; a divergência estava na cópia da sessão e na atualização do HUD.

O fechamento conecta uso, desconto, persistência, versão da sessão e evento
`participante_atualizado`. O E2E posterior registrou casos de custo zero,
Mana insuficiente, usos sucessivos, edição pelo mestre, personagem fora de
cena, ausência de sessão e concorrência. A edição fora da sessão também foi
tratada na jornada do jogador, evitando reabrir PJ-004 como outra pendência.

Fontes: [rolls.py](../../plataforma/routers/rolls.py),
[sessions.py](../../plataforma/routers/sessions.py),
[characters.py](../../plataforma/routers/characters.py),
[test_mana_sessao_e2e.py](../../plataforma/tests/test_mana_sessao_e2e.py) e
[statusService.ts](../../src/services/statusService.ts).
### Estamina e combate intenso

A Estamina segue o mesmo caminho da Mana: `rolls.py` debita o recurso indicado
em `detalhes.recurso` (`mana` ou `estamina`) no participante da sessão, o HUD
do Mestre edita e o valor volta para `ficha.status` (`estaminaAtual`,
`estaminaTemporaria`). O participante ganhou `estamina_atual`,
`estamina_maxima` e `estamina_temporaria` (migração 44); a máxima só entra
quando a ficha já calculou `derivados.estamina`, então ficha antiga fica sem
barra até o dono abri-la.

O Cansaço automático vive em [combate_intenso.py](../../plataforma/core/combate_intenso.py):
`iniciar` fotografa Vida, Mana e Estamina (`combate_marcas`, migração 45), toda
escrita de recurso atualiza o pior ponto, e `encerrar` soma 1 de Cansaço (teto 6)
a quem desceu à metade da Vida, entrou em Morrendo ou gastou metade da Mana ou
da Estamina. Testes: [test_estamina_sessao_e2e.py](../../plataforma/tests/test_estamina_sessao_e2e.py)
e [test_combate_intenso.py](../../plataforma/tests/test_combate_intenso.py).

O catálogo de condições não implica que todos os efeitos tenham execução
automática; a cobertura efetiva continua sendo a implementada nos serviços.

<a id="veiculos-e-propriedades"></a>

## Veículos e propriedades

Comprar um bem e migrá-lo para a entidade jogável da campanha continuam sendo
operações distintas. A etapa intermediária mantém a possibilidade de
transferência como item de inventário. A migração remove esse item e cria a
entidade com seus dados de jogo.

Fontes: [vehicles.py](../../plataforma/routers/vehicles.py) e
[properties.py](../../plataforma/routers/properties.py).
A documentação de agosto recomendou preservar o fluxo; não há motivo para
tratá-lo como bug simplesmente porque a ativação não ocorre na compra.

<a id="criacao-fora-da-arvore"></a>

## Criação fora da Árvore

A decisão de produto registrada em **13 de agosto de 2026** é **permitir e
avisar o Mestre**, não retornar HTTP 422 apenas pela divergência da Árvore.
O teste antigo que esperava bloqueio não é uma falha atual a ser restaurada.
Referência: [test_character_rules.py](../../plataforma/tests/test_character_rules.py).

Essa liberdade na criação não elimina restrições de autorização, disponibilidade
de conteúdo ou acesso a recursos de outra campanha.

<a id="seguranca-de-setembro"></a>

## Segurança de setembro

| Correção | Garantia e fonte |
| --- | --- |
| Isolamento de veículos/propriedades | O recurso é procurado pelo par ID/campanha antes da exceção de permissão de Mestre, Assistente ou Criador. Recurso de outra campanha resulta em 404. |
| Cadastro e Criador | Cadastro cria jogador; `CREATOR_EMAIL` não promove nem dispensa cadastro fechado/convite. Bootstrap usa UUID explícito; provisionamento administrativo está no README da plataforma. |
| Conteúdo reservado no frontend | O build não empacota `corpoMestre`, capítulo reservado nem catálogos completos de lore/contos. Leitura condicionada à campanha vem da API. |
| Mundo e APIs antigas | Publicações são projetadas conforme visibilidade; referências editoriais em conteúdo visível, busca e conhecimento seguem a resolução autorizada. |
| Troca de contexto | Hooks invalidam os documentos carregados ao mudar usuário/campanha/permissão, sem recompor lore ausente com fallback local. |

Fontes: [test_security_boundaries.py](../../plataforma/tests/test_security_boundaries.py),
[test_world_visibility.py](../../plataforma/tests/test_world_visibility.py),
[browserContentBoundary.test.ts](../../tests/frontend/browserContentBoundary.test.ts) e
[README da plataforma](../../plataforma/README.md).
As regras completas de publicação e os arquivos de seed permanecem no
[guia do editor](../EDITOR_CONTEUDO_CAMPANHA.md), sem outra cópia aqui.

<a id="cronica-da-campanha"></a>

## Crônica da campanha

Nova em **21 de setembro de 2026**: um registro coletivo do que o grupo
viveu, escrito à mão pelos jogadores e pelo Mestre — diferente do diário por
personagem (montado sozinho pelo servidor, ver `core/diario.py`) e do
"Anteriormente" da página da campanha (resumo automático das últimas 3
sessões encerradas).

Tabela `cronica_campanha` (migração 43 em
[schema.py](../../plataforma/core/schema.py)). Rotas
`GET/POST/PUT/DELETE /engajamento/{campanha_id}/cronica`
([engajamento.py](../../plataforma/routers/engajamento.py)), no mesmo router
do mural: reaproveita `campaign_access`, `_sessao_recente` (a entrada herda a
sessão ao vivo/recém-encerrada, se houver) e a categoria de aviso do Discord
já existente `"mural"` — não criou categoria nova em
[discord_avisos.py](../../plataforma/core/discord_avisos.py).

Permissões seguem exatamente o padrão do mural: qualquer papel lê, inclusive
`observador`; `observador` não publica (`403`); cada entrada só é
editável/apagável por quem escreveu ou por Mestre/Assistente. Frontend em
[CronicaCampanha.tsx](../../src/pages/Campanha/CronicaCampanha.tsx), exibido
na página da campanha logo abaixo de "Anteriormente".

O papel `observador` em si não é novo — já existia no modelo de campanha
(`membros_campanha.papel`) e já era tratado como leitura completa e sem
comando em toda a Sessão ao Vivo (`campaign_access` em
[dependencies.py](../../plataforma/core/dependencies.py)). O que mudou em
setembro foi só deixar isso visível na interface; ver
[Frontend](FRONTEND.md#avisos-e-consistencia-21-09).

Cobertura:
[test_engajamento_banco.py](../../plataforma/tests/test_engajamento_banco.py)
(27 testes contra PostgreSQL descartável, 4 novos para a crônica).

<a id="evidencia-de-validacao-e-limites"></a>

## Evidência de validação e limites

- O relatório E2E de agosto registrou execução com PostgreSQL descartável e
  captura de eventos. Isso supera a limitação dos relatórios intermediários
  que só tinham testes isolados; não comprova cada navegador ou ambiente atual.
- Na correção de setembro desta tarefa, foram registrados **507 testes do
  backend aprovados**, **456 subtestes aprovados** e **165 testes pulados** por
  dependência de PostgreSQL, além de **425 testes de frontend/segurança
  aprovados** e build aprovado. São resultados daquela execução, não desta
  reorganização documental.
- A API e o banco de produção não foram revalidados para consolidar estes
  documentos. Testes novos de integração continuam exigindo ambiente de teste.

Para a próxima mudança, executar as verificações do
[guia de manutenção](../GUIA_MANUTENCAO.md) e as suítes do domínio alterado.
Pendências de preço e de regra pertencem a [Balanceamento](BALANCEAMENTO.md);
limitações de navegador, hardware e jornada pertencem a [Frontend](FRONTEND.md).
