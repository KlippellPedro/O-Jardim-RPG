import assert from 'node:assert/strict';
import test from 'node:test';

import { loreBloqueado } from '../../src/pages/Mundo/loreVisibility.ts';

const realidadeZero = { id: 'realidade-0' };

test('árvore oculta bloqueia um galho mesmo quando ele nasce revelado', () => {
  assert.equal(loreBloqueado(realidadeZero, {
    isMestre: false,
    loreRevelado: [],
    loreOculto: [],
    paiBloqueado: true,
  }), true);
});

test('galho visível continua acessível quando a árvore também está visível', () => {
  assert.equal(loreBloqueado(realidadeZero, {
    isMestre: false,
    loreRevelado: [],
    loreOculto: [],
  }), false);
});

test('mestre enxerga os galhos mesmo em uma árvore oculta para jogadores', () => {
  assert.equal(loreBloqueado(realidadeZero, {
    isMestre: true,
    loreRevelado: [],
    loreOculto: ['realidade-0'],
    paiBloqueado: true,
  }), false);
});
