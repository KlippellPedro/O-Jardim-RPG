import assert from 'node:assert/strict';
import test from 'node:test';
import {
  acharCanto, acharMapaEm, casasNaLargura, encaixarCantoNaGrade, escalaParaCasas, liberadosDoMapa, moverMapa, redimensionarMapa, retanguloDoMapa,
} from '../../src/pages/Mapa/motor/mapasColocadosConta';

const mapa = (id: string, x: number, y: number, escala = 1) => ({ id, x, y, escala, largura: 1000, altura: 600 });
const GRADE = { tipo: 'quadrada' as const, tamanho: 100, x: 0, y: 0 };

test('o retângulo do mapa leva a escala, e o de cima ganha o clique', () => {
  assert.deepEqual(retanguloDoMapa(mapa('a', 100, 50, 0.5)), { x: 100, y: 50, w: 500, h: 300 });
  // Dois mapas se sobrepõem em (1200, 300): a lista vai de baixo para cima, então vale o último.
  const lista = [mapa('baixo', 0, 0), mapa('cima', 800, 100)];
  assert.equal(acharMapaEm(lista, { x: 900, y: 300 }), 'cima');
  assert.equal(acharMapaEm(lista, { x: 100, y: 100 }), 'baixo');
  assert.equal(acharMapaEm(lista, { x: 5000, y: 5000 }), null);
});

test('os cantos se agarram em pixels de tela, não do mapa', () => {
  const m = mapa('a', 100, 100);
  assert.equal(acharCanto(m, { x: 1105, y: 705 }, 1), 'se');
  assert.equal(acharCanto(m, { x: 98, y: 102 }, 1), 'no');
  assert.equal(acharCanto(m, { x: 1100, y: 100 }, 1), 'ne');
  assert.equal(acharCanto(m, { x: 100, y: 700 }, 1), 'so');
  // Com a tela afastada (zoom 0,1) a mesma área de 14 px de tela cobre 140 px do mapa.
  assert.equal(acharCanto(m, { x: 1200, y: 780 }, 0.1), 'se');
  assert.equal(acharCanto(m, { x: 600, y: 400 }, 1), null);
});

test('mover encaixa na grade quadrada, não sai pelo canto de cima e deixa livre sem encaixe', () => {
  const m = mapa('a', 0, 0);
  assert.deepEqual(encaixarCantoNaGrade(149, 251, GRADE), { x: 100, y: 300 });
  assert.deepEqual(moverMapa(m, 149, 251, GRADE), { x: 100, y: 300 });
  assert.deepEqual(moverMapa(m, 149.04, 251.06, null), { x: 149, y: 251.1 });
  assert.deepEqual(moverMapa(m, -300, -20, null), { x: 0, y: 0 });
  assert.deepEqual(encaixarCantoNaGrade(149, 251, { ...GRADE, tipo: 'hex' as never }), { x: 149, y: 251 });
  assert.deepEqual(encaixarCantoNaGrade(149, 251, { ...GRADE, x: 30, y: -20 }), { x: 130, y: 280 });
});

test('puxar um canto muda o tamanho com o canto oposto parado e a proporção mantida', () => {
  const m = mapa('a', 200, 100);
  // Puxar o canto de baixo à direita até o dobro: o de cima à esquerda não sai do lugar.
  assert.deepEqual(redimensionarMapa(m, 'se', { x: 2200, y: 1300 }), { x: 200, y: 100, escala: 2 });
  // Puxar o de cima à esquerda para dentro: o de baixo à direita (1200, 700) fica onde estava.
  const menor = redimensionarMapa(m, 'no', { x: 700, y: 400 });
  assert.equal(menor.escala, 0.5);
  assert.deepEqual([menor.x + 1000 * menor.escala, menor.y + 600 * menor.escala], [1200, 700]);
  // Não deixa passar da borda de cima e da esquerda: encolhe até a ponta encostar em zero.
  const preso = redimensionarMapa(m, 'no', { x: -5000, y: -5000 });
  assert.ok(preso.x >= 0 && preso.y >= 0);
  assert.ok(Math.abs(preso.x + 1000 * preso.escala - 1200) < 0.2);
  // Escala fica entre 0,05 e 20.
  assert.equal(redimensionarMapa(m, 'se', { x: 201, y: 101 }).escala, 0.05);
  assert.equal(redimensionarMapa(m, 'se', { x: 900000, y: 100 }).escala, 20);
});

test('largura em casas e a escala que dá essa largura', () => {
  assert.equal(casasNaLargura(mapa('a', 0, 0, 0.5), 100), 5);
  assert.equal(escalaParaCasas({ largura: 1000 }, 30, 100), 3);
  assert.equal(escalaParaCasas({ largura: 1000 }, 0.01, 100), 0.05);
});

test('a lista da névoa traz os ladrilhos de cada mapa pelo prefixo do id', () => {
  const lista = ['img1:n0/0/0', 'img2:n0/1/0', 'img1:n0/1/1', 'n0/9/9'];
  assert.deepEqual([...(liberadosDoMapa(lista, 'img1') ?? [])].sort(), ['n0/0/0', 'n0/1/1']);
  assert.deepEqual([...(liberadosDoMapa(lista, 'nenhum') ?? ['x'])], []);
  // Sem névoa (lista nula) tudo vem.
  assert.equal(liberadosDoMapa(null, 'img1'), null);
  assert.equal(liberadosDoMapa(undefined, 'img1'), null);
});
