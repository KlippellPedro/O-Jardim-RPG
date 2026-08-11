# Propostas de Design e Balanceamento — O Jardim RPG (2026-08)

**Natureza desta etapa: somente análise.** Nenhum arquivo foi alterado. Este documento parte de [auditoria-design-balanceamento-2026-08.md](auditoria-design-balanceamento-2026-08.md) e responde, para cada achado, "o que mudar, por quê, e quais as consequências" — sem escolher a alternativa final. Números novos usados aqui (dano médio de arma por raridade, Vida/Defesa por nível de classe) vêm de `data/regras/balanceamento-referencia-v1.json` e de um recálculo direto do campo `dano` das 87 armas em `data/loja/catalogo.json`.

---

## A. Correções objetivas

Casos em que texto publicado, dado estruturado e implementação técnica deveriam representar a mesma regra, mas não representam.

### A.1 Legados repetíveis (Artista Marcial, Não é Tão Pesado, Rapidinho)

- **Estado atual:** nenhum dos três tem os campos `limite` ou `repetivel` definidos em `legados.json`. A validação técnica (`character_summary.py`) usa limite efetivo = 1 quando esses campos não existem.
- **Regra pretendida:** o próprio texto de cada um descreve uma segunda (e, no caso de "Não é Tão Pesado", uma terceira) escolha com efeito adicional.
- **Conflito:** um jogador que tentar escolher qualquer um dos três pela segunda vez, seguindo a regra publicada no livro, é bloqueado pela validação com a mensagem "um Legado foi escolhido mais vezes que o permitido".
- **Solução mínima:** adicionar `"repetivel": true` e `"limite": 2` (Artista Marcial, Rapidinho) ou `"limite": 3` (Não é Tão Pesado) às três entradas de `legados.json`. É uma mudança de dado estrutural, não de regra — a regra já existe em texto, só não está espelhada no campo que o validador lê.

### A.2 Legado adicional do Humano

- **Estado atual:** `legados_adicionais: 1` existe no campo raiz da raça Humano e é lido pela fórmula de vagas do validador técnico — o bônus é real e ativo. Nenhuma entrada em `caracteristicas` do Humano o descreve.
- **Regra pretendida:** todo bônus mecânico ativo deveria ter uma característica nomeada e descrita na ficha pública da raça — padrão que Elfo ("Herança Ancestral") e Errante ("Legado de Outra História") seguem.
- **Conflito:** um jogador lendo a descrição pública de Humano não descobre, em lugar nenhum do texto, que a raça concede um Legado extra.
- **Solução mínima:** adicionar uma entrada em `caracteristicas` do Humano nomeando o bônus (ex.: "Versatilidade: recebe um Legado adicional"). Documentação de uma regra que já vale, não uma regra nova.

### A.3 Câmbio de Fragmentos de Estrela

- **Estado atual:** `regras.ts` publica "1000 Solares → 1 Fragmento de Estrela"; a função `converter()` do Banqueiro só aceita o par Lunaris↔Solares e levanta erro para qualquer outra combinação.
- **Regra pretendida:** câmbio funcional entre as moedas que o texto público promete.
- **Conflito:** o jogador que tenta seguir a regra publicada encontra um comando/fluxo que não existe.
- **Solução mínima:** duas saídas mutuamente exclusivas — implementar a conversão que falta (mudança de código, fora do escopo desta etapa de design) ou remover a promessa do texto até que a implementação exista (mudança de texto). Qual das duas é "mínima" depende da intenção real, que é uma decisão de design (seção G).

### A.4 Câmbio de Créditos Sombrios

- **Estado atual:** `regras.ts` publica "câmbio flutuante"; `converter()` não aceita Créditos Sombrios em nenhuma combinação.
- **Regra pretendida:** mecanismo de câmbio flutuante funcional, ou remoção explícita da promessa.
- **Conflito:** idêntico ao A.3.
- **Solução mínima:** mesma lógica do A.3 — implementar ou destextualizar.

### A.5 Moeda dos Drops

