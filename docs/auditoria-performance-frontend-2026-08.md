# Auditoria e otimização de performance do frontend

Data: 12 de agosto de 2026

## Escopo e método

O trabalho priorizou o módulo Mundo e depois percorreu infraestrutura global, carregamento de rotas, configurações, listas extensas, imagens e dependências. O baseline e o resultado foram medidos no mesmo navegador Chromium, no servidor Vite local e no mesmo computador. Os tamanhos de bundle vieram de builds de produção do Vite.

Para abrir as rotas protegidas sem depender da plataforma local, somente a resposta de `GET /api/v1/contexto` foi simulada no navegador. Nenhuma outra API participou das medições. Tempos de CPU são amostras locais e não devem ser tratados como benchmark universal; as reduções relativas são o dado mais útil.

## Resultado quantitativo

| Medida | Antes | Depois | Variação |
| --- | ---: | ---: | ---: |
| Chunk principal, minificado | 346,85 kB | 65,16 kB | -81,2% |
| Chunk principal, gzip | 93,67 kB | 22,70 kB | -75,8% |
| Chunk da rota Mundo, minificado | 58,78 kB | 13,63 kB | -76,8% |
| Chunk da rota Mundo, gzip | 19,82 kB | 4,75 kB | -76,0% |
| `public/` completo | 95.077.058 bytes (90,67 MiB) | 14.017.514 bytes (13,37 MiB) | -85,3% |
| 48 fundos JPG/WebP | 83,73 MiB | 6,43 MiB | -92,3% |
| Canvas na página inicial | 1 | 0 | eliminado |
| GLBs carregados na página inicial | 0 | 0 | mantido |
| Requisições de contexto por montagem | 2 no baseline de desenvolvimento | 1 | -50% |

O fundo WebGL global carregava imediatamente aproximadamente 1,17 MB minificados de Three/Fiber/Drei, cerca de 337 kB gzip. Ele foi substituído por camadas CSS; as bibliotecas 3D agora ficam restritas às rotas que realmente precisam delas.

### Custo estável do Mundo

Janela de cinco segundos, Mundo aberto e sem interação:

| Perfil | Script antes | Script depois | Thread principal antes | Thread principal depois |
| --- | ---: | ---: | ---: | ---: |
| CPU normal | 0,415 s | 0,358 s | 0,454 s | 0,423 s |
| CPU limitada a 4× | 58,6% da janela | 44,1% da janela | 62,1% da janela | 49,3% da janela |

Sob CPU 4× mais lenta, a ocupação da thread principal caiu aproximadamente 20,6% em termos relativos, ou 12,8 pontos percentuais. No perfil normal, a redução do tempo de script foi aproximadamente 13,9% e a redução do tempo total da thread foi aproximadamente 6,9%.

O Mundo normal avança o renderer manualmente a 30 Hz. A rotação orbital é lenta e permaneceu visualmente contínua no teste, sem pagar o custo anterior de 60 atualizações por segundo.

### Modo de desempenho

O modo é opcional, desativado por padrão e persistido no navegador. Em uma recarga limpa do Mundo com o modo ligado:

- DPR do canvas limitado a 1;
- apenas o modelo inicial foi carregado, em vez dos onze GLBs do modo completo;
- estrelas, universos decorativos, blur, glow e animações cosméticas foram reduzidos ou removidos;
- renderer ficou sob demanda, sem loop permanente;
- em uma janela ociosa de cinco segundos, `ScriptDuration` não avançou na resolução da métrica e `TaskDuration` avançou apenas 0,000877 s;
- nenhuma função ou rota foi removida.

O modo também respeita `prefers-reduced-motion`. Quando a aba fica oculta, a animação contínua do Mundo é suspensa.

## Mudanças implementadas

### Mundo e renderização 3D

