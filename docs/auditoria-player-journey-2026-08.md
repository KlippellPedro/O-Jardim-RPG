# Auditoria de Jornada do Jogador — 2026-08

## 1. Objetivo

Validar o produto como um jogador real, do primeiro acesso ao logout e novo login, procurando caminhos quebrados, ações sem efeito, restrições inexplicadas, falhas de permissão, perda de dados e navegação confusa. A descoberta foi concluída antes de qualquer correção.

Pergunta final: um jogador consegue entrar, entender o produto, participar de uma campanha, criar e usar um personagem, comprar e consultar recursos, explorar Mundo e Regras e sair sem encontrar um bloqueio inesperado?

## 2. Metodologia

- Execução manual pela interface no navegador integrado, usando cliques, digitação, voltar, recarregar e menus como um usuário comum.
- Primeira passagem de descoberta sem alterações no código; correções somente após o término dos fluxos.
- Segunda passagem direcionada aos fluxos afetados pelas correções.
- Uso do frontend Vite em `http://127.0.0.1:5173` e da API FastAPI real em `http://127.0.0.1:8080`, com PostgreSQL local.
- Criação de dados reais pela interface: duas contas, uma campanha, dois personagens, itens, convite e sessão.
- Confirmação de persistência por recarregamento, saída e novo login, e não apenas por mensagens da interface.
- Verificação final com TypeScript, build, testes frontend, `git diff --check` e console do navegador.

Uma primeira passagem atingiu um servidor mock de QA que já ocupava a porta 8080. Esse mock aceitava qualquer credencial e devolvia estruturas incompletas, gerando falsos sintomas em campanha, personagem, loja, sessão, cofre e administração. A passagem foi invalidada, o mock foi encerrado e todos os resultados finais abaixo foram obtidos novamente contra a API real. Esses sintomas não foram classificados como defeitos do produto.

## 3. Personas testadas

- **Novo jogador:** conta `jogador.auditoria.20260812@ojardimrpg.com`, inicialmente sem campanha e sem personagem.
- **Jogador experiente:** mesma conta após conhecer a navegação, executando transições rápidas entre campanha, ficha, loja, Mundo, Regras, sessão, configurações e logout.
- **Mestre/criador:** conta `criador.auditoria.20260812@ojardimrpg.com`, criadora da campanha e responsável pelo convite e início da sessão.
- **Administrador:** o papel criador com acesso administrativo configurado pelo bootstrap oficial da API; o painel foi acessado sem contornar permissões.

## 4. Fluxos testados

- Cadastro com dados inválidos e válidos, login, logout e novo login.
- Home, conta, configurações, avisos, campanhas, ficha, loja, cofre, Mundo, Regras e sessão.
- Estado vazio de campanhas e ficha para jogador novo.
- Criação, abertura e reabertura da campanha `Mesa Jornada Player 2026-08`.
- Geração de convite pelo mestre, tentativa com convite inválido e entrada normal do jogador com convite válido.
- Criação completa do personagem `Lírio Real da Jornada`, retorno entre etapas do wizard e reabertura após salvar.
- Edição da ficha: título e atributo, salvamento e confirmação após reload.
- Inventário: criação, visualização, edição, equipar, desequipar, consumo por quantidade, remoção, capacidade/sobrecarga e persistência.
- Loja: catálogo, busca, detalhes, carrinho, aumentar/diminuir quantidade, remover, cancelar checkout, comprar, saldo insuficiente, esvaziar carrinho e conferir o item no inventário.
- Cofre: estado vazio e restrição de vínculo Discord.
- Mundo: visualização da árvore cósmica, instruções, linha do tempo, crônica e retorno.
- Regras: categorias, busca, troca de tópicos, URL, voltar do navegador e retorno a outro tópico.
- Sessão: preparação privada, bloqueio do jogador antes do início, início pelo mestre, personagem próprio, rolagem, histórico, alteração de Mana, reload, novo login e separação dos controles de mestre.
- Avisos: recebimento do aviso de início de sessão, marcar como lido e confirmação após reload.
- Administração: usuários, campanhas e presença da campanha criada.
- Permissões normais de jogador, mestre/criador e administrador.

