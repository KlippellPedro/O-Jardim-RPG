import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import progressaoData from '../../data/ficha/progressao-niveis.json';
import {
  BONUS_GRAU,
  vantagensDoGrau,
  GRAUS_PERICIA,
  GRAUS_PERICIA_DADOS,
  NIVEL_CONTEUDO_CLASSE,
  NIVEL_MAXIMO_CLASSE,
  NIVEL_MINIMO_GRAU,
  PATAMARES_NIVEL,
  VD_MAXIMO,
  aumentosAtributoPorNivel,
  custoDoNivel,
  indiceDoMaiorGrauPorNivel,
  legadosPorNivel,
  nivelPorXp,
  nomeDoGrauPericia,
  patamarAtual,
  patamaresAlcancados,
  rotuloDoPatamar,
  vagasItemEspecialPorNivel,
  vdAntigoParaNivel,
  xpParaNivel,
  xpPorVd,
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

test('doze graus de perícia: os sete de sempre e cinco novos, um por patamar', () => {
  assert.deepEqual([...GRAUS_PERICIA], [
    'iniciante', 'aprendiz', 'treinado', 'especialista', 'mestre', 'veterano', 'renomado',
    'lendario', 'mitico', 'cosmico', 'eterno', 'absoluto',
  ]);
  // Os mesmos valores estão em plataforma/tests/test_progressao_niveis.py.
  assert.deepEqual(GRAUS_PERICIA.map((grau) => BONUS_GRAU[grau]), [0, 2, 4, 6, 8, 10, 12, 14, 16, 18, 20, 22]);
  // Do Veterano em diante o grau dá uma fonte de vantagem a mais por degrau.
  assert.deepEqual(GRAUS_PERICIA.map((grau) => vantagensDoGrau(grau)), [0, 0, 0, 0, 0, 1, 2, 3, 4, 5, 6, 7]);
  assert.equal(vantagensDoGrau('Absoluto'), 7);
  assert.equal(vantagensDoGrau('inexistente'), 0);
  assert.equal(vantagensDoGrau(undefined), 0);
  assert.deepEqual([...NIVEL_MINIMO_GRAU], [1, 1, 3, 7, 13, 19, 29, 60, 100, 150, 250, 500]);
  assert.deepEqual(GRAUS_PERICIA_DADOS.map((grau) => grau.treino_dias), [0, 3, 7, 14, 21, 32, 62, 90, 120, 180, 270, 365]);
  assert.deepEqual(
    GRAUS_PERICIA_DADOS.slice(-5).map((grau) => nomeDoGrauPericia(grau.id)),
    ['Lendário', 'Mítico', 'Cósmico', 'Eterno', 'Absoluto'],
  );
});

test('os cinco graus novos abrem exatamente nos patamares de nível', () => {
  assert.deepEqual([...NIVEL_MINIMO_GRAU].slice(-PATAMARES_NIVEL.length), [...PATAMARES_NIVEL]);
});

test('graus só sobem: bônus, nível e tempo de treino nunca diminuem', () => {
  GRAUS_PERICIA_DADOS.forEach((grau, indice) => {
    if (indice === 0) return;
    const anterior = GRAUS_PERICIA_DADOS[indice - 1];
    assert.equal(grau.bonus - anterior.bonus, 2, `${grau.id}: cada degrau vale +2`);
    assert.ok(grau.nivel_minimo >= anterior.nivel_minimo, `${grau.id}: nível mínimo`);
    assert.ok(grau.treino_dias > anterior.treino_dias, `${grau.id}: dias de treino`);
  });
});

test('nome do grau de perícia aparece com acento e cai em maiúscula para id desconhecido', () => {
  assert.equal(nomeDoGrauPericia('lendario'), 'Lendário');
  assert.equal(nomeDoGrauPericia('COSMICO'), 'Cósmico');
  assert.equal(nomeDoGrauPericia('xis'), 'Xis');
  assert.equal(nomeDoGrauPericia(undefined), '');
});

test('grau de perícia máximo por nível total, um degrau novo em cada patamar', () => {
  const casos: Array<[number, number]> = [
    [1, 1], [2, 1], [3, 2], [6, 2], [7, 3], [12, 3], [13, 4], [18, 4], [19, 5], [28, 5], [29, 6], [59, 6],
    [60, 7], [99, 7], [100, 8], [149, 8], [150, 9], [249, 9], [250, 10], [499, 10], [500, 11], [5000, 11],
  ];
  for (const [nivel, indice] of casos) assert.equal(indiceDoMaiorGrauPorNivel(nivel), indice, `nível ${nivel}`);
});

test('a ficha tem cor para cada grau de perícia (o Tailwind descarta nome montado em runtime)', () => {
  const fonte = readFileSync(new URL('../../src/pages/Ficha/abas/AbaPericias.tsx', import.meta.url), 'utf8');
  for (const nome of ['ESTILOS_GRAU', 'CORES_GRAU']) {
    const bloco = fonte.slice(fonte.indexOf(`const ${nome}`), fonte.indexOf('};', fonte.indexOf(`const ${nome}`)));
    for (const grau of GRAUS_PERICIA) assert.match(bloco, new RegExp(`\\b${grau}:`), `${nome} sem ${grau}`);
  }
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

test('XP por VD: um quinto do custo do nível de mesmo número', () => {
  // Os mesmos valores estão em plataforma/tests/test_unit.py.
  const esperado: Array<[number, number]> = [
    [1, 200], [3, 600], [10, 2_000], [48, 9_600], [60, 12_000], [100, 20_000], [150, 30_000], [250, 50_000], [500, 100_000],
  ];
  for (const [vd, xp] of esperado) assert.equal(xpPorVd(vd), xp, `VD ${vd}`);
  assert.equal(xpPorVd(null), 0);
  assert.equal(xpPorVd(0), xpPorVd(1));
  assert.equal(xpPorVd(VD_MAXIMO + 500), xpPorVd(VD_MAXIMO));
  assert.equal(VD_MAXIMO, 1000);
});

test('VD antigo (1 a 10) vira o meio da faixa de 5 níveis', () => {
  assert.deepEqual(Array.from({ length: 10 }, (_, i) => vdAntigoParaNivel(i + 1)), [3, 8, 13, 18, 23, 28, 33, 38, 43, 48]);
});

test('todo monstro do catálogo tem VD igual ao nível', async () => {
  const { default: catalogo } = await import('../../data/loja/catalogo.json');
  const monstros = catalogo.entradas.filter((item: any) => item.tipo === 'monstro');
  assert.ok(monstros.length >= 121);
  for (const monstro of monstros as any[]) {
    assert.equal(monstro.conteudo.vd, monstro.conteudo.nivel, `${monstro.id}: VD diferente do nível`);
    assert.ok(monstro.conteudo.vd >= 1 && monstro.conteudo.vd <= VD_MAXIMO, `${monstro.id}: VD fora da faixa`);
  }
});
