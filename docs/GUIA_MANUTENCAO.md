# Guia de manutenção

Este documento indica o ponto de entrada de cada tipo de mudança. A regra geral é manter apresentação, regra e persistência em módulos diferentes.

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
```

As regras públicas partem de `data/regras/regras.ts` e geram `data/regras/regras-publicas-v1.md`:

```powershell
npm run generate:rules
npm run check:rules-source
```

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