Não foram forçados estados artificiais de item indisponível, personagem inexistente ou campanha inexistente. Veículos, propriedades, modificações avançadas e transferência de cofre não tiveram pré-condições naturais suficientes para uma operação completa.

## 5. Fluxo completo do jogador

`Cadastro → Login → Home → Campanhas vazias → receber convite → entrar na campanha → Ficha → personagem ainda indisponível para essa conta → Loja → Mundo → Regras → Sessão bloqueada enquanto privada → mestre inicia → Sessão ao vivo → Avisos → Configurações → Logout → Login novamente`

Em paralelo, pela persona criador/mestre, foi executado:

`Cadastro → criar campanha → abrir campanha → criar personagem → editar ficha → inventário → comprar Adaga → conferir inventário → gerar convite → preparar sessão → iniciar sessão → painel do mestre → Administração → Logout/Login`

Resultado: o caminho ponta a ponta não apresentou bloqueio de produto. A diferença entre as duas contas foi preservada: o personagem do criador não apareceu indevidamente para o jogador convidado.

## 6. Problemas encontrados

| ID | Severidade | Área | Fluxo | Problema | Status |
|----|------------|------|-------|----------|--------|
| PJ-001 | P2 | Regras | Regras → tópico A → tópico B → Voltar | A troca de tópico substituía a entrada do histórico; Voltar saía de Regras em vez de retornar ao tópico anterior. | Corrigido e retestado |
| PJ-002 | P4 | Loja | Item → carrinho → checkout | Quantidade unitária era anunciada e exibida como “1 itens”. | Corrigido e retestado |
| PJ-003 | P3 | Autenticação/onboarding | Abrir site → Login/Cadastro | Antes da autenticação, a tela informa pouco sobre o que é O Jardim e qual será o primeiro passo do jogador. | Aberto; melhoria de conteúdo, sem bloqueio |
| PJ-004 | P2 | Sessão/Ficha | Sessão → ficha própria → alterar Mana → voltar/reload | A ficha persistia a nova Mana, mas o participante ativo continuava exibindo o valor anterior no HUD. | Corrigido e retestado |

### PJ-001 — Voltar não retornava ao tópico anterior de Regras

**Severidade:** P2

**Persona:** Jogador

**Fluxo:** Regras → Magia → Perícias → Voltar

**Passos para reproduzir:**

1. Abrir Regras.
2. Abrir o tópico Magia.
3. Abrir o tópico Perícias.
4. Usar o botão Voltar do navegador.

**Resultado esperado:** retornar ao tópico Magia, preservando a área de Regras.

**Resultado encontrado:** o histórico do tópico anterior havia sido substituído e Voltar deixava a página de Regras.

**Impacto para o jogador:** dificulta comparar e estudar regras usando o padrão normal de navegação do navegador.

**Causa provável:** troca de `searchParams` com a opção `replace`, que sobrescrevia a entrada atual do histórico.

**Evidência:** comportamento reproduzido na API real; após a correção, URLs distintas de Magia e Perícias foram registradas e Voltar restaurou Magia e seu conteúdo.

### PJ-002 — Texto incorreto para um item no carrinho

**Severidade:** P4

**Persona:** Jogador

**Fluxo:** Loja → Adaga → Carrinho → Checkout

**Passos para reproduzir:**

1. Adicionar uma Adaga ao carrinho.
2. Abrir o carrinho.
3. Abrir a confirmação de compra.

**Resultado esperado:** “1 item” no controle do carrinho e no resumo.

**Resultado encontrado:** “1 itens”.

**Impacto para o jogador:** inconsistência textual pequena; não impede a compra.

**Causa provável:** plural fixo em vez de texto condicionado à quantidade total.

**Evidência:** reproduzido antes da correção; após o ajuste, o nome acessível do controle passou a ser `Abrir carrinho com 1 item`.

### PJ-003 — Primeiro acesso explica pouco o produto