- Remoção do segundo canvas global; o fundo atmosférico passou a CSS.
- Separação dos metadados leves das Árvores dos componentes e catálogos pesados.
- Lazy loading do visualizador 3D, crônicas globais e crônicas por Árvore.
- Carregamento progressivo dos modelos em períodos ociosos; o modo econômico carrega sob demanda.
- Remoção do preload global dos onze GLBs.
- Teto real de renderização com `frameloop="never"` e avanço manual no modo completo; `demand` no modo econômico.
- Redução de estrelas, segmentos geométricos e custo de materiais decorativos.
- Reutilização de textura de glow e de vetores temporários para evitar alocações por frame.
- Cancelamento explícito de RAF, timeouts e idle callbacks no unmount.
- Remoção de clones de cenas GLTF que não ofereciam isolamento útil.

### React, rotas e dados

- Painéis de Configurações divididos em chunks e carregados apenas quando abertos.
- Store completo de personagem removido do caminho inicial; só é importado se ocorrer logout real.
- Seletores específicos do Zustand para reduzir assinaturas e rerenders amplos.
- Cálculos de visibilidade, conjuntos, ordenações e callbacks estabilizados com memoização.
- Itens recorrentes de bestiário e magia memoizados.
- GETs simultâneos idênticos deduplicados sem cache persistente; inicialização de contexto protegida contra replay do `StrictMode`.
- SSE auditado: as conexões existentes fecham no cleanup e a sessão fecha a conexão anterior antes de abrir outra. Não foi encontrado polling periódico global.

### Listas, imagens e CSS

- `content-visibility: auto` aplicado a cartões e listas extensas de ficha, loja, regras e inventário.
- Imagens fora da dobra receberam `loading="lazy"` e `decoding="async"` onde aplicável.
- Texturas externas de papel/poeira foram substituídas por CSS local, removendo dependência de rede de terceiros.
- 48 fundos foram convertidos para WebP; imagens 3840×2160 foram redimensionadas para 1920×1080, suficiente para o uso como fundo translúcido.
- Todas as 48 referências foram verificadas; não há arquivo ausente nem referência restante a `_bg.jpg`.
- A conversão ficou reproduzível em `tools/optimize-background-assets.py`.

### Dependências

- Removidos por ausência de import: `@react-three/postprocessing` e `@studio-freight/lenis`.
- `gsap` não entra no bundle do aplicativo, mas foi mantido porque o preview Blender em `tools/blender/preview.html` depende dele durante o desenvolvimento.
- `@react-three/rapier` foi alinhado de 2.2.0 para 1.5.0. A versão anterior exigia React 19/Fiber 9; a linha 1.5 declara compatibilidade com React 18/Fiber 8 usados pelo projeto.
- O arquivo `DiceRoller3D.tsx` ainda referencia Rapier, embora atualmente não esteja alcançável pelo grafo do build. A dependência foi mantida para preservar esse código.
- O npm reportou 7 vulnerabilidades no grafo instalado (3 moderadas e 4 altas). Elas não foram corrigidas automaticamente porque `npm audit fix --force` pode introduzir mudanças incompatíveis e segurança foge do escopo desta alteração de performance.

## Performance Pass 2 — Profiling e otimização final

### Regra e ambiente de medição

Esta etapa partiu do resultado da primeira otimização e não repetiu a limpeza de bundle/assets. O código só foi alterado depois de um baseline novo demonstrar custo relevante. A sequência adotada foi: medir, identificar a causa, implementar, repetir a mesma medição e comparar.

As medições de runtime foram feitas no Chromium/DevTools, em `1280×720` salvo quando outra resolução é indicada, numa NVIDIA GeForce RTX 4060 Ti. A rota protegida recebeu somente uma resposta simulada para `GET /api/v1/contexto`; os demais recursos vieram do servidor Vite local. Os tempos de abertura a frio incluem transformação e carregamento do servidor de desenvolvimento e, portanto, não equivalem a Web Vitals de produção. Métricas de CPU/GPU servem principalmente como comparação relativa na mesma máquina.

