# Documentos de mesa

Gera PDF a partir das fontes canônicas do repositório. Duas famílias, com
propósitos diferentes:

| Comando | Sai em | O que é |
|---|---|---|
| `npm run docs:props` | `docs/props/` | **Props in-game.** Documentos que o personagem acha e lê. É isto que vai pra mesa. |
| `npm run docs:guias` | `docs/players/` | Guias de referência neutros (enciclopédia). Úteis pro mestre consultar. |
| `npm run docs:livro` | `docs/livro/` | **O livro de regras inteiro**, diagramado como livro de RPG impresso. É o PDF que o site oferece para baixar. |
| `npm run docs:livro:mestre` | `docs/livro/` | O mesmo livro mais a edição que carrega os trechos do Mestre (fora do pacote da plataforma). |
| `npm run docs:mestre` | `docs/mestre/` | **Kit do Mestre.** Folha de preparação de sessão e a aventura pronta de nível 1. |
| `npm run docs:cartoes` | `docs/cartoes/` | **Cartões de condição** para imprimir e recortar: A4, 9 por folha (63 x 88 mm), com marca de corte. Três PDFs: cena e crises, lesões e sequelas, saúde mental. O texto sai de `data/regras/condicoes.ts` e `condicoes-longo-prazo.ts`; cada cartão encolhe a fonte sozinho até caber e o gerador avisa se algum não couber. |

## De onde vem o conteúdo

Nada é escrito à mão duas vezes. A descrição de lore sai literal de:

- `data/mundo/**.json` — Deidades, Fluxos, Galhos, Dimensões, Reinos, eventos
- `data/mundo/cronicas-arvores.json` — tese, atmosfera e cronologia por Árvore
- `data/mundo/faccoes.json` — facções universais
- `data/ficha/racas.json` — os povos
- `data/mundo/arvoresCatalog.ts` — a paleta canônica das Árvores, lida por regex

Se a lore mudar lá, é só rodar de novo. O que os arquivos deste diretório
acrescentam é a moldura: a voz de quem escreveu o documento e a papelada em
volta.

## O livro de regras

`docs/livro/O-Jardim-Livro-de-Regras.pdf` é o sistema inteiro num volume só, para
ler como se lê um livro de RPG: capa, folha de rosto, sumário clicável, "Como
usar este livro", um capítulo por grupo da navegação (cada um com abertura
escura e a cor dele), os tópicos correndo em duas colunas, o Compêndio (as
fichas completas de classes e raças, os Legados e as magias), dois apêndices
(referência rápida e índice remissivo) e contracapa. É o PDF que o site oferece
para baixar dentro do próprio Livro de Regras.

O conteúdo de cada tópico sai literal de `data/regras/regras.ts`. A ordem, o
agrupamento em capítulos, a numeração (3.4 é o quarto tópico do capítulo 3), as
cores e as trilhas de leitura saem de `data/regras/livro.ts`, o mesmo módulo
que o site usa. Não existe uma segunda versão do texto para manter: corrigir a
regra no catálogo já corrige o livro, e mudar a navegação do site reordena o PDF.

`docs/livro/O-Jardim-Livro-de-Regras-MESTRE.pdf` acrescenta o `corpoMestre` de
cada tópico, num trecho tingido depois do texto do jogador, o capítulo Guia
do Mestre e as classes e raças especiais no Compêndio. Ele não vai para a mão
dos jogadores.

### O que o gerador escreve

| Arquivo | O que é |
|---|---|
| `O-Jardim-Livro-de-Regras.pdf` | Edição do jogador. É a que viaja no pacote da plataforma. |
| `O-Jardim-Livro-de-Regras-MESTRE.pdf` | Edição do Mestre (`--mestre`). Fica fora do pacote. |
| `livro-manifesto.json` | Páginas, tamanho, hash, data e a página onde cada capítulo e tópico começam. A plataforma lê isto para o botão de download e para o link "Ler no PDF, página N" de cada tópico. |
| `*-PLANO-DE-ARTE.pdf` | Edição de planejamento de arte (`--com-espacos-de-arte`). Material de trabalho, fora do manifesto. |

Opções: `--mestre` gera também a edição do Mestre; `--com-espacos-de-arte`
gera a versão com as molduras de ilustração; `--so-html` só monta o HTML;
`--conferir` compara o texto de hoje com o PDF publicado (hash do conteúdo no
manifesto) e sai com código 1 se o PDF estiver desatualizado, sem gerar nada.

### Como o PDF chega ao site