- **Estado atual:** `regras.ts` (tabela de preço de Drops do Bestiário) rotula os valores com sufixo "L"; o catálogo real usa número puro para a maior parte dos drops, que `resolver_preco()` resolve como Solares — mas **24 dos 51 drops já usam o formato `{"Lunaris": N}`**, então a própria categoria `drop` já é internamente inconsistente sobre qual moeda usar, independente do texto de regras.
- **Regra pretendida:** as três fontes (texto, catálogo, formato de dado) deveriam concordar.
- **Conflito:** um jogador lendo o livro de regras espera pagar Lunaris por um drop; parte dos drops reais cobra Solares.
- **Solução mínima:** depende de qual interpretação é a correta — ver seção E. Não escolhida aqui.

### A.6 Manutenção do Terreno Baldio

- **Estado atual:** catálogo mostra `manutencao: 50`; a fórmula publicada em `bases.ts` (fator do patamar "Posto" × 100 Lunaris/mês) prevê 100 — as outras duas propriedades de patamar Posto (Casa Simples, Apartamento) batem exatamente com a fórmula.
- **Regra pretendida:** manutenção = fator do patamar × 100, sem exceção documentada.
- **Conflito:** o valor real é metade do previsto, sem nenhuma nota explicando por quê.
- **Solução mínima:** depende de ser erro ou desconto intencional — ver seção F. Não escolhida aqui.

### Tabela-resumo

| Problema | Evidência | Solução mínima |
|---|---|---|
| Legados repetíveis bloqueados | `legados.json` sem `repetivel`/`limite` em 3 entradas cujo texto descreve 2ª/3ª escolha | Adicionar os campos aos 3 Legados |
| Legado extra do Humano não documentado | `legados_adicionais:1` sem entrada correspondente em `caracteristicas` | Adicionar característica nomeada |
| Câmbio de Fragmentos de Estrela ausente | `regras.ts` promete 1000:1; `converter()` só aceita Lunaris↔Solares | Implementar ou remover a promessa (decisão) |
| Câmbio de Créditos Sombrios ausente | `regras.ts` promete câmbio flutuante; `converter()` não suporta | Implementar ou remover a promessa (decisão) |
| Moeda dos Drops divergente | Texto diz "L"; catálogo majoritariamente resolve como Solares; categoria já mista internamente (24 Lunaris / 27 Solares) | Escolher moeda única e alinhar as três fontes (decisão) |
| Manutenção do Terreno Baldio | 50 no catálogo vs. 100 esperado pela fórmula de `bases.ts` | Corrigir para 100 ou documentar a exceção (decisão) |

---

## B. Legados

### B.1 Modelo de orçamento de poder

Cinco eixos condensam as treze dimensões pedidas (frequência, duração e consistência colapsam num só eixo; impacto em/fora de combate e escalabilidade colapsam em "magnitude"; dependência de build/situação e sinergias/abuso colapsam em "generalidade" e "risco"):

1. **Generalidade** — precisa de build/situação específica, ou funciona pra (quase) qualquer personagem, sempre?
2. **Magnitude** — tamanho do efeito, calibrado contra a régua real do sistema: dano médio de arma por raridade (comum 3,6 / incomum 6,9 / raro 10,9 / épico 18,9 / lendário 39,8 / relíquia 66,4 — recalculado a partir das 87 armas do catálogo), Vida por nível de classe (Guerreiro: 16 no nível 1, 149 no nível 20, 259 no nível 40), e a constatação de que **nenhuma outra fonte de Redução de Dano aparece nos 42 Legados revisados** — RD é um recurso estruturalmente escasso no catálogo.
3. **Consistência** — always-on/passivo permanente vs. uso limitado (1×/turno, cena, descanso, sessão) vs. custo de recurso (Mana).
4. **Custo de oportunidade / risco** — existe restrição, desvantagem ou dependência que reduza o valor líquido; ou sinergia que o amplifique.
5. **Papel** — mecânico vs. identidade/narrativa, usado só pra isolar o grupo "Poder narrativo" independente da magnitude.

"Valor aproximado para uma vaga" nasce do cruzamento Generalidade × Magnitude ÷ Consistência, sempre comparado à régua do item 2.

### Classificação dos 42 Legados

