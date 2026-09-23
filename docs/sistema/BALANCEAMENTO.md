# Balanceamento e economia

Consolidado em **7 de setembro de 2026**. Reúne auditoria, propostas, decisões e
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
- A raça Entidade continua `indisponivel: true`, sem características no
  catálogo atual. Não reaplicar automaticamente a proposta antiga de “Legado
  extra” antes de definir seu pacote racial.

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

- `converter()` no Banqueiro aceita as quatro moedas, passando por Solares.
- `CAMBIO_CHOICES` oferece as quatro opções no comando `/cambio`.
- O capítulo de economia em [regras.ts](../../data/regras/regras.ts) também
  descreve a conversão entre os quatro tipos.
- A precificação atual possui uma fonte própria:
  [escala-precos-v1.json](../../data/economia/escala-precos-v1.json), aplicada por
  [normalize-shop-prices.mjs](../../tools/normalize-shop-prices.mjs).

Na função atual, um Fragmento equivale a 50 Solares e um Crédito Sombrio a 2
Solares. Os padrões de Lunaris/Solar e taxa são 100:1 e 2%; configurações do
servidor podem alterar a operação. São parâmetros de implementação do jogo,
não taxas verificadas no banco de uma campanha nesta revisão.

**Ponto a reconciliar:** ainda há texto em `regras.ts` dizendo que Créditos
Sombrios “não se compram com Lunaris”, e o comentário acima de `CAMBIO_CHOICES`
ainda diz que só duas moedas são suportadas. Ambos divergem da função e da
lista atuais. A documentação consolidada registra a divergência; não escolhe
uma regra nova nem restaura a restrição antiga. Antes de novo balanceamento,
confirmar a intenção e alinhar essas redações com a conversão efetiva.

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
- **Únicos do Jardim:** seis passaram a gastar Estamina (Golpe Sem Nome, Respiro
  Roubado, Corte que Lembra, Escudo Emprestado, Passo Fora do Tempo e Sombra
  que Aprende). O preço em Sementes não mudou.

## Pendências para a próxima revisão de design

| Questão | Próximo passo |
| --- | --- |
| Câmbio ampliado versus textos e premissas antigas | Confirmar a intenção atual e alinhar as fontes contraditórias identificadas acima. |
| Código de Ética contra ataques naturais | Definir o significado de armado/desarmado, sem alterar silenciosamente o teto já aprovado. |
| Raça Entidade | Desenvolver seu pacote antes de liberar seleção ou documentar bônus que não está no dado atual. |
| Exceção do Marco de Pedra | Manter até uma decisão específica de preço; comparar com os componentes atuais. |
| Juros, risco e concentração de patrimônio | Calibrar com dados de uso; números de simulação antiga não substituem acompanhamento de campanha. |
| Modificações aplicadas a veículos e distinção de escudos | Ver as decisões ainda abertas em Integração. |

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
