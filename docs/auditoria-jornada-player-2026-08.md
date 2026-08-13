# Auditoria de Jornada do Jogador — correção e fechamento — 2026-08

## 1. Baseline e objetivo desta etapa

Esta é a rodada de **correção e fechamento**, não uma nova auditoria de descoberta. O baseline integral permanece preservado em `docs/auditoria-player-journey-2026-08.md`. O nome indicado para este documento não existia no repositório no início da rodada; por isso este arquivo foi criado como caminho canônico do fechamento, sem remover ou reescrever o relatório original.

O escopo ficou restrito a jornada do jogador, gameplay e UX funcionais, navegação, estado, persistência, permissões, feedback de restrições, onboarding e consistência entre telas.

## 2. Classificação das pendências do baseline

| Grupo | Itens | Decisão desta etapa |
|------|-------|---------------------|
| Já corrigidos | PJ-001, PJ-002 e PJ-004 | Manter e regredir |
| Aberto e corrigível | PJ-003 | Corrigir com conteúdo mínimo |
| Comportamento indefinido | Carrinho após reload/logout | Descobrir a intenção no código e validar pela interface |
| Dependência externa | Cofre/Discord/Banqueiro | Não contornar; validar comunicação e testes oficiais disponíveis |
| Limitação da automação | Clique em nós orbitais móveis | Verificar implementação e rota alternativa; não alterar o 3D sem defeito real |
| Pré-condição ausente | Compras avançadas | Validar catálogo, detalhes, preço e bloqueio; não financiar artificialmente |

Não foi encontrado no baseline outro P1/P2 aberto. Também não foi identificada pendência funcional corrigível escondida na seção de limitações.

## 3. Correção realizada nesta etapa

### PJ-003 — onboarding de Login e Cadastro

**Causa raiz:** Login dizia apenas para acessar a conta e Cadastro dizia apenas para juntar-se à mesa. A proposta do produto e o próximo passo só ficavam claros após autenticar.

**Alteração mínima:** os subtítulos de Login e Cadastro agora explicam, em duas frases, que O Jardim permite participar de campanhas de RPG, criar fichas e acessar inventário, loja, Mundo, Regras e sessões; também informam que o próximo passo é escolher uma campanha.

**Arquivos:**

- `src/pages/Auth/Login.tsx`
- `src/pages/Auth/Cadastro.tsx`

Não houve landing page, novo bloco, alteração de fluxo, regra ou redesign.

**Regressão real:** Login e Cadastro exibiram o novo contexto; senha incorreta gerou `email ou senha invalidos`; senhas divergentes no Cadastro geraram `As senhas não coincidem.`; o retorno Cadastro → Login funcionou; login válido voltou para Campanhas.

## 4. Carrinho — comportamento esperado definido

O carrinho atual é um estado React local de `LojaPage` (`useState<CartItem[]>([])`). Não existe carrinho no backend, store persistido, `localStorage` ou `sessionStorage`.

Regra resultante, agora explicitamente documentada:

- fechar e reabrir o drawer enquanto a mesma página da Loja permanece montada conserva o lote;
- trocar comprador ou modo de Loja limpa o lote de propósito;
- recarregar a página descarta o lote;
- logout/login descarta o lote porque a página é desmontada;
- uma compra concluída limpa o lote;
- falha por saldo mantém lote e checkout para correção ou cancelamento.

Validação real: Adaga passou para `1 item`, o checkout exibiu `1 item`, o cancelamento preservou o lote, e reload e logout/login devolveram `Abrir carrinho com 0 itens`.

**Decisão:** MANTER. O comportamento é coerente com a arquitetura de carrinho transitório. Persistência por usuário não foi adicionada.

## 5. Cofre/Discord

Existe fluxo oficial: a plataforma gera código temporário, o usuário executa `/vincular` no Banqueiro e o mestre associa a campanha ao servidor com o comando oficial. Os endpoints e testes de integração cobrem guardar, retirar, transferir e recusar conta sem vínculo.

