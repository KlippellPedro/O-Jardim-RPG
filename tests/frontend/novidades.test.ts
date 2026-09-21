import assert from 'node:assert/strict';
import test from 'node:test';
// @ts-expect-error módulo .mjs sem tipos
import { interpretarCommit, lerLogDoGit, montarNovidades } from '../../tools/novidades-lib.mjs';
import { ehMadrugada, sequenciaCompleta, SEQUENCIA_KONAMI } from '../../src/components/descobertas/gatilhos';
import { agruparPorDia } from '../../src/pages/novidades';

test('so feat, fix e perf viram novidade', () => {
  assert.equal(interpretarCommit({ hash: 'abc1234', data: '2026-09-21', assunto: 'chore: limpar' }), null);
  assert.equal(interpretarCommit({ hash: 'abc1234', data: '2026-09-21', assunto: 'test(ficha): cobre' }), null);
  const item = interpretarCommit({ hash: 'abc1234567', data: '2026-09-21T10:00:00', assunto: 'feat(ficha): retrato do personagem' });
  assert.equal(item.tipo, 'novo');
  assert.equal(item.area, 'Ficha');
  assert.equal(item.titulo, 'Retrato do personagem');
  assert.equal(item.id, 'abc1234');
  assert.equal(item.data, '2026-09-21');
});

test('linha Novidade e itens do corpo viram titulo e detalhes', () => {
  const item = interpretarCommit({
    hash: 'a1', data: '2026-09-21', assunto: 'fix(loja): preco', corpo: 'Novidade: Preço certo na Loja\n\n- lista de itens\n- outro item',
  });
  assert.equal(item.tipo, 'correcao');
  assert.equal(item.titulo, 'Preço certo na Loja');
  assert.deepEqual(item.detalhes, ['lista de itens', 'outro item']);
});

test('leitura do git log ignora blocos vazios e a lista junta sem repetir id (manual vence)', () => {
  const log = 'h1\x1f2026-09-20\x1ffeat(mundo): mapa\x1f\x1eh2\x1f2026-09-21\x1fdocs: x\x1f\x1e';
  const itens = lerLogDoGit(log);
  assert.equal(itens.length, 1);
  const juntas = montarNovidades(itens, [{ id: 'h1', data: '2026-09-22', titulo: 'dup' }, { id: 'm', data: '2026-09-22', titulo: 'manual' }]);
  assert.deepEqual(juntas.map((i: { id: string }) => i.id), ['h1', 'm']);
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
