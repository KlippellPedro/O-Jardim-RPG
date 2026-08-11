# Auditoria de Integração — O Jardim RPG

**Data:** 2026-08-10
**Escopo:** revisão cruzada de Classes, Habilidades, Raças, Origens, Atributos/Perícias, Magias, Mana, Itens/Loja/Inventário, Ficha, Combate, Descanso, Progressão, Condições e Economia — sob a ótica de jogador, mestre e game designer.
**O que este documento NÃO é:** revisão de texto, nem rebalanceamento numérico item a item. O foco é conexão entre sistemas: o que uma parte promete e se outra parte cumpre.

## Metodologia e cobertura

Este relatório cruza seis levantamentos independentes (cada um lendo por completo o seu bloco de arquivos) mais uma segunda rodada de verificação direta feita por mim nos arquivos-fonte para confirmar ou descartar os achados mais sensíveis antes de escrever qualquer coisa aqui. Nada abaixo foi inventado — todo achado cita o arquivo e, quando relevante, o campo exato.

Cobertura por área:
- **Regras centrais** (`data/regras/*`): lidas por completo — atributos, perícias, ação/turno, combate, dano/crítico, condições, mana, descanso, progressão, ataques combinados, crafting, raridade, bases, veículos, facções, notas do mestre.
- **Ficha** (`src/types`, `plataforma/core/schema.py`, `plataforma/core/content_seed.py`, componentes da ficha): mapeada por completo.
- **Loja/Itens** (`data/loja/*`, legados, Marca/Cicatriz, Pecados/Virtudes): lida por completo, 461 itens conferidos.
- **Economia e Sessão ao Vivo** (bots, `plataforma/core/live_session.py`, `sessions.py`, `shop.py`, etc.): mapeada por completo.
- **Classes** (`data/ficha/classes.json`, 27 classes): estrutura, progressão, custos e presença/ausência de campos verificados para as 27; conteúdo integral de habilidades lido em profundidade para 2 classes representativas (Guerreiro e Cartista Arcano) e cruzado por script para as demais 25.
- **Magias/Perícias/Origens/Raças** (`data/ficha/magias.json`, `pericias.json`, `origensData.ts`, `racas.json`): `magias.json` analisado por completo (352 magias, 35 rituais, 33 selos, 33 encantamentos) com verificação cruzada automatizada; `pericias.json` e `origensData.ts` lidos por completo; `racas.json` (22 raças) mapeado estruturalmente (categoria, disponibilidade, ajustes de vida/mana/movimento) para todas, com leitura profunda de traços completos em 2 raças (Entidade, e amostras via grep). Não foram lidos linha a linha os traços completos das 22 raças nem as ~200 habilidades individuais das 27 classes — onde isso importa para um achado, isso está declarado no próprio achado.

---

## 1. Panorama de integração geral

### O que está bem conectado (não é problema — vale registrar para não "consertar" o que já funciona)

- **Sistema de magias é o mais coeso do projeto.** 352 magias distribuídas quase perfeitamente entre os 10 círculos (35–36 cada) e os 11 Fluxos + Universal, com `fontes_permitidas` amarrando cada magia às tradições certas (Canalização/Sintonia sempre; Cartomancia de Fluxo só nas 70 magias de círculo 1–2). Isso bate exatamente com a progressão de círculo/vagas de cada classe em `classes.json` (Canalizador e Sintonizador vão até círculo 10; Cartista Arcano trava em círculo 2 — por desenho, não por bug). O backend (`character_summary.py`) valida círculo, vagas e fonte permitida no momento de aprender a magia, não só na tela.
- **Rituais e loja conversam de verdade.** Os 32 `item_id` de ingredientes usados nas 35 receitas de ritual existem, um a um, como itens compráveis (`drop`, categoria "Material Ritualístico") no catálogo da loja. Confirmado por comparação direta, 32/32.
- **`_SHOP_TYPES` cobre exatamente as categorias em uso.** As 13 categorias que aparecem nas 461 entradas de `catalogo.json` (arma, armadura, equipamento, drop, modificacao, veiculo, veiculo-completo, consumivel, implante, artefato, fruto-eden, propriedade, monstro) são exatamente as 13 aceitas por `_SHOP_TYPES` em `content_seed.py`. Nenhuma categoria órfã hoje.
- **Legados, Marca/Cicatriz e Pecados/Virtudes têm campo na ficha e validação real no backend**, com pré-requisitos tipados (`{"atributo":..., "valor_minimo":...}`) checados contra atributo/nível/perícia do personagem — os três sistemas inclusive compartilham a mesma cláusula de resolução ("vale como Legado: o texto manda, o mestre arbitra").
- **Bestiário em sessão puxa dados jogáveis reais** (PV, Defesa, Mana, iniciativa, ataques, perícias, VD) direto da mesma tabela usada pela loja, e converte VD em XD automaticamente na distribuição de XP pós-sessão.
- **Raça "Entidade" está corretamente isolada**: marcada `indisponivel: true` com motivo, bloqueada no backend para jogadores comuns e filtrada da lista no assistente de criação — com bypass consciente só para o mestre (coerente com sua única forma de aquisição ser concessão narrativa).

### O que funciona como sistemas separados (o cerne dos achados abaixo)

