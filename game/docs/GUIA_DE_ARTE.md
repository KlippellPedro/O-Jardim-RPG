# Guia de arte — personagens, inimigos e cenários

**Direção vigente desde 02/09/2026:** arte 2D desenhada à mão. Personagens e
inimigos usam formas simples, contorno forte e animação tradicional quadro a
quadro. Os cenários são pinturas mais detalhadas, exportadas em camadas para
parallax. Não é pixel art e o pipeline principal não usa rig cutout.

O Pedro decidiu desenhar a arte final em vez de contratar ou usar IA de imagem,
por enquanto. Este guia define o formato técnico necessário para colocar esses
desenhos no Godot sem retrabalho.

## Ferramenta

- **Krita (recomendado):** desenho, pintura, onion skin e animação quadro a
  quadro no mesmo arquivo.
- **Inkscape:** útil para formas vetoriais, logotipos e elementos muito
  geométricos, mas menos direto para animação tradicional.
- **Aseprite:** não é a ferramenta principal porque a direção não é pixel art.

## Contrato visual compartilhado

Os cinco personagens não compartilham um esqueleto. Eles compartilham estas
regras:

- altura aproximada de quatro cabeças;
- orientação lateral e escala comum dentro do jogo;
- contorno escuro com espessura visual consistente;
- preto, branco e cinza como base, com uma cor de acento do Fluxo;
- mesma linha do chão e mesma posição de origem em todos os quadros;
- silhueta identificável sem depender de detalhes internos;
- nomes e finalidade das animações iguais para todos.

[`referencia_proporcao.svg`](referencia_proporcao.svg) continua sendo um guia
de altura e proporção. As marcações de juntas não são mais instruções para um
`Skeleton2D`.

## Formato dos quadros

Cada frame deve conter o personagem completo sobre fundo transparente. Todos
os frames de uma animação precisam ter exatamente a mesma largura, altura,
origem e linha do chão.

Nome recomendado para imagens individuais:

```text
{nome}_{animacao}_{indice}.png
ayato_idle_000.png
ayato_idle_001.png
ayato_ataque_leve_000.png
```

Também é possível entregar uma spritesheet, desde que todas as células tenham
o mesmo tamanho e uma ordem documentada. Durante a produção inicial, imagens
individuais são mais fáceis de revisar e substituir.

Não desenhar hitbox, hurtbox, sombra ou efeito de impacto dentro do sprite do
personagem. Esses elementos têm tempos e responsabilidades próprios no Godot.

## Ordem de produção das animações

Não produzir todas as ações dos cinco personagens de uma vez. O primeiro lote
do Ayato deve validar o pipeline inteiro:

1. uma pose neutra finalizada;
2. idle curto;
3. corrida;
4. pulo e queda;
5. ataque leve;
6. dano;
7. esquiva;
8. morte somente depois que as ações anteriores estiverem funcionando.

Para cada ação, desenhar primeiro as poses-chave em silhueta. Só adicionar
detalhes internos depois que movimento, leitura e alinhamento estiverem bons.
A quantidade de quadros e a velocidade são decisões por ação; não existe um
número obrigatório que sirva para todas.

## Importação no Godot

O fluxo principal é:

1. exportar PNGs transparentes ou uma spritesheet;
2. importar para `game/assets/personagens/{nome}/`;
3. criar um `SpriteFrames` no `AnimatedSprite2D`;
4. criar animações com nomes estáveis, como `idle`, `correr`, `pular`,
   `cair`, `esquivar`, `ataque_leve`, `dano` e `morte`;
5. manter o pivô visual alinhado aos pés;
6. conferir a animação sobre o cenário real, não apenas sobre fundo branco;
7. ajustar colisões separadamente, sem fazê-las acompanhar cada detalhe do
   contorno desenhado.

O `AnimationPlayer` pode sincronizar áudio, partículas, clarões e outras
propriedades. A troca dos desenhos principais fica no `AnimatedSprite2D`.

## Cenários pintados em camadas

Cada sala deve ser planejada primeiro como composição única e depois separada
em planos. Para a primeira sala de Întuneric:

1. céu, lua e gradiente atmosférico;
2. silhueta distante do Castelo de Davinor;
3. arquitetura e árvores do plano intermediário;
4. névoa e elementos atmosféricos móveis;
5. plano jogável, com bordas e colisões legíveis;
6. primeiro plano escuro para enquadrar a câmera.

As camadas precisam exceder a área visível da câmera para não revelar bordas
durante o parallax. Elementos interativos devem ter contraste maior que a
decoração, e o plano jogável não pode se confundir com a silhueta do fundo.

O castelo usa luz fria dominante e apenas um ou dois pontos quentes pequenos.
A colônia não usa ponto quente, conforme a regra narrativa registrada na
[`BIBLIA_VISUAL.md`](BIBLIA_VISUAL.md).

## Uso das referências

Pinterest e `game/referencias/` são moodboards, não bibliotecas de assets.
Nenhuma imagem sem autoria e licença verificadas pode ser copiada, traçada ou
publicada dentro do jogo. As referências servem para estudar composição,
silhueta, contraste, ritmo e atmosfera; a arte final precisa ser original ou
ter licença de uso explícita.

## Primeira prova recomendada

Antes de pintar uma sala inteira, produzir um teste pequeno com:

- uma pose final do Ayato;
- um idle curto;
- um recorte de cenário com três planos de profundidade;
- lua fria e um único ponto quente;
- personagem rodando no Godot sobre esse recorte.

Esse teste responde de forma barata se personagem, fundo, escala, contraste e
parallax realmente pertencem ao mesmo jogo.

## Fontes técnicas

- <https://www.hollowknight.com/>
- <https://unity.com/made-with-unity/hollow-knight>
- <https://docs.godotengine.org/en/stable/tutorials/2d/2d_sprite_animation.html>
