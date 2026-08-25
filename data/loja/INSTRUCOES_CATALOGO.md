# Como completar o catálogo do Banqueiro

Este guia explica o formato, a disponibilidade por local e a manutenção do
catálogo da Loja.

## Formato de um item (schema da Loja)

Cada item é um objeto assim (o mesmo schema do site, em `data/loja`):

```json
{
  "tipo": "arma",
  "id": "espada-longa",
  "titulo": "Espada Longa",
  "conteudo": {
    "descricao": "texto de abertura obrigatório",
    "preco": 10,
    "raridade": "comum",
    "nivelMinimoLoja": 1,
    "atributos": ["1d8 de dano", "Crítico 18-20/x2"],
    "dano": "1d8",
    "margem_ameaca": 18,
    "multiplicador_critico": 2,
    "critico": "18-20/x2"
  }
}
```

- **tipo:** um de `arma`, `armadura`, `equipamento`, `modificacao`, `consumivel`,
  `artefato`, `fruto-eden`, `implante`, `veiculo`, `veiculo-completo`, `monstro`
  ou `drop`.
- **id:** slug único (minúsculas, com hífens). IDs repetidos são rejeitados na publicação.
- **preco:** número (preço nativo em **Solares**) **ou** objeto com exatamente
  uma moeda, como `{"Lunaris": 40}`. Nunca declare duas moedas no mesmo preço.
- **preco_original + promocao:** não escreva estes dois campos à mão. A
  vitrine "Ofertas em destaque" é 100% calculada pelo servidor a cada
  requisição (`plataforma/core/promotions.py`): a cada janela de 12h, cada
  item elegível (arma, armadura, equipamento, modificação, consumível,
  veículo, artefato — nunca Mítico, Relíquia da Criação, Fruto do Éden,
  monstro, drop ou propriedade) tem uma chance determinística de entrar em
  oferta, com desconto de 10% a 30%. `GET /loja/catalogo` já injeta
  `preco_original` e `promocao` na resposta pros itens sorteados, e
  `POST /loja/compras` cobra o mesmo preço com desconto que a vitrine
  mostrou. O catálogo estático nunca deve ter esses dois campos.
- **raridade:** `comum | incomum | raro | epico | lendario | mitico |
  reliquia da criacao` (acentos e maiúsculas também são aceitos; `reliquia`
  permanece como chave legada de `mitico`). Valor ausente ou desconhecido é
  rejeitado pela auditoria e aparece como `Desconhecida` na interface.
- **nivelMinimoLoja:** inteiro obrigatório de `1` a `4`. É a primeira loja em
  que o item aparece; lojas posteriores acumulam o catálogo das anteriores.
- **margem_ameaca:** menor resultado natural que gera crítico (`18`, `19` ou `20`).
- **multiplicador_critico:** quantas vezes os dados da arma são rolados (`2`, `3` ou `4`).
- Margens `18` e `19` usam `x2`; multiplicadores `x3` e `x4` exigem margem `20`.
- Qualquer outro campo em `conteudo` (dano, material, bonus…) aparece como detalhe no card.

O PostgreSQL guarda o mesmo objeto no campo `conteudo` (JSONB), mas o item
completo vive na tabela `catalogo_itens`.

## Progressão por local

1. **Feira de Vila:** itens cotidianos e simples — armas simples, proteção
   convencional, ferramentas, suprimentos e criaturas mundanas de baixo nível.
2. **Metrópole:** armas marciais, proteção rara, selos básicos, propriedades,
   veículos civis/T1, especialistas e criaturas intermediárias.
3. **Mercado Negro:** contrabando, venenos, armamento militar ou tecnológico,
   implantes, artefatos épicos, materiais de origem proibida, veículos T2 e
   criaturas perigosas, servos ou ameaças de alto nível.
4. **Banco Lunar:** itens lendários, míticos e Relíquias da Criação, Frutos do
   Éden, tecnologia extrema, veículos T3/estelares e seres lendários.

