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

test('margem de arma aceita somente a faixa balanceada de 18 a 20', () => {
  assert.equal(normalizarMargemAmeaca(10), 18);
  assert.equal(normalizarMargemAmeaca(19), 19);
  assert.equal(normalizarMargemAmeaca(30), 20);
  assert.equal(ameacaCritico(18, 18), true);
  assert.equal(ameacaCritico(17, 18), false);
});

test('multiplicador fica entre x2 e x4', () => {
  assert.equal(normalizarMultiplicadorCritico(1), 2);
  assert.equal(normalizarMultiplicadorCritico(3), 3);
  assert.equal(normalizarMultiplicadorCritico(10), 4);
  assert.equal(formatarCritico(19, 3), '20/x3');
  assert.deepEqual(normalizarCriticoBalanceado(18, 4), {
    margemAmeaca: 20,
    multiplicadorCritico: 4,
  });
});

test('crítico multiplica dados, mas não bônus fixos', () => {
  assert.equal(formulaDanoCritico('2d6+1d4+5', 3), '6d6+3d4+5');
  assert.equal(formulaDanoCritico('1d8-2', 2), '2d8-2');
  assert.equal(formulaDanoCritico('Hit Kill', 2), null);
});
