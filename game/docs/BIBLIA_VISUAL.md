# Bíblia visual — jogo 2D de O Jardim

**Natureza:** regras de estilo destiladas do moodboard em `../referencias/`
(44 imagens, ver `../referencias/fontes.md` pra origem de cada uma). Isso não
é o mural de referência — é o que extrair dele. Onde uma imagem da pasta
ilustra bem a regra, ela está citada pelo nome do arquivo; onde uma imagem da
pasta NÃO deve ser seguida, isso também está marcado, de propósito.

As imagens citadas aqui não são versionadas no git (`game/referencias/` é
gitignored — ver aviso em `../README.md`). Esta bíblia é o documento
permanente; o mural é só o material de apoio que a gerou.

## 1. Regra central: desenho à mão com dois níveis de detalhe

O jogo usa **dois tratamentos da mesma linguagem desenhada à mão**:

- **Personagens e inimigos:** desenhos 2D completos, formas simples,
  contorno forte e poucas cores, animados tradicionalmente quadro a quadro.
- **Cenário:** pintura 2D mais detalhada, com valor, textura e atmosfera
  (neblina, luz difusa e gradiente), separada em camadas para parallax.

Nenhum dos dois tratamentos é pixel art. Os arquivos finais continuam sendo
imagens rasterizadas, mas a imagem não é construída numa grade de baixa
resolução nem usa o pixel visível como vocabulário gráfico.

A diferença de detalhe é intencional: o personagem precisa continuar legível
durante movimento e combate, enquanto o fundo pode sustentar atmosfera e
storytelling ambiental. O que une os dois tratamentos é a paleta (seção 2):
as mesmas cores frias dominam tanto os personagens quanto Întuneric, e os
pontos de cor quente seguem a mesma regra de raridade em ambos.

Essa descrição corrige a versão anterior, que chamava o personagem de
“cutout”. *Hollow Knight* usa arte desenhada à mão e animação 2D tradicional;
o projeto seguirá esse princípio em vez de tratar um rig esquelético como
pipeline principal.

## 2. Paleta

### Personagens: neutro + um acento por Fluxo

Base de cada personagem: preto, branco e uma faixa de cinza — sem cor
própria de pele ou roupa. A única cor que aparece de verdade é o **acento do
Fluxo dele**, tirado direto de `FLUXO_TEMAS` (`src/services/magiaService.ts`)
pra ficar consistente com o resto da plataforma:

| Personagem | Fluxo | Acento (`destaque`) |
| --- | --- | --- |
| Ayato | Inconstância | `#f39555` (laranja) |
| Galadriel | Origem | `#ef9fbe` (rosa) |
| Netuno | Físico | `#b48258` (marrom) |
| Adoxios | o Fluxo escolhido pelo jogador | varia (ver `FLUXO_TEMAS`) |
| Blanc | nenhum dos 11 (`universal`) | `#e7e2f2` (lavanda quase incolor) |

Essa regra faz duas coisas de graça: garante que os cinco não colidam
visualmente entre si (cada um tem "sua" cor), e faz o VFX de cada habilidade
de Fluxo (ver `KITS_COMBATE.md`) já nascer na cor certa sem decisão de arte
nova. Blanc sendo quase sem cor reforça a identidade dele (o único Espírito
branco) em vez de ser tratado como "esqueceram de colorir".

### Cenário de Întuneric: frio dominante, um ponto quente por composição

Referência: `intuneric-castelo-01.jpg` e `intuneric-castelo-04.jpg` — céu
entre azul-petróleo e roxo escuro, silhueta do castelo quase preta, morcegos,
lua pálida. A cor quente (janela acesa, tocha, brasa) aparece **no máximo em
um ou dois pontos pequenos por composição**. Se aparecer em mais lugares que
isso, a cena perde o peso sombrio que a Fase 0 já decidiu mostrar de verdade.

A colônia usa a mesma regra de frio, mas **sem o ponto quente** —
referência: `intuneric-colonia-01.jpg` e `intuneric-colonia-03.jpg`, quase
monocromáticas, cinza sujo. A ausência de cor quente na colônia (contra a
presença dela no castelo) é a única pista visual de hierarquia de poder entre
os dois lugares: o castelo tem uma centelha de vida/cor, a colônia não tem
nenhuma. Isso é storytelling ambiental (decisão de tom já registrada no
plano) sem precisar de texto.

`intuneric-colonia-05.jpg` (paleta violeta) é uma variação aceitável pra
diferenciar visualmente um sub-bioma da colônia sem sair do "frio, sem
centelha quente" — não é obrigatório, é opção.