Não existe um modo oficial de concluir pela interface web sem uma conta Discord, um servidor vinculado e o bot operacional. Nenhum vínculo, token, saldo ou autorização foi fabricado.

A interface atual já comunica corretamente:

> Vincule sua conta Discord para ver o status do seu Cofre bancário.

Também explica que itens e moedas são recebidos no Discord e guardados até a transferência para uma ficha.

**Decisão:** DOCUMENTAR COMO LIMITAÇÃO EXTERNA. Nenhuma alteração de produto era justificável.

## 6. Mundo 3D

A implementação dos nós possui interação em duas etapas: primeiro clique foca a árvore; segundo clique abre os detalhes. A seleção e a crônica usam rotas próprias (`/mundo`, `/mundo/cronologia` e `/mundo/arvores/:id`).

O canvas não fornece nós DOM individuais para a automação, mas há uma alternativa funcional e operável por teclado: **Linha do tempo geral**, que lista botões para as crônicas individuais.

Regressão real: `Mundo → Linha do tempo geral → Gênese` abriu `/mundo/arvores/aethel`, exibiu a crônica e `Voltar às órbitas` retornou a `/mundo`.

**Decisão:** MANTER. A falha de clique confiável no alvo orbital móvel continua sendo limitação da automação, não evidência de bug do produto.

## 7. Compras avançadas

Não houve alteração de saldo nem compra artificial.

Na interface real foi revalidado um veículo completo em promoção, incluindo descrição, ficha, requisitos funcionais, preço original de 5.000 LUN, preço atual de 4.250 LUN e retorno ao carrinho. Com carteira de 20 LUN, a confirmação recebeu `saldo insuficiente em Lunaris`; o checkout e o item permaneceram disponíveis para cancelamento/remoção. Nenhum registro de compra foi criado.

Propriedades e modificações continuam cobertas pela implementação e pelos testes backend relacionados, inclusive aplicação compatível, pré-requisito, criação de propriedade e regras econômicas. A compra ponta a ponta dessas categorias continua sem pré-condição financeira legítima no usuário de auditoria.

**Decisão:** DOCUMENTAR A LIMITAÇÃO DE PRÉ-CONDIÇÃO. Catálogo, detalhes, preços, requisitos e bloqueio estão funcionais; não há defeito confirmado a corrigir.

## 8. Regressões obrigatórias dos achados

| ID | Fluxo | Resultado desta etapa |
|----|-------|-----------------------|
| PJ-001 | Regras → Magia e Fluxo → Perícias → Voltar | Passou. URLs distintas foram criadas e Voltar restaurou `?topico=magia-fluxo`. |
| PJ-002 | Loja → Adaga → Carrinho → Checkout | Passou. Controle e resumo exibiram `1 item`; checkout pôde ser cancelado sem compra. |
| PJ-003 | primeiro acesso, Login, Cadastro e erros | Corrigido e passou na interface real. |
| PJ-004 | Sessão → ficha → Mana 2→3 → Sessão → reload → logout/login | Passou. HUD exibiu 3/4 após todas as transições. Ao terminar, o dado de teste foi restaurado para 2/4 e sincronizado. |

## 9. Jornada e permissões regressadas

### Jogador

Foram reabertos Login, Cadastro, Campanhas, Ficha, Loja/Carrinho, Mundo, Regras, Sessão, Cofre, Configurações, logout e novo login. O usuário jogador permaneceu sem Painel do Mestre e Administração. A campanha, personagem, sessão e recursos permaneceram coerentes.

### Mestre/criador e administrador

Foi reaberta a campanha existente, preservando os dados criados na descoberta. A interface apresentou Nova Mesa, criação de personagem, personagem existente, Painel do Mestre, gerenciamento de convites, membros, configuração da campanha, controles da sessão ao vivo e Administração. A Central de Administração carregou usuários e campanhas com respostas autorizadas.

Não foram criadas outra campanha, outra conta, outro personagem ou convite apenas para repetir dados já comprovados no baseline.

## 10. Persistência, estados e API

