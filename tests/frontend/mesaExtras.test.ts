import assert from 'node:assert/strict';
import test from 'node:test';
import { faltaNoCronometro, relogioNovo, textoDoCronometro } from '../../src/pages/Mapa/motor/mesaConta';
import { aplicarDelta } from '../../src/pages/Mapa/delta';
import type { IEstadoMapa } from '../../src/services/mapaApi';

const cronometro = (extra: { fim?: number | null; restante?: number | null }) => ({ nome: 'Desabamento', fim: null, restante: null, visivel: true, ...extra });

test('o cronômetro conta pelo relógio do servidor e para no zero', () => {
  assert.equal(faltaNoCronometro(cronometro({ fim: 10_000 }), 4_000), 6_000);
  assert.equal(faltaNoCronometro(cronometro({ fim: 10_000 }), 99_000), 0);
  assert.equal(faltaNoCronometro(cronometro({ restante: 3_500 }), 99_000), 3_500, 'parado não anda');
  assert.equal(faltaNoCronometro(cronometro({}), 0), 0);
  assert.equal(textoDoCronometro(cronometro({ restante: 245_000 }), 0), '4:05');
  assert.equal(textoDoCronometro(cronometro({ restante: 3_729_000 }), 0), '1:02:09');
  assert.equal(textoDoCronometro(cronometro({ restante: 400 }), 0), '0:01', 'o zero só aparece no fim');
  assert.equal(textoDoCronometro(cronometro({ restante: 0 }), 0), '0:00');
});

test('relógio novo vem vazio, com nome e partes dentro do limite e id que o servidor aceita', () => {
  const relogio = relogioNovo('  Ritual  ', 40);
  assert.equal(relogio.nome, 'Ritual');
  assert.equal(relogio.partes, 12);
  assert.equal(relogio.cheias, 0);
  assert.match(relogio.id, /^[A-Za-z0-9_-]{1,40}$/);
  assert.equal(relogioNovo('', 1).nome, 'Relógio');
  assert.equal(relogioNovo('', 1).partes, 2);
  assert.notEqual(relogioNovo('a', 4).id, '');
});

test('a mudança da mesa (pausa, relógios) chega pela diferença do tempo real', () => {
  const atual = { gestor: false, usuario_id: 'ana', ao_vivo: true, bloqueado: false, cenas: [], cena: { id: 'c1' }, tokens: [], moldura_mesa: null, tempo: null, mesa: null } as unknown as IEstadoMapa;
  const mesa = { pausa: { ligada: true, texto: 'Lanche' }, relogios: [], cronometro: null };
  const novo = aplicarDelta(atual, { cena_id: 'c1', mesa });
  assert.deepEqual(novo.mesa, mesa);
  assert.equal(aplicarDelta(atual, { cena_id: 'outra', mesa }), atual, 'diferença de outra cena não vale');
});
