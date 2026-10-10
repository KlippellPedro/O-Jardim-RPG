import assert from 'node:assert/strict';
import test from 'node:test';
import { corLegivel, lerCor, luminancia } from '../../src/pages/Ficha/Wizard/corLegivel';

test('lê hexadecimal curto e longo e rgb()', () => {
  assert.deepEqual(lerCor('#fff'), { r: 255, g: 255, b: 255 });
  assert.deepEqual(lerCor('#d4a847'), { r: 212, g: 168, b: 71 });
  assert.deepEqual(lerCor('rgb(53, 216, 236)'), { r: 53, g: 216, b: 236 });
  assert.deepEqual(lerCor('rgba(10 20 30 / 0.4)'), { r: 10, g: 20, b: 30 });
  assert.equal(lerCor('vermelho'), null);
});

test('preto tem luminância 0 e branco 1', () => {
  assert.equal(luminancia({ r: 0, g: 0, b: 0 }), 0);
  assert.ok(Math.abs(luminancia({ r: 255, g: 255, b: 255 }) - 1) < 1e-9);
});

test('cor que já se lê volta como veio', () => {
  const resultado = corLegivel('#d4a847');
  assert.equal(resultado.mudou, false);
  assert.equal(resultado.cor, '#d4a847');
});

test('cor escura é clareada só até o mínimo', () => {
  const resultado = corLegivel('#1c1917');
  assert.equal(resultado.mudou, true);
  assert.ok(resultado.rgb && luminancia(resultado.rgb) >= 0.16);
  assert.ok(resultado.rgb && luminancia(resultado.rgb) < 0.3, 'não vira quase branco');
});

test('cor que não dá para interpretar não é mexida', () => {
  assert.deepEqual(corLegivel('var(--x)'), { cor: 'var(--x)', rgb: null, mudou: false });
});

test('o preto puro chega ao mínimo sem laço infinito', () => {
  const resultado = corLegivel('#000000');
  assert.equal(resultado.mudou, true);
  assert.ok(resultado.rgb && luminancia(resultado.rgb) >= 0.16);
});
