import assert from 'node:assert/strict';
import test from 'node:test';
import { atualizarStatusVital, estadoVida, limiteMorrendo, multiplicadorMovimentoCansaco, penalidadeCansacoIniciativa, penalidadeCansacoTeste } from '../../src/services/statusService';

test('Vida continua abaixo de zero e inicia Morrendo 1', () => {
  const status = atualizarStatusVital({ vidaAtual: 2 }, 'vidaAtual', -7, 20, 12);
  assert.equal(status.vidaAtual, -5);
  assert.equal(status.morrendo, 1);
  assert.equal(status.morto, false);
  assert.equal(estadoVida(status, 20), 'deficit');
});

test('Cansaço aplica as penalidades graduais publicadas', () => {
  assert.equal(penalidadeCansacoTeste(1, true), -1);
  assert.equal(penalidadeCansacoTeste(1, false), 0);
  assert.equal(penalidadeCansacoTeste(2, true), -2);
  assert.equal(penalidadeCansacoTeste(3, false), -2);
  assert.equal(penalidadeCansacoIniciativa(2), -1);
  assert.equal(multiplicadorMovimentoCansaco(5), 0.5);
});

test('déficit igual à Vida máxima causa morte imediata', () => {
  const status = atualizarStatusVital({ vidaAtual: -15, morrendo: 1 }, 'vidaAtual', -5, 20, 12);
  assert.equal(status.vidaAtual, -20);
  assert.equal(status.morto, true);
  assert.equal(status.morrendo, 3);
});

test('maestria de Constituição amplia Morrendo e despertar aumenta Ferido', () => {
  assert.equal(limiteMorrendo(20), 4);
  const status = atualizarStatusVital({ vidaAtual: -2, morrendo: 2, ferido: 1 }, 'vidaAtual', 3, 20, 20);
  assert.equal(status.vidaAtual, 1);
  assert.equal(status.morrendo, 0);
  assert.equal(status.ferido, 2);
  assert.equal(estadoVida(status, 20), 'consciente');
});
