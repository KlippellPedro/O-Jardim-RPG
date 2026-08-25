import assert from 'node:assert/strict';
import test from 'node:test';
import { mesclarOrdemFiltrada } from '../../src/services/listOrderingService.ts';

test('reordenação filtrada preserva todos os itens escondidos', () => {
  const todos = [
    { id: 'a', ordem: 0 },
    { id: 'b', ordem: 1 },
    { id: 'c', ordem: 2 },
    { id: 'd', ordem: 3 },
  ];

  const resultado = mesclarOrdemFiltrada(todos, [todos[3], todos[1]]);

  assert.deepEqual(resultado.map((item) => item.id), ['a', 'd', 'c', 'b']);
  assert.deepEqual(resultado.map((item) => item.ordem), [0, 1, 2, 3]);
});

test('reordenação rejeita um conjunto filtrado inconsistente sem perder dados', () => {
  const todos = [{ id: 'a', ordem: 1 }, { id: 'b', ordem: 0 }];
  const resultado = mesclarOrdemFiltrada(todos, [{ id: 'inexistente', ordem: 0 }]);

  assert.deepEqual(resultado.map((item) => item.id), ['b', 'a']);
});
