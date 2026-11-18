import assert from 'node:assert/strict';
import test from 'node:test';

import {
  DEGRAUS_DE_SINTONIA,
  LIMITES_ATAQUE_COMBINADO,
  REGRA_ATAQUES_COMBINADOS,
  danoDoAtaqueCombinado,
  degrauDeSintonia,
  sintoniaDoAtaque,
} from '../../data/regras/ataquesCombinados';

test('limita participantes, alvo e o custo de cada aliado', () => {
  assert.equal(LIMITES_ATAQUE_COMBINADO.participantesMinimos, 2);
  assert.equal(LIMITES_ATAQUE_COMBINADO.participantesMaximos, 4);
  assert.equal(LIMITES_ATAQUE_COMBINADO.alvosMaximos, 1);
  assert.equal(LIMITES_ATAQUE_COMBINADO.reacoesExigidasPorParticipante, 1);
  assert.match(REGRA_ATAQUES_COMBINADOS.corpo, /chama de 1 a 3 aliados/);
  assert.match(REGRA_ATAQUES_COMBINADOS.corpo, /gasta a reação e um uso desses pontos e ataca junto, na hora/);
});

test('tudo acontece no turno do líder, sem fase de preparação', () => {
  const corpo = REGRA_ATAQUES_COMBINADOS.corpo;
  assert.match(corpo, /Tudo acontece no turno de quem lidera/);
  assert.doesNotMatch(corpo, /preparaç|expira|reserva a Ação Padrão/i);
  assert.doesNotMatch(corpo, /Exposto/);
});

test('preserva rolagem, custos e críticos individuais', () => {
  const corpo = REGRA_ATAQUES_COMBINADOS.corpo;
  assert.match(corpo, /faz a própria rolagem/i);
  assert.match(corpo, /pagos como num ataque comum/i);
  assert.match(corpo, /crítico de um participante não multiplica o dano dos demais/i);
  assert.match(corpo, /Resistência do alvo vale contra cada acerto/i);
});

test('a Sintonia é o menor número de pontos com o líder e começa em 1', () => {
  assert.equal(sintoniaDoAtaque([3, 2, 3]), 2);
  assert.equal(sintoniaDoAtaque([3]), 3);
  assert.equal(sintoniaDoAtaque([]), 0);
  assert.equal(sintoniaDoAtaque([5, -1]), 0);
  assert.deepEqual(DEGRAUS_DE_SINTONIA.map((degrau) => degrau.sintonia), [1, 2, 3]);
  assert.equal(degrauDeSintonia(0), null);
  assert.equal(degrauDeSintonia(1)?.ataque, '+2');
  assert.equal(degrauDeSintonia(2)?.dano, '+2');
  assert.equal(degrauDeSintonia(3)?.ataque, 'Vantagem');
});

test('a Resistência sai de cada acerto', () => {
  assert.equal(danoDoAtaqueCombinado([12, 10, 8], 5), 7 + 5 + 3);
  assert.equal(danoDoAtaqueCombinado([3, 2], 5), 0);
  assert.equal(danoDoAtaqueCombinado([], 5), 0);
});

test('a página explica Sintonia, custo em uso e a ligação com Pontos de Relação', () => {
  const corpo = REGRA_ATAQUES_COMBINADOS.corpo;
  assert.match(corpo, /regras-ref--pontos-de-relacao/);
  assert.match(corpo, /um uso dos pontos que tem com o líder/i);
  assert.match(corpo, /Coreografia não entra no Ataque Combinado/);
});

test('não converte Ataque Combinado em Fusão de Fluxos', () => {
  const corpo = REGRA_ATAQUES_COMBINADOS.corpo;
  assert.match(corpo, /não é Fusão de Fluxos/i);
  assert.match(corpo, /não altera tipo, alcance, área, duração ou efeito/i);
});
