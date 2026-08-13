# Implementação das Decisões de Design e Balanceamento — 2026-08

Fase 2 do prompt mestre de design/balanceamento — implementação das 8 decisões consolidadas em [decisao-design-balanceamento-2026-08.md](decisao-design-balanceamento-2026-08.md) (Fase 1), depois de aprovação explícita das 4 que exigiam escolha de design. Nenhuma alternativa rejeitada foi implementada; nenhuma decisão pendente foi antecipada.

## 1. Decisões tomadas

| ID | Decisão | Escolha | Motivo |
|---|---|---|---|
| 1 | Legados repetíveis (Artista Marcial, Não é Tão Pesado, Rapidinho) | Adicionar `repetivel`/`limite` (2, 3, 2) | Correção objetiva — o texto já publicado descrevia o escalonamento; o dado só não refletia isso. Valores reconferidos linha a linha contra o texto exato de cada Legado. |
| 2 | Legado extra sem característica nomeada | Documentar em 7 das 8 raças pendentes (Humano, Desperto, Auleth, Autômato, Clone, Amálgamo, Bruxa) | O bônus já era real e ativo (lido pela fórmula de vagas); faltava só visibilidade. Escopo ampliado na revalidação: eram 8 raças, não 1 (só Entidade ficou de fora — ver seção 4). |
| 3 | Moeda dos Drops | Corrigir o rótulo em `regras.ts` de "L" para "S"; catálogo não mudou | 21 de 21 `drop-*` já eram Solares no catálogo real, sem exceção — padrão consistente demais pra ser erro de dado; o texto é que nunca foi atualizado. |
| 4 | Manutenção do Terreno Baldio | Documentar como exceção intencional em `bases.ts`; valor do catálogo não mudou | Única propriedade sem estrutura construída (sem `qualidadeQuartos`) — manutenção menor por não ter nada físico a conservar é uma leitura razoável, agora escrita na regra. |
| 5 | Modelo econômico (veículos + câmbio de Fragmentos/Créditos) | **Modelo B — categórico** | Aprovado pelo usuário. Nenhuma fonte de renda automática gera Solares (só Lunaris); armas de ponta exigem `autorizacaoMestre` — preço nunca foi, sozinho, o controle de acesso a esse tier. Veículos, ao contrário, cabem no fluxo normal de Lunaris. |
| 6 | Código de Ética | **Marcos + teto: metade do nível, até +30** | Aprovado pelo usuário. Código de Ética concede dano adicional igual à metade do nível do personagem, arredondado para baixo, até o máximo de +30 — preserva a progressão (identidade do Legado) sem ultrapassar ~75% da média de uma arma lendária. |
| 7 | Cofre vs. Investimentos | **Teto no Cofre (1.000) + risco/recompensa no Investimento (70% +8% / 30% -3%)** | Aprovado pelo usuário. Preserva "Cofre = segurança" pra saldos pequenos/médios e dá ao Investimento uma proposta de risco real em vez de ser estritamente pior em todo cenário. |
| 8 | Orçamento de poder dos Legados (Bala Ágil, Tô ficando bom, Mágico?) | **Elevar pré-requisito pra nível 5** | Aprovado pelo usuário. Menor mudança reversível: adia o acesso ao primeiro marco de Legado em vez de alterar o efeito em si. |

## 2. Alterações realizadas

