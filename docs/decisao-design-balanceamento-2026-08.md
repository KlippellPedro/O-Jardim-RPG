# Fase 1 — Decisão e Análise (pré-implementação) — 2026-08

**Nenhum arquivo foi alterado nesta etapa.** Este documento parte de `auditoria-design-balanceamento-2026-08.md` e `propostas-design-balanceamento-2026-08.md`, revalida os achados diretamente contra o estado atual dos arquivos e organiza cada decisão por domínio ("agente"), com situação atual, proposta recomendada, justificativa, impactos e arquivos/testes envolvidos — para aprovação antes de qualquer implementação (Fase 2).

## 0. Revalidação — o que mudou desde os documentos anteriores

- **Legados repetíveis**: texto de `legados.json` reconferido linha a linha. Artista Marcial ("caso escolha uma segunda vez") e Rapidinho ("Escolhendo uma segunda vez, aumenta em 6m adicionais") só descrevem até a 2ª escolha → `limite: 2`. Não é Tão Pesado ("escolhendo uma terceira vez, conta para ambos") descreve até a 3ª → `limite: 3`. **Os valores propostos anteriormente se confirmam exatamente.**
- **Legado adicional do Humano — achado ampliado.** A auditoria original citou só o Humano como caso de bônus não documentado. Reconferindo as 10 raças com `legados_adicionais: 1`, **8 delas não têm nenhuma característica nomeada explicando o bônus** (Humano, Desperto, Auleth, Autômato, Clone, Amálgamo, Bruxa, Entidade) — só Elfo ("Herança Ancestral") e Errante ("Legado de Outra História") documentam. O escopo da correção é maior do que o relatado antes: são até 8 raças a ajustar, não 1 (Entidade está `indisponivel: true`, então de prioridade menor).
- **Moeda dos Drops — achado refinado.** Puxando as 51 entradas `tipo: "drop"` uma a uma: existem dois subtipos internos por prefixo de `id`, não uma mistura aleatória. **Todas as 21 entradas `drop-*`** (partes de criatura — Humano, Vampiro, Goblim, Anão, Golem, Espírito, Gigante, Animália, Sereia/Tritão — exatamente as que a tabela do Bestiário em `regras.ts` rotula "L") **usam Solares, sem nenhuma exceção**. Das **30 entradas `comp-*`** (materiais ritualísticos, categoria que `regras.ts` nem cobre na tabela de "10L"), 24 usam Lunaris e 6 usam Solares — e as 6 em Solares são justamente as de raridade raro/épico (`comp-amostra-elemental`, `comp-vestigio-material`, `comp-nucleo-tecnologico`, `comp-simbolo-pecado`, `comp-simbolo-virtude`), com uma única exceção dentro desse subgrupo (`comp-marco-de-pedra`, raro, mas em Lunaris). Isso muda a leitura do achado: não é uma inconsistência aleatória, é um padrão quase inteiramente coerente (partes de criatura = Solares; materiais comuns = Lunaris; materiais raros = Solares) — o que aponta com mais força pra "o texto de `regras.ts` está desatualizado" do que pra "o catálogo está errado". Ver Agente 2.
- **Terreno Baldio, Código de Ética, Cofre vs. Investimentos, Veículos vs. Solares**: números reconferidos, achados originais confirmados sem alteração.

---

## Agente 1 — Legados

### 1.1 Legados repetíveis

| Campo | Conteúdo |
|---|---|
| Situação atual | `artista-marcial`, `nao-e-tao-pesado`, `rapidinho` sem `limite`/`repetivel` em `data/ficha/legados.json` — validador (`character_summary.py`) bloqueia a 2ª escolha. |
| Proposta recomendada | Adicionar `"repetivel": true, "limite": 2"` a Artista Marcial e Rapidinho; `"repetivel": true, "limite": 3"` a Não é Tão Pesado. |
| Justificativa | O próprio texto já publicado descreve o escalonamento; o dado só não reflete o que o texto promete. Correção objetiva, não é decisão de balanceamento. |
| Impacto mecânico | Nenhuma mudança de poder — só destrava o que o texto sempre disse que era permitido. |
| Impacto econômico | Nenhum (Legados não têm custo monetário). |
| Efeitos colaterais | Nenhum esperado — `_atende_requisito_legado`/lógica de limite em `character_summary.py` já sabe ler esses campos quando presentes (confirmado no código, usado por outros Legados hipotéticos que já tivessem os campos, embora nenhum tivesse até agora). |
| Arquivos alterados | `data/ficha/legados.json` (3 entradas). |
| Testes necessários | Teste novo: personagem escolhe Artista Marcial/Rapidinho 2×, ou Não é Tão Pesado 3×, e a validação de criação/edição de ficha aceita; escolher além do limite continua bloqueando. |

