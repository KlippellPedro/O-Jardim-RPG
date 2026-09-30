import assert from 'node:assert/strict';
import test from 'node:test';
import progressaoData from '../../data/ficha/progressao-niveis.json';
import {
  NIVEL_CONTEUDO_CLASSE,
  NIVEL_MAXIMO_CLASSE,
  NIVEL_MINIMO_GRAU,
  PATAMARES_NIVEL,
  aumentosAtributoPorNivel,
  custoDoNivel,
  indiceDoMaiorGrauPorNivel,
  legadosPorNivel,
  nivelPorXp,
  patamarAtual,
  patamaresAlcancados,
  rotuloDoPatamar,
  vagasItemEspecialPorNivel,
  xpParaNivel,
} from '../../src/services/progressaoNiveis';

// Os mesmos valores estão em plataforma/tests/test_progressao_niveis.py: se um
// lado mudar sem o outro, um dos dois testes quebra.
const XP_ESPERADO: Array<[number, number]> = [
  [1, 0], [2, 1_000], [20, 190_000], [60, 1_770_000], [99, 4_851_000], [100, 4_950_000],
  [101, 5_050_000], [149, 9_850_000], [150, 9_950_000], [151, 10_100_000], [249, 24_800_000],
  [250, 24_950_000], [251, 25_200_000], [499, 87_200_000], [500, 87_450_000], [501, 87_950_000],
  [1000, 337_450_000],
];

const CUSTO_ESPERADO: Array<[number, number]> = [
  [1, 1_000], [59, 59_000], [99, 99_000], [100, 100_000], [149, 100_000], [150, 150_000],
  [249, 150_000], [250, 250_000], [499, 250_000], [500, 500_000], [1000, 500_000],
];

const LEGADOS_ESPERADOS: Array<[number, number]> = [
  [0, 0], [4, 0], [5, 1], [49, 9], [50, 10], [59, 10], [60, 11], [100, 15], [119, 15],
  [120, 16], [199, 19], [200, 20], [500, 35],
];

const ATRIBUTOS_ESPERADOS: Array<[number, number]> = [
  [3, 0], [4, 1], [48, 12], [50, 12], [57, 12], [58, 13], [60, 13], [100, 18], [115, 18],
  [116, 19], [200, 24],
];

test('xp acumulado bate com a tabela de sempre até o 100 e com as faixas depois', () => {
  for (const [nivel, xp] of XP_ESPERADO) assert.equal(xpParaNivel(nivel), xp, `nível ${nivel}`);
});

test('do 1 ao 100 o xp segue a fórmula 500 x N x (N - 1)', () => {
  for (let nivel = 1; nivel <= 100; nivel += 1) {
    assert.equal(xpParaNivel(nivel), 500 * nivel * (nivel - 1), `nível ${nivel}`);
  }
});

test('custo de cada nível: fórmula até o 99 e um valor fixo por faixa depois', () => {
  for (const [nivel, custo] of CUSTO_ESPERADO) assert.equal(custoDoNivel(nivel), custo, `nível ${nivel}`);
});

test('a primeira faixa fixa começa onde a fórmula termina', () => {
  const faixas = [...progressaoData.xp.faixas].sort((a, b) => a.a_partir_do_nivel - b.a_partir_do_nivel);
  assert.equal(faixas[0].a_partir_do_nivel, progressaoData.xp.formula.ate_nivel);
});

test('nivelPorXp é o inverso de xpParaNivel, sem teto', () => {
  const niveis = [1, 2, 3, 19, 20, 60, 99, 100, 101, 149, 150, 151, 249, 250, 251, 499, 500, 501, 1000, 1450];
  for (const nivel of niveis) {
    assert.equal(nivelPorXp(xpParaNivel(nivel)), nivel, `nível ${nivel}`);
    if (nivel > 1) assert.equal(nivelPorXp(xpParaNivel(nivel) - 1), nivel - 1, `um XP antes do nível ${nivel}`);
  }
});

