# Validação Pós-Correção — O Jardim RPG

**Data:** 2026-08-10
**Base:** [auditoria-integracao-sistema-2026-08.md](auditoria-integracao-sistema-2026-08.md) + [implementacao-correcoes-2026-08.md](implementacao-correcoes-2026-08.md)
**Natureza desta etapa:** só verificação. Nenhuma linha de comportamento do sistema foi alterada nesta etapa — as únicas mudanças são testes novos (que não existiam e não alteram nada em produção) e uma entrada de teste adicionada ao `package.json`.
**Método:** cada achado foi reconferido lendo o arquivo/código atual (não o relatório anterior), e os fluxos foram validados por leitura de código linha a linha (tracing manual) mais testes automatizados isolados, já que este ambiente não tem `TEST_DATABASE_URL` nem infraestrutura de teste de componente React — isso está declarado explicitamente onde relevante.

---

## 1. Status geral

**Quase pronto.**

As 16 correções seguem no lugar, verificadas diretamente no código, e nenhuma regride o que existia antes. A suíte inteira passa (fora as falhas que já existiam antes de qualquer correção e as que dependem de banco indisponível neste ambiente). Não é "Sistema pronto" por três motivos concretos, todos descobertos nesta validação, nenhum deles crítico a ponto de considerar o sistema instável:

1. A sincronização automática de Mana (achados 8-9) grava certo no banco, mas **o HUD da sessão ao vivo não se atualiza sozinho** quando a dedução acontece por essa nova via — só quando o mestre edita algo manualmente. É uma lacuna de tempo real, não de dado incorreto.
2. A correção do achado 10 (fonte única do Cofre) resolveu banqueiro↔plataforma, mas descobri **uma terceira cópia hardcoded** da mesma tabela em `bots/jornalista/core/economia.py`, fora do escopo original.
3. Duas decisões de design (Legados novos, preços) continuam pendentes de você — o que é esperado, não é um problema.

Nada disso quebra um fluxo de jogo hoje. São lacunas que valem ser fechadas antes de considerar o assunto definitivamente encerrado.

---

## 2. Correções confirmadas

