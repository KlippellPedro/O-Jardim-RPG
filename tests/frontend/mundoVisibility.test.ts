import assert from 'node:assert/strict';
import test from 'node:test';

import { toR3fElapsedSeconds } from '../../src/pages/Mundo/animationTiming.ts';
import { loreBloqueado } from '../../src/pages/Mundo/loreVisibility.ts';
import { arvoresVisiveisComAtual } from '../../data/mundo/arvoresCatalog.ts';
import {
  readLoadedWorldModels,
  rememberLoadedWorldModel,
  WORLD_MODEL_CACHE_KEY,
} from '../../src/pages/Mundo/modelLoadCache.ts';

const realidadeZero = { id: 'realidade-0' };

test('relógio orbital converte o timestamp do navegador de milissegundos para segundos', () => {
  assert.equal(toR3fElapsedSeconds(1_000), 1);
  assert.equal(toR3fElapsedSeconds(16_750), 16.75);
  assert.equal(toR3fElapsedSeconds(Number.NaN), 0);
});

test('modelos 3D confirmados são recuperados nas próximas entradas no Mundo', () => {
  const validos = new Set(['arvore-a', 'arvore-b', 'banco-lunar']);
  const storage = {
    getItem: () => JSON.stringify(['arvore-a', 'modelo-antigo', 42]),
    setItem: () => undefined,
  };
  assert.deepEqual([...readLoadedWorldModels(storage, validos)], ['arvore-a']);
});

test('modelo só é persistido depois da confirmação de carga e não duplica gravações', () => {
  const validos = new Set(['arvore-a']);
  const carregados = new Set<string>();
  const gravacoes: Array<{ key: string; value: string }> = [];
  const storage = {
    getItem: () => null,
    setItem: (key: string, value: string) => gravacoes.push({ key, value }),
  };

  assert.equal(rememberLoadedWorldModel(storage, carregados, 'invalido', validos), false);
  assert.equal(rememberLoadedWorldModel(storage, carregados, 'arvore-a', validos), true);
  assert.equal(rememberLoadedWorldModel(storage, carregados, 'arvore-a', validos), false);
  assert.deepEqual(gravacoes, [{ key: WORLD_MODEL_CACHE_KEY, value: '["arvore-a"]' }]);
});

test('cache corrompido ou armazenamento indisponível preserva o fallback inicial', () => {
  const validos = new Set(['arvore-a']);
  assert.deepEqual([...readLoadedWorldModels(null, validos)], []);
  assert.deepEqual([...readLoadedWorldModels({
    getItem: () => '{inválido',
    setItem: () => undefined,
  }, validos)], []);
});

test('árvore oculta bloqueia um galho mesmo quando ele nasce revelado', () => {
  assert.equal(loreBloqueado(realidadeZero, {
    isMestre: false,
    loreRevelado: [],
    loreOculto: [],
    paiBloqueado: true,
  }), true);
});

test('galho visível continua acessível quando a árvore também está visível', () => {
  assert.equal(loreBloqueado(realidadeZero, {
    isMestre: false,
    loreRevelado: [],
    loreOculto: [],
  }), false);
});

test('mestre enxerga os galhos mesmo em uma árvore oculta para jogadores', () => {
  assert.equal(loreBloqueado(realidadeZero, {
    isMestre: true,
    loreRevelado: [],
    loreOculto: ['realidade-0'],
    paiBloqueado: true,
  }), false);
});

test('ficha mostra o nome da Árvore escolhida mesmo quando ela está oculta no Códice', () => {
  const opcoes = arvoresVisiveisComAtual([], 'erebus');
  assert.deepEqual(opcoes.map((arvore) => [arvore.id, arvore.nome]), [['erebus', 'Abismo']]);
});
