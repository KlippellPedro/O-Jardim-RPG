# Editor de conteúdo global e por campanha

Este documento é a referência de manutenção do editor do Painel do Criador.
Lore e Cronologia são globais. Loja, Regras, visibilidade e liberações continuam
pertencendo à campanha selecionada.

## Regra de escopo

| Área | Escopo da publicação | Quem edita |
| --- | --- | --- |
| Lore / Conteúdo do Mundo | Global: vale para todas as campanhas | Somente o Criador |
| Cronologia | Global: vale para todas as campanhas | Somente o Criador |
| Loja | Campanha selecionada | Criador responsável pela campanha |
| Regras narrativas | Campanha selecionada | Criador responsável pela campanha |
| Visibilidade e liberações | Campanha selecionada | Criador/Mestre conforme a permissão da tela |

No Mundo, o editor permite criar, editar, mover entre categorias, excluir e
restaurar. A campanha selecionada no topo do painel não altera o escopo de Lore
ou Cronologia.

## Rascunho, publicação e exclusão

Toda mudança editorial passa por duas etapas:

1. **Salvar rascunho** grava a edição privada no PostgreSQL. Jogadores continuam
   recebendo a última publicação, ou a base oficial quando não há publicação.
2. **Publicar** torna o rascunho ativo e cria uma revisão imutável no histórico.

Restaurar uma revisão apenas cria um novo rascunho. O Criador precisa publicar
novamente. Excluir uma entrada de Mundo publica um documento com
`excluido: true`; isso a remove de todas as campanhas, mas preserva dados e
histórico para restauração. Uma entrada global nova que nunca foi publicada pode
ser apagada fisicamente.

## Fontes da verdade

| Camada | Onde fica | Função |
| --- | --- | --- |
| Base oficial | `data/mundo/`, `data/regras/`, `data/ficha/` e `data/loja/` | Base compartilhada carregada no deploy. |
| Editorial global de Mundo | PostgreSQL: `conteudo_global_editorial` | Rascunhos e publicações de Lore/Cronologia usadas por todas as campanhas. |
| Editorial por campanha | PostgreSQL: `informacoes_campanha` e `catalogo_itens_campanha` | Regras, Loja, visibilidade e liberações específicas. |
| Snapshot global | `data/editorial/global.json` | Espelho revisável das publicações globais; não é lido automaticamente pelo site. |
| Snapshot de campanha | `data/editorial/campanhas/<campanha-id>.json` | Espelho revisável das publicações específicas; não é lido automaticamente pelo site. |

O Mundo efetivo é resolvido assim:

```text
biblioteca oficial de data/
        +
publicação global com a mesma chave de origem
        =
mesmo Mundo entregue a todas as campanhas
```

Uma mudança de categoria preserva `chave_origem` como identidade de
armazenamento. O tipo novo fica no documento publicado; assim, por exemplo,
`reino:biblioteca-de-arkarin` pode aparecer como `local` sem deixar uma cópia em
`reino`. Entradas criadas no editor são acrescentadas ao resultado. Publicações
marcadas com `excluido: true` são omitidas. Rascunhos nunca entram na resolução.

Regras continuam sendo resolvidas como base oficial mais publicação da campanha.
Loja usa o catálogo oficial mais `catalogo_itens_campanha`. Visibilidade e
liberações podem ocultar conteúdo global para jogadores de uma campanha, mas não
criam uma versão diferente da lore.

## Ficha editorial das Árvores

A entrada global `cronologia:cronicas-arvores` não contém apenas marcos de tempo.
Ela também é a fonte dos textos das páginas das Árvores: apresentação geral,
nome exibido, lema, descrição principal (`tese`), atmosfera, temas, História,
lugares resumidos e cronologia. A aba **Árvores e Crônicas** edita essa estrutura
inteira e publica o documento como uma unidade versionada.

Deidade, Fluxo, Galho, Dimensão, Reino e Local continuam sendo registros de Lore
independentes. Eles devem ser criados, movidos, editados ou excluídos na aba
**Lore**, porque também formam a árvore navegável e podem ter relações próprias.
O `id` canônico da Árvore permanece estrutural e não é editável; o campo `nome`
da Crônica controla apenas o nome apresentado na página de conteúdo.

## Persistência e migração

As tabelas globais são:

- `conteudo_global_editorial`: rascunho, publicação, chave de origem, versão e
  datas do Mundo global;
- `revisoes_conteudo_global`: histórico imutável das publicações globais;
- `eventos_auditoria`: ator, ação e alvo das mutações. Eventos globais têm
  `campanha_id` nulo.

