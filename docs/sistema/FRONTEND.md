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

<a id="niveis-alem-do-60-30-09"></a>

## Níveis além do 60: telas tocadas (30 de setembro de 2026)

| Tela | O que mudou |
| --- | --- |
| Ficha, aba Perícias | Doze graus (Lendário a Absoluto além dos sete antigos), lidos de `progressao-niveis.json`; cores dos graus novos escritas por extenso em [AbaPericias.tsx](../../src/pages/Ficha/abas/AbaPericias.tsx) porque o Tailwind descarta nome de classe montado em runtime. Nome de grau na tela vem de `nomeDoGrauPericia` (o id não tem acento). |
| Ficha, aba Magias | Bloco "Magias por círculo" (quantas magias de cada círculo a ficha conhece, o teto e as vagas livres), aviso de Fluxo abaixo do recomendado ao aprender ou conjurar, e a rolagem passou a somar metade do nível. |
| Sessão, Bestiário | Faixas de VD 1-10, 11-25, 26-50 e 51+, filtro de família e de criaturas únicas, selo "Única", e a aba "Sob medida" (gerador de criatura por VD e papel) no lugar dos modelos universais. O editor de criatura aceita VD até o máximo do arquivo de dados. |

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

<a id="niveis-alem-do-60"></a>

## Níveis além do 60: ficha, avisos e molduras (29 de setembro de 2026)

