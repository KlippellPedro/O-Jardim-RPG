import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import test from 'node:test';

import classesData from '../../data/ficha/classes.json';
import magiasData from '../../data/ficha/magias.json';

// Decisão de 2026-10-20 (passada de tom, opção A): o texto das magias, das
// classes e das páginas de classe diz o que a coisa faz, em forma afirmativa.
// A trava pega as formas de antítese que o AGENTS.md proíbe; "em vez de"
// que só descreve a mecânica continua permitido.

const ANTITESES: Array<[string, RegExp]> = [
  ['"não é X, é Y"', /(?<!\p{L})não é [^.;:!?]{1,80}?[,:;] (?:e sim |mas )?(?:ele |ela |isso |aquilo )?é(?!\p{L})/iu],
  ['"não é X: Y"', /(?<!\p{L})não é [^.;:!?]{1,60}: /iu],
  ['"é A, não B"', /(?<!\p{L})é [^.;:!?]{1,60}, não (?:o|a|os|as|um|uma|de|do|da|dos|das|em|no|na|nos|nas) [^.;:!?,]{1,40}[.;]/iu],
  ['"não X, e sim Y"', /(?<!\p{L})não [^.;:!?]{1,80}, e sim(?!\p{L})/iu],
  ['"não faz X, faz Y"', /(?<!\p{L})não (\p{L}{3,}) [^,.;:!?]{1,40}, (?:mas )?\1(?!\p{L})/iu],
];

function* textosDe(no: unknown, rota: string): Generator<[string, string]> {
  if (typeof no === 'string') {
    yield [rota, no];
  } else if (Array.isArray(no)) {
    for (const [i, item] of no.entries()) yield* textosDe(item, `${rota}[${i}]`);
  } else if (no && typeof no === 'object') {
    for (const [chave, valor] of Object.entries(no)) yield* textosDe(valor, `${rota}.${chave}`);
  }
}

const achados = (fonte: string, textos: Iterable<[string, string]>) => {
  const lista: string[] = [];
  for (const [rota, texto] of textos) {
    for (const [nome, padrao] of ANTITESES) {
      const achado = padrao.exec(texto);
      if (achado) lista.push(`${fonte}${rota} ${nome}: ...${achado[0]}...`);
    }
  }
  return lista;
};

test('o catálogo de magias não usa antítese', () => {
  assert.deepEqual(achados('magias.json', textosDe(magiasData, '')), []);
});

test('as classes não usam antítese', () => {
  assert.deepEqual(achados('classes.json', textosDe(classesData, '')), []);
});

// Passada de tom de 2026-10-27: a mesma trava vale para o resto do conteúdo que o jogador e o Mestre leem,
// e passa a pegar também o travessão (— ou " - " como pausa) e a palavra "eco". Ficam de fora as anotações
// (chaves com "_") e os ids, que não aparecem na tela e não podem mudar sem migração. Os contos das
// Entidades (data/mundo/entidades.ts) são prosa do Criador e não entram.
const TRAVESSAO = /—| - (?!\d)/u;
const ECO = /(?<!\p{L})eco(?:a|am|ou|ar|ando|s)?(?!\p{L})/iu;
const CHAVES_SEM_TEXTO = new Set(['id', 'item']);

function* textosDoConteudo(no: unknown, rota: string): Generator<[string, string]> {
  if (typeof no === 'string') {
    yield [rota, no];
  } else if (Array.isArray(no)) {
    for (const [i, item] of no.entries()) yield* textosDoConteudo(item, `${rota}[${i}]`);
  } else if (no && typeof no === 'object') {
    for (const [chave, valor] of Object.entries(no)) {
      if (chave.startsWith('_') || CHAVES_SEM_TEXTO.has(chave)) continue;
      yield* textosDoConteudo(valor, `${rota}.${chave}`);
    }
  }
}

const foraDoTom = (fonte: string, dados: unknown) => {
  const textos = [...textosDoConteudo(dados, '')];
  const lista = achados(fonte, textos);
  for (const [rota, texto] of textos) {
    const traco = TRAVESSAO.exec(texto);
    if (traco) lista.push(`${fonte}${rota} travessão: ...${texto.slice(Math.max(0, traco.index - 40), traco.index + 30)}...`);
    const eco = ECO.exec(texto);
    if (eco) lista.push(`${fonte}${rota} "eco": ...${texto.slice(Math.max(0, eco.index - 40), eco.index + 30)}...`);
  }
  return lista;
};

const lerJson = (caminho: string) => JSON.parse(readFileSync(new URL(`../../${caminho}`, import.meta.url), 'utf8'));

