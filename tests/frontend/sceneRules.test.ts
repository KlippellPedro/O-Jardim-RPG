import assert from 'node:assert/strict';
import test from 'node:test';
import {
  ABORDAGENS_SOCIAIS,
  NIVEIS_RESISTENCIA,
  PACIENCIA_MAXIMA,
  aplicarAbordagem,
} from '../../data/regras/conflitoSocial';
import {
  MANOBRAS_A_PE,
  OBSTACULOS_PERSEGUICAO,
  obstaculoPorD6,
  resolverRodadaAPe,
} from '../../data/regras/perseguicaoAPe';
import { FAIXAS_PERSEGUICAO } from '../../data/regras/veiculosCombate';

test('a perseguição a pé usa as mesmas faixas da perseguição veicular', () => {
  const ids = FAIXAS_PERSEGUICAO.map((faixa) => faixa.id);
  assert.deepEqual(ids, ['contato', 'curta', 'média', 'longa', 'escapou']);

  // Manobra presa a uma faixa só vale se a faixa existir na escala oficial.
  MANOBRAS_A_PE.forEach((manobra) => {
    if (manobra.faixas === 'qualquer') return;
    manobra.faixas.forEach((faixa) => {
      assert.ok(ids.includes(faixa), `${manobra.titulo}: faixa inexistente (${faixa})`);
    });
  });
});

test('quem persegue puxa para Contato e quem foge empurra para Escapou', () => {
  assert.equal(resolverRodadaAPe('média', { vencedor: 'perseguidor' }), 'curta');
  assert.equal(resolverRodadaAPe('média', { vencedor: 'fugitivo' }), 'longa');
  assert.equal(resolverRodadaAPe('média', { vencedor: 'empate' }), 'média');
});

test('vitória por 10 ou mais vale duas faixas, e as pontas da escala seguram', () => {
  assert.equal(resolverRodadaAPe('longa', { vencedor: 'perseguidor', margem: 12 }), 'curta');
  assert.equal(resolverRodadaAPe('média', { vencedor: 'fugitivo', margem: 10 }), 'escapou');
  assert.equal(resolverRodadaAPe('curta', { vencedor: 'perseguidor', margem: 18 }), 'contato');
  // Escapou encerra a cena: nada devolve alguém que já sumiu.
  assert.equal(resolverRodadaAPe('escapou', { vencedor: 'perseguidor', margem: 20 }), 'escapou');
});

test('a tabela de obstáculos cobre 1d6 nos dois terrenos', () => {
  assert.deepEqual(OBSTACULOS_PERSEGUICAO.map((item) => item.d6), [1, 2, 3, 4, 5, 6]);
  OBSTACULOS_PERSEGUICAO.forEach((item) => {
    assert.ok(item.cidade.trim() && item.ermo.trim(), `obstáculo ${item.d6} sem os dois terrenos`);
  });
  assert.equal(obstaculoPorD6(3).cidade, OBSTACULOS_PERSEGUICAO[2].cidade);
  assert.throws(() => obstaculoPorD6(7), /inválido/);
});

test('conflito social: sucesso desce Resistência e falha agressiva enche Paciência', () => {
  const inicio = { resistencia: 3, paciencia: 0 };
  const argumento = aplicarAbordagem(inicio, { sucesso: true });
  assert.deepEqual(argumento, { resistencia: 2, paciencia: 0, desfecho: null });

  const prova = aplicarAbordagem(argumento, { sucesso: true, reducao: 2 });
  assert.equal(prova.resistencia, 0);
  assert.equal(prova.desfecho, 'cedeu');

  const pressao = aplicarAbordagem(inicio, { sucesso: false, custoDePaciencia: 1 });
  assert.deepEqual(pressao, { resistencia: 3, paciencia: 1, desfecho: null });
});

test('repetir a abordagem e tocar no Limite cobram Paciência mesmo em sucesso', () => {
  const estado = { resistencia: 5, paciencia: 1 };
  const repetida = aplicarAbordagem(estado, { sucesso: true, repetida: true });
  assert.equal(repetida.resistencia, 4);
  assert.equal(repetida.paciencia, 2);

  const limite = aplicarAbordagem(estado, { sucesso: true, tocouOLimite: true, repetida: true });
  assert.equal(limite.paciencia, 3);
});

test('a Paciência cheia encerra a conversa mesmo com a Resistência no último ponto', () => {
  const beirada = { resistencia: 1, paciencia: PACIENCIA_MAXIMA - 1 };
  const aposta = aplicarAbordagem(beirada, { sucesso: true, repetida: true });

  assert.equal(aposta.resistencia, 0);
  assert.equal(aposta.paciencia, PACIENCIA_MAXIMA);
  assert.equal(aposta.desfecho, 'rompeu', 'levantar da mesa vale antes de ceder o último ponto');

  // A contagem nunca passa do relógio nem desce abaixo de zero.
  const estourada = aplicarAbordagem(aposta, { sucesso: true, reducao: 5, custoDePaciencia: 3, tocouOLimite: true });
  assert.equal(estourada.resistencia, 0);
  assert.equal(estourada.paciencia, PACIENCIA_MAXIMA);
});

test('os três níveis de Resistência continuam declarados e em ordem', () => {
  assert.deepEqual(NIVEIS_RESISTENCIA.map((nivel) => nivel.pontos), [3, 5, 8]);
  assert.ok(ABORDAGENS_SOCIAIS.length >= 6, 'poucas abordagens para uma cena de várias rodadas');
  ABORDAGENS_SOCIAIS.forEach((abordagem) => {
    assert.ok(abordagem.teste.trim(), `${abordagem.titulo}: sem teste declarado`);
    assert.ok(abordagem.risco.trim(), `${abordagem.titulo}: sem risco declarado`);
  });
});
