# Bots e sistemas do Discord

Consolidado em **7 de setembro de 2026**. Reúne auditoria e plano de evolução
dos bots, plano de Cofre/roubo e guia do Salão do Banco Lunar. Os detalhes
originais de propostas e alternativas ficam no [histórico](../HISTORICO.md#bots).

Configuração, instalação e inventário operacional pertencem aos READMEs de
[Banqueiro](../../bots/banqueiro/README.md),
[Jornalista](../../bots/jornalista/README.md) e
[Gerente](../../bots/Gerente/README.md). Este documento concentra decisões,
limites e evolução, sem manter outra lista completa de comandos dos três bots.

## Responsabilidades

| Componente | Responsabilidade |
| --- | --- |
| Banqueiro | Carteira, Cofre, comércio e custódia, crédito, investimentos, roubo e jogos do Salão. |
| Jornalista | Publicações, avisos, resumo semanal, eventos e ciclos econômicos que lhe são atribuídos. |
| Gerente | Consulta e assistência a partir das fontes permitidas ao bot. |
| Plataforma | Conta web, campanha, personagem e APIs de integração. Cofre da conta e inventário da ficha são modelos distintos. |

<a id="decisoes-de-arquitetura-preservadas"></a>

## Decisões de arquitetura preservadas

As oito decisões B3 foram registradas como aprovadas em **12/08/2026**. Foram
reunidas aqui uma vez, sem repetir perguntas e alternativas já rejeitadas:

1. Comércio com dinheiro, troca, leilão ou mercado exige vínculo dos dois
   lados. A exceção projetada `/dar_item_local` é uma doação sem dinheiro entre
   duas contas em modo legado; não abre comércio completo sem vínculo.
2. A transação comercial opera na conta/Cofre; personagem é contexto narrativo.
   Isso não elimina `saldos_personagem` e `inventario_personagem`, usados por
   outros fluxos, como transferência manual para a ficha.
3. Itens comuns continuam empilhados por `item_id`. O plano prevê UUID de
   instância para itens modificados, sem impor UUID a todo consumível/material.
4. Recompra automática planejada exige preço curado e vendabilidade explícita.
   Não há percentual global de fallback nessa decisão. O Mestre atende casos
   sem preço automático; itens modificados não entram na recompra automática.
5. IA pode redigir rascunhos apenas para tipos de evento configurados:
   evento estruturado → fatos conhecidos → rascunho → pauta → revisão humana
   → publicação. IA não é fonte de fatos nem publica sozinha; identificadores
   de conta/Discord não devem compor o envio ao provedor.
6. Resumo semanal ligado por padrão, com opção de desativação pelo Mestre.
7. Generalização de `AcaoReativaView` só deve ser considerada após um segundo
   caso concreto, como fuga/perseguição. Não extrair uma abstração apenas do roubo.
8. Um personagem ativo por jogador/campanha é a premissa de design do plano,
   não uma afirmação de unicidade imposta pelo schema. Se a demanda mudar,
   reavaliar o modelo de comércio junto dela.

As decisões 1–5 incluem recursos planejados; aprovação arquitetural não
comprova implementação. A tabela seguinte explicita essa diferença.

<a id="estado-do-plano-de-evolucao"></a>

## Estado do plano de evolução

| Fase | Registro anterior | Situação documental após a conferência |
| --- | --- | --- |
| B1 — correções técnicas | Concluída em 12/08. | Preservar o fechamento de código morto, tratamento de permissão e fuso da loteria. O parágrafo antigo que dizia “B1 não iniciada” contradizia as próprias seções de execução e foi descartado. |
| B2 — melhorias rápidas | Resumo semanal, fila de avisos, `/banco_status`, DMs de trocas e aviso de `/abrir_todos` entregues. Enigmas constavam como bloqueados por trabalho concorrente. | Enigmas temáticos já estão em `core/enigmas.py`, com testes de categorias/dificuldades. O bloqueio circunstancial antigo não é pendência atual; isso não equivale a repetir toda a homologação da B2. |
| B3 — arquitetura | Decisões aprovadas. | Mantidas na seção anterior, sem reabrir alternativas rejeitadas. |
| B4 — mercado persistente/recompra | Planejada. | Os identificadores propostos `mercado_listagens`, `/dar_item_local` e `/mestre_comprar_item` não foram encontrados no código Python examinado. Não anunciar essa fase como entregue. Os leilões e trocas existentes não comprovam um mercado persistente novo. |
| B5 — segundo caso de ação reativa | Planejada. | Há roubo com defesa privada, abordagens, Calor e preparos. Isso não comprova a entrega de fuga/perseguição nem da abstração proposta. |
| B6 — barramento de eventos e redação | Planejada. | O nome proposto `eventos_campanha` não foi encontrado no código examinado. Filas e automações já existentes não comprovam esse novo barramento. |
| B7 — sistemas maiores | Ideias, sem fase concreta definida. | Facções econômicas, tribunal, bolsa e demais expansões precisam de escopo próprio. Não são correções em atraso. |

Fontes conferidas: [enigmas.py](../../bots/jornalista/core/enigmas.py),
[test_enigmas.py](../../bots/jornalista/tests/test_enigmas.py),
[jornal.py](../../bots/jornalista/cogs/jornal.py),
[publicacoes.py](../../bots/jornalista/core/publicacoes.py) e
[economia.py do cog](../../bots/banqueiro/cogs/economia.py).

<a id="ordem-e-criterios-das-fases-futuras"></a>

### Ordem e critérios das fases futuras

- **B4:** listar, comprar, cancelar e expirar com custódia e transação;
  provar concorrência, idempotência e ausência de duplicação. A recompra curada
  e a operação administrativa podem ser implementadas separadamente.
- **B5:** validar um segundo fluxo reativo concreto antes de extrair uma base
  comum. Não confundir reuso de componentes com aprovação de uma nova regra.
- **B6:** definir schema/payload de eventos, pontos de escrita, consumo e
  configuração de redação por tipo. Aprovação do mecanismo de IA não escolheu
  a lista exata de eventos. Essa fase não depende necessariamente de B4/B5.
- **B7:** selecionar uma proposta após experiência com as fases anteriores;
  as listas de ideias antigas continuam disponíveis no histórico.

### Riscos antigos para revalidar antes de expandir

Estes são itens de acompanhamento da auditoria, **não falhas novamente
reproduzidas nesta organização**:

| IDs antigos | Questão e gatilho |
| --- | --- |
| P2, P3, P21 | Atomicidade entre custódia e item, leilões legados e mistura com baús legados. Revalidar antes de ampliar comércio. |
| P7 | Reset econômico escrevendo em tabelas compartilhadas. Rever concorrência e auditoria antes de mudanças nesse fluxo. |
| P8, P9, P15 | Nomenclatura de crédito/reputação, concentração em `db.py` e código possivelmente órfão. Conferir o código atual antes de refatorar. |
| P11 | Watchdog entre venda de bilhete e sorteio pelo Jornalista. Reavaliar ao integrar novos eventos. |
| P12 | Autorização de proprietário nos endpoints internos de personagem. Reavaliar antes de introduzir novos consumidores, especialmente comércio por personagem. |
| P13 | Localização do JSON de tiers no pacote. Empacotamento precisa incluir a fonte; não concluir falha de produção apenas pela hipótese do relatório. |
| P17, P18 | Distinção de raridade de baú/item e cobertura de boas-vindas. Verificar contratos e testes atuais antes de criar outra representação. |
| P19, P20 | Identidade de instâncias e conta versus personagem. Encaminhados nas decisões de arquitetura; não duplicar como questões sem decisão. |

P10 (“ajuda sem teste”) foi retirado pela própria auditoria: o teste já existia.
P14 (avisos fora da fila) foi encerrado pela B2. O plano também registrou falta
de throttle para DMs como risco de volume, separado da existência do opt-in.

## O que mudou nos bots depois da consolidação

Mudanças registradas no Git depois de 7 de setembro. Os READMEs de cada bot têm
os comandos; aqui ficam só os fatos que afetam decisões.

- **16/09, reputação e conquistas.** O Banqueiro concede reputação por comando e
  por mensagem (intervalo guardado em `reputacao_mensagens`) e passou a gravar
  débito, entrega e extrato na mesma transação em lavanderia, contratos e Mercado
  Negro. O Jornalista ganhou conquistas com cargos e cooldown de furos.
- **21/09, avisos por categoria.** A plataforma marca o aviso como `sessao` ou
  `liberacao` ao enfileirar (`avisos_pendentes.categoria`) e o Jornalista publica
  no canal definido por `/jornal canal`. Aviso sem categoria continua indo ao
  canal de dinheiro, sujeito ao interruptor de avisos econômicos.
- **04/10, manchete de lenda.** Quando uma lenda do Bestiário cai na Sessão, a plataforma enfileira a
  manchete como aviso `manchete` (categoria `noticia`, ligado por padrão no painel de avisos do Mestre).
  O Jornalista não mudou: ele já publica a fila e usa o canal definido em `/jornal canal` para Notícia.
  Sem servidor do Discord vinculado à campanha, nada é enfileirado.
- **04/10, mercadoria quente e encomendas.** O doleiro (`/mercado_negro_vender`) passou a usar sempre
  o câmbio padrão. O Mestre marca com `/mestre_mercadoria_quente` as unidades de um item que são de
  procedência suja (tabela `mercadoria_quente`); vender ao doleiro soma 4 de Calor por unidade quente
  (na mesma transação do pagamento) e ele recusa mercadoria quente de quem já está com 90 de Calor.
  `/mestre_calor` e `/mestre_ver` agora usam o máximo real de 100 (antes o limite era 10). Nasceram também
  as encomendas: `/mercado_negro_encomendar`, `/mercado_negro_encomendas` e
  `/mercado_negro_encomenda_cancelar`. O pagamento é em Créditos Sombrios na hora (ágio de 50% sobre o
  valor do item, no máximo 3 pendentes, 10 por pedido), a entrega vem de um ciclo de 5 minutos
  (12, 24, 48 ou 96 horas conforme o valor), o aviso sai pela fila `avisos_pendentes` e cancelar devolve
  80%. Não se encomenda monstro, imóvel, fruto, implante nem relíquia.
  O débito vem antes da contagem de pendentes (o saldo trava a linha, então pedidos simultâneos não furam o limite
  de 3), e na largada o bot devolve à fila qualquer encomenda que uma queda deixou em `entregando` (a chave de
  idempotência impede item duplicado). **O Banqueiro está com 96 de 100 comandos de barra** (o limite global do
  Discord); `test_cabe_nos_limites_de_comandos_do_discord` trava o teto, então comando novo precisa de um
  grupo ou da saída de outro. Os dois ZIPs, do Banqueiro e do
  Jornalista, não precisam de nada novo além do Banqueiro.
- **04/10, revisão do Jornalista.** Correções achadas por revisão e reproduzidas contra um PostgreSQL de
  teste (`tests/test_revisao_2026_10.py`): `ciclo_guild_devido` ganhou folga de 15 minutos
  (`CICLO_TOLERANCIA`), porque o carimbo vinha depois do envio e o ciclo de 24h virava 25h; o horóscopo passou
  a ser decidido por data de São Paulo e expira em 36h; o `UPDATE` que reescrevia a janela dos baús para 0h-23h
  saiu do schema (rodava a cada boot); Créditos Sombrios entram na transação que fecha a entrega e no caminho
  legado; o agendador por rolagem solta (média de 2 por dia, com rajadas de 7) foi trocado pelas faixas dos Baús v2
  (ver abaixo); a loteria é recuperada por até 24h se o bot estiver fora às 18h de domingo; `/vender_furo` e
  `/anunciar_classificado` passaram de Solares para Lunaris (1 Solar vale 100 Lunaris: o furo pagava de 5.000
  a 15.000 Lunaris), com aviso por DM à vítima e interruptores `fofocas` e `classificados`. **O Banqueiro tem
  o mesmo `ciclo_guild_devido`, sem a folga, e ainda precisa do mesmo conserto** (juros e demais ciclos
  derivam 1h por período). Só o ZIP do Jornalista precisa de redeploy por estas mudanças.
- **04/10, Baús v2** (só o ZIP do Jornalista). `baus_por_dia` (padrão 4) divide a janela em faixas e sorteia um
  horário por faixa (`agendar_proximo_bau`). Comum e Incomum viram baús **coletivos**: o estado em `baus_no_ar`
  guarda os parâmetros (`premio.coletivo`) e cada pessoa recebe um prêmio sorteado na hora, gravado em
  `baus_entregas` com a chave composta `mensagem:usuario` (o recovery e o `/bau_reprocessar` aceitam essa chave).
  Do Raro para cima segue a corrida do enigma. Tabelas novas: `baus_historico`, `baus_sorte`, `baus_tentativas`,
  `baus_mural` (já no backup da plataforma). Proteção de azar do servidor (8 baús fracos seguidos viram Raro) e
  Pistas de Sorte por pessoa. Comandos novos: `/bau_mural` e `/baus_hoje`; `/bau_config` ganhou `baus_por_dia`.
  Ficou para as próximas fases: Chaves vendidas pelo Banqueiro e coleção das Dez Árvores.
- **04/10, painéis `/banco` e `/jardim`** (os dois ZIPs). `core/painel.py` é um framework idêntico nos dois
  bots (copiado de propósito): um `PainelView` com menu de seções e botões, e uma `InteracaoPainel` que
  repassa a cada comando existente uma interação-proxy que troca "enviar mensagem" por "editar o painel", então
  nenhuma tela foi duplicada. O clique é confirmado antes de consultar o banco (adeus "Algo deu errado" por
  lentidão). `/banco` fica em `bots/banqueiro/cogs/painel.py` (97 de 100 comandos); `/jardim` e
  `/jornal evento criar|listar|encerrar` no Jornalista. Tabela nova compartilhada `jardim_eventos` (criada pelos
  dois bots, escrita pelo Jornalista, no backup da plataforma). Nada foi aposentado ainda; os comandos de
  consulta do Banqueiro que o painel cobre são os candidatos quando faltar vaga.
- **04/10, Chaves do Jardim** (os dois ZIPs). Tabela compartilhada `jardim_chaves` (quantidade e `auto_usar` por
  pessoa). O Banqueiro vende pela seção Chaves do `/banco` (`comprar_chaves`: débito, estoque e extrato numa
  transação; `CHAVE_PRECO` 40 e `CHAVES_MAX` 10 em `core/economia.py`, e o limite também em `core/loot.py` do
  Jornalista, mantenha iguais). O Jornalista gasta uma no baú Incomum ou melhor (`_usar_chave`, devolvida em
  qualquer falha ou corrida perdida) e dá de brinde (`_sorteou_chave`). Ajuste de equilíbrio sem tocar em
  código além destas constantes: preço, `CHAVE_BONUS_LUNARIS` e `CHANCE_CHAVE_COLETIVO`. Ficou para a próxima
  fase a coleção das Dez Árvores.
- **09/10, coleção das Dez Árvores** (só o ZIP do Jornalista, que passa a levar `data/colecao_arvores.json`;
  o `tools/build-discloud-packages.ps1` já o copia). Fragmentos nos baús (`jardim_fragmentos`, 3 por página),
  uma camada de lore revelada por fragmento (atmosfera, tese e primeiro parágrafo da história, tudo de
  `cronicas-arvores.json` via `tools/gerar-colecao-arvores.py`), Afinidade de +10% de Lunaris para quem tem a
  página e o cargo da Árvore, e o título secreto Cronista das Dez Árvores. Constantes em `core/colecao.py`
  (`FRAGMENTOS_POR_PAGINA`, `CHANCE_FRAGMENTO_COLETIVO`, `FRAGMENTOS_NA_CORRIDA`, `AFINIDADE_BONUS`). O
  Abismo (O Vazio) entra como décima página porque o registro do bot trata as dez como Árvores, embora a lore
  diga que ele é o espaço entre elas.
- **09/10, Cofre do Jardim** (os dois ZIPs). Meta coletiva: o Mestre abre pelo Jornalista (`/jornal meta`,
  tabela `jardim_metas`, uma aberta por servidor por índice parcial) e a mesa doa pelo Banqueiro (`doar_meta`:
  `FOR UPDATE` na meta, doação limitada ao que falta, débito, extrato e fechamento na mesma transação). Ao
  bater a meta o próprio Banqueiro abre o evento `festival` com `efeito='baus_especiais'` (lido por
  `festival_ativo` no `_dropar` do Jornalista) e enfileira o aviso em `avisos_pendentes` com
  `categoria='noticia'` (coluna criada também pelo Banqueiro). Prazo vencido ou cancelamento: o
  `ciclo_metas` (5 min) chama `encerrar_meta_com_reembolso`, que devolve cada doação uma vez. O menu do
  `/banco` chegou às 25 seções (a de Proteções saiu, o comando `/protecao_ver` continua).
- **09/10, Eventos recorrentes** (Banqueiro; o Jornalista só guarda as chaves de automação). Cog
  `eventos` com loop de 15 min e janelas em `core/eventos.py` (puro): Leilão do Jardim sáb 18h → dom 23h59 e Dia
  de Bolsa qua 12h → qui 11h59, fuso America/Sao_Paulo. A trava é `ciclos_guild` com chave por semana ISO
  (`reivindicar_ciclo_unico`, devolvida em falha). Leilão da casa: `vendedor_id='jardim'`, `modo_posse='casa'`;
  `liquidar_leilao_com_custodia` não credita ninguém nesse modo (ralo) e `_entregar_posse` entrega pelo
  `Inventario.dar`. Dia de Bolsa grava `jardim_eventos` (`tipo='mercado'`, `efeito` em `bolsa_alta`,
  `bolsa_baixa`, `cambio_livre`), lido por `humor_bolsa_ativo` em `_maturar` e `/cambio`. O Banqueiro passou a
  criar `jornal_automacoes` e `canais_jornal` (idênticas às do Jornalista). `LeilaoLanceButton` é
  `DynamicItem` (`leilao_lance:{id}`): o botão de lance persiste entre reinícios.
- **09/10, As sete ideias do Jornalista** (ZIPs do Jornalista e da plataforma; o do Banqueiro não muda):
  1) entrevistas com 48+8 perguntas, sem repetir as últimas 20 e com pergunta de Árvore pelo cargo registrado;
  2) classificados com categoria, validade de 7 dias e botão Responder (`DynamicItem`
  `classificado_resp:{id}`; a publicação da fila anexa a view quando o payload tem `classificado_id`);
  3) furo escrito pelo jogador, com botões Subornar/Desmentir na DM da vítima (`furo_subornar:{id}`,
  `furo_desmentir:{id}`) e `/jornal furo listar|vetar` para o Mestre (colunas `autor_id`, `desmentida`, status `vetada`);
  4) Mural de Procurados fixo (`mural_procurados`, lê a tabela `recompensa` do Banqueiro, que o Jornalista passou a
  declarar); 5) edição semanal de domingo 19h montada por `core/edicao.py`; 6) destaques da mesa: a plataforma
  enfileira em `avisos_pendentes` (categoria `noticia`) quando um jogador sobe de nível (`routers/characters.py`) ou
  ganha um selo público (`core/conquistas.py`, nunca secreto nem de nível), com os tipos `nivel` e `selo` em
  `campanha_agenda.avisos` (o Mestre liga e desliga no Quadro); 7) ranking mensal de caçadores no mural dos baús.
  Morte de personagem não ganhou destaque: a plataforma não tem um sinal estruturado de morte.
  Tabelas novas `classificados`, `classificado_respostas` e `mural_procurados` entraram no backup (junto com
  `fofocas`, que faltava).
