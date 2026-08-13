# Auditoria Final de Responsividade — 2026-08

Data da validação: 12 de agosto de 2026.

Escopo exclusivo: responsividade, layout, interação, acessibilidade relacionada ao viewport e compatibilidade entre métodos de entrada. Nenhuma otimização de bundle, JavaScript, React, WebGL, CPU, GPU, memória, rede ou assets foi realizada nesta etapa.

## Baseline

O pass partiu da implementação responsiva já existente, sem iniciar por alterações de código. A baseline encontrada continha:

- navegação lateral convertida em barra inferior no mobile e em landscape de pouca altura;
- shells fluidos sem os antigos offsets laterais fixos;
- containers centralizados, grids responsivos e tipografia com escala por `clamp()`;
- uso de `100dvh`, `viewport-fit=cover` e variáveis `env(safe-area-inset-*)`;
- modais e drawers limitados ao viewport, com áreas internas roláveis;
- tratamento específico do `FichaWizard` em 320 px e renderização por portal;
- cards em uma coluna no mobile;
- suporte inicial a teclado, foco, touch, ARIA e `prefers-reduced-motion`;
- escala adicional de tipografia e containers para 2K, 4K e ultrawide.

A auditoria primeiro verificou essa baseline e só então alterou problemas reproduzidos. O backend local real não estava disponível; para rotas protegidas foi usado um mock HTTP local, somente durante a auditoria, com dados deliberadamente extremos e sem escrita persistente.

## Método e evidências

- Foram registradas **369 observações rota/viewport** no Chromium integrado: 297 observações da matriz inicial, 48 regressões direcionadas após as correções e 24 observações adicionais nas proporções landscape exatas 568×320, 640×360 e 932×430. Esse total inclui revalidações e não representa 369 layouts únicos.
- As páginas públicas e protegidas verificadas incluíram Login, Home, Campanhas, Ficha, ficha individual, Loja, Cofre, Mestre, Administração, Mundo, cronologias e árvore individual, Regras, regra individual, Sessão, Configurações/Conta e galeria de preview.
- As rotas exercitadas diretamente incluíram `/`, `/login`, `/campanhas`, `/ficha`, `/ficha/p1`, `/loja`, `/cofre`, `/mestre`, `/admin`, `/mundo`, `/mundo/arvores/aurora`, `/mundo/cronologia`, `/regras`, `/regras/classes/guerreiro`, `/sessao` e `/redesign-preview`.
- A detecção automatizada comparou `scrollWidth` com a largura útil do documento e também inspecionou elementos que ultrapassavam as bordas. Áreas explicitamente roláveis, como tabelas e faixas de abas, foram diferenciadas de overflow global.
- Foram usados nomes e descrições longos, uma palavra contínua extensa, listas de personagens, usuários, participantes e doze itens de loja. Não houve overflow horizontal global na regressão final.
- As verificações interativas foram complementadas por inspeção estática dos componentes e das regras globais. Não houve auditoria de performance.

## Viewports testados

### Matriz principal

- Mobile: 320×568, 360×640, 375×667, 390×844, 412×915 e 430×932.
- Tablet: 768×1024, 820×1180 e 1024×1366.
- Desktop/notebook: 1280×720, 1366×768, 1440×900, 1600×900, 1920×1080 e 2560×1440.
- Ultrawide: 3440×1440 e 5120×1440. O caso de 5120 px foi aplicado via Chrome DevTools Protocol porque o controle normal do navegador limitava a largura a 4096 px.
- 4K: 3840×2160.

### Landscape e alturas baixas

- Landscape: 568×320, 640×360, 667×375, 844×390, 915×412, 932×430, 1024×768, 1180×820 e 1366×1024.
- Alturas críticas: 320×320, 390×320 e 1280 px de largura combinado com 320, 360, 400, 480 e 600 px de altura.
- Proporções incomuns: 333×777, 911×509, 1537×863 e 2711×997.

### Zoom equivalente

O navegador integrado não alterou o zoom de página ao receber os atalhos de zoom. Por isso, a regressão foi feita por **equivalência de área CSS**, tomando uma janela física de 1440×900 como referência:

| Zoom de referência | Viewport CSS equivalente |
| --- | --- |
| 80% | 1800×1125 |
| 100% | 1440×900 |
| 125% | 1152×720 |
| 150% | 960×600 |
| 175% | 823×514 |
| 200% | 720×450 |

Esse método valida reflow, wrapping, grids, navegação e contenção no espaço CSS resultante, mas não equivale a validar a interface do navegador nem o zoom real em todos os motores.

## Problemas encontrados

Todos os itens abaixo foram reproduzidos antes de qualquer correção.

| # | Problema e local | Evidência/reprodução | Causa confirmada |
| --- | --- | --- | --- |
| 1 | Foco inconsistente em modais e drawers de Configurações, Loja, Regras, Mundo e Sessão | Ao abrir Configurações o foco não entrava no painel. No detalhe de item da Loja, o foco permanecia no gatilho encoberto. Parte dos diálogos não tinha a combinação completa de foco inicial, trap, Escape, restauração e bloqueio do documento. | O comportamento era implementado de forma parcial e diferente em cada componente. |
| 2 | Drawer do carrinho concorria com a navegação fixa e o botão de Configurações | Em 390×320, elementos fixos externos continuavam acima ou na mesma área interativa do drawer; uma reprodução alcançou a navegação por baixo da camada. | Stacking contexts independentes e ausência de isolamento dos controles globais enquanto um diálogo móvel estava aberto. |
| 3 | `Select` customizado não encerrava a lista nem avançava o foco corretamente com Tab | No formulário administrativo em 390×320, setas e Escape funcionavam, mas Tab não tinha uma transição determinística para o controle vizinho. | O manipulador da lista tratava setas, Home, End e Escape, mas não Tab. |
| 4 | Um `select` nativo tinha alvo touch menor que a meta | Com ponteiro coarse em 390×320, o seletor de comprador da Loja media 277×39 px. | A regra global não estabelecia altura mínima para controles nativos em dispositivos touch. |
| 5 | A animação inicial da lista de fichas criava overflow horizontal transitório | Em viewport móvel, o documento ganhou aproximadamente 20 px de largura extra durante a entrada dos cards. | Os cards animavam a partir de `x: 20`, deslocando temporariamente sua caixa para fora do viewport. |
| 6 | A ação “Nova Perícia / Ofício” não era alcançável por teclado | A ação era clicável por mouse/touch, mas não aparecia na sequência de foco. | Uso de `motion.div` como controle interativo sem semântica nativa de botão. |
| 7 | Ícones de ajuda e alguns fechamentos na Ficha tinham semântica incompleta | Os ícones de ajuda eram SVGs clicáveis; botões de fechamento de modais de condição/nível não possuíam nome acessível consistente nem `type="button"`. | Interação vinculada diretamente ao ícone e atributos de botão incompletos. |

## Correções

- Foi criado um comportamento compartilhado e estritamente voltado a diálogos: foco inicial, trap de Tab/Shift+Tab, Escape, restauração ao gatilho, pilha para modais aninhados e bloqueio de scroll com contagem de profundidade. Ele foi aplicado aos diálogos/drawers confirmados em Configurações, Loja, Mundo, Regras e Sessão, além do portal dos modais da Ficha.
- Enquanto Settings, carrinho ou outro modal móvel está aberto, navegação e gatilhos fixos externos deixam de disputar a área de toque. O drawer do carrinho recebeu uma identificação de camada própria.
- O `Select` passou a fechar com Tab e Shift+Tab e mover o foco para o controle anterior ou seguinte fora do popup. A lógica existente para setas, Home, End e Escape foi preservada.
- Em ponteiro coarse, inputs, selects, textareas, comboboxes e switches apropriados passaram a ter altura mínima de 44 px. Na nova medição, o seletor da Loja passou de 39 px para 44 px.
- A lista de fichas deixou de animar no eixo horizontal e ganhou contenção local de overflow; a animação de opacidade foi mantida.
- “Nova Perícia / Ofício” foi convertida em `motion.button` com `type="button"`, preservando o visual e tornando a ação nativamente operável por teclado.
- Os ícones de ajuda interativos da aba principal da Ficha foram envolvidos por botões nomeados. Os fechamentos afetados receberam nome acessível e tipo explícito.