A raridade define a base (`comum/incomum` → 1, `raro` → 2, `epico` → 3 e
`lendario/mitico/reliquia da criacao` → 4), mas a natureza do item pode elevar
o nível. Por exemplo, uma arma marcial começa na Metrópole e tecnologia de
plasma começa no Mercado Negro mesmo quando sua raridade é Incomum.

Todas as entradas publicadas possuem `nivelMinimoLoja` explícito. Ao adicionar
ou alterar itens, execute `node tools/classify-shop-locations.mjs`, revise o
resultado semântico e rode os testes; o script nunca deve substituir a revisão
manual de exceções narrativas.

## Como adicionar itens

Adicione ou edite entradas em `data/loja/catalogo.json` e valide os IDs, tipos
e raridades nos testes. A plataforma sincroniza essa fonte com o PostgreSQL ao
iniciar, publicando adições/edições e desativando entradas removidas sem apagar
o histórico de inventários. Use `/catalogo_republicar` no Banqueiro quando
quiser publicar imediatamente sem reiniciar a plataforma.

`/catalogo_recarregar` apenas recarrega na memória o que já está no PostgreSQL;
ele não publica mudanças feitas no JSON.

## O que já está feito

- **Armas:** 78, todas com descrição, dano rolável, crítico e modo
  (`subtipo` `simples`/`marcial` e `modo`
  `Corpo a corpo`/`À distância`, margem de ameaça e multiplicador crítico;
  inclui Obstinadas e Relíquias da Criação).
- **Equipamentos:** 56 (descrição e `espacos` explícitos; material e efeitos
  revisados quando havia fonte ou comparação segura).
- **Armaduras e escudos:** 52 (com `bonus`, `penalidade`, `espacos` e material
  quando aplicável).
- **Modificações:** 51 (`tipo: "modificacao"`). São as mesmas de
  `data/regras/raridadesEquipamentos.ts`, uma entrada por modificação, com
  `modificacao_id` apontando para a fonte. O preço sai de
  `PRECO_MODIFICACAO_POR_VALOR` — 20, 70, 290 e 1.200 Lunaris para técnica,
  valor 1, 2 e 3 — e as marciais só aparecem da Metrópole para cima
  (`nivelMinimoLoja >= 2`); efeitos épicos ou proibidos avançam ao Mercado
  Negro. Ao acrescentar uma modificação nas regras, replique a
  entrada aqui com o mesmo preço da faixa.
- **Veículos:** 65, sendo 49 sistemas/peças e 16 veículos completos, todos com
  ficha estruturada e efeitos veiculares completos.
- **Bestiário:** 60 seres (`tipo: "monstro"`, preço por fórmula).
- **Componentes e drops:** 259 entradas (`tipo: "drop"`), incluindo os
  catálogos próprios de classe, Matéria-prima e Componentes Veiculares.
- **Especiais:** 15 Frutos do Éden, 10 Implantes, 8 Artefatos Mágicos e 11 Selos
  consumíveis sincronizados com o catálogo mágico.

Total: **708 entradas**.

### Frutos do Éden

Os Frutos seguem uma escala própria de Relíquia da Criação, acima de um item
mágico comum. Cada um publica cinco blocos mecânicos obrigatórios:

- `passivo`: identidade permanente e benefício de exploração ou defesa;
- `tecnica`: poder recorrente, normalmente limitado a uma vez por rodada;
- `despertar`: efeito decisivo limitado por cena ou sessão;
- `fraqueza`: contrajogo específico mais a fraqueza comum à água do mar;
- `vinculo`: uma criatura mantém apenas um Vínculo do Éden por vez.

Os marcadores `Sobrenatural`, `Mutação` e `Elemental` alimentam os filtros da
Loja. Os preços atuais ficam entre 520 e 800 Fragmentos de Estrela conforme
impacto, versatilidade e frequência; preço maior não remove custos de Mana,
defesas, concentração, Cansaço ou limites de uso.

## Política econômica

A escala inteira vive em `data/economia/escala-precos-v1.json`, e é ela que
manda. Não escreva preço no olho: rode `node tools/normalize-shop-prices.mjs`
depois de mexer no catálogo, e `--check` para validar sem gravar.