| Achado | Correção | Funcionando? | Evidência |
|---|---|---|---|
| 1 | Livro público gera Classes/Raças/Legados/Perícias reais | ✅ Sim | `regras-publicas-v1.md` atual: 27 classes, 20 raças, 42 legados, 30 perícias listadas — contadas linha a linha nesta validação, batendo com `classes.json`/`racas.json`/`legados*.json`/`pericias.json` atuais |
| 2 | Livro público mostra as 11 condições oficiais + 6 crises | ✅ Sim | `regras.ts` importa `condicoes.ts` (confirmado); `.md` gerado lista as 11 condições e as 6 crises, incluindo o texto novo do achado 19 |
| 3 | `mestre-v1.json` não afirma mais que habilidades não têm efeito | ✅ Sim | Texto atual afirma o estado real e amarra a afirmação a `progressao_publicada`/`recursos_provisorios`; reconferido que as 27 classes batem com essa afirmação agora |
| 4 | Origem Artesão aplica bônus a perícia personalizada "Ofício" | ✅ Sim, com ressalva | `ajusteOrigem` casa por título normalizado; teste automatizado confirma. Ressalva: só casa se o jogador nomear a perícia **exatamente** "Ofício" (ou variação de acento/caixa) — "Ofício de Ferreiro" ou "Ofícios" não casam. Ver seção 3. |
| 5 | Cartista Arcano conjura desde o nível 1 | ✅ Sim | `progressao_magia.marcos[0].nivel === 1` em `classes.json`; lógica de busca de marco no backend (`character_summary.py`) é genérica e já processa corretamente o novo marco sem mudança de código; teste automatizado cobre todas as classes com magia |
| 6 | Infração de requisito de compra fica visível pra quem comprou | ✅ Sim | `shop.py` inclui `infracoes` na resposta; `catalog` do loop é escopado só aos itens **do pedido atual** (não ao catálogo inteiro — verifiquei isso especificamente, ver seção 12); frontend mostra toast |
| 7 | Caixa do Coração / Chave sem Porta / 4 itens vagos | ✅ Sim, como regra escrita | Texto reescrito confirmado no catálogo atual. Ressalva importante: **nada no código aplica esses limites** — é o mesmo padrão de todo item "equipamento" do sistema (efeito é sempre narrado, nunca mecanicamente aplicado por código). Ver seção 7. |
| 8-9 | Mana e condições sincronizando ficha↔sessão | 🟡 Parcial | Ver seção 3 — a escrita no banco está correta e testada isoladamente, mas o HUD ao vivo não atualiza sozinho pra essa via específica |
| 10 | Fonte única para Cofre/Segurança | 🟡 Parcial | Banqueiro e plataforma comprovadamente leem o mesmo JSON agora (teste `test_espelho_permanece_identico_ao_banqueiro` passa). Mas existe uma terceira cópia em `bots/jornalista/core/economia.py`, fora do escopo original — ver seção 4 |
| 11 | `aplicacao`/`pre_requisitos` de modificação | 🟡 Parcial | Enum validado em `content_seed.py` (testado); `pre_requisitos` tipado nas 15 modificações que têm pré-requisito (testado). Mas `characters.py` (instalar modificação) não lê nenhum dos dois campos — segue sem bloquear nada na instalação, exatamente como documentado como decisão de escopo |
| 12 | Aviso de próximo passo pra veículo/propriedade | ✅ Sim | Toast condicional a `itemEhVeiculoCompleto`/`tipoOrigem === 'propriedade'` confirmado em `LojaPage.tsx` |
| 13 | Legados novos não fingem mais ser revisados | ✅ Sim | `catalogoService.ts` marca `versaoRegras: 'fonte'` pros 6 ids; teste automatizado confirma. Rebalanceamento do texto em si continua pendente (decisão de design) — mas ver seção 5, a necessidade real parece menor do que a auditoria original sugeriu |
| 14 | Raridade normalizada em 461 itens | ✅ Sim | `set(raridades)` no catálogo atual = exatamente 7 valores canônicos, sem variação de caixa/acento |
| 16 | `limites.py` → `rate_limit_auth.py` | ✅ Sim | Arquivo renomeado (`git mv` preservou histórico); os dois pontos de import (`auth.py`, `test_unit.py`) atualizados; suíte de auth passa |
| 18 | Sedenta aplica a condição Sangramento oficial | ✅ Sim | Texto atual cita "condição Sangramento" e reaproveita a regra de empilhamento/remoção — mesma ressalva da seção 7 (é texto, não código) |
| 19 | Nota cruzada Atordoado ↔ Inconsciente | ✅ Sim | Presente nos `efeitos` das duas condições em `condicoes.ts`, propagada corretamente pro `.md` gerado |

---

## 3. Correções parciais (detalhamento)

### Achado 4 — Artesão: exige nome exato
`origemCasaComPericia` compara o título da perícia normalizado (sem acento/caixa) contra a palavra `"oficio"`. Isso cobre "Ofício", "OFÍCIO", "ofício " — mas **não** cobre "Ofício de Ferreiro", "Ofícios" ou qualquer variação com texto extra, porque a comparação é de igualdade exata, não de substring. Um jogador que nomear a perícia de um jeito mais descritivo (comportamento natural, já que o placeholder do formulário sugere "Ex: Forja, Navegação, Etiqueta...") não recebe o bônus e não há nenhum aviso disso na tela. Também confirmei um caso extremo, não crítico: se o jogador criar **duas** perícias personalizadas ambas chamadas "Ofício", as duas recebem o +1 (a função é chamada uma vez por perícia renderizada, então cada uma "casa" independentemente) — impacto desprezível (+1 duplicado), mas é uma inconsistência real.

### Achados 8-9 — Mana e condições: dado certo, tela não atualiza sozinha
Achei isso rastreando o caminho completo do evento, não só a query SQL:

1. `AbaPoderes.tsx` usa um poder → chama `registrosApi.registrarUso` → backend grava o registro e (se o personagem estiver numa sessão ativa) desconta `sessao_participantes.mana_atual` — **confirmado correto por teste isolado** (`test_mana_sessao.py`, 5 casos, todos passando).
2. Ao terminar, o backend chama `live_session.publicar(campanha_id, "registro", 0)`.
3. No frontend, `useSessaoStore.ts` (linha ~197-205) escuta o SSE: quando `payload.tipo === 'registro'`, chama só `fetchRolagens()` (atualiza o log de rolagens/usos). **Não** chama `fetchEstadoSessao()` (que é o que traz `mana_atual`/condições atualizados dos participantes) — esse só é chamado no `else` (qualquer outro tipo de evento, como `participante_atualizado`, disparado quando o **mestre** edita o HUD manualmente).

