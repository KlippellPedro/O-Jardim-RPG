# Balanceamento e economia

Consolidado em **7 de setembro de 2026** e atualizado em **3 de outubro de 2026** (níveis além do 60, bestiário VD 1 a 500, saque das criaturas e comida por Árvore). Reúne auditoria, propostas, decisões e
implementação de agosto, com conferência das fontes locais citadas abaixo.
Os relatórios originais e suas simulações estão no [histórico](../HISTORICO.md#balanceamento).
Esta organização documental não altera números, regras ou aprovações.

<a id="decisoes-de-legados"></a>

## Decisões de Legados

| Assunto | Decisão implementada e conferida | Fonte |
| --- | --- | --- |
| Artista Marcial | Repetível, limite de 2 escolhas; mantém os demais pré-requisitos. | [legados.json](../../data/ficha/legados.json) |
| Não é Tão Pesado | Repetível, limite de 3 escolhas. | Mesmo catálogo. |
| Rapidinho | Repetível, limite de 2 escolhas; mantém o requisito de Destreza. | Mesmo catálogo. |
| Tô ficando bom, Bala Ágil e Mágico? | Pré-requisito de nível 5. A intervenção aprovada adiou o acesso, sem reescrever seus efeitos. | Mesmo catálogo. |
| Código de Ética | Dano adicional de metade do nível, arredondado para baixo, limitado a +30 contra oponente armado. O restante da descrição permanece aplicável. | Mesmo catálogo. |
| Legado racial adicional | A implementação de agosto documentou o bônus em Humano, Desperto, Auleth, Autômato, Clone, Amálgamo e Bruxa. O dado e a característica devem permanecer coerentes. | [racas.json](../../data/ficha/racas.json) |
| Seis Legados novos (Eco do Fluxo, Passo Entre Galhos, Memória do Eclipse, Vínculo Lunar, Segundo Tempo e Âncora da Árvore) | Oficiais. Não fazem parte dos 36 Legados confirmados nos PDFs originais, mas entram no mesmo catálogo de escolha do personagem (frontend e backend carregam `legados.json` e `legados-novos.json` juntos, sem distinção de status). Cada um já tem pré-requisito e limitador de uso (uma vez por cena, turno, sessão ou descanso, conforme o Legado); não há pendência de revisão editorial aberta. | [legados-novos.json](../../data/ficha/legados-novos.json) |

Não existe decisão aprovada nesses relatórios para refazer todo o catálogo com
um orçamento universal de poder. A classificação comparativa das propostas
é análise histórica, não uma nova categoria mecânica.

### Questões de Legados ainda separadas

- A interpretação de ataques naturais como “armado/desarmado” para Código de
  Ética não foi encerrada pela aprovação do teto de dano.
- A raça Entidade fica `indisponivel: true` por design: cada Entidade existe
  pelo próprio conto no Livro das Entidades (`data/mundo/entidades.ts`), e só
  o Escritor de Contos cria uma nova, no nível 20 (habilidade Último
  Capítulo). Não reaplicar a proposta antiga de “Legado extra”.

## Cofre e Investimentos

As escolhas aprovadas na fase de balanceamento continuam identificáveis em
[economia.py](../../bots/banqueiro/core/economia.py) e
[db.py](../../bots/banqueiro/core/db.py):

| Parâmetro | Referência no código |
| --- | --- |
| Base máxima remunerada pelo juro automático do Cofre | `JUROS_COFRE_TETO = 1000`. O excedente não compõe essa base; não é um limite de quanto se pode guardar. |
| Intervenção manual do mestre | `/juros_cofre` usa `sem_teto=True`, calculando sobre o saldo integral. |
| Investimento fora de crise | 70% de chance de retorno de +8%; 30% de retorno de −3%. |
| Investimento em crise | Retorno determinístico de −2%. |

As taxas operacionais configuráveis por servidor e o período de vencimento
devem ser consultados no bot. Não tratar as simulações de agosto como medição
da economia de uma campanha atual. O teto permanece uma constante global;
torná-lo configurável por servidor é uma evolução, não uma correção pendente
da implementação aprovada.

Capacidade, segurança, saque e roubo estão reunidos em
[Bots e Discord](BOTS_DISCORD.md#cofre-e-roubo). A fonte compartilhada dos níveis é
[cofre_seguranca_tiers.json](../../data/economia/cofre_seguranca_tiers.json).

## Moedas e preços: o que mudou depois dos relatórios

A implementação de agosto registrou **Modelo B — economia categórica** e a
retirada da promessa de câmbio de Fragmentos/Créditos. Essa descrição não
representa integralmente o checkout de setembro:

- `converter()` no Banqueiro converte Lunaris, Solares e Fragmentos de Estrela,
  passando por Solares. **Créditos Sombrios ficam fora do câmbio** (decisão do
  Pedro em 2026-10-03): são a moeda do mercado negro e não se trocam por Lunaris
  nem se compram com ele. A lavanderia, que era a única saída, foi encerrada no
  mesmo dia, e os Créditos que estavam lavando foram devolvidos.
- `CAMBIO_CHOICES` oferece essas três moedas no comando `/cambio`.
- O capítulo de economia em [regras.ts](../../data/regras/regras.ts) descreve o
  mesmo: câmbio de três moedas e Créditos sem câmbio.
- A precificação atual possui uma fonte própria:
  [escala-precos-v1.json](../../data/economia/escala-precos-v1.json), aplicada por
  [normalize-shop-prices.mjs](../../tools/normalize-shop-prices.mjs).

Na função atual, um Fragmento equivale a 50 Solares. Os padrões de
Lunaris/Solar e taxa são 100:1 e 2%; configurações do servidor podem alterar a
operação. São parâmetros de implementação do jogo, não taxas verificadas no
banco de uma campanha nesta revisão.

**Como os Créditos Sombrios entram e saem (decidido em 2026-10-03):** entram
por baús sombrios, recompensa do Mestre e pela venda de itens ao doleiro
(`/mercado_negro_vender`: 40% do valor do item em Créditos, com humor do dia de
85% a 115%; monstro, propriedade e veículo completo não se vendem). Saem só
gastos no mercado negro. Não há câmbio nem lavanderia. O 40% foi escolha minha e
pode subir ou descer em `DOLEIRO_FRACAO` (`core/economia.py`).

### Comparações de preços superadas

| Item | Número usado nos relatórios antigos | Base oficial conferida em setembro |
| --- | --- | --- |
| Chicote de Plasma (`arma-chicote-plasma`) | 2.800 Lunaris | 240 Lunaris, incomum. |
| Couraça Primordial | 3.000 Lunaris, tratada como bônus de Defesa | 65 Solares, lendária; descrição de Resistência 4 e aprovação do Mestre. |
| Vanguarda | 95 Lunaris | 960 Lunaris, rara. |

Fonte: [catalogo.json](../../data/loja/catalogo.json). Esses achados não podem
ser reaplicados com os preços ou efeitos antigos. Se a curva ainda precisar
de revisão, refazer a comparação usando o catálogo e a escala atuais. A
mudança dos dados não comprova, por si só, equilíbrio em mesa.

### Drops, materiais e propriedades

- A correção de agosto alinhou a tabela de partes de criaturas ao rótulo de
  Solares. Partes `drop-*` e componentes ritualísticos `comp-*` não são uma
  categoria homogênea cuja moeda deva ser trocada em bloco.
- `comp-marco-de-pedra` continua raro e custa 100 Lunaris. A exceção foi
  preservada; não há, nos documentos consolidados, autorização para substituí-la
  automaticamente pelo padrão de outros materiais raros.
- Terreno sem estrutura paga metade da manutenção correspondente ao fator do
  patamar. A exceção está em [bases.ts](../../data/regras/bases.ts); o Terreno
  Baldio tem manutenção 50 no catálogo. Não aplicar essa redução a toda base.
- Compra e ativação de veículo/propriedade são assuntos de
  [integração](INTEGRACAO.md#veiculos-e-propriedades), não motivo para reprecificar
  categorias inteiras pela simples conversão de moeda.

## Estamina: terceiro recurso (2026-09)

Poderes físicos deixaram de gastar Mana. A Mana ficou para o que é místico e a
Estamina paga golpe, postura, salto e esforço do corpo. Cansaço continua sendo
outra conta, sem ligação mecânica com a Estamina.

- **Orçamento:** cada classe gasta 9 pontos por nível em Vida + Mana + Estamina
  (era 7 em Vida + Mana). A Vida de cada classe não mudou; o aumento foi
  decisão deliberada. `npm run audit:balance` e `classProgression.test.ts`
  exigem 9 nas 29 classes, com Mana e Estamina no mínimo 1.
- **Fórmula:** Estamina base é 3 × o maior entre Mod.Força e Mod.Destreza, mais
  o ganho de Estamina da classe por nível. Fluxo não entra: é o atributo de
  controle mágico.
- **Custo de poder:** cada poder declara `custo_mana` ou `custo_estamina`, nunca
  os dois. Custo de habilidade vive só em texto (`descricao`, `usos`, `dano`).
- **Recuperação:** descanso completo e Relaxar devolvem Estamina junto com Mana.
  Efeitos de cura em massa citam Estamina; o Elixir de Mana e Isso é Bom
  seguem só em Mana.
- **Revisão de equilíbrio:** simulação de usos de poder por descanso, antes e
  depois, nos níveis 1, 5, 10 e 20. A distância entre a classe comum mais forte
  e a mais fraca caiu de 4,9x para menos de 3x, e o teste
  `estaminaBalanceamento.test.ts` trava esse limite. Médico (3/3/3),
  Cozinheiro (3/4/2), Piloto (4/4/1) e Caçador (4/3/2) foram reajustados depois
  da primeira divisão, que os deixava fracos ou fortes demais.
- **Conjuradoras:** ganharam menos (cerca de 1,2x), porque quase todo o ponto
  novo foi para a Mana e a Estamina ficou em 1. Elas ainda gastam Mana em
  magias, e a diferença é intencional.
- **Habilidades de classe:** o custo de ativação passou a ter campo próprio
  (`custo_mana` ou `custo_estamina`, no estágio ou na habilidade). O custo vale
  o do último estágio alcançado que declara um (Provocar sobe de 4 a 7), e a
  aba Habilidades mostra o selo de custo e o botão Usar, que debita o recurso.
  Custos que reduzem outro custo (Cartista, Elementarista) seguem só em texto.
- **Sessão ao Vivo:** participantes ganharam Estamina (atual, máxima e extra
  temporário, migração 44), com barra no HUD, edição pelo Mestre e espelho de
  volta na ficha. Uso de poder de Estamina debita o HUD como a Mana já fazia.
  Ficha que ainda não calculou a Estamina entra sem barra até o dono abri-la.
  Monstro do Bestiário entra sem Estamina; o Mestre preenche no editor.
- **Combate intenso automático:** ao iniciar o combate o servidor fotografa
  Vida, Mana e Estamina de cada participante e guarda o pior ponto (migração
  45); ao encerrar, quem desceu à metade da Vida, entrou em Morrendo ou gastou
  metade da Mana ou da Estamina ganha 1 de Cansaço (teto 6), uma vez por cena.
  O botão manual do Descanso continua para fora da sessão.
- **Raças:** o pacote racial ganhou o campo `estamina`, somado depois da
  fórmula de atributo, na raça, na variante escolhida, nos estágios e na
  natureza divina. Ganham Estamina as raças de corpo: Anão (+3), Gigante (+3,
  +3 e +8 nos estágios), Golem (+3, +3 e +8), Amálgamo (+3), Goblim (+2),
  Desperto (+2), Clone (+2), Anomalia (+2), Vampiro (+1, +3 e +4), Slime (+1,
  +2 e +6), Simbionte (variantes +1 e estágios +2 e +3), Animália (Ágil +2,
  Robusta +3), o chassi do Autômato (+2 a +5 por tamanho), o Divino (+1, Deus
  +4, estágios +1 e +2) e o estágio Sem Rosto do Mímico (+2). Raças de Mana,
  de sonho ou sem corpo (Elfo, Feérico, Espírito, Sereia, Bruxa, Onírico,
  Auleth) não ganham. O teste `estaminaRacial.test.ts` trava a lista.
- **Únicos passivos do Jardim (2026-10):** 27 Únicos que só mexem na ficha, para quem não quer lembrar de usar nada. Cada um traz `efeitos` em `data/jardim/unicos.json` e entra sozinho nos cálculos (mesmo motor dos itens e poderes). Escada de preço dentro das faixas de sempre: Simples 60 a 75 (+6 Vida, +4 Mana, +3 Estamina, +1 em Fortitude, Reflexos ou Vontade, +2 Iniciativa), Notável 150 a 210 (+12 Vida, +8 Mana, +6 Estamina, vantagem em Percepção ou Fortitude, +1 Defesa, +1 ataque), Extraordinária 330 a 420 (+2 em um atributo, que dá +1 no modificador, +20 Vida, vantagem em Reflexos e Vontade) e Lendária 700 a 900 (combos). Entre Únicos só o maior bônus de cada alvo vale, então a escada não vira pilha. O servidor espelha só Vida máxima (painel do Mestre) e Iniciativa (sessão), como já fazia com as habilidades de classe. Resistência a dano continua texto livre do Mestre, por isso as resistências daqui são as três perícias de teste.
- **Únicos do Jardim:** seis passaram a gastar Estamina (Golpe Sem Nome, Respiro
  Roubado, Corte que Lembra, Escudo Emprestado, Passo Fora do Tempo e Sombra
  que Aprende). O preço em Sementes não mudou.

## Níveis além do 60 (2026-09-29)

O nível total deixou de ter teto, por decisão do criador do jogo. O 60 continua
sendo o **padrão** (duas classes comuns e uma especial), mas a ficha não trava
nada acima dele: quem passa do 60 entra num patamar novo e recebe só avisos. O
servidor deixa de conferir a ordem das classes acima do padrão, mas **avisa o
Mestre** quando a ficha de um jogador passa do 60 e a cada patamar novo (100, 150,
250 e 500). Nada bloqueia, e um NPC pode ter o nível que a história pedir.

Todos os ritmos moram em [progressao-niveis.json](../../data/ficha/progressao-niveis.json),
lido pelo site ([progressaoNiveis.ts](../../src/services/progressaoNiveis.ts)) e
pela plataforma ([progressao_niveis.py](../../plataforma/core/progressao_niveis.py)).
Os dois lados têm testes com os mesmos valores de referência.

| Assunto | Decisão implementada |
| --- | --- |
| XP | `500 × N × (N − 1)` até o nível 100. Depois, um custo fixo por nível em cada faixa: 100 mil (100 a 149), 150 mil (150 a 249), 250 mil (250 a 499) e 500 mil (500 em diante). XP acumulado: 1,77 milhão no 60, 4,95 milhões no 100, 9,95 milhões no 150, 24,95 milhões no 250 e 87,45 milhões no 500. |
| Classe | Vai até o nível 50, e esse é o único teto duro: a ficha e o servidor não deixam uma classe passar dele (ficha antiga que já estava acima continua abrindo, mas não sobe). Não há limite de número de classes. As recompensas escritas terminam no 20. |
| Maestria (21 a 50 da classe) | Igual para as 29 classes, em [maestria-classe.json](../../data/ficha/maestria-classe.json): reforço de Vida, Mana e Estamina nos níveis 25, 35 e 45 (vale 2 níveis do perfil da própria classe) e +1 grau de perícia nos 30, 40 e 50. O orçamento de Graus de Treinamento no servidor inclui esses graus. |
| Graus de perícia | Doze graus, cada um +2 sobre o anterior: os sete de sempre (Iniciante +0 a Renomado +12) e cinco novos, um por patamar: Lendário +14 (nível 60), Mítico +16 (100), Cósmico +18 (150), Eterno +20 (250) e Absoluto +22 (500). Treino de 90, 120, 180, 270 e 365 dias, com feito, instrutor e item especial como ganchos de história (o servidor só confere o nível mínimo, e só avisa). Do Veterano em diante o grau também dá fontes de vantagem em todo teste da perícia (Veterano 1, Renomado 2, ... Absoluto 7; ficam em `vantagens` no mesmo JSON): como as fontes se cancelam uma a uma e não existe vantagem dupla, o que sobra é resistência a desvantagem. A referência de ataque acima do 60 já usa o grau novo (+2 sobre a tabela antiga nos níveis 60 e 80, +4 no 100 e +6 no 150 e no 200). |
| Valor de Desafio (VD) | O VD de uma criatura é o nível do grupo que ela desafia sozinha (VD 30 = criatura solo para um grupo de nível 30), de 1 a 1.000 (criaturas únicas podem passar do 100). As fichas do catálogo (hoje 165) migraram com VD = nível; o campo `nivel` continua gravado junto de `vd`, e os dois coincidem. O XP de uma criatura solo é um quinto do custo do nível de mesmo número (200 no VD 1, 2.000 no 10, 12.000 no 60, 20.000 no 100), somado e repartido entre os jogadores da cena. Cenas antigas foram convertidas pela migração 46 (VD antigo 1 a 10 vira 3, 8, 13, ..., 48). Criaturas de qualquer VD saem do gerador (`src/services/curvaCriatura.ts`, aba "Sob medida" do Bestiário da Sessão): ataque e testes iguais ao ataque de referência, Defesa 3 abaixo da natural, dano de 21% da Vida de um personagem, Vida como fatia da Vida de inimigo padrão por papel (solo 80%, lacaio 10%, padrão 25%, elite 50%, chefe 100%) e, acima do VD 40, multiplicada por VD/40. Os 10 "Modelo de Criatura" gravados foram removidos e o gerador ganhou seis arquétipos (Bruto, Ágil, Atirador, Conjurador, Defensor, Assassino) para variar as universais. Famílias, estágios e únicos moram em `data/bestiario/familias-v1.json` (as 121 fichas escritas à mão ficam "solo" e nunca são sobrescritas). Detalhes e medições em [plano-vd-e-magia-medicoes-2026-09.md](../plano-vd-e-magia-medicoes-2026-09.md). |
| Magia acima do 20 | Decidido em 2026-09-30 (medições em [plano-vd-e-magia-medicoes-2026-09.md](../plano-vd-e-magia-medicoes-2026-09.md)). **Vagas:** Canalizador, Sintonizador e Elementarista ganham +2 vagas de magia a cada 5 níveis do 25 ao 50 (22 no 50); Cartista Arcano +1 a cada 5 (12 no 50, círculo segue 2); Selos e Encantamentos +1 a cada 5 (Canalizador e Sintonizador) ou a cada 10 (Ritualista, Cartista). **Teto por círculo:** do nível 25 em diante, no máximo 4 magias do mesmo círculo (`teto_por_circulo` nos marcos de `classes.json`; abaixo do 25 não há teto). **Fluxo mínimo virou recomendação:** aprende-se qualquer círculo que a classe libera, a ficha avisa (`avisoDeFluxoDaMagia`) e o servidor não gera mais alerta; o portão real é a DT do círculo (7 + 3 × círculo). As Marcas de círculo seguem o círculo que o Fluxo sustenta. **Rolagem:** soma ⌊nível total ÷ 2⌋ como todo teste, senão o conjurador nunca vencia o teste de resistência de uma criatura do mesmo nível a partir do 50. |
| Criatura comprada ou contratada | Decidido em 2026-09-30. No Bestiário a Vida de uma criatura é a de um inimigo solo (aguenta o grupo inteiro); como aliado ela luta ao lado do grupo, então nasce com no máximo **2× a Vida média de um personagem do VD** (`vida_de_aliado`, `core/curva_criatura.py`, espelhado em `vidaDeAliado`). Um aliado de VD 20 passa de 410 para 160 de Vida, um de VD 50 de 1.320 para 428. O catálogo continua com a Vida de inimigo (é o que o Mestre usa) e a Loja mostra os dois números. O preço segue a escala de raridade e não mudou. |
| Relíquias da Criação | Decidido em 2026-09-30. As 17 armas ficaram 2,5× mais fortes (de 8d12+20 para 20d12+50, média 180 no topo; a mais fraca, 150), com crítico ×4 mantido, e os dados dos poderes numéricos (ressonâncias, Braço de Nuada, Coração de Ouroboros, Taça de Dioniso, Carruagem de Hélios) foram multiplicados na mesma proporção. São quebradas de propósito: a referência de balanceamento e a Vida das criaturas continuam contando a Relíquia no degrau antigo (72 por acerto, `DANO_DE_RELIQUIA_NA_REFERENCIA`). A fonte do texto é `tools/retrofit-creation-relics.mjs`. |
| Bestiário completo | Decidido em 2026-09-30. Há criatura em todos os VDs relevantes de 1 a 500: 44 fichas geradas em `data/bestiario/familias-propostas-v1.json` (5 famílias novas, estágios novos em famílias que já existiam, 9 únicas de VD 90 a 500 e criaturas avulsas). As geradas com `disponivelNaLoja: false` (as de VD alto e as únicas) ficam só no Bestiário, fora do balcão. |
| Saque das criaturas | Aprovado e implementado em 2026-10-03. Cada criatura do Bestiário tem uma tabela de saque (moedas e itens com chance, alguns exclusivos) em `data/bestiario/loot-criaturas.json`, **lida só pelo servidor**; o Mestre rola e entrega na Sessão ao vivo, escolhendo quem recebe. A tabela pode ser ajustada por campanha (`loot_campanha`), e as criaturas "sob medida" ganham uma tabela determinística pelo id. Os preços dos 147 itens `loot-*` seguem a escala de raridade. |
| Comidas por Árvore | Aprovado e implementado em 2026-10-03: 25 comidas e bebidas (`consumivel-*`) com atributo "Origem" ligando cada uma à sua Árvore, no catálogo e nos preços pela escala. A proposta está em [comida-por-arvore.md](../propostas/comida-por-arvore.md). |
| Legado | 1 a cada 5 níveis até o 50, a cada 10 até o 100 e a cada 20 depois (10, 11, 15, 20 e 35 Legados nos níveis 50, 60, 100, 200 e 500). Quem estava entre o 55 e o 60 perde 1 vaga em relação ao ritmo antigo; no servidor isso só gera alerta. |
| Aumento de atributo e vaga de item especial | +1 a cada 4 níveis até o 50, a cada 8 até o 100 e a cada 16 depois. A ficha mostra "aumentos pelo nível: X de Y usados" (informativo). O teto do servidor para itens especiais passou a contar o nível real de cada classe; antes cortava cada uma em 20. |
| Atributos | O limite natural 20 acabou. Os tetos raciais de atributo (Elfo, Auleth, Autômato, Clone, Anomalia, Amálgamo, Bruxa, Onírico e Divino) saíram do `racas.json`. O mecanismo de teto por raça continua no código, sem dados usando. Corrigi junto um erro latente: sem teto declarado, o site descartava o bônus racial. |
| Bônus de nível | Continua `⌊nível ÷ 2⌋`. Um nível 60 só acerta um nível 200 num 20 natural, o que é intencional. |
| Patamares | 60, 100, 150, 250 e 500, alinhados às faixas de XP. Cada um tem uma Conquista (Fora do Padrão, Três Dígitos, Além da Conta, Fora do Mapa e Sem Teto), um selo na ficha (Patamar I a V) e uma moldura de retrato e cartaz (Mítico, Cósmico, Eterno e Absoluto do 100 em diante). |
| Recomendação de mesa | Para a 4ª classe em diante, o menor atributo do personagem em 12, 13, 14 e 15 (4ª a 7ª). Está só no Guia do Mestre; a ficha não confere. |

A **referência de balanceamento** foi refeita sobre a mesma fórmula da ficha
(`calcularDerivadosComClasses`). A versão anterior tinha uma fórmula própria e
superestimava a Vida em 20 a 40% (o Guerreiro no nível 20 saía com 149; a ficha
dá 108). O relatório agora vai do nível 1 ao 200 e traz, por nível, Vida, Defesa,
ataque, dano por acerto, DT e a **Vida de inimigo padrão** (a que aguenta quatro
rodadas e meia de um grupo de quatro). Ele é gerado por `npm run audit:balance`
e conferido por `npm run check:balance` e por um teste. As premissas (atributo
principal 15, aumentos em rodízio, arma por raridade, maior grau permitido) estão
no próprio relatório e em
[referenciaBalanceamento.ts](../../src/services/referenciaBalanceamento.ts).

Leituras que a tabela deixa claras, sem mudança de regra:

- O dano da arma para no nível 35 (relíquias da criação, 72 de média). Depois
  disso o dano por acerto só sobe pelo modificador de atributo, e a Vida de
  inimigo padrão fica perto de 1.350 dos níveis 40 a 200, enquanto a Vida dos
  personagens continua subindo.
- Do nível 29, quem investe na perícia de combate acerta uns 95% contra um
  inimigo do mesmo nível. A Defesa da tabela é natural, sem armadura.
- O bestiário vai até o nível 50 e acompanha a curva: mediana de 1.490 de Vida na
  faixa 41–50, contra 1.320 da referência.

## Pendências para a próxima revisão de design

| Questão | Próximo passo |
| --- | --- |
| Créditos Sombrios fora do câmbio | Decidido e aplicado em 2026-10-03, junto com o fim da lavanderia e a venda de itens ao doleiro (ver acima). Resta calibrar a fração do doleiro com dados de uso. |
| Código de Ética contra ataques naturais | Definir o significado de armado/desarmado, sem alterar silenciosamente o teto já aprovado. |
| Exceção do Marco de Pedra | Manter até uma decisão específica de preço; comparar com os componentes atuais. |
| Juros, risco e concentração de patrimônio | Calibrar com dados de uso; números de simulação antiga não substituem acompanhamento de campanha. |
| Modificações aplicadas a veículos e distinção de escudos | Ver as decisões ainda abertas em Integração. |
| Economia acima do nível 50 | Salário, recompensa de missão e faixas de preço não têm linha própria depois do 50 (a linha "50+" da tabela de trabalho é a última). |
| Criaturas de VD alto reescritas | Em 2026-10-03 as 28 criaturas de VD 45 em diante ganharam nome próprio, descrição, nomes de ataque e habilidades com personalidade (inspiradas em mitologia, RPG de mesa e nos monstros únicos de Shangri-La Frontier: nome, epíteto, consequência no mundo se cair, ponto fraco). Ids, famílias, números e tabelas de saque não mudaram. As habilidades novas moram só no catálogo; `familias-propostas-v1.json` espelha títulos, descrições e nomes de ataque. |
| Fichas das Deidades | Feitas em 2026-10-03, só no Guia do Mestre (capítulo Somente Mestre): onze fichas com dois degraus (VD 500 fora do Domínio, VD 1000 dentro; A.X.I.S um degrau abaixo, 400 e 800), Perfil (Vida, Defesa e Iniciativa ajustadas ao conceito), Ápice, três poderes com custo de Mana (150 por Ação Padrão, 75 por Reação), Limite (da lista de limites do Fluxo), Contrajogo (da roda de vantagens) e Dom (o Fruto). Keryx entra pela metade enquanto subjugada. Revisadas no mesmo dia: poderes sem frequência ganharam limite por rodada ou cena, os que eram quase abate automático (Saída, Escrever o Fim) ganharam condição, e o que era lore inventado no campo Estado foi reduzido ao que o Códice diz. Também estão no Bestiário da Sessão, só para o Mestre. |
| Chefes e criaturas do nível 55 em diante | Há criatura em todos os VDs relevantes até 500 (44 fichas geradas em 2026-09-30, entre elas 9 únicas), mas as geradas têm números e texto padronizados. Falta escrever à mão rosto e habilidades dos chefes mais importantes. O botão "Escalar para outro VD" do editor da Sessão (3 de outubro) já cobre o resto: refaz os números de uma criatura em cena pela curva sem trocar quem ela é. |
| Legados nos níveis muito altos | O catálogo tem 42 Legados e nem todos se repetem; passa a faltar perto dos 500 níveis. |
| Regra da segunda classe comum | O livro dizia "classe 20 exige outra no 10"; o servidor exige uma classe no 20 antes da segunda comum. O texto foi alinhado ao servidor. Confirmar se essa é a intenção. |

## Fontes e verificações

Alterações de mecânica devem atualizar os dados e os respectivos consumidores,
não somente este texto. [GUIA_MANUTENCAO.md](../GUIA_MANUTENCAO.md) reúne geração
e validação. As coberturas relacionadas incluem
[test_character_rules.py](../../plataforma/tests/test_character_rules.py),
[test_economia.py](../../bots/banqueiro/tests/test_economia.py),
[test_cofre_tiers.py](../../plataforma/tests/test_cofre_tiers.py) e
[shopCatalogIntegrity.test.ts](../../tests/frontend/shopCatalogIntegrity.test.ts).

As contagens de testes, comparações de dano e simulações dos relatórios de
agosto pertencem às versões daquela época e estão preservadas no histórico.