**Severidade:** P3

**Persona:** Novo jogador

**Fluxo:** Abrir site → Login/Cadastro

**Passos para reproduzir:**

1. Abrir o site sem sessão autenticada.
2. Observar Login e Cadastro sem usar conhecimento prévio do projeto.

**Resultado esperado:** uma explicação curta do que é O Jardim e do que o jogador fará após entrar.

**Resultado encontrado:** a tela prioriza os formulários e o título; a proposta do RPG só fica mais clara depois do login, na Home.

**Impacto para o jogador:** um usuário convidado consegue se cadastrar, mas chega com pouco contexto e pode não saber qual experiência encontrará.

**Causa provável:** conteúdo de onboarding concentrado na área autenticada.

**Evidência:** observação direta das telas de Login/Cadastro e comparação com a Home autenticada, que apresenta fichas, mundo, regras e itens.

### PJ-004 — Recurso salvo na ficha divergia do HUD da sessão

**Severidade:** P2

**Persona:** Jogador

**Fluxo:** Sessão → abrir ficha própria → Mana −1 → Sessão → reload

**Passos para reproduzir:**

1. Entrar em uma sessão ao vivo com um personagem próprio.
2. Abrir a ficha pelo participante da iniciativa.
3. Alterar Mana de 4 para 3 e aguardar `Ficha: salvo`.
4. Retornar à Sessão, recarregar e fazer logout/login.

**Resultado esperado:** ficha e HUD exibem 3/4.

**Resultado encontrado:** a ficha manteve 3/4, mas o HUD continuou em 4/4.

**Impacto para o jogador:** jogador e mestre podem tomar decisões com valores diferentes para o mesmo recurso durante a sessão.

**Causa provável:** a abertura da sessão não inicializava `mana_atual`/`mana_maxima` do participante e o salvamento da ficha não sincronizava Vida/Mana com uma sessão ativa.

**Evidência:** reproduzido contra a API real. Após a correção, uma nova alteração 3 → 2 apareceu como 2/4 no HUD, permaneceu após reload e novo login e voltou a ser inicializada como 2/4 depois de encerrar/recriar a sessão.

## 7. Restrições de gameplay

| Restrição | Motivo | Comportamento observado | Comunicação ao jogador | Resultado |
|-----------|--------|-------------------------|-------------------------|-----------|
| Jogador novo sem campanha | Requer convite ou criação por papel autorizado | Campanhas e Ficha mostram estado vazio; não há criação indevida para jogador | Texto orienta que nenhuma campanha está disponível | Coerente |
| Sessão privada | Mestre ainda está preparando a sessão | Jogador vê “Sessão bloqueada” e não entra nos recursos | Explica que o mestre está preparando e que haverá atualização | Coerente |
| Controles de mestre | Exclusivos de mestre/criador | Jogador não recebe os controles; mestre recebe preparação e início | A visão do jogador informa a separação de papel | Coerente |
| Saldo insuficiente | Compra de 35 LUN com carteira de 15 LUN | Checkout não conclui e carrinho permanece | Mensagem explícita de saldo insuficiente em Lunaris | Coerente |
| Cofre sem Discord | Operações dependem do vínculo com Discord | Cofre permanece vazio e transferência não é oferecida | Mensagem orienta vincular o Discord | Coerente, mas impediu teste de transferência |
| Capacidade do inventário | 14 espaços para o personagem testado | 14,0 é aceito; 14,1 também é permitido como sobrecarga, com penalidade | Exibe “Sobrecarregado: movimento reduzido em 3 m e desvantagem em testes físicos” | Coerente; é limite brando, não bloqueio |
| Personagens por proprietário/campanha | Jogador só deve usar personagens autorizados | Personagem do criador não aparece na conta do jogador convidado | Estado vazio é claro | Coerente |
| Administração e mestre | Dependem do papel | Controles aparecem para criador/admin e ficam ausentes no jogador | Papéis são identificados no menu autorizado | Coerente |

