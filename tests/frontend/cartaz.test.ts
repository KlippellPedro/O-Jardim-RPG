import assert from 'node:assert/strict';
import test from 'node:test';
import { calcularRecompensa, molduraDoCartaz } from '../../src/pages/Ficha/utils/cartaz';

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

test('moldura do cartaz segue a mesma escada do retrato, a cada 5 niveis ate o 60', () => {
  const chaves = [1, 4, 5, 9, 10, 14, 15, 19, 20, 60, 99].map((nivel) => molduraDoCartaz(nivel).chave);
  assert.deepEqual(chaves, [
    'comum', 'comum', 'bronze', 'bronze', 'prata', 'prata', 'ouro', 'ouro', 'esmeralda', 'lenda', 'lenda',
  ]);
});

test('moldura do cartaz e do retrato batem para o mesmo nivel', () => {
  assert.equal(molduraDoCartaz(20).rotulo, 'Esmeralda');
  assert.equal(molduraDoCartaz(1).rotulo, null);
});