O baseline herdado da primeira etapa permaneceu:

| Medida | Antes da primeira etapa | Baseline do Pass 2 |
| --- | ---: | ---: |
| Entry gzip | 93,67 kB | 22,70 kB |
| Rota Mundo gzip | 19,82 kB | 4,75 kB |
| `public/` | 90,67 MiB | 13,37 MiB |
| Canvas inicial | 1 | 0 |
| Renderer do Mundo | 60 Hz | teto real de 30 Hz |

O build final do Pass 2 produziu entry de 65,42 kB/22,75 kB gzip e rota Mundo de 13,63 kB/4,75 kB gzip. Ou seja: as correções finas não desfizeram o code splitting; o acréscimo de 0,05 kB gzip no entry é o detector responsivo de viewport. O chunk lazy do visualizador ficou em 10,02 kB/3,88 kB gzip.

### Profiling dos cenários A–H

| Cenário | Resultado observado | Decisão |
| --- | --- | --- |
| A — Mundo recém-aberto | título em ~3,11 s e canvas em ~3,13 s no Vite dev; 11 GLBs ativos em até ~4 s; 13.915.651 bytes decodificados no conjunto de recursos; long tasks de 101, 140 e 64 ms; maior intervalo de RAF do navegador de 133,3 ms | o pico é concentrado em import/parse/compilação e carregamento progressivo. Não foi usado como comparação de produção nem motivou preload adicional |
| B — todos os recursos carregados | renderer estável em ~30 FPS; antes consumia 0,292 s de script e 0,347 s de main thread por 5 s | transmissão dos vidros apareceu como o custo residual dominante do WebGL |
| C — movimentação da câmera | antes: 30,4 FPS, frame p95 33,6 ms, sem frame acima de 50 ms | interação já era fluida; a correção deveria reduzir trabalho por frame, não elevar FPS acima do teto intencional |
| D — abrir/fechar visualizador | cada saída da rota removeu o canvas e perdeu o contexto WebGL | nenhum segundo renderer acumulado; mantido o ciclo de vida existente |
| E — abrir Crônicas | canvas 0; 0,023 s de script, 0,057 s de main thread, 0,011 s de layout e nenhuma long task na abertura da crônica geral | não era gargalo; nenhuma alteração |
| F — alternar páginas e voltar | oito desmontagens observadas retornaram de 1 para 0 canvas e oito contextos encerrados geraram oito `webglcontextlost` | nenhum acúmulo de canvas/contexto encontrado |
| G — modo completo | 11 GLBs, animação a 30 Hz e DPR adaptativo | recebeu as duas otimizações mensuradas abaixo |
| H — Modo Desempenho | DPR 1, apenas o GLB inicial, sem estrelas e renderer sob demanda; em 5 s ociosos: 0 s de script, 0,000434 s de main thread e 0 s de layout | já cumpria o objetivo; nenhuma nova degradação visual ou funcional foi adicionada |

No modo de desempenho, a interação curta produziu normalmente 67 draw calls e 59.228 triângulos por frame; invalidações consecutivas durante o damping podem duplicar pontualmente esses números. Isso não se transforma em loop ocioso permanente.

### Gargalo 1 — transmissão nos materiais dos GLBs

**Antes.** Os 11 modelos ativos somavam 181.984 triângulos únicos, mas uma cena estável apresentava mediana de 470.190 triângulos e 149 draw calls por frame. Cada GLB contém um `MeshPhysicalMaterial` de vidro com `KHR_materials_transmission`; esses materiais forçavam passes adicionais da cena. Não havia sombras ou post-processing, e existe somente uma luz ambiente, portanto esses itens foram descartados como causa.

**Alteração.** No carregamento, somente materiais físicos com `transmission > 0` têm transmissão e espessura zeradas. O alpha blend original (opacidade entre 0,12 e 0,32), cor e rugosidade são preservados. A inspeção visual manteve a leitura das cúpulas de vidro; os modelos, texturas, atmosfera, glow e interação não foram removidos.

