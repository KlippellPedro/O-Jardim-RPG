# Auditoria de Design e Balanceamento — Legados, Veículos/Propriedades e Economia da Loja (2026-08)

**Natureza desta etapa: somente leitura.** Nenhum arquivo de código ou dado foi alterado. Todos os achados abaixo foram extraídos diretamente de `data/ficha/legados.json`, `data/ficha/legados-novos.json`, `data/loja/catalogo.json`, `data/regras/*.ts`, `data/economia/cofre_seguranca_tiers.json` e do código de `bots/banqueiro/core/economia.py` / `plataforma/`. Onde algo está consistente, isso é dito explicitamente — não há achados inventados para preencher espaço.

---

## 1. Legados

### 1.1 Falta de orçamento de poder — Legados de mesmo custo têm força mecânica muito desigual

**Evidência concreta:**
- No mesmo degrau de pré-requisito (nível ≥ 6), **Ossos Duros** ("Recebe 5 de redução a danos físicos", incondicional, sempre ativo) convive com **Desonroso** ("vantagem em ataque e +4 pra desviar" — só funciona contra oponentes *desarmados*, uma condição rara e cada vez mais rara à medida que o personagem sobe de nível e enfrenta inimigos mais equipados). Redução de dano incondicional é substancialmente mais forte e mais geral do que um bônus situacional contra um subconjunto estreito de inimigos, mas os dois custam exatamente 1 vaga de Legado.
- **Bala Ágil** ("adiciona seu modificador de Destreza no dano de armas à distância") **não tem nenhum pré-requisito** e está disponível já no primeiro marco (nível 5) — é, na prática, um bônus de dano comparável ao de uma característica de classe inteira em builds de Destreza, custando o mesmo que **Leitura Labial** ou **Selvagem**, que têm impacto mecânico ~zero fora de cenas muito específicas.
- Todos os 42 Legados custam exatamente 1 vaga (não há Legados "menores"/"maiores", nem uma escala de custo por poder), e o único filtro de acesso é o pré-requisito (nível/atributo/perícia) — que mede *dificuldade de qualificação*, não *força do efeito*.

**Recomendação:** revisar os Legados sem contrapeso (Ossos Duros, Bala Ágil, Monstro, Sou Bom Nisso) contra os situacionais/fracos de custo igual (Leitura Labial, Selvagem, Sortudo pra Cacete, Já fui CLT) e decidir entre (a) elevar o pré-requisito dos mais fortes para um marco de nível mais alto, (b) dar aos mais fracos um efeito secundário que os torne competitivos, ou (c) aceitar formalmente que existem Legados "de sabor" que ninguém escolhe por poder — o que é uma escolha de design legítima, mas vale documentar como intencional.

### 1.2 "Código de Ética" é o único Legado com bônus que escala linearmente com o nível do personagem

**Evidência concreta:** o texto do Legado é "Você se torna incapaz de atacar seres desarmados. Porém, se o oponente estiver armado, seus ataques causam **dano adicional igual ao seu nível** e você sempre age antes dele na iniciativa." Nenhum outro Legado do catálogo (nos 42 revisados) tem um bônus numérico que cresce com o nível — todos os outros são valores fixos (+1, +2, +4, +5, "dobra o modificador", RD 5, etc.). Em nível 6 (pré-requisito mínimo) isso já é +6 de dano por ataque; em nível 60 (teto do sistema) é +60 de dano por ataque, incondicionalmente sempre que o alvo estiver armado — a esmagadora maioria dos combates de nível alto.

**Recomendação:** decidir explicitamente se essa escala linear é intencional (compensando a restrição de não poder atacar desarmados, que é uma restrição narrow e raramente relevante em combate real) ou se deveria ter um teto, já que nenhum outro Legado no sistema foi desenhado para crescer com o nível — vale conferir isoladamente contra a tabela `balanceamento-referencia-v1.json` do sistema de combate, que este relatório não teve motivo para reabrir.

### 1.3 Divergência entre o texto publicado e a validação técnica sobre repetição de Legados

**Evidência concreta:** três Legados descrevem escolha repetida no próprio texto — **Artista Marcial** ("caso escolha uma segunda vez, recebe a outra [proficiência] que não foi escolhida"), **Não é Tão Pesado** ("Escolhendo uma segunda vez, a penalidade reduz em 3; escolhendo uma terceira vez, conta para ambos") e **Rapidinho** ("Escolhendo uma segunda vez, aumenta em 6m adicionais"). Nenhum dos três tem os campos `limite` ou `repetivel` definidos em `data/ficha/legados.json` (confirmado por grep — nenhuma dessas chaves existe em nenhum dos 42 Legados). A validação técnica (`plataforma/core/character_summary.py`, regra: limite efetivo = 1 quando `limite`/`repetivel` não estão setados) **bloqueia hoje a segunda escolha** desses três Legados, mesmo que a regra publicada diga explicitamente que ela é permitida.

