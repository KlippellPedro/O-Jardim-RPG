import assert from 'node:assert/strict';
import test from 'node:test';

import magiasData from '../../data/ficha/magias.json';
import { MAGIAS_CATALOGO } from '../../src/services/magiaService';

// Decisão de 2026-10-20 (balanceamento do Vazio, opção A): as duas duplicatas
// viraram as magias de sensação e memória que o Fluxo prometia (ids iguais),
// o que consome magia tem teto e deixa cura passar, e personagem de jogador
// não some sem passar pelo Morrendo.

const magia = (id: string) => {
  const encontrada = MAGIAS_CATALOGO.find((item) => item.id === id) as any;
  assert.ok(encontrada, `${id} sumiu do catálogo`);
  return encontrada;
};

test('as duplicatas viraram Sentido Apagado e Esquecimento, com os mesmos ids', () => {
  assert.equal(magia('nada-pessoal').titulo, 'Sentido Apagado');
  assert.equal(magia('nada-pessoal').defesa, 'Vontade');
  assert.equal(magia('silenciar-fluxo').titulo, 'Esquecimento');
  assert.notEqual(magia('silenciar-fluxo').efeito, magia('lei-do-fluxo').efeitos_por_fluxo.vazio);
  const manto = (magiasData.encantamentos as any[]).find((item) => item.id === 'manto-do-nao-ser');
  assert.equal(manto.titulo, 'Manto do Instante Ausente');
});

test('o que consome magia tem teto e deixa cura passar', () => {
  assert.match(magia('escudo-do-vazio').efeito, /hostil de até 8º círculo/);
  assert.match(magia('avatar-do-fluxo').efeitos_por_fluxo.vazio, /hostil de até 8º círculo/);
  assert.match(magia('apagar-efeito').efeito, /de até 8º círculo/);
  assert.match(magia('apagar-do-mapa').efeito, /encerra o efeito/);
  assert.equal(magia('apagar-do-mundo').defesa, 'Vontade se hostil');
});

test('personagem de jogador cai Morrendo, e nada pede "reconquista"', () => {
  assert.match(magia('abismo-aberto').efeito, /personagem de jogador cai Morrendo/);
  assert.match(magia('singularidade').efeitos_por_fluxo.vazio, /personagem de jogador cai Morrendo/);
  const doVazio = JSON.stringify(MAGIAS_CATALOGO.filter((item) => item.fluxo === 'vazio'));
  assert.doesNotMatch(doVazio, /reconquista|em vez de matar|em vez de morto|não queima nem corta/);
  assert.match(magia('toque-do-abismo').efeito, /24 horas/);
});
