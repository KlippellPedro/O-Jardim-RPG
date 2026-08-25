# Snapshots editoriais de campanha

A arquitetura completa, as garantias de segurança e o procedimento de
manutenção estão em
[docs/EDITOR_CONTEUDO_CAMPANHA.md](../../docs/EDITOR_CONTEUDO_CAMPANHA.md).

O conteúdo oficial continua nos arquivos de `data/`. Personalizações feitas no
Painel do Mestre são publicadas no PostgreSQL e sobrepostas apenas na campanha.

Para manter uma cópia revisável junto do código:

1. no Painel do Mestre, abra **Conteúdo** e clique em **Exportar publicados**;
2. sincronize o arquivo baixado com:

   `npm run editorial:sync -- C:\caminho\conteudo-publicado-campanha.json`

O comando grava `data/editorial/campanhas/<id-da-campanha>.json`. Esse snapshot
é a referência correta para revisar as personalizações publicadas sem confundi-las
com a biblioteca oficial compartilhada por todas as campanhas.

O snapshot pode conter orientações privadas do mestre. Não o coloque em um
repositório público nem o entregue aos jogadores sem revisar seu conteúdo.