**Recomendação:** decisão de dados, não de código — adicionar `"repetivel": true` (e opcionalmente `"limite": 2` ou `3`) às três entradas do catálogo pra alinhar o dado com o texto já publicado. Como isso é edição de dado de jogo (mudaria comportamento), não fiz a alteração nesta etapa somente-leitura.

### 1.4 Humano ganha um Legado extra sem nenhuma característica nomeada explicando o bônus

**Evidência concreta:** 10 raças têm o campo `legados_adicionais: 1`. Em Elfo, isso é uma característica pública nomeada e descrita ("Herança Ancestral: Ao adquirir esta raça, receba um Legado adicional"); em Errante, idem ("Legado de Outra História"). Em **Humano**, o campo `legados_adicionais: 1` existe no JSON mas **não corresponde a nenhuma entrada em `caracteristicas`** — a única característica pública do Humano é "Adaptabilidade" (perícia extra na criação), que não menciona Legado nenhum. Um jogador lendo a descrição pública da raça Humano não veria, em lugar nenhum, que ela concede um Legado extra — um benefício mecânico real (mais uma vaga de Legado é, dado o achado 1.1, potencialmente muito valiosa) fica invisível.

**Recomendação:** adicionar uma característica nomeada ao Humano equivalente à de Elfo/Errante, ou remover o campo se for resquício de um rascunho anterior — qualquer uma das duas é uma correção de dado simples, mas decidir qual é intenção de design, não deste relatório.

### 1.5 Sinergia notável (não é um problema, é um registro)

Elfo combina Inteligência até 24 (teto elevado só para essa raça), um Legado extra (Herança Ancestral) e seis Linhagens com habilidades de cena fortes — é a raça mais naturalmente encaixada para escolher **Mágico?** (vantagem para resistir/conjurar) e **Mágico!** (concentração reduzida), ambos sem pré-requisito. Não há nada de errado nisso — raças com foco definido combinando com Legados do mesmo foco é esperado — mas vale que quem for balancear magia saiba que Elfo é o ponto de maior densidade de sinergia do catálogo atual.

### 1.6 O que está consistente

- A fórmula de vagas (`nivel_total // 5 + legados_adicionais_da_raça`) e a trava de irreversibilidade ("Legado escolhido não volta atrás", só o Mestre remove por erro de criação ou mudança oficial) estão implementadas exatamente como o texto publicado em `regras.ts` descreve — sem divergência.
- A checagem de pré-requisito "no momento da escolha, não depois" (perder o requisito não tira o Legado) também bate entre texto e código.
- Marca/Cicatriz contarem como Legado para efeitos que os referenciam, sem consumir vaga, é uma regra clara e sem contradição em nenhum outro lugar do sistema revisado.

---

## 2. Veículos e Propriedades

### 2.1 Veículos (Lunaris) ficam muito abaixo de equipamento pessoal lendário (Solares) quando convertidos pela taxa oficial do jogo

**Evidência concreta:** o câmbio oficial, implementado em código (`CAMBIO_RATE_PADRAO = 100`) e publicado em `regras.ts` ("100 Lunaris → 1 Solar"), diz que **100 Lunaris valem 1 Solar**. O veículo mais caro do catálogo, o **Cruzador de Transporte "Baleia Branca"** (colossal, tripulação até 4, capacidade 20, hangar para 2 veículos pequenos, lendário) custa 250.000 Lunaris — ou seja, **2.500 Solares** pela taxa oficial. As armas lendárias mais caras do catálogo (Murasame, Masamune, Lâmina Monomolecular, Mjölnir, Gungnir) custam entre 100.000 e 150.000 **Solares** cada. Pela conversão oficial do próprio jogo, uma nave capital lendária, tripulada, com hangar, custa **cerca de 1/60 do preço de uma única espada lendária pessoal** (150.000 ÷ 2.500 = 60×). Não há, em nenhum arquivo de regras revisado, uma ressalva dizendo que veículos ficam fora do câmbio padrão — a taxa de 100:1 é apresentada como universal.