**Status:** correção objetiva — não depende de escolha de design, só de alinhar dado a texto já publicado.

### 1.2 Legado adicional em 8 raças sem característica nomeada

| Campo | Conteúdo |
|---|---|
| Situação atual | Humano, Desperto, Auleth, Autômato, Clone, Amálgamo, Bruxa e Entidade têm `legados_adicionais: 1` ativo na validação técnica, mas nenhuma característica pública descreve o bônus. |
| Proposta recomendada | Adicionar uma característica nomeada e temática a cada uma das 8 raças (estilo igual a "Herança Ancestral"/"Legado de Outra História"), descrevendo o Legado extra dentro da identidade de cada raça. |
| Justificativa | O bônus já é real e ativo — é só documentação ausente. Sem isso, um jogador lendo a raça não descobre que ela concede uma vaga extra. |
| Impacto mecânico | Nenhum — a regra já vale hoje; só passa a estar visível. |
| Impacto econômico | Nenhum. |
| Efeitos colaterais | Nenhum técnico. Efeito de "clareza de escolha": pode tornar essas 8 raças mais atrativas na criação de personagem só por ficarem mais claras (não por ficarem mais fortes — elas já eram). |
| Arquivos alterados | `data/ficha/racas.json` (8 entradas, campo `caracteristicas`). |
| Testes necessários | Nenhum teste automatizado novo estritamente necessário (é conteúdo de texto), mas vale conferir que `test_character_rules.py`/testes de raça não fixam a contagem de características por raça de um jeito que quebraria com uma entrada a mais. |

**Status:** correção objetiva — decidi tratar como confirmada (o padrão de 8 raças sem documentação, contra só 2 com documentação, é forte o bastante pra concluir que o campo é intencional e só falta o texto). Escrever 8 blurbs temáticos é trabalho de conteúdo, não uma escolha de arquitetura — sigo sem perguntar, conforme preferência já registrada de não interromper por causa de constantes/conteúdo.

### 1.3 Orçamento de poder dos Legados

| Campo | Conteúdo |
|---|---|
| Situação atual | 42 Legados custam todos 1 vaga; magnitude varia muito dentro do mesmo custo/pré-requisito (ver B.2 de `propostas-design-balanceamento-2026-08.md`). Os casos mais nítidos: Bala Ágil, Tô ficando bom e Mágico? têm pré-requisito nulo ou trivial e efeito forte; Ossos Duros (RD 5 incondicional) e Desonroso (bônus só contra desarmados) custam o mesmo com o mesmo pré-requisito (nível 6). |
| Proposta recomendada | **Não implementar nenhuma mudança nesta etapa** sem aprovação explícita — ver pergunta ao usuário abaixo. Se aprovado intervir, a menor mudança reversível seria subir o pré-requisito dos 3 outliers sem pré-requisito (Bala Ágil, Tô ficando bom, Mágico?) pra um marco de nível mínimo (ex. nível 5, igual ao primeiro marco de Legado, ao invés de "nenhum"), sem tocar no efeito em si. |
| Justificativa | Nerfar/buffar 42 Legados de uma vez seria rebalanceamento amplo, contra a instrução explícita de conservadorismo. A intervenção mínima é elevar a barreira de entrada dos casos mais desproporcionais, preservando o efeito e a identidade. |
| Impacto mecânico | Se aprovado: adia o acesso aos 3 Legados mais fortes sem pré-requisito pro primeiro marco em vez de "a qualquer momento" — não muda o efeito. |
| Impacto econômico | Nenhum. |
| Efeitos colaterais | Pode frustrar quem já tem ficha com esses Legados escolhidos antes do primeiro marco — precisaria de uma regra de transição (ex. "válido pra fichas novas, fichas existentes mantêm"). |
| Arquivos alterados (se aprovado) | `data/ficha/legados.json` (só os 3 outliers sem pré-requisito, se essa for a decisão). |
| Testes necessários (se aprovado) | Teste de criação de personagem bloqueando esses 3 Legados abaixo do nível 5. |