| Arquivo | Alteração | Motivo |
|---|---|---|
| `data/ficha/legados.json` | `repetivel`+`limite` em `artista-marcial` (2), `nao-e-tao-pesado` (3), `rapidinho` (2) | Decisão 1 |
| `data/ficha/legados.json` | `pre_requisitos: [{"nivel_personagem": 5}]` em `to-ficando-bom`, `bala-agil`, `magico-interrogacao` | Decisão 8 |
| `data/ficha/legados.json` | `descricao` de `codigo-de-etica`: "dano adicional igual ao seu nível" → "metade do seu nível (arredondado para baixo, até um máximo de +30)" | Decisão 6 |
| `data/ficha/racas.json` | Nova característica (`tipo: "aquisicao"`) em Humano ("Versatilidade"), Desperto ("Herança do Retorno"), Auleth ("Origem Distante"), Autômato ("Módulo Adicional"), Clone ("Desvio do Original"), Amálgamo ("Resíduo da Fusão"), Bruxa ("Dádiva do Pacto") | Decisão 2 |
| `data/regras/regras.ts` | Tabela de Drops de Seres do Bestiário: sufixo "L" → "S" em 21 células (as 3 sem valor, marcadas "-", ficaram como estavam) | Decisão 3 |
| `data/regras/regras.ts` | Tabela de Taxas de Câmbio: removidas as linhas de Solares→Fragmentos de Estrela e Créditos Sombrios (nunca implementadas); duas notas novas explicando que o câmbio Lunaris↔Solares não equivale categorias diferentes de item, e que Fragmentos/Créditos não têm câmbio automático | Decisão 5 |
| `data/regras/bases.ts` | `calculoManutencao` ganhou a frase da exceção de terrenos sem estrutura (metade da manutenção do fator do patamar) | Decisão 4 |
| `bots/banqueiro/core/economia.py` | Novo `JUROS_COFRE_TETO = 1000`; `INVESTIMENTO_TAXA_NORMAL` (fixa) virou `INVESTIMENTO_CHANCE_GANHO`/`INVESTIMENTO_TAXA_GANHO`/`INVESTIMENTO_TAXA_PERDA`; `valor_maturado_investimento()` sorteia entre ganho e perda fora de crise (crise continua determinística) | Decisão 7 |
| `bots/banqueiro/core/db.py` | `aplicar_juros_cofre(guild_id, taxa, teto=None, sem_teto=False)` — por padrão (`sem_teto=False`), SQL usa `LEAST(saldo, teto)` no cálculo do juro, com `teto` padrão de `JUROS_COFRE_TETO=1000`; com `sem_teto=True`, calcula sobre o saldo integral, sem `LEAST()` | Decisão 7 |
| `bots/banqueiro/cogs/admin.py` | `/juros_cofre` (bônus manual do mestre) passa a chamar `aplicar_juros_cofre(..., sem_teto=True)` — isento do teto de 1.000, porque é intervenção discricionária do mestre, não rendimento passivo | Decisão 7 |
| `bots/banqueiro/cogs/investimentos.py` | Mensagem de `/investir` mostra as duas chances (bom/ruim) em vez de um percentual fixo garantido | Decisão 7 (consequência de UX) |
| `plataforma/tests/test_character_rules.py` | 4 testes novos: repetição de Legado com/sem pré-requisito, pré-requisito elevado nos 3 outliers, guarda de conteúdo do texto de Código de Ética | Cobertura das decisões 1, 6, 8 |
| `bots/banqueiro/tests/test_economia.py` | 4 testes novos: teto de juros do Cofre (com e sem teto explícito, e com o padrão), isenção do teto com `sem_teto=True`, variância de `valor_maturado_investimento` (ganho/perda/fronteira) e crise determinística | Cobertura da decisão 7 |
| `data/ficha/legados-regras-v1.json`, `data/regras/regras-publicas-v1.md` | Regenerados via `npm run generate:rules` a partir das fontes acima | Propagação automática — não editados à mão |

Nenhum preço de item, nenhuma regra de veículo/propriedade fora do já listado, e nenhum dos outros 29 Legados (dos 36 originais) ou 6 Legados novos além dos 7 já listados acima foram tocados.

## 3. Testes

| Suíte | Resultado |
|---|---|
| Plataforma | 321/322 (1 falha pré-existente, não relacionada — ver seção 4) |
| Banqueiro | 204/204 |
| Jornalista | 107/107 |
| Gerente | 19/19 |
| Frontend (node test runner) | 194/194 |
| TypeScript (`tsc -b --force`) | OK |
| `npm run check:rules-source` | OK (após regenerar) |

Baseline anterior (antes desta etapa): plataforma 317/318, banqueiro 201/201, jornalista 107/107, Gerente 19/19, frontend 194/194. O aumento de 4 (plataforma) e 3 (banqueiro) corresponde exatamente aos testes novos escritos para as decisões 1, 6, 7 e 8 — nenhuma suíte perdeu nem ganhou testes por acidente.

## 4. Decisões que NÃO foram implementadas

- **Entidade (raça) não recebeu a característica de Legado extra.** A raça está marcada `indisponivel: true` com motivo explícito ("exige um pacote próprio mais complexo antes de poder ser escolhida") e não tem nenhum array `caracteristicas` ainda — criar uma característica nova pra uma raça deliberadamente incompleta seria inventar conteúdo além do escopo desta correção. Fica pendente pra quando a raça for desenvolvida.
- **`comp-marco-de-pedra`** (o único material ritualístico raro precificado em Lunaris, contra o padrão dos outros 5 itens raro/épico do mesmo subtipo, que usam Solares) não foi alterado — mudar esse preço individual seria uma decisão de balanceamento fora do escopo da correção de moeda dos Drops (que era sobre o rótulo do texto, não sobre outliers de preço dentro do catálogo).
- **Nenhuma configuração por servidor foi adicionada para `JUROS_COFRE_TETO`.** `JUROS_COFRE_TAXA` já é configurável por guild (`/seteconomia`, `set_economia_config`); o novo teto ficou como constante global, não replicado nesse mecanismo, pra manter a mudança pequena e reversível. Se for necessário calibrar por mesa, isso pode ser adicionado depois seguindo o mesmo padrão de `juros_cofre_taxa_percent`.