## 3. Silhueta e contorno (personagens)

- Contorno preto uniforme em cada personagem, sem variação arbitrária de
  espessura entre um e outro — é o que faz os cinco parecerem parte da mesma
  família visual, em vez de cinco estilos diferentes colados.
- Cada personagem precisa ser identificável **só pela silhueta**, sem cor e
  sem detalhe interno. Referência: `cutout-hollowknight-04.jpg` (a silhueta
  do Grimm é só chifre + capa recortada, e já é inconfundível).
- Formas arredondadas e grandes na cabeça, negativo de espaço nos olhos
  (olho = buraco preto ou brilho, não íris desenhada) — ver
  `cutout-hollowknight-02.jpg` e `cutout-hollowknight-03.jpg`. Esse
  vocabulário de "rosto simples, corpo expressivo" é o que permite os cinco
  kits de combate terem leitura clara de dano/acerto sem precisar de rosto
  animado.

## 4. Animação tradicional: um desenho completo por quadro

Cada quadro mostra a pose completa do personagem. Cabeça, roupa, braços e
pernas não serão exportados como peças independentes para formar um boneco
articulado. A animação nasce de uma sequência de poses desenhadas:

- silhuetas-chave primeiro;
- antecipação clara antes de ataques e esquivas;
- contato e impacto legíveis em poucos quadros;
- retorno à pose neutra sem deslocar acidentalmente os pés;
- mesmo tamanho de tela, origem e linha do chão em todos os quadros.

Os cinco personagens compartilham um **contrato**, não um esqueleto: altura
relativa, escala no jogo, espessura de contorno, posição dos pés, orientação
lateral e nomes de animação são padronizados. Cada personagem mantém seus
próprios desenhos e sua própria silhueta.

As imagens `rig-camadas-*.jpg` continuam úteis apenas para estudar proporção,
acessórios e separação conceitual do design. Elas não definem mais o formato
de exportação. `cutout-hollowknight-*.jpg` serve para analisar silhueta,
contraste e simplificação, nunca para copiar formas ou quadros.

No Godot, o destino normal desses quadros será `AnimatedSprite2D` com um
recurso `SpriteFrames`, usando imagens individuais ou uma spritesheet. O
`AnimationPlayer` continua disponível para propriedades auxiliares, como
efeitos, áudio e pequenas transformações; não substitui os desenhos principais.

## 5. Luz

- Uma fonte de luz fria dominante (lua, luz ambiente azulada) e no máximo uma
  ou duas fontes quentes pequenas por cena, nunca luz ambiente uniforme.
- Neblina/luz volumétrica pra dar profundidade em vez de detalhe extra nos
  prédios de fundo — reforça o parallax já decidido em
  `PLANEJAMENTO_INICIAL.md`.
- Silhueta do cenário sempre mais clara ou mais escura que o céu atrás dela,
  nunca do mesmo valor — é o que mantém a leitura de profundidade mesmo
  numa paleta quase monocromática.

## 6. O que existe na pasta e deve ser ignorado

- `intuneric-trem-ossos-03.jpg`: trem-caveira dourado/verde-neon em cenário
  de deserto, estilo cartum colorido. Entrou na busca por "trem de ossos",
  mas a paleta e o tom não têm nada a ver com Întuneric. Usar **só** a ideia
  de forma geral (trem com carcaça de caveira na frente); ignorar cor,
  brilho e ambientação por completo.
- Qualquer imagem do lote `personagens/` com cor de roupa própria (fora
  preto/branco/cinza): é referência de POSE ou de método de camadas, não de
  paleta — a regra de cor da seção 2 sempre vence.

## 7. Resumo de uma linha por seção

Personagem = desenho simples quadro a quadro + cor só do Fluxo. Cenário =
pintura atmosférica em camadas + uma centelha quente rara. Silhueta sempre
legível sem cor. Quadros sempre alinhados pela mesma origem e linha do chão.
Luz sempre direcional e fria, nunca uniforme.

## 8. Fontes técnicas verificadas

- Team Cherry: <https://www.hollowknight.com/> — descreve o jogo como arte
  desenhada à mão e animação tradicional 2D.
- Unity: <https://unity.com/made-with-unity/hollow-knight> — descreve arte e
  animação tradicional produzidas no Photoshop, exportadas como PNG e
  organizadas em camadas.
- Godot: <https://docs.godotengine.org/en/stable/tutorials/2d/2d_sprite_animation.html>
  — fluxo com imagens individuais ou spritesheet em `AnimatedSprite2D`.
