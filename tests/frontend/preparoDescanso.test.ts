import assert from 'node:assert/strict';
import test from 'node:test';
import {
  custoDoRitual,
  estoqueDoRecurso,
  gastarLotes,
  preparosDaFicha,
  quantidadeAteRaridade,
  raridadeDoPreparo,
} from '../../src/services/preparoDescansoService';

test('a raridade do lote sobe de quatro em quatro niveis de classe', () => {
  assert.equal(raridadeDoPreparo('alquimista', 1), 'comum');
  assert.equal(raridadeDoPreparo('alquimista', 4), 'comum');
  assert.equal(raridadeDoPreparo('alquimista', 5), 'incomum');
  assert.equal(raridadeDoPreparo('cozinheiro', 12), 'raro');
  assert.equal(raridadeDoPreparo('alquimista', 16), 'epico');
  assert.equal(raridadeDoPreparo('cozinheiro', 20), 'lendario');
});

test('engenheiro so prepara a partir do nivel 3', () => {
  assert.equal(raridadeDoPreparo('engenheiro', 2), null);
  assert.equal(raridadeDoPreparo('engenheiro', 3), 'comum');
  assert.equal(raridadeDoPreparo('engenheiro', 9), 'raro');
});

test('lote superior paga o inferior, gastando primeiro o mais barato, e inferiores nao se somam', () => {
  const estoque = { comum: 5, raro: 1, epico: 2 };
  assert.equal(quantidadeAteRaridade(estoque, 'raro'), 3);
  const gasto = gastarLotes(estoque, 'raro', 1);
  assert.deepEqual(gasto?.usados, [{ raridade: 'raro', quantidade: 1 }]);
  assert.equal(gasto?.estoque.raro, 0);
  assert.equal(gasto?.estoque.comum, 5);
  const dois = gastarLotes(estoque, 'raro', 2);
  assert.deepEqual(dois?.usados, [{ raridade: 'raro', quantidade: 1 }, { raridade: 'epico', quantidade: 1 }]);
  // Cinco comuns nao valem um raro.
  assert.equal(gastarLotes({ comum: 5 }, 'raro', 1), null);
  // O estoque original nunca e alterado.
  assert.equal(estoque.raro, 1);
});

test('contador antigo, sem raridade, vale como comum', () => {
  assert.deepEqual(estoqueDoRecurso({ sucata: 3 }, 'sucata'), { comum: 3 });
  assert.deepEqual(estoqueDoRecurso(undefined, 'sucata'), {});
  assert.deepEqual(estoqueDoRecurso({ sucata: { raro: 2 } }, 'sucata'), { raro: 2 });
});

test('preparos da ficha: so as classes que preparam, e o pago some ate o proximo descanso', () => {
  const classes = [{ classeId: 'alquimista', nivel: 6 }, { classeId: 'guerreiro', nivel: 4 }, { classeId: 'engenheiro', nivel: 2 }];
  const sem = preparosDaFicha(classes, undefined);
  assert.deepEqual(sem.map((p) => [p.classe, p.raridade, p.feito]), [['alquimista', 'incomum', false]]);
  const pago = preparosDaFicha(classes, { contadorDescansos: 3, preparoDescanso: { alquimista: 3 } });
  assert.equal(pago[0].feito, true);
  const depoisDeDescansar = preparosDaFicha(classes, { contadorDescansos: 4, preparoDescanso: { alquimista: 3 } });
  assert.equal(depoisDeDescansar[0].feito, false);
});

test('custo do ritual segue a complexidade', () => {
  assert.deepEqual(custoDoRitual('simples'), { quantidade: 1, raridade: 'incomum', titulo: 'Simples' });
  assert.deepEqual(custoDoRitual('monumental'), { quantidade: 2, raridade: 'lendario', titulo: 'Monumental' });
});

import { receitaCobertaPorLotes } from '../../src/services/preparoDescansoService';

test('receita coberta pelos lotes: ritual pelo custo, classe pelo nivel e pelo lote do descanso', () => {
  const ritualRaro = { classe: 'ritualista', raridade: 'raro', custoRecurso: { recurso: 'componentes-ritualisticos' as const, quantidade: 1 } };
  assert.equal(receitaCobertaPorLotes(ritualRaro, { 'componentes-ritualisticos': { raro: 1 } }, []), true);
  assert.equal(receitaCobertaPorLotes(ritualRaro, { 'componentes-ritualisticos': { incomum: 4 } }, []), false);

  const formulaRara = { classe: 'alquimista', raridade: 'raro', custoRecurso: { recurso: 'componentes-quimicos' as const, quantidade: 1 } };
  const nivel10 = [{ classeId: 'alquimista', nivel: 10 }];
  assert.equal(receitaCobertaPorLotes(formulaRara, { 'componentes-quimicos': { raro: 1 } }, nivel10), true);
  assert.equal(receitaCobertaPorLotes(formulaRara, { 'componentes-quimicos': { comum: 3 } }, nivel10), false);
  // Formula alem do nivel do alquimista, mesmo com lote de sobra.
  assert.equal(receitaCobertaPorLotes(formulaRara, { 'componentes-quimicos': { epico: 2 } }, [{ classeId: 'alquimista', nivel: 2 }]), false);
  // Nao e a classe dele: a regra nao se aplica.
  assert.equal(receitaCobertaPorLotes(formulaRara, { 'componentes-quimicos': { raro: 1 } }, [{ classeId: 'guerreiro', nivel: 10 }]), null);
});