Não houve redesign, troca de biblioteca, novo sistema de breakpoints nem alteração motivada apenas por estética.

## Testes de acessibilidade

### Teclado e foco

- O `FichaWizard` foi aberto em 568×320: o campo inicial recebeu foco, o diálogo ficou contido em 544×296, o corpo interno rolou de 175 px de área útil para 1350 px de conteúdo, o fechamento mediu 44×44 e não houve overflow global. Escape fechou o wizard após a animação de saída e o foco retornou a “Criar Personagem”.
- O modal de campanha em 390×320 colocou foco no campo configurado; seu conteúdo e rodapé permaneceram alcançáveis por scroll.
- O detalhe de item da Loja em 390×320 passou a colocar foco no fechamento; título longo quebrou em múltiplas linhas e o corpo permaneceu rolável.
- O menu de Configurações em 320×320 permaneceu integralmente utilizável por rolagem.
- No `Select` administrativo em 390×320, a lista ficou dentro das bordas (aproximadamente x=214–358 e y=188–306); ArrowUp alterou a opção ativa, Escape fechou e devolveu o foco ao gatilho, e Tab fechou e avançou para “Salvar”.
- A semântica nativa de botão e o tratamento de Enter/Space foram preservados nos gatilhos. A automação do navegador apresentou inconsistências ao despachar algumas combinações de Shift+Tab/Enter diretamente em locators que mudavam de foco; por isso, essas combinações também foram verificadas por inspeção do tratamento de eventos, sem alegação de validação em hardware.

### Touch e hover

- A emulação de ponteiro coarse confirmou a regra mínima de 44 px no seletor nativo corrigido.
- Em cards da Ficha, “Trocar foto” permaneceu visível e clicável sem hover em modo coarse, com área de 44×44.
- Cards e ações convertidos em botões/links mantêm operação independente de hover. Não foram encontradas áreas de toque sobrepostas na regressão pós-correção.

### Movimento reduzido

- `prefers-reduced-motion: reduce` foi emulado pelo protocolo do Chromium e ficou ativo em `matchMedia`.
- Elementos atmosféricos próximos deixaram de animar (`animation-name: none`) e as durações globais foram reduzidas para 0,01 ms.
- Nenhum conteúdo ficou oculto nem a navegação foi bloqueada durante essa emulação.

## Testes extremos

- **320 px:** cards em uma coluna, textos extensos e palavra ininterrupta não criaram scroll horizontal global. Settings e formulários permaneceram roláveis.
- **Landscape baixo:** 568×320, 640×360 e 932×430 foram reexecutados após as correções em Home, Ficha, ficha individual, Loja, Regras, Mundo, Sessão e Administração: 24/24 observações sem overflow global. A barra inferior permaneceu acessível.
- **Altura de 320 px:** Settings, Wizard e modais/drawers avaliados mantiveram fechamento e conteúdo alcançáveis por rolagem interna. A regressão automatizada também cobriu páginas com 1280×320.
- **Fim de página no mobile:** em 390×844, após rolar até o final, a barra inferior fixa não cobriu os controles finais nas rotas verificadas; a reserva inferior e a safe area permaneceram aplicadas.
- **Conteúdo extremo:** nomes com várias linhas, palavra contínua longa, descrições extensas, doze itens de loja, tabelas/listas e números longos não produziram overflow global. Faixas de abas e tabelas que precisam de largura mantiveram scroll horizontal localizado.
- **2K/4K/ultrawide:** não houve overflow em 2560×1440, 3440×1440, 3840×2160 ou 5120×1440. O conteúdo principal ficou limitado a 2000 px nas telas muito largas, evitando linhas excessivamente longas. A fonte raiz medida escalou de aproximadamente 16,22 px em 1920 px para 17,63 px em 2560 px, 19,57 px em 3440 px e 20 px em 3840/5120 px.
- **Zoom equivalente a 200%:** Ficha, Loja, Regras, Mundo e Home foram verificadas no espaço CSS de 720×450 sem overflow global ou controles inacessíveis.
- **Proporções incomuns:** 333×777, 911×509, 1537×863 e 2711×997 não revelaram quebra dependente apenas de breakpoints “redondos”.

