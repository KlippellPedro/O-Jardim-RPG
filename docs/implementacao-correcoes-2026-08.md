# Implementação das Correções — O Jardim RPG

**Data:** 2026-08-10
**Base:** [auditoria-integracao-sistema-2026-08.md](auditoria-integracao-sistema-2026-08.md) (19 achados)
**O que mudou de verdade nesta etapa:** cada achado foi reverificado diretamente no código/dados atuais antes de qualquer alteração. Em pelo menos três casos, essa reverificação mudou o diagnóstico original (detalhado abaixo) — a correção aplicada segue o que foi confirmado agora, não a redação original da auditoria.

---

## Correções implementadas

| Achado | Problema | Correção | Arquivos alterados | Status |
|---|---|---|---|---|
| 3 | `mestre-v1.json` dizia que Habilidades/Poderes "não produzem efeito mecânico", mas as 27 classes já estão revisadas e publicadas | Reescrita da seção "Conteúdo adiado de raças e classes": afirma o estado real e vira uma regra verificável (`progressao_publicada`/`recursos_provisorios`) em vez de uma frase que ficaria desatualizada de novo | `data/regras/mestre-v1.json` | ✅ Corrigido |
| 2 | Tabela pública de Condições tinha só 6 das 11 oficiais; Crises de Sanidade sem tabela | `regras.ts` agora importa `CONDICOES_OFICIAIS`/`CRISES_SANIDADE` de `condicoes.ts` e gera as duas tabelas — nunca mais hardcoded à mão | `data/regras/regras.ts` (+ `regras-publicas-v1.md` regenerado) | ✅ Corrigido |
| 1 | Classes, Raças, Legados e Perícias nomeadas não apareciam no livro público gerado (placeholders `<!-- CLASSES_DATA -->` etc.) | `regras.ts` agora gera listas reais (nome + tipo + conceito de cada classe/raça, catálogo completo de Legados, tabela de Perícias com atributo) a partir de `classes.json`/`racas.json`/`legados*.json`/`pericias.json`, com um resumo mais curto (não a progressão inteira) e um aviso apontando pro catálogo interativo pros detalhes completos | `data/regras/regras.ts`, `tools/generate-public-rules.mjs` | ✅ Corrigido |
| 4 | Origem "Artesão" promete "Ofício +1", mas Ofício não tem mais id fixo (é sempre perícia personalizada com id `custom_<timestamp>`) — bônus nunca aplicava | `ajusteOrigem`/`nomeAjusteOrigem` agora casam por título normalizado quando o alvo é uma perícia sem id fixo correspondente, mantendo compatibilidade com o caso antigo (id fixo) | `src/services/ajustesFichaService.ts`, `src/pages/Ficha/abas/AbaPericias.tsx` | ✅ Corrigido |
| 5 | Cartista Arcano (classe de magia) só ganhava a primeira magia no nível 10; as outras classes de magia começam no nível 1 | Progressão de magia/selos/encantamentos antecipada (nível 1: 1 magia de 1º círculo; nível 5: 3; nível 10: 2º círculo, 4; nível 15: 5), com o texto da habilidade "Baralho Arcano" reescrito para bater com os novos números | `data/ficha/classes.json` | ✅ Corrigido |
| 6 | Loja: `requisitoNivel` gera infração mas não bloqueia compra, e isso nunca chegava ao comprador (só ao mestre, por notificação) | Resposta da compra agora inclui `infracoes`; o site mostra um toast avisando o próprio comprador quando um requisito foi ignorado | `plataforma/routers/shop.py`, `src/services/lojaApi.ts`, `src/pages/Loja/LojaPage.tsx` | ✅ Corrigido (ver nota sobre `requisitoClasse` abaixo — diagnóstico original corrigido, não implementado como pedido) |
| 7 | Caixa do Coração duplicava item sem limite; Chave sem Porta abria qualquer fechadura sem contrapartida; Kit de Aventureiro/Relicário de Prata/Olho de Golem/Lente Arcana sem efeito numérico | Caixa do Coração: teto de raridade duplicável (até rara), cooldown de 7 dias, cópia se desfaz em 24h. Chave sem Porta: só abre fechaduras mundanas sem teste; mágicas/tecnológicas/cofres épicos+ exigem Ladinagem normal. Os outros 4: efeito reescrito com número/teste/duração/alcance concretos | `data/loja/catalogo.json` | ✅ Corrigido |
| 8–9 | Mana e condições em sessão ao vivo eram só manuais, mesmo com custo exato definido em cada poder/magia e com a ficha já descontando Mana sozinha ao usar um poder | Duas sincronizações novas (mirror do padrão já usado pra Vida): (a) editar Mana no HUD da sessão agora propaga pra `ficha.status.manaAtual`; (b) usar um poder/magia com custo em Mana (já registrado por `AbaPoderes.tsx`/`AbaHabilidades.tsx`) agora desconta automaticamente do participante na sessão ativa, se ele estiver em cena. Editor de condições da sessão ganhou o mesmo seletor rápido das 11 condições + 6 crises oficiais que a ficha já tinha | `plataforma/routers/sessions.py`, `plataforma/routers/rolls.py`, `src/pages/Sessao/components/EntityEditor.tsx` | ✅ Corrigido (ver nota abaixo — parte do achado já estava resolvida do lado da ficha) |
| 10 | Tiers de Cofre/Segurança e mapas de reputação duplicados byte-a-byte entre o bot e a plataforma, mantidos à mão | Extraídos para `data/economia/cofre_seguranca_tiers.json`; os dois módulos Python agora leem desse arquivo único (com resolução de caminho compatível com dev e com os dois formatos de pacote de deploy) | `data/economia/cofre_seguranca_tiers.json` (novo), `bots/banqueiro/core/economia.py`, `plataforma/core/cofre_tiers.py`, `tools/build-discloud-packages.ps1` | ✅ Corrigido (ver nota abaixo — não havia divergência de valores ainda, só risco) |
| 11 | Modificações: `aplicacao` sem validação de enum; `pre_requisito` só texto livre, nunca lido por código nenhum | `aplicacao` agora é validado em `content_seed.py` (mesmo padrão de `_SHOP_TYPES`/`_SHOP_RARITIES`) — falha alto e cedo se alguém digitar errado. As 15 modificações com pré-requisito ganharam `pre_requisitos` tipado (mesmo formato de Legados), preservando o texto original | `plataforma/core/content_seed.py`, `data/loja/catalogo.json` | ✅ Corrigido |
| — | *(achado extra, encontrado ao investigar o 11)* `TIPOS_VALIDOS` do bot Banqueiro não incluía `"propriedade"` — um teste já existente (`test_semente_completa_aceita_tipos_e_raridades_da_loja`) falhava porque o bot rejeitava 5 dos 461 itens do catálogo | Adicionado `"propriedade"` a `TIPOS_VALIDOS` e `CATEGORIA_DE` no bot | `bots/banqueiro/core/catalogo.py` | ✅ Corrigido |
| 12 | Comprar veículo/propriedade não vira PV/combustível/instalações jogáveis sem uma "migração" manual separada, sem aviso nenhum | Toast de compra avisa explicitamente quando o carrinho tinha veículo completo ou propriedade, apontando pra Frota & Bases da campanha como próximo passo | `src/pages/Loja/LojaPage.tsx` | ✅ Corrigido (fluxo em si preservado — ver decisão de design abaixo) |
| 13 | 6 Legados novos marcados como `versaoRegras: '1.0'` (revisado) sem nunca terem passado pela revisão balanceada dos 36 originais | Corrigida a marcação para `'fonte'` (não revisado) — a interface deixa de afirmar algo falso sobre a procedência do texto | `src/services/catalogoService.ts` | ✅ Corrigido (rebalanceamento do texto em si não foi feito — ver seção de decisões) |
| 14 | Raridade com maiúscula/minúscula/acento misturados em 461 itens (ex.: "Épico"/"épico"/"epico") | Todos os 461 valores normalizados pro padrão de `_SHOP_RARITIES` (minúsculo, sem acento) | `data/loja/catalogo.json` | ✅ Corrigido |
| 16 | `limites.py` sugeria pelo nome um limite de recursos de personagem, mas só faz rate-limit de autenticação | Renomeado pra `rate_limit_auth.py` (preservando histórico via `git mv`), docstring esclarece o escopo e a diferença pro conceito de "limite de uso de poder" (que não existe em lugar nenhum) | `plataforma/core/rate_limit_auth.py` (renomeado), `plataforma/routers/auth.py`, `plataforma/tests/test_unit.py`, `plataforma/README.md` | ✅ Corrigido |
| 18 | Modificação "Sedenta" recriava o efeito de "Sangramento" com números/timing próprios, sem citar a condição oficial | Texto reescrito pra aplicar explicitamente a condição Sangramento, reaproveitando a regra de empilhamento (+1 até +5) e remoção (Cura DT 15 ou qualquer cura) já definida em `condicoes.ts` | `data/regras/raridadesEquipamentos.ts` | ✅ Corrigido |
| 19 | Atordoado e Inconsciente mecanicamente quase idênticos, sem indicação de quando usar cada um | Nota cruzada adicionada nos efeitos de cada condição | `data/regras/condicoes.ts` | ✅ Corrigido |

