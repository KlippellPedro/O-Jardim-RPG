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

### Loot das criaturas

A tabela de loot de cada criatura mora em `data/bestiario/loot-criaturas.json`,
fora do catálogo público e fora do bundle (a fronteira em
`tools/browser-content-boundary.ts` barra o arquivo). Só o servidor lê, por
[loot_criaturas.py](../../plataforma/core/loot_criaturas.py), e o pacote da
Discloud leva `data/bestiario` junto.

- Criatura adicionada pelo Bestiário grava `sessao_participantes.monstro_id`;
  o loot rolado fica em `sessao_participantes.loot` (migração 47). Os dois só
  aparecem no estado de quem comanda a mesa.
- `GET /sessao/bestiario/loot/{monstro_id}` mostra a tabela ao Mestre;
  `POST /sessao/{id}/participantes/{pid}/loot` rola cada linha (d100 contra a
  chance, no servidor) e `.../loot/entregar` manda cada linha para um
  personagem. Item entra por `conceder_itens_do_catalogo` (o mesmo miolo da
  concessão da Loja, que aceita item fora do balcão); moeda entra por
  `creditar_carteira`, com lançamento `sessao.loot` no extrato cuja chave é a
  própria linha, então nada sai duas vezes. Rolar de novo só vale enquanto
  nada foi entregue.

### Troca de itens entre jogadores

As regras de movimento ficam em [troca.py](../../plataforma/core/troca.py)
(`travar_par`, `mover_item`, `mover_moeda`), usadas por três rotas:

- `POST /personagens/{id}/inventario/{item_id}/enviar` e
  `POST /personagens/{id}/carteira/enviar` mandam item ou moeda direto para
  outro personagem ativo da campanha (dono da ficha ou Mestre), com
  idempotência em `comandos_economia` e lançamento nas duas pontas do extrato.
- `/trocas` ([trades.py](../../plataforma/routers/trades.py)) é a troca com
  aceite: a proposta guarda oferta e pedido (itens e moedas) em
  `propostas_troca` (migração 48) e nada muda de mão até o outro lado aceitar.
  O aceite trava os dois personagens e move tudo numa transação; se um lado
  já não tem o que prometeu, nada acontece e a proposta segue aberta. Só quem
  recebe aceita ou recusa; só quem propôs cancela. Até 10 abertas por
  personagem.

O item chega desequipado. Não viajam: Aliado, Base e veículo completo (a outra
metade mora fora do inventário), item modificado pela metade da pilha e item
que colidiria com outro diferente de mesmo `item_id`. `GET
/personagens/{id}/destinos-de-envio` lista só nome e jogador, e `GET
/trocas/itens/{alvo}` mostra só nome e quantidade dos itens do outro: a
carteira e o resto da ficha continuam fechados.

### Deidades no Bestiário da Sessão

As onze fichas das Deidades vivem em `data/bestiario/deidades-v1.json`, lido só
por [deidades.py](../../plataforma/core/deidades.py). `GET /sessao/bestiario`
(que só quem comanda a mesa acessa) acrescenta as fichas ao fim da lista, com
`categoria: "Deidade"` e ids `deidade-<nome>`; o seletor mostra uma aba
"Deidades" só quando elas vêm na resposta. Cada ficha entra com os números fora
do Domínio (VD 500, ou 400 para A.X.I.S) e o Mestre leva ao Domínio com "Escalar para outro VD" (1000, ou 800).
O arquivo não é importável pelo navegador (a fronteira de conteúdo o barra) e o
campo Estado cita o que a mesa só descobre pela história. Testes:
[test_deidades_e_ids.py](../../plataforma/tests/test_deidades_e_ids.py) e
`test_deidades_so_chegam_ao_mestre_e_entram_na_cena` em test_loot_e_troca.py.

### Ids das criaturas lendárias

A migração 50 levou os ids antigos das 28 criaturas de VD 45 em diante para os
novos (`dragao-primordial` virou `anzhur`, `leviata` virou `vaelthor` e assim por
diante; o mapa está em `IDS_ANTIGOS_DAS_CRIATURAS`, em `core/schema.py`) em
`sessao_participantes`, `loot_campanha`, `inventario_personagem`, cofre,
publicações do catálogo e ajustes do Mestre no Bestiário do Mundo
(`campanha_registros_universais`, seção `bestiario`). O Banqueiro migra o `inventario` dele pelo mesmo mapa.
Quem estava com uma criatura dessas em cena continua com o saque dela.

