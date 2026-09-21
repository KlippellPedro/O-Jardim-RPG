import assert from 'node:assert/strict';
import test from 'node:test';
import { converterMaterialEmLote, destinosDoMaterial, raridadeDoLote } from '../../src/services/loteDeMaterialService';

test('material vira estoque pelo uso, sem repetir, e so materia-prima aceita mais de um destino', () => {
  assert.deepEqual(destinosDoMaterial(['alquimia']), ['componentes-quimicos']);
  assert.deepEqual(destinosDoMaterial(['alquimia', 'forja']), ['componentes-quimicos', 'materia-prima']);
  assert.deepEqual(destinosDoMaterial(['forja', 'forja']), ['materia-prima']);
});

test('reliquia entra como lendario e o resto mantem a raridade', () => {
  assert.equal(raridadeDoLote('reliquia'), 'lendario');
  assert.equal(raridadeDoLote('raro'), 'raro');
});

test('converter soma o lote na raridade certa, tira do inventario e nao altera o original', () => {
  const original = { sucata: { comum: 2 } };
  const feito = converterMaterialEmLote(original, 3, 'sucata', 'comum', 2);
  assert.deepEqual(feito?.estoques.sucata, { comum: 4 });
  assert.equal(feito?.sobra, 1);
  assert.deepEqual(original.sucata, { comum: 2 });
  const tudo = converterMaterialEmLote(undefined, 1, 'mantimentos', 'raro', 1);
  assert.deepEqual(tudo?.estoques.mantimentos, { raro: 1 });
  assert.equal(tudo?.sobra, 0);
});

test('nao converte mais do que tem, nem zero, e o contador antigo vale como comum', () => {
  assert.equal(converterMaterialEmLote({}, 2, 'sucata', 'comum', 3), null);
  assert.equal(converterMaterialEmLote({}, 2, 'sucata', 'comum', 0), null);
  const antigo = converterMaterialEmLote({ sucata: 5 }, 1, 'sucata', 'comum', 1);
  assert.deepEqual(antigo?.estoques.sucata, { comum: 6 });
  const cheio = converterMaterialEmLote({ sucata: { comum: 999 } }, 1, 'sucata', 'comum', 1);
  assert.equal((cheio?.estoques.sucata as { comum: number }).comum, 999);
});