const jsonsDaPasta = (pasta: string): string[] => readdirSync(new URL(`../../${pasta}/`, import.meta.url), { withFileTypes: true })
  .flatMap((entrada) => {
    if (entrada.isDirectory()) return jsonsDaPasta(`${pasta}/${entrada.name}`);
    return entrada.name.endsWith('.json') && !entrada.name.startsWith('_') ? [`${pasta}/${entrada.name}`] : [];
  });

test('raças, legados, marcas, pecados e virtudes seguem o tom: sem antítese, travessão ou "eco"', () => {
  for (const arquivo of ['racas', 'legados', 'legados-novos', 'legados-regras-v1', 'marcas-de-circulo', 'pecados-e-virtudes', 'pericias']) {
    assert.deepEqual(foraDoTom(`${arquivo}.json`, lerJson(`data/ficha/${arquivo}.json`)), [], arquivo);
  }
});

test('a Loja e o Bestiário seguem o tom: sem antítese, travessão ou "eco"', () => {
  assert.deepEqual(foraDoTom('catalogo.json', lerJson('data/loja/catalogo.json')), []);
  assert.deepEqual(foraDoTom('familias-propostas-v1.json', lerJson('data/bestiario/familias-propostas-v1.json')), []);
});

test('a lore do Mundo segue o tom: sem antítese, travessão ou "eco"', () => {
  const arquivos = jsonsDaPasta('data/mundo');
  assert.ok(arquivos.length >= 19, 'a pasta da lore encolheu');
  assert.deepEqual(arquivos.flatMap((arquivo) => foraDoTom(arquivo, lerJson(arquivo))), []);
});

test('as regras e o Guia do Mestre seguem o tom: sem antítese, travessão ou "eco"', () => {
  // regras-editorial.json é gerado de data/regras/*.ts (npm run generate:editorial-rules): corrija no .ts.
  assert.deepEqual(foraDoTom('regras-editorial.json', lerJson('data/regras/regras-editorial.json')), []);
});

test('magias e classes também ficam sem travessão e sem "eco" no que aparece na tela', () => {
  assert.deepEqual(foraDoTom('magias.json', magiasData), []);
  assert.deepEqual(foraDoTom('classes.json', classesData), []);
});

test('a trava de travessão e de "eco" não pega faixa de números nem id', () => {
  assert.ok(TRAVESSAO.test('Aqui fica o resto - sem pressa.'));
  assert.ok(TRAVESSAO.test('Um golpe — e acabou.'));
  assert.ok(!TRAVESSAO.test('Criaturas de 0 - 10 e níveis 1–4.'));
  assert.ok(ECO.test('O grito ecoou no salão.'));
  assert.ok(!ECO.test('Econômico e ecológico.'));
  assert.deepEqual(foraDoTom('', { id: 'eco-do-fluxo', titulo: 'Troco do Fluxo' }), []);
});

test('os idiomas do Jardim não usam antítese', () => {
  const idiomas = JSON.parse(readFileSync(new URL('../../data/mundo/Jardim/idiomas.json', import.meta.url), 'utf8'));
  const resumo = JSON.parse(readFileSync(new URL('../../data/mundo/Jardim/jardim.json', import.meta.url), 'utf8'))
    .entradas.find((entrada: { id: string }) => entrada.id === 'idiomas-do-jardim');
  assert.deepEqual(achados('idiomas.json', textosDe(idiomas.entradas.map((entrada: { conteudo: unknown }) => entrada.conteudo), '')), []);
  assert.deepEqual(achados('jardim.json', textosDe(resumo.conteudo, '')), []);
});

test('as páginas de classe não usam antítese', () => {
  const pasta = new URL('../../src/redesign/classe/', import.meta.url);
  const paginas = readdirSync(pasta).filter((arquivo) => arquivo.endsWith('.tsx'));
  assert.ok(paginas.length >= 20, 'as páginas de classe sumiram da pasta');
  const textos = paginas.map((arquivo): [string, string] => [arquivo, readFileSync(new URL(arquivo, pasta), 'utf8')]);
  assert.deepEqual(achados('', textos), []);
});

test('a trava reconhece as formas de antítese', () => {
  const pegou = (frase: string) => ANTITESES.some(([, padrao]) => padrao.test(frase));
  assert.ok(pegou('A marca não é enfeite, é peso.'));
  assert.ok(pegou('Esse caminho não é uma falha: ele recebe mais.'));
  assert.ok(pegou('É cura de fôlego longo, não de emergência.'));
  assert.ok(pegou('Um ruído que não se ouve com o ouvido, e sim com a cabeça.'));
  assert.ok(pegou('Um corte que não fere a pele, fere a mentira.'));
  assert.ok(!pegou('Buscas casuais não a encontram, a não ser que alguém saiba onde olhar.'));
  assert.ok(!pegou('Contra o que a criatura é de nascença, não adianta.'));
  assert.ok(!pegou('O conjurador troca de lugar com o aliado em vez de correr.'));
});
