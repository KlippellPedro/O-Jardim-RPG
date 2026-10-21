import assert from 'node:assert/strict';
import test from 'node:test';

import { FLUXOS_CATALOGO, MAGIAS_CATALOGO } from '../../src/services/magiaService';

// Decisão de 2026-10-20 (opção A da decisão 10): o Vazio "não cria matéria nem
// vida". O clone e a criatura convocada pelo Vazio são ausência com contorno e
// somem sem deixar resto.

test('o limite do Vazio é "não cria matéria nem vida"', () => {
  const vazio = FLUXOS_CATALOGO.find((fluxo) => fluxo.id === 'vazio') as any;
  assert.ok(vazio.limites.includes('não cria matéria nem vida'));
  assert.ok(!vazio.limites.includes('não cria'));
});

test('o clone e a convocação do Vazio são ausência e não deixam resto', () => {
  for (const id of ['clone-de-fluxo', 'convocacao-do-fluxo']) {
    const magia = MAGIAS_CATALOGO.find((item) => item.id === id) as any;
    const texto = magia.efeitos_por_fluxo.vazio;
    assert.match(texto, /ausência/, id);
    assert.match(texto, /sem deixar|não deixa nada/, id);
    assert.doesNotMatch(texto, /não existe de verdade/, id);
  }
});
