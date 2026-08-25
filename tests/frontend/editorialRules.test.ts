import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { REGRAS_OFICIAIS } from '../../data/regras/regras';
import { CONDICOES_OFICIAIS, CRISES_SANIDADE } from '../../data/regras/condicoes';
import { tituloTopico } from '../../data/regras/titulos';

interface EditorialRuleDocument {
  tipo: string;
  id: string;
  titulo: string;
  conteudo: unknown;
}

test('export editorial permanece sincronizado com o livro de regras', () => {
  const payload = JSON.parse(
    readFileSync(new URL('../../data/regras/regras-editorial.json', import.meta.url), 'utf8'),
  ) as { entradas: EditorialRuleDocument[] };
  const expected = Object.entries(REGRAS_OFICIAIS).map(([id, conteudo]) => ({
    tipo: 'regra',
    id,
    titulo: tituloTopico(id),
    conteudo,
  }));

  assert.deepEqual(payload.entradas, expected);
});

test('export editorial de condições permanece sincronizado com a fonte oficial', () => {
  const payload = JSON.parse(
    readFileSync(new URL('../../data/regras/condicoes-editorial.json', import.meta.url), 'utf8'),
  ) as { entradas: Array<Record<string, unknown>> };
  const expected = [
    ...CONDICOES_OFICIAIS.map((item) => ({ tipo: 'condicao', ...item })),
    ...CRISES_SANIDADE.map((item) => ({ tipo: 'crise', ...item })),
  ];

  assert.deepEqual(payload.entradas, expected);
});