**Depois.** Comparação estável de cinco segundos, mesma câmera/viewport:

| Medida por frame | Antes | Depois | Variação |
| --- | ---: | ---: | ---: |
| FPS do renderer | 30,2 | 30,0 | teto preservado |
| Frame time p50 | 33,3 ms | 33,3 ms | estável |
| Frame time p95 | 33,7 ms | 33,9 ms | estável |
| Maior frame | 34,7 ms | 35,7 ms | +1,0 ms; nenhum acima de 50 ms |
| Draw calls p50 | 149 | 96 | -35,6% |
| Draw calls p95 | 172 | 110 | -36,0% |
| Triângulos p50 | 470.190 | 304.396 | -35,3% |
| Triângulos p95 | 528.214 | 344.900 | -34,7% |

Durante arraste da câmera, os draw calls ficaram praticamente estáveis (133/159 p50/p95 antes; 131/159 depois), porque a câmera passou a enxergar outra combinação de objetos. Mesmo nesse caso, triângulos caíram de 460.764/521.716 para 320.878/365.646, aproximadamente 30%.

Na janela ociosa de cinco segundos, `ScriptDuration` caiu de 0,2919 s para 0,1804 s (-38,2%) e `TaskDuration` de 0,3469 s para 0,2323 s (-33,0%). Isso equivale a aproximadamente 1,20 ms de JavaScript e 1,55 ms de main thread por frame renderizado, contra 1,95 ms e 2,31 ms antes. Não houve long task nem layout no resultado. Com CPU limitada a 4×, a redução foi menor: script de 1,2232 s para 1,1467 s (-6,2%) e main thread de 1,4086 s para 1,3531 s (-3,9%), também sem long task.

Consultas `EXT_disjoint_timer_query_webgl2` no viewport padrão variaram muito entre execuções (aproximadamente 2,87–14,08 ms de média depois da mudança, além de variação de clock da GPU). Por honestidade, não é possível atribuir uma melhora confiável de tempo de GPU nesse viewport a partir dessas amostras. A redução de draw calls/triângulos e o ganho de CPU, porém, foram repetíveis.

### Gargalo 2 — excesso de pixels em 4K

**Antes.** Em 3840×2160, com `devicePixelRatio` 2, o canvas de 2076×1945 CSS usava buffer de 3114×2917: 9.083.538 pixels por frame. Uma amostra de GPU apresentou média de 20,30 ms, p50 de 21,08 ms e p95 de 22,74 ms. Ainda cabia no orçamento de 33,3 ms da RTX 4060 Ti, mas deixava pouca margem para GPUs integradas.

**Alteração.** O modo completo continua aceitando DPR até 1,5 em telas normais e mobile, mas usa DPR 1 a partir de 2560 CSS px. O Modo Desempenho continua usando DPR 1 em qualquer resolução. A mudança é reativa a resize e não exige recarregar a rota.

**Depois.** Em 4K, o buffer passou a 2076×1945, ou 4.037.820 pixels (-55,6%). Duas amostras repetidas de GPU ficaram entre 6,67 e 7,49 ms de média, p50 entre 3,71 e 5,35 ms e p95 entre 12,66 e 16,35 ms. Comparando o pior resultado pós-mudança com o baseline, a média caiu pelo menos 63,1% e o p95 pelo menos 28,1%. Parte desse ganho combina o limite de DPR com a remoção dos passes de transmissão.

Matriz validada após resize em tempo real:

| Viewport / DPR do dispositivo | Canvas CSS | Buffer WebGL | Pixels |
| --- | ---: | ---: | ---: |
| 390×844 / 3 | 362×646 | 543×969 (DPR 1,5) | 526.167 |
| 1920×1080 / 2 | 1683×905 | 2524×1357 (DPR 1,5) | 3.425.068 |
| 2560×1440 / 2 | 1830×1250 | 1829×1250 (DPR 1) | 2.286.250 |
| 3440×1440 / 2 | 2031×1230 | 2031×1229 (DPR 1) | 2.496.099 |
| 3840×2160 / 2 | 2076×1945 | 2076×1945 (DPR 1) | 4.037.820 |