Ou seja: o dado no banco está certo, e se alguém atualizar a página (ou o mestre editar qualquer outra coisa no HUD, disparando um evento diferente) o valor novo aparece. Mas a atualização não é ao vivo pra esse caminho específico — o mestre olhando o HUD durante o combate não vê o número de Mana do jogador cair sozinho quando ele usa um poder. Continua sendo estritamente melhor que antes (o dado sincroniza, só falta o "ao vivo"), mas não é a "automação segura" completa que o texto da correção anterior deu a entender.

Sobre condições mecânicas (a outra metade do achado 9): a sessão ao vivo continua sem aplicar automaticamente a maior parte dos efeitos — ver seção 6 pra detalhamento condição por condição.

### Achado 10 — terceira cópia em `bots/jornalista`
```
bots/jornalista/core/economia.py:27:COFRE_TIERS: List[Dict] = [
```
131 linhas, com `COFRE_TIERS`, `cofre_por_id`, `capacidade_do_cofre`, `pode_guardar` — um subconjunto da API do Banqueiro, importado por `bots/jornalista/core/catalogo.py`. O comentário no próprio arquivo já dizia "precisa bater com bots/banqueiro/core/economia.py" — ou seja, o risco que motivou o achado 10 já era conhecido por quem escreveu esse comentário, só não tinha sido conectado à mesma correção. Esse arquivo **não foi tocado** na correção original porque a auditoria nunca olhou pra `bots/jornalista`.

### Achado 11 — modificações: dado bom, zero aplicação
Já era a decisão documentada (não implementar validação na instalação), reconfirmada: `characters.py` (rota de instalar/desinstalar modificação) não referencia `aplicacao` nem `pre_requisitos` em nenhuma linha.

---

## 4. Problemas ainda existentes

Só o que ficou confirmado nesta validação, sem repetir o que já está na seção 3 acima:

- **Terceira cópia do Cofre em `bots/jornalista/core/economia.py`** (achado 10, escopo ampliado) — mesma categoria de risco do achado original, nunca corrigida porque nunca foi descoberta antes.
- **HUD da sessão não atualiza ao vivo** quando Mana é descontada via uso de poder (achados 8-9) — só quando algo mais dispara um evento `participante_atualizado`.
- **A maioria dos efeitos mecânicos de condição continua manual**, tanto na ficha quanto na sessão — isso nunca foi prometido como corrigido pelos achados 8-9 (que eram sobre fonte de dados e sincronização, não sobre automação de efeito), mas registro aqui porque a seção 5 do pedido de validação pediu conferência condição por condição — ver seção 6.
- **Nenhum item "equipamento" do catálogo (incluindo os 6 reescritos no achado 7) tem aplicação de efeito em código** — outra vez, nunca foi prometido pela correção (que era sobre o texto da regra, não sobre construir um motor de efeitos de item), mas fica registrado porque foi pedido verificar explicitamente.

---

## 5. Novas regressões

**Nenhuma regressão de comportamento.** A suíte de testes confirma isso (seção 8). As duas coisas mais próximas de "regressão" que encontrei já estavam corrigidas dentro da própria etapa de implementação, antes de qualquer achado ser marcado como concluído (documentado no relatório de implementação, seção "Regressões encontradas") — não são regressões vivas hoje.

O mais perto de uma regressão conceitual que encontrei nesta validação é o item 1 da seção 4 (terceira cópia do Cofre) — mas não é uma regressão **causada** pela correção: é uma instância do mesmo problema que sempre existiu em `jornalista`, só nunca tinha sido descoberta.