- **09/10, Revisão geral** (os três ZIPs). Dois revisores independentes leram o código novo; o que foi corrigido:
  descrição de `/mercado_negro_encomendar` com 101 caracteres (o Discord recusaria o `tree.sync` inteiro; um teste
  de contrato agora cobra os limites de nome, descrição, opções, escolhas e 8000 caracteres por comando nos dois
  bots); leilão da casa sem implante em Créditos Sombrios e sem item acima de ☾ 2.400 (`LEILAO_PRECO_MAXIMO`);
  `/ranking leilao` sem a "Casa do Jardim"; lance recusado depois do `expira_em`; entrega da casa cai no
  inventário local em qualquer erro; reset da economia cancela a meta aberta, marca as doações como devolvidas
  e zera as Chaves (antes o Jornalista "reembolsaria" dinheiro zerado); Dia de Bolsa e aviso na mesma transação;
  início do `/banco` corta linhas inteiras e prioriza eventos e leilão; botões Guardar/Sacar/Bilhetes respondem em
  privado (`InteracaoEfemera` em `core/painel.py`, igual nos dois bots); `ler_inteiro` recusa "50,5" em vez de
  virar 505; links, convites e domínios soltos barrados em classificados, recados e furos (`core/furos.py::limpar_texto`);
  `conceder_chave` soma no banco; classificado que esgota as 12 tentativas de publicação é reembolsado; edição
  semanal por semana de São Paulo e gate de 144h; destaques da mesa sem selos comuns, sem o selo da Deidade
  (spoiler de lore) e com cada nível anunciado uma vez só e nunca acima do 60 (tabela `personagem_nivel_anunciado`,
  migração 53). Backup ganhou `jornal_publicacoes`, `jornal_automacoes`, `jornal_pautas` e `ciclos_guild`.
  Conhecido e deixado: o humor da Bolsa vale no momento em que o ciclo de maturação roda (de hora em hora), não na
  hora exata do vencimento; com `cambio_livre` e câmbio automático ligado, manipular a taxa fica uns 2% mais barato.