Nada do que foi aprovado ficou pendente.

## 5. Impacto de balanceamento

- **Legados**: os 3 Legados que descreviam escolha repetida agora funcionam como o texto sempre disse. Os 3 outliers sem pré-requisito (Bala Ágil, Tô ficando bom, Mágico?) agora exigem o primeiro marco (nível 5) como qualquer outro Legado de força equivalente — deixam de ser "auto-inclusão" desde a criação do personagem. Código de Ética deixa de escalar sem limite: concede dano adicional igual à metade do nível do personagem, arredondado para baixo, até o máximo de +30 (no nível 60, antes seria +60), o que o mantém abaixo de uma arma lendária inteira (média 39,8) em vez de rivalizar com uma relíquia (66,4). 7 das 8 raças pendentes ganharam visibilidade de um bônus que já era real (Entidade ficou de fora — ver seção 4). Nenhum outro Legado do catálogo foi tocado — os Legados "de sabor" (Leitura Labial, Selvagem, etc.) continuam existindo lado a lado com os de combate, como já era.
- **Economia**: o câmbio automático Lunaris↔Solar continua existindo exatamente como antes (100:1, 2% de taxa) — só passou a vir acompanhado de uma nota deixando claro que ele não equivale categorias de item entre si. Fragmentos de Estrela e Créditos Sombrios deixam de prometer um câmbio que nunca funcionou. O teto de 1.000 vale somente para os juros automáticos do Cofre (2%/dia, quem tem saldo modesto não sente diferença nenhuma; acima de 1.000 guardado por moeda, o excedente para de compor automaticamente) — o bônus manual `/juros_cofre` do mestre é isento do teto e continua calculando sobre o saldo integral, por ser intervenção discricionária, não rendimento passivo. Investimento deixou de ser uma opção estritamente pior: agora tem 70% de chance de vencer com +8% e 30% de chance de vencer com -3%, um risco real que o Cofre nunca teve.
- **Veículos e propriedades**: nenhum preço mudou. A separação de economias (veículos/armas lendárias em trilhas paralelas, não comparáveis por câmbio) e a exceção de manutenção do Terreno Baldio agora estão escritas nas regras, em vez de serem inferidas.
- **Quais sistemas agora têm escolhas reais que antes não tinham**: Investimento passa a ser uma alternativa genuína ao Cofre para quem aceita risco por um retorno maior (antes era estritamente pior em todo cenário simulado). O primeiro marco de Legado (nível 5) volta a ser uma escolha real entre várias opções de força parecida, em vez de ter 3 candidatos "óbvios" disponíveis desde o nível 1 sem concorrência de pré-requisito.
- **Riscos que permanecem**: o teto de 1.000 no Cofre e a variância 70/30 no Investimento são calibrações razoáveis mas não testadas em mesa real — como qualquer número de balanceamento, podem precisar de ajuste fino depois de uso em jogo. O modelo econômico categórico (decisão 5) depende de nenhuma fonte de Solares automática aparecer no futuro sem essa decisão ser revisitada — se isso mudar, a documentação nova precisaria ser reaberta. A ambiguidade sobre "ataques naturais de monstro contam como desarmado" para Código de Ética, levantada na etapa de propostas, **não foi resolvida nesta etapa** (não fazia parte das 4 perguntas aprovadas) — fica como uma pendência de regra separada.

## 6. O sistema está mecanicamente coerente com as decisões tomadas?

**Sim.** As 8 decisões aprovadas estão implementadas exatamente como decididas — nenhuma alternativa rejeitada foi aplicada, nenhuma decisão pendente foi antecipada. A cadeia de cada mudança foi verificada de ponta a ponta, não só testada isoladamente: os Legados repetíveis e os pré-requisitos elevados foram provados contra o validador real de criação/edição de ficha (`character_summary.py`), não só contra o JSON; o teto do Cofre e a variância do Investimento foram provados contra Postgres real, não só lógica isolada; a regeneração de `regras.ts` foi conferida linha a linha no markdown público gerado, não só assumida. A única falha daquela execução era a divergência histórica de contrato em `test_create_character_bloqueia_raca_fora_da_arvore`. A decisão final de produto de 13 de agosto de 2026 definiu que a criação fora da Árvore é permitida e comunicada ao Mestre, sem HTTP 422; o teste de integração foi atualizado para comprovar esse comportamento.
