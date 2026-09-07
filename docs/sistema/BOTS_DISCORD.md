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
