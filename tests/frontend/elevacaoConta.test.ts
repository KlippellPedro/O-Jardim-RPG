import assert from 'node:assert/strict';
import test from 'node:test';
import { distanciaEm3D, quedaDe, rotuloDaElevacao, textoDaDistanciaEm3D } from '../../src/pages/Mapa/motor/elevacaoConta.ts';

test('o selo diz se o token está no ar ou num fosso, e some no chão', () => {
  assert.equal(rotuloDaElevacao(6), '↑ 6 m');
  assert.equal(rotuloDaElevacao(-3), '↓ 3 m');
  assert.equal(rotuloDaElevacao(0), null);
  assert.equal(rotuloDaElevacao(undefined), null);
  assert.equal(rotuloDaElevacao(2.6, 'ft'), '↑ 3 ft');
});

test('a régua soma o desnível em linha reta quando os tokens estão em alturas diferentes', () => {
  assert.equal(distanciaEm3D(3, 4), 5);
  assert.equal(textoDaDistanciaEm3D(3, 0, 4), 'Em 3D: 5 m (4 m de diferença de altura)');
  assert.equal(textoDaDistanciaEm3D(3, 4, 0), 'Em 3D: 5 m (4 m de diferença de altura)', 'subir ou descer dá o mesmo');
  assert.equal(textoDaDistanciaEm3D(3, 2, 2), undefined, 'no mesmo nível, a régua não diz nada a mais');
  assert.equal(textoDaDistanciaEm3D(3, undefined, undefined), undefined);
});

test('a queda segue o Livro: 1d6 a cada 3 m, até 20d6, e menos de 3 m só derruba', () => {
  assert.equal(quedaDe(2).formula, null);
  assert.match(quedaDe(2).texto, /Caído/);
  assert.equal(quedaDe(3).formula, '1d6');
  assert.equal(quedaDe(14).formula, '4d6');
  assert.equal(quedaDe(300).formula, '20d6');
  assert.match(quedaDe(9).texto, /^Caiu 9 m: 3d6 de dano de impacto/);
});
