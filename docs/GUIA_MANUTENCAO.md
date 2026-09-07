# Guia de manutenção

Este documento indica o ponto de entrada de cada tipo de mudança. A regra geral é manter apresentação, regra e persistência em módulos diferentes.

O [índice de docs](README.md) reúne as referências por assunto. Decisões e
pendências de regras estão em [Balanceamento](sistema/BALANCEAMENTO.md);
contratos entre sistemas, em [Integração](sistema/INTEGRACAO.md). Relatórios
antigos ficam acessíveis pelo [histórico](HISTORICO.md), sem outra cópia ativa.

## Frontend

- `src/pages/`: telas ligadas às rotas. A ficha fica em `src/pages/Ficha/`.
- `src/pages/Ficha/abas/`: composição de cada aba da ficha.
- `src/pages/Ficha/components/`: blocos reutilizáveis e modais da ficha.
- `src/components/`: componentes compartilhados pelo site inteiro.
- `src/services/`: cálculos, regras, chamadas HTTP e transformações. Regras não devem ser recriadas dentro de JSX.
- `src/store/`: estado global e fila de salvamento. Alterações de persistência devem começar aqui.
- `src/types/`: contratos TypeScript compartilhados.
- `data/`: fonte única de regras, Mundo, ficha, Loja e catálogos auxiliares.

### Ficha

`src/pages/Ficha/PersonagemSheet.tsx` controla a navegação das abas. `AbaFicha.tsx` coordena estado e regras da página principal; os blocos visuais de atributos e recursos ficam em componentes próprios. Para localizar uma função, procure primeiro pela aba e depois pelo service importado por ela.

## Dados

Os JSONs de `data/ficha/` são a fonte editável dos catálogos. `src/services/catalogoService.ts` é o ponto único que os carrega para o React.

O conteúdo de `data/mundo/` é compilado para `data/gerado/mundoCatalog.ts`. Depois de editar o Mundo, execute:

```powershell
npm run build:mundo
npm run check:mundo
npm run generate:server-content
npm run check:server-content
```

As regras públicas partem de `data/regras/regras.ts` e geram `data/regras/regras-publicas-v1.md`:

```powershell
npm run generate:rules
npm run generate:editorial-rules
npm run check:rules-source
```

O exportador editorial produz a base de Regras usada pelo backend. O seed
`data/gerado/conteudo-servidor.json` guarda contos, facções e metadados para o
servidor; não deve ser publicado como asset. O build já executa sua geração.
Os detalhes de rascunho, publicação, snapshots e visibilidade ficam apenas no
[guia do editor](EDITOR_CONTEUDO_CAMPANHA.md).

## Backend e bots

- `plataforma/main.py`: inicialização da API.
- `plataforma/routers/`: endpoints agrupados por domínio.
- `plataforma/core/`: configuração, banco e serviços internos.
- `bots/*/main.py`: entrada de cada bot.
- `bots/shared/`: recursos reutilizados entre bots.

Segredos devem ficar em `.env`, nunca em arquivos versionados.

## Arquivos gerados

Não edite nem versione como fonte:

- `dist/`: build do Vite; recriado por `npm run build`.
- `node_modules/`: dependências; recriadas por `npm install`.
- `*.tsbuildinfo`: cache incremental do TypeScript.
- `.pytest_cache/` e `__pycache__/`: caches de testes/Python.
- `*-discloud.zip`: pacotes de implantação recriados por `tools/build-discloud-packages.ps1`.

## Verificação mínima

Após mudar frontend ou regras, rode `npm run test:frontend` e `npm run build`. Após mudar dados do Mundo ou regras públicas, rode também os respectivos comandos `check:*`.

Para alterações na fronteira de conteúdo público/reservado, rode
`npm run test:security`. Para backend, execute `python -m pytest -q` no
ambiente de `plataforma/`; para bots, no ambiente do bot correspondente.
Casos dependentes de PostgreSQL exigem `TEST_DATABASE_URL` de banco descartável.
Teste pulado não equivale a teste aprovado.

Mudanças apenas em documentação exigem revisão de referências, links e
coerência de status; não precisam de rebuild da aplicação.

## PDFs e organização documental

Os comandos `docs:props`, `docs:guias`, `docs:livro` e `docs:livro:mestre` estão
descritos em [tools/documentos-mundo/README.md](../tools/documentos-mundo/README.md).
Os PDFs versionados são saídas para consulta/mesa, não fontes editáveis das
regras. Preserve a distinção entre edição pública e conteúdo reservado do Mestre.

Ao fechar uma auditoria ou decisão, atualize o documento temático existente em
`docs/sistema/`. Guarde data, justificativa, evidência e pendências no próprio
tema; evite outra sequência de arquivos de proposta, implementação e “final”.
