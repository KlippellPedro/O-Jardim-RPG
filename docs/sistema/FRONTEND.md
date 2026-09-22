# Frontend e experiência do jogador

Consolidado em **7 de setembro de 2026**. Reúne os dois documentos da jornada
do jogador, responsividade e as duas passagens de performance no mesmo
relatório. [Histórico e medições originais](../HISTORICO.md#frontend).

Os fechamentos abaixo registram os testes realizados em agosto. A presente
consolidação não repetiu navegação, profiling ou testes em hardware físico.
Para segurança introduzida depois desses fechamentos, ver
[Integração](INTEGRACAO.md#seguranca-de-setembro).

## Jornada do jogador

| ID | Problema original | Fechamento |
| --- | --- | --- |
| PJ-001 | Voltar em Regras não restaurava o tópico anterior. | Navegação por URL/histórico corrigida e regressada. |
| PJ-002 | Carrinho unitário mostrava plural incorreto. | Contagem e apresentação corrigidas. |
| PJ-003 | Login/Cadastro explicavam pouco o primeiro acesso. | Contexto e próximo passo acrescentados no fechamento de 13/08. Não permanece aberto como na descoberta. |
| PJ-004 | Recurso salvo na ficha divergia do HUD da sessão. | Sincronização corrigida; a regressão registrada incluiu reload e logout/login. |

A jornada coberta percorreu Login, Cadastro, Campanhas, Ficha, Loja, Mundo,
Regras, Sessão, Cofre, Configurações e novo login, com perfis de jogador e
gestão. A aprovação de agosto vale para essa cobertura e versão; não é uma
afirmação de ausência de vulnerabilidades em toda a plataforma.

<a id="carrinho-transitorio"></a>

### Carrinho transitório

O contrato documentado e o estado local de
[LojaPage.tsx](../../src/pages/Loja/LojaPage.tsx) mantêm o carrinho durante a
montagem da página:

- Fechar e reabrir o drawer preserva o lote.
- Trocar comprador ou modo de loja limpa o lote.
- Reload e logout/login descartam o lote.
- Compra concluída limpa o lote; falha por saldo mantém o checkout para ajuste.

Persistência por usuário seria uma mudança de produto. Não tratar o descarte
em reload como regressão de uma persistência que não foi implementada.

### Mundo e caminhos de acesso

A interação orbital foi documentada em duas etapas: focar a Árvore e abrir
seus detalhes. Rotas de crônicas e códice são caminhos próprios. Na auditoria,
a Linha do Tempo forneceu uma alternativa de navegação por botões quando a
automação não conseguia clicar de modo confiável no nó em movimento.

Desde a correção de setembro, o conteúdo narrativo vem da API autenticada,
conforme [useResolvedWorld.ts](../../src/hooks/useResolvedWorld.ts). Ocultar um
registro não pode depender somente de esconder o componente na tela.

<a id="limites-da-validacao-de-jornada"></a>

### Limites da validação de jornada

| Fluxo | Limitação registrada e próximo teste útil |
| --- | --- |
| Cofre/Discord | Operação completa exige conta vinculada, servidor associado e Banqueiro disponível; teste isolado do site não substitui essa integração. |
| Compras avançadas | Detalhes e saldo insuficiente foram exercitados na interface; compra completa exige conta de teste com recursos adequados. |
| Nós 3D móveis | A dificuldade da ferramenta de clicar no alvo não comprovou defeito do produto. Fazer a passagem humana por mouse, touch e teclado. |

<a id="avisos-e-consistencia-21-09"></a>

## Avisos-relâmpago, cartaz e atalhos (21 de setembro de 2026)

Fechamento de uma rodada de pedidos pontuais sobre inconsistências entre
telas, não uma nova auditoria completa da jornada.

| Pedido | Fechamento |
| --- | --- |
| O cartaz de Procurado e a moldura do retrato mostravam patentes diferentes para o mesmo nível: o cartaz parava em "Lendário" a partir do nível 20, enquanto o retrato já tinha 13 graus (a cada 5 níveis) até o 60. | [cartaz.ts](../../src/pages/Ficha/utils/cartaz.ts) passou a reaproveitar `molduraDoRetrato` de [retrato.ts](../../src/pages/Ficha/utils/retrato.ts) como fonte única. O PNG exportado ([cartazExportar.ts](../../src/pages/Ficha/utils/cartazExportar.ts)) e o resumo impresso ([exportarFicha.ts](../../src/pages/Ficha/utils/exportarFicha.ts)) seguem a mesma escada. |
| A carta de item comprado na Loja e a lista de desejos viviam só no `localStorage`: comprar num aparelho e abrir a ficha em outro perdia a revelação e a lista. | Os dois passaram a viver em `ficha.lootPendente` e `ficha.wishlist`, sincronizados pelo autosave normal da ficha ([useCharacterStore.ts](../../src/store/useCharacterStore.ts)), sem endpoint novo. Ver `proximosPendentes` em [loot.ts](../../src/components/loot/loot.ts) e [useWishlist.ts](../../src/hooks/useWishlist.ts). |
| Loot, conquista e "é sua vez" eram três sistemas de aviso independentes, sem nenhuma coordenação entre si. | Hub compartilhado novo em [src/components/avisosRelampago/](../../src/components/avisosRelampago/hub.ts): só um tipo por vez toca som/vibra e aparece; os outros esperam a vez. Cada host manteve a própria animação (carta, selo, gongo). |
| Ninguém era avisado de "é sua vez" fora da aba da Sessão ao Vivo. | Preferência opcional em Configurações → Preferências → Notificações; usa a Notification API do navegador, só com a aba escondida e a permissão concedida no clique de ligar. Ver [notificacoesNavegador.ts](../../src/utils/notificacoesNavegador.ts) e `usePerformanceStore.notificarSuaVez`. |
| A grade inicial da Home só linkava 5 dos módulos, mesmo com Quadro, Campanha e Materiais tendo crescido bastante desde então. | [Home.tsx](../../src/pages/Home.tsx) ganhou uma segunda fileira de atalhos, com ícones Lucide (sem exigir arte nova) para esses três. |
| Quem entra na Sessão ao Vivo sem personagem (papel `observador`, ou jogador sem ficha escolhida) já via tudo em modo leitura, mas sem nenhum indicativo disso na tela. | Selo "Espectador" no cabeçalho de [SessaoPage.tsx](../../src/pages/Sessao/SessaoPage.tsx) e explicação no formulário de convite ([MestrePanel.tsx](../../src/components/Settings/MestrePanel.tsx)) quando o Mestre escolhe o papel Observador. Nenhuma rota ou permissão nova: o backend já tratava `observador` como leitura completa (ver [Integração](INTEGRACAO.md#cronica-da-campanha)). |

Cobertura: `npm run test:frontend` (611 testes em 21/09, incluindo os novos
[cartaz.test.ts](../../tests/frontend/cartaz.test.ts),
[lootPendente.test.ts](../../tests/frontend/lootPendente.test.ts) e
[avisosRelampagoHub.test.ts](../../tests/frontend/avisosRelampagoHub.test.ts))
e `npx tsc -b` limpos. Não repete navegação manual em navegador real.

## Responsividade e acessibilidade

O fechamento de agosto corrigiu sete problemas reproduzidos:

1. Foco inicial, contenção de foco, Escape, restauração e bloqueio do documento
   inconsistentes em modais e drawers.
2. Carrinho concorrendo com navegação fixa em telas de pouca altura.
3. `Select` customizado sem transição adequada por Tab.
4. Alvo touch insuficiente em um seletor nativo.
5. Overflow horizontal transitório causado pela animação de entrada das fichas.
6. “Nova Perícia / Ofício” sem controle semântico alcançável por teclado.
7. Ajuda e fechamento de modais com nomes/atributos acessíveis incompletos.

A regressão abrangeu larguras móveis e desktop, paisagem com pouca altura,
conteúdo extremo e reflow equivalente a zoom de 80% a 200%. O relatório
registrou **aprovação com limitações**, pois usou Chromium emulado e backend
simulado nos cenários protegidos.

Continuam sendo verificações externas àquela cobertura: Safari/WebKit,
Firefox, iOS/Android reais, teclado virtual, safe area com notch, zoom real e
interação com o backend real. O relatório de responsividade não comprova
transações nem permissões da API.

## Performance

As duas passagens de performance tratam de uma mesma sequência; o segundo
perfil complementa o primeiro. As escolhas registradas foram:

| Área | Intervenção e motivo |
| --- | --- |
| Entrada do site | Fundo global em CSS; carregamento de bibliotecas 3D restrito às rotas que precisam delas. |
| Divisão do frontend | Rotas e painéis sob demanda, seletores específicos de estado e estabilização de cálculos/callbacks. |
| Modelos do Mundo | Carregamento progressivo; retirada do preload global; reaproveitamento de objetos e materiais. |
| Loop de renderização | Teto de renderização no modo completo, suspensão quando a aba fica oculta e renderização sob demanda no modo econômico. |
| Imagens e listas | Fundos WebP, carregamento tardio, `content-visibility` e remoção de texturas externas substituídas por CSS. |
| Materiais dos GLBs, segunda passagem | Remoção da transmissão física onerosa das cúpulas, preservando alpha, cor e rugosidade. |
| Alta resolução | Controle do custo em pixels/DPR; nova qualidade ou LOD deve responder a uma medição, não a suposição. |
| Ciclo de vida | Cancelamento de RAF, timers e callbacks; conexões SSE encerradas no cleanup. |

O modo econômico é opcional e persistido no navegador. O cache de GLBs
reaproveitados não deve ser confundido automaticamente com vazamento de
memória. O fechamento deixou como investigação adicional snapshots de heap
com GC controlado e comparação de dominadores.

<a id="como-usar-as-medicoes-antigas"></a>

### Como usar as medições antigas

Os números de bundle, CPU, memória, draw calls e triângulos pertencem ao
build, navegador e computador usados em agosto. Não são metas universais nem
tamanhos atuais. Foram retirados da referência cotidiana para não concorrer
com medidas de builds novos; permanecem integralmente no relatório histórico.

A mesma regra vale para a contagem antiga de vulnerabilidades de dependências:
é um retrato daquela instalação, não o resultado de uma auditoria atual.

<a id="proxima-medicao-util"></a>

### Próxima medição útil

- Usar build de produção servido por HTTP e registrar versão, viewport, DPR,
  modo de qualidade e hardware antes de comparar números.
- Medir cold load, interação e retorno à página; separar rede, CPU e GPU.
- Repetir em GPU integrada/Android real e observar pressão térmica.
- Comparar heap após ciclos repetidos com GC controlado.
- Reexportar materiais não transmissivos se houver nova rodada de GLBs.
- Confirmar editorialmente o uso de `keryx.glb` antes de remover um asset
  apenas porque um perfil antigo não o carregou.

<a id="verificacao-por-tipo-de-mudanca"></a>

## Verificação por tipo de mudança

O [guia de manutenção](../GUIA_MANUTENCAO.md) concentra os comandos. Para uma
mudança de interação, complementar build/testes com navegação por teclado e
um viewport curto. Para performance, guardar método e comparação no mesmo
documento, com data. Para persistência e permissões, usar as coberturas de
[Integração](INTEGRACAO.md), além da observação visual.

Fontes de implementação: [MundoPage.tsx](../../src/pages/Mundo/MundoPage.tsx),
[components do Mundo](../../src/pages/Mundo/components/),
[Select.tsx](../../src/components/ui/Select.tsx),
[src/hooks/](../../src/hooks/) e
[optimize-background-assets.py](../../tools/optimize-background-assets.py).
