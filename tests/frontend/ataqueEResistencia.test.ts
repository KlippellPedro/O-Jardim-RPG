import assert from 'node:assert/strict';
import test from 'node:test';

import { MAGIAS_CATALOGO, leituraContraOAlvo, rotulosContraOAlvo } from '../../src/services/magiaService.ts';

// Decisão de 2026-10-20 (opção A da decisão 5): magia de ataque lê o total
// contra a Defesa e a resistência que ela lista vale só para o efeito extra;
// magia de efeito é resistida pelo alvo, com metade do dano no sucesso.

const RESISTENCIAS = new Set(['Reflexos', 'Fortitude', 'Vontade']);
const magia = (id: string) => {
  const encontrada = MAGIAS_CATALOGO.find((item) => item.id === id);
  assert.ok(encontrada, `${id} sumiu do catálogo`);
  return encontrada;
};

test('toda resistência do catálogo é Reflexos, Fortitude ou Vontade, com ou sem "se hostil"', () => {
  for (const item of MAGIAS_CATALOGO) {
    if (!item.defesa) continue;
    const nome = item.defesa.replace(/ se hostil$/, '');
    assert.ok(RESISTENCIAS.has(nome), `${item.id}: "${item.defesa}"`);
  }
});

test('magia de ataque é de alvo único e nunca reduz o dano pela resistência', () => {
  const ataques = MAGIAS_CATALOGO.filter((item) => item.ataque);
  assert.equal(ataques.length, 69);
  for (const item of ataques) {
    assert.equal(item.perfil, 'alvo', item.id);
    assert.doesNotMatch(item.efeito, /Em sucesso[^.]*metade do dano/i, item.id);
  }
});

test('as Elementais que reduzem o dano à metade viraram magias de efeito', () => {
  for (const id of ['impacto-elemental', 'rajada-elemental', 'lanca-elemental', 'ariete-elemental', 'julgamento-dos-elementos']) {
    const item = magia(id);
    assert.equal(item.ataque, false, id);
    assert.ok(item.defesa && RESISTENCIAS.has(item.defesa), id);
    assert.match(item.efeito, /metade/, id);
  }
});

test('ataque sem efeito extra resistível não lista resistência', () => {
  for (const id of ['ultimo-ponto', 'golpe-terminal', 'lanca-de-ions', 'arma-de-fluxo', 'colheita', 'feixe-perfurante']) {
    assert.equal(magia(id).defesa, null, id);
  }
  // Os que impõem algo além do dano continuam com a resistência do efeito extra.
  assert.equal(magia('ruido-de-canal').defesa, 'Vontade');
  assert.equal(magia('sentenca-final').defesa, 'Fortitude');
});

test('a ficha diz contra o que cada magia é lida', () => {
  assert.deepEqual(rotulosContraOAlvo(magia('ruido-de-canal')), ['Contra a Defesa', 'Efeito extra: Vontade', 'Crítico no 20 natural']);
  assert.deepEqual(rotulosContraOAlvo(magia('ultimo-ponto')), ['Contra a Defesa', 'Crítico no 20 natural']);
  assert.deepEqual(rotulosContraOAlvo(magia('impacto-elemental')), ['Resistência: Reflexos, metade do dano']);
  assert.deepEqual(rotulosContraOAlvo(magia('encerrar-efeito-menor')), ['Resistência: Vontade, se hostil']);
  assert.deepEqual(rotulosContraOAlvo(magia('escudo-material')), []);
});

test('a frase do resultado lê o total do jeito certo', () => {
  assert.equal(
    leituraContraOAlvo(magia('ruido-de-canal'), 18, 17),
    'Acerta a Defesa 17. O alvo rola Vontade contra 18 para evitar o efeito extra.',
  );
  assert.equal(
    leituraContraOAlvo(magia('ruido-de-canal'), 18),
    'Compare com a Defesa do alvo. Se acertar, o alvo rola Vontade contra 18 para evitar o efeito extra.',
  );
  assert.equal(leituraContraOAlvo(magia('ruido-de-canal'), 12, 17), 'Não alcança a Defesa 17.');
  assert.equal(leituraContraOAlvo(magia('ultimo-ponto'), 12, 15), 'Não alcança a Defesa 15.');
  assert.equal(leituraContraOAlvo(magia('ultimo-ponto'), 12), 'Compare com a Defesa do alvo.');
  assert.equal(
    leituraContraOAlvo(magia('impacto-elemental'), 14),
    'O alvo rola Reflexos contra 14; quem resistir sofre metade do dano e evita o efeito extra.',
  );
  assert.equal(leituraContraOAlvo(magia('encerrar-efeito-menor'), 20), 'Se não quiser o efeito, o alvo rola Vontade contra 20.');
  assert.equal(leituraContraOAlvo(magia('escudo-material'), 9), '');
});