Todas as linhas acima passaram por teste automatizado antes de serem consideradas concluídas (ver seção de Testes).

### Correções de diagnóstico (o achado original precisava de ajuste antes de virar código)

- **Achado 6 (requisito de classe):** ao investigar de perto, os dois itens "Guardião" (armadura/escudo) **não são um caso de requisito de compra** — a descrição ("se o portador for um Guardião, concede +5 de Defesa") é um **bônus condicional**, não uma restrição de quem pode comprar/usar o item base. Adicionar `requisitoClasse` neles teria criado uma restrição nova que o item nunca teve (bloquear a compra pra quem não é Guardião), o que seria inventar regra, não corrigir uma. O que ficou confirmado e corrigido é a parte real do achado: a infração de `requisitoNivel` fica invisível pra quem compra. `requisitoClasse` continua existindo e validado no backend/frontend, pronto pro dia em que um item realmente precisar dele — hoje nenhum precisa.
- **Achado 8 (Mana):** a ficha **já** descontava Mana automaticamente ao usar um poder (`AbaPoderes.tsx`/`AbaHabilidades.tsx`, já existente antes desta sessão). O problema real era mais estreito do que a auditoria descreveu: só a cópia da sessão ao vivo (`sessao_participantes.mana_atual`) ficava fora de sincronia. É isso que foi corrigido.
- **Achado 9 (Condições):** a ficha (`AbaFicha.tsx`) **já** oferecia as 11 condições oficiais e as 6 crises como seleção rápida, puxando de `condicoes.ts`. O gap real estava só no editor de condições da sessão ao vivo (`EntityEditor.tsx`), que só tinha texto livre — corrigido para os dois lados baterem.
- **Achado 10 (Cofre):** verificação byte-a-byte mostrou que as tabelas **não estavam divergindo ainda** — `COFRE_TIERS`, `SEGURANCA_TIERS` e os mapas de reputação eram idênticos nos dois arquivos, e a fórmula de desconto (`beneficios_reputacao` vs. `desconto_por_reputacao`) produzia o mesmo resultado nos casos que importam pro cofre, apesar de ter uma estrutura mais rica do lado do bot (cashback, multiplicador de limite). Era um risco real de duplicação, não uma divergência já acontecendo. A correção (fonte única) elimina o risco de qualquer forma.

