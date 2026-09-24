import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
// @ts-expect-error módulo .mjs sem tipos
import { montarNovidades } from '../../tools/novidades-lib.mjs';
import { ehMadrugada, sequenciaCompleta, SEQUENCIA_KONAMI } from '../../src/components/descobertas/gatilhos';
import { agruparPorDia } from '../../src/pages/novidades';

test('a lista junta so entradas validas, sem repetir id, da mais nova para a mais antiga', () => {
  const itens = montarNovidades([
    { id: 'a', data: '2026-09-20', titulo: 'antiga' },
    { id: 'b', data: '2026-09-22', titulo: 'nova' },
    { id: 'b', data: '2026-09-23', titulo: 'repetida' },
    { id: 'c', data: 'ontem', titulo: 'data ruim' },
    { id: 'd', data: '2026-09-22', titulo: '' },
  ]);
  assert.deepEqual(itens.map((i: { id: string }) => i.id), ['b', 'a']);
});

test('o mural publicado vem so das novidades escritas a mao, sem travessao', () => {
  const manuais = JSON.parse(readFileSync(new URL('../../src/data/novidades-manuais.json', import.meta.url), 'utf8'));
  const publicado = JSON.parse(readFileSync(new URL('../../src/data/novidades.json', import.meta.url), 'utf8'));
  assert.deepEqual(publicado.itens.map((i: { id: string }) => i.id).sort(), manuais.itens.map((i: { id: string }) => i.id).sort());
  assert.ok(!JSON.stringify(publicado).includes('—'));
});

test('novidades agrupam por dia mantendo a ordem', () => {
  const grupos = agruparPorDia([{ data: 'b' }, { data: 'b' }, { data: 'a' }]);
  assert.deepEqual(grupos.map((g) => g.itens.length), [2, 1]);
});

test('gatilhos de teclado e hora', () => {
  assert.equal(sequenciaCompleta(['x', ...SEQUENCIA_KONAMI], SEQUENCIA_KONAMI), true);
  assert.equal(sequenciaCompleta(SEQUENCIA_KONAMI.slice(1), SEQUENCIA_KONAMI), false);
  assert.equal(ehMadrugada(new Date(2026, 8, 21, 3, 0)), true);
  assert.equal(ehMadrugada(new Date(2026, 8, 21, 5, 0)), false);
});
