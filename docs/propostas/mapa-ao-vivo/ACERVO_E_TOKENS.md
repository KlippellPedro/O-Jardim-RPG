# Acervo organizado, token de corpo inteiro e imagem mais nítida (2026-11-16)

Pedido do Pedro: o Acervo do mapa era ruim de organizar (não dava para arrastar uma imagem para uma
pasta), todo token salvo virava bolinha (no Owlbear dava para deixar o corpo inteiro), e mapas e tokens
ficavam borrados no zoom mesmo com imagem boa. Esta rodada mexe nas três coisas.

## 1. Organização do Acervo

O servidor já aceitava mover item (`PUT /acervo/itens/{id}`) e pasta (`PUT /acervo/pastas/{id}`, com
proteção contra ciclo); faltava a tela. Tudo é do navegador.

- Contas puras em `src/pages/Mapa/acervo/organizacao.ts` (arrasto, ciclo de pasta, contagem, ordem,
  seleção por intervalo, lotes de requisição). Testes em `tests/frontend/acervoOrganizacao.test.ts`.
- Dois tipos de dado de arrasto: `application/x-jardim-acervo-mover` (ids de imagens) e
  `application/x-jardim-acervo-pasta`. A imagem arrastada também leva o pacote de sempre
  (`application/x-jardim-acervo`), então o mesmo arrasto serve para o mapa.
- `AcervoGaveta.tsx`: árvore de pastas (`ArvoreDePastas.tsx`) onde cada pasta recebe imagens, pastas e
  arquivos do computador; subpastas como cartões na grade; caminho clicável; seleção com Ctrl, Shift e
  caixinha; barra de lote (mover, tipo, melhorar, apagar); ordenar; tamanho dos cartões; renomear pasta e
  imagem por duplo clique; "Mover para..." para quem prefere escolher a arrastar; em tela estreita a
  árvore vira um seletor de pasta.
- `DetalhesDaImagem.tsx` junta nome, tipo, pasta, etiquetas, formato do token e origem/licença.
  Etiquetas do sistema (`casas:N`, `formato:livre`) não aparecem na edição, mas voltam ao salvar.
- `DockAcervo.tsx` (barra de baixo): cartões de pasta, caminho e botões de pasta recebem o arrasto.

## 2. Token de corpo inteiro

- O formato mora no `enquadramento` do token (`formato: 'livre'`; ausente é redondo), então vale para
  token do Acervo e para a arte do personagem, sem migração. O servidor valida em
  `core/mapa.normalizar_enquadramento` e não deixa passar chave desconhecida.
- Uma imagem do Acervo pode pedir o formato com a etiqueta `formato:livre`; `criar_token` lê a etiqueta e
  o token novo já nasce assim (`core/mapa.enquadramento_do_item`).
- `TokenVisual` (`motor/token.ts`) desenha a arte inteira, em pé, com a largura no quadrado do token e até
  1,6 quadrado de altura, uma base na cor do lado sob os pés, contorno de seleção retangular e o nome
  acima da arte. Zoom e deslocamento do enquadramento viram "tamanho da arte" e posição.
- Quem ainda não conhece o personagem (identidade oculta) continua recebendo o aro padrão: o servidor
  zera o enquadramento nesse caso, então o formato não vaza pista.
- Onde se escolhe: menu do token (aba Visual), edição da imagem no Acervo e Oficina (que antes sempre
  cortava em círculo ao salvar; agora guarda o corpo inteiro, com opção de aparar o transparente).

## 3. Qualidade

Causas achadas:

1. `imagem_do_token` entregava a **miniatura de 320 px** quando o token tinha mais de 1024 px. Agora
   escolhe o maior pedaço que cobre a imagem inteira (`core/acervo.chave_do_retrato`): o ladrilho até
   1024 px, a versão em 1/4 até 4096 px, e só então a miniatura.
2. O retrato redondo era assado em 384 px. Agora 512 px, e 1024 px quando o token ocupa muitos pixels da
   tela (refeito quando o zoom para de mudar).
3. As texturas não tinham mipmap: cada ponto da tela pegava um pixel só e a imagem cintilava. Ladrilhos e
   retratos agora usam `texturaNitida` (mipmap e anisotropia).
4. O limite de zoom que troca a versão em 1/4 pelos ladrilhos cheios ignorava a densidade da tela
   (`motor/detalheConta.ts`); em tela retina a versão borrada ficava à mostra por mais tempo. Agora desce
   com a densidade, com piso, e os ladrilhos vizinhos são pedidos com folga.

Ferramentas novas:

- **Realce** (preferência do aparelho, em Grade e medidas): filtro de nitidez, contraste e cor só nas
  imagens do mapa, em GLSL e WGSL (`motor/nitidez.ts`). Padrão Suave. Medido com a mesma cena: o gradiente
  médio da região sobe 26% no Suave e 56% no Forte, igual no WebGPU e no WebGL.
- **Melhorar** (`acervo/qualidade.ts`): amplia uma imagem já guardada 2x ou 4x com o Real-ESRGAN, mantém a
  transparência (a cor suja sob o transparente é espalhada antes, para não escurecer a borda) e guarda como
  imagem nova na mesma pasta. **Ajustar para o mapa** refaz token grande demais em 1024 px.
- Token novo enviado já é reduzido a 1024 px (`subirImagem.ts`), que é o que o mapa entrega inteiro.

## Limites conhecidos

- Melhorar e Ajustar criam uma imagem nova: cenas e tokens que já usavam a original continuam com ela.
  Trocar no lugar exigiria reapontar `imagem_id` em cenas, tokens, formas e projetos.
- Token entre 1025 e 2048 px que já estava no Acervo ainda cai na miniatura até passar pelo Ajustar.
- A conferência visual foi feita em tela de densidade 1; o efeito do limite por densidade em tela retina
  não foi visto, só calculado.
- Mipmap em ladrilhos pode deixar uma linha fina na emenda em zoom muito afastado com borda de alto
  contraste exatamente na emenda; não apareceu na cena de teste.
