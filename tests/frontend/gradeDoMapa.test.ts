import assert from 'node:assert/strict';
import test from 'node:test';
import {
  casasDoTrecho, encaixar, medicaoEfetiva, medir, passosEntreHex, rotuloUnidade, segmentosDaGrade, tracejar,
  type IGrade,
} from '../../src/pages/Mapa/motor/geometria';

const QUADRADA: IGrade = { tipo: 'quadrada', tamanho: 100, x: 0, y: 0, cor: '#ffffff', opacidade: 0.2, metros: 1.5 };
const HEX: IGrade = { ...QUADRADA, tipo: 'hex' };
const HEX_PLANO: IGrade = { ...QUADRADA, tipo: 'hex-plano' };

test('a grade cobre a tela inteira, também além da borda do mapa', () => {
  // A tela mostra uma área bem fora do mapa (que começa em 0, 0): as linhas existem lá também.
  const vista = { x: -3000, y: -2000, largura: 800, altura: 600 };
  const segmentos = segmentosDaGrade(QUADRADA, vista, 1);
  const verticais = segmentos.filter(([x1, , x2]) => x1 === x2);
  const horizontais = segmentos.filter(([, y1, , y2]) => y1 === y2);
  assert.ok(verticais.length >= 8 && horizontais.length >= 6);
  for (const [x1] of verticais) assert.equal(((x1 % 100) + 100) % 100, 0);
  assert.ok(verticais.every(([x1, y1, , y2]) => x1 >= vista.x - 100 && y1 <= vista.y && y2 >= vista.y + vista.altura));
});

test('o deslocamento da grade move as linhas', () => {
  const segmentos = segmentosDaGrade({ ...QUADRADA, x: 30 }, { x: 0, y: 0, largura: 400, altura: 300 }, 1);
  const xs = segmentos.filter(([x1, , x2]) => x1 === x2).map(([x1]) => x1);
  assert.ok(xs.includes(30) && xs.includes(130) && !xs.includes(100));
});

test('com a casa pequena demais na tela, a grade some em vez de virar borrão', () => {
  assert.deepEqual(segmentosDaGrade(QUADRADA, { x: 0, y: 0, largura: 20000, altura: 20000 }, 0.04), []);
  assert.deepEqual(segmentosDaGrade({ ...QUADRADA, tipo: 'nenhuma' }, { x: 0, y: 0, largura: 400, altura: 300 }, 1), []);
  assert.deepEqual(segmentosDaGrade(HEX, { x: 0, y: 0, largura: 4000, altura: 4000 }, 0.1), []);
});

test('hexágonos: cada lado aparece uma vez só e os dois formatos cobrem a vista', () => {
  const vista = { x: 0, y: 0, largura: 600, altura: 500 };
  for (const grade of [HEX, HEX_PLANO]) {
    const segmentos = segmentosDaGrade(grade, vista, 1);
    assert.ok(segmentos.length > 30);
    const chave = ([a, b, c, d]: number[]) => {
      const p = [`${a.toFixed(2)},${b.toFixed(2)}`, `${c.toFixed(2)},${d.toFixed(2)}`].sort();
      return p.join('|');
    };
    const vistos = new Set(segmentos.map(chave));
    assert.equal(vistos.size, segmentos.length);
  }
  // O pontudo tem paredes verticais; o plano tem lados horizontais.
  const pontudo = segmentosDaGrade(HEX, vista, 1);
  const plano = segmentosDaGrade(HEX_PLANO, vista, 1);
  assert.ok(pontudo.some(([x1, , x2]) => Math.abs(x1 - x2) < 1e-6));
  assert.ok(plano.some(([, y1, , y2]) => Math.abs(y1 - y2) < 1e-6));
  assert.ok(!pontudo.some(([, y1, , y2]) => Math.abs(y1 - y2) < 1e-6));
});

test('hexágono plano encaixa no centro do plano (o pontudo com os eixos trocados)', () => {
  assert.deepEqual(encaixar({ x: 0, y: 0 }, HEX_PLANO), { x: 0, y: 0 });
  const baixo = encaixar({ x: 4, y: 96 }, HEX_PLANO);
  assert.ok(Math.abs(baixo.x) < 1e-6 && Math.abs(baixo.y - 100) < 1e-6);
  const lado = encaixar({ x: 84, y: 52 }, HEX_PLANO);
  assert.ok(Math.abs(lado.x - (100 / Math.sqrt(3)) * 1.5) < 1e-6 && Math.abs(lado.y - 50) < 1e-6);
  // O centro encontrado encaixa nele mesmo.
  const de = encaixar({ x: 333, y: 777 }, HEX_PLANO);
  const outra = encaixar(de, HEX_PLANO);
  assert.ok(Math.abs(de.x - outra.x) < 1e-6 && Math.abs(de.y - outra.y) < 1e-6);
});