A diferença de um pixel em alguns buffers vem do arredondamento interno no resize. Em 1080p e no celular a nitidez anterior é preservada; a redução só entra quando a área física começaria a crescer de forma desproporcional.

### Auditoria individual dos GLBs

Foi adicionado `tools/profile-glb-assets.mjs`, um profiler reprodutível do container GLB/JSON/BIN que não depende de pacote novo. Ele mede instâncias, primitivas, triângulos, materiais, texturas embutidas, resoluções, animações, skins e extensões de material.

| Modelo | KiB | Meshes | Primitivas | Triângulos | Materiais | Texturas / KiB | Animações |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| `banco-lunar.glb` | 212,9 | 7 | 8 | 2.978 | 6 | 1 / 54,0 | 0 |
| `aethel.glb` | 651,5 | 4 | 5 | 19.540 | 5 | 4 / 179,3 | 0 |
| `aperion.glb` | 654,9 | 4 | 5 | 19.580 | 5 | 4 / 179,9 | 0 |
| `axis.glb` | 263,6 | 8 | 9 | 2.986 | 6 | 2 / 56,4 | 0 |
| `chronus.glb` | 649,1 | 4 | 5 | 19.540 | 5 | 4 / 178,7 | 0 |
| `erebus.glb` | 648,7 | 4 | 5 | 19.540 | 5 | 4 / 177,6 | 0 |
| `haemus.glb` | 652,4 | 4 | 5 | 19.560 | 5 | 4 / 180,2 | 0 |
| `ignis.glb` | 654,7 | 4 | 5 | 19.580 | 5 | 4 / 178,7 | 0 |
| `moros.glb` | 653,2 | 4 | 5 | 19.560 | 5 | 4 / 179,4 | 0 |
| `mulher-carmesim.glb` | 654,7 | 4 | 5 | 19.580 | 5 | 4 / 180,3 | 0 |
| `ousias.glb` | 649,2 | 4 | 5 | 19.540 | 5 | 4 / 178,4 | 0 |
| `keryx.glb` (não referenciado) | 652,6 | 4 | 5 | 19.560 | 5 | 4 / 178,7 | 0 |

Todas as texturas têm 256×256, não há skins ou animações, e cada arquivo possui exatamente um material transmissivo/blended. Os 11 GLBs ativos ocupam 6.497.284 bytes e somam 181.984 triângulos; o arquivo `keryx.glb` está no disco, mas o código usa `axis.glb`. Ele não foi apagado porque isso economizaria pacote/deploy, não runtime, e o nome pode ter significado editorial ainda não confirmado.

LOD não foi implementado. As árvores individuais têm cerca de 19,5 mil triângulos e cinco primitivas, já são progressivas e o profiling mostrou que o multiplicador de passes do material — não a malha base — era a causa dominante. Introduzir três modelos por árvore aumentaria pipeline, armazenamento e manutenção sem evidência de retorno proporcional.

### Memória e descarte WebGL

O código do React Three Fiber foi inspecionado e o unmount executa descarte das listas do renderer e `forceContextLoss`. No teste instrumentado, nove contextos foram criados ao longo da sessão: oito foram desmontados e os oito emitiram `webglcontextlost`; o nono permaneceu corretamente ativo na rota Mundo. O DOM sempre voltou de um canvas para zero ao sair.

Sem GC forçado, o baseline de seis ciclos variou aproximadamente de 54,7 a 82,9 MB na Home e de 64,7 a 80,4 MB no Mundo. Depois de uma coleta oportunista do próprio navegador, as quatro amostras finais ficaram aproximadamente entre 31,9 e 36,4 MB na Home e 32,3 e 36,6 MB no Mundo, sem crescimento monotônico. As magnitudes não são comparáveis entre si porque o momento do GC não foi controlado.