## Regressão do CSS global

A revisão de `src/index.css` concentrou-se em regras globais, media queries, elementos fixos, `overflow`, alturas rígidas, touch, safe areas e breakpoints de telas largas. Os problemas confirmados foram a altura touch insuficiente e a concorrência entre camadas fixas, ambos corrigidos. Não foi feita refatoração estética das regras existentes.

Não foi encontrado, na matriz final, caso em que tabela ou lista forçasse scroll horizontal na página inteira. Os casos horizontais remanescentes são contêineres locais intencionais, principalmente tabs e tabelas administrativas.

## Validação após as correções

- `npm run build`: aprovado; o script executa `tsc -b && vite build`, portanto TypeScript e build de produção passaram juntos.
- `npm run test:frontend`: **195/195 testes aprovados**, sem falhas, cancelamentos ou skips.
- `git diff --check`: aprovado; houve apenas o aviso de normalização futura de CRLF para LF em `CatalogoMagico.tsx`, sem erro de whitespace.
- Regressão visual direcionada: 48/48 observações nas rotas afetadas, cobrindo 320×320, 320×568, 390×844, 720×450, 1280×320 e 1920×1080, sem overflow global, clipping inesperado ou erro de console.
- Regressão landscape complementar: 24/24 observações em 568×320, 640×360 e 932×430, sem overflow global.
- `npm run check:typography`: na execução original deste pass, não aprovado por travessões já presentes em nove arquivos fora das alterações desta auditoria (`useCampaignSSE.ts`, `FrotaCampanha.tsx`, `PropriedadesCampanha.tsx`, três services e três arquivos de dados/regras). O verificador é editorial e o resultado não representava uma quebra responsiva; nenhum desses textos foi reescrito naquele pass para evitar misturar escopos. Na auditoria final pré-commit de 13 de agosto de 2026, após alterações posteriores, o comando passou.

## Limitações

- Nenhum celular, tablet, TV ou monitor físico foi usado. Touch e tamanhos foram emulados no Chromium.
- Safari/WebKit, Firefox e Chrome móvel reais não foram executados. Logo, não há validação física de iOS, Android ou navegadores diferentes do Chromium integrado.
- O backend real em `localhost:8080` estava indisponível. Rotas protegidas foram exercitadas com um mock local descartável e conteúdo extremo; integrações, mensagens reais de erro do servidor e estados dependentes de dados de produção não foram validados.
- O navegador integrado não aplicou zoom real pelos atalhos. O reflow foi testado com viewports CSS equivalentes entre 80% e 200%, conforme documentado acima.
- Não havia emulação de notch/safe area compatível: o comando `Emulation.setSafeAreaInsets` não era suportado. `viewport-fit=cover` e os quatro `env(safe-area-inset-*)` foram verificados estruturalmente, mas não em hardware com recorte.
- Teclado virtual móvel não foi aberto. Formulários foram testados em alturas curtas, com foco e scroll, como aproximação; comportamento específico de resize/pan de cada sistema operacional continua dependente de teste físico.
- Algumas combinações de teclas em locators cujo foco mudava durante o evento não puderam ser despachadas de forma confiável pela ferramenta integrada. Os fluxos principais foram exercitados quando possível e a lógica restante foi inspecionada no código.
- O worktree continha muitas alterações simultâneas de outros processos. Esta auditoria não reverteu nem reinterpretou mudanças alheias e não alterou os arquivos específicos do trabalho de performance.

## Estado final

**APROVADO COM LIMITAÇÕES**

Os sete problemas reais encontrados foram corrigidos e a regressão final não mostrou falha de layout, overflow global, clipping inesperado ou bloqueio de interação nas combinações exercitadas. A classificação mantém limitações porque backend real, hardware físico, WebKit/Firefox, safe area com notch, teclado virtual e zoom real não foram testados; portanto, não seria tecnicamente correto declarar compatibilidade física universal.
