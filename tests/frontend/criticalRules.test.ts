import assert from 'node:assert/strict';
import test from 'node:test';

import {
  ameacaCritico,
  formatarCritico,
  formulaDanoCritico,
  normalizarCriticoBalanceado,
  normalizarMargemAmeaca,
  normalizarMultiplicadorCritico,
} from '../../src/services/criticalService.ts';

test('crítico padrão exige 20 natural', () => {
  assert.equal(ameacaCritico(19, 20), false);
  assert.equal(ameacaCritico(20, 20), true);
});

test('margem de arma aceita valores personalizados entre 1 e 20', () => {
  assert.equal(normalizarMargemAmeaca(10), 10);
  assert.equal(normalizarMargemAmeaca(19), 19);
  assert.equal(normalizarMargemAmeaca(30), 20);
  assert.equal(ameacaCritico(18, 18), true);
  assert.equal(ameacaCritico(17, 18), false);
});

test('multiplicador aceita críticos especiais escritos pelo jogador', () => {
  assert.equal(normalizarMultiplicadorCritico(1), 1);
  assert.equal(normalizarMultiplicadorCritico(3), 3);
  assert.equal(normalizarMultiplicadorCritico(10), 10);
  assert.equal(formatarCritico(19, 3), '19-20/x3');
  assert.deepEqual(normalizarCriticoBalanceado(18, 4), {
    margemAmeaca: 18,
    multiplicadorCritico: 4,
  });
});

test('crítico multiplica dados, mas não bônus fixos', () => {
  assert.equal(formulaDanoCritico('2d6+1d4+5', 3), '6d6+3d4+5');
  assert.equal(formulaDanoCritico('1d8-2', 2), '2d8-2');
  assert.equal(formulaDanoCritico('1d6+3', 10), '10d6+3');
  assert.equal(formulaDanoCritico('Hit Kill', 2), null);
});