- **O "livro de regras" que o site gera (`regras-publicas-v1.md`) não é o mesmo conteúdo que a ficha e a sessão realmente usam.** Catálogo de Classes, Raças, Legados e a lista nomeada de Perícias não aparecem nele; a tabela de Condições nele é uma cópia menor (6 de 11) da tabela real usada pela ficha e pela sessão ao vivo. Ver achados 1 e 2.
- **Uma nota interna do Mestre está desatualizada em relação aos dados atuais**, o que pode levar o próprio mestre a subestimar o que já está pronto para uso. Ver achado 3.
- **A loja valida requisitos mas não impede a compra na maioria dos casos**, e para requisito de classe especificamente nem chega a validar. Ver achado 6.
- **Mana, condições e recursos de classe são inteiramente manuais em sessão ao vivo**, apesar de cada poder/magia ter um custo numérico exato nos dados. Ver achado 8.
- **Economia tem uma tabela crítica (tiers de Cofre) duplicada em dois lugares**, sem fonte única. Ver achado 10.
- **Modificações de item e seus pré-requisitos usam texto livre onde Legados usam campos tipados** — mesma categoria de regra, dois padrões de dado diferentes. Ver achado 11.

---

## 2. Achados detalhados

### Achado 1 — O livro de regras público não contém Classes, Raças, Legados nem a lista de Perícias

**Onde aparece:** `data/regras/regras.ts` → `REGRAS_OFICIAIS.classes.corpo` e `.racas.corpo` são literalmente os placeholders `<!-- CLASSES_DATA -->` / `<!-- RACAS_DATA -->`; o gerador `tools/generate-public-rules.mjs` os substitui por "Consulte o catálogo de classes na página de regras." no `.md` final. O tópico `legados` tem regra de escolha mas nunca expande os 42 Legados. A lista nomeada de Perícias (Atletismo, Luta, Furtividade etc.) só existe em `data/ficha/pericias.json`, nunca em `regras.ts`.

**Sistemas envolvidos:** Regras, Classes, Raças, Legados, Perícias, geração de documentação.

**Por que isso causa problema numa sessão:** o índice do próprio livro anuncia "27 catalogadas" e "20 raças disponíveis", mas quem lê só o `.md` (por exemplo, alguém que baixa/imprime o livro, ou um jogador novo que não sabe que existe uma página React separada) não encontra o catálogo em lugar nenhum dentro do documento que deveria ser a fonte única. Isso obriga todo mundo a "adivinhar" que o conteúdo real mora em outro lugar (`RegrasPage.tsx` consumindo `classes.json`/`racas.json` diretamente).

**Gravidade:** Importante.

**Como corrigir:** ou (a) o gerador injeta um resumo tabular de classes/raças/legados/perícias no lugar dos placeholders, ou (b) o `.md` público troca a frase genérica por um link explícito e visível para a página interativa, deixando claro que ali não é a fonte completa. A opção (a) é mais trabalhosa mas resolve de vez; a opção (b) é barata e já reduz a confusão.

**Exige mudança em outro lugar?** Sim — em `tools/generate-public-rules.mjs`, não em conteúdo de regra em si.

---

### Achado 2 — A tabela pública de Condições mostra 6 das 11 condições oficiais; as 6 Crises de Sanidade não têm tabela de efeito no livro

**Onde aparece:** `data/regras/condicoes.ts` define `CONDICOES_OFICIAIS` (11: Amedrontado, Exposto, Caído, Sangramento, Atordoado, Agarrado, Cego, Imobilizado, Inconsciente, Surpreendido, Concentrando) e `CRISES_SANIDADE` (6, com DT e duração). Esse arquivo **não é importado por `regras.ts`** — confirmado por busca de import. O tópico `condicoes` de `regras.ts` (e por consequência o `.md` público) tem uma tabela **hardcoded** com só 6 condições (falta Agarrado, Cego, Imobilizado, Inconsciente, Surpreendido) e cita as Crises de Sanidade só pelo nome, sem tabela.

**Sistemas envolvidos:** Regras públicas, Ficha (`condicoesAtivas`), Sessão ao vivo (`sessao_participantes.condicoes`), Combate.

**Por que isso causa problema numa sessão:** um jogador ou mestre que aprende as condições pelo livro público nunca vai saber que "Inconsciente" ou "Agarrado" têm regra mecânica definida — mas a ficha e a sessão ao vivo aplicam essas 5 condições faltantes normalmente (são usadas em `AbaFicha.tsx`/`AbaDescanso.tsx` e no editor de sessão). Ou seja: **a ficha já sabe aplicar mais condições do que o livro ensina a existir.** Isso é o tipo exato de situação em que alguém na mesa pergunta "essa condição existe? o que ela faz?" e a resposta correta está em um arquivo que ninguém lê.

**Gravidade:** Crítico (afeta todo combate, é uma peça central e recorrente do jogo).

**Como corrigir:** importar `condicoes.ts` dentro de `regras.ts` (ou o gerador ler os dois arquivos) para que a tabela pública sempre reflita as 11 condições oficiais e inclua a tabela de Crises de Sanidade, em vez de manter uma cópia manual desatualizada.

**Exige mudança em outro lugar?** Sim — em `regras.ts` e/ou no gerador; `condicoes.ts` em si está correto e é a fonte de verdade que a ficha já usa.

---

### Achado 3 — A nota interna do Mestre diz que Habilidades e Poderes "não produzem efeito mecânico", mas isso já não é verdade

