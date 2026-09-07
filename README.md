# O Jardim RPG

Monorepositório da plataforma web, bots e dados oficiais de O Jardim RPG.

## Onde mexer

| Pasta | Responsabilidade |
| --- | --- |
| `src/` | Frontend React atual. Páginas, componentes, stores e serviços. |
| `data/` | Fonte única de todo conteúdo do RPG: ficha, regras, Mundo, Loja e arquivos gerados. |
| `public/` | Imagens, modelos 3D e outros arquivos servidos diretamente pelo Vite. |
| `plataforma/` | API Python/FastAPI, persistência e rotas do backend. |
| `bots/` | Bots do Discord e seus módulos compartilhados. |
| `tests/frontend/` | Testes das regras e da persistência do frontend. |
| `scripts/` | Compiladores determinísticos de dados. |
| `tools/` | Auditorias, normalizações e empacotamento manual. |
| `docs/` | Documentação consolidada, decisões do sistema e materiais de mesa. |

Comece pelo [índice da documentação](docs/README.md). Veja
[docs/GUIA_MANUTENCAO.md](docs/GUIA_MANUTENCAO.md) antes de alterar regras
ou estrutura. Para o editor do Painel do Criador, publicações globais e
personalizações por campanha, leia
[docs/EDITOR_CONTEUDO_CAMPANHA.md](docs/EDITOR_CONTEUDO_CAMPANHA.md).

## Comandos principais

```powershell
npm run dev
npm run test:frontend
npm run check:mundo
npm run check:rules-source
npm run build
```
