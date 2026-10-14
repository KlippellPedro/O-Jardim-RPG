# Prompts das capas do Livro de Regras

Estes são os pedidos para gerar, no GPT, a imagem de cada capa do livro: a capa, a contracapa, a abertura dos
oito capítulos, a do Guia do Mestre e a das quatro partes do Compêndio. Hoje todas usam a árvore dourada em
vetor. Cada capa é independente: a que ganhar arquivo na pasta `docs/livro/artes/` troca o emblema pela
imagem, e as outras continuam com a árvore.

## Como usar

1. Abra uma conversa nova no GPT e cole o **Prompt de estilo** (logo abaixo) uma vez.
2. Cole o pedido de cada capa, um por vez, na mesma conversa. Assim o GPT mantém o mesmo estilo nas quinze imagens.
   Se preferir uma conversa por imagem, cole o Prompt de estilo junto de cada pedido.
3. Gere em **1024 × 1536** (vertical, 2:3). Se a imagem vier com texto ou letra escrita, peça de novo:
   "Refaça sem nenhum texto na imagem."
4. Salve como **JPG** com o nome da tabela, em `docs/livro/artes/`, e rode `npm run docs:livro`.
   PNG também funciona: o gerador reduz e regrava como JPEG na hora de montar o PDF.

A imagem ocupa a página inteira (210 × 297 mm). Por cima dela o livro põe o título e, nas aberturas, o número do
capítulo, o resumo e a lista de tópicos, sobre um véu escuro que cobre a parte de baixo. Por isso todo pedido
manda o assunto principal para a metade de cima e deixa a de baixo escura e calma.

| Capa | Arquivo | Cor de acento |
| --- | --- | --- |
| Capa do livro | `capa.jpg` | ouro antigo `#d8bd75` |
| Contracapa | `contracapa.jpg` | ouro antigo `#d8bd75` |
| Capítulo 1, Primeiros Passos | `abertura-primeiros-passos.jpg` | verde `#4a8c68` |
| Capítulo 2, Personagem e Progressão | `abertura-personagem.jpg` | azul `#4274a8` |
| Capítulo 3, Combate | `abertura-combate.jpg` | vermelho `#a03e4a` |
| Capítulo 4, Cenas e Grupo | `abertura-cenas.jpg` | cobre `#b46834` |
| Capítulo 5, Magia e Fluxos | `abertura-magia.jpg` | roxo `#7650a4` |
| Capítulo 6, Equipamentos e Criação | `abertura-itens.jpg` | âmbar `#a67834` |
| Capítulo 7, Veículos e Viagens | `abertura-veiculos.jpg` | turquesa `#36828c` |
| Capítulo 8, Mundo e Recursos | `abertura-mundo.jpg` | verde-oliva `#688a3a` |
| Capítulo 9, Guia do Mestre (só edição do Mestre) | `abertura-mestre.jpg` | dourado `#a6843a` |
| Compêndio A, Classes | `abertura-compendio-classes.jpg` | azul `#4274a8` |
| Compêndio B, Raças | `abertura-compendio-racas.jpg` | verde-oliva `#688a3a` |
| Compêndio C, Legados | `abertura-compendio-legados.jpg` | âmbar `#a67834` |
| Compêndio D, Magias | `abertura-compendio-magias.jpg` | roxo `#7650a4` |

## Prompt de estilo (cole uma vez, no começo)

```text
Você vai criar uma série de ilustrações de capa para um livro de regras de RPG de fantasia chamado "O Jardim". Mantenha o mesmo estilo em todas as imagens da série.

Estilo: pintura digital sombria e elegante, com acabamento de ilustração de livro de RPG, luz dramática e contida, sensação de gravura antiga com cor. Pinceladas visíveis, textura sutil de papel, nada de aparência de render 3D ou de foto.

Paleta: noite violeta e quase preto (#1d1729, #120e1b, #0d0a14) como base, ouro envelhecido (#d8bd75) nos detalhes e UMA cor de acento por imagem, que eu indico em cada pedido.

Mundo: o Jardim é um conjunto de Árvores gigantes, cada uma uma realidade inteira suspensa num vazio escuro. Galhos largos servem de estrada. A Árvore do emblema do livro tem tronco grosso, quatro bifurcações simétricas, pontas dos galhos terminando em pequenas esferas de luz dourada e uma raiz curva na base.

Regras para todas as imagens: formato vertical 2:3 (1024 por 1536 pixels). Nenhum texto, letra, número, logotipo, moldura ou marca d'água. A composição precisa receber título por cima: o assunto principal fica na metade de cima, e a metade de baixo fica escura, calma e sem detalhes importantes. Nada importante encostado nas bordas. Rostos e mãos corretos. Não copie personagens, marcas nem o estilo de artistas vivos.

Responda só com a imagem, uma por pedido.
```