**Poder muito alto**
| Legado | Por quê |
|---|---|
| Ossos Duros (nv6) | RD 5 físico incondicional e permanente — único acesso a RD do catálogo revisado; mitiga uma fração de praticamente todo dano físico recebido pelo resto da campanha. |
| Monstro (nv10) | Dobra o modificador de Força em corpo a corpo, sem condição — multiplicador puro de dano pra qualquer build de Força. |
| Bala Ágil (sem pré-requisito) | Soma Destreza ao dano à distância; nenhum pré-requisito, disponível já no primeiro marco (nível 5) — comparável a uma característica de classe inteira, de graça. |
| Código de Ética (nv6) | Ver B.3 — único Legado do catálogo cujo bônus escala com o nível do personagem. |

**Poder alto**
Tô ficando bom, Esquiva, Sou Bom Nisso, Flexível, Instinto Animal, Quebra Dente, Tô de Pé Ainda, Vínculo Lunar (novo) — bônus permanentes/consistentes, generalidade alta, magnitude relevante mas sem multiplicar/quebrar a régua de referência como o grupo anterior.

**Poder médio**
Rapidinho, Sem Tempo Irmão, Veterano de Guerra — efeitos consistentes de magnitude moderada, próximos do que a maioria dos Legados do catálogo entrega.

**Poder baixo**
Sem Chance, Cozinheiro, Já fui CLT — funcionam como descrito, mas o impacto mecânico é pequeno ou a situação de gatilho é rara o bastante pra raramente pesar numa decisão de build.

**Poder de nicho** (fortes dentro de uma build/situação específica, irrelevantes fora dela)
Mãos Leves, Artista Marcial, Não é Tão Pesado, Correntes, Sempre no x1, Mágico?, Mágico!, Mais Potente, Sempre Foi Assim, Ainda Não, Desonroso, Bruto, Mão Pesada, Posturado, Mentiroso Nato, Eco do Fluxo, Passo Entre Galhos, Segundo Tempo, Âncora da Árvore.

**Poder narrativo** (identidade/fantasia, impacto mecânico marginal)
Leitura Labial, Kit Diverso, Sortudo pra Cacete, Selvagem, Memória do Eclipse.

*(Contagem: 4 + 8 + 3 + 3 + 19 + 5 = 42 — todos os Legados classificados.)*

### B.2 Outliers que merecem atenção

O critério não é "é forte em combate" — é: **a diferença de poder é grande o bastante, dentro do MESMO custo (1 vaga) e do MESMO ou similar pré-requisito, pra distorcer a escolha?**

- **Ossos Duros vs. Desonroso** (ambos nível 6): RD 5 incondicional e permanente contra um bônus que só existe enquanto o oponente estiver desarmado — condição rara e que só fica mais rara conforme o nível sobe (inimigos de nível alto tendem a estar equipados). Mesmo pré-requisito, magnitude muito diferente. Justifica atenção.
- **Bala Ágil vs. Leitura Labial / Selvagem** (nenhum tem pré-requisito): Bala Ágil entrega dano comparável a uma feature de classe; os outros dois têm efeito narrativo quase puro. Zero diferença de custo de entrada, magnitude ordens de grandeza distante. Isso por si só não é necessariamente um problema — ver o parágrafo seguinte — mas é o maior contraste do catálogo.
- **Monstro / Sou Bom Nisso**: ambos fortes, mas Monstro (dobrar Força) tem teto mais alto que Sou Bom Nisso (+2 ou vantagem) — ainda assim os dois ficam dentro de uma faixa "forte, mas não quebra a régua" quando comparados entre si, diferente do caso Ossos Duros/Desonroso.
- **Já fui CLT / Sortudo pra Cacete**: ambos de baixíssimo impacto mecânico, mas isso, sozinho, não é um problema — ver o próximo parágrafo.

**Nem toda diferença de poder é um problema.** O sistema evidentemente comporta Legados "de sabor" (Leitura Labial, Selvagem, Cozinheiro) ao lado de Legados de poder de combate — isso é uma escolha de design defensável em muitos sistemas (opções de identidade que não competem diretamente com opções de otimização). O ponto de atenção real não é "existem Legados fracos", é que **alguns Legados fortes não têm pré-requisito nenhum ou têm pré-requisito trivial** (Bala Ágil, Tô ficando bom, Mágico?), o que os torna praticamente "auto-inclusão" pra qualquer build compatível, reduzindo a variedade de escolha real no primeiro marco (nível 5) — é aí que a diferença de poder prejudica escolha significativa, não no fato de existirem Legados fracos ao lado deles.