O ambiente bloqueou `HeapProfiler`/snapshots e não expôs coleta forçada. Portanto, não há evidência observada de leak de canvas ou contexto, e o heap não apresentou tendência contínua na janela testada, mas não é tecnicamente possível afirmar ausência absoluta de vazamento. O cache JS do `useGLTF` retém intencionalmente uma cópia de cada modelo carregado para acelerar revisitas; a destruição do contexto libera os recursos GPU associados.

### Mobile, React, animações, CSS, imagens, fontes e rede

- Em 390×844/DPR 3, o buffer ficou limitado a 543×969. Com CPU 4× mais lenta e modo completo, cinco segundos consumiram 0,992 s de script (19,8%) e 1,206 s de main thread (24,1%), sem layout ou long task. Isso é uma simulação de CPU, não substitui teste em Android real com memória/GPU integradas.
- O perfil estável do Mundo apresentou 0 s de layout e cerca de 0,010 s de recálculo de estilo em cinco segundos. Na amostra havia 109 elementos, dois `backdrop-filter`, um `filter`, uma animação CSS e 11 sombras; não houve evidência de que remover esses efeitos produziria ganho relevante.
- Crônicas e painéis desmontam o canvas. A abertura da crônica geral teve 231 nós e nenhuma long task; não foi encontrada justificativa para mais memoização, virtualização ou divisão nessa tela.
- A auditoria de React/Framer Motion não mostrou commit/layout contínuo ou trabalho fora de viewport que explicasse o custo estável. O custo acompanhava os frames WebGL; componentes e animações não foram alterados por precaução.
- Os 48 fundos WebP têm no máximo 1920 px e são usados como fundos de página/tela, não como thumbnails pequenos. Cada rota baixa o fundo efetivamente usado. Gerar `srcset`/AVIF adicional sem uma variante de exibição menor medida aumentaria complexidade e número de assets sem gargalo comprovado.
- O navegador carregou um WOFF de Cinzel (25.904 bytes) e um de Inter (48.256 bytes); os pesos declarados são resolvidos por esses arquivos, sem download de sete fontes distintas. Nenhuma variante foi removida.
- No cold load, os 11 GLBs foram requests distintos e progressivos; não apareceu refetch duplicado de contexto. A plataforma já entrega `/assets` com `max-age=31536000, immutable`, `/models` com cache de um dia e `stale-while-revalidate`, e o HTML sem cache. Tornar dados de personagem/campanha agressivamente cacheáveis seria incorreto.
- O Modo Desempenho continua útil como último recurso para hardware muito fraco, autonomia/temperatura e preferência de movimento reduzido. Não há evidência para substituir o toggle por três níveis de qualidade agora: o modo completo já preserva 30 FPS na máquina medida, e o modo reduzido já elimina praticamente todo o custo ocioso.

### Mudanças realizadas e mudanças deliberadamente não realizadas

Foram feitas somente duas mudanças de runtime: simplificação dos 11 materiais transmissivos durante o carregamento e DPR 1 para viewports a partir de 2560 px. Foi adicionado também o profiler de GLBs. Não foram adicionadas bibliotecas, LOD, novos níveis de qualidade, cache de dados, virtualização, memoização em massa, formatos de imagem ou regras extras para o Modo Desempenho.

O custo residual do Mundo em modo completo é um frame WebGL a cada ~33,3 ms, com mediana de 96 draw calls/304 mil triângulos na câmera estável e ~1,55 ms de main thread por frame na máquina de teste. Em CPU 4×, a main thread ocupa ~27,1% da janela no desktop padrão e ~24,1% no viewport mobile medido. O principal risco restante é GPU real de entrada, que não pode ser representada com fidelidade pela RTX 4060 Ti.

