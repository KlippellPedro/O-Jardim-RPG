import assert from 'node:assert/strict';
import test from 'node:test';
import { FOLGA_DA_BARRA, posicaoDaBarra } from '../../src/pages/Mapa/componentes/barraAncoradaConta';

const AREA = { largura: 1000, altura: 700 };
const BARRA = { largura: 300, altura: 46 };

test('a barra fica centrada logo abaixo do objeto', () => {
  const pos = posicaoDaBarra({ x: 400, y: 200, w: 200, h: 100 }, AREA, BARRA, 70);
  assert.deepEqual(pos, { x: 500 - 150, y: 300 + FOLGA_DA_BARRA });
});

test('a barra não sai pelos lados da área', () => {
  assert.equal(posicaoDaBarra({ x: 0, y: 100, w: 40, h: 40 }, AREA, BARRA, 70).x, 8);
  assert.equal(posicaoDaBarra({ x: 960, y: 100, w: 40, h: 40 }, AREA, BARRA, 70).x, 1000 - 300 - 8);
});

test('objeto grande que passa do fundo da tela: a barra cola acima da barra do Acervo', () => {
  const pos = posicaoDaBarra({ x: 100, y: 50, w: 800, h: 900 }, AREA, BARRA, 70);
  assert.equal(pos.y, 700 - 46 - 70);
  assert.equal(pos.x, 500 - 150);
});

test('objeto pequeno perto do fundo: a barra vai para cima dele em vez de cobri-lo', () => {
  const pos = posicaoDaBarra({ x: 450, y: 560, w: 60, h: 60 }, AREA, BARRA, 70);
  assert.equal(pos.y, 560 - 46 - FOLGA_DA_BARRA);
});

test('objeto pequeno no fundo, sem espaço nem para cima: cola no limite de baixo', () => {
  const pos = posicaoDaBarra({ x: 450, y: 10, w: 60, h: 640 }, AREA, BARRA, 70);
  assert.equal(pos.y, 700 - 46 - 70);
});

test('sem objeto (saiu da cena), a barra fica no limite de baixo, no meio', () => {
  assert.deepEqual(posicaoDaBarra(null, AREA, BARRA, 70), { x: 350, y: 700 - 46 - 70 });
});

test('a barra nunca passa do topo nem de uma área menor que ela', () => {
  const pos = posicaoDaBarra({ x: 100, y: -500, w: 100, h: 100 }, AREA, BARRA, 70);
  assert.ok(pos.y >= 8);
  const apertada = posicaoDaBarra({ x: 0, y: 0, w: 10, h: 10 }, { largura: 200, altura: 90 }, BARRA, 70);
  assert.ok(apertada.x >= 8 && apertada.y >= 8);
});