Também verifiquei especificamente os cenários de "efeito duplicado" pedidos:
- **Desconto de Mana duplicado?** Não. `_descontar_mana_na_sessao` só roda dentro de `registrar_uso`, chamado uma vez por clique em "usar poder" (confirmado lendo `AbaPoderes.tsx`/`AbaHabilidades.tsx` — o `try` só chama `registrarUso` uma vez, e o `catch` impede a atualização da ficha se a chamada falhar, evitando estado dividido).
- **`versao` da ficha incrementando duas vezes numa mesma requisição?** Sim, isso acontece — se o mestre editar Vida **e** Mana no mesmo salvamento do HUD, duas atualizações `UPDATE personagens ... versao=versao+1` rodam em sequência (uma pro sync de Vida, já existente, outra pro sync de Mana, novo). O resultado final do `ficha` fica correto (a segunda leitura já vê o resultado da primeira, então nada se perde), só o contador de versão sobe 2 em vez de 1. Não é um bug funcional (controle de concorrência otimista continua funcionando: qualquer mudança concorrente já invalidaria o `economia_versao` esperado, subir 1 ou 2 dá no mesmo), mas é uma pequena imprecisão que registro por transparência.
- **Ação registrada mas recurso não descontado?** Só no caso já descrito na seção 3: usar um poder fora de uma sessão ativa registra o uso (log/prova) mas não desconta nada de `sessao_participantes` (não existe participante pra descontar) — isso é o comportamento correto, não um bug.

---

## 6. Condições — verificação condição por condição

| Condição | Ficha tem efeito automático? | Sessão tem efeito automático? | Fonte batendo? |
|---|---|---|---|
| Atordoado | Sim — `−5 Defesa` (`statusService.ts::penalidadeDefesaCondicoes`) | Não (só o texto/nome fica salvo) | Sim, mesmo `id`/nome nos dois lados |
| Inconsciente | Sim — `−5 Defesa` + movimento bloqueado | Não | Sim |
| Sangramento | **Não** — nada aplica 1d6 automaticamente por turno | Não | Sim (nome existe nos dois catálogos, dano é sempre manual) |
| Agarrado | Sim — movimento bloqueado | Não | Sim |
| Cego | **Não** — nenhuma desvantagem automática em teste visual | Não | Sim (existe no catálogo, sem efeito automático em nenhum lado) |
| Imobilizado | Sim — movimento bloqueado | Não | Sim |
| Concentrando | **Não** — nada verifica automaticamente o teste de Vontade ao sofrer dano | Não | Sim |
| Crise (ex.: Fúria) | Parcial — `Fúria`/`crise-furia` soma −2 Defesa; as outras 5 crises não têm nenhum efeito automático | Não | Sim, mesmos ids |

**Duração e remoção:** contadas em turnos, decrementadas automaticamente só no lado da sessão (`condicoes.py::decrementar_condicoes`, chamado ao avançar rodada — não tocado nesta etapa, já existia). A ficha não tem contagem automática de duração — é o jogador/mestre que remove manualmente.

**Nomes consistentes?** Sim — tanto a ficha (`AbaFicha.tsx`) quanto a sessão (`EntityEditor.tsx`, depois da correção do achado 9) usam os mesmos `id`/`titulo` de `condicoes.ts`. Antes da correção, a sessão só tinha texto livre (nomes podiam divergir por digitação); agora as duas telas oferecem os mesmos 11+6 nomes como atalho, embora ambas ainda aceitem texto livre por cima disso — o que é intencional (condição narrativa fora do catálogo continua possível).

**Resumo:** nenhuma condição ficou "puramente visual" que antes tinha efeito (não houve regressão) — mas a cobertura de efeito automático sempre foi parcial (4 de 11 condições oficiais + 1 de 6 crises na ficha; 0 de 11 + 0 de 6 na sessão) e continua exatamente assim. Os achados 8-9 nunca prometeram mudar isso — eram sobre fonte de dados e sincronização de números (Mana/Vida), não sobre motor de efeitos de condição. Registro aqui porque foi pedido verificar explicitamente.

---

## 7. Itens problemáticos — o que a correção realmente garante

Busquei por qualquer referência de código aos ids `caixa-do-coracao` e `chave-sem-porta` em `src/` e `plataforma/`: **zero resultados**. Isso confirma que a correção do achado 7 é inteiramente textual — não existe (e nunca existiu, nem antes da correção) um sistema de "usar item mágico" no código que leia o efeito de um item de `tipo: equipamento` e aplique alguma coisa automaticamente. Isso vale pros ~56 itens dessa categoria inteira, não é uma lacuna introduzida por esta correção.

Então, respondendo diretamente ao que foi pedido verificar:
- **Ainda é possível duplicar item acima da raridade permitida com a Caixa do Coração?** Tecnicamente sim, nada no código impede — só o texto, que agora deixa claro que não deveria. Antes da correção, nem o texto deixava isso claro.
- **Duplicar indefinidamente / manter cópia além do tempo?** Mesma resposta — a regra existe e está clara, a aplicação é 100% responsabilidade de quem conduz a mesa, como todo o resto do sistema de itens narrativos.
- **Chave sem Porta em fechadura mágica/tecnológica/cofre alto nível:** o texto agora exige teste de Ladinagem contra a DT normal — de novo, é o mestre que pede esse teste, não há código gatekeeping.

