import assert from 'node:assert/strict';
import test, { afterEach, beforeEach, mock } from 'node:test';
import {
  ESPERA_PARA_FECHAR_MS,
  assinarEventosDaCampanha,
  canaisAbertos,
  encerrarTodosOsCanais,
  enderecoDoCanal,
  type EstadoDoCanal,
} from '../../src/services/campanhaEventos';

class FalsoEventSource {
  static instancias: FalsoEventSource[] = [];
  url: string;
  fechado = false;
  onopen: (() => void) | null = null;
  onerror: (() => void) | null = null;
  onmessage: ((evento: { data: string }) => void) | null = null;
  constructor(url: string) {
    this.url = url;
    FalsoEventSource.instancias.push(this);
  }
  close() { this.fechado = true; }
  abrir() { this.onopen?.(); }
  cair() { this.onerror?.(); }
  receber(dados: string) { this.onmessage?.({ data: dados }); }
}

const original = (globalThis as { EventSource?: unknown }).EventSource;

beforeEach(() => {
  FalsoEventSource.instancias = [];
  (globalThis as { EventSource?: unknown }).EventSource = FalsoEventSource;
  mock.timers.enable({ apis: ['setTimeout'] });
});

afterEach(() => {
  encerrarTodosOsCanais();
  mock.timers.reset();
  (globalThis as { EventSource?: unknown }).EventSource = original;
});

const microtarefas = () => new Promise<void>((resolver) => queueMicrotask(resolver));

test('vários ouvintes da mesma campanha usam uma conexão só', () => {
  const parar1 = assinarEventosDaCampanha('c1', {});
  const parar2 = assinarEventosDaCampanha('c1', {});
  const parar3 = assinarEventosDaCampanha('c1', {});
  assert.equal(FalsoEventSource.instancias.length, 1);
  assert.equal(FalsoEventSource.instancias[0].url, '/api/v1/sessao/c1/eventos');
  assert.equal(canaisAbertos(), 1);
  parar1(); parar2(); parar3();
});

test('campanhas diferentes têm canais diferentes', () => {
  const parar1 = assinarEventosDaCampanha('c1', {});
  const parar2 = assinarEventosDaCampanha('c2', {});
  assert.equal(FalsoEventSource.instancias.length, 2);
  assert.equal(canaisAbertos(), 2);
  parar1(); parar2();
});

test('o endereço do canal escapa o id da campanha', () => {
  assert.equal(enderecoDoCanal('a b/c'), '/api/v1/sessao/a%20b%2Fc/eventos');
});

test('o evento chega a todos os ouvintes, com o tipo separado do corpo', () => {
  const recebidos: Array<[string, string, unknown]> = [];
  const parar1 = assinarEventosDaCampanha('c1', { aoEvento: (tipo, carga) => recebidos.push(['um', tipo, carga.versao]) });
  const parar2 = assinarEventosDaCampanha('c1', { aoEvento: (tipo, carga) => recebidos.push(['dois', tipo, carga.versao]) });
  FalsoEventSource.instancias[0].receber(JSON.stringify({ tipo: 'calendario', versao: 7 }));
  assert.deepEqual(recebidos, [['um', 'calendario', 7], ['dois', 'calendario', 7]]);
  parar1(); parar2();
});

test('ping, texto solto e evento sem tipo são ignorados sem derrubar o canal', () => {
  let chamadas = 0;
  const parar = assinarEventosDaCampanha('c1', { aoEvento: () => { chamadas += 1; } });
  const fonte = FalsoEventSource.instancias[0];
  fonte.receber('ping');
  fonte.receber('conectado');
  fonte.receber('isto não é json');
  fonte.receber(JSON.stringify({ versao: 3 }));
  fonte.receber(JSON.stringify(null));
  fonte.receber(JSON.stringify({ tipo: 'turno' }));
  assert.equal(chamadas, 1);
  parar();
});

test('um ouvinte com defeito não impede os outros de receber', () => {
  const erro = mock.method(console, 'error', () => undefined);
  let recebeu = false;
  const parar1 = assinarEventosDaCampanha('c1', { aoEvento: () => { throw new Error('quebrou'); } });
  const parar2 = assinarEventosDaCampanha('c1', { aoEvento: () => { recebeu = true; } });
  FalsoEventSource.instancias[0].receber(JSON.stringify({ tipo: 'registro' }));
  assert.equal(recebeu, true);
  assert.equal(erro.mock.callCount(), 1);
  erro.mock.restore();
  parar1(); parar2();
});