### B.3 Código de Ética — análise de escala

Bônus: "dano adicional igual ao seu nível" contra oponentes armados, mais "sempre age antes dele na iniciativa"; custo: incapaz de atacar oponentes desarmados.

**Simulação conceitual** — bônus de dano do Legado comparado à média de dano de arma por raridade (recalculada das 87 armas do catálogo) e ao nível recomendado de cada raridade (de `balanceamento-referencia-v1.json`):

| Nível | Bônus (+nível) | Referência de arma no patamar | Leitura |
|---|---|---|---|
| 6 | +6 | Incomum (média 6,9), nível recomendado inicial | O bônus sozinho já iguala o dano médio de uma arma inteira de tier incomum, somado por cima da arma que o personagem já usa. |
| 10 | +10 | Raro (média 10,9) | Mesmo padrão: bônus ≈ dano de uma arma rara inteira. |
| 20 | +20 | Épico (média 18,9, nível recomendado ~20-25) | O bônus **supera** a média de uma arma épica inteira. |
| 30 | +30 | Entre épico (18,9) e lendário (39,8, nível recomendado 25) | Bônus já ultrapassa uma arma épica e se aproxima de 3/4 de uma lendária — **como valor fixo somado a qualquer arma, inclusive uma comum.** |
| 40 | +40 | Lendário (39,8, nível recomendado 25) | Bônus praticamente **iguala** o dano médio de uma arma lendária inteira. |
| 50 | +50 (extrapolado — `balanceamento-referencia-v1.json` só cobre até nível 40) | Entre lendário (39,8) e relíquia (66,4, nível recomendado 35) | Sem dado oficial de referência acima do nível 40; extrapolação linear da tendência observada. |
| 60 (teto do sistema) | +60 (extrapolado) | Relíquia (66,4, nível recomendado 35) | Bônus se aproxima do dano de uma arma de relíquia inteira — o personagem carrega, de graça, o equivalente a uma segunda arma-relíquia embutida em cada golpe. |

**Leitura:** o crescimento é linear e sem teto, enquanto a régua de referência do próprio sistema (dano por raridade de arma) cresce de forma muito mais lenta acima do nível ~25 (o salto de lendário pra relíquia, os dois tiers mais altos do jogo, é de "só" 39,8 pra 66,4 — um fator de ~1,7×, atingido em ~10 níveis de diferença recomendada). O bônus do Legado, em contraste, nunca desacelera. Somado ao fato de que "sempre age antes na iniciativa" garante o primeiro golpe (e, em muitos sistemas, o primeiro golpe decide trocas de dano em combates curtos), o efeito composto tende a **encurtar a duração de combates** de forma desproporcional a partir de meados da campanha — não é mais "um bônus de dano", é "um segundo arsenal lendário passivo" pela metade do jogo em diante.

O contrapeso (não pode atacar desarmados) depende de uma ambiguidade não resolvida em nenhuma regra revisada: **ataques naturais de monstro (garra, mordida) contam como "desarmado" pra este Legado, ou só se aplica a NPCs humanoides sem arma empunhada?** Se contarem, a restrição é relevante (grande parte dos inimigos de bestiário usa ataques naturais); se não contarem, a restrição quase nunca é acionada em combates reais contra a maioria dos inimigos armados/equipados do jogo, e o Legado fica com desvantagem quase nominal.

**Avaliação:** dentro dos dados revisados, o crescimento **quebra a escala do sistema** a partir de meados/fim de campanha (nível ~30+), a menos que a restrição de "não pode atacar desarmados" seja, na prática, muito mais punitiva do que os dados sugerem — o que por sua vez depende de uma definição de "desarmado" que não está escrita em lugar nenhum.

### B.4 Alternativas para Código de Ética (sem escolher)