**Status: precisa de decisão — pergunta ao usuário.**

### 1.4 Código de Ética

| Campo | Conteúdo |
|---|---|
| Situação atual | Bônus = nível do personagem em dano contra oponentes armados, sempre age primeiro; não pode atacar desarmados. Cresce sem teto — aos 40, o bônus (+40) já iguala a média de uma arma lendária inteira (39,8); aos 60, se aproxima de uma relíquia (66,4). Nenhum outro Legado do catálogo escala com nível. |
| Proposta recomendada | **Recomendação concreta (para aprovação, depois confirmada como estado final): crescimento por marcos com teto ancorado na régua do sistema.** Código de Ética concede dano adicional igual à metade do nível do personagem, arredondado para baixo, até o máximo de +30 (~75% da média de uma arma lendária). Isso preserva a identidade ("cresce com você"), alinha o ritmo ao resto do sistema (que usa marcos, não crescimento contínuo) e nunca ultrapassa uma arma lendária inteira somada por cima da arma do personagem. |
| Justificativa | Das 4 alternativas apresentadas antes (manter/teto/marcos/fixo), essa é uma composição de "marcos" (C) + "teto" (B): resolve o problema de escala sem remover a progressão (que a alternativa D removeria) nem exigir um número arbitrário isolado (que a alternativa B pura exigiria sem uma âncora clara). |
| Impacto mecânico | Em vez de +6/+10/+20/+30/+40/+50/+60 nos níveis 6/10/20/30/40/50/60, o bônus passaria a +3/+5/+10/+15/+20/+25/+30 — ainda relevante (ainda comparável a uma arma raro/épico nos níveis médios), mas nunca mais que ~75% de uma arma lendária, mesmo no teto. |
| Impacto econômico | Nenhum direto — mas indiretamente reduz a pressão de "esse Legado sozinho supera qualquer investimento em equipamento", o que preserva a relevância de gastar Lunaris/Solares em armas melhores. |
| Efeitos colaterais | Personagens que já escolheram esse Legado em campanhas ativas em nível alto sentiriam uma redução real de dano — precisa de uma decisão de transição (aplicar retroativamente ou só a fichas novas). Também seria necessário esclarecer, ao mesmo tempo, se ataques naturais de monstro contam como "desarmado" pra este Legado (ambiguidade separada, sem dado que resolva sozinha — também fica pra decisão do usuário). |
| Arquivos alterados (se aprovado) | `data/ficha/legados.json` (texto + fórmula do efeito de `codigo-de-etica`); possivelmente `data/regras/regras.ts` se o texto público precisar refletir a nova redação. |
| Testes necessários (se aprovado) | Teste de cálculo do bônus em múltiplos níveis (6/10/20/30/40/50/60) confirmando o novo valor e o teto. |

**Status: precisa de decisão — pergunta ao usuário** (inclusive se aceita minha recomendação concreta, prefere outra das 4 alternativas originais, ou prefere manter como está).

---

## Agente 2 — Economia e Moedas

### 2.1 Câmbio de Fragmentos de Estrela e Créditos Sombrios

| Campo | Conteúdo |
|---|---|
| Situação atual | `regras.ts` promete conversão 1000 Solares→1 Fragmento de Estrela e câmbio flutuante pra Créditos Sombrios; `converter()` só aceita Lunaris↔Solares. Nenhuma fonte de renda automática gera Fragmentos de Estrela ou Créditos Sombrios — as duas moedas só aparecem como custo fixo de itens de topo (relíquias/artefatos e implantes, respectivamente), e todos os itens de relíquia exigem `autorizacaoMestre: true`. |
| Proposta recomendada | **Não implementar câmbio novo.** As duas moedas têm o perfil de "moeda de destino narrativamente controlada" (sem fonte de renda automática, ligada a conteúdo que já passa pela aprovação do Mestre) — abrir conversão automática destruiria essa função, permitindo comprar itens de relíquia/implante só acumulando Lunaris e convertendo, sem depender de narrativa/Mestre. Recomendo **ajustar o texto de `regras.ts`** pra não prometer um mecanismo que nunca existiu de fato (remover ou reescrever as duas linhas de câmbio pra deixar claro que Fragmentos de Estrela e Créditos Sombrios não têm conversão automática — são obtidos por fonte própria, a critério do Mestre). |
| Justificativa | Essa é, na prática, a mesma pergunta da seção "Veículos vs. Solares" (economia unificada vs. categórica) aplicada às outras duas moedas — ver pergunta ao usuário abaixo, que cobre as duas de uma vez. |
| Impacto mecânico | Nenhuma mudança de jogo — só o texto público deixa de prometer algo que o sistema não faz. |
| Impacto econômico | Preserva os dois tiers de itens (relíquia, implante) como conquistas narrativas, não como algo comprável só grindando Lunaris. |
| Efeitos colaterais | Nenhum técnico. Jogadores que já leram a promessa de câmbio podem notar a mudança de texto — vale uma nota de changelog. |
| Arquivos alterados (se aprovado) | `data/regras/regras.ts` (seção de economia, ~linhas 1214-1251). |
| Testes necessários (se aprovado) | `shopCatalogIntegrity.test.ts`/testes de regras públicas que capturem o texto de câmbio, se existirem — conferir se algum teste testa literalmente essa string. |

