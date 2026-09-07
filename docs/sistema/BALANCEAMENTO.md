# Balanceamento e economia

Consolidado em **7 de setembro de 2026**. Reúne auditoria, propostas, decisões e
implementação de agosto, com conferência das fontes locais citadas abaixo.
Os relatórios originais e suas simulações estão no [histórico](../HISTORICO.md#balanceamento).
Esta organização documental não altera números, regras ou aprovações.

## Decisões de Legados

| Assunto | Decisão implementada e conferida | Fonte |
| --- | --- | --- |
| Artista Marcial | Repetível, limite de 2 escolhas; mantém os demais pré-requisitos. | [legados.json](../../data/ficha/legados.json) |
| Não é Tão Pesado | Repetível, limite de 3 escolhas. | Mesmo catálogo. |
| Rapidinho | Repetível, limite de 2 escolhas; mantém o requisito de Destreza. | Mesmo catálogo. |
| Tô ficando bom, Bala Ágil e Mágico? | Pré-requisito de nível 5. A intervenção aprovada adiou o acesso, sem reescrever seus efeitos. | Mesmo catálogo. |
| Código de Ética | Dano adicional de metade do nível, arredondado para baixo, limitado a +30 contra oponente armado. O restante da descrição permanece aplicável. | Mesmo catálogo. |
| Legado racial adicional | A implementação de agosto documentou o bônus em Humano, Desperto, Auleth, Autômato, Clone, Amálgamo e Bruxa. O dado e a característica devem permanecer coerentes. | [racas.json](../../data/ficha/racas.json) |

Não existe decisão aprovada nesses relatórios para refazer todo o catálogo com
um orçamento universal de poder. A classificação comparativa das propostas
é análise histórica, não uma nova categoria mecânica.

### Questões de Legados ainda separadas

- A interpretação de ataques naturais como “armado/desarmado” para Código de
  Ética não foi encerrada pela aprovação do teto de dano.
- A raça Entidade continua `indisponivel: true`, sem características no
  catálogo atual. Não reaplicar automaticamente a proposta antiga de “Legado
  extra” antes de definir seu pacote racial.
- Eco do Fluxo, Passo Entre Galhos, Memória do Eclipse, Vínculo Lunar, Segundo
  Tempo e Âncora da Árvore não devem ser descritos genericamente como “sem
  limitadores”: a revalidação de agosto corrigiu esse diagnóstico. A revisão
  editorial de balanceamento dos seis é uma questão distinta da existência
  de limites no texto de [legados-novos.json](../../data/ficha/legados-novos.json).

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

## Pendências para a próxima revisão de design

| Questão | Próximo passo |
| --- | --- |
| Câmbio ampliado versus textos e premissas antigas | Confirmar a intenção atual e alinhar as fontes contraditórias identificadas acima. |
| Código de Ética contra ataques naturais | Definir o significado de armado/desarmado, sem alterar silenciosamente o teto já aprovado. |
| Raça Entidade | Desenvolver seu pacote antes de liberar seleção ou documentar bônus que não está no dado atual. |
| Revisão dos seis Legados novos | Avaliar os limites já existentes, em vez de partir do diagnóstico inicial corrigido. |
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