**A âncora é o salário mínimo: 300 Lunaris por mês**, cerca de 10 por dia. Todo
preço é uma fração ou um múltiplo disso. O câmbio oficial continua sendo de 100
Lunaris para 1 Solar.

A escada de raridade multiplica por 4 a cada degrau. Os valores abaixo são a
referência de uma arma ou armadura, que servem de régua para o resto:

| Raridade | Referência | Banda (0,5x a 2,0x) | Moeda |
| --- | --- | --- | --- |
| Comum | 30 Lunaris | 15 a 60 | Lunaris |
| Incomum | 120 Lunaris | 60 a 240 | Lunaris |
| Raro | 480 Lunaris | 240 a 960 | Lunaris |
| Épico | 20 Solares | 10 a 40 | Solares |
| Lendário | 80 Solares | 40 a 160 | Solares |
| Mítico | 100 Fragmentos | 60 a 200 | Fragmentos |
| Relíquia da Criação | 400 Fragmentos | 280 a 800 | Fragmentos |

Como a banda vai da metade ao dobro, degraus vizinhos se encostam sem deixar vão
e sem se cruzar: uma arma rara custa sempre mais que qualquer incomum e sempre
menos que qualquer épica.

Cada categoria multiplica essa referência:

| Categoria | Fator | Categoria | Fator |
| --- | --- | --- | --- |
| Arma, armadura | 1,0 | Veículo (peça) | 5 |
| Artefato | 1,5 | Veículo completo | 20 |
| Equipamento | 0,8 | Monstro | 20 |
| Modificação | 0,6 | Implante | 25 |
| Consumível | 0,35 | Propriedade | 40 |
| Drop | 0,25 | Fruto do Éden | 1,0 |

Moeda: implante sempre em Créditos Sombrios, Fruto do Éden sempre em Fragmentos,
modificação sempre em Lunaris. Fora esses três, a faixa de raridade decide, com
uma exceção: se o valor passar de 20 Solares (2.000 Lunaris), ele sobe para
Solares mesmo numa raridade baixa. É por isso que um veículo completo raro
aparece em Solares e não como 19.200 Lunaris.

Entre Lendário (topo em 160 Solares) e Mítico (piso em 60 Fragmentos, ou 3.000
Solares) existe um salto de quase vinte vezes. Isso é proposital, e a seção
`economia` das regras publica esse muro para o jogador.

Ao usar Lunaris, sempre escreva `{"Lunaris": valor}`. Um número sem objeto é
interpretado pelo servidor como Solares.

Arkania foi **removido** (conceito descontinuado) e substituído por itens
equivalentes usando conceitos vivos: `anel-do-fluxo`, `couraca-primordial`,
`egide-primordial`.

## Veículos — FEITO (modelo complexo / Opção B)

Convertido de `data/loja/veiculos_sistema.json`. Cada tier de cada sistema é um item
`tipo: "veiculo"` comprável, com campos `sistema`, `subtipo` e `tier`:

- **Chassi** base (`veiculo-chassi`): 10 de Vida, 5 de deslocamento, sem armas/mods.
- **Núcleo:** Estável e Sobrecarga, T1–T3.
- **Estrutura:** Leve e Pesada, T1–T3.
- **Armas de veículo:** Leve e Pesada, T1–T3.
- **Utilidades:** Geladeira, Filtro, Dormitórios, Jardim, Academia, Área Médica,
  Armazém, Escudo, Cápsula de Fuga, Hangar — cada uma T1–T3.

O **Tier 4** de cada sistema tinha custo `-/-` nas tabelas (tier do mestre), então
não entrou na loja; fica citado na descrição do chassi como liberação do mestre.

## Materiais e Ingredientes — campos novos de `drop`

Além dos campos já documentados acima, toda entrada `tipo: "drop"` declara dentro de
`conteudo` os campos do sistema de Materiais e Ingredientes (`data/regras/materiais.ts`).
Esses campos são obrigatórios para todos os materiais. O catálogo atual possui 259 entradas.

- **categoria:** `Biológico | Botânico | Mineral | Espiritual | Arcano | Artificial`.
- **origem:** texto curto — espécie, local ou processo típico de obtenção. Distinto de
  `especie`, que continua existindo só para os drops de criatura.