**Status: precisa de decisão — coberta pela mesma pergunta que "Veículos vs. Solares" (é a mesma escolha de modelo econômico, só aplicada às outras duas moedas).**

### 2.2 Matriz completa de Drops

51 entradas totais (21 `drop-*`, 30 `comp-*`). Tabela condensada por padrão observado (a lista completa item a item está em `data/loja/catalogo.json`, filtrável por `tipo: "drop"`):

| Grupo | n | Moeda predominante | Raridade típica | Origem/uso | Exceções |
|---|---|---|---|---|---|
| `drop-*` (partes de criatura: Humano, Vampiro, Goblim, Anão, Golem, Espírito, Gigante, Animália, Sereia/Tritão) | 21 | **Solares — 21/21, sem exceção** | comum a raro | Loot de abate de criatura, matéria-prima de crafting/venda | Nenhuma |
| `comp-*` (materiais ritualísticos comuns/incomuns) | 24 | **Lunaris — 24/24** | comum a incomum | Componentes de rituais/magia cotidianos | Nenhuma |
| `comp-*` (materiais ritualísticos raro/épico) | 6 | **Solares — 5/6** | raro a épico | Componentes de rituais de alto nível | `comp-marco-de-pedra` (raro, mas em Lunaris) |

| Campo | Conteúdo |
|---|---|
| Situação atual | `regras.ts` rotula a tabela de preço de Drops do Bestiário como "L" (Lunaris); o catálogo real usa Solares em 100% dos `drop-*` — exatamente os itens cobertos por essa tabela. |
| Proposta recomendada | **O catálogo está correto; o texto de `regras.ts` está com o rótulo errado.** Trocar "L" por "S" na tabela de Drops de Seres do Bestiário. Não mexer nos preços do catálogo. |
| Justificativa | O padrão é limpo demais pra ser acidental: 21 de 21 `drop-*` em Solares, e os `comp-*` seguem uma lógica coerente de raridade→moeda (comuns/incomuns em Lunaris, raro/épico majoritariamente em Solares). Um erro de dado normalmente produziria uma mistura sem padrão — aqui o padrão é quase perfeito, o que aponta pro texto (que cobre só uma fatia da categoria `drop` e nunca foi atualizado) como a fonte do erro. |
| Impacto mecânico | Nenhum — nenhum preço muda. |
| Impacto econômico | Nenhum — só a documentação passa a bater com o que já é cobrado hoje. |
| Efeitos colaterais | Nenhum. |
| Arquivos alterados | `data/regras/regras.ts` (tabela de preço de Drops do Bestiário). |
| Testes necessários | Nenhum automatizado além de conferir visualmente o texto gerado (`tools/generate-public-rules.mjs --check`). |

**Status:** correção objetiva com evidência forte o bastante pra eu recomendar diretamente (não é uma escolha de arquitetura, é alinhar texto a um padrão de dado já 97% consistente) — incluída na implementação se a Fase 2 for autorizada, sem precisar de pergunta separada. O único outlier isolado (`comp-marco-de-pedra`, raro em Lunaris) fica registrado como observação, não como algo a corrigir — mudar esse preço individual seria uma decisão de balanceamento fora do escopo desta correção específica.

### 2.3 Cofre vs. Investimentos