test('nivelPorXp aceita lixo sem quebrar', () => {
  assert.equal(nivelPorXp(-10), 1);
  assert.equal(nivelPorXp(Number.NaN), 1);
  assert.equal(nivelPorXp(Number.POSITIVE_INFINITY), 1);
  assert.equal(nivelPorXp('abc' as unknown as number), 1);
});

test('legados: 1 a cada 5 até o 50, a cada 10 até o 100, a cada 20 depois', () => {
  for (const [nivel, legados] of LEGADOS_ESPERADOS) assert.equal(legadosPorNivel(nivel), legados, `nível ${nivel}`);
});

test('aumentos de atributo seguem as mesmas faixas, começando em 4', () => {
  for (const [nivel, aumentos] of ATRIBUTOS_ESPERADOS) {
    assert.equal(aumentosAtributoPorNivel(nivel), aumentos, `nível ${nivel}`);
  }
});

test('item especial: pelo menos 1 vaga, depois o ritmo do atributo', () => {
  assert.equal(vagasItemEspecialPorNivel(1), 1);
  assert.equal(vagasItemEspecialPorNivel(7), 1);
  assert.equal(vagasItemEspecialPorNivel(8), 2);
  assert.equal(vagasItemEspecialPorNivel(50), 12);
  assert.equal(vagasItemEspecialPorNivel(58), 13);
  assert.equal(vagasItemEspecialPorNivel(100), 18);
});

test('até o 50 nada muda para quem já está no padrão', () => {
  for (let nivel = 1; nivel <= 50; nivel += 1) {
    assert.equal(legadosPorNivel(nivel), Math.floor(nivel / 5), `legados no nível ${nivel}`);
    assert.equal(aumentosAtributoPorNivel(nivel), Math.floor(nivel / 4), `atributos no nível ${nivel}`);
  }
});

test('patamares 60, 100, 150, 250 e 500', () => {
  assert.deepEqual([...PATAMARES_NIVEL], [60, 100, 150, 250, 500]);
  assert.deepEqual(patamaresAlcancados(59), []);
  assert.deepEqual(patamaresAlcancados(60), [60]);
  assert.deepEqual(patamaresAlcancados(99), [60]);
  assert.deepEqual(patamaresAlcancados(100), [60, 100]);
  assert.deepEqual(patamaresAlcancados(500), [60, 100, 150, 250, 500]);
  assert.equal(patamarAtual(59), null);
  assert.equal(patamarAtual(60), 60);
  assert.equal(patamarAtual(249), 150);
  assert.equal(patamarAtual(250), 250);
});

test('grau de perícia máximo por nível total: renomado só a partir do 29', () => {
  assert.deepEqual([...NIVEL_MINIMO_GRAU], [1, 1, 3, 7, 13, 19, 29]);
  const casos: Array<[number, number]> = [[1, 1], [2, 1], [3, 2], [6, 2], [7, 3], [12, 3], [13, 4], [18, 4], [19, 5], [28, 5], [29, 6], [200, 6]];
  for (const [nivel, indice] of casos) assert.equal(indiceDoMaiorGrauPorNivel(nivel), indice, `nível ${nivel}`);
});

test('rótulo do patamar em algarismos romanos, ou nada dentro do padrão', () => {
  assert.equal(rotuloDoPatamar(59), null);
  assert.deepEqual([60, 99, 100, 150, 250, 500, 1450].map(rotuloDoPatamar), [
    'Patamar I', 'Patamar I', 'Patamar II', 'Patamar III', 'Patamar IV', 'Patamar V', 'Patamar V',
  ]);
});

test('classe: conteúdo escrito até o 20, botão de subir até o 50', () => {
  assert.equal(NIVEL_CONTEUDO_CLASSE, 20);
  assert.equal(NIVEL_MAXIMO_CLASSE, 50);
});
