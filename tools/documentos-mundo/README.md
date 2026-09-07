# Documentos de mesa

Gera PDF a partir das fontes canônicas do repositório. Duas famílias, com
propósitos diferentes:

| Comando | Sai em | O que é |
|---|---|---|
| `npm run docs:props` | `docs/props/` | **Props in-game.** Documentos que o personagem acha e lê. É isto que vai pra mesa. |
| `npm run docs:guias` | `docs/players/` | Guias de referência neutros (enciclopédia). Úteis pro mestre consultar. |
| `npm run docs:livro` | `docs/livro/` | **O livro de regras inteiro**, diagramado como livro de RPG impresso. |
| `npm run docs:livro:mestre` | `docs/livro/` | O mesmo livro mais a edição que carrega os trechos do Mestre. |

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

`docs/livro/O-Jardim-Livro-de-Regras.pdf` é o sistema inteiro num volume só:
capa, folha de rosto, sumário com número de página, oito capítulos em duas
colunas e três apêndices. O conteúdo de cada assunto sai literal de
`data/regras/regras.ts`, a ordem e o agrupamento dos capítulos saem de
`navegacao.ts` e os títulos de `titulos.ts`. Não existe uma segunda versão do
texto para manter: corrigir a regra no catálogo já corrige o livro.

`docs/livro/O-Jardim-Livro-de-Regras-MESTRE.pdf` acrescenta o `corpoMestre` de
cada assunto, num trecho tingido no fim da página, e o capítulo Guia do Mestre.
Ele não vai para a mão dos jogadores.

### Os espaços de arte

O livro é diagramado antes de existir ilustração. Cada espaço reservado é uma
moldura tracejada com a altura final da imagem, o código dela e o pedido do que
deve estar ali, e o Apêndice B lista todos com a página onde caíram. O plano
inteiro vive em `artes.mjs`, que é o único arquivo a mexer para pedir mais uma
imagem ou trocar um pedido. Os códigos (ART-01, ART-02...) são atribuídos pelo
gerador na ordem em que os espaços aparecem, então nunca se escreve um à mão.

Quando a arte chegar, trocar a moldura pela imagem não remexe a paginação em
volta, porque o espaço já ocupa a altura definitiva.

### Como o miolo é montado

`livro-regras.mjs` devolve o conteúdo corrido, em blocos irmãos.
`gerar-livro.mjs` carrega isso no Chrome e é lá dentro que o livro acontece:

1. o HTML do catálogo é arrumado para papel (`details` aberto virando título,
   tabela sem o wrapper de rolagem que só existe na tela, tabela de cinco
   colunas ou mais marcada como larga);
2. os blocos são medidos e distribuídos em páginas de duas colunas de verdade,
   com bloco alto sendo dividido linha a linha e o cabeçalho da tabela
   repetido na continuação;
3. as páginas são numeradas em ordem de leitura, com margem espelhada;
4. só então os apêndices são montados, porque referência rápida, mapa das artes
   e índice remissivo precisam saber em que página cada coisa caiu;
5. o sumário é preenchido.

Cada página tem três faixas: `.acima` e `.abaixo`, de largura inteira, para
tabela larga, arte e abertura de assunto, e `.corpo` no meio, em duas colunas.
Um bloco largo que aparece com as colunas já ocupadas tenta primeiro o pé da
página, e as colunas são remedidas para a altura que sobrou. Sem isso, um
catálogo de tabelas produziria uma sequência de páginas pela metade.

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
ou por ser mais alto que a página inteira. A saída termina em `Pronto, nada
cortado.`

## Requisitos

Chrome ou Edge instalado (caminhos em `render.mjs`), Node 22+ pelo `WebSocket`
nativo, e `pypdf` no Python apenas para `docs:guias`, que costura capa e miolo.
Nenhuma fonte é baixada da internet: todas as famílias usadas são nativas do
Windows, de propósito, pra geração funcionar offline.