O nível total deixou de ter teto (decisões em
[Balanceamento](BALANCEAMENTO.md#níveis-além-do-60-2026-09-29)). O que mudou na
experiência da ficha:

| Assunto | Fechamento |
| --- | --- |
| A Aba Ficha travava o botão de subir nível no 20 por classe e no 60 no total, e o "Adicionar classe" em 3 classes. | Desde 1/10 o 50 é teto de verdade: o botão, o campo de nível e o servidor (`validar_regras_ficha`) não deixam uma classe passar dele. Ficha antiga que já estava acima abre e salva, só não sobe mais. Qualquer classe liberada e ainda fora da ficha pode ser adicionada. [AbaFicha.tsx](../../src/pages/Ficha/abas/AbaFicha.tsx). |
| O nível total cortava cada classe em 20, então Legados e slots saíam errados. | `classesDaFicha` e `magiaService` contam o nível real. A consulta das recompensas escritas continua parando no 20. |
| Nada mostrava quantos aumentos de atributo o nível liberava. | Seção Atributos: "Aumentos pelo nível: X de Y usados · N para gastar" e o botão **Gastar** abre o painel que soma +1 e registra em `ficha.aumentosAtributo`. Só esse registro conta como gasto; número mexido à mão (bênção, sessão) aparece como "+N de bênção ou sessão". Ficha sem o registro conta toda subida como gasto. |
| O painel de progressão não sabia o que fazer acima do 20. | Mostra o nível real, a Maestria (seis marcos, acesos ou apagados) e o próximo marco. O Simulador de Nível sobe até o 50 e lista os marcos da Maestria. A página de cada classe no livro ganhou o bloco da Maestria. |
| O painel de subida de nível só falava das recompensas da classe. | Avisa também Maestria, Legado, aumento de atributo e vaga de item especial, com voz gravada. |
| Patamares 60, 100, 150, 250 e 500. | O aviso é a Conquista lendária (o cartão que desce, fala e some sozinho), mais o selo "Patamar I a V" na linha de classes e a moldura nova do retrato e do cartaz. |
| As molduras do cartaz de Procurado nunca apareciam. O nome da classe CSS era montado em tempo de execução (`wanted-poster--${chave}`) e o Tailwind descartava as regras. | Desde 1/10 o cartaz não tem regra por grau: as cores e o desenho do aro chegam por variáveis inline do componente, e as classes genéricas (`wanted-poster--moldura`, `--grossa`, `--aros-1`, `--aros-2`, `--pulsa`) estão escritas por inteiro no [PersonagemWantedCard.tsx](../../src/pages/Ficha/components/PersonagemWantedCard.tsx). Sem `safelist`. |
| A recompensa do cartaz crescia 22% por nível e passaria de 10^40 Lunaris no nível 500. | Até o 60 a conta é a mesma; depois soma mais 10% do valor do 60 por nível (o 100 vale 5 vezes o 60). |

### Molduras: um degrau a cada 5 níveis, do 5 ao 500 (1 de outubro de 2026)

A escada em [retrato.ts](../../src/pages/Ficha/utils/retrato.ts) tem 101 degraus (`ESCADA_MOLDURAS`). Os 13 primeiros (comum a Lendário, até o 60) são escolhidos à mão; do 65 ao 495 cada degrau é gerado, com nome próprio (gemas, metais, céu e depois forças e conceitos). Os marcos 100, 150, 250 e 500 (Mítico, Cósmico, Eterno e Absoluto) mantêm visual escolhido à mão.

| Característica | Como varia |
| --- | --- |
| Cor | Ângulo áureo (137,5°) pelo círculo de matizes, então degraus vizinhos nunca ficam parecidos. |
| Joia | Losango, círculo, estrela, hexágono, cruz ou gota. 4 joias até o 119, 6 até o 249 e 8 depois (cantos e meio dos lados). |
| Aros | Duplo desde o 20; um aro a mais a partir do 180 e outro a partir do 330. |
| Aro de fora | Liso, tracejado, pontilhado ou linha dupla. |
| Movimento | Brilho girando (nos dois sentidos), luz pulsando ou joias cintilando. Só com movimento reduzido desligado. |

O retrato (CSS), o cartaz de Procurado e o PNG do cartão (canvas em [cartaoPersonagem.ts](../../src/pages/Ficha/utils/cartaoPersonagem.ts)) leem os mesmos campos de `EstiloMoldura`. Entre dois degraus vale o de baixo (o nível 69 usa a moldura do 65).

### Card da classe acima do 20 e teto de 50 (1 de outubro de 2026)

O "slot" de cada classe na Aba Ficha (`.ficha-class-slot`) ganha um degrau visual a partir do nível 21 da própria classe e a cada marco de Maestria. A cor e o símbolo de fundo vêm da classe (o mesmo glifo da atmosfera dela), então duas classes no mesmo degrau ficam diferentes; o enfeite vem do degrau. A escada está em [degrauClasse.ts](../../src/pages/Ficha/utils/degrauClasse.ts) e um teste confere que ela segue os marcos de [maestria-classe.json](../../data/ficha/maestria-classe.json).

| Nível da classe | Degrau | O que aparece |
| --- | --- | --- |
| 21 a 24 | Veterano | Selo com o nome e símbolo da classe ao fundo. |
| 25 a 29 | Especialista | Cantos marcados. |
| 30 a 34 | Mestre | Brilho de fundo e símbolo mais visível. |
| 35 a 39 | Grão-Mestre | Cantos maiores e uma faixa de luz que atravessa o card. |
| 40 a 44 | Paragão | Segundo aro por fora. |
| 45 a 49 | Epítome | Selo mais forte. |
| 50 | Apoteose | O teto da classe: aro de luz girando. |

O teto de 50 por classe é o único bloqueio duro nesta parte. O nível total continua sem teto (quem quer evoluir mais abre outra classe). A trava mora em `limitarNivelClasse` ([progressaoNiveis.ts](../../src/services/progressaoNiveis.ts)) e em `validar_regras_ficha` ([character_summary.py](../../plataforma/core/character_summary.py)), que só barra quem *sobe* acima do 50, para não trancar fichas antigas.

Cobertura: `npm run test:frontend` (767 testes em 29/09, incluindo
[progressaoNiveis.test.ts](../../tests/frontend/progressaoNiveis.test.ts),
[maestriaClasse.test.ts](../../tests/frontend/maestriaClasse.test.ts),
[nivelAcimaDe20.test.ts](../../tests/frontend/nivelAcimaDe20.test.ts),
[referenciaBalanceamento.test.ts](../../tests/frontend/referenciaBalanceamento.test.ts) e
[vozSabioCobertura.test.ts](../../tests/frontend/vozSabioCobertura.test.ts)) e
`npx tsc -b` limpos. Os componentes novos foram vistos no servidor de
desenvolvimento (painel de progressão, contador de atributos, molduras, cartaz,
aviso de Conquista e painel de subida). A ficha completa não foi exercitada,
porque exige API e banco.

## Mesa, troca e convites (2 e 3 de outubro de 2026)

Telas novas desta leva, com o contrato de servidor em
[Integração](INTEGRACAO.md#loot-das-criaturas):

- **Bestiário da Sessão** ([BestiarioPicker.tsx](../../src/pages/Sessao/components/BestiarioPicker.tsx),
  [CriaturaDetalhe.tsx](../../src/pages/Sessao/components/CriaturaDetalhe.tsx)): clicar no
  cartão abre a ficha grande da criatura, os filtros ficaram legíveis e o `Select`
  é o escuro do site. A ficha mostra o saque ao Mestre.
- **Saque** ([LootPanel.tsx](../../src/pages/Sessao/components/LootPanel.tsx),
  [EditorLootCampanha.tsx](../../src/pages/Sessao/components/EditorLootCampanha.tsx)): o
  Mestre rola, escolhe quem recebe cada linha e, se quiser, ajusta a tabela só
  na campanha dele. O jogador nunca vê tabela nem chance.
- **Aflições** ([AflicoesSessaoPanel.tsx](../../src/pages/Sessao/components/AflicoesSessaoPanel.tsx),
  [AflicoesSection.tsx](../../src/pages/Ficha/components/AflicoesSection.tsx)): o
  Mestre aplica pelo cartão de quem está em cena; o jogador vê e rola o teste
  na própria ficha.
- **Escalar para outro VD** ([EntityEditor.tsx](../../src/pages/Sessao/components/EntityEditor.tsx),
  `escalarCriatura` em [curvaCriatura.ts](../../src/services/curvaCriatura.ts)): no editor de
  uma criatura em cena, o Mestre digita o VD e o formulário recebe Vida (mesma proporção
  em relação à curva), Defesa, Mana, Estamina, iniciativa, ataques (bônus, dano e DTs do
  texto) e perícias. Só grava ao salvar. Visto no navegador (Aranha Gigante do VD 18 para o 40:
  Vida 380 para 1000, ataque +21 para +38, DT 15 para 26) e a 375 px sem rolagem lateral.
- **Montador de encontro** ([MontadorEncontro.tsx](../../src/pages/Sessao/components/MontadorEncontro.tsx),
  [montadorEncontro.ts](../../src/services/montadorEncontro.ts)): o botão "Encontro" do controle da
  cena pede nível do grupo, jogadores e dificuldade (fácil 0,65, padrão 1, difícil 1,3, mortal 1,6
  do orçamento de um encontro padrão para quatro, calibrados por simulação: ver BALANCEAMENTO). O orçamento é gasto em fatias de Vida por papel
  (lacaio 0,1, padrão 0,25, elite 0,5, chefe 1) e há cinco estilos (bando, líder e capangas, chefe e
  escolta, elites, duelo). As criaturas vêm do Bestiário já carregado e passam por
  `escalarCriatura` com troca de papel, então Vida, dano e ataque seguem a fatia do papel; sem
  criatura que sirva, a vaga sai do gerador por VD. Única só entra de chefe se o Mestre marcar.
  O sorteio usa semente (mesmo pedido, mesmo encontro; "Sortear de novo" muda a semente) e cada
  vaga pode ser trocada ou tirada. "Adicionar tudo à cena" reaproveita `pickFromBestiario`, então
  nomes numerados, multiataque e loot funcionam como no Bestiário. Visto no navegador a 1400 px e a
  375 px, sem rolagem lateral. Na mesma passada: `input[type=checkbox]` saiu da regra de 44 px
  de altura dos ponteiros de toque (`index.css`), que esticava toda caixinha de marcar no celular.
- **Fases de chefe** ([AvisoDeFaseDeChefe.tsx](../../src/pages/Sessao/components/AvisoDeFaseDeChefe.tsx),
  `avisosDeFaseNova` em [useSessaoStore.ts](../../src/store/useSessaoStore.ts)): quando a fase de um
  participante sobe entre duas leituras do estado, aparece um aviso. O Mestre vê as mudanças e fecha
  à mão; a mesa vê só a frase de cena e o aviso some em 14 s. O cartão em foco mostra "Fase N de M" e o
  bloco "O que mudou", a ficha completa lista as fases, e o editor da criatura tem botões para
  trocar a fase à mão. Ver [Integração](INTEGRACAO.md#fases-de-chefe).
- **Livro da Verdade** ([LivroDaVerdadePage.tsx](../../src/pages/Mundo/LivroDaVerdadePage.tsx),
  `/mundo/livro-da-verdade`, botão na página do Mundo): grade de páginas. A mesa vê as lendas caídas
  abertas (verdade, "O que mudou no mundo", data, sessão e quem estava lá) e, no lugar das outras, uma
  página rasurada (`RasuraTitulo`, `RasuraTexto`, `CarimboRetido`) cuja semente é só o número da vaga. O
  Mestre vê as 28, pode ler a página antes da queda, marcar uma queda fora da Sessão e desfazer uma
  queda (com confirmação). Na Sessão, [AvisoDeLendaCaida.tsx](../../src/pages/Sessao/components/AvisoDeLendaCaida.tsx)
  mostra para a mesa inteira "Uma lenda caiu" com um link para a página (`avisosDeLendaNova` no
  `useSessaoStore`; a primeira leitura da sessão nunca avisa). A galeria de conquistas junta os
  selos de lenda bloqueados num cartão só, "Matador de Lendas", com a contagem dos já conquistados.
  Visto no navegador a 1400 px como Mestre e como jogador.
- **Efeitos do mundo:** a página do Livro mostra, em cada lenda caída, a lista "Efeitos em jogo" (e o
  Mestre lê os efeitos antes da queda). O calendário mostra uma faixa com os efeitos que ainda valem
  e até quando, e o cartão do item na Loja ganha a etiqueta "Efeito no mundo +10%" com o texto no
  `title`.
- **Montador e habilidades:** o cartão de cada vaga mostra as marcas Cura, Controle e Área
  (`ameacaDeHabilidades` em `montadorEncontro.ts`) e o topo mostra "Habilidades pesam N". Cada tipo
  gasta 8%, 12% e 10% do custo da vaga (limite de 25%), e a Vida da criatura cai na mesma proporção.
- **Mandar e trocar** ([MandarItemModal.tsx](../../src/pages/Ficha/components/MandarItemModal.tsx),
  [MandarMoedasModal.tsx](../../src/pages/Ficha/components/MandarMoedasModal.tsx),
  [PropostaTrocaModal.tsx](../../src/pages/Ficha/components/PropostaTrocaModal.tsx),
  [TrocasPanel.tsx](../../src/pages/Ficha/components/TrocasPanel.tsx)).
- **Convites** (aba do Painel do Criador,
  [ConvitesPlataformaPanel.tsx](../../src/components/Settings/ConvitesPlataformaPanel.tsx));
  o cadastro lê `?convite=` do link.

Verificação: as telas foram exercitadas no navegador contra API e banco
descartáveis em desktop e em **375 px**. A passada móvel achou e corrigiu cinco
problemas de layout (rodapé do resumo da troca, linha do editor de saque, rótulo
de atributo na ficha da criatura, código e link do convite, nota de rodapé do
saque). Continua valendo o limite da seção abaixo: Chromium emulado, sem Safari
nem aparelho real.

<a id="avisos-combate-clima-e-app"></a>

## Avisos, combate vivo, clima do mundo e app instalável (9 e 10 de outubro de 2026)

Cinco mudanças de uma leva só. Nenhuma toca em regra de jogo nem em dado do servidor
além do aviso novo do calendário (ver [Integração](INTEGRACAO.md#canal-ao-vivo-compartilhado-e-calendario)).

- **Avisos e confirmações com a cara do site** ([components/avisos](../../src/components/avisos/)):
  no lugar do `alert()` e do `window.confirm()` do navegador, que não sobrou nenhum em `src/`.
  `avisar.erro/aviso/info/sucesso(texto)` e `avisarErro(erro, padrao)` mostram um aviso embaixo (some
  sozinho, pausa com o mouse em cima, no máximo quatro por vez, repetido conta como um só);
  `await confirmar({ titulo, mensagem, rotuloConfirmar, tom })` abre o diálogo, que no tom `perigo`
  pinta o botão de vermelho e deixa o foco em Cancelar; `escolher` aceita uma terceira saída. O estado
  mora em módulos comuns (`avisos.ts`, `confirmacao.ts`), então serviço e store também podem avisar;
  o `AvisosHost` (montado uma vez no `App`, dentro do Router) desenha. **Toda confirmação é
  assíncrona**: quem chama precisa de `await` (o TypeScript não acusa `if (!promise)`), inclusive o
  `confirmarDescarte()` de `useUnsavedChanges`. Depois do `await`, quem escreve numa lista da ficha lê
  a lista de agora (`listaAgora` e `fichaAgora`, em [desfazerNaFicha.ts](../../src/pages/Ficha/desfazerNaFicha.ts)),
  porque a ficha pode ter mudado enquanto a pergunta estava aberta.
- **Desfazer no lugar de perguntar** ([desfazer.ts](../../src/components/avisos/desfazer.ts),
  [desfazerNaFicha.ts](../../src/pages/Ficha/desfazerNaFicha.ts)): ataque, habilidade, poder, nota,
  vínculo, Prestígio e propriedade da ficha saem na hora e o aviso traz o botão "Desfazer", que
  devolve o item no lugar em que estava (a lista é lida de novo na hora de desfazer). Desequipar uma
  arma na aba Ataques também. O que mora no servidor ou não tem volta continua perguntando antes:
  aliado, perícia criada, item do inventário, veículo e propriedade da campanha, ficha inteira,
  conflito de salvamento, magia aprendida, troca, Fruto do Éden.
- **Iniciar combate em ordem** ([filaDeIniciativa.ts](../../src/pages/Sessao/filaDeIniciativa.ts),
  [InitiativeTracker.tsx](../../src/pages/Sessao/InitiativeTracker.tsx)): o servidor começa o combate
  pelo primeiro da fila, então uma fila fora de ordem fazia quem tem iniciativa menor jogar antes.
  Agora, se a fila está fora de ordem, "Iniciar combate" pergunta "Ordenar e começar", "Começar assim"
  ou "Voltar" (iniciativa igual conta como em ordem), e o botão "Ordenar fila" fica em destaque. É só
  do cliente: o servidor não mudou.
- **Combate vivo na Sessão** ([combateVivo.ts](../../src/pages/Sessao/combateVivo.ts),
  [combateVivo.css](../../src/pages/Sessao/combateVivo.css),
  [ReacaoDeVida.tsx](../../src/pages/Sessao/components/ReacaoDeVida.tsx),
  [AvisoDeCombate.tsx](../../src/pages/Sessao/components/AvisoDeCombate.tsx)): quando uma barra de Vida,
  Mana ou Estamina muda entre duas leituras, o número do dano ou da cura flutua (+/- e cor do
  recurso), a barra de Vida treme em proporção ao golpe e, com Vida baixa (25%) ou crítica (10%), pulsa;
  quem cai (Vida 0) vira um cartão cinza com a etiqueta "Caído". Início de combate, cada rodada nova
  e o fim aparecem como faixa para a mesa toda (`mudancaDeCombate` em `useSessaoStore`; a primeira
  leitura da página e a troca de sessão nunca anunciam). Tudo parte do que o cliente já recebe: criatura
  de visibilidade parcial não manda número, então só o texto de estado ("Ferido", "Quase morto") reage,
  e criatura escondida não ganha nome na faixa. Com movimento reduzido (preferência do sistema ou modo de desempenho) os números e o tremor não disparam e o batimento para: a barra já mostra o valor novo.
- **Clima do mundo** ([components/clima](../../src/components/clima/),
  [campanhaEventos.ts](../../src/services/campanhaEventos.ts)): o fundo do site segue o calendário do
  Mundo da campanha ativa. `ClimaDoMundoHost` busca o calendário e escreve `data-clima-estacao`
  (primavera, verão, outono, inverno, noite_eterna, eclipse) e `data-clima-lua` no `<html>`;
  [index.css](../../src/index.css) pinta uma camada por estação (só `opacity`) e o
  `AtmosphericBackground` desenha as partículas no canvas (pétalas, vagalumes, folhas, neve, brasas),
  proporcionais à área da tela. A estação já vem "efetiva" do servidor (a especial do Mestre ou a que
  uma lenda forçou). Quando o Mestre avança o dia, declara estação ou marca a queda de uma lenda, o
  servidor avisa o canal ao vivo (`calendario`) e a mesa toda atualiza na hora; voltar para a aba
  também atualiza. Calendário ainda fechado para a mesa (403) ou campanha sem calendário (404) deixa o
  fundo sem clima, para não entregar a estação antes da hora. Desligável em Configurações >
  Preferências > Clima do mundo (`climaDoMundo` em `usePerformanceStore`). Com movimento reduzido ou modo de
  desempenho não há partículas (a cor da estação fica). A Ficha abre até quatro canais ao vivo na mesma aba, e o HTTP/1.1 do desenvolvimento
  só aceita seis conexões por origem: por isso `campanhaEventos.ts` mantém **um único `EventSource` por
  campanha** e reparte os eventos (o `useCampaignSSE` antigo passou a usá-lo).
- **Instalar como app** ([public/sw.js](../../public/sw.js),
  [manifest.webmanifest](../../public/manifest.webmanifest), [src/pwa](../../src/pwa/),
  [InstalarComoApp.tsx](../../src/components/Settings/InstalarComoApp.tsx)): o site é instalável (ícone
  próprio, abre em tela cheia, abre sem internet até a tela; ficha e sessão continuam precisando de
  conexão). Em Preferências aparece o cartão "Instalar como app": no Chrome e no Edge o botão usa o
  `beforeinstallprompt`; onde o navegador não oferece, o cartão mostra o caminho manual (iOS inclusive,
  que usa o `apple-touch-icon`). O service worker só é registrado no build de produção. Estratégia:
  API, canal ao vivo, `/audio/`, `/models/`, `/data/` e pedidos `Range` vão direto à rede; a página
  vai à rede primeiro e só cai no cache quando a rede falha; arquivos com hash em `/assets/` ficam no
  cache para sempre; imagens e ícones saem do cache e se atualizam em segundo plano. **Mudou a
  estratégia? Suba `VERSAO` em `public/sw.js`**: os caches da versão anterior são apagados na
  ativação. O manifesto e o `sw.js` são servidos pela API na raiz (`/sw.js` sem cache e com
  `Service-Worker-Allowed: /`), porque um service worker só controla o que está abaixo do caminho dele.

Verificação: `npx tsc -b`, `npm run test:frontend` (1038 testes, oito arquivos novos: avisos e
confirmação, desfazer, fila de iniciativa, combate vivo, canal compartilhado, clima, service worker e
erro de rede) e a plataforma inteira contra Postgres descartável. No navegador, contra API e banco
descartáveis: o diálogo e o aviso a 1280 px e a 375 px (sem rolagem lateral, alvos de 44 px), excluir e
desfazer ataque, nota e arma equipada, remover aliado e item com confirmação, a ordenação da fila, as
faixas e os números do combate, a troca de estação pelo canal ao vivo e o interruptor do clima. A
instalação e o modo sem internet foram vistos num Chrome de verdade (CDP), porque o painel
embutido do app não registra service worker. **Não visto:** as partículas animadas rodando em tela
visível (o painel de teste fica oculto e não dispara `requestAnimationFrame`), Safari/iOS e aparelho real.

<a id="busca-sessao-transicoes-e-nascimento"></a>

## Busca, sessão ao vivo, transições e nascimento do personagem (10 de outubro de 2026)

Segunda leva do dia, sobre a primeira ([acima](#avisos-combate-clima-e-app)):

- **Busca do Jardim** ([components/busca](../../src/components/busca/), [buscaDoJardim.ts](../../src/services/buscaDoJardim.ts),
  [buscaDoJardimFontes.ts](../../src/services/buscaDoJardimFontes.ts)): `Ctrl+K` (ou `Cmd+K`) em qualquer tela, `/` fora de campo de
  texto e a lupa fixa ao lado da engrenagem (a lupa some na Sessão ao vivo, onde o cabeçalho usa o canto direito; o atalho segue
  valendo). A paleta é um pedaço separado do código e só baixa na primeira abertura; ela junta atalhos, fichas, Livro (capítulos,
  classes, raças, magias, rituais, selos, encantamentos e condições), Mundo, Registros Universais e Loja, ranqueia por título, depois
  detalhe, depois texto corrido (com trecho e marcação do que casou) e navega por teclado (setas, Enter, Esc) ou toque. **Regra de
  ouro: nada entra no índice que a tela correspondente não mostraria àquela pessoa.** Por isso cada fonte reaproveita a regra da
  própria página: `visibilidadeRegras.ts` (raças e classes esquecidas ou indisponíveis, o mesmo módulo que o Livro usa),
  `mapaDeBloqueios` em [worldCodex.ts](../../src/pages/Mundo/worldCodex.ts) (lore trancado, hierarquia, Árvore trancada, a mesma
  conta da página da Árvore), `registrosDeFabrica` e `mesclarRegistros` (registro rasurado, oculto e seção escondida), os mercados
  abertos da Loja (por padrão o Negro e o Banco Lunar ficam de fora) e `corpoMestre` e o Guia do Mestre só para quem comanda. O
  Painel do Mestre só aparece para Mestre ou assistente **da campanha**. Cada resultado abre a tela já no ponto certo:
  `/regras?topico=catalogo-magico&aba=...&item=...`, `/mundo/universal?secao=...&registro=...`, `/loja?busca=...&localizacao=...`
  e o caminho de cada entrada do Mundo. Teste: [buscaDoJardim.test.ts](../../tests/frontend/buscaDoJardim.test.ts), que cobre o
  ranqueamento e, principalmente, o que cada papel não pode encontrar.
- **Sessão ao vivo no menu e na Home** ([components/sessao](../../src/components/sessao/),
  [situacaoDaMesa.ts](../../src/services/situacaoDaMesa.ts), [ContinuarDeOndeParou.tsx](../../src/pages/ContinuarDeOndeParou.tsx)):
  o `SituacaoDaMesaHost` consulta `GET /sessao/campanha/{id}/situacao` (ver [Integração](INTEGRACAO.md#situacao-da-mesa)) e refaz a
  consulta quando o canal ao vivo compartilhado avisa `sessao_preparada`, `sessao_aberta` ou `sessao_encerrada`. O item Sessão do menu
  ganha um ponto (verde ao vivo, âmbar em preparação, esta só para quem comanda) e o nome acessível "Sessão, ao vivo agora". A Home
  mostra o cartão "Ao vivo agora" (ou "Em preparação") e o "Continuar" da última ficha aberta (`ultimaFicha.ts`, só id e nome no
  navegador, separado por pessoa e campanha). Se a mesa abre com a pessoa em outra tela, chega o aviso "A sessão começou" com o botão
  Entrar na sessão; quem abre o site com a mesa já aberta só vê o indicador.
- **Transições, esqueleto e guias**: [TransicaoDeRota.tsx](../../src/components/TransicaoDeRota.tsx) envolve as rotas com um fade de
  240 ms, só de `opacity` (um `transform` viraria o bloco de contenção dos elementos fixos das páginas). A chave da transição vem de
  `chaveDeTransicao` ([transicaoDeRota.ts](../../src/utils/transicaoDeRota.ts)): navegar por dentro do Mundo é a mesma tela, e não
  remonta a `MundoPage`. [EsqueletoDePagina.tsx](../../src/components/ui/EsqueletoDePagina.tsx) substitui o spinner do `Suspense` e só
  aparece depois de 180 ms (quase toda tela já está em cache e o esqueleto piscaria). Os dois guias (`GuidedTour` e
  `FichaGuidedTour`) ganharam "Pular todos os guias": ele liga `guiasAutomaticos = false` em `usePerformanceStore` (também em
  Preferências), e os cinco gatilhos automáticos (Ficha, Loja, Livro, Mundo, Sessão) conferem `guiasAutomaticosLigados()` antes de
  abrir; o botão de guia de cada página continua funcionando.
- **Nascimento do personagem** ([Wizard](../../src/pages/Ficha/Wizard/)): os cartões de Árvore, raça e classe ganharam emblemas
  (`EmblemaDoCartao`: o ícone do catálogo na cor da paleta aprovada; paleta muito escura, como a do Ninja, é clareada só até
  `corLegivel`). "Rolar 7d20" passa por `animarDadosLocais` ([rolagemDados.ts](../../src/components/dados/rolagemDados.ts)): o
  sorteio continua local, os sete d20 em duas fileiras só rolam e pousam nos valores sorteados, e os atributos entram quando eles
  pousam (sem 3D, por preferência ou movimento reduzido, entra na hora). O limite de seis dados vale só para rolagem vinda do
  servidor (`MAX_DADOS_3D`); a local aceita até `MAX_DADOS_LOCAIS`. O `RolagemHost` agora isola o Esc, o Enter e o espaço da cena (sem
  isso o Esc que fecha o dado fechava também o assistente por baixo). Depois de "Finalizar Criação", `NascimentoDoPersonagem` mostra
  os 20 níveis da classe como um céu apagado em que a primeira estrela acende, na cor da classe, e o assistente fica inerte até a
  pessoa escolher "Abrir a ficha" ou "Voltar à lista" (Esc também volta). Com movimento reduzido, modo de desempenho ou celebrações
  desligadas a tela aparece pronta, sem animar. O "Pular pra Ficha" do assistente continua indo direto, sem cerimônia.

Verificação: `npx tsc -b`, `npm run test:frontend` (1092 testes) e a plataforma inteira contra Postgres descartável (1568). Os
percursos foram vistos num Chrome de verdade (headless, com WebGL) contra API e banco descartáveis, a 1280 e a 390 px: o assistente
inteiro (emblemas, os sete dados, o Esc, a cerimônia e "Abrir a ficha"), a paleta de busca, a transição do indicador ao vivo pelo
canal e as páginas principais em busca de sobreposição com a lupa. **Não visto:** a busca com o papel de jogador na tela (a
visibilidade está coberta por teste, não por navegação), Safari/iOS e aparelho real.

<a id="criticos-dado-3d-e-layout"></a>

## Críticos na mesa, vibração, dado 3D e acabamentos (10 de outubro de 2026)

Terceira leva do dia:

- **20 e 1 naturais na mesa** ([destaqueDaMesa.ts](../../src/pages/Sessao/destaqueDaMesa.ts),
  [AvisoDeDestaque.tsx](../../src/pages/Sessao/components/AvisoDeDestaque.tsx)): o servidor publica `destaque_mesa` no canal ao vivo
  (ver [Integração](INTEGRACAO.md#destaque-da-mesa)) e a Sessão mostra a faixa "20 natural" ou "1 natural" com quem rolou e o título da
  rolagem, para todos os papéis. O 20 natural já avisava a mesa pelo painel de avisos e pelo Discord; o 1 natural é novo e só aparece
  nesta faixa (sem aviso gravado). Quem rolou já viu o próprio dado, então não ganha o som nem a vibração de novo. Interruptor
  "20 e 1 naturais da mesa" em Preferências (`destaquesDaMesa`).
- **Vibração** ([vibracao.ts](../../src/utils/vibracao.ts), [vibracaoDoApp.ts](../../src/utils/vibracaoDoApp.ts)): um só lugar para os
  padrões (`toque`, `critico`, `falha`, `dano`, `suaVez`) e o interruptor "Vibração" (`vibracao`). Vibra no pouso do dado (padrão
  conforme o 20 ou o 1), na faixa do destaque, quando um personagem da própria pessoa perde Vida entre duas leituras da Sessão
  (`houveDanoNosMeus`, só com número dos dois lados) e na "sua vez". O Modo mesa e o aviso de "sua vez" passaram a usar o mesmo
  módulo, então o interruptor vale para todos. Sem suporte (desktop, iOS) nada acontece; o Chrome do Android só deixa vibrar depois
  do primeiro toque na página.
- **Dado 3D** ([cenaDados.ts](../../src/components/dados/cenaDados.ts), [rolagem.css](../../src/components/dados/rolagem.css)): o fundo
  do overlay ficou mais escuro e desfocado (`backdrop-filter`, sem o desfoque no modo de desempenho), porque o resultado e a ficha por
  baixo se misturavam com os dados. O 20 natural entra em câmera lenta na reta final (`escalaDoTempo`, o tempo da cena corre à parte do
  relógio), a câmera aproxima ao pousar e a tela pisca em dourado; o 1 natural pisca em vermelho. Movimento reduzido apaga os piscares.
- **Acabamentos**: a Home usa cinco colunas a partir de 1240 px, seis colunas (três em cima, dois dividindo a fileira de baixo) de 1024
  a 1239 px e duas (o último cartão ocupa a fileira inteira) de 520 a 1023 px, em vez de sobrar um cartão sozinho; no celular o
  cabeçalho da Home ficou mais compacto; e o rótulo "Campanha" do menu de baixo deixou de ser cortado (fonte e folgas ajustadas, e
  abaixo de 340 px ele vira "Mesa").

Verificação: `npx tsc -b`, os testes novos (destaque, vibração, dano nos meus, câmera lenta, e 5 de banco para o evento) e capturas num
Chrome de verdade: o dado de 20 natural e de 1 natural sobre a lista de fichas, a faixa na Sessão e a Home a 1280, 1100, 800, 390, 360 e
320 px (conferindo 5 cartões na fileira e nenhum rótulo cortado). **Não visto:** a vibração em si (precisa de celular) e a faixa chegando
pelo canal ao vivo vinda de uma rolagem real de outra pessoa; o evento foi testado no servidor e a faixa foi disparada pelo store.

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
| Chunk de base (9/10/2026) | O build estava puxando Three.js e drei na entrada de todas as páginas: o Rollup pôs React, Zustand e o helper de preload do Vite dentro do primeiro chunk 3D que os importava, e o `index.html` passou a pré-carregar cerca de 1,2 MB de JS 3D (330 KB comprimidos) até no login. `manualChunks` em [vite.config.ts](../../vite.config.ts) agora manda esses módulos para `vendor-base`. Medido com `vite preview` (Chromium, sem limitação de rede) na Home: de 481 KB para 179 KB de JS na rede, e `vendor-three` só baixa quando o dado 3D ou o Mundo abrem. Se alguém mexer nas regras de chunk, conferir o `modulepreload` do `dist/index.html`: só `vendor-base` deve aparecer. |
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