## 1. Capa do livro

Arquivo `capa.jpg`. O título "O Jardim" fica sobre os 60% a 85% da altura, então os 40% de baixo precisam ser escuros e lisos.

```text
Capa do livro "O Jardim", formato vertical 2:3.

Cena: ao fundo e no centro do terço de cima, uma Árvore colossal e simétrica atravessa um vazio escuro e estrelado, com tronco grosso, quatro bifurcações e pontas de galho terminando em pequenas esferas de luz dourada, como o emblema do livro. No meio da imagem, em primeiro plano, a ponta de outro galho, largo o bastante para ser estrada, e nele um grupo pequeno de quatro viajantes visto de costas, parado na beira, olhando para a Árvore gigante. A luz vem de trás da Árvore e das esferas, então os viajantes chegam quase como silhueta recortada, com um fio de luz dourada nas bordas.

Acento: ouro antigo (#d8bd75) sobre violeta-noite. Sensação de vastidão e de começo de viagem, sem perigo imediato.

Composição: o assunto todo cabe nos 58% de cima. Os 42% de baixo descem para violeta quase preto, liso, com neblina muito suave e sem nenhum detalhe, porque ali entra o título. Nada de texto na imagem.
```

## 2. Contracapa

Arquivo `contracapa.jpg`. Um parágrafo curto fica centralizado no meio da página, sobre um véu escuro. A imagem funciona como atmosfera de fundo.

```text
Contracapa do livro "O Jardim", formato vertical 2:3, imagem de fundo calma e de baixo contraste.

Cena: visão ampla e silenciosa do Jardim visto de longe. Dezenas de Árvores gigantes, pequenas pela distância, flutuam como ilhas num vazio violeta muito escuro, cada uma com uma luz de cor diferente (dourado, azul, verde, vermelho, roxo, prateado), em escala e distância variadas. Estrelas fracas ao fundo. Nenhuma pessoa, nenhuma construção.

Acento: ouro antigo (#d8bd75), usado com moderação nas luzes.

Composição: as Árvores ficam espalhadas pelo terço de cima e pelas laterais, e o centro e a parte de baixo ficam quase vazios e escuros, porque um parágrafo de texto vai por cima. Tudo em tons baixos, sem brilho forte, sem contraste duro. Nada de texto na imagem.
```

## 3. Capítulo 1, Primeiros Passos

Arquivo `abertura-primeiros-passos.jpg`. Este capítulo fala das pessoas que jogam: a fantasia só começa no capítulo seguinte.

```text
Abertura do capítulo 1 "Primeiros Passos" de um livro de RPG, formato vertical 2:3.

Cena: uma mesa de jogo vista de cima, à noite, sob a luz quente de uma única luminária. Fichas de personagem espalhadas, lápis e borracha, uma caneca esquecida, dados de vários formatos parados sobre o papel. Uma das mãos ainda está no ar, no gesto de quem acabou de soltar um d20 que ainda rola. Nada de fantasia na imagem: só uma mesa de gente que joga. Mantenha os detalhes ricos e acolhedores, como uma pintura de natureza-morta.

Acento: verde (#4a8c68) no feltro da mesa e em reflexos suaves, com luz quente âmbar da luminária.

Composição: a mesa e a mão ocupam a metade de cima. A metade de baixo desce para uma sombra escura e uniforme, sem objetos, porque ali entram o título e a lista de tópicos. Nada de texto na imagem, inclusive nas fichas (deixe-as ilegíveis).
```

## 4. Capítulo 2, Personagem e Progressão

Arquivo `abertura-personagem.jpg`.

