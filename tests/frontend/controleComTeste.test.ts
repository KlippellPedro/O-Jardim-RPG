import assert from 'node:assert/strict';
import test from 'node:test';

import { MAGIAS_CATALOGO } from '../../src/services/magiaService';

// Decisão de 2026-10-20 (efeitos fortes sem teste, opção A): Estase, Parada do
// Mundo, Âncora do Ser e Zona Morta passam a ter teste para quem não quer o
// efeito, repetido ou com duração menor em inimigo.

const magia = (id: string) => {
  const encontrada = MAGIAS_CATALOGO.find((item) => item.id === id) as any;
  assert.ok(encontrada, `${id} sumiu do catálogo`);
  return encontrada;
};

test('as quatro magias de 10º círculo têm resistência no campo e no texto', () => {
  assert.equal(magia('conservacao-absoluta').defesa, 'Vontade');
  assert.equal(magia('conservacao-absoluta').somente_hostil, true);
  assert.match(magia('conservacao-absoluta').efeito, /repete o teste no fim de cada turno/);
  assert.equal(magia('parada-do-mundo').defesa, 'Vontade');
  assert.match(magia('parada-do-mundo').efeito, /Uma vez por descanso longo/);
  assert.equal(magia('ancora-do-ser').defesa, 'Vontade');
  assert.equal(magia('ancora-do-ser').somente_hostil, true);
  assert.match(magia('ancora-do-ser').efeito, /até o fim da cena/);
  const zona = magia('nada-absoluto');
  assert.equal(zona.defesa, 'Fortitude');
  assert.equal(zona.dano, '4d6');
  assert.match(zona.efeito, /Silenciado/);
  assert.doesNotMatch(zona.efeito, /mudos/);
});

test('a variação do Tempo no Verbo do Fluxo dura sete dias, como a Estase', () => {
  assert.match(magia('verbo-do-fluxo').efeitos_por_fluxo.tempo, /sete dias/);
});