O limiar de carga foi alcançado pelo fluxo normal. Os itens permaneceram presentes após reload e novo login; o sistema comunica a consequência em vez de impedir a ação.

## 8. Problemas de navegação

- O único defeito confirmado foi PJ-001, corrigido.
- Mundo: `Linha do tempo geral → crônica de Gênese → Voltar` retornou corretamente.
- Regras: após a correção, `Magia → Perícias → Voltar` retornou a Magia com URL e conteúdo corretos.
- Campanha e personagem ativos continuaram selecionados após transições e reloads testados.
- O clique direto em nós móveis da árvore cósmica 3D não pôde ser validado com confiabilidade pela automação. A rota alternativa de linha do tempo funcionou; isso foi tratado como limitação de teste, não como defeito.

## 9. Problemas de persistência

PJ-004 foi o único problema novo de consistência/persistência entre superfícies e foi corrigido. Não restou problema de persistência aberto contra a API real.

- Campanha permaneceu após reabertura.
- Personagem permaneceu após reabertura.
- Título `Sentinela da Jornada` e Força 16 permaneceram após reload.
- Item criado e posteriormente editado permaneceu com o novo nome.
- Estado equipado/guardado foi aplicado.
- Adaga comprada apareceu no inventário e o saldo caiu de 20 para 15 LUN.
- Avisos marcados como lidos permaneceram sem badge após reload.
- Sessão, identidade, papel e campanha permaneceram coerentes após logout e novo login.
- Mana 2/4 ficou coerente entre ficha, participante da sessão, reload, novo login e recriação da sessão após a correção.
- Consumo do Elixir (quantidade 3 → 2), remoção da Ração e sobrecarga 14,1/14 permaneceram após reload e novo login.

O carrinho preservou os itens ao fechar e reabrir durante a mesma sessão de uso. Não foi realizado um teste específico de persistência do carrinho após encerrar totalmente a sessão autenticada.

## 10. Problemas de permissões

Nenhuma violação de permissão foi confirmada nos caminhos normais.

- Jogador não viu Administração, Painel do Mestre ou criação de mesa.
- Criador/mestre viu configurações da campanha, convites, início da sessão e Administração.
- Jogador convidado entrou apenas após convite válido; convite inválido foi rejeitado com mensagem compreensível.
- Personagem do criador não ficou disponível para edição pelo jogador.
- Jogador não acessou a sessão enquanto ela estava privada e passou a vê-la quando o mestre iniciou.
- O painel administrativo real abriu Usuários e Campanhas e exibiu a campanha criada.

Não houve tentativa de burlar rotas ou chamar endpoints diretamente, conforme a persona exigida.

## 11. Problemas de UX

- PJ-003 permanece como oportunidade de onboarding antes do login.
- A Home autenticada comunica melhor a proposta: fichas, mundo, regras e itens aparecem como áreas reconhecíveis.
- Estados vazios de campanha, ficha e cofre têm explicação e próximo passo.
- O wizard preservou a escolha de divindade ao voltar uma etapa.
- Compra mostra detalhes, total, cancelamento e confirmação; saldo insuficiente mantém o contexto para correção.
- Para jogador experiente, as áreas principais ficam sempre disponíveis na navegação lateral e não foi encontrado um caminho desnecessariamente longo que bloqueasse a tarefa.
- A árvore cósmica 3D apresenta instruções, mas a interação com alvos em movimento é menos previsível para automação; não há evidência suficiente para afirmar que isso prejudica um usuário humano.
- PJ-003 foi reavaliado e permanece P3: o formulário é operacional e a Home explica o produto depois do login; uma frase curta poderia ajudar, mas implementar conteúdo sem decisão editorial adicionaria ruído e fugiria do fechamento de lacunas.

## 12. Correções realizadas

1. **PJ-001 — histórico de Regras:** a troca de tópico passou a criar uma entrada de histórico, permitindo retornar ao tópico anterior com Voltar.
2. **PJ-002 — singular/plural da Loja:** a quantidade total do carrinho passou a alimentar o nome acessível, badge, resumo de checkout e contagem de ofertas com singular/plural correto.
3. **PJ-004 — recursos da Sessão:** participantes criados pela sessão agora recebem Mana atual/máxima da ficha; salvar a ficha sincroniza Vida/Mana com o participante ativo, incrementa a versão da sessão e publica atualização ao vivo.