| Campo | Conteúdo |
|---|---|
| Situação atual | Cofre: 2%/dia composto, sem trava. Investimento: +5%/7 dias fixo, travado, risco de -2% em crise. Simulação (base 1.000): em 1 semana Cofre rende ~3× mais; em 1 ano, ~118× mais em termos de crescimento. Investimento é dominado em toda dimensão (retorno, liquidez, risco, esforço) — ver `propostas-design-balanceamento-2026-08.md`, seção D. |
| Proposta recomendada | **Recomendação concreta (para aprovação), combinando C + E das 5 alternativas apresentadas antes:** (1) manter os juros do Cofre como estão até um teto de saldo guardado (proposta: teto = capacidade_moeda do tier ATUAL do jogador ÷ 10, ou um valor fixo a calibrar — não tenho base de dado suficiente pra cravar o número exato); acima do teto, o excedente não rende juros automáticos. (2) No Investimento, trocar o retorno fixo de +5%/7 dias por uma faixa com variância (ex.: 70% de chance +8%, 30% de chance -3%, mantendo média esperada acima do +5% atual) — assim quem quer previsibilidade total usa o Cofre (até o teto), e quem quer buscar retorno maior no excedente aceita alguma variância no Investimento. |
| Justificativa | Preserva a identidade pedida (Cofre = segurança/liquidez; Investimento = crescimento/risco) em vez de só igualar os números. Um teto no Cofre não penaliza personagens pequenos/médios (a To grande maioria nunca chegaria perto do teto); a variância no Investimento dá um motivo real, não arbitrário, pra escolher arriscar. |
| Impacto mecânico | Nenhum em combate; muda o ritmo de acúmulo de riqueza pra personagens que já acumularam muito capital. |
| Impacto econômico | Reduz o crescimento exponencial descontrolado do Cofre pra saldos altos, sem tocar em personagens novos/médios; dá ao Investimento uma proposta de valor real pela primeira vez. |
| Efeitos colaterais | Precisa decidir o valor exato do teto (não determinável só com os dados já levantados — depende de quanto capital é "razoável" acumular em que ponto da campanha, uma calibração de playtest, não de dado existente). A variância no Investimento introduz um elemento de sorte que não existia antes — pode não combinar com a filosofia do sistema se o "Investimento" for pra ser percebido como confiável. |
| Arquivos alterados (se aprovado) | `bots/banqueiro/core/economia.py` (`JUROS_COFRE_TAXA` ganha lógica de teto; `INVESTIMENTO_TAXA_NORMAL` vira uma distribuição em vez de constante), possivelmente `data/economia/cofre_seguranca_tiers.json` se o teto for por tier. |
| Testes necessários (se aprovado) | Testes de juros com saldo acima/abaixo do teto; testes de investimento cobrindo os dois desfechos da variância; teste de regressão nos valores antigos pra confirmar que não quebrou o fluxo existente de `/investir`/`/juros_cofre`. |

**Status: precisa de decisão — pergunta ao usuário** (aceitar a recomendação combinada, escolher uma das 5 alternativas originais isoladamente, ou não mexer).

---

## Agente 3 — Veículos e Propriedades

### 3.1 Economia de veículos — Modelo A ou B

| Campo | Conteúdo |
|---|---|
| Situação atual | Câmbio oficial 100 Lunaris = 1 Solar, publicado como universal. Veículo lendário mais caro (250.000 Lunaris = 2.500 Solares) custa ~1/60 de uma arma lendária pessoal (100-150k Solares). Nenhuma fonte de renda automática gera Solares; armas lendárias/relíquia exigem `autorizacaoMestre: true`, veículos não têm essa trava documentada. |
| Proposta recomendada | **Recomendação concreta (para aprovação): Modelo B — economia categórica.** Documentar explicitamente em `regras.ts` que o câmbio Lunaris↔Solares vale só pra transações do dia a dia dentro da mesma categoria de item, não como equivalência de "valor de jogo" entre veículos e equipamento pessoal. |
| Justificativa | O peso da evidência favorece B: (1) nenhuma fonte de renda automática gera Solares — ele só existe via câmbio manual, o que sugere que foi desenhado como "moeda de chegada", não de giro; (2) armas de ponta têm uma segunda trava narrativa (aprovação do Mestre) que por si só já desacopla preço de acesso real — o preço em Solares nunca foi, sozinho, o controle de quem consegue esses itens; (3) veículos, ao contrário, parecem desenhados pra caber no fluxo normal de Lunaris (a moeda de giro), o que é coerente com serem investimentos de campanha alcançáveis mais cedo, não recompensas de fim de jogo. O ponto contrário (a favor do Modelo A) é só a existência formal da taxa de câmbio — mas ela nunca teve, em nenhuma fonte revisada, uma aplicação cross-categoria de fato usada em jogo. |
| Impacto mecânico | Nenhum — nenhum preço muda. |
| Impacto econômico | Formaliza que investir em veículo (Lunaris) e investir em arma pessoal de ponta (Solares) são trilhas paralelas, não comparáveis por câmbio — remove a leitura de "exploit" que a auditoria original levantou. |
| Efeitos colaterais | Se essa NÃO for a intenção real do time de design (isto é, se a intenção sempre foi Modelo A), a documentação ficaria formalizando um erro em vez de corrigi-lo — por isso esta é uma pergunta ao usuário, não uma correção objetiva. |
| Arquivos alterados (se aprovado) | `data/regras/regras.ts` (nota explícita na seção de economia e/ou na seção de veículos). |
| Testes necessários (se aprovado) | Nenhum automatizado (é documentação); conferir `tools/generate-public-rules.mjs --check` gera o texto sem erro. |