```text
Abertura do capítulo 2 "Personagem e Progressão" de um livro de RPG, formato vertical 2:3.

Cena: a mesma pessoa três vezes, lado a lado, de pé e de perfil, na mesma postura e com o mesmo rosto, em três momentos da vida. À esquerda, roupa comum e nenhuma marca. No meio, uma cicatriz no rosto e o equipamento de quem já trabalhou muito, desgastado. À direita, alguém que não é mais inteiramente humano: veias de luz sob a pele, um detalhe que não existia antes. A diferença toda está no que a vida deixou, e não na pose.

Acento: azul (#4274a8), como luz de lua fria vinda de um lado, sobre fundo violeta quase preto.

Composição: as três figuras ocupam a metade de cima, cada uma do tamanho de cerca de 40% da altura da imagem, bem separadas. A metade de baixo é uma névoa escura e lisa, sem detalhes. Nada de texto na imagem.
```

## 5. Capítulo 3, Combate

Arquivo `abertura-combate.jpg`.

```text
Abertura do capítulo 3 "Combate" de um livro de RPG, formato vertical 2:3.

Cena: um instante travado no meio de uma troca de golpes, em plano fechado. Duas figuras se cruzando, uma lâmina cortando o ar, poeira e faíscas congeladas, uma gota de sangue no alto do quadro. Mais atrás, desfocado, um terceiro personagem já caído, sendo puxado por um quarto para fora da luta. O foco narrativo é a decisão de quem puxa o ferido, e não a vitória de quem ataca.

Acento: vermelho (#a03e4a), em uma luz rasante de lado que recorta os corpos, sobre um fundo violeta quase preto.

Composição: a ação inteira cabe na metade de cima, com os corpos em escala grande. A metade de baixo se dissolve em poeira e sombra escuras e lisas, sem detalhe. Nada de texto na imagem.
```

## 6. Capítulo 4, Cenas e Grupo

Arquivo `abertura-cenas.jpg`.

```text
Abertura do capítulo 4 "Cenas e Grupo" de um livro de RPG, formato vertical 2:3.

Cena: uma rua estreita de cidade antiga, vista do alto de uma escada, no fim do dia. Alguém corre na frente e vira a esquina, e só o ombro dele ainda aparece. Dois personagens vêm atrás, em velocidades diferentes, um quase alcançando e o outro ofegante. Um terceiro parou no meio do caminho para falar com um guarda que bloqueia a passagem de braços abertos. A imagem mostra as duas cenas ao mesmo tempo: quem corre e quem negocia.

Acento: cobre (#b46834), em lampiões acesos e reflexos nas pedras molhadas, sobre sombras violeta-noite.

Composição: a rua e os personagens ficam na metade de cima, com a perspectiva descendo da escada para o fundo. A metade de baixo é a sombra espessa dos degraus e do chão, escura e lisa. Nada de texto na imagem, inclusive em placas e letreiros.
```

## 7. Capítulo 5, Magia e Fluxos

Arquivo `abertura-magia.jpg`.

```text
Abertura do capítulo 5 "Magia e Fluxos" de um livro de RPG, formato vertical 2:3.

Cena: um conjurador de perfil, com uma Marca de Círculo acesa subindo pela pele do braço até o pescoço, como uma tatuagem de luz que queima. A luz da Marca é a única fonte de luz da cena. O rosto mostra o preço de conjurar, com olhos fundos e a mandíbula travada, em vez de triunfo. Ao redor, no ar escuro, desenhos geométricos muito finos de círculos concêntricos, quase invisíveis.

Acento: roxo (#7650a4), com um fio de ouro antigo (#d8bd75) na própria Marca.

Composição: o conjurador, do peito para cima, ocupa a metade de cima, levemente deslocado para um lado. A metade de baixo é um escuro profundo e liso, com apenas um fio de luz da Marca descendo e se apagando. Nada de texto na imagem, nem runas legíveis.
```

## 8. Capítulo 6, Equipamentos e Criação

Arquivo `abertura-itens.jpg`.

