import assert from 'node:assert/strict';
import test from 'node:test';
import { efeitosDaCarta, proximosPendentes } from '../../src/components/loot/loot';

test('junta os itens novos aos que ja esperavam, ignorando entrada sem nome', () => {
  const primeiro = proximosPendentes(null, [{ nome: 'Espada', raridade: 'raro', quantidade: 1 }]);
  const segundo = proximosPendentes(primeiro, [{ nome: 'Poção', raridade: 'comum', quantidade: 3 }, { nome: '', raridade: 'comum' }]);
  assert.deepEqual(segundo.map((item) => item.nome), ['Espada', 'Poção']);
});

test('compra sem itens validos mantem a fila como estava', () => {
  const atual = proximosPendentes(null, [{ nome: 'X', raridade: 'raro' }]);
  assert.deepEqual(proximosPendentes(atual, []), atual);
  assert.deepEqual(proximosPendentes(null, []), []);
});

test('a fila fica limitada aos ultimos 30 itens', () => {
  const itens = proximosPendentes(null, Array.from({ length: 45 }, (_, i) => ({ nome: `Item ${i}`, raridade: 'comum' })));
  assert.equal(itens.length, 30);
  assert.equal(itens[29].nome, 'Item 44');
  assert.equal(itens[0].nome, 'Item 15');
});

test('efeitos crescem com a raridade', () => {
  const comum = efeitosDaCarta(0);
  assert.equal(comum.clarao, false);
  assert.equal(comum.faiscas, 0);
  assert.equal(efeitosDaCarta(1).clarao, true);
  assert.equal(efeitosDaCarta(2).onda, true);
  assert.equal(efeitosDaCarta(3).chuva > 0, true);
  assert.equal(efeitosDaCarta(3).aneis, 0);
  assert.equal(efeitosDaCarta(4).aneis, 1);
  assert.equal(efeitosDaCarta(4).tremor, false);
  assert.equal(efeitosDaCarta(5).tremor, true);
  assert.equal(efeitosDaCarta(6).aneis, 3);
  assert.ok(efeitosDaCarta(6).faiscas > efeitosDaCarta(3).faiscas);
});