### Limitações e próximos passos com retorno potencial

1. Repetir o perfil em hardware integrado/Android real e num build de produção servido por HTTP, sobretudo cold load e pressão térmica.
2. Fazer snapshots de heap com GC forçado no Chrome DevTools e comparar dominadores após 10–20 ciclos; é a única forma de encerrar a dúvida de heap com rigor.
3. Numa futura exportação dos GLBs, gravar a cúpula diretamente como material alpha não transmissivo. Isso elimina a adaptação em runtime, mas não exige reexportação urgente porque o custo já foi removido.
4. Confirmar editorialmente se `public/models/trees/keryx.glb` é legado antes de apagá-lo. A remoção pouparia ~652,6 KiB de deploy, não tempo de carregamento atual.
5. Só considerar LOD ou qualidade Alta/Média/Baixa se medições em GPU integrada continuarem acima do orçamento de 33,3 ms após estas correções.

## Validação

- `npx tsc -b --pretty false`: passou.
- `npm run test:frontend`: 194 de 194 testes passaram.
- `npm run check:rules-source`: passou.
- `npm run build`: passou; 2.689 módulos transformados.
- Navegação protegida, Mundo normal, painel Preferências, persistência do modo econômico e retorno entre Início/Mundo foram exercitados no navegador.
- Smoke test final abriu Ficha, Loja, Livro, Sessão e Mundo, confirmou os headings esperados e terminou sem erro ou warning no console.
- Responsividade foi exercitada em 390×844, 1920×1080, 2560×1440, 3440×1440 e 3840×2160.
- Console do navegador: sem erros ou avisos no fluxo final medido.
- Naquele pass de performance, o código de áudio não foi alterado e a navegação que acionava os mesmos controles não gerou exceção. Alterações de áudio posteriores são auditadas separadamente na auditoria final pré-commit de 13 de agosto de 2026. A saída audível não foi aferida automaticamente, pois isso não é verificável de forma confiável pelo DevTools.
- Inspeção visual pontual dos fundos `guardiao` e `feerico`: não foi observada degradação relevante no uso previsto. Não foi feita revisão visual manual das 48 imagens uma a uma.

No fechamento do Pass 2, `npm run check:mundo` também passou: 79 entradas sincronizadas. Naquela execução, `npm run check:typography` ainda tinha a falha preexistente por travessões em nove arquivos de conteúdo; essa checagem não foi alterada para esconder o problema. Na auditoria final pré-commit de 13 de agosto de 2026, após alterações posteriores, o comando passou.

## Memória e limitações da primeira etapa

Na primeira etapa, em três ciclos consecutivos entre Início e Mundo, o número de canvases voltou sempre de 1 para 0 no unmount, confirmando que não havia acúmulo de elementos WebGL. As amostras de heap variaram entre aproximadamente 58,5 MB e 74,2 MB. O teste mais longo e a instrumentação de contextos do Pass 2 estão documentados acima.

O código remove os vetores temporários por frame, cancela schedulers no cleanup e evita clones de GLTF. O cache do `useGLTF` continua intencionalmente retendo uma cópia de cada modelo já aberto para acelerar novas visitas. Para uma conclusão definitiva sobre heap, ainda é necessário um perfil de alocação no Chrome DevTools com GC forçado e comparação de snapshots dominadores.

## Alvos registrados na primeira etapa

Os chunks pesados restantes são conteúdo de domínio e telas específicas, não custo inicial: `RegrasPage` (~381 kB), `PersonagemSheet` (~338 kB), `magiaService` (~301 kB), `registry` (~298 kB) e `catalogoService` (~249 kB). Eles já estão separados do entrypoint, mas podem ser subdivididos internamente por aba/categoria numa etapa futura.

Também vale tratar separadamente as vulnerabilidades apontadas pelo npm e a pendência de tipografia, sem misturar essas correções com esta entrega de performance.
