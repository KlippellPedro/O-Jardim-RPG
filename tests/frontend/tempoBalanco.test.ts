import assert from 'node:assert/strict';
import test from 'node:test';

import magiasData from '../../data/ficha/magias.json';
import { REGRAS_OFICIAIS } from '../../data/regras/regras';
import { MAGIAS_CATALOGO } from '../../src/services/magiaService';

// Decisão de 2026-10-20 (balanceamento do Tempo, opção A): ação extra na escala
// do jogo, escadas na ordem certa, nada volta ao passado e desgaste por regra.

const magia = (id: string) => {
  const encontrada = MAGIAS_CATALOGO.find((item) => item.id === id) as any;
  assert.ok(encontrada, `${id} sumiu do catálogo`);
  return encontrada;
};

test('só o Tempo Emprestado e a Parada do Mundo dão ação ou turno inteiro a mais', () => {
  const doTempo = [
    ...MAGIAS_CATALOGO.filter((item) => item.fluxo === 'tempo').map((item) => ({ id: item.id, texto: item.efeito })),
    ...MAGIAS_CATALOGO.filter((item) => (item as any).efeitos_por_fluxo?.tempo).map((item) => ({ id: `${item.id}:tempo`, texto: (item as any).efeitos_por_fluxo.tempo })),
  ];
  const acaoPadraoExtra = doTempo.filter(({ texto }) => /ação padrão adicional|turno adicional por rodada/i.test(texto));
  assert.deepEqual(acaoPadraoExtra.map(({ id }) => id), []);
  assert.match(magia('aceleracao').efeito, /ação de movimento adicional por turno/);
  assert.match(magia('avatar-do-fluxo').efeitos_por_fluxo.tempo, /Uma vez por cena/);
  assert.match(magia('lei-do-fluxo').efeitos_por_fluxo.tempo, /nunca age em dois turnos seguidos/);
  assert.match(magia('adiantar-o-golpe').execucao, /declara ataque/);
});

test('as escadas de tirar turno estão na ordem do círculo', () => {
  assert.match(magia('parada-de-instante').efeito, /perde a Ação Padrão do próximo turno/);
  assert.match(magia('sentenca-do-relogio').efeito, /perde o próximo turno/);
  assert.match(magia('sentenca-dos-eons').efeito, /perde os dois próximos turnos/);
  assert.equal(magia('conservacao-maior').defesa, 'Vontade se hostil');
});

test('nada do Tempo volta ao passado, e o desgaste está na regra', () => {
  assert.doesNotMatch(magia('restaurar-o-estado').efeito, /volta exatamente ao estado/);
  assert.match(magia('restaurar-o-estado').efeito, /Não revive quem morreu/);
  const reliquia = (magiasData.encantamentos as any[]).find((item) => item.id === 'reliquia-conservada');
  assert.doesNotMatch(reliquia.efeito, /desfazendo/);
  const corpo = Object.values(REGRAS_OFICIAIS).map((regra: any) => String(regra.corpo || '')).join('\n');
  assert.match(corpo, /Desgaste do Tempo/);
});