Isso não é uma falha da correção — é consistente com como **todo** o sistema de itens não-combate deste projeto funciona (nenhum item "equipamento" tem efeito codificado; só armas/armaduras/veículos/monstros têm campos estruturados tipo `dano`/`bonus` que entram em cálculo real). Achei importante deixar isso explícito porque a pergunta 7 do pedido presumia que valeria a pena verificar "se ainda é possível" — e a resposta honesta é que a barreira sempre foi e continua sendo só a mesa, não o software.

Os 4 itens que ganharam número/teste/duração/alcance (Lente Arcana, Relicário de Prata, Olho de Golem, Kit de Aventureiro) foram comparados com os épicos vizinhos (Manto das Sombras etc.) durante a correção original e mantêm o mesmo padrão de redação — reconferido, sem mudança desde então.

---

## 8. Testes realizados (com comparação ao baseline)

| Suíte | Comando | Antes de qualquer correção | Depois da implementação | Depois desta validação |
|---|---|---|---|---|
| TypeScript | `npx tsc -b --force` | — | Sem erros | Sem erros (reconferido) |
| Frontend | `npm run test:frontend` | não medido isoladamente | 190 testes, 188 passaram, 2 falhas pré-existentes | **194 testes, 192 passaram, 2 falhas pré-existentes** (+4 testes novos desta etapa) |
| Geração do livro público | `npm run check:rules-source` | — | OK | OK (reconferido) |
| Plataforma (Python) | `pytest` em `plataforma/` | 190 passaram, 82 pulados, 0 falhas | 199 passaram, 82 pulados, 0 falhas | **204 passaram, 82 pulados, 0 falhas** (+5 testes novos desta etapa) |
| Banqueiro (Python) | `pytest` em `bots/banqueiro/` | 169 passaram, 32 falhas (todas `TEST_DATABASE_URL`) | 170 passaram, 31 falhas (todas `TEST_DATABASE_URL`) | 170 passaram, 31 falhas (reconferido, sem mudança) |

As 2 falhas do frontend (`equipmentEffects.test.ts`, `lojaCommands.test.ts`) e as 31 do Banqueiro (todas `RuntimeError: TEST_DATABASE_URL deve apontar para um PostgreSQL descartavel de testes`) são as mesmas em todas as três colunas — nenhuma nova, nenhuma corrigida nem quebrada por esta validação.

---

## 9. Testes que ainda faltam

Tudo que depende de banco real (`TEST_DATABASE_URL`, indisponível neste ambiente) ou de infraestrutura de teste de componente React (`jsdom`/`@testing-library`, não instalada neste projeto):

- **Sincronização Mana/Vida ficha↔sessão de ponta a ponta contra Postgres real** — a lógica de `_descontar_mana_na_sessao` está testada isolada (fake de conexão), e a query de sync em `atualizar_participante` foi lida e comparada linha a linha com o padrão de Vida já em produção, mas nenhuma delas rodou contra um banco de verdade nesta sessão.
- **`registrar_uso` → sessão → volta pro SSE → HUD** — o comportamento descrito na seção 3 (SSE não repassa pro HUD) foi confirmado por leitura de código (`useSessaoStore.ts` linha ~201), não por uma sessão de navegador real. Recomendo confirmar visualmente com o app rodando, já que é uma experiência de UI, não só lógica.
- **Instalação/desinstalação de modificação com os novos campos `aplicacao`/`pre_requisitos`** — os testes de integração existentes (`test_modificacoes_loja.py`) continuam cobrindo o fluxo de instalação em si, mas nenhum foi escrito especificamente pros dois campos novos (porque, como documentado, nada os consome ainda).
- **Compra de item com `requisitoNivel` violado, ponta a ponta com banco** — a lógica pura está testada (`test_shop_requisitos.py`), mas o caminho HTTP completo (grava em `infracoes_loja`, notifica o mestre, devolve `infracoes` no JSON) não rodou contra banco real.
- **Teste de componente para `EntityEditor.tsx`** — não existe infraestrutura de teste de componente neste projeto; o teste que escrevi (`sessionConditionsSource.test.ts`) verifica o código-fonte como texto, não o comportamento renderizado.

