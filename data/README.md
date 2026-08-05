# Dados oficiais

Esta é a fonte única de conteúdo de O Jardim. Um texto de regra, lore, item,
origem ou catálogo não deve ser criado em `src/`, `bots/` ou `docs/`.

- `ficha/`: classes, raças, perícias, Legados, magias e origens.
- `mundo/`: lore organizada por Árvore e a configuração canônica das Árvores.
- `regras/`: regras públicas, regras internas, condições e balanceamento.
- `loja/`: catálogo econômico, veículos, bestiário e instruções de edição.
- `gerado/`: saídas mecânicas consumidas pelo código. Não edite à mão.

Em `ficha/`, prefira adicionar um JSON temático quando uma revisão complementa uma fonte existente. Por exemplo, `legados-regras-v1.json` contém as descrições balanceadas migradas do frontend antigo e é combinado com `legados.json` pelo serviço de catálogo.

Todos os JSONs devem permanecer em UTF-8 e ser validados pelos testes antes de publicação.

`ficha/magias.json` guarda a configuração do sistema de dez círculos e o
catálogo ativo dos onze Fluxos. A versão 3.1 reúne magias, rituais, selos,
encantamentos e assinaturas de fusão. O conteúdo antigo de cinco círculos não
deve ser reintroduzido.

As quatro formas estão completas e simétricas: **330 magias** (três por Fluxo em
cada um dos dez círculos) e **33 rituais, 33 selos e 33 encantamentos** (três por
Fluxo, em faixas de poder diferentes).

Escalas usadas pelas outras formas — os testes cobram DT, Mana e tempo por faixa:

- **Ritual** — simples (DT 15 · 10 min · 4 Mana), complexo (DT 20 · 1 h · 8 Mana),
  grandioso (DT 25 · 8 h · 15 Mana) e monumental (DT 30 · 3 dias · 25 Mana).
  Todo ritual declara `requisito` e o que acontece na `falha`.
- **Selo** — graus 1 a 5: DT de inscrição 10, 13, 16, 19 e 22; Mana 3, 6, 9, 12 e
  15; tempo de 10 minutos a 8 horas. Como qualquer pessoa dispara um selo, o
  efeito fica um degrau abaixo da magia de círculo equivalente.
- **Encantamento** — graus 1 a 5: DT 15, 20, 25, 30 e 35; Mana 4, 8, 15, 25 e 40;
  tempo de 1 hora a 7 dias. O grau 5 é o teto porque um item lendário comporta no
  máximo cinco encantamentos.

A grade de três por Fluxo é **piso, não teto**: ela garante que nenhum Fluxo fica
órfão, mas não impede um Fluxo de receber uma magia a mais quando o conceito
pede. Os testes cobram "pelo menos 3", não "exatamente 3".

### Magias universais

Uma magia com `"fluxo": "universal"` não pertence a Fluxo nenhum: qualquer Fluxo
a aprende, e o efeito muda conforme quem canaliza. Ela declara `efeitos_por_fluxo`
com uma entrada para **cada um dos onze Fluxos** — os testes recusam variante
faltando ou vazia.

- Na **ficha**, o jogador lê o texto comum somado à variante do Fluxo nativo dele.
- No **Grimório** e no `/regras` do Gerente, aparecem as onze manifestações, porque
  ali é livro de referência.
- Ela não conta na grade por Fluxo, e o filtro de Fluxo sempre a inclui.

São duas por círculo, vinte no total.

### Marcas e Cicatrizes

`ficha/marcas-de-circulo.json` guarda o preço dos círculos altos.

- **Marca (5º ao 9º)** vive em `por_fluxo`: cinco por Fluxo, uma por círculo. Ela é
  **derivada**, nunca guardada na ficha — sai do Fluxo nativo e do círculo máximo,
  então não há como forjar nem esquecer de aplicar, e perder o círculo tira a Marca.
- **Cicatriz (10º)** vive em `cicatrizes`: tabela comum a todos os Fluxos, sorteada
  uma vez por magia de 10º círculo aprendida. Essa **fica guardada** em
  `cicatrizesIds`, e por isso o servidor confere id, repetição e quantidade.

Toda Marca e toda Cicatriz declara `bonus` e `onus`, e os testes recusam qualquer
uma que venha só com um dos lados. Elas valem como Legado: texto, sem motor de
efeitos automáticos.

Ao acrescentar ou revisar magias, mantenha as convenções que os testes verificam:

- custo de Mana igual ao `mana_base` do círculo (2, 4, 6, 8, 10, 13, 16, 20, 25 e 30);
- `fontes_permitidas` com Cartomancia de Fluxo somente até o 2º círculo, porque a
  progressão do Cartista Arcano para ali;
- `ataque: true` apenas com `perfil: "alvo"`, senão o crítico escaparia do alvo único;
- toda manifestação do Fluxo do Fim carrega `aviso_mestre` sobre a autorização,
  seja magia, ritual, selo ou encantamento;
- ids e títulos únicos entre as quatro formas somadas, não só dentro de cada uma.

Depois de mexer nele, rode `npm run test:frontend` e `npm run audit:balance`.

## Fluxo com Obsidian

O cofre do Obsidian é a interface editorial. O site e os bots continuam lendo os
JSONs versionados deste diretório, porque o cofre local não existe no ambiente de
build nem na Discloud.

- `npm run obsidian:import`: migração inicial de JSON para Markdown. A operação
  recusa sobrescrever notas; `-- --force` deve ser usado somente para recriar as
  notas a partir dos JSONs, descartando edições feitas no cofre.
- `npm run obsidian:check` e `npm run obsidian:export` ainda representam a
  organização técnica anterior do cofre. Não use a exportação automática até
  o adaptador reconhecer as notas consolidadas atuais; peça a sincronização ao
  Codex para reconciliar a parte visível com os JSONs sem perder conteúdo.

As notas consolidadas exibem tabelas editoriais legíveis, enquanto a estrutura
exata usada pelo JSON fica oculta. Se uma dessas tabelas for editada, a checagem
interrompe a exportação para evitar perda silenciosa. Primeiro reconcilie a
alteração com os dados internos — normalmente pedindo ao Codex para sincronizar
o cofre — e somente então exporte.

O caminho do cofre pode ser configurado com a variável
`JARDIM_OBSIDIAN_VAULT` ou com `-- --vault "CAMINHO"`. Depois da exportação,
execute os testes, `npm run build:mundo` quando houver mudanças de lore e o build
de produção. Os arquivos em `data/gerado/` continuam sendo saídas mecânicas e
não devem ser editados à mão.
