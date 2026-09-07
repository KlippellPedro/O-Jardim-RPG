# Brief visual — primeira prova de Întuneric

**Natureza:** composição de teste, não lore nova e não layout definitivo. O
objetivo é validar a direção desenhada à mão antes de produzir uma região
inteira.

## Leitura da cena

O jogador entra pela esquerda e avança para a direita. A primeira imagem deve
comunicar três coisas sem texto:

1. o personagem está pequeno diante de uma dimensão muito maior;
2. o Castelo de Davinor domina a região mesmo estando distante;
3. existe algum sinal mínimo de atividade no castelo, mas o caminho até ele é
   hostil e frio.

O castelo ocupa o terço central ou esquerdo do horizonte. A lua fica deslocada
para o lado oposto, evitando duas formas grandes competindo no mesmo ponto. Uma
única janela vermelha ou âmbar funciona como ponto quente. O plano jogável
desce levemente em direção ao centro e volta a subir, formando uma moldura
natural para a primeira pausa de observação.

## Planos de profundidade

| Plano | Conteúdo | Movimento relativo inicial |
| --- | --- | --- |
| 1 | céu, lua e gradiente | quase parado |
| 2 | silhueta do castelo e torres distantes | muito lento |
| 3 | árvores retorcidas e ruínas intermediárias | lento |
| 4 | névoa em duas massas com velocidades diferentes | médio |
| 5 | chão, plataformas e objetos interativos | acompanha a câmera |
| 6 | galhos/pedras escuros cortando as bordas da tela | um pouco mais rápido |

Os valores exatos de parallax serão ajustados dentro do Godot pela sensação.
O importante é preservar a ordem: nenhum fundo pode deslizar mais que o plano
jogável, e o primeiro plano deve ser usado com moderação para não esconder
combate.

## Paleta inicial

| Função | Cor de partida |
| --- | --- |
| céu profundo | `#101321` |
| distância fria | `#1B2638` |
| plano intermediário | `#293445` |
| chão jogável | `#3A4350` |
| lua e névoa clara | `#CAD3DF` |
| ponto quente do castelo | `#B93E55` |
| acento do Ayato | `#F39555` |

Essas cores são pontos de partida, não uma paleta fechada. O teste correto é em
escala de cinza: personagem, chão, inimigo e fundo precisam continuar
separados sem depender da cor.

## Arquivos de arte esperados

```text
game/assets/cenarios/intuneric/prova_01/
  ceu.png
  castelo_distante.png
  arvores_intermediarias.png
  nevoa_fundo.png
  nevoa_frente.png
  chao_jogavel.png
  primeiro_plano.png
```

Exceto o céu, cada imagem deve ter transparência. As camadas devem passar das
bordas da câmera para não revelar vazios durante o parallax. A colisão continua
separada da pintura: irregularidades visuais pequenas não viram obstáculos
físicos automaticamente.

## Primeiro encontro

A prova não precisa de uma sala completa. O trecho mínimo é:

- entrada silenciosa;
- ponto de observação com o castelo revelado;
- descida curta que apresenta um inimigo terrestre;
- espaço seguro após o combate;
- trilho ou fragmento ósseo no cenário sugerindo o Trem de Ossos, sem explicar
  ainda sua função.

## Critérios de aprovação

- o personagem é encontrado imediatamente quando a tela aparece;
- o chão percorrível é reconhecível sem contorno de interface;
- o castelo domina a composição sem competir com o combate;
- o ponto quente é raro e chama atenção;
- a névoa cria profundidade sem apagar silhuetas;
- não há pixel art acidental causada por exportação pequena ou filtro errado;
- nenhum asset do Pinterest foi usado diretamente.

Se esse recorte funcionar, ele vira o padrão para as próximas salas. Se não
funcionar, corrigimos escala, contraste e camadas antes de produzir mais arte.