**A — Manter como está**
- Vantagem: zero esforço, mantém a fantasia de "duelista honrado" already publicada, nenhuma mudança de expectativa pra quem já escolheu esse Legado.
- Desvantagem: nos níveis 40+ o bônus rivaliza ou supera armas lendárias/relíquia; nenhum outro Legado do catálogo escala assim, criando uma disparidade crescente e sem teto contra as outras 41 opções.
- Impacto no design: aceita conscientemente uma única exceção crescente; jogadores otimizadores tendem a convergir fortemente pra esse Legado a partir de metade da progressão.

**B — Colocar teto** (ex.: "dano adicional igual ao nível, até um máximo de X")
- Vantagem: contém o crescimento sem eliminar a identidade do Legado; mudança de 1 número.
- Desvantagem: o teto certo é uma escolha de calibração arbitrária; cria um "platô" onde o Legado perde atratividade relativa acima de certo nível, o que pode soar estranho narrativamente (o personagem "para de melhorar" nesse aspecto).
- Impacto no design: precisa de um valor de referência pra ancorar o teto — ex. igualar a média de arma lendária (~40) ou relíquia (~66).

**C — Crescimento por marcos** (ex.: +nível÷2, ou +X a cada 10 níveis, no mesmo ritmo dos marcos de atributo/Legado que o resto do sistema já usa)
- Vantagem: alinha esse Legado ao ritmo do resto da progressão (que raramente escala de forma contínua com o nível); crescimento mais previsível e comparável.
- Desvantagem: mais difícil de comunicar em uma frase ("dano = nível ÷ 2, arredondado pra baixo" é menos direto que "dano = nível"); ainda exige escolher o divisor/marco certo.
- Impacto no design: aproxima o Legado do padrão predominantemente flat do catálogo, reduzindo a sensação de exceção.

**D — Valor fixo, sem escalar com nível**
- Vantagem: total consistência com os outros 41 Legados (nenhum escala com nível hoje); fácil de calibrar contra a régua de dano por raridade.
- Desvantagem: perde a única característica realmente distinta do Legado — a progressão contínua; quem escolher cedo (nível 6) fica "preso" num valor que não acompanha o resto do personagem crescendo.
- Impacto no design: a mais alinhada à filosofia atual do catálogo, ao custo de remover o que torna esse Legado único.

Não escolho nenhuma das quatro.

---

## C. Veículos vs. Solares

**Pergunta anterior a "está caro ou barato": Lunaris e Solares deveriam ter equivalência econômica completa?**

Evidência levantada sobre a função de cada moeda:
- **Lunaris** é a moeda de giro (`MOEDA_OFICIAL = "Lunaris"`), o saldo inicial do personagem (20 Lunaris), e a moeda de toda fonte de renda automática revisada — baús, juros do Cofre, recompensas, loteria pagam exclusivamente em Lunaris. É abundante por design.
- **Solares** aparece como preço de itens topo de linha (armas lendárias/relíquia, 100.000-150.000) e como referência de "valor" dos 60 monstros do Bestiário — mas **nenhuma fonte de renda automática revisada gera Solares diretamente**; a única via encontrada pra obter Solares é o câmbio manual a partir de Lunaris acumulado (com 2% de taxa do banco). Isso sugere Solares como "moeda de destino", não de circulação.
- **Armas lendárias e de relíquia têm uma segunda trava** documentada em `balanceamento-referencia-v1.json`: `autorizacaoMestre: true` em todas elas — ou seja, preço nunca foi, sozinho, a única barreira de acesso a esse tier. Não há evidência equivalente de que veículos precisem da mesma autorização.
- Existe uma taxa de câmbio oficial, fixa e implementada em código (100 Lunaris = 1 Solar) — não é uma convenção informal, é uma regra publicada como universal.

### Modelo A — Economia unificada
100 Lunaris = 1 Solar vale para qualquer comparação, inclusive entre veículos e equipamento pessoal.
- **Consequência:** sob esse modelo, o achado da auditoria anterior (veículo lendário/colossal custando ~1/60 de uma arma lendária, convertido) é um problema de balanceamento real — a economia permite, hoje, que Lunaris acumulado normalmente (via loot/juros) compre um bem de campanha inteiro (nave capital) por uma fração do custo de um item pessoal de topo. A correção nesse modelo aponta pra reprecificar veículos pra cima (ou formalizar uma faixa Lunaris muito mais alta pro topo da categoria).