A rota `GET /api/v1/livro` lista as edições que a conta pode baixar e
`GET /api/v1/livro/pdf/{edicao}` entrega o arquivo (`plataforma/routers/livro.py`).
Qualquer conta recebe a edição do jogador; a do Mestre só vai para quem conduz
a campanha informada, ou admin e criador. A rota procura os arquivos em
`data/livro/` (pacote de produção) e em `docs/livro/` (repositório), e só
oferece uma edição cujo arquivo existe.

O pacote da plataforma tem teto de upload na hospedagem (100 MB) e já passa de
90 MB, então `tools/build-discloud-packages.ps1` leva só a edição do jogador e
o manifesto dela. O que pesa no pacote é o PDF depois do ZIP (a estrutura do PDF
etiquetado comprime cinco para um: 9 MB de arquivo viram uns 3,6 MB), então o
gerador mostra os dois tamanhos e avisa quando o comprimido passa de 6 MB.
Depois de mudar o texto das regras, rode `npm run docs:livro` antes de montar o
pacote (o script de build avisa se o PDF estiver desatualizado).

### O que o texto de um tópico pode usar

O livro lê as mesmas classes que o site (`src/pages/Regras/leitor.css`).
Elas precisam passar pelo validador do editor, então são só `div`, `p`, `span`
e afins com classe `regras-*`:

- `p.regras-lead`: a frase de abertura do tópico (ganha capitular).
- `div.regras-resumo > ul`: a caixa "Em resumo" do começo do tópico.
- `.regras-note`, com `--exemplo`, `--atencao`, `--dica` ou `--regra`: caixas
  com rótulo ("Exemplo", "Atenção", "Dica de mesa", "Regra").
- `div.regras-quadro`: caixa para variante opcional ou assunto à parte.
- `span.regras-ref.regras-ref--<id>`: remissão a outro tópico. No site vira link;
  no PDF vira link com a página ("Combate (p. 28)"). Se o tópico não está na
  edição (o Guia do Mestre, no volume do jogador), vira texto simples.

### O Compêndio

As listas longas moram, no site, em componentes interativos (`GridClasses`,
`DetalhesClasse`, `GridRacas`, `DetalhesRaca`, `CatalogoLegados`,
`CatalogoMagico`) que substituem o texto dos tópicos `classes`, `racas` e
`catalogo-magico`. Num PDF não há clique nem filtro, então `compendio.mjs`
imprime o mesmo conteúdo como entradas de livro, lido dos mesmos arquivos de
dados e das mesmas funções de serviço que a tela usa (`classeService`,
`racaService`, `magiaService`, `catalogoService`). Não há texto escrito à mão
nele: mudou o dado, mudou o compêndio no próximo `npm run docs:livro`.

| Parte | O que traz | Entrada |
|---|---|---|
| Compêndio A, Classes | regras próprias da classe, progressão do nível 1 ao 20, Maestria, magia da classe, habilidades com estágios e opções, eventos e poderes | uma classe por entrada, em ordem alfabética |
| Compêndio B, Raças | ajuste inicial, fisiologia, características, estágios e as escolhas da raça (clã, forma, linhagem, animal) | uma raça por entrada |
| Compêndio C, Legados | todos os Legados, com pré-requisito e efeito | uma entrada só, em cartões |
| Compêndio D, Magias | magias por Fluxo e por círculo, rituais, selos, encantamentos e fusões | uma entrada por Fluxo e uma por forma |

A visibilidade é a de `src/services/visibilidadeRegras.ts`. A edição do jogador
leva só as classes e raças comuns, porque as especiais dependem de o Mestre
liberar mesa a mesa e o PDF é o mesmo para todas; a do Mestre leva todas. A
raça personalizada e a Entidade não têm ficha mecânica e ficam de fora.

Cada entrada abre página nova e é feita de blocos soltos (título, parágrafo,
lista, tabela), nunca de uma caixa alta com tudo dentro: o paginador só divide
listas, tabelas e definições, e uma caixa mais alta que a página sairia
cortada. Os nomes de habilidade, magia e estágio entram no índice remissivo.
Nas listas dos tópicos `classes` e `racas`, o nome de cada classe e raça vira
remissão para a entrada, com a página.

Alguns tópicos falam em "catálogo do site" onde o PDF tem o Compêndio. O texto
do tópico é um só, então a troca é feita na montagem do PDF, por
`AJUSTES_DO_PDF` em `compendio.mjs`. Se alguém reescrever uma dessas frases, a
montagem para com um erro que diz qual (um teste confere o mesmo).

Tabela de texto corrido numa coluna estreita (as condições, o catálogo de
Legados) vira, só no PDF, uma pilha de cartões: o nome em cima, a duração e
demais campos curtos ao lado e os campos longos em linhas de verdade. A regra
está no paginador (`gerar-livro.mjs`): de 3 a 5 colunas e a mediana do maior
campo por linha com 140 caracteres ou mais, ou a marca `data-cartoes` na tabela.

