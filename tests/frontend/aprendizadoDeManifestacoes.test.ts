import assert from 'node:assert/strict';
import test from 'node:test';

import {
  ENCANTAMENTOS_CATALOGO,
  RITUAIS_CATALOGO,
  SELOS_CATALOGO,
  avisoFluxoDaManifestacao,
  encantamentoElegivelParaAprender,
  fluxosParaAprenderManifestacao,
  ritualElegivelParaAprender,
  seloElegivelParaAprender,
} from '../../src/services/magiaService.ts';

// Decisão de 2026-10-20 (opção B): cada Fluxo tem 3 rituais, 3 selos e 3
// encantamentos. O Ritualista aprende de qualquer Fluxo natural, o Sintonizador
// aprende selo e encantamento também dos catalisadores preparados, e Canalizador
// e Cartista ficam no Fluxo nativo (e nos instalados), com as vagas em 3.

const ficha = (classeId: string, nivel = 20, extra: Record<string, unknown> = {}) => ({
  arvoreId: 'aethel',
  racaId: 'humano',
  classeId,
  classes: [{ classeId, nivel }],
  nivel,
  atributosFinais: { forca: 10, destreza: 10, constituicao: 10, inteligencia: 10, sabedoria: 10, carisma: 10, fluxo: 30 },
  pericias: { misticismo: 'aprendiz' },
  ...extra,
});

const busca = <T extends { id: string }>(catalogo: T[], id: string): T => {
  const item = catalogo.find((entrada) => entrada.id === id);
  assert.ok(item, `${id} sumiu do catálogo`);
  return item;
};
const ritual = (id: string) => busca(RITUAIS_CATALOGO, id);
const selo = (id: string) => busca(SELOS_CATALOGO, id);
const encantamento = (id: string) => busca(ENCANTAMENTOS_CATALOGO, id);

test('o Canalizador aprende selo e encantamento só do Fluxo nativo', () => {
  const canalizador = ficha('canalizador');
  assert.deepEqual(fluxosParaAprenderManifestacao(canalizador, 'selo'), ['origem']);
  assert.equal(seloElegivelParaAprender(canalizador, selo('nova-tentativa')).permitido, true);
  assert.equal(seloElegivelParaAprender(canalizador, selo('silencio')).permitido, false);
  // Com um Fluxo instalado pelo Mestre, ele entra também.
  const instalado = ficha('canalizador', 20, { fluxosInstaladosIds: ['vazio'] });
  assert.equal(seloElegivelParaAprender(instalado, selo('silencio')).permitido, true);
});

test('o Ritualista aprende de qualquer Fluxo natural, e a Tecnologia só instalada', () => {
  const ritualista = ficha('ritualista');
  const fluxos = fluxosParaAprenderManifestacao(ritualista, 'ritual');
  assert.equal(fluxos.length, 10);
  assert.ok(!fluxos.includes('tecnologia'));
  assert.equal(ritualElegivelParaAprender(ritualista, ritual('apagamento-de-rastro')).permitido, true);
  assert.equal(seloElegivelParaAprender(ritualista, selo('conservacao')).permitido, true);
  assert.equal(encantamentoElegivelParaAprender(ritualista, encantamento('manto-sem-rastro')).permitido, true);
  assert.equal(ritualElegivelParaAprender(ritualista, ritual('calibragem-de-modulo')).permitido, false);
  const comTecnologia = ficha('ritualista', 20, { fluxosInstaladosIds: ['tecnologia'] });
  assert.equal(ritualElegivelParaAprender(comTecnologia, ritual('calibragem-de-modulo')).permitido, true);
  // Os Ritos dos Sete continuam só por concessão do Mestre.
  assert.equal(ritualElegivelParaAprender(ritualista, ritual('rito-dos-sete-pecados')).permitido, false);
});

test('o Fim avisa sem bloquear quem não é nativo dele', () => {
  const ritualista = ficha('ritualista');
  assert.equal(ritualElegivelParaAprender(ritualista, ritual('velorio-do-ciclo')).permitido, true);
  assert.ok(avisoFluxoDaManifestacao(ritualista, ritual('velorio-do-ciclo')));
  assert.equal(avisoFluxoDaManifestacao(ritualista, ritual('apagamento-de-rastro')), null);
  assert.equal(avisoFluxoDaManifestacao(ficha('ritualista', 20, { arvoreId: 'mulher-carmesim' }), ritual('velorio-do-ciclo')), null);
});

test('o Sintonizador aprende selo e encantamento dos catalisadores preparados, mas ritual não', () => {
  const sintonizador = ficha('sintonizador', 20, { catalisadoresFluxo: { preparadosIds: ['tempo', 'vazio'], ativoId: 'tempo' } });
  assert.deepEqual(fluxosParaAprenderManifestacao(sintonizador, 'selo'), ['origem', 'tempo', 'vazio']);
  assert.deepEqual(fluxosParaAprenderManifestacao(sintonizador, 'ritual'), ['origem']);
  assert.equal(seloElegivelParaAprender(sintonizador, selo('conservacao')).permitido, true);
  assert.equal(encantamentoElegivelParaAprender(sintonizador, encantamento('manto-sem-rastro')).permitido, true);
  const recusa = encantamentoElegivelParaAprender(sintonizador, encantamento('ultimo-ato'));
  assert.equal(recusa.permitido, false);
  assert.match(recusa.motivo || '', /catalisadores preparados/);
});