PJ-003 não foi alterado porque é uma decisão de conteúdo/onboarding P3 e não um caminho quebrado. Uma mudança sem definição de mensagem e público poderia deslocar o escopo para redesign.

## 13. Regressão pós-correção

| Verificação | Resultado |
|-------------|-----------|
| Regras: Magia → Perícias → Voltar | Passou; retornou a Magia com URL e conteúdo corretos |
| Loja: um item no carrinho | Passou; `Abrir carrinho com 1 item` |
| Sessão: Mana da ficha 3 → 2 | Passou; HUD mudou para 2/4 e manteve o valor após reload e novo login |
| Sessão: encerrar/recriar com Mana 2/4 | Passou; novo participante iniciou em 2/4 |
| Integração Mana/Sessão com PostgreSQL real | Passou: 11 testes, 0 falhas |
| Console após os fluxos reais e regressões | 0 erros e 0 avisos |
| `npx tsc -b --pretty false` | Passou |
| `npm run test:frontend` | Passou: 195 testes, 0 falhas |
| `npm run build` | Passou: 2.690 módulos transformados |
| `git diff --check` | Passou sem erro de whitespace; houve somente aviso de futura conversão CRLF/LF em arquivo preexistente |

## 14. Limitações

- **Dispositivo:** execução apenas no navegador integrado em desktop. Responsividade, touch e acessibilidade não foram re-auditados por estarem fora do escopo.
- **Backend:** a conclusão usa a API real. A primeira passagem contra um mock incompleto foi descartada e não sustenta nenhum achado.
- **Confirmação nativa:** a automação continuou intermitente quando o clique aguardava o `window.confirm`, mas a tentativa controlada conseguiu concluir a remoção; o item permaneceu ausente após reload. Não foi reproduzido defeito do produto.
- **Mundo 3D:** não foi possível selecionar de modo confiável um nó orbital em movimento pela automação. Linha do tempo, crônica, detalhes e retorno foram testados.
- **Cofre:** o fluxo web gerou legitimamente um código temporário e orientou usar `/vincular` no Banqueiro. A conclusão exige conta Discord e bot operacional fora da plataforma; guardar, retirar e transferir não puderam ser executados sem contornar o requisito.
- **Sessão:** personagem próprio, rolagem e recurso foram testados. Não há controle de chat na interface atual, portanto não houve operação de chat a executar. O inventário não apresenta ação separada “Usar”; consumo manual é representado pela redução de quantidade.
- **Catálogo avançado:** a carteira tinha 20 LUN; os menores preços exibidos foram 25 LUN para modificação, 700 LUN para propriedade e 1.500 LUN para veículo completo. Não houve compra porque financiar artificialmente a conta ou gerar gasto irreversível violaria o critério de segurança.
- **Inventário:** consumo, remoção e sobrecarga foram concluídos. “Usar item” como evento separado não existe na interface atual.
- **Dados de teste:** os registros remanescentes estão detalhados na seção 16. Nada foi apagado automaticamente.

## 15. Estado final

**APROVADO COM PROBLEMAS MENORES**

Resposta à pergunta principal: **sim, nos caminhos efetivamente testados contra a API real**. O jogador consegue cadastrar-se, entrar, compreender as áreas autenticadas, ingressar em campanha por convite, navegar por ficha/loja/Mundo/Regras, acompanhar a abertura de sessão, receber avisos e sair/entrar novamente sem caminho quebrado confirmado. A criação de campanha e personagem, a administração e o controle de sessão funcionaram nos papéis autorizados.

A ressalva é objetiva: cofre com Discord, compras avançadas e clique direto na árvore 3D continuam sem cobertura completa por pré-condições externas ou limitações da automação. Os problemas P2 PJ-001 e PJ-004 foram corrigidos e retestados; permanece apenas PJ-003 como oportunidade média de conteúdo/onboarding.

