import assert from 'node:assert/strict';
import test from 'node:test';
import { caminhoDaFatia, relogioCompleto, relogiosRecemCompletos } from '../../src/pages/Sessao/mesa/relogios';
import {
  categoriaDoEvento,
  densidade,
  esperaEntreEventos,
  filtrarEventos,
  formatarDuracao,
} from '../../src/pages/Sessao/mesa/replay';
import type { IEventoReplay, IRelogio } from '../../src/services/mesaApi';

test('fatias do relogio: quantidade certa de caminhos, cada um diferente', () => {
  [4, 6, 8, 10, 12].forEach((total) => {
    const caminhos = Array.from({ length: total }, (_, i) => caminhoDaFatia(50, 50, 40, i, total));
    assert.equal(new Set(caminhos).size, total);
    assert.ok(caminhos.every((caminho) => caminho.startsWith('M 50 50 L ')));
  });
  // Com 2 fatias cada uma passa de 180 graus... com 4 nunca: flag de arco grande fica 0.
  assert.match(caminhoDaFatia(50, 50, 40, 0, 4), / 0 0 1 /);
});

const relogio = (extra: Partial<IRelogio>): IRelogio => ({
  id: 'r', titulo: 'Ritual', fatias: 4, cheias: 0, cor: 'ritual', visivel: true, ...extra,
});

test('relogio novo completo so dispara uma vez e nao na primeira leitura', () => {
  assert.equal(relogioCompleto(relogio({ cheias: 4 })), true);
  assert.deepEqual(relogiosRecemCompletos(null, [relogio({ cheias: 4 })]), []);
  const completou = relogiosRecemCompletos([relogio({ cheias: 3 })], [relogio({ cheias: 4 })]);
  assert.equal(completou.length, 1);
  assert.deepEqual(relogiosRecemCompletos([relogio({ cheias: 4 })], [relogio({ cheias: 4 })]), []);
  assert.deepEqual(relogiosRecemCompletos([], [relogio({ cheias: 4 })]), []);
});

const evento = (tipo: string, s: number): IEventoReplay => ({ t: '2026-09-21T20:00:00Z', s, tipo, texto: tipo, destaque: null });

test('filtros do replay mantem as bordas da sessao', () => {
  const lista = [evento('sessao', 0), evento('rolagem', 10), evento('turno', 20), evento('clima', 30), evento('dano', 40), evento('sessao', 50)];
  assert.deepEqual(filtrarEventos(lista, 'tudo').length, 6);
  assert.deepEqual(filtrarEventos(lista, 'dados').map((e) => e.tipo), ['sessao', 'rolagem', 'dano', 'sessao']);
  assert.deepEqual(filtrarEventos(lista, 'combate').map((e) => e.tipo), ['sessao', 'turno', 'sessao']);
  assert.deepEqual(filtrarEventos(lista, 'mesa').map((e) => e.tipo), ['sessao', 'clima', 'sessao']);
  assert.equal(categoriaDoEvento('votacao'), 'mesa');
});

test('duracao legivel e densidade do ritmo da noite', () => {
  assert.equal(formatarDuracao(50), '50s');
  assert.equal(formatarDuracao(2700), '45min');
  assert.equal(formatarDuracao(4980), '1h 23min');
  assert.equal(formatarDuracao(-5), '0s');
  const faixas = densidade([evento('a', 0), evento('b', 5), evento('c', 99), evento('d', 100)], 100, 4);
  assert.deepEqual(faixas, [2, 0, 0, 2]);
  assert.deepEqual(densidade([evento('a', 0), evento('b', 0)], 0, 3), [2, 0, 0]);
});

test('espera entre eventos comprime intervalos longos e acelera com a velocidade', () => {
  const curto = esperaEntreEventos(1, 1);
  const longo = esperaEntreEventos(3600, 1);
  assert.ok(curto < longo);
  assert.ok(longo <= 2.6);
  assert.ok(esperaEntreEventos(3600, 8) < longo);
  assert.ok(esperaEntreEventos(0, 8) >= 0.12);
});

import {
  cronometrosQueZeraram,
  duracaoDe,
  formatarTempo,
  nivelDeUrgencia,
  restanteAgora,
} from '../../src/pages/Sessao/mesa/cronometros';
import type { ICronometro } from '../../src/services/mesaApi';

const cron = (extra: Partial<ICronometro> = {}): ICronometro => ({
  id: 'c1', titulo: 'Bomba', cor: 'perigo', visivel: true, duracao_s: 300, restante_s: 300, situacao: 'correndo', ...extra,
});

test('tempo do cronometro aparece como minutos e segundos, com hora quando passa de uma', () => {
  assert.equal(formatarTempo(300), '5:00');
  assert.equal(formatarTempo(7), '0:07');
  assert.equal(formatarTempo(3723), '1:02:03');
  assert.equal(formatarTempo(-4), '0:00');
  assert.equal(duracaoDe('2', '30'), 150);
  assert.equal(duracaoDe('', 'x'), 0);
});

test('cronometro so corre na tela quando o servidor diz que esta correndo', () => {
  assert.equal(restanteAgora(cron(), 1_000, 61_000), 240);
  assert.equal(restanteAgora(cron({ situacao: 'pausado', restante_s: 90 }), 1_000, 61_000), 90);
  assert.equal(restanteAgora(cron({ restante_s: 5 }), 0, 60_000), 0);
});

test('urgencia sobe nos ultimos segundos e so pulsa se estiver correndo', () => {
  assert.equal(nivelDeUrgencia(200, 300, 'correndo'), 'calmo');
  assert.equal(nivelDeUrgencia(60, 300, 'correndo'), 'atencao');
  assert.equal(nivelDeUrgencia(8, 300, 'correndo'), 'urgente');
  assert.equal(nivelDeUrgencia(8, 300, 'pausado'), 'calmo');
  assert.equal(nivelDeUrgencia(0, 300, 'correndo'), 'zerado');
});

test('gongo do cronometro toca uma vez so por leitura', () => {
  const avisados = new Set<string>();
  const lista = [cron({ restante_s: 3 })];
  assert.equal(cronometrosQueZeraram(lista, 0, 1_000, avisados).length, 0);
  assert.equal(cronometrosQueZeraram(lista, 0, 4_000, avisados).length, 1);
  assert.equal(cronometrosQueZeraram(lista, 0, 5_000, avisados).length, 0);
});