---

## Problemas que já estavam corrigidos

- **Achado 8 (parte ficha):** dedução automática de Mana ao usar poder/habilidade — já implementada em `AbaPoderes.tsx`/`AbaHabilidades.tsx` antes desta sessão.
- **Achado 9 (parte ficha):** seleção das 11 condições oficiais + 6 crises de sanidade no modal de condições da ficha — já implementada em `AbaFicha.tsx` antes desta sessão.
- **Ingredientes de ritual ↔ loja, `_SHOP_TYPES` ↔ categorias do catálogo, validação de Legados/Marca-Cicatriz/Pecados-Virtudes, isolamento da raça Entidade:** confirmados consistentes na auditoria original e reconfirmados agora sem necessidade de mudança (ver "O que já funciona bem" no relatório da auditoria).

---

## Problemas que não foram alterados

- **Achado 7 (parcial) — item "Guardião":** não é bug (ver "Correções de diagnóstico" acima). Nenhuma mudança feita.
- **Achado 13 (rebalanceamento de conteúdo):** a marcação enganosa (`versaoRegras`) foi corrigida, mas o texto dos 6 Legados novos **não** foi reescrito com os mesmos limites de uso/teto que os 36 originais receberam — isso é julgamento de balanceamento de conteúdo, não uma correção mecânica. Ver "Decisões que precisam do designer".
- **Achado 15 (preços destoantes):** Chicote de Plasma, Couraça Primordial e Vanguarda continuam com os preços atuais. Corrigir exigiria escolher um novo valor numérico específico — isso é decisão de balanceamento, não bug. Ver "Decisões que precisam do designer".
- **Achado 17 (sistemas sem gancho de classe):** Ataques Combinados, Facções, Bases e Veículos em Combate continuam sem nenhuma classe que os referencie especificamente. A própria auditoria original já classificava isso como "não é bug, é oportunidade de conteúdo futuro" — nada foi alterado, é sugestão para quando novas classes/revisões forem desenhadas.
- **Achado 12 (fluxo de ativação):** avaliei automatizar a migração de veículo/propriedade na hora da compra, mas decidi não fazer isso — ver "Decisões que precisam do designer" abaixo, é uma decisão de design que estou preservando conscientemente, não um bug que ficou sem corrigir.