### Loot ajustado por campanha

`PUT /sessao/bestiario/loot/{monstro_id}?campanha_id=` grava em `loot_campanha`
(migração 48) uma tabela que vale só naquela campanha; `DELETE` volta para a
oficial. `tabela_efetiva` em `loot_criaturas.py` decide qual vale na hora de
mostrar e de rolar. A tabela oficial do arquivo nunca é tocada.

A criatura sob medida (id `sob-medida-<vd>-<papel>-<arquétipo>`) não tem tabela
no arquivo: `tabela_sob_medida` monta uma com moedas pela faixa de VD, materiais
à venda da raridade do VD (preferindo os que combinam com o arquétipo) e mais
linhas quanto mais forte o papel. A semente é o próprio id, então a mesma
criatura mostra e rola sempre a mesma tabela.

### Aflição pela Sessão

`POST /sessao/{id}/participantes/{pid}/aflicoes` deixa o Mestre aplicar, mudar
de estágio ou tirar uma aflição da ficha de quem está em cena
(`ficha.aflicoesAtivas`). O catálogo de aflições mora no site; o servidor só
guarda id e estágio, e soma o Cansaço que o site contou para os estágios
atravessados ("Ganhe 1 Cansaço."), respeitando o teto de 6. A ficha do jogador
faz a mesma soma quando o estágio sobe por teste de intervalo ou exposição.

### Aflições na ficha

`ficha.aflicoesAtivas` guarda aflição e estágio; a lógica fica em
[aflicoesFichaService.ts](../../src/services/aflicoesFichaService.ts). O teste de
Fortitude é rolado em `/registros/rolagem` (com DT, então o servidor devolve o
grau) e a ficha aplica a progressão da regra. O bônus sai de
[testePericiaService.ts](../../src/services/testePericiaService.ts), a mesma
conta da aba Perícias. A Sessão só exibe: `_montar_estado` lê as aflições da
ficha do personagem com a mesma visibilidade das condições.

Testes: [test_loot_e_troca.py](../../plataforma/tests/test_loot_e_troca.py),
[lootCriaturas.test.ts](../../tests/frontend/lootCriaturas.test.ts) e
[aflicoesFicha.test.ts](../../tests/frontend/aflicoesFicha.test.ts).

## Níveis além do 60

