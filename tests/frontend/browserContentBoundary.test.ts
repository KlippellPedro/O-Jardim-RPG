import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { browserContentBoundary, browserContentSource } from '../../tools/browser-content-boundary.ts';
import { REGRAS_OFICIAIS } from '../../data/regras/regras.ts';
import { ENTIDADES } from '../../data/mundo/entidades.ts';
import { MUNDO_CATALOG } from '../../data/gerado/mundoCatalog.ts';

test('projeção remove corpos reservados inclusive em objetos aninhados', () => {
  const source = 'export const rules = { publico: { corpo: "permitido", "corpoMestre": `SEGREDO`, anexo: { corpoMestre: "ANEXO" } }, mestre: { corpo: "CAPITULO" } };';
  const output = browserContentSource(source, '/repo/data/regras/regras.ts');
  assert.match(output, /permitido/);
  assert.doesNotMatch(output, /SEGREDO|ANEXO|CAPITULO/);
});

test('catálogos completos não entram na projeção do navegador', () => {
  for (const file of ['data/gerado/mundoCatalog.ts', 'data/mundo/entidades.ts']) {
    const filename = path.resolve(file);
    const original = fs.readFileSync(filename, 'utf8');
    const result = browserContentSource(original, filename);
    assert.ok(result.length < original.length / 2);
    assert.equal(fs.readFileSync(filename, 'utf8'), original);
  }
});

test('importações brutas e snapshots privados são recusados', () => {
  const load = browserContentBoundary().load as (id: string) => unknown;
  for (const file of ['data/editorial/global.json', 'data/gerado/conteudo-servidor.json',
    'data/regras/regras-editorial.json', 'data/regras/mestre-v1.json',
    'data/gerado/mundoCatalog.ts?raw', 'data/mundo/entidades.ts?raw',
    'data/mundo/cronicas-arvores.json?raw', 'data/mundo/faccoes.json?raw']) {
    assert.throws(() => load('/repo/' + file), undefined, file);
  }
  assert.deepEqual(JSON.parse(load('/repo/data/mundo/faccoes.json') as string), { faccoes: [] });
});

test('build de produção não contém trechos privados de regras e contos', () => {
  const assets = fs.readdirSync('dist/assets').filter(file => file.endsWith('.js'));
  assert.ok(assets.length > 0, 'execute npm run build antes do teste');
  const bundle = assets.map(file => fs.readFileSync(path.join('dist/assets', file), 'utf8')).join('\n');
  const publicRules = Object.entries(REGRAS_OFICIAIS).filter(([id]) => id !== 'mestre').map(([, rule]) => rule.corpo).join('\n');
  const privateRules = Object.entries(REGRAS_OFICIAIS).flatMap(([id, rule]) => [rule.corpoMestre || '', id === 'mestre' ? rule.corpo : '']);
  const stories = ENTIDADES.flatMap(entity => entity.conto.flatMap(section => section.paragrafos));
  const lore = MUNDO_CATALOG.filter(entry => entry.revelado === false).map(entry => JSON.stringify(entry.conteudo));
  let checked = 0;
  for (const source of [...privateRules, ...stories, ...lore]) {
    for (const fragment of source.match(/[^<>\n"\\]{100,180}/g) || []) {
      if (publicRules.includes(fragment)) continue;
      assert.ok(!bundle.includes(fragment), 'Trecho reservado presente no bundle: ' + fragment.slice(0, 60));
      checked++;
    }
  }
  assert.ok(checked > 100, `Cobertura insuficiente: ${checked}`);
  assert.ok(!fs.existsSync('dist/data/gerado/conteudo-servidor.json'));
});