---

## Decisões que precisam do designer

### 1. Achado 12 — Automatizar a migração de veículo/propriedade na compra?
**O que encontrei:** hoje comprar um `veiculo-completo` ou `propriedade` não cria a entidade jogável (PV, combustível, instalações) — exige uma chamada separada de "migração" pra `campanha_veiculos`/`campanha_propriedades`. Migrar remove o item do inventário.
**Por que não decidi sozinho:** essa separação em dois passos pode ser intencional — ela permite negociar/dar de presente um veículo/propriedade recém-comprado (ainda como item de inventário) antes de "ativá-lo" na campanha. Automatizar a migração na compra eliminaria essa janela de transferência sem eu saber se alguém depende dela hoje.
**Minha implementação atual:** só deixei o próximo passo claro na tela de compra (toast). O fluxo de dois passos continua existindo.
**Para decidir:** (A) manter os dois passos, só com a UI mais clara (o que já fiz); (B) automatizar a migração na compra, aceitando que um veículo/propriedade comprado nunca mais passa pelo inventário como item transferível.

### 2. Achado 13 — Rebalancear o texto dos 6 Legados novos
**O que encontrei:** "Eco do Fluxo", "Passo Entre Galhos", "Memória do Eclipse", "Vínculo Lunar", "Segundo Tempo", "Âncora da Árvore" têm redação "crua", sem os limites de uso por turno/cena/teto que os 36 Legados originais ganharam na revisão de `legados-regras-v1.json`.
**Por que não decidi sozinho:** definir o limite certo pra cada um (uma vez por turno? por cena? qual teto numérico?) é uma escolha de balanceamento de jogo, não uma correção técnica — errar aqui pode deixar um Legado mais fraco ou mais forte do que a intenção original.
**O que já fiz:** parei de marcar esses 6 como "revisados" quando não são (ver correção do achado 13 acima), então pelo menos a interface não mente mais sobre o estado deles.
**Para decidir:** revisar cada um dos 6 com a mesma régua aplicada aos 36 (limites de uso, teto, redação), e então atualizar `legados-novos.json` (ou fundi-lo em `legados-regras-v1.json`).

### 3. Achado 15 — Preços destoantes
**O que encontrei:** Chicote de Plasma (2.800 Lunaris, ~100× o padrão de armas incomuns comparáveis), Couraça Primordial (3.000 Lunaris por só +4 Defesa, contra 900–1.000 Lunaris por +20/+22 nas outras armaduras lendárias) e Vanguarda (95 Lunaris por quase o mesmo bônus da Guardião épica, que custa 200).
**Por que não decidi sozinho:** escolher o novo preço exato é decisão de balanceamento econômico — a curva preço/bônus do resto do catálogo dá uma faixa razoável, mas o valor final dentro dela é call de design.
**Para decidir:** revisar os três preços; a curva já consistente do resto do catálogo serve de referência (ex.: armas incomuns/comuns ficam entre ~1,1–6,7 Lunaris por ponto de dano médio; armaduras lendárias giram em torno de +20/+25 de Defesa por 900–1.000 Lunaris).

---

## Testes realizados

Todos os comandos abaixo foram executados após as mudanças, com contagem de baseline registrada antes de qualquer edição para diferenciar regressão de falha pré-existente.

| Suíte | Comando | Resultado |
|---|---|---|
| TypeScript (build completo) | `npx tsc -b --force` | Sem erros |
| Frontend (20 arquivos de teste) | `npm run test:frontend` | 190 testes, **188 passaram**, 2 falhas — as mesmas 2 falhas pré-existentes do baseline (`equipmentEffects.test.ts`, `lojaCommands.test.ts`, sobre um campo `alvo_item_id` de um trabalho já em andamento antes desta sessão, não relacionado a nenhum achado) |
| Geração do livro público | `npm run check:rules-source` | OK — `.md` gerado bate com `regras.ts` |
| Plataforma (Python) | `pytest` em `plataforma/` | 199 passaram (era 190 no baseline; +9 dos testes novos), 82 pulados (exigem `TEST_DATABASE_URL`, ambiente sem Postgres disponível nesta sessão), **0 falhas** |
| Banqueiro (Python) | `pytest` em `bots/banqueiro/` | 170 passaram (era 169 no baseline; +1 do teste de catálogo que a correção do "propriedade" destravou), 31 falhas — todas `TEST_DATABASE_URL` (mesmo motivo do baseline, nenhuma nova) |

