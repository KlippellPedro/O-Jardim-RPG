import assert from 'node:assert/strict';
import test from 'node:test';
import {
  DURACAO_PADRAO_DO_TRACO_MS, MAX_PONTOS_DO_TRACO, OPCOES_DE_DESENHO_PADRAO, SUMIR_EM_MS, acrescentarPontoDoLapis, opacidadeDoTraco,
  opcoesDeDesenhoValidas, pontaDaSeta, reduzirPontos, tracoValeAPena,
} from '../../src/pages/Mapa/motor/tracosConta.ts';

test('o lápis só ganha ponto novo quando a mão andou o passo, e o último acompanha a mão ao passar do teto', () => {
  const base = [{ x: 0, y: 0 }];
  assert.equal(acrescentarPontoDoLapis(base, { x: 1, y: 1 }, 3), base);
  assert.deepEqual(acrescentarPontoDoLapis(base, { x: 10, y: 0 }, 3), [{ x: 0, y: 0 }, { x: 10, y: 0 }]);
  const cheio = Array.from({ length: MAX_PONTOS_DO_TRACO }, (_, i) => ({ x: i * 10, y: 0 }));
  const depois = acrescentarPontoDoLapis(cheio, { x: 9999, y: 0 }, 3);
  assert.equal(depois.length, MAX_PONTOS_DO_TRACO);
  assert.deepEqual(depois[depois.length - 1], { x: 9999, y: 0 });
});

test('reduzir um traço comprido ao teto mantém o começo e o fim', () => {
  const longo = Array.from({ length: 500 }, (_, i) => ({ x: i, y: i * 2 }));
  const curto = reduzirPontos(longo);
  assert.equal(curto.length, MAX_PONTOS_DO_TRACO);
  assert.deepEqual(curto[0], longo[0]);
  assert.deepEqual(curto[curto.length - 1], longo[longo.length - 1]);
  assert.deepEqual(reduzirPontos(longo.slice(0, 10)), longo.slice(0, 10));
});

test('a ponta da seta abre dos dois lados da linha, atrás da ponta', () => {
  const [esquerda, direita] = pontaDaSeta({ x: 0, y: 0 }, { x: 100, y: 0 }, 16);
  assert.ok(esquerda.x < 100 && direita.x < 100);
  assert.ok(Math.abs(esquerda.y + direita.y) < 1e-9, 'simétricas em relação ao eixo da seta');
  assert.notEqual(esquerda.y, direita.y);
  assert.ok(Math.abs(Math.hypot(100 - esquerda.x, esquerda.y) - 16) < 1e-9);
});

test('o traço fica inteiro e some devagar no fim; depois da duração não existe mais', () => {
  assert.equal(opacidadeDoTraco(0, 10000), 1);
  assert.equal(opacidadeDoTraco(10000 - SUMIR_EM_MS, 10000), 1);
  const meio = opacidadeDoTraco(10000 - SUMIR_EM_MS / 2, 10000);
  assert.ok(meio > 0.45 && meio < 0.55);
  assert.equal(opacidadeDoTraco(10000, 10000), 0);
  assert.equal(opacidadeDoTraco(99999, 10000), 0);
});

test('um clique parado não vira desenho; arrastar um pouco vale', () => {
  assert.equal(tracoValeAPena('seta', [{ x: 5, y: 5 }, { x: 5, y: 5 }], 4), false);
  assert.equal(tracoValeAPena('seta', [{ x: 5, y: 5 }, { x: 40, y: 5 }], 4), true);
  assert.equal(tracoValeAPena('lapis', [{ x: 0, y: 0 }, { x: 1, y: 1 }, { x: 0, y: 1 }], 4), false);
  assert.equal(tracoValeAPena('lapis', [{ x: 0, y: 0 }, { x: 30, y: 10 }, { x: 0, y: 1 }], 4), true, 'um laço que volta ao começo ainda é um desenho');
  assert.equal(tracoValeAPena('lapis', [{ x: 0, y: 0 }], 4), false);
});

test('as opções guardadas no aparelho voltam ao padrão quando vêm quebradas', () => {
  assert.deepEqual(opcoesDeDesenhoValidas(null), OPCOES_DE_DESENHO_PADRAO);
  assert.deepEqual(opcoesDeDesenhoValidas({ forma: 'pincel', duracao: 7, privado: 'sim' }), OPCOES_DE_DESENHO_PADRAO);
  assert.deepEqual(opcoesDeDesenhoValidas({ forma: 'seta', duracao: 30000, privado: true }), { forma: 'seta', duracao: 30000, privado: true });
  assert.equal(OPCOES_DE_DESENHO_PADRAO.duracao, DURACAO_PADRAO_DO_TRACO_MS);
});