### Modelo B — Economia categórica
Veículos têm economia própria; a taxa de câmbio serve só para transações do dia a dia dentro da mesma categoria de item, não para comparar categorias diferentes.
- **Consequência:** sob esse modelo, o achado deixa de ser um problema e passa a ser uma característica intencional — veículos ficam acessíveis mais cedo na progressão de personagem/campanha (investimento de grupo, não de item pessoal), enquanto armas lendárias/relíquia continuam guardadas como recompensas raras de fim de jogo, adicionalmente controladas pela aprovação do mestre. A ação necessária nesse modelo não é reprecificar nada — é documentar explicitamente em `regras.ts` que a comparação cross-categoria via câmbio não é válida.

**Peso da evidência, sem escolher:** o Modelo A tem a seu favor que a taxa de câmbio é oficial e universal no texto atual — não há ressalva escrita em lugar nenhum dizendo que veículos ficam fora dela. O Modelo B tem a seu favor a ausência de qualquer fonte de renda automática em Solares (sugerindo que Solares foi desenhado como uma moeda de "chegada", inacessível ao fluxo normal de jogo, enquanto veículos foram desenhados pra caber dentro do fluxo normal de Lunaris) e a trava adicional de `autorizacaoMestre` que separa armas de ponta de qualquer outra categoria do catálogo, veículos incluídos.

---

## D. Cofre vs. Investimentos

### Simulação

Base: 1.000 Lunaris parados, sem depósitos/saques adicionais.
- **Cofre**: 2%/dia, composto diariamente, sem trava de prazo.
- **Investimento**: +5% por ciclo completo de 7 dias (sem reinvestimento automático — o valor fica parado nos dias que sobram até fechar o próximo ciclo de 7).

| Horizonte | Cofre (valor final / crescimento) | Investimento (valor final / crescimento) | Razão Cofre÷Investimento (crescimento) |
|---|---|---|---|
| 1 semana (7 dias) | 1.148,7 (+14,9%) | 1.050,0 (+5,0%, 1 ciclo) | ~3,0× |
| 1 mês (30 dias) | 1.811,4 (+81,1%) | 1.215,5 (+21,6%, 4 ciclos + 2 dias parados) | ~3,8× |
| 3 meses (90 dias) | 5.943,0 (+494,3%) | 1.795,9 (+79,6%, 12 ciclos + 6 dias parados) | ~6,2× |
| 6 meses (182 dias) | 36.760 (+3.576%) | 3.556 (+255,6%, 26 ciclos exatos) | ~14,0× |
| 1 ano (365 dias) | ≈1.379.300 (+137.830%) | 12.640 (+1.164%, 52 ciclos + 1 dia parado) | ~118,5× |

A vantagem do Cofre não é constante — **cresce exponencialmente** com o horizonte, porque 2%/dia composto diariamente é uma taxa efetiva muito mais alta que 5%/7dias composto semanalmente. Em 1 ano, mesmo o Investimento sozinho já multiplica o capital por ~12,6×, o que por si só seria um ritmo de progressão de riqueza extremamente alto pra a maioria dos jogos — mas o Cofre multiplica por ~1.379×, tornando a diferença absoluta descomunal.

### Fatores adicionais (todos favorecem o Cofre)

| Fator | Cofre | Investimento |
|---|---|---|
| Taxa de saque | 3%, só na hora de sacar; irrelevante frente a ganhos de dezenas/centenas de % | Não se aplica (sem lock explícito de saque antecipado) |
| Liquidez | Sacável a qualquer momento (menos 3%) | Travado por 7 dias completos |
| Risco | Nenhum (fora roubo, mitigado por Segurança) | -2% se a guild estiver em Crise Econômica |
| Teto | Capacidade por tier (até 9 trilhões no tier máximo — irrelevante na prática) | Nenhum teto documentado |
| Intervenção do jogador | Zero (100% passivo) | Precisa reinvestir manualmente a cada 7 dias pra não perder ciclos |