- **potencia:** `1` a `5` — intensidade das propriedades, nunca cópia de `raridade`.
- **afinidade:** um dos sete elementos oficiais (`Terra | Água | Fogo | Ar | Raio | Luz |
  Escuridão`), `"Nenhuma"` (padrão) ou `"Escolha na compra"`. Só use um elemento quando o
  material tiver ligação elemental real — nunca por associação temática.
- **propriedades:** array de `Propriedade` — lista fechada definida em `PROPRIEDADES_MATERIAL`
  (`data/regras/materiais.ts`). Não aceita string livre.
- **usos:** array de `ritual | alquimia | engenharia | cozinha | veiculos | forja`.
- **estadoBase:** `bruto | processado | refinado`.
- **materialBaseId:** agrupa variantes de estado do mesmo material — duas entradas com o mesmo
  `materialBaseId` (uma bruta, outra refinada) representam a mesma substância em preparos
  diferentes, com a mesma `potencia` e `propriedades`.

Qualidade (`corrompida | danificada | conservada | padrao | abate-limpo | lendaria`) **não**
é campo de catálogo — é atributo da pilha de inventário obtida, resolvido por sufixo de
`item_id` (`idComQualidade`/`resolverMaterialBase` em `materiais.ts`), já que `item_id` é
validado como único por personagem em `plataforma/schemas.py`. Ver o capítulo "Materiais e
Ingredientes" nas regras para a tabela completa.

O comando `npm run materiais:retrofit` reaplica a curadoria oficial dos 66 materiais e
preenche `lootIds` de monstros somente quando o nome de um loot textual corresponde a um
drop real. `npm run materiais:check` verifica que o catálogo está sincronizado. A auditoria
da Fase 4 encontrou zero correspondências exatas entre os loots textuais dos 90 monstros e
os 51 drops então existentes; a Fase 5 preserva o mesmo critério para os 66 atuais. Por isso
nenhum `lootIds` foi inventado. Quando uma correspondência real for
publicada, `lootIds` fica como campo irmão de `loot` e aponta apenas para ids `tipo: "drop"`.

## Bestiário e Drops — FEITO

Convertidos de `data/loja/bestiario_precos.json`.

**Bestiário (`tipo: "monstro"`, 90 seres):** preço calculado pela fórmula

```text
preço = (PreçoPorLevel[faixa] × nível) + Espécie[faixa] + Classe[faixa] + Σ(extras)
```

onde `faixa` é 0–10, 11–20, 21–30, 31–40, 41–50, 50+ e os extras são Arma/Perícia/Pet/
Poder Ass/Legado/Variável. Há seres dos seis sub-tipos (Criatura, Familiar, Servo,
Invocação, Ajudante, Ser Lendário), guardados em `conteudo` com `nivel` e `classe`
(o sub-tipo). Pra adicionar mais criaturas, use a mesma fórmula por sub-tipo.

**Drops (`tipo: "drop"`, 66 itens):** 22 entradas por par espécie×parte com preço
(Carne/Órgãos/Essência), 29 componentes ritualísticos e 15 materiais-base da
Fase 5 (cinco Minerais, cinco Artificiais e cinco Botânicos). Pares com ❌ na
tabela foram ignorados. A descrição já cita os modificadores (conservação,
qualidade do abate, ser lendário, falta de material).

**Obstinadas:** as armas-artefato (Excalibur, Mjölnir, Gungnir…) existem só como
Relíquias da Criação (`reliquia-*`), não como par duplicado numa versão lendária —
cada artefato é único, com a habilidade na descrição.

## Dica de balanceamento

Todo preço do catálogo sai da escala em `data/economia/escala-precos-v1.json`,
aplicada por `tools/normalize-shop-prices.mjs`. Relíquias da Criação são a única
faixa congelada: o normalizador não encosta nelas, porque já estavam coerentes e
vivem numa economia que não se alcança por salário. Depois de uma
mudança no arquivo, use `/catalogo_republicar`; `/catalogo_recarregar` sozinho
não envia os novos preços ao PostgreSQL.
