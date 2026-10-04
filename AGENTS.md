# Instruções para IAs neste repositório

O checkout principal deste projeto está em
`C:\D.E.V\T.D.S\Diversos\RPG\Pessoais\O-Jardim-RPG`. Não faça alterações na
cópia antiga que fica dentro do OneDrive.

Antes de modificar o editor do Painel do Criador, a lore, a cronologia, as regras
ou a loja, leia [docs/EDITOR_CONTEUDO_CAMPANHA.md](docs/EDITOR_CONTEUDO_CAMPANHA.md).
Esse documento explica a separação entre conteúdo oficial, editorial global de
Mundo, publicações por campanha e snapshots destinados à revisão no repositório.

Regras essenciais:

- Preserve alterações não relacionadas que já estejam no worktree, sobretudo
  edições de classes feitas pelo usuário.
- `data/` é a fonte oficial compartilhada. O editor web não altera esses
  arquivos: ele grava sobreposições no PostgreSQL.
- Para conhecer o Mundo efetivo, combine a base em `data/` com o snapshot global
  mais recente em `data/editorial/global.json`. Loja e Regras ainda podem exigir
  o snapshot em `data/editorial/campanhas/<campanha-id>.json`. Se o snapshot
  relevante estiver ausente ou desatualizado, não adivinhe: consulte o banco ou
  peça uma nova exportação pelo Painel do Criador.
- Nunca exponha rascunhos ou `corpoMestre` a jogadores e nunca transforme campos
  mecânicos em campos editáveis sem uma decisão explícita de arquitetura.
- Não faça commit, gere ZIP ou publique na Discloud sem pedido explícito do
  usuário. Ao commitar, liste os arquivos um a um (nunca `git add -u`): o usuário
  edita em paralelo e o WIP dele não pode entrar junto.
- `data/bestiario/loot-criaturas.json` (saque das criaturas) é lido só pelo
  servidor. Não importe esse arquivo no navegador nem o coloque no bundle.
- `data/bestiario/lendas-v1.json` (Livro da Verdade: a verdade, a consequência e a
  manchete de cada uma das 28 lendas) também é só do servidor: o texto de uma lenda
  que ainda está de pé é segredo da mesa. Os selos "Matador de ..." ficam fora do
  manifest de voz do Sábio pelo mesmo motivo.
- `data/bestiario/deidades-v1.json` (fichas das Deidades) também é só do
  servidor e só chega a quem comanda a mesa; o campo Estado revela segredos de
  lore. O texto de referência é a seção "Fichas das Deidades" do Guia do Mestre.
- Mudar o id de uma criatura do catálogo exige migração que leve as chaves
  (`sessao_participantes.monstro_id`, `loot_campanha`, inventário, cofre,
  publicações do catálogo). Foi o que a migração 50 fez em 2026-10-03.
- Toda tabela nova do schema da plataforma entra em `TABELAS` de
  `plataforma/core/backup.py`; um teste cobra.
- Para testes com banco, use um PostgreSQL descartável (`TEST_DATABASE_URL`) e,
  ao subir a API contra ele, `APP_ENV=development` e
  `AUTOMATIC_BACKUP_ENABLED=false`, senão o `.env` pode rotacionar backups
  reais. Detalhes em `docs/GUIA_MANUTENCAO.md`.
- Texto para o jogador: sem travessão, sem "eco" e sem a antítese "não é X, é Y".
- O mural de novidades (`src/data/novidades-manuais.json`) é manual: toda leva
  de mudança visível ao jogador ganha uma entrada em linguagem de jogador.
