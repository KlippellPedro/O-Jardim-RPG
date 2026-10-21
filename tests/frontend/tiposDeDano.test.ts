import assert from 'node:assert/strict';
import test from 'node:test';

import magiasData from '../../data/ficha/magias.json';
import { MAGIAS_CATALOGO, tipoDeDanoDaMagia } from '../../src/services/magiaService';

// Decisão de 2026-10-20 (tipos de dano, opção A): magia que não diz o tipo
// causa o dano do próprio Fluxo; Tecnologia é tecnológico; a universal segue o
// Fluxo que a canaliza; o Físico sem elemento é impacto.

const magia = (id: string) => {
  const encontrada = MAGIAS_CATALOGO.find((item) => item.id === id);
  assert.ok(encontrada, `${id} sumiu do catálogo`);
  return encontrada;
};

test('a ficha diz o tipo de dano de cada magia', () => {
  assert.equal(tipoDeDanoDaMagia(magia('toque-nulo'), null), 'de Vazio');
  assert.equal(tipoDeDanoDaMagia(magia('ultimo-ponto'), null), 'do Fim');
  assert.equal(tipoDeDanoDaMagia(magia('descarga-de-sistema'), null), 'tecnológico');
  assert.equal(tipoDeDanoDaMagia(magia('impacto-elemental'), null), 'do elemento declarado');
  assert.equal(tipoDeDanoDaMagia(magia('terremoto-menor'), null), 'de impacto');
  assert.equal(tipoDeDanoDaMagia(magia('golpe-instavel'), null), 'de tipo sorteado');
  assert.equal(tipoDeDanoDaMagia(magia('ruido-de-canal'), null), 'de Comunicação');
  // Universal: o tipo segue o Fluxo que canaliza.
  assert.equal(tipoDeDanoDaMagia(magia('toque-do-fluxo'), 'tempo'), 'de Tempo');
  assert.equal(tipoDeDanoDaMagia(magia('toque-do-fluxo'), 'inconstancia'), 'de tipo sorteado');
  assert.equal(tipoDeDanoDaMagia(magia('arma-de-fluxo'), 'fisico'), 'de corte, perfuração ou impacto');
  assert.equal(tipoDeDanoDaMagia(magia('toque-do-fluxo'), null), 'do Fluxo que a canaliza');
  assert.equal(tipoDeDanoDaMagia(magia('escudo-material'), null), null);
});

test('Comunicação ataca com dano de Comunicação, Vitalidade com dano de Vitalidade, e nada de frio em golpe', () => {
  for (const item of MAGIAS_CATALOGO.filter((entrada) => entrada.fluxo === 'comunicacao' && entrada.dano)) {
    assert.doesNotMatch(item.efeito, /^Causa dano mental/, item.id);
  }
  assert.doesNotMatch(JSON.stringify(MAGIAS_CATALOGO), /Causa dano de veneno|O dano é de veneno/);
  assert.doesNotMatch(JSON.stringify(magiasData.encantamentos), /fogo, frio, raio/);
});