- Mana foi alterada de 2/4 para 3/4, persistiu no HUD após reload e logout/login e foi restaurada para 2/4 ao final.
- Carrinho seguiu a regra transitória documentada e ficou vazio ao final.
- Saldo insuficiente retornou `409 Conflict` esperado e foi traduzido em mensagem clara; não houve falha não tratada.
- Login inválido retornou `401 Unauthorized` esperado e foi exibido como alerta.
- Chamadas de contexto, personagens, catálogo, Cofre, sessão, convites e administração concluíram com sucesso nos fluxos autorizados.
- A correção de PJ-003 é somente conteúdo estático e não introduziu requests nem efeitos duplicados.
- Console do navegador: 0 erros e 0 avisos ao final da regressão.

## 11. Verificação técnica

| Verificação | Resultado |
|-------------|-----------|
| `npx tsc -b --pretty false` | Passou |
| `npm run test:frontend` | 195 testes passaram, 0 falhas |
| Testes backend relacionados a Mana, modificações, veículos/propriedades e Cofre | 63 testes e 16 subtestes passaram |
| `npm run build` | Passou; 2.690 módulos transformados |
| Console do navegador | Limpo |
| API real | Sem erro não tratado; apenas 401/409 intencionais dos cenários negativos |
| `git diff --check` | Passou; somente aviso de conversão de fim de linha em arquivo preexistente, sem erro de whitespace |

## 12. Tabela final de fechamento

| Item | Estado | Ação |
|------|--------|------|
| PJ-001 | Corrigido | Mantida a correção do histórico de Regras e regressado o fluxo completo. |
| PJ-002 | Corrigido | Mantido singular/plural pela quantidade total e regressado checkout unitário. |
| PJ-003 | Corrigido nesta etapa | Adicionado contexto curto e próximo passo em Login/Cadastro; erros e retorno foram validados. |
| PJ-004 | Corrigido | Mantida sincronização Ficha/Sessão e validada após reload e logout/login. |
| Carrinho | Definido e correto | Transitório durante a montagem da Loja; descartado em reload e logout/login. |
| Cofre/Discord | Limitação externa justificada | Fluxo e comunicação corretos; operação real exige Discord, servidor e Banqueiro. |
| Mundo 3D | Limitação da automação | Interação implementada; Linha do Tempo é alternativa funcional e rotas/retorno passaram. |
| Compras avançadas | Funcionais dentro da cobertura disponível | Detalhes e saldo insuficiente passaram; compra completa exige saldo legítimo ausente. |
| Outros achados | Nenhum aberto | Nenhuma inconsistência funcional conhecida ficou sem decisão. |

## 13. Estado final e respostas de conclusão

**Estado: APROVADO PARA A PRÓXIMA RODADA DE TESTES REAIS, COM LIMITAÇÕES EXTERNAS DOCUMENTADAS.**

1. **Problemas realmente corrigidos nesta etapa:** PJ-003, com onboarding mínimo em Login e Cadastro.
2. **O que já estava correto e foi apenas regressado:** PJ-001, PJ-002, PJ-004, papéis/permissões, carrinho transitório, Cofre sem vínculo, navegação alternativa do Mundo, bloqueio por saldo e Administração autorizada.
3. **O que continua pendente:** nenhuma correção funcional conhecida dentro do código e do escopo desta etapa.
4. **O que é impossível testar no ambiente atual:** operações reais do Cofre sem Discord/Banqueiro vinculados; compra completa de propriedade, veículo e modificação sem saldo legítimo; clique automatizado confiável em nó orbital móvel.
5. **Existe P1/P2 conhecido aberto?** Não.
6. **A jornada está pronta para testes reais?** Sim, nos caminhos cobertos. A próxima rodada humana deve priorizar o clique direto nos nós 3D, integração Discord real e compras avançadas quando houver uma conta de teste legitimamente financiada.

## 14. Histórico preservado

O relatório de descoberta, evidências detalhadas, dados de teste e causas raízes anteriores continuam em `docs/auditoria-player-journey-2026-08.md`. Esta rodada não apagou nem reclassificou silenciosamente nenhum achado: ela registra a decisão final de cada lacuna e acrescenta a correção PJ-003.
