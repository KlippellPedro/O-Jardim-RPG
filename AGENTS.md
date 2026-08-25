# Instruções para IAs neste repositório

O checkout principal deste projeto está em
`C:\D.E.V\T.D.S\Diversos\RPG\Pessoais\O-Jardim-RPG`. Não faça alterações na
cópia antiga que fica dentro do OneDrive.

Antes de modificar o editor do Painel do Mestre, a lore, a cronologia, as regras
ou a loja, leia [docs/EDITOR_CONTEUDO_CAMPANHA.md](docs/EDITOR_CONTEUDO_CAMPANHA.md).
Esse documento explica a separação entre conteúdo oficial, rascunhos,
publicações por campanha e snapshots destinados à revisão no repositório.

Regras essenciais:

- Preserve alterações não relacionadas que já estejam no worktree, sobretudo
  edições de classes feitas pelo usuário.
- `data/` é a fonte oficial compartilhada. O editor web não altera esses
  arquivos: ele grava sobreposições no PostgreSQL.
- Para conhecer o conteúdo efetivo de uma campanha, combine a base em `data/`
  com o snapshot mais recente em `data/editorial/campanhas/<campanha-id>.json`.
  Se o snapshot estiver ausente ou desatualizado, não adivinhe: consulte o banco
  ou peça uma nova exportação pelo Painel do Mestre.
- Nunca exponha rascunhos ou `corpoMestre` a jogadores e nunca transforme campos
  mecânicos em campos editáveis sem uma decisão explícita de arquitetura.
- Não faça commit, gere ZIP ou publique na Discloud sem pedido explícito do
  usuário.