Para viabilizar os itens de banco, seria necessário um Postgres descartável local (`reference_testes_banco_docker.md` já documenta como o projeto normalmente faz isso) com `TEST_DATABASE_URL` configurada antes de rodar `pytest`.

---

## 10. Testes automatizados adicionados nesta etapa

| Arquivo | O que cobre |
|---|---|
| `plataforma/tests/test_mana_sessao.py` (novo, 5 testes) | `_descontar_mana_na_sessao` isolado: desconto normal, nunca fica negativo, participante inexistente não faz nada, `mana_atual` nulo não faz nada, custo zero é inofensivo |
| `tests/frontend/sessionConditionsSource.test.ts` (novo, 3 testes) | Confirma que `EntityEditor.tsx` importa `CONDICOES_OFICIAIS`/`CRISES_SANIDADE` (não duplica a lista), cobre as 11+6, e mantém a opção de texto livre |
| `tests/frontend/shopCatalogIntegrity.test.ts` (1 teste novo) | `aplicacao` de toda modificação dentro do enum; `pre_requisitos`, quando presente, no mesmo formato tipado de Legados; confirma as 15 modificações com pré-requisito |

Nenhum teste existente foi alterado nesta etapa. `package.json` ganhou uma linha adicionando `sessionConditionsSource.test.ts` à lista de `test:frontend` (mudança de infraestrutura de teste, não de comportamento do sistema).

---

## 11. Decisões de design (análise, sem implementar)

### Veículos e propriedades — automatizar a migração?

**Consequências de manter os dois passos (compra → migração manual), o estado atual:**
- Transferência: um veículo/propriedade recém-comprado ainda pode ser negociado como item de inventário comum antes de virar entidade de campanha.
- Inventário: o item some do inventário só no momento da migração, não da compra.
- Campanha/sessão/permissões: a entidade só existe pra sistemas de campanha (Frota & Bases, permissões por personagem, SSE ao vivo) depois de migrada — antes disso é invisível pra esses sistemas.

**Consequências de automatizar (compra já cria a entidade):**
- Transferência: desapareceria a janela em que dar/vender um veículo/propriedade recém-comprado é só mover um item de inventário — precisaria de um fluxo de transferência de entidade de campanha (que hoje não existe pra veículos/propriedades, só pra itens de inventário).
- Simplicidade: um passo a menos pro jogador, e o aviso do achado 12 deixaria de ser necessário.
- Risco: qualquer compra em lote com outros itens ganharia um comportamento assíncrono diferente (parte dos itens vira inventário, veículo/propriedade vira campanha na hora) — mais superfície de código no meio de uma transação que hoje só grava inventário/saldo.

**Recomendação:** manter os dois passos por enquanto (o que já está implementado — aviso claro na compra). Automatizar exigiria primeiro decidir o que acontece com a "janela de transferência" que se perde, e isso é uma pergunta de design de jogo (vocês querem que dê pra presentear um carro recém-comprado antes de ele "existir" na campanha?), não uma correção técnica.

### 6 Legados novos

Reexaminando de perto nesta validação (não só a redação superficial), os 6 já têm limitador de uso na própria frase — mais parecido com o padrão dos 36 revisados do que a auditoria original sugeriu:

| Legado | Efeito atual | Possível problema | Tipo de limite que parece necessário |
|---|---|---|---|
| Eco do Fluxo | 1×/cena, recupera 2 Mana após gastar ≥5 numa habilidade; já tem cláusula anti-abuso ("não ativa com custo reduzido <3 Mana") | Nenhum óbvio — já limitado e com cláusula de borda | Nenhum extra; talvez só confirmar redação formal como as demais |
| Passo Entre Galhos | 1×/turno, 2 m sem provocar reação após sucesso em Acrobacia/Furtividade; já não atravessa obstáculo | Nenhum óbvio | Nenhum extra |
| Memória do Eclipse | 1×/sessão, pista do mestre ou vantagem em teste | Depende de arbítrio do mestre pra pista "verdadeira" — mesmo padrão de outros legados sociais/narrativos já revisados | Nenhum mecânico; talvez só exemplo de uso na descrição |
| Vínculo Lunar | Reação + 2 Mana, +4 Defesa num ataque contra aliado a 15 m | Não é uma das 4 reações oficiais do livro (Esquiva/Bloqueio/Contra-Ataque/Proteger) — usa o slot de reação normal, então tecnicamente não conflita, mas vale confirmar se é intencional ter uma 5ª reação "extra-livro" | Nenhum limite numérico extra necessário; só uma nota de que ela consome a única reação do turno como qualquer outra |
| Segundo Tempo | 1×/descanso, +1d6 Vida e −1 Cansaço ao sair de Morrendo por cura | Gatilho raro (precisa estar Morrendo) — baixo risco | Nenhum |
| Âncora da Árvore | 1×/cena, reação + 2 Mana, cancela deslocamento forçado | Nicho, defensivo, sem repetição óbvia | Nenhum |