### Artes próprias das capas

A capa, a contracapa e a abertura de cada capítulo e de cada parte do
Compêndio usam o emblema em vetor. Quem preferir uma arte própria guarda a
imagem em `docs/livro/artes/` com o nome combinado (`capa`, `contracapa`,
`abertura-<id>`) e roda `npm run docs:livro`: a imagem vira a página inteira,
com um véu escuro por baixo do texto, e a capa sem arquivo segue com o
emblema. `artes-prontas.mjs` faz a leitura; o que não for JPEG, ou passar de
700 KB, é reduzido e regravado como JPEG dentro do Chrome na hora de imprimir.
Os nomes, as medidas e os pedidos para gerar cada imagem estão em
`docs/livro/artes/`. O conteúdo das imagens entra no hash do livro, então
trocar uma imagem faz o `--conferir` pedir um PDF novo.

### Os espaços de arte

A edição de distribuição não traz espaço de arte. A de planejamento
(`--com-espacos-de-arte`) volta a trazer as molduras tracejadas, cada uma com a
altura final da imagem, o código e o pedido do que deve estar ali, e o Mapa das
Artes lista todas com a página onde caíram. O plano vive em `artes.mjs`, o único
arquivo a mexer para pedir mais uma imagem. Os códigos (ART-01, ART-02...) são
atribuídos pelo gerador na ordem em que os espaços aparecem.

Sem arte própria, a capa e as aberturas de capítulo usam o emblema da árvore
(`emblema.mjs`, o mesmo desenho do ícone do app) em vetor, sem imagem. Isso é
de propósito: gradiente com transparência e padrão repetido viram bitmap no
PDF e pesam.

### Como o miolo é montado

`livro-regras.mjs` devolve o conteúdo corrido, em blocos irmãos.
`gerar-livro.mjs` carrega isso no Chrome e é lá dentro que o livro acontece:

1. o HTML do catálogo é arrumado para papel (`details` aberto virando título,
   tabela sem o wrapper de rolagem que só existe na tela, tabela de cinco
   colunas ou mais marcada como larga, título de tópico encolhido até caber
   numa linha de coluna);
2. os blocos são medidos e distribuídos em páginas de duas colunas de verdade,
   com bloco alto sendo dividido linha a linha e o cabeçalho da tabela
   repetido na continuação. Os tópicos correm um atrás do outro; só o capítulo
   abre página nova;
3. as páginas são numeradas em ordem de leitura, com margem espelhada. A capa é
   a página 1 (sem número impresso), então o número no texto é o mesmo que o
   leitor de PDF mostra e `#page=N` abre a página certa;
4. só então os apêndices são montados, porque a referência rápida e o índice
   remissivo precisam saber em que página cada coisa caiu;
5. o sumário e as remissões são preenchidos. Até lá cada remissão reserva o
   espaço de "(p. 000)", senão o texto cresceria depois de medido e estouraria
   a coluna.

O PDF sai com marcadores (o índice que os leitores de PDF mostram ao lado) e
etiquetado. O Chrome só gera os marcadores junto do PDF etiquetado, e a
estrutura de etiquetas é a maior parte do arquivo (uns 6 MB de 9), mas ela
comprime bem: dentro do ZIP do pacote o PDF do jogador pesa uns 3,6 MB.

Cada página tem três faixas: `.acima` e `.abaixo`, de largura inteira, para
tabela larga e arte, e `.corpo` no meio, em duas colunas. Um bloco largo que
aparece com as colunas já ocupadas tenta primeiro o pé da página, e as colunas
são remedidas para a altura que sobrou. Sem isso, um catálogo de tabelas
produziria uma sequência de páginas pela metade.

Os números usam algarismos alinhados (`font-variant-numeric: lining-nums`), porque
o 0 em estilo antigo parece um "o" numa tabela de regras. O texto corre
alinhado à esquerda, sem justificar. O Chrome não hifeniza pt-BR
sem dicionário, e justificar sem hifenização abre rios de espaço nas colunas
estreitas.

## O kit do Mestre

`docs/mestre/` tem duas peças de trabalho, não de ficção: a **Folha de
Preparação de Sessão**, duas páginas para preencher a lápis antes da mesa, e
**Dois Passageiros**, uma aventura de uma sessão para o nível 1 que usa o prop
`Avulso-Aviso-Caravana` como material de apoio. Junto vêm outras quatro aventuras de uma
sessão (`aventuras-do-jardim.mjs`: *O Moinho da Terceira Roda*, nível 5, *O Leilão da Casa Vazia*,
nível 12, *O Redemoinho de Caribdis*, nível 30, e *A Queda do Leviatã Espelhado*, nível 45) e o
**Arco da Malha** (`arco-da-malha.mjs`), cinco sessões para os níveis 40 a 55, só do Mestre. As fichas
inventadas saem de `modeloDeCriatura` (`componentes-aventura.mjs`), por isso `npm run docs:mestre`
roda com o carregador de TypeScript. As criaturas únicas das duas últimas aventuras usam a ficha do
Bestiário e as fases que a Sessão avisa, e um teste confere o nome de cada fase.

