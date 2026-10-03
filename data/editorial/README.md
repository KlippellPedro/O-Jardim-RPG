# Snapshots editoriais de campanha

A arquitetura completa, as garantias de segurança e o procedimento de
manutenção estão em
[docs/EDITOR_CONTEUDO_CAMPANHA.md](../../docs/EDITOR_CONTEUDO_CAMPANHA.md).

O conteúdo oficial continua nos arquivos de `data/`. Há dois tipos de
publicação, e cada um tem seu painel:

- **Global (Mundo inteiro):** Lore, Cronologia e Entidades novas, só pelo Criador,
  no **Painel do Criador** (`/criador`). Vale para todas as campanhas. O snapshot
  revisável é `data/editorial/global.json`.
- **Por campanha:** Loja, Regras narrativas e visibilidade, que valem só na
  campanha selecionada. O snapshot vai em `data/editorial/campanhas/<id>.json`.

A quarta aba do Painel do Criador, **Convites**, não publica conteúdo: gera
convites para criar conta e não tem snapshot.

Ambos ficam no PostgreSQL; os arquivos aqui são só cópia para revisão no Git.

Para manter uma cópia revisável junto do código:

1. no painel da área (Lore e Cronologia exportam o formato global; Loja e Regras, o da campanha), clique em **Exportar publicados**;
2. sincronize o arquivo baixado com:

   `npm run editorial:sync -- C:\caminho\conteudo-publicado-campanha.json`

O comando grava `data/editorial/campanhas/<id-da-campanha>.json` (ou `global.json`, se o arquivo baixado for global). Esse snapshot
é a referência correta para revisar as personalizações publicadas sem confundi-las
com a biblioteca oficial compartilhada por todas as campanhas.

O snapshot pode conter orientações privadas do mestre. Não o coloque em um
repositório público nem o entregue aos jogadores sem revisar seu conteúdo.