A migração 33 promove para a camada global as edições de Mundo versionadas que
antes estavam em `informacoes_campanha`. Para chaves presentes em mais de uma
campanha, a linha atualizada mais recentemente é escolhida. Publicações antigas
usadas apenas para acesso/visibilidade, sem rascunho, revisão ou incremento de
versão, não são promovidas.

O seed continua atualizando `biblioteca_conteudo`, mas nunca apaga ou sobrescreve
`conteudo_global_editorial`. Portanto uma recarga dos arquivos em `data/` não
desfaz as decisões publicadas pelo Criador.

## Exportação e sincronização

Nas abas Lore e Cronologia, **Exportar publicados** baixa o formato global:

```json
{
  "formato": "o-jardim-conteudo-global",
  "versao_formato": 1,
  "gerado_em": "data ISO-8601",
  "conteudo": []
}
```

Sincronize-o no checkout correto:

```powershell
npm run editorial:sync -- C:\caminho\conteudo-global-publicado.json
```

O destino padrão é `data/editorial/global.json`. Para promover explicitamente
uma exportação antiga de campanha para o snapshot global, use:

```powershell
npm run editorial:sync -- C:\caminho\conteudo-publicado-campanha.json --global
```

Nas abas Loja e Regras, a exportação mantém o formato
`o-jardim-conteudo-publicado` e o destino
`data/editorial/campanhas/<campanha-id>.json`.

Snapshots podem conter material privado. Eles devem ser revisados antes de ir
para um repositório público e nunca devem ser entregues diretamente a jogadores.

## Endpoints

Mundo global:

```text
GET    /conteudo/editor-global
PUT    /conteudo/editor-global/rascunho
POST   /conteudo/editor-global/{id}/publicar
DELETE /conteudo/editor-global/{id}
GET    /conteudo/editor-global/{id}/revisoes
POST   /conteudo/editor-global/{id}/revisoes/{revisao_id}/restaurar
GET    /conteudo/editor-global/exportar
```

Regras por campanha e resolução:

```text
GET  /conteudo/editor
PUT  /conteudo/editor/rascunho
POST /conteudo/editor/{id}/publicar
GET  /conteudo/editor/{id}/revisoes
POST /conteudo/editor/{id}/revisoes/{revisao_id}/restaurar
GET  /conteudo/editor/exportar
GET  /conteudo/resolvido
```

Operações globais exigem o cargo de Criador. Mutações também exigem CSRF.
Salvamento, publicação, exclusão e restauração usam `versao_esperada`; conflito
concorrente retorna HTTP 409 e nunca deve ser sobrescrito silenciosamente.

## Mapa de arquivos

| Arquivo | Responsabilidade |
| --- | --- |
| `src/pages/Criador/CreatorPage.tsx` | Painel exclusivo do Criador. |
| `src/components/Settings/ConteudoMestrePanel.tsx` | Abas e exportação conforme o escopo. |
| `src/components/Settings/ConteudoLorePanel.tsx` | CRUD global de Lore e movimentação de categorias. |
| `src/components/Settings/CronologiaPanel.tsx` | Editor global da ficha narrativa das Árvores e de suas cronologias. |
| `src/components/Settings/CatalogoLojaPanel.tsx` | Editor da Loja por campanha. |
| `src/components/Settings/RegrasEditorPanel.tsx` | Editor narrativo de Regras por campanha. |
| `src/services/conteudoEditorialApi.ts` | Contratos HTTP globais e por campanha. |
| `plataforma/routers/content.py` | Persistência, revisão, resolução e exportação. |
| `plataforma/core/content_seed.py` | Carga da base oficial. |
| `plataforma/core/schema.py` | Migrações das tabelas editoriais. |
| `tools/sync-editorial-snapshot.mjs` | Validação e sincronização dos snapshots. |

## Garantias obrigatórias

- Jogadores nunca recebem rascunhos nem `corpoMestre`.
- Alterações globais de Mundo não dependem de `campanha_id`.
- Exclusão oficial preserva a base de `data/` e usa o marcador publicado.
- Mudança de categoria preserva a chave de origem e não duplica a entrada.
- Restauração cria rascunho; publicar continua sendo uma ação explícita.
- Toda mutação respeita concorrência otimista e registra auditoria.
- Campos mecânicos de Regras continuam protegidos pelo backend.
- O servidor implantado nunca escreve no Git; a ponte é exportar e executar
  `editorial:sync` localmente.

## Validação antes da entrega

```powershell
npm run test:frontend
npm run build
npm run check:mundo
Set-Location plataforma
.\.venv\Scripts\python.exe -m pytest -q
```

Além dos testes, confira com Criador e jogador que: salvar não publica; publicar
muda todas as campanhas; mover não duplica; excluir remove globalmente;
restaurar não publica; e visibilidade da campanha ainda pode ocultar entradas.