- **09/10, Segunda revisão (entrevistas, ajuda e testes de comando).** Entrevista com preview e botões
  Publicar/Reescrever (`entrevista_ok:{id}`, `entrevista_refazer:{id}`, coluna `entrevistas.rascunho`) e
  `_nova_entrevista` à prova de erro de DM. `/ajuda` com guia em prosa e filtro por permissão nos dois bots; a
  categoria Mestre do Banqueiro tinha 33 campos (limite 25 do Discord) e foi dividida. Um teste de fumaça chamou o
  callback dos 68 comandos do Jornalista e dos 114 do Banqueiro com argumentos mínimos: nenhuma exceção; só
  `/resetjogador` e `/catalogo_republicar` ficam esperando a confirmação por botão, como projetado.
- **Barista descontinuado.** Dados e música saíram do conjunto; os três bots
  vivos são Banqueiro, Jornalista e Gerente.
- **Catálogo da Loja.** O Banqueiro lê `data/loja/catalogo.json` (1.225 entradas em
  3 de outubro, todas carregadas sem erro). Mudança no catálogo exige reenviar o
  ZIP do Banqueiro.
- **Câmbio.** `/cambio` converte Lunaris, Solares e Fragmentos, sempre passando
  por Solares. Em 3 de outubro Créditos Sombrios saíram do câmbio (moeda do
  mercado negro). A lavanderia foi encerrada (os Créditos que estavam lavando
  voltaram à carteira) e a entrada passou a ser `/mercado_negro_vender`, em que
  o doleiro paga Créditos por item do inventário.