```text
Abertura do capítulo 6 "Equipamentos e Criação" de um livro de RPG, formato vertical 2:3.

Cena: uma bancada de oficina vista de cima, ocupada de ponta a ponta. Uma lâmina desmontada em três peças, matéria-prima em caixas separadas (metal, couro, cristal), ferramentas pesadas, uma folha com anotações e cálculos rabiscados à mão e um selo mágico gravado numa placa, ainda apagado. Nenhuma pessoa na imagem: só o trabalho parado no meio. Muito detalhe de oficina real, madeira marcada, fuligem, limalha.

Acento: âmbar (#a67834), na luz de uma lamparina e no brilho do metal, sobre sombras violeta.

Composição: a bancada ocupa a metade de cima, com a lâmina desmontada no centro. A metade de baixo escurece para madeira queimada e sombra, lisa, sem objetos. Nada de texto na imagem, inclusive nas anotações (deixe-as ilegíveis).
```

## 9. Capítulo 7, Veículos e Viagens

Arquivo `abertura-veiculos.jpg`.

```text
Abertura do capítulo 7 "Veículos e Viagens" de um livro de RPG, formato vertical 2:3.

Cena: uma perseguição numa estrada alta e larga, vista de trás do veículo da frente, num mundo de fantasia com tecnologia rústica (motores, chapas, fumaça). O veículo que persegue vem duas faixas atrás, meio encoberto pela poeira. Uma das pessoas do veículo da frente está virada para trás, apoiada na borda, resolvendo um problema mecânico com as mãos enquanto outra conduz. Muita sensação de velocidade, poeira e vento.

Acento: turquesa (#36828c), na luz fria da madrugada e em faróis, sobre violeta-noite.

Composição: os veículos e a estrada ficam na metade de cima, com o ponto de fuga alto. A metade de baixo é o asfalto e a poeira escuros, lisos e sem detalhes. Nada de texto na imagem, inclusive em placas.
```

## 10. Capítulo 8, Mundo e Recursos

Arquivo `abertura-mundo.jpg`.

```text
Abertura do capítulo 8 "Mundo e Recursos" de um livro de RPG, formato vertical 2:3.

Cena: uma praça de mercado no fim do dia, com movimento de gente que trabalha. No primeiro plano, uma balança de pratos e moedas de três metais diferentes (prata fosca, ouro, e uma moeda que parece guardar luz de estrela) trocando de mão. Ao fundo, sem destaque, a fachada de pedra de uma agência bancária com dois guardas parados na porta. A cena mostra dinheiro circulando, e a riqueza aparece apenas num canto, sem exagero.

Acento: verde-oliva (#688a3a), em tecidos, frutas e toldos, com luz dourada baixa de fim de tarde.

Composição: a praça, a balança e a fachada ficam na metade de cima. A metade de baixo desce para o chão de pedra na sombra, escuro e liso, sem detalhes. Nada de texto na imagem, inclusive em placas e na fachada.
```

## 11. Capítulo 9, Guia do Mestre

Arquivo `abertura-mestre.jpg`. Só aparece na edição do Mestre.

```text
Abertura do capítulo 9 "Guia do Mestre" de um livro de RPG, formato vertical 2:3.

Cena: a cadeira de quem conduz a mesa, vista do lado de dentro do escudo do mestre. Anotações espalhadas, um mapa marcado a lápis, a ordem de iniciativa numa lista, e dois dados escondidos atrás do papelão do escudo. A mesa dos jogadores aparece do outro lado, desfocada e longe, com figuras pequenas à luz de uma vela. O ponto de vista é o de quem sabe o que vem e ainda não contou.

Acento: dourado (#a6843a), na luz da vela e nos detalhes do escudo, sobre violeta quase preto.

Composição: o escudo, as anotações e a mesa ao fundo ficam na metade de cima. A metade de baixo é a face interna do escudo em sombra, lisa e escura. Nada de texto na imagem, inclusive nas anotações (deixe-as ilegíveis).
```

## 12. Compêndio A, Classes

Arquivo `abertura-compendio-classes.jpg`.

```text
Abertura do Compêndio A "Classes" de um livro de RPG, formato vertical 2:3.

Cena: uma fila de silhuetas de corpo inteiro numa ponte de galho, ombro a ombro, cada uma com equipamento e postura que bastam para dizer o ofício sem legenda: quem segura a linha de frente com escudo, quem mira de longe, quem cuida dos feridos com uma bolsa, quem prepara um frasco, quem escuta uma máquina, quem se esconde na sombra. Rostos em sombra, para qualquer jogador se colocar ali. Atrás deles, uma Árvore enorme acesa em luz dourada recorta as figuras.

Acento: azul (#4274a8), em fios de luz fria nas bordas das silhuetas, com o ouro da Árvore ao fundo.

Composição: a fila ocupa a metade de cima, de ponta a ponta mas sem encostar nas bordas. A metade de baixo é o galho e a névoa em sombra, escuros e lisos. Nada de texto na imagem.
```