**Recomendação:** essa é uma decisão de balanceamento real, não um bug de código — os dois caminhos plausíveis são (a) veículos de ponta deveriam estar precificados na faixa Solares, não Lunaris, para refletir o peso narrativo/mecânico de "nave capital lendária", ou (b) registrar explicitamente que veículos usam uma economia separada e a taxa de câmbio Lunaris↔Solares não deve ser usada pra comparar as duas categorias (nesse caso, convém deixar isso escrito em `regras.ts`, porque hoje um jogador atento pode notar a mesma discrepância que este relatório notou).

### 2.2 Manutenção de "Terreno Baldio" não bate com a fórmula publicada para Propriedades

**Evidência concreta:** `data/regras/bases.ts` define "1 Unidade de Manutenção = 100 Lunaris/mês" e o patamar "Posto" tem fator de manutenção 1 — ou seja, a fórmula prevê 100 Lunaris/mês para qualquer propriedade de patamar Posto sem instalações. Três das quatro propriedades de patamar Posto no catálogo batem exatamente com isso (Casa Simples: 100, Apartamento na Metrópole: 100), mas o **Terreno Baldio**, também patamar Posto, tem `manutencao: 50` no catálogo — metade do valor previsto pela própria fórmula do sistema.

**Recomendação:** ou o valor de Terreno Baldio é um desconto intencional (terreno vazio sem estrutura custa menos manutenção que uma construção pronta — argumento razoável), ou é um valor desatualizado que não foi recalculado quando a fórmula de `bases.ts` foi fixada. Vale confirmar a intenção; se for desconto proposital, documentar o porquê evitaria que pareça um erro de novo no futuro.

### 2.3 O que está consistente

- O fluxo de compra→migração (item de loja vira entidade de campanha só num segundo passo manual, tanto para veículo quanto para propriedade) já foi registrado como decisão deliberada na etapa anterior (ver `implementacao-final-pos-validacao-2026-08.md`) — a lógica dos dois sistemas é paralela e coerente entre si (mesmo padrão de permissões em 4 níveis, mesma auditoria, mesma publicação em tempo real).
- Propriedades não terem estatística de combate/defesa embutida no item da Loja é consistente com o próprio design modular do sistema: defesa de propriedade vem da instalação "Segurança" (comprada à parte via `bases.ts`, com DT de invasão crescente por nível), não do item base — isso não é uma lacuna, é a divisão de responsabilidade que o próprio sistema de Bases descreve.
- Dentro da categoria de veículos completos, a variação de preço entre modelos do mesmo patamar de raridade (ex.: Moto-Flutuadora Ciclone vs. Jipe Pioneiro, ambos incomuns) reflete trocas defensáveis de papel — velocidade/manobrabilidade contra resistência/capacidade — sem um modelo estritamente dominante sobre o outro que este relatório tenha conseguido identificar com evidência sólida.

---

## 3. Economia da Loja

### 3.1 Juros do Cofre dominam estritamente o sistema de Investimentos — Investimentos é hoje uma opção estritamente pior

**Evidência concreta:** os juros automáticos do Cofre (`JUROS_COFRE_TAXA = 0.02`, aplicados a cada 24h sobre qualquer saldo guardado, sem risco, sem prazo de carência, só uma taxa de saque de 3% se e quando o jogador sacar) rendem, compostos por 7 dias, **(1,02)⁷ ≈ +14,9%**. O sistema formal de **Investimentos** ("Títulos do Jardim"), que exige travar o dinheiro por um prazo fixo de 7 dias e carrega risco de rendimento negativo (-2% se a guild estiver em "Crise Econômica"), rende **+5% fixo** no mesmo período, em condição normal. Ou seja: guardar dinheiro sem fazer nada no Cofre rende quase 3× mais que investir formalmente, com zero risco e liquidez muito melhor (basta pagar 3% pra sacar a qualquer momento, contra ficar travado 7 dias no Investimento). Não existe nenhum cenário em que Investir seja financeiramente melhor que só guardar no Cofre.

**Recomendação:** esse é um "sistema morto" — nenhum jogador racional usaria Investimentos do jeito que as duas taxas estão hoje. Os caminhos plausíveis: reduzir os juros automáticos do Cofre, aumentar o rendimento do Investimento, ou introduzir alguma limitação nos juros do Cofre (ex.: só incidir até um teto, ou exigir tier de Cofre alto) que o Investimento não tenha, criando um motivo real pra escolher um ou outro.

### 3.2 Duas das quatro moedas do jogo têm taxa de câmbio publicada mas nenhuma implementação