### O Investimento tem valor estratégico em algum cenário?

Dentro dos dados revisados, não foi encontrado nenhum cenário mecânico em que Investimento supere ou iguale o Cofre — ele é **dominado em toda dimensão comparada** (retorno, risco, liquidez, esforço). O único cenário hipotético em que Investimento seria a única opção — personagem sem acesso a Cofre — não parece existir, já que todo personagem começa no tier "comum" do Cofre sem custo de entrada documentado. A conclusão é que, hoje, escolher Investimento é uma decisão puramente narrativa/de roleplay, nunca estratégica.

### Alternativas (sem escolher)

**A — Reduzir juros do Cofre**
- Efeito econômico: desacelera a inflação de moeda geral do sistema.
- Efeito pro jogador: nerf direta e perceptível pra quem já usa o Cofre como "banco" — pode soar como punição sem contexto.
- Risco de exploit: baixo.
- Complexidade: trivial (1 constante), mas calibrar o novo valor não é trivial.

**B — Aumentar retorno do Investimento**
- Efeito econômico: pode dar ao Investimento uma chance real de competir, mas se for alto demais só inverte qual dos dois sistemas domina o outro.
- Efeito pro jogador: adiciona uma escolha real sem tirar nada de quem já usa o Cofre.
- Risco de exploit: moderado — se mal calibrado, jogadores migram 100% do capital pra Investimento, recriando a mesma dominância na direção oposta.
- Complexidade: trivial tecnicamente (1 constante), mas a calibração exige simular contra o Cofre.

**C — Teto para os juros do Cofre** (juros só incidem até um valor guardado, o excedente não rende)
- Efeito econômico: limita o efeito bola-de-neve sem tirar o benefício básico pra quantias pequenas/médias; cria espaço real pro Investimento competir pelo excedente.
- Efeito pro jogador: personagens novos/médios não sentem diferença; personagens ricos passam a ter uma decisão real de alocação.
- Risco de exploit: baixo-moderado (jogadores podem tentar espalhar capital entre personagens/contas pra multiplicar o teto — exploit social, difícil de vedar só por dado).
- Complexidade: moderada — precisa de lógica nova no cálculo de juros, e decidir se o teto é fixo ou escala por tier de Cofre.

**D — Tiers/condições para os juros** (ex.: taxa varia por tier de Cofre, ou só tiers avançados rendem)
- Efeito econômico: liga o rendimento passivo a progressão (evoluir o Cofre), em vez de valer igual desde o tier inicial.
- Efeito pro jogador: personagens no início da campanha perdem o rendimento fácil que têm hoje — pode ser sentido como uma barreira nova cedo.
- Risco de exploit: baixo.
- Complexidade: moderada — `JUROS_COFRE_TAXA` hoje é uma constante única global, precisaria virar uma função do tier atual.

**E — Risco/recompensa nos Investimentos** (variar retorno com variância real, não valor fixo)
- Efeito econômico: transforma Investimento numa escolha de perfil de risco genuína, não um substituto pior do Cofre.
- Efeito pro jogador: dá uma ferramenta nova pra quem gosta de risco; quem prefere segurança continua com o Cofre, mas por preferência, não porque a outra opção é objetivamente pior sempre.
- Risco de exploit: depende inteiramente da calibração — variância mal desenhada (risco baixo, prêmio alto) recria a mesma dominância invertida.
- Complexidade: a mais alta das cinco — exige lógica nova de variância/rolagem, não só mudar uma constante.

Não escolho nenhuma.

---

## E. Moedas e Drops

**Interpretação A — o texto está certo, o dado do catálogo está errado** (drops deveriam usar `{"Lunaris": N}`)
- Consequências: preço de drops entra na faixa "moeda de giro", consistente com serem materiais de crafting consumidos com frequência; alinha os ~27 drops hoje resolvidos como Solares com os 24 que já usam Lunaris, eliminando a inconsistência interna da própria categoria `drop`. Mudança necessária: converter o campo `preco` dessas ~27 entradas pro formato dict.