## 13. Compêndio B, Raças

Arquivo `abertura-compendio-racas.jpg`.

```text
Abertura do Compêndio B "Raças" de um livro de RPG, formato vertical 2:3.

Cena: os povos do Jardim reunidos ao redor de uma mesma fogueira, sob uma Árvore imensa. Corpos de tamanhos e proporções muito diferentes sentados juntos: uma pessoa comum, uma criatura baixa e forte, um gigante que mal cabe no quadro, uma figura de pele de pedra, uma sereia numa banheira de madeira, alguém com traços de bicho, uma silhueta pálida de olhos claros, um ser de gosma translúcida, uma figura minúscula e alada. Todos vestidos para a mesma estrada. O que os separa é o corpo, e o que os junta é o trabalho de chegar até ali. Nenhum rosto em destaque.

Acento: verde-oliva (#688a3a), nas folhas e na luz do fogo, sobre violeta-noite.

Composição: a roda de gente e o fogo ficam na metade de cima, com a copa da Árvore acima. A metade de baixo é o chão escuro e a sombra das raízes, lisos e sem detalhe. Nada de texto na imagem.
```

## 14. Compêndio C, Legados

Arquivo `abertura-compendio-legados.jpg`.

```text
Abertura do Compêndio C "Legados" de um livro de RPG, formato vertical 2:3.

Cena: um corte transversal de um tronco antigo, visto de frente, com os anéis de crescimento bem à mostra. Em alguns anéis, a intervalos regulares, pequenos símbolos abstratos estão gravados e acesos em luz dourada, um a cada cinco anéis, cada um diferente. Uma mão de adulto apoiada na madeira, no ponto onde o próximo símbolo ainda não foi escolhido. A ideia é a de uma vida que deixa marcas permanentes, uma por uma.

Acento: âmbar (#a67834), na luz dos símbolos e na cor da madeira, sobre violeta quase preto.

Composição: o tronco, em círculo grande, ocupa a metade de cima, parcialmente cortado pela borda de cima, e a mão fica na lateral. A metade de baixo é madeira escura e sombra, lisa e sem detalhe. Nada de texto na imagem, inclusive nos símbolos (use formas abstratas, sem letras).
```

## 15. Compêndio D, Magias

Arquivo `abertura-compendio-magias.jpg`.

```text
Abertura do Compêndio D "Magias" de um livro de RPG, formato vertical 2:3.

Cena: onze correntes de luz de cores diferentes saindo de um mesmo ponto no alto e se abrindo em leque, cada uma com textura própria: uma de água em movimento, uma de brasa, uma de névoa escura, uma de engrenagens de relógio, uma de raízes, uma de poeira de estrelas, e assim por diante. Uma única corrente é reta e de azul neon, feita de linhas de circuito: é a Tecnologia, diferente das outras, que são orgânicas. Por cima de tudo, um círculo de conjuração em traço fino e geométrico, quase invisível.

Acento: roxo (#7650a4) como cor de fundo da luz, com as onze cores das correntes em tons contidos e com o azul neon como único brilho forte.

Composição: o ponto de origem fica no alto e o leque se abre pela metade de cima. A metade de baixo escurece e as correntes se apagam em névoa, lisa e sem detalhe. Nada de texto na imagem, nem runas legíveis.
```

## Se alguma imagem não ficar boa

- **Texto na imagem:** peça "refaça sem nenhum texto, letra ou número".
- **Metade de baixo muito clara ou com detalhe:** peça "escureça e simplifique a metade de baixo, sem nenhum detalhe".
  O livro põe um véu escuro por cima, mas quanto mais calma a base, melhor o texto lê.
- **Mãos ou rostos estranhos:** peça "corrija as mãos e os rostos, mantendo a composição".
- **Quer manter a árvore dourada numa capa:** é só não salvar arquivo para ela. A que não tiver arquivo continua
  com o emblema.
- **Quer outro tom de cor:** troque o hexadecimal de acento do pedido. As cores do livro estão na tabela do começo.
