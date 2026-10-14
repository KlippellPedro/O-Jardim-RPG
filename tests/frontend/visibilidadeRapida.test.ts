import assert from 'node:assert/strict';
import test from 'node:test';
import { listasDeLoreComVisibilidade, loreVisivelParaJogadores } from '../../src/pages/Mundo/visibilidadeRapida';

const nascePublica = { id: 'aethel' };
const nasceTrancada = { id: 'segredo', revelado: false };

test('entrada que nasce visível só some se estiver em lore_oculto', () => {
  assert.equal(loreVisivelParaJogadores(nascePublica, {}), true);
  assert.equal(loreVisivelParaJogadores(nascePublica, null), true);
  assert.equal(loreVisivelParaJogadores(nascePublica, { lore_oculto: ['aethel'] }), false);
  // Estar em lore_revelado não muda nada para quem já nasce visível.
  assert.equal(loreVisivelParaJogadores(nascePublica, { lore_revelado: ['aethel'], lore_oculto: ['aethel'] }), false);
});

test('entrada que nasce trancada só aparece se estiver em lore_revelado', () => {
  assert.equal(loreVisivelParaJogadores(nasceTrancada, {}), false);
  assert.equal(loreVisivelParaJogadores(nasceTrancada, { lore_revelado: ['segredo'] }), true);
  assert.equal(loreVisivelParaJogadores(nasceTrancada, { lore_oculto: ['segredo'] }), false);
});

test('reter uma entrada pública põe o id em lore_oculto e deixa o resto das duas listas como estava', () => {
  const config = { lore_revelado: ['x'], lore_oculto: ['y'] };
  assert.deepEqual(listasDeLoreComVisibilidade(config, nascePublica, false), { lore_revelado: ['x'], lore_oculto: ['y', 'aethel'] });
});

test('liberar uma entrada pública tira o id de lore_oculto, sem duplicar nem mexer nas outras', () => {
  const config = { lore_revelado: [], lore_oculto: ['y', 'aethel', 'z'] };
  assert.deepEqual(listasDeLoreComVisibilidade(config, nascePublica, true), { lore_revelado: [], lore_oculto: ['y', 'z'] });
  // Pedir de novo o mesmo estado não repete o id.
  assert.deepEqual(listasDeLoreComVisibilidade({ lore_oculto: ['aethel', 'aethel'] }, nascePublica, false).lore_oculto, ['aethel']);
});

test('liberar uma entrada trancada põe o id em lore_revelado e trancar de novo o tira', () => {
  const liberada = listasDeLoreComVisibilidade({ lore_revelado: ['a'], lore_oculto: ['b'] }, nasceTrancada, true);
  assert.deepEqual(liberada, { lore_revelado: ['a', 'segredo'], lore_oculto: ['b'] });
  assert.equal(loreVisivelParaJogadores(nasceTrancada, liberada), true);
  const trancada = listasDeLoreComVisibilidade(liberada, nasceTrancada, false);
  assert.deepEqual(trancada, { lore_revelado: ['a'], lore_oculto: ['b'] });
  assert.equal(loreVisivelParaJogadores(nasceTrancada, trancada), false);
});

test('config com lixo no lugar das listas não quebra', () => {
  const lixo = { lore_oculto: 'aethel', lore_revelado: [1, null, 'ok'] };
  assert.equal(loreVisivelParaJogadores(nascePublica, lixo), true);
  assert.deepEqual(listasDeLoreComVisibilidade(lixo, nascePublica, false), { lore_revelado: ['ok'], lore_oculto: ['aethel'] });
});

test('o que se grava é sempre o que se lê de volta', () => {
  for (const entrada of [nascePublica, nasceTrancada]) {
    for (const visivel of [true, false]) {
      const listas = listasDeLoreComVisibilidade({ lore_oculto: ['outro'], lore_revelado: ['outro2'] }, entrada, visivel);
      assert.equal(loreVisivelParaJogadores(entrada, listas), visivel, `${entrada.id} -> ${visivel}`);
    }
  }
});
