import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { ajustarMira, lerAlcanceDaMagia, limitarAoAlcance, miraDaMagia } from '../../src/pages/Mapa/motor/miraDaMagia.ts';

const catalogo = JSON.parse(readFileSync(new URL('../../data/ficha/magias.json', import.meta.url), 'utf8'));
const magias = catalogo.magias as Array<{ id: string; titulo: string; fluxo: string; alcance: string; alvo: string }>;

test('as 355 magias do catálogo têm um alcance que a ponte entende, e uma magia nova com texto diferente falha aqui', () => {
  assert.ok(magias.length >= 355);
  const sem = magias.filter((m) => lerAlcanceDaMagia(m.alcance, m.alvo) === null).map((m) => `${m.id}: ${m.alcance}`);
  assert.deepEqual(sem, []);
});

test('o texto vira alcance e área, sem confundir cone, área e linha', () => {
  assert.deepEqual(lerAlcanceDaMagia('Longo (25 m); área de 9 m'), { pessoal: false, alcanceM: 25, areaM: 9, coneM: null, linhaM: null });
  assert.deepEqual(lerAlcanceDaMagia('Médio (15 m); área de 4,5 m'), { pessoal: false, alcanceM: 15, areaM: 4.5, coneM: null, linhaM: null });
  assert.deepEqual(lerAlcanceDaMagia('Curto (5 m); cone de 6 m', 'Área'), { pessoal: false, alcanceM: 5, areaM: null, coneM: 6, linhaM: null });
  assert.deepEqual(lerAlcanceDaMagia('Médio (15 m)', 'Uma linha de até 9 m'), { pessoal: false, alcanceM: 15, areaM: null, coneM: null, linhaM: 9 });
  assert.equal(lerAlcanceDaMagia('Pessoal')?.pessoal, true);
  assert.equal(lerAlcanceDaMagia('Pessoal ou toque')?.pessoal, true);
  assert.equal(lerAlcanceDaMagia('Toque')?.alcanceM, 1.5);
  assert.equal(lerAlcanceDaMagia('Adjacente')?.alcanceM, 1.5);
  assert.equal(lerAlcanceDaMagia('Colossal (150 m); área de 150 m')?.areaM, 150);
});

test('texto fora do padrão não vira mira: a ponte não chuta', () => {
  for (const ruim of ['', 'Longo', 'Longo (25 m); esfera de 9 m', 'Longo (25 m); área de nove m', 'Distante (25 m)', 'Longo (25 m) área de 9 m']) {
    assert.equal(lerAlcanceDaMagia(ruim), null, ruim);
  }
});

test('a forma da mira vem da magia: cone, linha, círculo com área, ou impacto no alvo', () => {
  const por = (id: string) => miraDaMagia(magias.find((m) => m.id === id)!);
  assert.equal(por('sopro-do-fluxo')?.forma, 'cone');
  assert.equal(por('muralha-elemental')?.forma, 'linha');
  assert.equal(por('campo-germinal')?.forma, 'circulo');
  assert.equal(por('campo-germinal')?.tamanhoM, 4.5);
  assert.equal(por('campo-germinal')?.alcanceM, 15);
  assert.equal(por('campo-germinal')?.fluxo, 'origem');
  assert.equal(por('campo-germinal')?.resumo, 'Alcance 15 m, raio de 4,5 m');
  assert.equal(por('centelha-de-possibilidade')?.forma, 'impacto');
  // Magia universal não tem cor de Fluxo: a barra do mapa decide.
  assert.equal(miraDaMagia({ titulo: 'x', fluxo: 'universal', alcance: 'Curto (5 m)' })?.fluxo, null);
  // Magia pessoal não tem o que mirar.
  assert.equal(miraDaMagia({ titulo: 'x', fluxo: 'origem', alcance: 'Pessoal' }), null);
});

test('toda magia que não é pessoal vira uma mira com forma e alcance', () => {
  for (const magia of magias) {
    const mira = miraDaMagia(magia);
    if (/^Pessoal/i.test(magia.alcance)) assert.equal(mira, null, magia.id);
    else assert.ok(mira && mira.alcanceM !== null && ['circulo', 'cone', 'linha', 'impacto'].includes(mira.forma), magia.id);
  }
});

test('limitar ao alcance: dentro fica, fora vai para a borda na mesma direção', () => {
  const centro = { x: 100, y: 100 };
  assert.deepEqual(limitarAoAlcance(centro, { x: 150, y: 100 }, 100), { x: 150, y: 100 });
  assert.deepEqual(limitarAoAlcance(centro, { x: 500, y: 100 }, 100), { x: 200, y: 100 });
  const diagonal = limitarAoAlcance(centro, { x: 400, y: 500 }, 50);
  assert.ok(Math.abs(Math.hypot(diagonal.x - 100, diagonal.y - 100) - 50) < 1e-9);
  assert.deepEqual(limitarAoAlcance(centro, { x: 900, y: 900 }, null), { x: 900, y: 900 });
});

test('o círculo cai dentro do alcance com o raio da magia; o cone e a linha saem do conjurador com o tamanho dela', () => {
  const eu = { x: 0, y: 0 };
  const circulo = ajustarMira('circulo', eu, { x: 1000, y: 0 }, 300, 90);
  assert.deepEqual(circulo.inicio, { x: 300, y: 0 });
  assert.deepEqual(circulo.fim, { x: 390, y: 0 }, 'raio fixo de 90 a partir do centro');
  const perto = ajustarMira('circulo', eu, { x: 100, y: 50 }, 300, 90);
  assert.deepEqual(perto.inicio, { x: 100, y: 50 });
  const cone = ajustarMira('cone', eu, { x: 0, y: 50 }, 300, 120);
  assert.deepEqual(cone.inicio, eu);
  assert.ok(Math.abs(cone.fim.x) < 1e-9 && Math.abs(cone.fim.y - 120) < 1e-9, 'o cone aponta para onde a mão está e tem o tamanho da magia');
  const parada = ajustarMira('linha', eu, eu, 300, 60);
  assert.deepEqual(parada.fim, { x: 60, y: 0 }, 'mão em cima do conjurador: uma direção qualquer, nunca NaN');
  const impacto = ajustarMira('impacto', eu, { x: 0, y: -900 }, 250, null);
  assert.deepEqual(impacto.fim, { x: 0, y: -250 }, 'o impacto não passa do alcance');
});

test('sem token do conjurador a mira sai da mão, sem limite de lugar', () => {
  const mao = { x: 700, y: 300 };
  assert.deepEqual(ajustarMira('circulo', null, mao, 300, 50), { inicio: mao, fim: { x: 750, y: 300 } });
  assert.deepEqual(ajustarMira('impacto', null, mao, 300, null), { inicio: mao, fim: mao });
});
