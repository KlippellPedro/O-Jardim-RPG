import assert from 'node:assert/strict';
import test from 'node:test';

import {
  LIMITE_ETIQUETAS_NOTA,
  normalizarEtiqueta,
  normalizarEtiquetas,
  obterEtiquetasNota,
  separarEtiquetasDigitadas,
} from '../../src/services/notasFichaService.ts';

test('nota antiga transforma categoria em etiqueta sem alterar o texto salvo', () => {
  assert.deepEqual(obterEtiquetasNota({ categoria: '  Pistas  ' }), ['Pistas']);
  assert.deepEqual(obterEtiquetasNota({}), ['Geral']);
});

test('etiquetas novas ignoram duplicatas, cerquilhas e espaços extras', () => {
  assert.deepEqual(normalizarEtiquetas(['#NPC', ' npc ', 'Lugar   importante']), ['NPC', 'Lugar importante']);
  assert.equal(normalizarEtiqueta('### Sessão 12'), 'Sessão 12');
});

test('campo aceita vírgula, ponto e vírgula ou nova linha e respeita o limite', () => {
  assert.deepEqual(separarEtiquetasDigitadas('NPC, Pista; Lugar\nObjetivo'), ['NPC', 'Pista', 'Lugar', 'Objetivo']);
  assert.equal(normalizarEtiquetas(Array.from({ length: 20 }, (_, index) => `E${index}`)).length, LIMITE_ETIQUETAS_NOTA);
});
