import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { EFEITOS_SONOROS, IDS_SINTETIZADOS, efeitoSonoroPorId, tocarEfeito } from '../../src/pages/Mapa/motor/efeitosSonoros.ts';

const servidor = readFileSync(new URL('../../plataforma/core/mapa.py', import.meta.url), 'utf-8');

test('a lista de efeitos do site é a mesma do servidor, na mesma ordem', () => {
  const bloco = servidor.match(/^EFEITOS_SONOROS = \(([\s\S]*?)\n\)/m);
  assert.ok(bloco, 'EFEITOS_SONOROS não achada em plataforma/core/mapa.py');
  const ids = [...bloco![1].matchAll(/"([a-z]+)"/g)].map((achado) => achado[1]);
  assert.deepEqual(EFEITOS_SONOROS.map((efeito) => efeito.id), ids);
});

test('cada efeito da lista tem som, rótulo e dica, e nenhum som sobra sem botão', () => {
  assert.deepEqual([...IDS_SINTETIZADOS].sort(), EFEITOS_SONOROS.map((efeito) => efeito.id).sort());
  assert.equal(new Set(EFEITOS_SONOROS.map((efeito) => efeito.id)).size, EFEITOS_SONOROS.length, 'ids repetidos');
  for (const efeito of EFEITOS_SONOROS) {
    assert.ok(efeito.rotulo.length > 2 && efeito.dica.length > 8, efeito.id);
    assert.ok(!/[—–]/.test(`${efeito.rotulo}${efeito.dica}`), `${efeito.id}: texto de jogador sem travessão`);
  }
  assert.equal(efeitoSonoroPorId('trovao')?.rotulo, 'Trovão');
  assert.equal(efeitoSonoroPorId('inventado'), undefined);
});

test('sem navegador (ou som bloqueado) o efeito simplesmente não toca, sem quebrar', () => {
  assert.equal(tocarEfeito('trovao', 1), false, 'sem WebAudio, nada toca');
  assert.equal(tocarEfeito('inventado', 1), false);
  assert.equal(tocarEfeito('sino', 0), false, 'volume zero não toca');
});
