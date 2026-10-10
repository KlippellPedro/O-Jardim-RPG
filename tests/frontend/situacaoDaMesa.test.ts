import assert from 'node:assert/strict';
import test from 'node:test';
import {
  EVENTOS_DA_MESA,
  SEM_MESA,
  lerSituacaoDaMesa,
  mesaAcabouDeAbrir,
  rotuloDoMenuSessao,
  textoDeInicio,
} from '../../src/services/situacaoDaMesa';
import { chaveDaUltimaFicha, lerUltimaFicha } from '../../src/services/ultimaFicha';

test('a mesa aberta traz título e hora de início', () => {
  const estado = lerSituacaoDaMesa({ situacao: 'aberta', titulo: ' Noite no Jardim ', iniciada_em: '2026-10-10T20:00:00Z' });
  assert.deepEqual(estado, { situacao: 'aberta', titulo: 'Noite no Jardim', iniciadaEm: '2026-10-10T20:00:00Z' });
});

test('a preparação não tem hora de início', () => {
  const estado = lerSituacaoDaMesa({ situacao: 'preparacao', titulo: 'Rascunho', iniciada_em: '2026-10-10T20:00:00Z' });
  assert.equal(estado.situacao, 'preparacao');
  assert.equal(estado.iniciadaEm, null);
});

test('resposta estranha vira "nenhuma mesa" em vez de quebrar a tela', () => {
  for (const lixo of [null, undefined, 42, 'aberta', {}, { situacao: 'ao_vivo' }, { situacao: 'nenhuma', titulo: 'x' }]) {
    assert.deepEqual(lerSituacaoDaMesa(lixo), SEM_MESA);
  }
});

test('título vazio ou de outro tipo vira sem título', () => {
  assert.equal(lerSituacaoDaMesa({ situacao: 'aberta', titulo: '   ' }).titulo, null);
  assert.equal(lerSituacaoDaMesa({ situacao: 'aberta', titulo: 7 }).titulo, null);
});

test('o aviso "a sessão começou" só vem quando a mesa abre com o site já aberto', () => {
  const aberta = lerSituacaoDaMesa({ situacao: 'aberta', titulo: 'x' });
  const preparacao = lerSituacaoDaMesa({ situacao: 'preparacao', titulo: 'x' });
  assert.equal(mesaAcabouDeAbrir(null, aberta), false, 'a primeira leitura nunca avisa');
  assert.equal(mesaAcabouDeAbrir(SEM_MESA, aberta), true);
  assert.equal(mesaAcabouDeAbrir(preparacao, aberta), true);
  assert.equal(mesaAcabouDeAbrir(aberta, aberta), false, 'continuar aberta não avisa de novo');
  assert.equal(mesaAcabouDeAbrir(aberta, SEM_MESA), false);
});

test('só os eventos de abrir, preparar e encerrar refazem a consulta', () => {
  assert.deepEqual([...EVENTOS_DA_MESA].sort(), ['sessao_aberta', 'sessao_encerrada', 'sessao_preparada']);
  for (const cena of ['turno', 'iniciativa', 'registro', 'mesa', 'calendario', 'participante_atualizado']) {
    assert.equal(EVENTOS_DA_MESA.includes(cena), false, cena);
  }
});

test('o tempo de início fala em minutos e horas', () => {
  const inicio = '2026-10-10T20:00:00Z';
  const base = Date.parse(inicio);
  assert.equal(textoDeInicio(inicio, base + 20_000), 'começou agora há pouco');
  assert.equal(textoDeInicio(inicio, base + 12 * 60_000), 'começou há 12 min');
  assert.equal(textoDeInicio(inicio, base + 60 * 60_000), 'começou há 1 h');
  assert.equal(textoDeInicio(inicio, base + 65 * 60_000), 'começou há 1 h 05 min');
  assert.equal(textoDeInicio(inicio, base - 5 * 60_000), 'começou agora há pouco', 'relógio adiantado nunca dá tempo negativo');
  assert.equal(textoDeInicio(null), '');
  assert.equal(textoDeInicio('não é data'), '');
});

test('o item Sessão do menu diz o estado para o leitor de tela', () => {
  assert.equal(rotuloDoMenuSessao('nenhuma'), 'Sessão');
  assert.equal(rotuloDoMenuSessao('aberta'), 'Sessão, ao vivo agora');
  assert.equal(rotuloDoMenuSessao('preparacao'), 'Sessão, em preparação');
});

test('a última ficha só vale com id e nome', () => {
  assert.deepEqual(lerUltimaFicha('{"id":"abc","nome":" Kael "}'), { id: 'abc', nome: 'Kael' });
  for (const ruim of [null, '', 'não é json', '{}', '{"id":"abc"}', '{"nome":"Kael"}', '{"id":"","nome":"x"}', '{"id":1,"nome":"x"}', '[]']) {
    assert.equal(lerUltimaFicha(ruim), null, String(ruim));
  }
});

test('a última ficha é separada por pessoa e por campanha', () => {
  assert.notEqual(chaveDaUltimaFicha('u1', 'c1'), chaveDaUltimaFicha('u2', 'c1'));
  assert.notEqual(chaveDaUltimaFicha('u1', 'c1'), chaveDaUltimaFicha('u1', 'c2'));
});