**Onde aparece:** `data/regras/mestre-v1.json`, seção "Conteúdo adiado de raças e classes": *"Habilidades e Poderes do livro não produzem efeito mecânico até serem revisados e publicados novamente."* Comparado diretamente com `data/ficha/classes.json`: todas as 27 classes têm `"progressao_publicada": true`, `"recursos_provisorios": false` e habilidades/poderes com efeito numérico completo (ex.: Guerreiro/Implacável concede literalmente "+4 de dano" a "-2 Defesa"; todas as 27 classes foram carimbadas com `"origem_conteudo": "material_enviado_revisado"` ou `"proposta_original_balanceada"` e `"versao_balanceamento"` de **2026-07-28** ou **2026-08-01** — ou seja, revisadas há poucos dias em relação à data de hoje (2026-08-10). O próprio `mestre-v1.json` (seção "Notas editoriais") lista exatamente essas 13 classes como já tendo recebido "propostas originais balanceadas", confirmando que a revisão mencionada como pendente já aconteceu.

**Sistemas envolvidos:** Classes, Habilidades, Poderes, documentação interna do Mestre.

**Por que isso causa problema numa sessão:** esse documento é a referência que o mestre consulta para saber o que já pode usar na mesa. Se ele confiar nessa frase ao pé da letra, vai dizer aos jogadores "as habilidades de classe ainda não valem nada, é só texto de exemplo" — quando na verdade o conteúdo já está balanceado, versionado e pronto. É uma desinformação que se propaga do arquivo errado para a mesa.

**Gravidade:** Crítico (é a fonte que o mestre usa para decidir o que é jogável agora).

**Como corrigir:** atualizar a seção "Conteúdo adiado de raças e classes" de `mestre-v1.json`, removendo ou reescrevendo a frase sobre habilidades/poderes sem efeito, já que ela hoje só é verdadeira para o conteúdo que ainda não recebeu `origem_conteudo` (nenhum caso restante, pelo levantamento atual).

**Exige mudança em outro lugar?** Não — é uma correção pontual no próprio `mestre-v1.json`.

---

### Achado 4 — A origem "Artesão" promete "+1 Ofício", mas esse bônus nunca pode ser aplicado a nenhuma perícia real

**Onde aparece:** `data/ficha/origensData.ts`, origem `artesao`: `ajuste: { alvo: 'pericia', chave: 'oficio', valor: 1, rotulo: 'Ofício +1' }`. Mas `data/ficha/pericias.json` documenta explicitamente: *"Ofício foi removida da lista fixa porque agora é sempre criada como perícia personalizada"*. E `src/pages/Ficha/abas/AbaPericias.tsx:437` gera o id de qualquer perícia personalizada como `'custom_' + Date.now()` — nunca `'oficio'`. O código que aplica o bônus da origem (`ajusteOrigem(ficha, 'pericia', periciaId)` em `src/services/ajustesFichaService.ts:30-34`) só soma o valor quando `periciaId === origem.ajuste.chave`. Como nenhuma perícia no sistema atual pode ter o id literal `'oficio'`, essa comparação nunca é verdadeira.

**Sistemas envolvidos:** Origens, Perícias, Ficha.

**Por que isso causa problema numa sessão:** um jogador escolhe "Artesão" na criação do personagem vendo "Ofício +1" na tela, cria sua perícia de Ofício customizada (ex.: "Ofício (Ferreiro)") esperando o bônus — e o bônus nunca aparece em lugar nenhum, sem nenhum aviso de que a promessa da origem é inatingível. É silencioso: não dá erro, só não soma.

**Gravidade:** Importante (não quebra o jogo, mas é uma origem inteira com metade da sua função morta por design desatualizado).

**Como corrigir:** ou (a) trocar o `chave` da origem Artesão para apontar para uma perícia fixa que ainda exista (ex.: Investigação ou outra correlata a ofício), ou (b) ensinar `ajusteOrigem` a reconhecer perícias personalizadas por título normalizado em vez de id fixo quando `chave === 'oficio'`, ou (c) simplesmente redigir a origem para outro tipo de bônus (`atributo`, `vidaMaxima` etc.) que não dependa de uma perícia que não tem mais id estável.

**Exige mudança em outro lugar?** Sim, dependendo da opção: (a) e (c) são só edição de dados em `origensData.ts`; (b) exige mudança de lógica em `ajustesFichaService.ts`.

---

### Achado 5 — Cartista Arcano é uma classe de magia sem acesso a nenhuma magia real até o nível 10

**Onde aparece:** `data/ficha/classes.json`, classe `cartista-arcano`: `progressao_magia.marcos` começa em `{"nivel": 10, "circulo": 1, "vagas": 3}` (e só ganha um segundo círculo no nível 15). A própria habilidade "Baralho Arcano" só concede *"Escolha três magias do Fluxo nativo de primeiro círculo"* no estágio de nível 10. Do nível 1 ao 9, a classe funciona só com "Cartas Afiadas" (dano genérico de carta, sem ligação com o catálogo de 352 magias) e bônus de perícia — apesar de sua descrição de classe ser *"Conjura por cartas preparadas antes"*. Em comparação, Canalizador e Sintonizador (as outras duas classes com `progressao_magia`) já têm círculo 2 / 2 vagas desde o **nível 1**.

**Sistemas envolvidos:** Classes, Magias, Progressão.

**Por que isso causa problema numa sessão:** um jogador escolhe a classe justamente pelo conceito de "conjurar por cartas" e passa a primeira metade do jogo (em uma progressão que vai até nível 20 de classe) sem conjurar nenhuma magia de fato — o que é uma lacuna grande entre a promessa da classe e a experiência real de jogo nos níveis iniciais, e destoa das outras duas classes de magia geral.

**Gravidade:** Importante.

**Como corrigir:** antecipar o primeiro marco de `progressao_magia` do Cartista Arcano para um nível bem mais baixo (nível 1 ou 3, coerente com o padrão das outras classes de magia), mantendo o número de vagas reduzido se for para preservar o balanceamento (ex.: 1 vaga de círculo 1 no nível 1, crescendo daí). Isso é uma decisão de design, não uma correção técnica — mas vale ser sinalizada porque hoje ela contraria o próprio texto da classe.

**Exige mudança em outro lugar?** Não necessariamente — é ajuste de dados dentro do próprio `classes.json` (o campo `progressao_magia.marcos` e possivelmente o texto da habilidade "Baralho Arcano").

---

### Achado 6 — A loja valida requisitos de compra mas não bloqueia a maioria deles; requisito de classe nem chega a ser validado

**Onde aparece:** `plataforma/routers/shop.py` (`_require_catalog_character_requirements`). O código lê `conteudo.requisitoNivel` e `conteudo.requisitoClasse` de um item e compara com a ficha — mas quando a comparação falha, o resultado vira uma entrada em `infracoes_loja` e uma notificação para o mestre, **a compra continua acontecendo**. As únicas travas que de fato impedem a compra (HTTP 403) são `requer_autorizacao_mestre` e `nivelMinimoLoja` (nível da loja/localização). Olhando os dados reais em `data/loja/catalogo.json` (461 itens): nenhuma das 461 entradas usa um campo `requisitoClasse` estruturado — os únicos dois itens que precisam de uma classe específica ("Guardião", armadura e escudo, com bônus condicional a "se o portador for um Guardião") colocam essa condição só na descrição em texto livre, que nenhum código lê.

**Sistemas envolvidos:** Loja, Economia, Ficha, Classes.

**Por que isso causa problema numa sessão:** um personagem de nível 1 pode comprar (e o sistema deixa) qualquer item com `requisitoNivel` alto, desde que o item não tenha também `requer_autorizacao_mestre` ou não esteja numa loja de tier alto — o mestre só fica sabendo depois, por notificação, quando o item já está na mochila. E para requisito de classe, a checagem nem existe na prática: mesmo os dois itens "Guardião" (que deveriam só funcionar plenamente nas mãos de um Guardião) podem ser comprados e usados por qualquer classe sem nenhum aviso, porque a condição está em texto livre.

**Gravidade:** Crítico (é uma regra de progressão/economia que pode ser contornada silenciosamente, inclusive em jogo assíncrono onde o mestre não está olhando compra por compra).

**Como corrigir:** (a) decidir conscientemente se requisito de nível deve ser bloqueio automático ou só alerta — se for para continuar como alerta, deixar isso explícito na UI de compra ("comprar mesmo assim? isso vai avisar o mestre"); (b) para requisito de classe, criar um campo estruturado (`requisitoClasse: string[]`) nos dois itens Guardião (e em qualquer futuro item equivalente) e fazer a UI mostrar claramente que o bônus condicional só se aplica com a classe certa, já que a compra em si provavelmente deve continuar liberada (o item ainda serve, só sem o bônus extra).

**Exige mudança em outro lugar?** Sim — dados em `catalogo.json` (adicionar `requisitoClasse` explícito onde hoje só há texto) e, se a decisão for por bloqueio automático de nível, lógica em `shop.py`.

---

### Achado 7 — Itens catalogados com efeito vago ou sem contrapartida, alguns com potencial de quebrar a economia

**Onde aparece:** `data/loja/catalogo.json`, categoria `equipamento`:
- **Caixa do Coração** (lendário, 420 Lunaris): "Colocado um item dentro, ele gera uma cópia imperfeita do objeto após 1h" — sem limite de raridade/valor do item duplicado, nem contrapartida de uso (cooldown, degradação). Isso é literalmente um duplicador de itens.
- **Chave sem Porta** (lendário, 320 Lunaris): "Abre qualquer fechadura" sem exceção nem salvaguarda mecânica além de um efeito colateral narrativo (5% de portal).
- **Kit de Aventureiro** (raro, 20 Lunaris): descrição puramente narrativa, zero efeito mecânico — estranho estar na mesma faixa de raridade de itens com bônus reais.
- **Relicário de Prata**, **Olho de Golem**, **Lente Arcana** (todos épicos): efeitos descritos sem número, alcance, teste ou duração, ao contrário da maioria dos itens épicos vizinhos que têm todos esses campos.

**Sistemas envolvidos:** Loja, Economia, Itens.

**Por que isso causa problema numa sessão:** para os itens de efeito vago, o mestre tem que improvisar toda a regra na hora (o "e agora, como isso funciona exatamente?" que o pedido original menciona). Para a Caixa do Coração especificamente, é um risco real de economia: nada no texto impede duplicar um item lendário ou uma relíquia.

**Gravidade:** Crítico para Caixa do Coração e Chave sem Porta (risco de quebra de economia/investigação); Pequeno para os itens só vagos de descrição (Kit de Aventureiro, Relicário, Olho de Golem, Lente Arcana) — mais uma questão de acabamento do que de risco sistêmico.

**Como corrigir:** para a Caixa do Coração, adicionar explicitamente um teto de raridade/valor duplicável, um cooldown (ex.: 1 vez por item, ou 1 vez por semana narrativa) e provavelmente uma imperfeição mecânica (não só narrativa) na cópia. Para a Chave sem Porta, restringir a fechaduras "mundanas" (excluindo cofres/portas lendárias/mágicas) ou adicionar custo por uso. Para os itens vagos, completar com número/teste/duração/alcance seguindo o padrão dos itens vizinhos da mesma raridade.

**Exige mudança em outro lugar?** Não — é edição de dados dentro do próprio `catalogo.json`.

---

### Achado 8 — Mana e recursos de classe são inteiramente manuais na sessão ao vivo, apesar de cada poder ter custo exato nos dados

**Onde aparece:** `classes.json` define `custo_mana` numérico exato em cada um dos ~270 poderes (10 por classe × 27 classes). `plataforma/routers/sessions.py` e `EntityEditor.tsx` expõem `mana_atual`/`mana_maxima` por participante, mas só como número editável manualmente — não há nenhum código que debite Mana quando um poder é "usado". `POST /registros/uso` (`rolls.py`) só grava um log de que um poder foi usado, sem tocar em `mana_atual`.

**Sistemas envolvidos:** Classes, Poderes, Mana, Sessão ao vivo, Combate.

**Por que isso causa problema numa sessão:** o sistema modela custo de Mana com granularidade fina (poder por poder, magia por magia) exatamente para dar suporte a decisões táticas de "vale a pena gastar isso agora?" — mas nenhuma ferramenta ao vivo aplica esse custo automaticamente. Na prática, o controle de recurso mais importante do jogo depende 100% do jogador lembrar de subtrair e do mestre conferir de cabeça, o que abre espaço para erro ou abuso não intencional em mesas mais corridas.

**Gravidade:** Importante.

**Como corrigir:** ao registrar um "uso de poder/magia" (`POST /registros/uso`) que já identifica o item usado, também consultar `custo_mana` no catálogo correspondente e aplicar automaticamente o delta em `sessao_participantes.mana_atual`, com desfazer manual disponível para os casos excepcionais (críticos, reduções por habilidade etc.).

**Exige mudança em outro lugar?** Sim — em `plataforma/routers/rolls.py` (ou onde o registro de uso é processado) e possivelmente no fluxo de UI que dispara esse registro.

---

### Achado 9 — Condições na ficha e na sessão são texto livre, desconectadas do catálogo mecânico de `condicoes.ts`

**Onde aparece:** `ficha.condicoesAtivas` é um array livre `{nome, descricao?, afeta?, duracao?}` editado por modal em `AbaFicha.tsx`, sem vínculo com os ids das 11 `CONDICOES_OFICIAIS`. `sessao_participantes.condicoes` (sessão ao vivo) também é `{nome, turnos}` livre — decrementa duração automaticamente, mas **não aplica nenhum efeito mecânico automático** (nem Defesa −5 do Atordoado, nem bloqueio de ações do Inconsciente); a única exceção é o ajuste de Iniciativa por "surpreendido"/cansaço em `character_summary.py::iniciativa_fixa`.

**Sistemas envolvidos:** Condições, Ficha, Sessão ao vivo, Combate.

**Por que isso causa problema numa sessão:** aplicar "Atordoado" em alguém na sessão ao vivo não impede automaticamente essa pessoa de agir nem reduz a Defesa dela — o mestre precisa lembrar manualmente de aplicar cada efeito descrito em `condicoes.ts` (que, pelo Achado 2, nem está visível no livro público). É o mesmo padrão do Achado 8: o dado mecânico existe com precisão, a ferramenta de mesa não o usa.

**Gravidade:** Importante.

**Como corrigir:** no mínimo, ligar o seletor de condição em `condicoesAtivas`/`sessao_participantes.condicoes` a uma lista suspensa vinda de `condicoes.ts` (em vez de texto livre), para reduzir erro de digitação/nome; num segundo passo, aplicar automaticamente os efeitos numéricos simples (Defesa, bloqueio de ação) das condições que já têm regra fechada.

**Exige mudança em outro lugar?** Sim — front-end dos dois seletores de condição e, para a automação completa, lógica de resolução de turno em `sessions.py`/`condicoes.py`.

---

### Achado 10 — Tiers de Cofre Bancário duplicados entre o bot e a plataforma, já divergindo

**Onde aparece:** `bots/banqueiro/core/economia.py::COFRE_TIERS`/`SEGURANCA_TIERS`/`beneficios_reputacao()` versus `plataforma/core/cofre_tiers.py`, que o próprio código admite ser um espelho manual ("Se os tiers do Banqueiro mudarem, atualize aqui também"). A curva de desconto por reputação já é diferente entre as duas cópias (a versão da plataforma é mais simples/degrau único; a do bot é mais gradual).

**Sistemas envolvidos:** Economia, Cofre, Bot Banqueiro, Plataforma web.

**Por que isso causa problema numa sessão:** um jogador pode ver um desconto diferente dependendo se está olhando o cofre pelo Discord ou pelo site, para o mesmo tier de reputação — inconsistência visível e confusa, e o risco cresce a cada mudança futura em uma cópia que não é replicada na outra.

**Gravidade:** Importante.

**Como corrigir:** extrair `COFRE_TIERS`/`SEGURANCA_TIERS`/`beneficios_reputacao` para um único arquivo de dados (JSON, como já é feito para catálogo/regras) consumido tanto pelo bot quanto pela plataforma, eliminando a duplicação de código-fonte.

**Exige mudança em outro lugar?** Sim — refatoração que toca `bots/banqueiro/core/economia.py` e `plataforma/core/cofre_tiers.py`.

---

### Achado 11 — Modificações de equipamento usam vínculo por texto livre e pré-requisitos não tipados, ao contrário de Legados

**Onde aparece:** `data/loja/catalogo.json`, entradas `tipo: "modificacao"`: o campo `aplicacao` que liga a modificação ao tipo de item base é uma string livre ("Armas", "Armaduras", "Escudos", "Itens gerais e mágicos"), sem enum validado no schema. O campo `pre_requisito` das modificações "marciais" também é texto livre (`"Força 14, ou Destreza 14 em arma de disparo"`, `"Nível total 7"` etc.), enquanto o mesmo tipo de informação em `legados.json` usa uma estrutura tipada (`{"atributo": "destreza", "valor_minimo": 14}`, `{"nivel_personagem": 7}`).

**Sistemas envolvidos:** Itens, Modificações, Loja, Legados (por comparação).

**Por que isso causa problema numa sessão:** como não há enum nem verificação automática, um erro de digitação em `aplicacao` (ex.: `"armas"` em minúsculo, ou um valor fora dos quatro usados) faria uma modificação nunca aparecer como compatível com nenhum item, silenciosamente. E como o pré-requisito de mod é texto livre, ele não pode ser validado automaticamente na compra/instalação — o que reforça o Achado 6 (a loja já não bloqueia bem requisitos estruturados; para os não estruturados, é impossível bloquear).

**Gravidade:** Importante.

**Como corrigir:** trocar `aplicacao` por um enum fechado (`"arma" | "armadura" | "escudo" | "geral"`) e `pre_requisito` por uma estrutura no mesmo formato já usado em `legados.json`, reaproveitando a função de validação de pré-requisito que `character_summary.py::_atende_requisito_legado` já implementa.

**Exige mudança em outro lugar?** Sim — dados em `catalogo.json` (51 modificações) e, para validação automática, lógica de instalação de modificação em `characters.py`.

---

### Achado 12 — Veículos e Propriedades: compra não entrega a entidade jogável, exige uma "migração" manual separada

**Onde aparece:** `plataforma/routers/shop.py` — comprar um `veiculo-completo` só cria uma linha comum de inventário; é preciso chamar depois `POST /campanhas/{id}/veiculos/migrar` para virar uma linha real em `campanha_veiculos` (com vida, combustível, módulos etc.). Propriedade é parcialmente diferente: comprar já cria `ficha.propriedades` automaticamente, mas essa entrada também depende de uma segunda chamada manual (`POST /campanhas/{id}/propriedades/migrar`) para virar algo com instalações e permissões reais em `campanha_propriedades`.

**Sistemas envolvidos:** Loja, Veículos, Propriedades, Ficha, Sessão ao vivo.

**Por que isso causa problema numa sessão:** depois de comprar um veículo, o jogador (ou o mestre) some sem saber que precisa de mais um passo para o veículo "funcionar" de verdade (dano, combustível, tripulação) — é exatamente o tipo de "e agora?" que o pedido original quer mapear. Isso é claramente uma transição de arquitetura em andamento (o comentário no próprio código de `AbaBens.tsx` confirma: "o backend já removeu o item de inventario_personagem... recarrega para refletir").

**Gravidade:** Pequeno (o caminho existe e funciona, só não é intuitivo).

**Como corrigir:** ou automatizar a migração no momento da compra (a loja já sabe que é um `veiculo-completo`/`propriedade`, poderia chamar a migração internamente), ou deixar isso explícito na tela de compra ("comprado — agora vá até Frota/Bens da campanha para ativar").

**Exige mudança em outro lugar?** Sim — `shop.py` (se for automatizar) ou só UI de confirmação de compra (se for só deixar claro o próximo passo).

---

### Achado 13 — Os 6 Legados novos nunca passaram pela revisão de balanceamento que os 36 originais receberam

**Onde aparece:** `data/ficha/legados-regras-v1.json` (a revisão balanceada) cobre exatamente os 36 ids de `legados.json`; nenhum dos 6 ids de `legados-novos.json` ("Eco do Fluxo", "Passo Entre Galhos", "Memória do Eclipse", "Vínculo Lunar", "Segundo Tempo", "Âncora da Árvore") aparece nela.

**Sistemas envolvidos:** Legados, Progressão, Balanceamento.

**Por que isso causa problema numa sessão:** os 6 Legados novos ficam com redação "crua", sem os mesmos limites de uso por turno/cena que os outros 36 já receberam na revisão — risco real de um desses 6 estar mais forte (ou mais confuso) que os equivalentes revisados, sem que isso tenha sido intencional.

**Gravidade:** Pequeno.

**Como corrigir:** aplicar aos 6 Legados novos a mesma passada de revisão (limites de uso, teto, clareza de redação) que os 36 originais já receberam, e mesclar tudo em uma única fonte de verdade.

**Exige mudança em outro lugar?** Não — é trabalho de conteúdo dentro dos próprios arquivos de Legados.

---

### Achado 14 — Raridade de itens com grafia inconsistente em 461 entradas do catálogo

**Onde aparece:** `data/loja/catalogo.json`, campo `conteudo.raridade`. Valores brutos distintos encontrados: `comum`/`Comum`, `incomum`/`Incomum`, `raro`/`Raro`, `epico`/`Épico`, `lendario`/`Lendário`, `relíquia da criação`/`Relíquia da Criação`, `mitico`/`Mítico` — misturando maiúscula/minúscula e acentuação para a mesma raridade.

**Sistemas envolvidos:** Loja, Itens, Raridade.

**Por que isso causa problema numa sessão:** o backend (`content_seed.py`) normaliza acento/caixa antes de comparar com `_SHOP_RARITIES`, então isso **não derruba a API** (confirmado por verificação direta, nenhum valor escapa da normalização) — mas qualquer filtro no front-end que compare string exata (ex.: um dropdown "mostrar só itens raros") pode simplesmente não encontrar metade dos itens "raro" que estão grafados diferente.

**Gravidade:** Pequeno.

**Como corrigir:** normalizar a grafia de `raridade` no próprio `catalogo.json` para um padrão único (ex.: sempre minúsculo sem acento, como já é o padrão em `_SHOP_RARITIES`), preferencialmente com uma checagem automatizada (lint) que impeça isso de voltar a divergir.

**Exige mudança em outro lugar?** Não — é normalização de dados dentro do próprio `catalogo.json`.

---

### Achado 15 — Preços destoantes dentro do próprio catálogo

**Onde aparece:** `data/loja/catalogo.json`. Exemplos concretos:
- **Chicote de Plasma** (arma incomum, 2d6, corpo a corpo): 2.800 Lunaris — cerca de 100× o preço de armas incomuns/comuns com dano e alcance parecidos (ex.: Machado de Guerra 1d12 por 35 Lunaris), sem nenhum efeito extra listado que justifique o salto.
- **Couraça Primordial** (armadura lendária): 3.000 Lunaris por `+4` de Defesa, enquanto outras armaduras lendárias do catálogo (Anti-mágia, Armadura Solar) custam 900–1.000 Lunaris por `+20`/`+22`.
- **Vanguarda** (armadura raro, 95 Lunaris, `+13/-6`) rende quase o mesmo bônus que **Guardião** (épico, 200 Lunaris, `+15/-6`) por menos da metade do preço.

**Sistemas envolvidos:** Loja, Economia, Balanceamento.

**Por que isso causa problema numa sessão:** jogadores que conhecem o catálogo podem identificar esses itens como escolhas obviamente melhores (Vanguarda) ou obviamente descartáveis (Couraça Primordial, Chicote de Plasma) por puro desalinhamento de preço, não por escolha de build.

**Gravidade:** Pequeno.

**Como corrigir:** revisar esses preços pontuais contra a curva preço/bônus já consistente no resto do catálogo (a maioria das armas "mundanas", por exemplo, mantém uma relação preço/dano estável — esses três itens são exceções isoladas, não um padrão sistêmico).

**Exige mudança em outro lugar?** Não.

---

### Achado 16 — Nome de `limites.py` sugere algo que ele não faz; não existe limite de uso de poder/recurso por dia em lugar nenhum do backend

**Onde aparece:** `plataforma/core/limites.py` implementa só rate-limiting de autenticação (login, cadastro, troca de senha) — nada sobre recursos de personagem. Cooldowns de jogo (roubo, cofre) estão em `bots/banqueiro/core/economia.py`. Não foi encontrado, em nenhum dos dois lados, um limite de "X usos de poder por dia/descanso" além do que já é descrito textualmente em cada poder/magia (ex.: "uma vez por sessão").

**Sistemas envolvidos:** Backend, nomenclatura interna (não afeta jogadores diretamente).

**Por que isso causa problema numa sessão:** não afeta a mesa diretamente, mas é uma armadilha para quem for mexer no código depois (alguém procurando "onde reforçar limite de uso de poder" encontraria `limites.py` pelo nome e perderia tempo até descobrir que esse controle simplesmente não existe em lugar nenhum — reforça o Achado 8, já que os limites de "1x por sessão/cena/turno" descritos em texto em cada poder não têm nenhuma trava automática).

**Gravidade:** Pequeno.

**Como corrigir:** renomear `limites.py` para algo como `rate_limit_auth.py`, e — se for prioridade futura — decidir onde um eventual controle de "usos por sessão" de poderes vai morar (provavelmente junto de `sessao_participantes`, ver Achado 8).

**Exige mudança em outro lugar?** Não para o rename; sim (mesma frente do Achado 8) se decidirem automatizar limites de uso.

---

### Achado 17 — Sistemas mecanicamente completos mas sem nenhuma classe/habilidade que os referencie

**Onde aparece:** Ataques Combinados (`ataquesCombinados.ts`), Facções (`faccoes.ts`), Bases (`bases.ts`) e Veículos em Combate (`veiculosCombate.ts`) são sistemas internamente consistentes e bem escritos — mas nenhuma das 27 classes menciona bônus, sinergia ou interação especial com nenhum deles (por exemplo, nenhuma classe dá vantagem em Ataques Combinados, nenhuma tem afinidade mecânica com Facções além do que qualquer personagem teria).

**Sistemas envolvidos:** Ataques Combinados, Facções, Bases, Veículos, Classes.

**Por que isso causa problema numa sessão:** não é um bug, mas é uma oportunidade perdida de integração citada explicitamente no pedido original ("existem itens/habilidades que interagem com esse estilo de jogo?") — hoje Piloto é a única classe realmente ligada a Veículos em Combate (por conceito, não por bônus mecânico expresso citando `veiculosCombate.ts`), e nenhuma classe tem gancho parecido com Ataques Combinados ou Facções.

**Gravidade:** Pequeno (é lacuna de profundidade, não de funcionamento).

**Como corrigir:** não é uma correção obrigatória — é uma sugestão de expansão futura: ao revisar classes existentes ou desenhar novas, considerar ganchos explícitos com esses quatro sistemas (ex.: uma habilidade de Guerreiro ou Comandante que melhora especificamente Ataques Combinados).

**Exige mudança em outro lugar?** Não seria correção, seria conteúdo novo em `classes.json`.

---

### Achado 18 — Duplicação terminológica: "Sangramento" (condição) vs. "Sedenta" (modificação de arma)

**Onde aparece:** `condicoes.ts` define Sangramento como 1d6 de dano fixo no fim do turno, removível por cura ou DT 15. A modificação de arma "Sedenta" (`raridadesEquipamentos.ts`) recria um efeito equivalente (dano ao longo do tempo por ferimento aberto) mas usa o dado da própria arma no início do turno, com números diferentes, e não cita a condição "Sangramento" pelo nome — são duas implementações paralelas do mesmo conceito.

**Sistemas envolvidos:** Condições, Modificações de arma, Combate.

**Por que isso causa problema numa sessão:** um jogador atingido por uma arma "Sedenta" pode ficar em dúvida se isso aplica a condição oficial "Sangramento" (e portanto acumula/interage com outras fontes de Sangramento) ou é um efeito totalmente separado — a redação atual não deixa isso claro.

**Gravidade:** Pequeno.

**Como corrigir:** reescrever o efeito de "Sedenta" para explicitamente aplicar a condição "Sangramento" oficial (reaproveitando a regra de remoção e de empilhamento já definida em `condicoes.ts`), em vez de recriar o efeito do zero.

**Exige mudança em outro lugar?** Não — é edição de texto em `raridadesEquipamentos.ts`.

---

### Achado 19 — Sobreposição quase total entre "Atordoado" e "Inconsciente"

**Onde aparece:** `condicoes.ts`. Atordoado: sem ações/reações, Defesa −5, até fim do próximo turno. Inconsciente: não age/reage, Defesa −5, falha automática em testes de Força/Destreza, dura "enquanto persistir a causa". Mecanicamente quase idênticas, distinguidas só pela causa/duração e pela falha automática extra.

**Sistemas envolvidos:** Condições, Combate.

**Por que isso causa problema numa sessão:** não chega a ser uma contradição (as duas condições têm gatilhos diferentes e fazem sentido narrativamente separadas), mas é fácil, na hora do jogo, confundir qual das duas se aplica a uma queda de HP a 0 (que já tem sua própria regra específica de "Morrendo" em Ferimentos) versus um efeito que "atordoa".

**Gravidade:** Pequeno.

**Como corrigir:** nenhuma mudança mecânica necessária — só reforçar, na descrição de cada uma, quando usar uma e quando usar a outra (ex.: nota cruzada "veja também Inconsciente" na entrada de Atordoado).

**Exige mudança em outro lugar?** Não.

---

## 3. Duplicações, contradições e inconsistências terminológicas — resumo

| Tipo | Onde | Achado relacionado |
|---|---|---|
| Regra duplicada (dados divergentes) | Tiers de Cofre: bot vs. plataforma | 10 |
| Regra duplicada (conceito recriado) | Sangramento (condição) vs. Sedenta (mod de arma) | 18 |
| Padrão de dado inconsistente para o mesmo tipo de informação | Pré-requisitos tipados em Legados vs. texto livre em Modificações | 11 |
| Terminologia/grafia inconsistente | Raridade com maiúscula/minúscula/acento misturados | 14 |
| Documentação desatualizada vs. dados reais | `mestre-v1.json` sobre habilidades sem efeito | 3 |
| Livro público incompleto vs. dados reais | Classes/Raças/Legados/Perícias ausentes do `.md`; Condições com 6/11 | 1, 2 |
| Recurso descrito mas não suportado por nenhum campo/validação | Origem "Ofício" sem perícia correspondente | 4 |
| Mecânica sobreposta sem contradição real | Atordoado vs. Inconsciente | 19 |

Nenhuma **contradição numérica direta** foi encontrada entre `regras.ts` e `regras-publicas-v1.md` em si — o segundo é gerado automaticamente do primeiro, então onde os dois se sobrepõem, os números batem sempre. As divergências são todas de **omissão** (conteúdo que existe em um lugar do sistema e não é refletido em outro), não de números contraditórios entre duas fontes que deveriam concordar.

---

## 4. Pontas Soltas Prioritárias

Ordem sugerida de correção antes de somar novas classes, itens, magias ou mecânicas — pensada para consertar primeiro o que mais gera confusão de mesa e risco de economia, depois o que é confusão de documentação, por último polimento:

1. **Achado 3** — Atualizar `mestre-v1.json`: a nota "habilidades/poderes sem efeito" está errada e pode fazer o próprio mestre subutilizar conteúdo pronto. Correção de uma frase, impacto imediato.
2. **Achado 2** — Sincronizar a tabela pública de Condições com as 11 oficiais de `condicoes.ts` (e incluir a tabela de Crises de Sanidade). É a peça de regra mais usada em toda sessão de combate.
3. **Achado 6** — Decidir e implementar de vez a política de bloqueio de requisitos na loja (nível e, principalmente, classe) — hoje a validação existe mas não protege nada na prática.
4. **Achado 7 (Caixa do Coração / Chave sem Porta)** — Fechar os dois itens com potencial de quebra de economia antes que apareçam numa mesa.
5. **Achado 4** — Corrigir a origem "Artesão" (bônus morto) — baixo esforço, mas é uma promessa quebrada para qualquer jogador que escolha essa origem hoje.
6. **Achado 1** — Resolver a ausência de Classes/Raças/Legados/Perícias no livro público, ao menos com um link claro, antes de publicar mais conteúdo que também vai cair no mesmo buraco.
7. **Achado 5** — Revisar o gatilho de nível 10 do Cartista Arcano — enquanto ficar assim, é uma classe de magia "quebrada" por 9 níveis.
8. **Achados 8 e 9** — Mana e condições manuais em sessão ao vivo: não bloqueiam o jogo, mas são a maior distância entre "o quão preciso é o dado" e "o quão automatizada é a mesa"; vale means road-map, não urgência imediata.
9. **Achado 10 e 11** — Duplicações estruturais (Cofre; Modificações vs. Legados) — arrumar antes de crescer mais conteúdo em cima delas, porque quanto mais itens/mods forem adicionados no padrão de texto livre, mais caro fica migrar depois.
10. **Achados 12, 13, 14, 15, 16, 17, 18, 19** — polimento: podem esperar, nenhum bloqueia uma sessão, mas valem entrar numa passada de limpeza geral antes do próximo lote grande de conteúdo.

---

## O que está consistente e não precisa de ação

Para não deixar isso implícito: o sistema de magias (352 magias, distribuição por círculo/Fluxo, amarração a classe via `fontes_permitidas`, validação de aprendizado no backend), a integração de rituais com a loja (100% dos ingredientes existem como itens compráveis), a cobertura de `_SHOP_TYPES` sobre as categorias reais do catálogo, a validação de Legados/Marca-Cicatriz/Pecados-Virtudes na ficha, o isolamento correto da raça Entidade, e a geração automática (sem divergência numérica) do livro público a partir de `regras.ts` são todos pontos que já funcionam como um sistema único e coerente — não foram forçados a aparecer aqui só para preencher a análise.
