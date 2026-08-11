# Implementação Final — Correções Pós-Validação do O Jardim RPG

**Data:** 2026-08-10
**Base:** [auditoria-integracao-sistema-2026-08.md](auditoria-integracao-sistema-2026-08.md) → [implementacao-correcoes-2026-08.md](implementacao-correcoes-2026-08.md) → [validacao-pos-correcao-2026-08.md](validacao-pos-correcao-2026-08.md) → este documento.
**Escopo:** só as pendências que a validação confirmou como existentes. Nada que a validação já havia marcado como ✅ Resolvido foi mexido de novo.

---

## Correções implementadas

| Problema | Correção | Arquivos | Teste | Status |
|---|---|---|---|---|
| Terceira cópia hardcoded do Cofre em `bots/jornalista` (achado 10, escopo ampliado) | `jornalista/core/economia.py` agora lê `data/economia/cofre_seguranca_tiers.json`, a mesma fonte de banqueiro/plataforma; empacotamento de deploy atualizado | `bots/jornalista/core/economia.py`, `tools/build-discloud-packages.ps1` | `plataforma/tests/test_cofre_tiers.py` (+3 testes: espelho com jornalista, comparação direta com o JSON dos três módulos) | ✅ Concluído — 212 testes plataforma, 0 falhas |
| *(descoberto ao testar a correção acima)* `bots/jornalista/core/catalogo.py::TIPOS_VALIDOS` também não tinha `"propriedade"` — mesmo bug já corrigido em `banqueiro` na etapa anterior, replicado independentemente aqui | Adicionado `"propriedade"` a `TIPOS_VALIDOS` e `CATEGORIA_DE` | `bots/jornalista/core/catalogo.py` | `tests/test_loot.py::test_catalogo_publicado_aceita_tipos_e_raridades_da_loja` (já existia, estava falhando, agora passa) | ✅ Concluído — 107/107 testes jornalista |
| HUD da sessão não atualizava ao vivo quando Mana era descontada automaticamente (achados 8-9) | `registrar_uso` agora publica `"participante_atualizado"` (com a versão da sessão corretamente incrementada) sempre que `_descontar_mana_na_sessao` realmente mexe num participante — além do `"registro"` que já existia pro log | `plataforma/routers/rolls.py` | `plataforma/tests/test_mana_sessao.py` (+2 testes: devolve nova versão e toca a sessão; não toca quando não há participante) | ✅ Concluído — lógica isolada testada e passando; caminho HTTP completo (SSE de verdade) seria só confirmável com navegador+banco reais, não disponível nesta sessão |
| Condições: cobertura de automação mecânica não estava documentada em lugar nenhum | Comentários explícitos listando quais das 11 condições/6 crises têm efeito automático (Defesa/Iniciativa/movimento/ataque) e quais são só informativas — nenhuma automação nova foi criada | `src/services/statusService.ts`, `data/regras/condicoes.ts` | Não aplicável (documentação, sem lógica nova) | ✅ Concluído |
| `pre_requisitos` de modificação (tipado desde a correção anterior) nunca era validado na compra/instalação (achado 11) | Reaproveitada a função já existente `_atende_requisito_legado` (mesma usada para Legados) para bloquear a compra com 422 quando o personagem não atende; mestre/assistente isento no próprio personagem, mesmo padrão de `requer_autorizacao_mestre` já usado nesta rota | `plataforma/routers/shop.py` | `plataforma/tests/test_modificacao_pre_requisitos.py` (novo, 4 testes, roda sem banco) + `plataforma/tests/test_modificacoes_loja.py` (+3 testes de integração HTTP, precisam de `TEST_DATABASE_URL`) | 🟡 Concluído na lógica; integração HTTP completa **não executada** nesta sessão (ver "Testes bloqueados") |
| Fluxo veículo/propriedade (compra → migração manual) não tinha a decisão de design registrada em lugar nenhum do código | Docstrings explicando exatamente por que os dois passos foram mantidos (janela de transferência que se perderia) — comportamento **não alterado** | `plataforma/routers/vehicles.py`, `plataforma/routers/properties.py` | Não aplicável (documentação) | ✅ Concluído (documentar, não decidir — conforme pedido) |

---

## Problemas que permaneceram

Só o que foi confirmado, nada inventado:

- **`aplicacao` (dado real) vs. `categorias_alvo`/`tipos_alvo_permitidos`/`slots_modificacao`/`limite_modificacoes` (o que o código de compatibilidade de `shop.py` lê).** Descoberta desta etapa, ao investigar onde ligar `pre_requisitos`: o bloco de validação de compatibilidade/slots/exclusividade de modificação em `shop.py` (linhas ~686-763) é real e **tem teste cobrindo ele** (`test_instalar_modificacao_bloqueia_categoria_incompativel` e vizinhos, em `test_modificacoes_loja.py`) — mas os campos que ele lê (`categorias_alvo`, `slots_ocupados` no alvo, `grupo_exclusividade`, `limite_modificacoes`, `slots_modificacao`) **não existem em nenhuma das 461 entradas do catálogo real**. Os dados usam `aplicacao` (Armas/Armaduras/Escudos/Itens gerais e mágicos), que esse bloco nunca lê. Na prática, hoje, esse código de compatibilidade nunca dispara para nenhuma compra real — não é um bug que eu introduzi (já era assim antes de qualquer correção), mas é uma lacuna maior do que "só falta o pré-requisito", que era o escopo original do achado 11.
  **Por que não corrigi agora:** ligar `aplicacao` corretamente exige mapear "Escudos" como um caso separado de "Armaduras" no lado do item-alvo (hoje `_inventory_category` classifica os dois como `"armadura"`, sem distinguir escudo por `subtipo`), e eu não tenho como testar essa mudança contra um banco real nesta sessão. Prefiro registrar isso com precisão a arriscar quebrar toda compra de modificação por causa de um mapeamento que eu não consigo verificar de ponta a ponta agora.
- **Caixa do Coração / Chave sem Porta continuam sem qualquer aplicação em código** (confirmado de novo: nenhuma referência aos ids em `src/` ou `plataforma/`). Isso já estava correto segundo a instrução desta etapa ("se a regra já estiver correta, não altere") — nenhum item "equipamento" do catálogo tem efeito codificado, então não seria consistente aplicar só nesses dois. Não alterado.
- **`pre_requisito` textual dos 51 mods continua sem revisão de compatibilidade com o campo `aplicacao`** — isto é, não verifiquei se algum dos 15 `pre_requisitos` tipados está semanticamente ligado a uma `aplicacao` que não faz sentido (ex.: um pré-requisito de "Fluxo" numa modificação de arma física). Não era o pedido desta etapa, registro como possível verificação futura barata.

---

## Decisões de design pendentes

Nenhuma foi decidida nem alterada nesta etapa — só reafirmando o que a validação já levantou, sem repetir a análise completa (está em [validacao-pos-correcao-2026-08.md](validacao-pos-correcao-2026-08.md), seção 11):

- **Veículos/propriedades:** manter compra→migração manual (documentado agora no código) vs. automatizar. Recomendação registrada: manter, pela janela de transferência que se perderia.
- **6 Legados novos:** Eco do Fluxo, Passo Entre Galhos, Memória do Eclipse, Vínculo Lunar, Segundo Tempo, Âncora da Árvore — reexame mostrou que já têm limitador de uso próprio; a necessidade de retrabalho é menor do que a auditoria original sugeriu. Nenhum valor foi alterado.
- **Preços:** Chicote de Plasma e Couraça Primordial têm evidência forte de desalinhamento (faixas sugeridas já calculadas); Vanguarda é ambígua (pode ser a Guardião que está cara, não ela barata). Nenhum preço foi alterado.

---

## Testes executados

| Suíte | Resultado desta etapa | Comparação com o baseline da validação |
|---|---|---|
| TypeScript (`npx tsc -b --force`) | Sem erros | Sem mudança |
| Geração do livro público (`npm run check:rules-source`) | OK | Sem mudança |
| Frontend (`npm run test:frontend`) | 194 testes, 192 passaram, 2 falhas | Mesmas 2 falhas pré-existentes da validação (`equipmentEffects.test.ts`, `lojaCommands.test.ts`) — nenhuma nova, nenhuma corrigida |
| Plataforma (Python) | **212 passaram** (era 204 na validação), 85 pulados (era 82), 0 falhas | +8 passando: +2 em `test_cofre_tiers.py` (espelho com jornalista + comparação direta com o JSON), +2 em `test_mana_sessao.py` (versão da sessão), +4 em `test_modificacao_pre_requisitos.py` (novo arquivo). +3 pulados novos em `test_modificacoes_loja.py` (precisam de banco) |
| Banqueiro (Python) | 170 passaram, 31 falhas (todas `TEST_DATABASE_URL`) | Sem mudança — meu trabalho nesta etapa não tocou `bots/banqueiro` além do arquivo já corrigido na etapa anterior |
| **Jornalista (Python)** *(não tinha sido rodado antes desta etapa)* | **107 passaram, 0 falhas** | Antes da minha correção: 106 passaram, **1 falhou** (`test_catalogo_publicado_aceita_tipos_e_raridades_da_loja`, o bug gêmeo do banqueiro) |
| **Gerente (Python)** *(conferido por precaução, não tocado)* | 19 passaram, 0 falhas | Sem mudança |