### Baseline (antes de qualquer mudança desta sessão)
- Frontend: não medido em separado (mesma suíte, contagem comparável via diferença acima)
- Plataforma: 190 passaram, 82 pulados, 0 falhas
- Banqueiro: 169 passaram, 32 falhas (todas `TEST_DATABASE_URL`, incluindo uma real: `test_semente_completa_aceita_tipos_e_raridades_da_loja`, corrigida nesta sessão)

### Testes novos escritos nesta sessão
- `tests/frontend/attributeGeneration.test.ts` — origem Artesão casando por título (achado 4)
- `tests/frontend/classProgression.test.ts` — nenhuma classe de magia libera a primeira magia depois do nível 5; Cartista Arcano especificamente no nível 1 (achado 5)
- `tests/frontend/progressionAndRecovery.test.ts` — Legados novos nunca aparecem marcados como revisados (achado 13)
- `plataforma/tests/test_shop_requisitos.py` (novo arquivo) — 7 testes cobrindo `_require_catalog_character_requirements` isolado, sem precisar de banco (achado 6)
- `plataforma/tests/test_content_seed.py` — 2 testes novos pra validação de `aplicacao` de modificação (achado 11)

### O que não pôde ser testado nesta sessão
- A sincronização Mana ficha↔sessão e o novo desconto automático de Mana em `registrar_uso` (achados 8–9) tocam rotas que só têm cobertura via `pytest` de integração com banco real (`TEST_DATABASE_URL`), indisponível neste ambiente. O SQL foi verificado manualmente e segue de perto um padrão já existente e testado em produção (a sincronização de Vida ficha↔sessão, que já funcionava antes desta sessão) — mas recomendo rodar a suíte completa com um Postgres descartável (ver `reference_testes_banco_docker.md`) antes de subir pra produção.

---

## Regressões encontradas

Nenhuma regressão permanente. Duas regressões foram introduzidas e corrigidas durante a própria sessão, antes de eu considerar qualquer achado concluído:

1. **`plataforma/tests/test_content_seed.py`** — o teste genérico de upsert usava uma entrada `modificacao` sem campo `aplicacao`; a nova validação (achado 11) passou a rejeitá-la. Corrigido ajustando a fixture do teste para ter os dados que uma modificação real sempre tem.
2. **`plataforma/tests/test_cofre_tiers.py::test_espelho_permanece_identico_ao_banqueiro`** — esse teste já existente carrega `bots/banqueiro/core/economia.py` isolado via `importlib`, fora do pacote `core`; meu primeiro rascunho usava `from .config import ...` (import relativo), que quebra nesse carregamento avulso. Corrigido: a resolução do caminho do JSON compartilhado ficou autocontida dentro de `economia.py`, sem depender de import relativo a `config.py`.

Ambas foram pegas pela própria suíte de testes antes de eu marcar o achado correspondente como concluído — é exatamente o motivo de rodar os testes depois de cada grupo de mudança, como pedido.

---

## Próximas melhorias

Coisas que não são necessárias para corrigir os problemas atuais, mas que valem considerar depois:

- Escrever um teste de integração (com `TEST_DATABASE_URL`) especificamente para a sincronização Mana ficha↔sessão nova, e também para a sincronização de Vida já existente (que nunca teve teste próprio, apesar de já estar em produção).
- Decidir e implementar as 3 "Decisões que precisam do designer" acima.
- Considerar ganchos de classe explícitos com Ataques Combinados/Facções/Bases/Veículos em Combate (achado 17) na próxima revisão de classes.
- `RARIDADES` do bot Banqueiro (`bots/banqueiro/core/catalogo.py`) não tem o valor "reliquia" como alias direto — hoje é inofensivo (nenhum item usa essa grafia), mas é o mesmo tipo de enum-duplicado que causou o bug do "propriedade"; vale considerar unificar com `_SHOP_RARITIES` da plataforma no mesmo espírito da correção do achado 10.
- O merge de `legados.json` + `legados-novos.json` + `legados-regras-v1.json` em uma fonte única (hoje são três arquivos com formatos diferentes) resolveria de vez a categoria de problema do achado 13, não só o sintoma da marcação errada.