## 16. Fechamento das lacunas de cobertura

| Área | Situação anterior | Resultado final | Evidência |
|------|-------------------|-----------------|-----------|
| Cofre/Discord | Não testado | Limitação real do ambiente | Código legítimo gerado pela Conta, com expiração de 10 minutos; conclusão exige `/vincular` em uma conta Discord com o Banqueiro operacional. A conta permaneceu não vinculada. |
| Sessão/personagem | Parcial | Testado, problema reproduzido/corrigido | `Íris da Sessão` criada pela conta do jogador; entrada ao vivo, ficha própria, Atletismo `d20+4 = 20`, histórico, Mana 4→3→2, reload, logout/login e recriação da sessão. PJ-004 corrigido. Não existe chat na interface atual. |
| Inventário/limite | Parcial | Testado e aprovado como limite brando | 14,0/14 aceito; 14,1/14 preservado com aviso de sobrecarga e penalidade explícita após reload e novo login. |
| Inventário/consumo | Não testado | Testado e aprovado para quantidade manual | `Elixir de Fechamento` passou de 3 para 2 e persistiu. Não existe ação separada “Usar”. |
| Loja/veículo | Não testado | Limitação segura por saldo | Carteira de 20 LUN; menor veículo completo exibido a 1.500 LUN. Nenhum financiamento artificial ou compra foi feito. |
| Loja/propriedade | Não testado | Limitação segura por saldo | Carteira de 20 LUN; menor propriedade exibida a 700 LUN. Nenhuma compra foi feita. |
| Loja/modificação | Não testado | Limitação segura por saldo | Carteira de 20 LUN; menor modificação exibida a 25 LUN. Nenhuma instalação foi feita. |
| Remoção | Inconclusivo | Testado e aprovado | `Ração de Auditoria` removida pela interface; permaneceu ausente após reload e novo login. A dificuldade anterior era da automação do `window.confirm`. |
| Mundo 3D | Inconclusivo | Não validado pela automação | Novas tentativas visuais normais não abriram um nó móvel de forma confiável. `Linha do Tempo → Gênese → Voltar` funcionou. Não classificado como bug. |

### Auditoria dos dados de teste

- **Contas:** `criador.auditoria.20260812@ojardimrpg.com` e `jogador.auditoria.20260812@ojardimrpg.com`.
- **Campanha:** `Mesa Jornada Player 2026-08`, com os dois usuários como mestre e jogador.
- **Personagens:** `Lírio Real da Jornada` e `Íris da Sessão`.
- **Itens do criador:** Mochila simples, `Espada de Teste Editada` e Adaga comprada; a tentativa anterior de apagar a espada não foi concluída.
- **Itens do jogador:** `Elixir de Fechamento` (quantidade 2), `Carga de Limite` (13,6 espaços) e `Excesso de Limite` (0,1 espaço). `Ração de Auditoria` foi removida no teste controlado.
- **Compras:** uma Adaga por 5 LUN na rodada anterior. Nenhuma compra nova nesta rodada.
- **Veículos, propriedades e modificações:** nenhum registro criado.
- **Outros registros:** sessão ao vivo com dois participantes, registros de início/encerramento e uma rolagem de Atletismo; código temporário de vínculo Discord gerado, sem vínculo concluído; avisos de sessão correspondentes.

Os dados permanecem no banco local para rastreabilidade. Não houve limpeza automática porque a solicitação proíbe exclusão sem verificação/autoridade específica.

---

## 17. Correção e fechamento — 2026-08-13

A rodada posterior de correção e fechamento está registrada em `docs/auditoria-jornada-player-2026-08.md`. Ela preserva este baseline, corrige PJ-003 com onboarding mínimo, define o carrinho como estado transitório da página da Loja e documenta Cofre/Discord, Mundo 3D e compras avançadas conforme as limitações legítimas do ambiente. Não há P1/P2 conhecido aberto ao final dessa rodada.
