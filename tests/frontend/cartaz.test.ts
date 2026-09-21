import assert from 'node:assert/strict';
import test from 'node:test';
import { calcularRecompensa, tierDoCartaz } from '../../src/pages/Ficha/utils/cartaz';

test('recompensa sobe com o nivel e com a fama', () => {
  assert.equal(calcularRecompensa(1, 0), 6000);
  assert.equal(calcularRecompensa(1, 4), 12000);
  assert.ok(calcularRecompensa(10, 2) > calcularRecompensa(10, 1));
});

test('recompensa ignora valores invalidos', () => {
  assert.equal(calcularRecompensa(Number.NaN, 99), calcularRecompensa(1, 5));
  assert.equal(calcularRecompensa(-3, -2), 6000);
});

test('moldura muda em 10, 15 e 20', () => {
  assert.deepEqual([1, 9, 10, 14, 15, 19, 20].map(tierDoCartaz), ['comum', 'comum', 'prata', 'prata', 'ouro', 'ouro', 'lenda']);
});
