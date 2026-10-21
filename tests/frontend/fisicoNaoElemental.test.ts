import assert from 'node:assert/strict';
import test from 'node:test';

import magiasData from '../../data/ficha/magias.json';
import { MAGIAS_CATALOGO, circuloDaElementarista, magiaElegivelParaAprender, podeConjurarMagia } from '../../src/services/magiaService.ts';

// Decisão de 2026-10-20 (opção C): o Canalizador e o Sintonizador de Baluarte
// não tinham magia do Físico no 2º, 6º e 9º círculos, porque todas eram
// Elementais (exclusivas da Elementarista). Armadura de Matéria, Muralha do
// Baluarte e Égide de Moros saíram da lista elemental, e o Poço de Gravidade
// entrou no 6º.

const elementais = new Set(magiasData.regras.acesso_elemental.magias_elementais_ids);
const fisico = MAGIAS_CATALOGO.filter((magia) => magia.fluxo === 'fisico');

const canalizadorDeBaluarte = {
  arvoreId: 'moros',
  racaId: 'humano',
  classeId: 'canalizador',
  classes: [{ classeId: 'canalizador', nivel: 20 }],
  nivel: 20,
  atributosFinais: { forca: 10, destreza: 10, constituicao: 10, inteligencia: 10, sabedoria: 10, carisma: 10, fluxo: 50 },
  pericias: { misticismo: 'aprendiz' },
  magiasConhecidasIds: [],
};

test('todo círculo do Físico tem ao menos uma magia fora da lista elemental', () => {
  for (let circulo = 1; circulo <= 10; circulo += 1) {
    const livres = fisico.filter((magia) => magia.circulo === circulo && !elementais.has(magia.id));
    assert.ok(livres.length >= 1, `${circulo}º círculo do Físico sem magia livre`);
  }
});

test('o Canalizador de Baluarte aprende as três liberadas e o Poço de Gravidade', () => {
  for (const id of ['armadura-de-materia', 'muralha-do-baluarte', 'egide-de-moros', 'poco-de-gravidade']) {
    const magia = MAGIAS_CATALOGO.find((item) => item.id === id);
    assert.ok(magia, `${id} sumiu do catálogo`);
    assert.equal(elementais.has(id), false, `${id} voltou para a lista elemental`);
    assert.equal(magiaElegivelParaAprender(canalizadorDeBaluarte, magia).permitido, true, id);
  }
  // As Elementais de verdade continuam exclusivas da Elementarista.
  const ariete = MAGIAS_CATALOGO.find((item) => item.id === 'ariete-elemental');
  assert.ok(ariete);
  assert.equal(magiaElegivelParaAprender(canalizadorDeBaluarte, ariete).permitido, false);
});

test('o Poço de Gravidade é controle de área do 6º círculo, sem dano e com Fortitude', () => {
  const poco = MAGIAS_CATALOGO.find((item) => item.id === 'poco-de-gravidade');
  assert.ok(poco);
  assert.equal(poco.circulo, 6);
  assert.equal(poco.custo_mana, 19);
  assert.equal(poco.defesa, 'Fortitude');
  assert.equal(poco.concentracao, true);
  assert.equal(poco.dano, undefined);
  assert.match(poco.efeito, /Aliados escolhidos/);
  // As liberadas não dependem mais de ter um elemento declarado.
  for (const id of ['armadura-de-materia', 'muralha-do-baluarte']) {
    assert.match(MAGIAS_CATALOGO.find((item) => item.id === id)?.efeito || '', /pedra/);
  }
});

// Decisão de 2026-10-20 (opção A da decisão 4): magia Elemental só até o círculo
// que os níveis de Elementarista liberam. O mergulho de 1 nível sobre um
// Canalizador 20 não abre mais as Elementais até o 10º.
const comElementarista = (classes: Array<{ classeId: string; nivel: number }>, extra: Record<string, unknown> = {}) => ({
  ...canalizadorDeBaluarte,
  classeId: classes[0].classeId,
  classes,
  nivel: classes.reduce((soma, item) => soma + item.nivel, 0),
  escolhasHabilidade: { 'elementarista:afinidade-elemental': ['fogo'] },
  ...extra,
});
const magia = (id: string) => {
  const encontrada = MAGIAS_CATALOGO.find((item) => item.id === id);
  assert.ok(encontrada, `${id} sumiu do catálogo`);
  return encontrada;
};

test('1 nível de Elementarista sobre um Canalizador 20 só abre as Elementais até o 2º', () => {
  const mergulho = comElementarista([{ classeId: 'canalizador', nivel: 20 }, { classeId: 'elementarista', nivel: 1 }]);
  assert.equal(circuloDaElementarista(mergulho), 2);
  assert.equal(magiaElegivelParaAprender(mergulho, magia('impacto-elemental')).permitido, true);
  assert.equal(magiaElegivelParaAprender(mergulho, magia('rajada-elemental')).permitido, true);
  const acima = magiaElegivelParaAprender(mergulho, magia('explosao-elemental'));
  assert.equal(acima.permitido, false);
  assert.match(acima.motivo || '', /2º círculo/);
  // O que já foi aprendido antes da trava continua conjurável.
  assert.equal(podeConjurarMagia({ ...mergulho, magiasConhecidasIds: ['tempestade-elemental'] }, magia('tempestade-elemental')).permitido, true);
});

test('a Elementarista sobe o teto com os próprios níveis, e o Avatar continua exigido', () => {
  const elementarista15 = comElementarista([{ classeId: 'elementarista', nivel: 15 }]);
  assert.equal(circuloDaElementarista(elementarista15), 8);
  assert.equal(magiaElegivelParaAprender(elementarista15, magia('tempestade-elemental')).permitido, true);
  assert.equal(magiaElegivelParaAprender(elementarista15, magia('julgamento-dos-elementos')).permitido, false);
  assert.equal(circuloDaElementarista(canalizadorDeBaluarte), 0);
});
