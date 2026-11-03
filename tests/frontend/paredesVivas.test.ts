import assert from 'node:assert/strict';
import test from 'node:test';
import type { IAberturaCena, IPortal } from '../../src/services/mapaApi';
import { chegadaAtual, chegadasDaCena, cliqueDoJogador, nomeDaPorta, portaEm } from '../../src/pages/Mapa/motor/portasConta';

const porta = (id: string, extra: Partial<IAberturaCena> = {}): IAberturaCena => ({
  id, tipo: 'porta', estado: 'fechada', x1: 100, y1: 200, x2: 200, y2: 200, ...extra,
});

test('o clique acha a porta perto do batente e ignora a janela', () => {
  const aberturas = [porta('h,1,2'), porta('v,3,0', { tipo: 'janela', x1: 300, y1: 0, x2: 300, y2: 100 })];
  assert.equal(portaEm(aberturas, { x: 150, y: 210 }, 100)?.id, 'h,1,2');
  assert.equal(portaEm(aberturas, { x: 150, y: 260 }, 100), null, 'longe demais');
  assert.equal(portaEm(aberturas, { x: 300, y: 50 }, 100), null, 'janela não abre');
  // Com o mapa bem afastado, a margem cresce no mapa para continuar do mesmo tamanho na tela.
  assert.equal(portaEm(aberturas, { x: 150, y: 245 }, 100, 0.2)?.id, 'h,1,2');
});

test('o jogador abre a fechada, fecha a aberta e não mexe na trancada', () => {
  assert.equal(cliqueDoJogador(porta('a')), 'aberta');
  assert.equal(cliqueDoJogador(porta('a', { estado: 'aberta' })), 'fechada');
  assert.equal(cliqueDoJogador(porta('a', { estado: 'trancada' })), null);
  assert.equal(cliqueDoJogador(porta('a', { tipo: 'secreta' })), null);
  assert.equal(nomeDaPorta(porta('a', { estado: 'trancada' })), 'Porta trancada');
  assert.equal(nomeDaPorta(porta('a', { era_secreta: true, estado: 'aberta' })), 'Porta secreta revelada aberta');
  assert.equal(nomeDaPorta(porta('a', { tipo: 'secreta' })), 'Porta secreta');
});

test('a chegada noutra cena é o meio dela ou a boca de um portal de lá', () => {
  const base = { raio: 0.6, mao: 'dupla', usa: 'todos', fluxo: 'espaco', visivel: true, confirmar: false, ligado: true } as const;
  const portais: IPortal[] = [
    { ...base, id: 'p1', nome: 'Arco', a: { x: 100, y: 120 }, b: { x: 800, y: 600 } },
    { ...base, id: 'p2', nome: 'Poço', mao: 'unica', a: { x: 50, y: 50 }, b: { x: 1, y: 1 }, cena: 'outra' },
  ];
  const chegadas = chegadasDaCena({ largura: 1001, altura: 800, portais });
  assert.deepEqual(chegadas.map((c) => c.id), ['meio', 'p1:a', 'p1:b', 'p2:a']);
  assert.deepEqual(chegadas[0].ponto, { x: 501, y: 400 });
  assert.equal(chegadaAtual(chegadas, { x: 100, y: 120 }), 'p1:a');
  assert.equal(chegadaAtual(chegadas, { x: 333, y: 333 }), null);
  assert.equal(chegadaAtual(chegadas, null), null);
});