---

## Testes que ainda faltam (bloqueados por ambiente)

| Teste | Dependência ausente | Comportamento ainda não validado |
|---|---|---|
| `test_mana_sessao.py` → integração HTTP completa (`registrar_uso` de ponta a ponta) | `TEST_DATABASE_URL` | Que o SQL real grava certo em `sessao_participantes` e que o SSE realmente entrega `"participante_atualizado"` pro navegador do mestre |
| `test_modificacoes_loja.py` (3 novos testes de pré-requisito) | `TEST_DATABASE_URL` | Que a rejeição HTTP 422 realmente acontece na compra real, e que o mestre realmente é isento no próprio personagem |
| `test_cofre_tiers.py` (os 3 novos, na verdade rodam sem banco — só carregam `.py` avulso) | — | Já rodaram e passaram; nenhuma pendência aqui |
| Confirmação visual do HUD da sessão atualizando sozinho | Navegador + banco + duas sessões simultâneas (jogador usando poder, mestre olhando o HUD) | A lógica do backend está testada isoladamente; o comportamento ponta a ponta na tela nunca foi confirmado com o app rodando de verdade |

Nenhum desses testes foi "considerado passando" sem rodar — todos aparecem pulados (`skipped`) na suíte real, não como sucesso presumido.

---

## Regressões

**Nenhuma.** As duas coisas descobertas nesta etapa (jornalista com Cofre duplicado, jornalista com `TIPOS_VALIDOS` incompleto) são bugs **pré-existentes**, não causados por nenhuma correção anterior — só nunca tinham sido testados/descobertos antes porque a suíte de `bots/jornalista` nunca tinha sido rodada neste processo até agora. Ambos foram corrigidos e confirmados com teste passando.

Toda a suíte (plataforma, banqueiro, jornalista, Gerente, frontend, TypeScript) foi executada ao final desta etapa e nenhuma contagem de sucesso caiu em relação ao estado anterior.

---

## Estado atual do sistema

**Pronto para a próxima etapa**, com duas ressalvas explícitas (não são bloqueadores, são itens a considerar antes da próxima rodada de mudanças em loja/modificações ou sessão ao vivo):

1. **O bloco de compatibilidade de modificação em `shop.py` está desconectado dos dados reais** (`aplicacao` vs. `categorias_alvo`). Isso não é uma regressão desta etapa nem impede o jogo de funcionar hoje (a compra de modificação continua funcionando exatamente como sempre funcionou — sem checagem de compatibilidade de categoria, só a nova checagem de pré-requisito), mas é uma lacuna real que vale endereçar antes de confiar nesse bloco de código pra alguma decisão de balanceamento futura.
2. **Os testes de integração HTTP completos (mana/condições/modificação/cofre) não rodaram contra um banco real nesta sessão.** A lógica isolada está testada e correta; o caminho ponta a ponta (rota HTTP → SQL real → SSE → navegador) não foi confirmado. Recomendo rodar a suíte completa com `TEST_DATABASE_URL` configurada (`reference_testes_banco_docker.md` já documenta como) antes do próximo deploy que toque `sessions.py`, `rolls.py` ou `shop.py`.

Fora essas duas ressalvas — que são itens de acompanhamento, não bloqueadores — todas as pendências que a validação pós-correção confirmou como existentes foram endereçadas: a terceira cópia do Cofre foi eliminada, o HUD da sessão agora recebe o evento certo, as condições têm sua cobertura de automação documentada, os pré-requisitos de modificação são validados na compra, e o fluxo de veículo/propriedade está documentado (não alterado, por decisão consciente). As três decisões de design continuam explicitamente com você, sem nenhuma implementada silenciosamente.