test('abrir e reabrir o canal chama aoConectar, e o estado acompanha a conexão', async () => {
  const estados: EstadoDoCanal[] = [];
  let conectou = 0;
  const parar = assinarEventosDaCampanha('c1', { aoEstado: (estado) => estados.push(estado), aoConectar: () => { conectou += 1; } });
  await microtarefas();
  assert.deepEqual(estados, ['connecting']);
  const fonte = FalsoEventSource.instancias[0];
  fonte.abrir();
  fonte.cair();
  fonte.abrir();
  assert.deepEqual(estados, ['connecting', 'connected', 'reconnecting', 'connected']);
  assert.equal(conectou, 2);
  parar();
});

test('quem entra num canal já aberto ouve o estado atual e se atualiza, sem abrir outra conexão', async () => {
  const parar1 = assinarEventosDaCampanha('c1', {});
  FalsoEventSource.instancias[0].abrir();
  const estados: EstadoDoCanal[] = [];
  let conectou = 0;
  const parar2 = assinarEventosDaCampanha('c1', { aoEstado: (estado) => estados.push(estado), aoConectar: () => { conectou += 1; } });
  await microtarefas();
  assert.equal(FalsoEventSource.instancias.length, 1);
  assert.deepEqual(estados, ['connected']);
  assert.equal(conectou, 1);
  parar1(); parar2();
});

test('quem entra com o canal caído só ouve o estado, sem aoConectar', async () => {
  const parar1 = assinarEventosDaCampanha('c1', {});
  FalsoEventSource.instancias[0].cair();
  const estados: EstadoDoCanal[] = [];
  let conectou = 0;
  const parar2 = assinarEventosDaCampanha('c1', { aoEstado: (estado) => estados.push(estado), aoConectar: () => { conectou += 1; } });
  await microtarefas();
  assert.deepEqual(estados, ['reconnecting']);
  assert.equal(conectou, 0);
  parar1(); parar2();
});

test('o canal só fecha depois da espera, quando o último ouvinte sai', () => {
  const parar1 = assinarEventosDaCampanha('c1', {});
  const parar2 = assinarEventosDaCampanha('c1', {});
  parar1();
  mock.timers.tick(ESPERA_PARA_FECHAR_MS + 10);
  assert.equal(FalsoEventSource.instancias[0].fechado, false, 'ainda há um ouvinte');
  parar2();
  assert.equal(FalsoEventSource.instancias[0].fechado, false, 'espera um instante antes de fechar');
  mock.timers.tick(ESPERA_PARA_FECHAR_MS + 10);
  assert.equal(FalsoEventSource.instancias[0].fechado, true);
  assert.equal(canaisAbertos(), 0);
});

test('trocar de tela (sai um ouvinte e entra outro logo depois) não fecha nem reabre o canal', () => {
  const parar1 = assinarEventosDaCampanha('c1', {});
  parar1();
  mock.timers.tick(500);
  const parar2 = assinarEventosDaCampanha('c1', {});
  mock.timers.tick(ESPERA_PARA_FECHAR_MS * 2);
  assert.equal(FalsoEventSource.instancias.length, 1);
  assert.equal(FalsoEventSource.instancias[0].fechado, false);
  parar2();
});

test('parar duas vezes a mesma assinatura não quebra a contagem', () => {
  const parar1 = assinarEventosDaCampanha('c1', {});
  const parar2 = assinarEventosDaCampanha('c1', {});
  parar1();
  parar1();
  mock.timers.tick(ESPERA_PARA_FECHAR_MS + 10);
  assert.equal(FalsoEventSource.instancias[0].fechado, false);
  parar2();
});

test('quem sai antes do aviso de estado não recebe aviso depois de sair', async () => {
  const estados: EstadoDoCanal[] = [];
  const parar = assinarEventosDaCampanha('c1', { aoEstado: (estado) => estados.push(estado) });
  parar();
  await microtarefas();
  assert.deepEqual(estados, []);
});

test('sem EventSource no ambiente, assinar não quebra', () => {
  (globalThis as { EventSource?: unknown }).EventSource = undefined;
  const parar = assinarEventosDaCampanha('c9', {});
  assert.equal(FalsoEventSource.instancias.length, 0);
  parar();
});