- **Fases B4, B5 e B6 continuam não entregues.** Nenhuma das três apareceu no
  código na conferência de 3 de outubro (`mercado_listagens`, `eventos_campanha`
  e a abstração de ação reativa seguem ausentes). Troca e loot entre jogadores no
  site ([Integração](INTEGRACAO.md#troca-de-itens-entre-jogadores)) não são o
  mercado persistente da B4.

## Cofre e roubo

O plano de Cofre mais antigo mistura parâmetros entregues e expansões que
hoje existem parcialmente. O estado conferido em
[economia.py](../../bots/banqueiro/core/economia.py) e no README do Banqueiro é:

- Roubo bem-sucedido da carteira leva 100% dos Lunaris expostos.
- Arrombamento bem-sucedido leva 50% do saldo guardado.
- Segurança máxima conserva chance mínima de arrombamento de 1%.
- Capacidade e segurança usam a fonte compartilhada de
  [tiers](../../data/economia/cofre_seguranca_tiers.json); não manter outra
  tabela de preços neste documento.
- A vítima dispõe de defesa privada por DM. Já existem planejamento,
  abordagens, Calor, preparos e controles de alerta/seguro.

A função econômica preservada é carteira líquida/exposta versus Cofre mais
protegido e com custos próprios. Juros e Investimentos pertencem a
[Balanceamento](BALANCEAMENTO.md#cofre-e-investimentos), sem repetir números aqui.

<a id="o-que-o-plano-antigo-ainda-nao-comprova-como-entregue"></a>

### O que o plano antigo ainda não comprova como entregue

**Tentativa inteiramente privada** não é o mesmo que defesa enviada por DM.
O desenho antigo previa escolher servidor e alvo em comum, executar toda a
tentativa em DM, publicar alerta anônimo no sucesso e manter auditoria privada.
Essa sequência completa não foi confirmada nesta revisão.

**Minigames de arrombamento por nível de segurança** eram uma proposta. O
plano sugeria dificuldade crescente, não uma segunda punição aplicada depois
de um sorteio já perdido. A revisão não transforma sugestões de níveis,
timing ou probabilidades em regras publicadas.

Se esses fluxos forem retomados, preservar seus requisitos:

- Estado e resultado validados no servidor; token de uso único e expiração.
- Cooldown consumido no início e reserva contra tentativas simultâneas.
- Persistência que permita retomada ou liquidação após reinício.
- Transferência, multa e extratos na mesma transação.
- Alternativa acessível, tolerante a latência, sem depender só de cor/reflexo.
- Auditoria e critérios contra abuso por contas alternativas.

Seguro, ferramentas e Calor não devem ser recriados apenas porque apareciam
como “expansões posteriores” no documento antigo: primeiro comparar com o
que já existe. Cofres de grupo, iscas e novos eventos permanecem ideias a
avaliar, sem uma aprovação de implementação implícita.

<a id="salao-do-banco-lunar"></a>

## Salão do Banco Lunar

O Salão do Discord é operado pelo Banqueiro e usa bens fictícios da campanha.
As regras abaixo pertencem a esse módulo; não substituir por elas os parâmetros
do Cassino do Gambler no site, que possui implementação própria.

### Garantias

- Apostas usam Lunaris existentes na carteira; cartão, fatura, empréstimo e
  saldo guardado no Cofre não financiam a rodada.
- Regra, chance, pagamento e bem arriscado aparecem antes da confirmação.
- Limites de volume/perda e pausa voluntária restringem novas apostas.
- Rodadas e liquidações são idempotentes; reinício não pode duplicar pagamento.
- Mandatos contam categorias diferentes; conquistas são cosméticas, sem
  alterar probabilidades ou pagamentos.
- Auditoria pública apresenta agregados, sem identificar jogadores/valores.

### Jogos e comandos

| Comando | Regra documentada |
| --- | --- |
| `/cassino abrir` | Apresenta o Salão. |
| `/cassino dados` | Baixo/alto: 3/6, pagamento 2×. Número: 1/6, pagamento 6×. |
| `/cassino roda_fluxos` | Dez símbolos uniformes; acerto paga 10×. |
| `/cassino sucessao` | Marco de 1 a 13: 6/13 de vitória a 2×, 1/13 de empate a 1×, 6/13 de derrota. |
| `/cassino vaos` | Quatro desvios: bordas 2/16 a 4×, Vãos 8/16 devolvem aposta, centro 6/16 paga zero. |
| `/cassino vinte_um` | Vitória 2×, empate 1×, natural 2,5×; Banqueiro compra até 17. Chance depende das cartas e decisões. |
| `/cassino corrida`, `/cassino corrida_apostar` | Quatro estandartes equiprováveis, evento de seis horas. Rateio integral entre vencedores; sem aposta vencedora, reembolso dos participantes. |
| `/cassino torneio`, `/cassino torneio_entrar` | Pote das Dez Árvores, com chances iguais. Entrada por unidade duplicada comum/incomum; itens únicos, de missão, vinculados ou dependentes do Mestre são recusados. |
| `/cassino contratos`, `/cassino contrato_resgatar`, `/cassino conquistas` | Mandatos semanais e conquistas. |
| `/cassino historico`, `/cassino limites`, `/cassino regras` | Consulta do jogador. |
| `/cassino pausa` | Pausa de 1, 7 ou 30 dias; uma pausa longa não pode ser encurtada por outra chamada. |
| `/cassino auditoria` | Distribuições agregadas de resultados. |
| `/cassino configurar`, `/cassino diagnostico` | Operação privada com permissão Gerenciar Servidor. |

Dados, Roda, Sucessão e Vãos têm retorno teórico de 100% no guia de operação;
isso não é promessa de resultado individual nem uma estatística de produção.

### Aleatoriedade e identidade

O guia registra `secrets.SystemRandom` e testes que enumeram resultados dos
jogos discretos. Isso valida a lógica e a matemática testadas, sem constituir
prova pública de cada sorteio. Commit/reveal ou fonte pública de aleatoriedade
continuam sendo evoluções, não recursos documentados como existentes.

O cenário usa o Banco Lunar e referências oficiais das Árvores. A manutenção
de nomes/lore deve seguir o [guia do editor](../EDITOR_CONTEUDO_CAMPANHA.md),
considerando a base e a publicação pertinente. A menção antiga a ausência de
snapshot não autoriza presumir o conteúdo atual de uma campanha.

<a id="persistencia-e-operacao"></a>

### Persistência e operação

Regras puras: [core/cassino.py](../../bots/banqueiro/core/cassino.py).
Interface: [cogs/cassino.py](../../bots/banqueiro/cogs/cassino.py).
Schema e operações: [core/db.py](../../bots/banqueiro/core/db.py).

| Tabelas | Finalidade |
| --- | --- |
| `cassino_config`, `cassino_jogadores` | Configuração, limites e pausa. |
| `cassino_rodadas` | Aposta, estado, versão, pagamento e resultado. |
| `cassino_corridas`, `cassino_corrida_apostas` | Evento e apostas do rateio. |
| `cassino_contrato_atividades`, `cassino_contrato_resgates` | Progresso semanal e resgate único. |
| `cassino_conquistas` | Desbloqueios cosméticos. |
| `cassino_torneios`, `cassino_torneio_entradas` | Custódia e entrega do Pote. |

Jogos de mesa e 21 são liquidados pelo Banqueiro. A Corrida é liquidada pelo
Jornalista em PostgreSQL e publicada pela fila durável. O Pote fica com o
Banqueiro, cuja fachada conhece o inventário legado e as reservas da plataforma.
A Loteria Dominical também registra crédito, extrato e remoção de bilhetes
na liquidação atômica.

Padrões de `core/cassino.py` conferidos nesta revisão: aposta de 5 a 200
Lunaris, volume diário de 500 e perda líquida diária de 200. São defaults,
não valores consultados na configuração de um servidor em produção.
Calibração de beta pode usar `/cassino diagnostico`, `/cassino auditoria` e
`/economia_diagnostico` para acompanhar atividade e concentração econômica.

<a id="validacao"></a>

## Validação

As contagens B1/B2 dos relatórios antigos são evidência daquela execução, não
resultados atuais. As referências de testes incluem as pastas
[Banqueiro/tests](../../bots/banqueiro/tests/) e
[Jornalista/tests](../../bots/jornalista/tests/): economia, comandos, fila,
enigmas, idempotência, custódia e jogos.

Para testes com banco, usar `TEST_DATABASE_URL` de PostgreSQL descartável e
seguir o [guia de manutenção](../GUIA_MANUTENCAO.md). Não usar produção como
ambiente de teste. A consolidação dos textos não reexecutou as integrações
Discord/PostgreSQL nem homologou as fases futuras.
