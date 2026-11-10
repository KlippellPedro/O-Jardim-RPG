import assert from 'node:assert/strict';
import test from 'node:test';
import {
  acharAlcaDeGiro, acharCanto, acharMapaEm, caixaDoMapa, cantosDoMapa, casasNaLargura, centroDoMapa, encaixarCantoNaGrade, escalaParaCasas, girarMapa,
  liberadosDoMapa, manterDentroDaCena, moverMapa, paraODesenho, pontoDaAlcaDeGiro, redimensionarMapa, retanguloDoMapa,
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

const perto = (atual: { x: number; y: number }, esperado: { x: number; y: number }) => {
  assert.ok(Math.abs(atual.x - esperado.x) < 1e-6 && Math.abs(atual.y - esperado.y) < 1e-6, `${JSON.stringify(atual)} != ${JSON.stringify(esperado)}`);
};
/** O ponto na direção em que a alça de cima ficaria com o mapa girado nesse ângulo, a 1000 do centro. */
const naDirecao = (m: Parameters<typeof centroDoMapa>[0], graus: number) => {
  const c = centroDoMapa(m);
  const a = (graus * Math.PI) / 180;
  return { x: c.x + Math.sin(a) * 1000, y: c.y - Math.cos(a) * 1000 };
};
// 1000 x 600 com o canto de cima à esquerda em (500, 500): o centro é (1000, 800).
const girado = { ...mapa('g', 500, 500), rotacao: 90 };

test('girado, o mapa tem caixa própria e o clique segue o desenho, não o retângulo reto', () => {
  const caixa = caixaDoMapa(girado);
  assert.deepEqual([caixa.x, caixa.y, caixa.w, caixa.h].map((v) => Math.round(v)), [700, 300, 600, 1000]);
  // Sem giro a caixa é o próprio retângulo.
  assert.deepEqual(caixaDoMapa(mapa('a', 100, 50)), retanguloDoMapa(mapa('a', 100, 50)));
  // (1000, 1250) está dentro do desenho girado e fora do retângulo reto; (600, 800) é o contrário.
  assert.equal(acharMapaEm([girado], { x: 1000, y: 1250 }), 'g');
  assert.equal(acharMapaEm([girado], { x: 600, y: 800 }), null);
});

test('os cantos acompanham o giro e se agarram onde estão', () => {
  const cantos = cantosDoMapa(girado);
  perto(cantos.no, { x: 1300, y: 300 });
  perto(cantos.ne, { x: 1300, y: 1300 });
  perto(cantos.so, { x: 700, y: 300 });
  perto(cantos.se, { x: 700, y: 1300 });
  assert.equal(acharCanto(girado, { x: 1302, y: 302 }, 1), 'no');
  assert.equal(acharCanto(girado, { x: 500, y: 500 }, 1), null);
});

test('a alça de giro fica acima da borda de cima, onde quer que o mapa esteja virado', () => {
  // Reto: 34 px de tela acima do meio da borda de cima (500). Girado em 90 graus, a borda de cima está à direita.
  perto(pontoDaAlcaDeGiro(mapa('a', 500, 500), 1), { x: 1000, y: 500 - 34 });
  perto(pontoDaAlcaDeGiro(girado, 1), { x: 1000 + 300 + 34, y: 800 });
  // Com a tela afastada a distância em pixels de tela é a mesma.
  perto(pontoDaAlcaDeGiro(mapa('a', 500, 500), 0.5), { x: 1000, y: 500 - 68 });
  assert.equal(acharAlcaDeGiro(girado, { x: 1336, y: 802 }, 1), true);
  assert.equal(acharAlcaDeGiro(girado, { x: 1000, y: 800 }, 1), false);
});

test('girar leva a alça até o ponto, cola nos ângulos retos e anda de 15 em 15 com Shift', () => {
  const reto = mapa('a', 100, 100);
  assert.equal(girarMapa(reto, naDirecao(reto, 90)), 90);
  assert.equal(girarMapa(reto, naDirecao(reto, 0)), 0);
  assert.equal(girarMapa(reto, naDirecao(reto, 180)), 180);
  assert.equal(girarMapa(reto, naDirecao(reto, 270)), 270);
  // Perto de um ângulo reto cola; longe, fica como está (uma casa decimal).
  assert.equal(girarMapa(reto, naDirecao(reto, 91.5)), 90);
  assert.equal(girarMapa(reto, naDirecao(reto, 37)), 37);
  // Shift: de 15 em 15.
  assert.equal(girarMapa(reto, naDirecao(reto, 37), true), 30);
  assert.equal(girarMapa(reto, naDirecao(reto, 38), true), 45);
  // Passou de 360: volta a zero.
  assert.equal(girarMapa(reto, naDirecao(reto, 359.9), true), 0);
  // O giro não depende do giro que o mapa já tem.
  assert.equal(girarMapa(girado, naDirecao(girado, 45), true), 45);
});

test('puxar um canto de um mapa girado mantém o canto oposto parado', () => {
  // O canto de cima à esquerda do desenho (agora em 1300, 300) vai até o meio do mapa: o desenho fica na metade.
  const menor = redimensionarMapa(girado, 'no', { x: 1000, y: 800 });
  assert.deepEqual(menor, { x: 600, y: 900, escala: 0.5 });
  perto(cantosDoMapa({ ...girado, ...menor }).se, cantosDoMapa(girado).se);
  // Puxar para fora dobra o tamanho com a âncora parada, enquanto couber na cena: o canto oposto não anda.
  const maior = redimensionarMapa(girado, 'se', { x: 100, y: 2300 });
  perto(cantosDoMapa({ ...girado, ...maior }).no, cantosDoMapa(girado).no);
  assert.ok(maior.escala > 1);
  // A caixa não passa da borda de cima nem da esquerda: encolhe até a ponta encostar.
  const preso = redimensionarMapa(girado, 'se', { x: -9000, y: 9000 });
  const caixa = caixaDoMapa({ ...girado, ...preso });
  assert.ok(caixa.x >= -0.5 && caixa.y >= -0.5, JSON.stringify(caixa));
});

test('mover um mapa girado leva a caixa junto e respeita as bordas, sem encaixar na grade', () => {
  // A caixa começa 200 à direita e 200 acima do canto do desenho: x pode chegar a -200, y não desce de 200.
  assert.deepEqual(moverMapa(girado, -1000, -1000, null), { x: -200, y: 200 });
  const limites = { largura: 3000, altura: 2000 };
  assert.deepEqual(moverMapa(girado, 9999, 9999, null, limites), { x: 2200, y: 1200 });
  assert.deepEqual(moverMapa(girado, 149, 251, GRADE), { x: 149, y: 251 });
  // Sem giro: a borda de baixo e da direita também seguram.
  assert.deepEqual(moverMapa(mapa('a', 100, 100), 5000, 5000, null, limites), { x: 2000, y: 1400 });
  // Depois de girar perto da borda, o mapa é empurrado para dentro.
  assert.deepEqual(manterDentroDaCena({ ...mapa('a', 0, 0), rotacao: 90 }), { x: 0, y: 200 });
  assert.deepEqual(manterDentroDaCena(girado), { x: 500, y: 500 });
});

test('a tela vista no desenho do mapa desfaz deslocamento, giro e escala', () => {
  // O canto de cima à esquerda do desenho, que com o giro está em (1300, 300), é a origem do desenho.
  perto(paraODesenho(girado, { x: 1300, y: 300 }), { x: 0, y: 0 });
  perto(paraODesenho(girado, { x: 700, y: 1300 }), { x: 1000, y: 600 });
  const metade = { ...mapa('a', 100, 100, 0.5), rotacao: 0 };
  perto(paraODesenho(metade, { x: 350, y: 250 }), { x: 500, y: 300 });
});