Elas usam `estilo-mestre.mjs`, que é claro e seco de propósito: papel
envelhecido gasta tinta e atrapalha quem escreve por cima. As páginas têm
tamanho fixo e são desenhadas folha a folha, então aqui não existe paginador.
O que existe é a medição inversa: `gerar-mestre.mjs` mede cada folha montada e
diz quantos milímetros passaram de 297mm, e a saída termina em `Pronto, sem
transbordo.` quando está tudo dentro. Para reescrever um texto sabendo de
antemão quanto ele pode crescer, rode `node tools/documentos-mundo/gerar-mestre.mjs --folga`:
o gerador passa a dizer também quantos milímetros livres sobram em cada folha.

A verba por sessão impressa na folha sai de `data/economia/escala-precos-v1.json`,
lida na geração. Mudou a escala, mudou a folha.

## Os props

`Dossie-Cadernos-de-Campo.pdf` é um caso fechado em sete documentos, montado
pra ensinar o cenário enquanto os jogadores acham que estão investigando uma
pessoa. `Dossie-FOLHA-DO-MESTRE.pdf` tem a solução e **não vai pra mesa**.
Os `Avulso-*.pdf` são peças soltas, uma página cada, sem ligação entre si.

Para renomear a pesquisadora ou mudar o ano da campanha, mexa só nas constantes
`PESQUISADORA` e `ANO`, no topo de `dossie.mjs`.

## Como funciona

- `dados.mjs` carrega e normaliza as fontes canônicas
- `estilo.mjs` / `estilo-props.mjs` são as folhas de estilo (guia e prop)
- `documentos.mjs`, `dossie.mjs`, `mestre.mjs`, `avulsos.mjs` montam o HTML
- `render.mjs` fala o protocolo de depuração do Chrome e imprime
- `livro-regras.mjs`, `estilo-livro.mjs`, `emblema.mjs` e `gerar-livro.mjs` montam o livro de regras
- `gerar.mjs` / `gerar-props.mjs` são os dois runners

O HTML intermediário fica em `docs/*/\_html/` (ignorado pelo git). Quando um
bloco quebrar feio, é mais rápido abrir esse HTML no navegador e mexer no CSS do
que caçar no PDF.

### Duas armadilhas já resolvidas, pra não voltarem

**Paginação.** O Chrome quebra sozinho uma seção mais alta que a página, mas a
folha seguinte nasce colada na borda do papel: `padding` de bloco só é aplicado
no começo e no fim do bloco, nunca nos fragmentos do meio. Por isso os dois
runners trazem um paginador que roda na página, mede os filhos e monta as folhas
na mão. Sem ele, o texto encosta na borda e passa por cima do número da página.

**Sangria.** Página escura de ponta a ponta (capa, abertura de capítulo) exige
`@page { margin: 0 }` e padding na própria seção. Margem de `@page` com margem
negativa no bloco **não** sangra no Chrome: foi testado e o bloco continua preso
dentro da caixa de conteúdo.

### Verificação automática

`gerar-props.mjs` mede cada folha antes de imprimir e avisa quando o conteúdo
passa dos 297mm, porque um prop que transborda vira uma segunda página quase
vazia no PDF. Decoração posicionada de forma absoluta (mancha, carimbo, nota de
margem) não conta: ela passa da borda de propósito e o `overflow: hidden` corta.

A saída termina em `Pronto, sem transbordo.` quando está tudo certo. Se aparecer
um transbordo, enxugue o texto daquela peça em vez de ignorar.

`gerar-livro.mjs` faz a conferência equivalente no livro: mede cada página
montada e avisa quando algum bloco foi cortado, seja por passar das duas colunas
ou por ser mais alto que a página inteira, e quando uma remissão ficou sem
número de página. A saída termina em `Pronto, nada cortado.`

## Requisitos

Chrome ou Edge instalado (caminhos em `render.mjs`), Node 22+ pelo `WebSocket`
nativo, e `pypdf` no Python apenas para `docs:guias`, que costura capa e miolo.
Nenhuma fonte é baixada da internet: todas as famílias usadas são nativas do
Windows, de propósito, pra geração funcionar offline.
