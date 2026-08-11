import assert from 'node:assert/strict';
import test from 'node:test';

import {
  LIMITES_ATAQUE_COMBINADO,
  REGRA_ATAQUES_COMBINADOS,
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

test('não converte Ataque Combinado em Fusão de Fluxos', () => {
  const corpo = REGRA_ATAQUES_COMBINADOS.corpo;
  assert.match(corpo, /não é Fusão de Fluxos/i);
  assert.match(corpo, /não altera tipo, alcance, área, duração ou efeito/i);
});
