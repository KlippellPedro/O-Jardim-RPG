import assert from 'node:assert/strict';
import test from 'node:test';

import type { IRegistro } from '../../src/services/registrosApi.ts';
import {
  getRollBreakdown,
  getRollTone,
  matchesRollFilter,
  validateDiceFormula,
} from '../../src/pages/Sessao/sessionUtils.ts';

function registro(overrides: Partial<IRegistro> = {}): IRegistro {
  return {
    id: 'registro-1',
    tipo: 'rolagem',
    titulo: 'Teste',
    formula: 'd20+5',
    resultado: 20,
    detalhes: {},
    autor_nome: 'Jogador',
    criado_em: '2026-07-29T12:00:00Z',
    ...overrides,
  };
}

test('crítico no histórico depende do dado natural, não do total', () => {
  assert.equal(getRollTone(registro({ resultado: 20, detalhes: { natural: 15, bonus: 5 } })), 'neutral');
  assert.equal(getRollTone(registro({ resultado: 25, detalhes: { natural: 20, bonus: 5, critico_natural: true } })), 'critical');
  assert.equal(getRollTone(registro({ resultado: 0, detalhes: { natural: 1, bonus: -1, falha_natural: true } })), 'failure');
});

test('detalhamento mantém dados e modificador separados', () => {
  assert.equal(getRollBreakdown(registro({ detalhes: { dados: [12], bonus: 4 } })), 'Dados: 12 + 4');
  assert.equal(getRollBreakdown(registro({ detalhes: { dados: [3, 7], bonus: -2 } })), 'Dados: 3, 7 − 2');
  assert.equal(getRollBreakdown(registro({ detalhes: {} })), null);
});

test('validação local aceita a sintaxe suportada pelo servidor', () => {
  for (const formula of ['1d20', '2d6+3', '1d20+1d4-2', '2#d20', '3#2d6+3']) {
    assert.equal(validateDiceFormula(formula), null, formula);
  }
  for (const formula of ['', 'd20++2', '2##d20', 'ataque', '1d20<script>']) {
    assert.notEqual(validateDiceFormula(formula), null, formula);
  }
});

test('filtros distinguem testes, fórmulas e usos', () => {
  assert.equal(matchesRollFilter(registro({ tipo: 'rolagem' }), 'rolagem'), true);
  assert.equal(matchesRollFilter(registro({ tipo: 'dano' }), 'dano'), true);
  assert.equal(matchesRollFilter(registro({ tipo: 'magia' }), 'uso'), true);
  assert.equal(matchesRollFilter(registro({ tipo: 'dano' }), 'uso'), false);
});
