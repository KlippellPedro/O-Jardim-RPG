import assert from 'node:assert/strict';
import test from 'node:test';
import { COR_PADRAO_CAMPANHA, corDaCampanha, recorteDaCapa, textoDeDuracao, textoDeVisita, urlDaCapa } from '../../src/pages/Campanha/campanha';

test('cor da campanha aceita hex valido e cai no dourado do Jardim', () => {
  assert.equal(corDaCampanha({ cor: '#AABBCC' }), '#aabbcc');
  assert.equal(corDaCampanha({ cor: 'vermelho' }), COR_PADRAO_CAMPANHA);
  assert.equal(corDaCampanha(null), COR_PADRAO_CAMPANHA);
});

test('url da capa so existe com capa e muda com a versao', () => {
  assert.equal(urlDaCapa('c1', { tem_capa: false }), null);
  assert.match(urlDaCapa('c1', { tem_capa: true, capa_em: 'abc' }) ?? '', /\/campanhas\/c1\/capa\?v=abc$/);
});

test('quando a pessoa foi vista pela ultima vez', () => {
  const agora = new Date('2026-09-21T12:00:00Z').getTime();
  assert.equal(textoDeVisita(null, agora), 'ainda não entrou');
  assert.equal(textoDeVisita('2026-09-21T11:58:00Z', agora), 'aqui agora há pouco');
  assert.equal(textoDeVisita('2026-09-21T11:20:00Z', agora), 'visto há 40 min');
  assert.equal(textoDeVisita('2026-09-21T07:00:00Z', agora), 'visto há 5 h');
  assert.equal(textoDeVisita('2026-09-20T09:00:00Z', agora), 'visto ontem');
  assert.equal(textoDeVisita('2026-09-15T12:00:00Z', agora), 'visto há 6 dias');
});

test('duracao em horas e minutos', () => {
  assert.equal(textoDeDuracao(125), '2 h 05 min');
  assert.equal(textoDeDuracao(45), '45 min');
  assert.equal(textoDeDuracao(0), '');
});

test('recorte 3:1 centralizado, para imagem larga e para imagem alta', () => {
  assert.deepEqual(recorteDaCapa(3000, 1000), { x: 0, y: 0, w: 3000, h: 1000 });
  assert.deepEqual(recorteDaCapa(1200, 1200), { x: 0, y: 400, w: 1200, h: 400 });
  assert.deepEqual(recorteDaCapa(4000, 1000), { x: 500, y: 0, w: 3000, h: 1000 });
});
