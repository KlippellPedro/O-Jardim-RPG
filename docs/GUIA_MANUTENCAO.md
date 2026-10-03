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

Os ritmos de nível (XP, Legado, atributo, item especial, graus de perícia,
patamares) e a Maestria de classe têm uma fonte só cada:
`data/ficha/progressao-niveis.json` e `data/ficha/maestria-classe.json`. Site
e plataforma leem os mesmos arquivos; mudou um número, atualize os testes
espelhados (`progressaoNiveis.test.ts` e `test_progressao_niveis.py`,
`maestriaClasse.test.ts` e `test_maestria_classe.py`) e os capítulos do livro,
que já leem o JSON. A referência de balanceamento se regera assim:

```powershell
npm run audit:balance
npm run check:balance
```

O `audit:balance` também grava `data/regras/curva-criatura-v1.json` (uma linha por
VD, de 1 a 1.000), que o gerador de criaturas (`src/services/curvaCriatura.ts`,
aba "Sob medida" do Bestiário) lê. Famílias, únicos e estágios do Bestiário
ficam em `data/bestiario/`:

```powershell
npm run check:familias
npm run bestiario:familias -- --metadados   # grava familia/estagio/papel/unico nas fichas
npm run bestiario:familias -- --novos       # só depois de aprovar os textos propostos
```

Depois de `--novos`: `npm run precos:normalizar`, `npm run audit:balance` e
`npm run generate:editorial-rules`.

A voz do Grande Sábio (`public/audio/sabio/`) precisa ser regravada quando muda
uma frase do painel de subida, um nome de Conquista ou uma classe. O script só
gera o que falta e um teste confere a cobertura:

```powershell
pip install edge-tts
python tools/gerar-voz-sabio.py
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

### Loja, preços e saque das criaturas

`data/loja/catalogo.json` é o catálogo único (Discord e site). Depois de mexer
nele:

```powershell
npm run catalogo:classificar   # onde cada item aparece na Loja
npm run precos:normalizar      # preços pela escala em data/economia/escala-precos-v1.json
npm run catalogo:check
```

O ZIP do Banqueiro carrega esse catálogo, então mudança nele pede reenviar o
Banqueiro. O saque das criaturas fica em `data/bestiario/loot-criaturas.json`,
lido **só pelo servidor** (`plataforma/core/loot_criaturas.py`); ele não entra no
bundle do navegador nem pode ser importado por `src/` fora do editor do Mestre,
e o ZIP da plataforma precisa levar `dataestiario`.

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
Teste pulado não equivale a teste aprovado. Sem banco, só uma parte dos testes
roda; o fechamento de 2026-10-03 usou um Postgres efêmero em Docker (998 testes da
plataforma passando). Para subir a API contra esse banco, defina `DATABASE_URL`,
`APP_ENV=development` e `AUTOMATIC_BACKUP_ENABLED=false`: o `.env` da plataforma
pode ligar o backup automático, que rodaria a rotação dos backups reais.

Tabela nova no schema precisa entrar em `TABELAS` de `plataforma/core/backup.py`;
um teste confere que o backup cobre todas as tabelas.

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