**Status: precisa de decisão — pergunta ao usuário** (mesma pergunta cobre 2.1, câmbio de Fragmentos/Créditos, já que é a mesma escolha de modelo econômico aplicada a duas partes do sistema).

### 3.2 Terreno Baldio

| Campo | Conteúdo |
|---|---|
| Situação atual | Catálogo mostra manutenção 50 Lunaris/mês; fórmula de `bases.ts` (fator do patamar Posto × 100) prevê 100. As outras duas propriedades de patamar Posto (Casa Simples, Apartamento) batem exatamente com a fórmula. Terreno Baldio é a única propriedade sem `qualidadeQuartos` definida — não tem nenhuma estrutura construída, só terra. |
| Proposta recomendada | **Tratar como exceção intencional e documentá-la**, em vez de corrigir o valor pra 100. |
| Justificativa | É a única propriedade sem estrutura — manutenção menor pra um terreno vazio (sem paredes, telhado, instalações) é uma lógica de jogo razoável mesmo sem regra escrita hoje. Forçar o valor pra 100 tornaria Terreno Baldio estritamente pior que teria sido só por "seguir a fórmula", sem nenhum ganho de clareza (viraria idêntico a "pagar manutenção de patamar cheio por não ter nada construído em cima"). |
| Impacto mecânico | Nenhum — mantém o valor como está. |
| Impacto econômico | Nenhum — só passa a ser uma exceção documentada, não um valor "suspeito". |
| Efeitos colaterais | Nenhum. |
| Arquivos alterados | `data/regras/bases.ts` (nota sobre manutenção reduzida pra terrenos sem estrutura) e opcionalmente um campo/comentário em `propriedade-terreno-baldio` no catálogo remetendo à regra. |
| Testes necessários | Nenhum automatizado além de manter `test_cofre_tiers.py`-equivalente (se existir para propriedades) sem quebrar. |

**Status:** decidi como correção objetiva (documentar, não corrigir o número) — a evidência (única propriedade sem estrutura) é específica o bastante pra não precisar de pergunta de arquitetura; incluída na Fase 2 se autorizada, sem consumir uma das perguntas.

---

## Agente 4 — Consistência

Checagem cruzada de cada proposta acima contra o resto do sistema, antes de qualquer implementação:

1. **Legados repetíveis** — nenhuma regra em `regras.ts` (seção "legados") contradiz repetição quando marcada; o texto já prevê isso explicitamente ("Só dá para escolher o mesmo Legado de novo se ele estiver marcado como repetível, e dentro do limite dele"). Sem conflito. Nenhum outro sistema lê `limite`/`repetivel` de Legado além do próprio validador de criação/edição de ficha.
2. **Legado extra por raça** — a fórmula de vagas (`nivel_total // 5 + legados_adicionais`) já soma o campo; adicionar texto não muda o cálculo, só a visibilidade. Sem conflito. `bots/Gerente` (bot de regras) renderiza características por raça a partir do mesmo JSON — herdaria a nova característica automaticamente, sem mudança de código no bot.
3. **Código de Ética** — se o valor virar `nível ÷ 2` com teto, isso precisa estar refletido tanto em `legados.json` (dado estruturado) quanto no texto gerado em `regras.ts` (a lista pública é montada dinamicamente a partir do JSON, então uma mudança no JSON já se propaga — mas a fórmula em si só existe como texto livre na `descricao`, não como campo numérico interpretável por código; não há nenhuma automação de combate lendo esse Legado hoje, então a mudança fica só no texto/dado, sem tocar em `plataforma/`).
4. **Câmbio de Fragmentos/Créditos** — remover a promessa de `regras.ts` não afeta `converter()` (que já não suporta essas moedas) nem nenhum teste existente que dependa da mecânica funcionar (não encontrado nenhum teste que exercite câmbio de Fragmentos/Créditos, porque a função já rejeita essas moedas hoje).
5. **Drops (rótulo L→S)** — só texto; `resolver_preco()` já resolve os itens reais como Solares, então nenhum teste de preço quebra. Vale conferir se `bots/Gerente` (indexação de conhecimento pro `/regras`) cacheia o texto antigo em algum lugar além de ler `regras.ts` na hora.
6. **Cofre vs. Investimentos** — `JUROS_COFRE_TAXA` e `INVESTIMENTO_TAXA_NORMAL` são lidas em `bots/banqueiro/core/economia.py`; `db.py` expõe `juros_cofre_taxa` como configuração por guild (`set_economia_config`), então qualquer mudança de teto/variância precisa continuar compatível com esse mecanismo de override por servidor — não pode virar uma constante hardcoded se hoje é configurável.
7. **Veículos vs. Solares (Modelo B)** — não há código que dependa de comparar preço de veículo com preço de arma; é seguro documentar sem tocar em `plataforma/routers/vehicles.py` nem `shop.py`.
8. **Terreno Baldio** — `bases.ts` é só texto de regras (não há validação de preço de propriedade contra a fórmula em nenhum lugar do backend revisado), então documentar a exceção não entra em conflito com nenhuma validação técnica existente.

Nenhuma duplicata de dado nem dependência cruzada quebrada foi encontrada para as propostas acima.

---

## Agente 5 — Simulação (números usados nas propostas)

- **Dano por raridade de arma** (recalculado de 87 armas): comum 3,6 / incomum 6,9 / raro 10,9 / épico 18,9 / lendário 39,8 / relíquia 66,4 — usado na calibração de Código de Ética.
- **Vida por nível (Guerreiro, referência)**: 16 (nv1) → 44 (nv5) → 79 (nv10) → 149 (nv20) → 259 (nv40) — `balanceamento-referencia-v1.json` não cobre acima do nível 40.
- **Cofre vs. Investimento**, base 1.000: 7 dias → Cofre 1.148,7 vs. Investimento 1.050,0; 1 ano → Cofre ≈1.379.300 vs. Investimento ≈12.640 (números completos em `propostas-design-balanceamento-2026-08.md`, seção D).
- **Tempo esperado de aquisição (veículos/economia)**: não foi possível calcular um número único sem inventar uma cadência de sessão/renda por sessão que não existe nos dados (as fontes de renda são faixas — baú comum 5-20 Lunaris, raro 15-45, lendário 40-90 — sem frequência de abertura documentada). Registro isso como limitação, em vez de inventar um valor de referência.

---

## Consolidado — status de cada decisão

| # | Decisão | Status | Ação |
|---|---|---|---|
| 1 | Legados repetíveis (Artista Marcial, Rapidinho, Não é Tão Pesado) | **Objetiva** | Implementar na Fase 2 |
| 2 | Legado extra em 8 raças sem característica nomeada | **Objetiva** | Implementar na Fase 2 |
| 3 | Moeda dos Drops (rótulo "L"→"S" em `regras.ts`) | **Objetiva** | Implementar na Fase 2 |
| 4 | Terreno Baldio (documentar como exceção) | **Objetiva** | Implementar na Fase 2 |
| 5 | Orçamento de poder dos Legados (outliers sem pré-requisito) | Precisa de decisão | Pergunta 4 |
| 6 | Código de Ética (fórmula de escala) | Precisa de decisão | Pergunta 2 |
| 7 | Modelo econômico (veículos + câmbio Fragmentos/Créditos) | Precisa de decisão | Pergunta 1 |
| 8 | Cofre vs. Investimentos (configuração) | Precisa de decisão | Pergunta 3 |

As 4 decisões objetivas serão implementadas assim que a Fase 2 começar. As 4 que precisam de decisão de design estão nas perguntas a seguir — nenhuma delas será implementada sem resposta.