**Interpretação B — o dado está certo, o texto está com o rótulo errado** (deveria dizer "S", não "L")
- Consequências: preço de drops fica na faixa "moeda de destino"; estranho para materiais básicos de criaturas comuns (carne, órgãos), que tipicamente deveriam usar a moeda mais acessível do jogo. Mudança necessária: só o texto de `regras.ts`.

**Peso da evidência:** a Interpretação A é mais consistente com o resto do sistema — materiais de crafting deveriam, em princípio, usar a moeda de giro (é o que `crafting.ts` pressupõe ao calcular custo de materiais como percentual do preço de referência do item, uma lógica de "consumível barato e recorrente"), e ela também resolveria uma inconsistência que já existe *dentro* da própria categoria `drop`, independente do texto de regras. Não foi possível, nesta etapa, cruzar item a item se há um padrão por raridade/espécie que justifique a mistura atual (ex.: drops "raros" propositalmente em Solares) — vale essa checagem antes de decidir.

---

## F. Terreno Baldio

Comparação entre as 5 propriedades: Casa Simples e Apartamento (ambas patamar Posto) batem exatamente com a fórmula de `bases.ts` (fator 1 × 100 = 100 Lunaris/mês); Loja Comercial (Sede) bate com fator 2 × 100 = 200; Terreno Baldio (Posto) mostra 50, metade do previsto.

Terreno Baldio é também a única propriedade sem `qualidadeQuartos` definida (campo vazio) e a mais barata em aquisição (700 Lunaris) — é, conceitualmente, a única propriedade do catálogo sem nenhuma estrutura construída: só terra. Um terreno vazio ter manutenção menor que uma construção pronta é uma lógica razoável mesmo sem regra explícita escrita — mas a fórmula publicada em `bases.ts` não tem nenhuma exceção redigida para "terreno sem estrutura"; ela é apresentada como universal por patamar.

**Conclusão:** os dados dão suporte moderado a "desconto intencional" (é a única propriedade nessa condição especial), mas nada nas regras publicadas confirma essa exceção — do jeito que está hoje, "erro" e "exceção válida" são indistinguíveis de fora, porque nenhuma das duas leituras tem evidência documental que a prove definitivamente.

**Se for exceção válida**, proposta de como documentá-la: adicionar uma nota em `bases.ts` do tipo "Terrenos sem estrutura construída pagam metade da manutenção do patamar (sem impostos de conservação de estrutura)" — e refletir a mesma nota como comentário/campo no item do catálogo, para que o valor não volte a parecer um erro numa auditoria futura.

---

## G. Decisões que precisam do designer

1. **Legados repetíveis** — confirmar `repetivel`/`limite` para Artista Marcial, Não é Tão Pesado e Rapidinho (e o limite exato de cada).
2. **Legado extra do Humano** — confirmar que é intencional e aprovar o texto da característica a documentar.
3. **Câmbio de Fragmentos de Estrela / Créditos Sombrios** — implementar de fato, ou remover a promessa do texto público.
4. **Moeda dos Drops** — Lunaris ou Solares, e alinhar as três fontes (texto, catálogo, formato de dado).
5. **Terreno Baldio** — erro ou desconto intencional; se intencional, aprovar a documentação da exceção.
6. **Orçamento de poder dos Legados** — decidir se os outliers de poder sem contrapeso de custo (Ossos Duros, Bala Ágil, Monstro, Código de Ética) merecem intervenção, ou se a diferença é aceitável dado que o catálogo comporta Legados de identidade por design.
7. **Código de Ética** — escolher entre manter como está, colocar teto, mudar pra crescimento por marcos, ou fixar um valor sem escala — e, à parte, esclarecer se ataques naturais de monstro contam como "desarmado" pra este Legado.
8. **Economia de veículos** — escolher entre Modelo A (economia unificada, implica reprecificar veículos) ou Modelo B (economia categórica, implica só documentar a separação).
9. **Cofre vs. Investimentos** — escolher entre reduzir juros do Cofre, aumentar retorno do Investimento, criar teto, criar tiers, ou adicionar risco/recompensa ao Investimento — ou aceitar conscientemente que Investimento seja uma opção secundária/narrativa.

Nenhuma mudança foi implementada nesta etapa.