**Recomendação:** a necessidade de retrabalho parece menor do que a auditoria original descreveu. Sugiro uma revisão leve (meia hora, comparando redação/formatação com os 36) em vez de uma reescrita completa — o problema real e confirmado (marcação enganosa de "revisado") já foi corrigido.

### Preços

| Item | Preço atual | Comparável direto | Diferença | Faixa razoável (referência, não decisão) |
|---|---|---|---|---|
| Chicote de Plasma (incomum, 2d6, corpo a corpo) | 2.800 Lunaris | "Chicote" comum/base (id `chicote`, 2d5, mesmo alcance): **30 Lunaris** | ~93× mais caro por +1 dado (2d5→2d6) | Armas incomuns/comuns nessa faixa de dano custam 5-95 Lunaris no resto do catálogo; mesmo com uma margem generosa por ser "arma tech", algo na casa de 40-100 Lunaris pareceria mais alinhado |
| Couraça Primordial (lendário, +4 Defesa, Resistência 4 a todo dano) | 3.000 Lunaris | Anti-mágia (lendário, +20 Defesa): 1.000 Lunaris. Armadura Solar (lendário, +22 Defesa): 900 Lunaris | 3-3,3× mais caro que as outras lendárias, por 1/5 do bônus de Defesa (a Resistência 4 universal compensa parte, mas não parece justificar 3.000) | As outras lendárias de armadura ficam entre 900-1.000 Lunaris; mesmo dando um prêmio pela Resistência 4 a todo tipo de dano, algo entre 1.200-1.800 Lunaris pareceria mais coerente com a curva das outras três |
| Vanguarda (raro, +13/−6) | 95 Lunaris | Guardião (épico, +15/−6): 200 Lunaris | Vanguarda rende 87% do bônus da Guardião por 47,5% do preço, apesar de raridade menor | Dentro da faixa "raro" do catálogo (que gira em geral bem abaixo de armaduras épicas equivalentes), 95 pode até estar certo — o outlier pode ser a Guardião estar cara ou a Vanguarda estar barata; vale comparar as duas contra uma terceira armadura raro de bônus parecido antes de decidir qual das duas está fora da curva |

**Recomendação:** os dois primeiros (Chicote de Plasma, Couraça Primordial) têm evidência forte de desalinhamento e valem correção. O terceiro (Vanguarda) é mais ambíguo — pode ser a Guardião que está cara, não a Vanguarda barata; sugiro olhar uma terceira referência antes de decidir qual number mexer.

---

## 12. Próximo passo recomendado

**Fechar a lacuna do achado 10 primeiro** (adicionar `bots/jornalista` na fonte única já criada) — é a única das três lacunas encontradas nesta validação que é puramente mecânica (sem decisão de design envolvida), de baixo risco (mesmo padrão já aplicado duas vezes com sucesso) e fecha de vez uma categoria inteira de bug antes que uma quarta cópia apareça em algum lugar não descoberto ainda.

Depois disso, na ordem que acho que rende mais:
1. Resolver o gap de atualização ao vivo do HUD (achados 8-9) — trocar o evento SSE de `registrar_uso` de `"registro"` pra também disparar (ou incluir) o que já faz `fetchEstadoSessao()`, ou publicar um segundo evento. É uma mudança pequena e o comportamento correto já existe pro caminho "editar HUD manualmente" — só falta estender pro caminho novo.
2. As duas decisões de design (seção 11) — nenhuma é urgente, mas a de Legados novos parece resolvível rápido (a revisão real necessária é menor do que se pensava).
3. Considerar se vale a pena automatizar/testar o restante dos fluxos que dependem de `TEST_DATABASE_URL` (seção 9), especialmente antes de qualquer deploy que toque `sessions.py`/`rolls.py`/`characters.py`.
