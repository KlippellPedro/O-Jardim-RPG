import assert from 'node:assert/strict';
import test from 'node:test';
import { contarPendencias, detectarNovidades } from '../../src/pages/Sessao/mesa/avisos';
import type { IBilhete, IEstadoMesa, IRelogio, IVotacao } from '../../src/services/mesaApi';

const vazio = (): IEstadoMesa => ({ mapa: null, mapas: [], votacao: null, ultima_votacao: null, relogios: [], cronometros: [], bilhetes: [] });
const bilhete = (extra: Partial<IBilhete> = {}): IBilhete => ({ id: 'b1', titulo: 'Psiu', texto: 'x', estilo: 'papel', criado_em: '2026-09-21T20:00:00Z', aberto_em: null, ...extra });
const votacao = (extra: Partial<IVotacao> = {}): IVotacao => ({ id: 'v1', pergunta: 'Entrar?', anonima: false, aberta: true, opcoes: [], meu_voto: null, total_votos: 0, total_elegiveis: 2, ...extra });
const relogio = (cheias: number): IRelogio => ({ id: 'r1', titulo: 'Ritual', fatias: 4, cheias, cor: 'ritual', visivel: true });

test('primeira leitura da mesa nunca avisa nada', () => {
  const depois = { ...vazio(), bilhetes: [bilhete()], votacao: votacao(), relogios: [relogio(4)] };
  assert.deepEqual(detectarNovidades(null, depois, false), []);
});

test('jogador e avisado de bilhete novo, uma vez so, e nao do que ja tinha', () => {
  const antes = vazio();
  const depois = { ...antes, bilhetes: [bilhete()] };
  const avisos = detectarNovidades(antes, depois, false);
  assert.equal(avisos.length, 1);
  assert.equal(avisos[0].aba, 'bilhetes');
  assert.deepEqual(detectarNovidades(depois, depois, false), []);
  // Bilhete que ja chegou lido nao gera aviso.
  assert.deepEqual(detectarNovidades(antes, { ...antes, bilhetes: [bilhete({ aberto_em: '2026-09-21T20:05:00Z' })] }, false), []);
});

test('mestre e avisado quando o jogador abre o bilhete, nao quando envia', () => {
  const fechado = { ...vazio(), bilhetes: [bilhete({ para_nome: 'Ana' })] };
  const aberto = { ...vazio(), bilhetes: [bilhete({ para_nome: 'Ana', aberto_em: '2026-09-21T20:05:00Z' })] };
  const enviado = detectarNovidades(vazio(), fechado, true);
  assert.deepEqual(enviado, []);
  const lido = detectarNovidades(fechado, aberto, true);
  assert.equal(lido.length, 1);
  assert.match(lido[0].texto, /Ana abriu/);
});

test('votacao nova avisa o jogador, e o fim dela avisa todo mundo', () => {
  const antes = vazio();
  const aberta = { ...antes, votacao: votacao() };
  assert.equal(detectarNovidades(antes, aberta, false)[0].aba, 'votacao');
  assert.deepEqual(detectarNovidades(antes, aberta, true), []);
  const fechada = { ...antes, ultima_votacao: votacao({ aberta: false }) };
  assert.equal(detectarNovidades(aberta, fechada, true).length, 1);
  assert.equal(detectarNovidades(aberta, fechada, false).length, 1);
});

test('relogio que completa toca o gongo para todos, uma vez', () => {
  const antes = { ...vazio(), relogios: [relogio(3)] };
  const depois = { ...vazio(), relogios: [relogio(4)] };
  const avisos = detectarNovidades(antes, depois, false);
  assert.equal(avisos.length, 1);
  assert.equal(avisos[0].gongo, true);
  assert.equal(detectarNovidades(antes, depois, true)[0].gongo, true);
  assert.deepEqual(detectarNovidades(depois, depois, false), []);
});

test('pendencias do botao: bilhetes fechados e votacao sem voto; mestre nunca tem', () => {
  const estado = { ...vazio(), bilhetes: [bilhete(), bilhete({ id: 'b2', aberto_em: 'x' })], votacao: votacao() };
  assert.equal(contarPendencias(estado, false), 2);
  assert.equal(contarPendencias({ ...estado, votacao: votacao({ meu_voto: 'o1' }) }, false), 1);
  assert.equal(contarPendencias(estado, true), 0);
  assert.equal(contarPendencias(null, false), 0);
});
