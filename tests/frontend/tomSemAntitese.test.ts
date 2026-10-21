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
