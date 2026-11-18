import assert from 'node:assert/strict';
import test from 'node:test';
import {
  ABORDAGENS_SOCIAIS,
  NIVEIS_RESISTENCIA,
  PACIENCIA_MAXIMA,
  REGRA_CONFLITO_SOCIAL,
  aplicarAbordagem,
} from '../../data/regras/conflitoSocial';
import {
  APOIOS_MAXIMOS_POR_LADO,
  BONUS_DE_APOIO,
  MANOBRAS_A_PE,
  OBSTACULOS_PERSEGUICAO,
  REGRA_PERSEGUICAO_A_PE,
  distanciaDaFaixa,
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
  // O Salto muda 2 mesmo sem vencer por 10.
  assert.equal(resolverRodadaAPe('curta', { vencedor: 'fugitivo', margem: 1, passos: 2 }), 'longa');
});

test('a distância da perseguição a pé vai de 0 (Contato) a 4 (Escapou)', () => {
  assert.deepEqual(['contato', 'curta', 'média', 'longa', 'escapou'].map((id) => distanciaDaFaixa(id as any)), [0, 1, 2, 3, 4]);
  assert.deepEqual(MANOBRAS_A_PE.map((manobra) => manobra.id), ['correr', 'atalho', 'salto', 'sumir']);
});

test('a tabela de obstáculos cobre 1d6 nos dois terrenos', () => {
  assert.deepEqual(OBSTACULOS_PERSEGUICAO.map((item) => item.d6), [1, 2, 3, 4, 5, 6]);
  OBSTACULOS_PERSEGUICAO.forEach((item) => {
    assert.ok(item.cidade.trim() && item.ermo.trim(), `obstáculo ${item.d6} sem os dois terrenos`);
  });
  assert.equal(obstaculoPorD6(3).cidade, OBSTACULOS_PERSEGUICAO[2].cidade);
  assert.throws(() => obstaculoPorD6(7), /inválido/);
});

test('conflito social: sucesso tira Resistência e toda falha marca 1 de Paciência', () => {
  const inicio = { resistencia: 3, paciencia: 0 };
  const argumento = aplicarAbordagem(inicio, { sucesso: true });
  assert.deepEqual(argumento, { resistencia: 2, paciencia: 0, desfecho: null });

  const prova = aplicarAbordagem(argumento, { sucesso: true, reducao: 2 });
  assert.equal(prova.resistencia, 0);
  assert.equal(prova.desfecho, 'cedeu');

  const falha = aplicarAbordagem(inicio, { sucesso: false });
  assert.deepEqual(falha, { resistencia: 3, paciencia: 1, desfecho: null });
  assert.equal(PACIENCIA_MAXIMA, 3, 'três falhas encerram a conversa');
});

test('repetir o argumento conta como falha, e insistir no Limite marca 1 a mais', () => {
  const estado = { resistencia: 5, paciencia: 0 };
  const repetida = aplicarAbordagem(estado, { sucesso: true, repetida: true });
  assert.equal(repetida.resistencia, 5);
  assert.equal(repetida.paciencia, 1);

  const limite = aplicarAbordagem(estado, { sucesso: true, tocouOLimite: true });
  assert.equal(limite.resistencia, 4);
  assert.equal(limite.paciencia, 1);
});

test('a Paciência cheia encerra a conversa mesmo com a Resistência no último ponto', () => {
  const beirada = { resistencia: 1, paciencia: PACIENCIA_MAXIMA - 1 };
  const aposta = aplicarAbordagem(beirada, { sucesso: true, tocouOLimite: true });

  assert.equal(aposta.resistencia, 0);
  assert.equal(aposta.paciencia, PACIENCIA_MAXIMA);
  assert.equal(aposta.desfecho, 'rompeu', 'levantar da mesa vale antes de ceder o último ponto');

  // A contagem nunca passa do máximo nem desce abaixo de zero.
  const estourada = aplicarAbordagem(aposta, { sucesso: false, custoDePaciencia: 3, tocouOLimite: true });
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

test('na perseguição, uma pessoa de cada lado rola, e os outros só Ajudam ou Atrapalham', () => {
  assert.equal(BONUS_DE_APOIO, 2);
  assert.equal(APOIOS_MAXIMOS_POR_LADO, 2);
  const corpo = REGRA_PERSEGUICAO_A_PE.corpo;
  assert.match(corpo, /cada lado escolhe uma pessoa para rolar/);
  assert.match(corpo, /Atrapalhar/);
  assert.doesNotMatch(corpo, /puxador/i);
  assert.match(corpo, /Ninguém rola só para passar por ele/);
});

test('no Conflito Social o Prestígio entra só na rolagem', () => {
  const posicao = ABORDAGENS_SOCIAIS.find((abordagem) => abordagem.id === 'status');
  assert.ok(posicao);
  assert.doesNotMatch(posicao.efeito, /Prestígio/);
  assert.match(REGRA_CONFLITO_SOCIAL.corpo, /nunca tira Resistência a mais/);
});
