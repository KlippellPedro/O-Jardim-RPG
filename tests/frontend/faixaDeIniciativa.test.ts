import assert from 'node:assert/strict';
import test from 'node:test';
import { ordemDaFaixa } from '../../src/pages/Mapa/componentes/faixaDeIniciativaConta.ts';

const ordem = [{ id: 'a' }, { id: 'b' }, { id: 'c' }, { id: 'd' }];

test('a faixa começa em quem age agora e quem já agiu vai para o fim', () => {
  assert.deepEqual(ordemDaFaixa(ordem, 'c').map((p) => p.id), ['c', 'd', 'a', 'b']);
  assert.deepEqual(ordemDaFaixa(ordem, 'a').map((p) => p.id), ['a', 'b', 'c', 'd']);
});

test('sem vez conhecida, ou com uma vez que não está na lista, fica na ordem original', () => {
  assert.deepEqual(ordemDaFaixa(ordem, null).map((p) => p.id), ['a', 'b', 'c', 'd']);
  assert.deepEqual(ordemDaFaixa(ordem, 'fantasma').map((p) => p.id), ['a', 'b', 'c', 'd']);
  assert.deepEqual(ordemDaFaixa([], 'a'), []);
});

test('a conta não muda a lista de quem chamou', () => {
  const original = [...ordem];
  ordemDaFaixa(ordem, 'c');
  assert.deepEqual(ordem, original);
});