Contrato entre site e servidor para o nível total sem teto. As decisões de
regra estão em [Balanceamento](BALANCEAMENTO.md#níveis-além-do-60-2026-09-29).

- **Dados compartilhados.** [progressao-niveis.json](../../data/ficha/progressao-niveis.json)
  (XP, Legado, atributo, item especial, graus de perícia, patamares, teto de
  classe, VD máximo e XP por VD) e [maestria-classe.json](../../data/ficha/maestria-classe.json). O
  site e a plataforma são pacotes separados, então cada lado tem seu módulo
  (`progressaoNiveis.ts` e `progressao_niveis.py`; `maestriaClasse.ts` e
  `maestria_classe.py`) e um teste com os mesmos valores. `data/ficha/` já vai
  no ZIP da plataforma.
- **VD igual ao nível do grupo.** `sessao_participantes.vd` e o `vd` de cada
  monstro do catálogo guardam o nível que a criatura desafia sozinha (1 a
  `VD_MAXIMO`). A migração 46 converte as cenas antigas (VD 1 a 10 vira
  3, 8, ..., 48) e roda uma única vez; o catálogo vem do reseed no restart da
  API. `xp_por_vd` (`core/progressao_niveis.py`, espelhado em `xpPorVd`) é um
  quinto do custo do nível de mesmo número.
- **Famílias do Bestiário.** `data/bestiario/familias-v1.json` declara as 11
  famílias e os 13 únicos (o site importa este arquivo);
  `familias-propostas-v1.json` guarda os estágios novos (os 9 primeiros foram
  aprovados e aplicados em 2026-09-30; proposta nova entra por aqui) e nunca
  pode ser importado pelo site (há teste). `npm run check:familias`
  confere se o catálogo traz `familia`, `estagio`, `papel` e `unico` em cada
  ficha; `npm run bestiario:familias -- --metadados` grava esses campos (só
  metadado) e `-- --novos` grava os estágios propostos, que só entram depois da
  revisão de texto e nunca sobrescrevem ficha escrita à mão. Depois de `--novos`
  rode `npm run precos:normalizar`, `npm run audit:balance` e
  `npm run generate:editorial-rules`. `/bestiario` devolve `familia`, `estagio`,
  `papel` e `unico`.
- **Validação da ficha continua sendo alerta.** `validar_regras_ficha` só devolve
  erro que vira "Alerta de Regras" para o Mestre quando o jogador salva fora do
  padrão; Mestre e assistente nem passam por ela. Acima do nível total 60 as
  regras de "duas comuns + uma especial" e da ordem de multiclasse deixam de ser
  conferidas, e uma classe acima do 20 deixou de ser erro. Legados, aumentos de
  atributo e graus de perícia seguem os ritmos do JSON. Em compensação, `PUT
  /personagens/{id}` avisa o Mestre e o assistente quando o nível total de um
  jogador entra num patamar novo (`patamar_novo`, `core/progressao_niveis.py`;
  títulos "Personagem passou do nível padrão" e "Personagem entrou num patamar
  novo"), e o teste de banco está em `test_niveis_altos_banco.py`.
- **Limite de item especial.** `special_item_use_limit` usa o mesmo ritmo do
  aumento de atributo e o nível real de cada classe (antes `characters.py` cortava
  cada uma em 20). A trava de ativação (HTTP 422) é anterior e continua só para
  novas ativações acima do limite.
- **Conquistas.** A métrica `classe_max` (maior nível numa classe só) e as
  Conquistas de nível 30 a 500 e de classe 20 a 50 estão em
  [conquistas.py](../../plataforma/core/conquistas.py). Todas as desbloqueadas
  ficam gravadas, mas a comemoração é uma só por métrica (a maior). Um teste
  garante que cada patamar do JSON tem sua Conquista. O site espera 1,8 s antes
  de consultar depois de uma mudança de nível, para o autosave chegar primeiro.
- **Voz do Grande Sábio.** `tools/gerar-voz-sabio.py` lê o mesmo JSON de níveis
  (falas "Nível N alcançado" até o 200 e nos patamares, "Classe no nível N" do 21
  ao 50) e [falasSubida.json](../../src/pages/Ficha/components/falasSubida.json).
  Um teste confere que toda frase do painel tem áudio gravado. Regravar exige
  `pip install edge-tts` e internet; o script só gera o que falta.

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

## Convites da plataforma

A aba **Convites** do Painel do Criador (`ConvitesPlataformaPanel`) usa
`/admin/convites`: gera convite com validade, número de contas e uma nota de
para quem é (migração 49, coluna `nota`), mostra o código e um link
`/cadastro?convite=...` uma única vez (depois só existe o hash), lista os
ativos ou, com `todos=true`, também os usados, vencidos e revogados dos
últimos 30 dias, e revoga. O convite só cria conta; entrar numa mesa continua
sendo o convite de campanha que o Mestre gera. A tela de cadastro lê o código
do link. Testes: [test_convites_plataforma.py](../../plataforma/tests/test_convites_plataforma.py).

<a id="evidencia-de-validacao-e-limites"></a>

## Evidência de validação e limites

- O relatório E2E de agosto registrou execução com PostgreSQL descartável e
  captura de eventos. Isso supera a limitação dos relatórios intermediários
  que só tinham testes isolados; não comprova cada navegador ou ambiente atual.
- Na correção de setembro foram registrados 507 testes do backend aprovados
  (165 pulados por falta de PostgreSQL) e 425 de frontend/segurança. Esses
  números são daquela execução. O fechamento de **3 de outubro de 2026**, com
  Postgres descartável em Docker, registrou **998 testes da plataforma
  aprovados** (974 subtestes), **851 testes de frontend** e `npm run
  test:security` com build e fronteira de conteúdo aprovados (4 de 4), além de
  1.225 entradas do catálogo carregadas pelo Banqueiro sem erro.
- A API e o banco de produção não foram revalidados para consolidar estes
  documentos. Testes novos de integração continuam exigindo ambiente de teste.

Para a próxima mudança, executar as verificações do
[guia de manutenção](../GUIA_MANUTENCAO.md) e as suítes do domínio alterado.
Pendências de preço e de regra pertencem a [Balanceamento](BALANCEAMENTO.md);
limitações de navegador, hardware e jornada pertencem a [Frontend](FRONTEND.md).

Limites conhecidos do que foi entregue em outubro: a troca com aceite e o saque foram
exercitados no navegador (desktop e 375 px) contra banco descartável, não em
produção; e as migrações 46 a 49 só rodam em produção quando a API sobe com o
código novo.
