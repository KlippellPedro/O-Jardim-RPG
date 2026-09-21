import assert from 'node:assert/strict';
import test from 'node:test';
import { calcularRecompensa, tierDoCartaz } from '../../src/pages/Ficha/utils/cartaz';

test('recompensa sobe com o nivel e com a fama', () => {
  assert.equal(calcularRecompensa(1, 0), 300);
  assert.equal(calcularRecompensa(1, 4), 500);
  assert.ok(calcularRecompensa(10, 2) > calcularRecompensa(10, 1));
});

test('recompensa fica na escala do Jardim', () => {
  assert.ok(calcularRecompensa(10, 0) < 3000);
  assert.ok(calcularRecompensa(20, 0) < 15000);
  assert.ok(calcularRecompensa(22, 0) < 30000);
});

test('recompensa ignora valores invalidos', () => {
  assert.equal(calcularRecompensa(Number.NaN, 99), calcularRecompensa(1, 5));
  assert.equal(calcularRecompensa(-3, -2), 300);
});

test('moldura muda em 10, 15 e 20', () => {
  assert.deepEqual([1, 9, 10, 14, 15, 19, 20].map(tierDoCartaz), ['comum', 'comum', 'prata', 'prata', 'ouro', 'ouro', 'lenda']);
});
