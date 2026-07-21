# Plano vigente: Banco Central do O Jardim na Discloud

> Decisão atual de 16/07/2026: o PostgreSQL ficará na própria Discloud,
> junto dos bots e dos futuros sites. Supabase e Neon não fazem mais parte da
> arquitetura planejada.

## Arquitetura decidida

- PostgreSQL criado pelo catálogo de Templates da Discloud.
- Bots e banco conectados por VLAN privada.
- Cada bot/site e o PostgreSQL são aplicações separadas na Discloud; a VLAN é
  o que as reúne com comunicação privada.
- Cada aplicação recebe a conexão por `DATABASE_URL`; nenhuma senha no Git.
- O PostgreSQL será a fonte única de verdade para economia, catálogo, fichas,
  liberações e, futuramente, VTT.
- JSONs atuais servem apenas para migração/semente. O uso normal não deve
  depender de importar ou exportar arquivos.

## Estado real

| Parte | Estado | Fonte de dados atual |
| --- | --- | --- |
| Banqueiro: economia (carteira, cofre, cartão, roubo) | Migrado | PostgreSQL |
| Banqueiro: catálogo | Migrado | `catalogo_itens` no PostgreSQL; JSON só semeia banco vazio |
| Jornalista: baús automáticos | Migrado | mesmo PostgreSQL do Banqueiro (`baus_config`, leitura de `estacao`/`catalogo_itens`) |
| Barista: playlist e `/menu` | Migrado (opcional) | mesmo PostgreSQL do Banqueiro (`playlist`, `playlist_faixa`, débito em `carteira`/`extrato`) — único bot em que a conexão é opcional, não trava o boot |
| Ficha web | Integrada | API/PostgreSQL; migração local automática uma vez |
| Loja web | Integrada | catálogo central liberado pelo mestre |
| Mundo web | Integrado | biblioteca central liberada pelo mestre |
| Dashboard do mestre | Integrado (base) | campanhas, convites e liberações de conteúdo |
| Cofre Discord | Integrado | recompensa na conta; jogador escolhe personagem |
| VTT | Futuro | ainda não existe |

### Fundação implementada em 16/07/2026

- API inicial em `plataforma/` com contas, sessões, campanhas e papéis.
- Personagens versionados e associados a campanha/dono.
- Liberações de conhecimento por usuário, personagem ou papel.
- Vínculo seguro entre conta web, Discord e servidor da campanha.
- Carteira/inventário por personagem com operações idempotentes para bots.
- Auditoria administrativa.
- Portal web de conta/campanha ativo em `src/plataforma/`.
- Cofre por conta/campanha com transferência auditada para personagem.
- Loja e Mundo publicados pelo mestre sem upload de JSON no uso normal.

## Esquema (Banqueiro + Jornalista + Barista, mesmo PostgreSQL)

O antigo Consultor virou dois bots separados que compartilham o mesmo banco
central, e o Barista se juntou a eles depois (só pra playlist e `/menu`) —
cada um só cria/usa as tabelas que precisa (`CREATE TABLE IF NOT
EXISTS`, então não importa qual sobe primeiro):

- `carteira` — dinheiro "vivo", pode ser roubado. Banqueiro lê/escreve;
  Jornalista só credita no fallback de entrega de baú; Barista só debita
  (compra no `/menu`).
- `inventario` — itens. Mesmo padrão de acesso que `carteira`.
- `cofre` — tier do armazém de itens (capacidade). Banqueiro lê/escreve;
  Jornalista só lê (checar se cabe item no fallback).
- `cofre_saldo` — dinheiro **guardado** (itens **e** dinheiro), defensável
  por segurança comprada (`/cofre_seguranca_melhorar`), com juros
  (`/cofre_depositar`, `/cofre_sacar`, `/juros_cofre`). Só o Banqueiro usa.
- `roubo_cooldown` / `roubo_cofre_cooldown` — cooldowns de `/roubar` e
  `/roubar_cofre`, independentes. Só o Banqueiro usa.
- `roubo_protecao_vitima` — grace period de quem acabou de ser roubado da
  carteira. Só o Banqueiro usa.
- `recompensa` — recompensa acumulada na cabeça de um jogador (colocada por
  outro jogador e/ou pelo sistema por dívida). Só o Banqueiro usa; quem
  rouba a carteira/cofre de um alvo com recompensa ativa leva junto.
- `avisos_pendentes` — fila de anúncios: o Banqueiro escreve (recompensa
  colocada, procurado por dívida, captura), o Jornalista lê a cada minuto,
  publica no canal do jornal e marca como lido.
- `extrato` — histórico de transações. Banqueiro escreve em toda operação
  de dinheiro; Barista escreve uma linha por compra no `/menu` (assim a
  compra aparece no `/extrato` do Banqueiro também).
- `playlist` / `playlist_faixa` — playlists nomeadas de música (nome, dono,
  faixas em ordem). Só o Barista usa.
- `cartao` — Cartão Lunar (crédito, tier). Crédito sobe/desce sozinho com o
  tempo conforme a dívida (ver `core/economia.py` no Banqueiro). Só o
  Banqueiro usa.
- `config` — câmbio, canal do jornal e regras de `/roubar_cofre`
  (`/setroubo`, por servidor). Banqueiro escreve; Jornalista só lê o canal
  do jornal daqui.
- `baus_config` — agendamento dos baús automáticos (canal, janela de
  horário). Só o Jornalista usa.
- `baus_estoque` — baús **comprados** (loja de baús), ainda não abertos.
  Só o Banqueiro usa (compra/abre); não é o mesmo fluxo dos baús automáticos.
- `estacao` — estação do Jardim (afeta o peso de raridade do loot). Banqueiro
  escreve (`/estacao_definir`); Jornalista só lê pra sortear os baús.
- `catalogo_itens` — catálogo central de itens. Banqueiro semeia (JSON) e
  lê; Jornalista só lê.

As tabelas são criadas com operações idempotentes no primeiro boot. O catálogo
é semeado somente quando `catalogo_itens` está vazia (e só pelo Banqueiro).

## Ordem segura

1. Criar o PostgreSQL na Discloud, habilitar VLAN e guardar as credenciais.
2. Configurar `DATABASE_URL` no Banqueiro (e no Jornalista, mesmo banco) e
   validar economia + catálogo + baús automáticos.
3. Configurar backups antes de migrar dados importantes.
4. Criar uma API autenticada para ficha, loja e dashboard. O navegador nunca
   deve receber a senha do PostgreSQL diretamente.
5. Migrar personagens, catálogos e liberações para a API/banco.
6. Conferir os dados e só então remover as telas antigas de import/export.
7. Construir o VTT sobre a mesma API depois que as bases anteriores estiverem
   estáveis.

## Regra de segurança

- Produção e testes usam bancos separados.
- Testes de integração criam um schema temporário e nunca apagam tabelas do
  schema de produção.
- Tokens, senhas e URLs reais ficam apenas nas Variáveis da Discloud ou em
  `.env` local ignorado pelo Git.
