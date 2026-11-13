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

test('limita participantes, alvo e ações do Ataque Combinado', () => {
  assert.equal(LIMITES_ATAQUE_COMBINADO.participantesMinimos, 2);
  assert.equal(LIMITES_ATAQUE_COMBINADO.participantesMaximos, 4);
  assert.equal(LIMITES_ATAQUE_COMBINADO.alvosMaximos, 1);
  assert.equal(LIMITES_ATAQUE_COMBINADO.reacoesExigidasPorParticipante, 1);
  assert.match(REGRA_ATAQUES_COMBINADOS.corpo, /Ação Padrão e uma reação/i);
});

test('preserva testes, custos e críticos individuais', () => {
  const corpo = REGRA_ATAQUES_COMBINADOS.corpo;
  assert.match(corpo, /faz a própria rolagem/i);
  assert.match(corpo, /Mana e custos que a ação exige na declaração/i);
  assert.match(corpo, /Nenhum custo é pago duas vezes/i);
  assert.match(corpo, /crítico de um participante não multiplica o dano dos demais/i);
  assert.match(corpo, /Resistência separadamente a cada contribuição/i);
});

test('a Sintonia é o menor número de pontos com o líder', () => {
  assert.equal(sintoniaDoAtaque([3, 2, 3]), 2);
  assert.equal(sintoniaDoAtaque([3]), 3);
  assert.equal(sintoniaDoAtaque([]), 0);
  assert.equal(sintoniaDoAtaque([5, -1]), 0);
  assert.deepEqual(DEGRAUS_DE_SINTONIA.map((degrau) => degrau.sintonia), [0, 1, 2, 3]);
  assert.equal(degrauDeSintonia(0).ataque, 'Nenhum');
  assert.equal(degrauDeSintonia(2).dano, '+2');
  assert.equal(degrauDeSintonia(3).ataque, 'Vantagem');
});

test('no Uníssono a Resistência sai uma vez da soma', () => {
  assert.equal(danoDoAtaqueCombinado([12, 10, 8], 5, 2), 7 + 5 + 3);
  assert.equal(danoDoAtaqueCombinado([12, 10, 8], 5, 3), 30 - 5);
  assert.equal(danoDoAtaqueCombinado([3, 2], 5, 2), 0);
  assert.equal(danoDoAtaqueCombinado([], 5, 3), 0);
});

test('a página explica Sintonia, custo em uso e o risco de errar tudo', () => {
  const corpo = REGRA_ATAQUES_COMBINADOS.corpo;
  assert.match(corpo, /regras-ref--pontos-de-relacao/);
  assert.match(corpo, /gasta um uso dos pontos que tem com o líder/i);
  assert.match(corpo, /fica Exposto/);
  assert.match(corpo, /não soma com o da Sintonia/);
});

test('não converte Ataque Combinado em Fusão de Fluxos', () => {
  const corpo = REGRA_ATAQUES_COMBINADOS.corpo;
  assert.match(corpo, /não é Fusão de Fluxos/i);
  assert.match(corpo, /não altera tipo, alcance, área, duração ou efeito/i);
});