**Evidência concreta:** `regras.ts` (seção de economia do livro público) publica explicitamente "1000 Solares → 1 Fragmento de Estrela (1000:1)" e "Créditos Sombrios → Câmbio flutuante". A função de câmbio real do sistema (`converter()`, em `bots/banqueiro/core/economia.py`) só aceita o par Lunaris↔Solares — qualquer tentativa de conversão envolvendo Fragmentos de Estrela ou Créditos Sombrios levanta `ValueError` ("Por enquanto o câmbio só funciona entre Lunaris e Solares"). As duas moedas existem só como custo fixo de itens específicos (implantes em Créditos Sombrios, artefatos/relíquias em Fragmentos de Estrela) — são economias isoladas sem ponte pra dentro do resto do jogo, apesar do texto publicado prometer que essa ponte existe.

**Recomendação:** ou implementar as conversões que o texto já promete, ou tirar a promessa do texto público até que exista intenção real de implementar — hoje um jogador que lê as regras espera poder trocar Solares por Fragmentos de Estrela e não consegue.

### 3.3 Preço de Drops rotulado como Lunaris no texto de regras, mas resolvido como Solares no catálogo real

**Evidência concreta:** a tabela de preço de Drops de Seres em `regras.ts` (Bestiário) rotula os valores com sufixo "L" — ex. "Humano Carne 10L". A entrada correspondente no catálogo real (`drop-humano-carne`) tem `"preco": 10` como número puro, que a função `resolver_preco()` do Banqueiro resolve como **Solares**, não Lunaris (número puro = Solares nativo; só um objeto `{"Lunaris": N}` resolveria como Lunaris). Ou o texto do livro de regras está rotulando errado, ou o dado do catálogo deveria estar no formato de dicionário para ser Lunaris de verdade — as duas fontes discordam sobre em que moeda esses itens deveriam custar.

**Recomendação:** decidir qual das duas fontes está certa (o padrão de preço baixo — 5 a 250 — é plausível tanto em Lunaris quanto em Solares, então não dá pra inferir pela ordem de grandeza) e corrigir a outra.

### 3.4 O que está consistente

- O preço de encomenda de modificação por "valor" de efeito (`PRECO_MODIFICACAO_POR_VALOR` em `raridadesEquipamentos.ts`: 25/60/180/450 Lunaris) bate exatamente com o mínimo, os degraus e o máximo observados nas 51 modificações reais do catálogo — sem divergência.
- Os tiers de Cofre e de Segurança escalam de forma monotônica e coerente tanto em capacidade/defesa quanto em custo e em reputação necessária — não há tier fora de ordem ou custo que reduza uma capacidade anterior.
- O preço médio por raridade cresce de forma consistente dentro de cada moeda (comum < incomum < raro < épico < lendário), com a ressalva já esperada de que os tipos `monstro` e `drop` usam lógica de precificação estruturalmente diferente da de equipamento comprável — misturar as duas escalas ao comparar raridades cross-tipo explica a maior parte da sobreposição observada nos extremos, e não é, por si, um problema de balanceamento.

---

## Resumo — achados por gravidade

| # | Achado | Sistema | Tipo |
|---|---|---|---|
| 3.1 | Juros do Cofre tornam Investimentos uma opção estritamente pior | Economia | Sistema fraco / dominância estrita |
| 2.1 | Veículos lendários custam ~1/60 de uma arma lendária pela taxa de câmbio oficial | Veículos | Inconsistência de preço entre moedas |
| 1.1 | Legados de mesmo custo (1 vaga) têm poder muito desigual, inclusive dentro do mesmo pré-requisito | Legados | Falta de orçamento de poder |
| 1.2 | Código de Ética é o único Legado que escala linearmente com o nível | Legados | Outlier de escala |
| 3.2 | Fragmentos de Estrela e Créditos Sombrios sem câmbio implementado, apesar de prometido no texto | Economia | Regra publicada sem implementação |
| 1.3 | 3 Legados descritos como repetíveis no texto, bloqueados como não-repetíveis no dado | Legados | Divergência texto vs. dado |
| 3.3 | Preço de Drops rotulado "L" no texto, resolvido como Solares no catálogo | Economia | Divergência texto vs. dado |
| 1.4 | Humano ganha Legado extra sem característica pública que o documente | Legados | Lacuna de documentação |
| 2.2 | Manutenção de Terreno Baldio não bate com a fórmula publicada de Propriedades | Veículos/Propriedades | Divergência numérica pontual |

Nenhuma alteração foi feita. Este relatório é a base para decisões de balanceamento a serem tomadas separadamente.