test('a régua mede a diagonal do jeito escolhido', () => {
  const origem = { x: 50, y: 50 };
  const tres = { x: 350, y: 350 };
  const grade = (medicao: IGrade['medicao']): IGrade => ({ ...QUADRADA, medicao });
  assert.equal(medir([origem, tres], grade('euclidiana')).quadrados, 4.2);
  assert.equal(medir([origem, tres], grade('chebyshev')).quadrados, 3);
  assert.equal(medir([origem, tres], grade('alternada')).quadrados, 4);
  assert.equal(medir([origem, tres], grade('manhattan')).quadrados, 6);
  // Sem a escolha, vale a reta de sempre.
  assert.equal(medir([origem, tres], QUADRADA).quadrados, 4.2);
  assert.equal(medir([origem, { x: 650, y: 50 }], grade('alternada')).quadrados, 6);
});

test('a distância por casa e a unidade viram o rótulo da régua', () => {
  const emPes: IGrade = { ...QUADRADA, metros: 5, unidade: 'ft', medicao: 'chebyshev' };
  assert.deepEqual(medir([{ x: 50, y: 50 }, { x: 450, y: 250 }], emPes), { quadrados: 4, metros: 20 });
  assert.equal(rotuloUnidade(emPes.unidade), 'ft');
  assert.equal(rotuloUnidade(undefined), 'm');
});

test('medida de hexágono conta passos entre hexágonos', () => {
  const um = encaixar({ x: 100, y: 0 }, HEX);
  assert.equal(passosEntreHex({ x: 0, y: 0 }, um, HEX), 1);
  const longe = encaixar({ x: 500, y: 0 }, HEX);
  assert.equal(passosEntreHex({ x: 0, y: 0 }, longe, HEX), 5);
  const diagonal = encaixar({ x: 50, y: (100 / Math.sqrt(3)) * 1.5 }, HEX);
  assert.equal(passosEntreHex({ x: 0, y: 0 }, diagonal, HEX), 1);
  const plano = encaixar({ x: 0, y: 300 }, HEX_PLANO);
  assert.equal(passosEntreHex({ x: 0, y: 0 }, plano, HEX_PLANO), 3);
  assert.equal(casasDoTrecho({ x: 0, y: 0 }, longe, { ...HEX, medicao: 'hex' }), 5);
});

test('a medida escolhida que não combina com o formato cai na natural dele', () => {
  assert.equal(medicaoEfetiva({ tipo: 'hex', medicao: 'chebyshev' }), 'hex');
  assert.equal(medicaoEfetiva({ tipo: 'hex-plano', medicao: 'euclidiana' }), 'euclidiana');
  assert.equal(medicaoEfetiva({ tipo: 'quadrada', medicao: 'hex' }), 'euclidiana');
  assert.equal(medicaoEfetiva({ tipo: 'quadrada' }), 'euclidiana');
});

test('tracejado parte da origem do mapa: o ritmo não corre quando a vista anda', () => {
  const nomeUm = tracejar([[7, 0, 107, 0]], 10, 5);
  const nomeDois = tracejar([[37, 0, 137, 0]], 10, 5);
  // Os traços caem nos mesmos lugares do mapa, em vez de recomeçar em cada ponta cortada pela vista.
  const posicoes = (traços: number[][]) => traços.map(([x1]) => Math.round(x1));
  const emComum = posicoes(nomeUm).filter((x) => posicoes(nomeDois).includes(x));
  assert.ok(emComum.length >= 5);
  assert.ok(nomeUm.every(([x1, , x2]) => x2 - x1 <= 10.0001 && x2 > x1));
  // Sem traço (cheio zero), devolve os segmentos como vieram.
  const inteiros = [[0, 0, 10, 0]] as Array<[number, number, number, number]>;
  assert.equal(tracejar(inteiros, 0, 5), inteiros);
});
