import test from 'node:test';
import assert from 'node:assert/strict';

import { buildEconomyOperations } from '../../src/services/economyOperations.ts';

test('gera deltas de carteira em vez de substituição completa', () => {
  const operations = buildEconomyOperations(
    {
      carteira: [
        { moeda: 'Lunaris', saldo: 10 },
        { moeda: 'Solares', saldo: 3 },
      ],
      inventario: [],
    },
    {
      carteira: [
        { moeda: 'Lunaris', saldo: 12 },
        { moeda: 'Solares', saldo: 3 },
      ],
      inventario: [],
    },
  );

  assert.deepEqual(operations, [{
    tipo: 'ajustar_saldo',
    moeda: 'Lunaris',
    delta: 2,
    motivo: 'Ajuste manual autorizado na ficha',
  }]);
  assert.equal(JSON.stringify(operations).includes('carteira'), false);
});

test('preserva identidade e envia somente operações alteradas do inventário', () => {
  const operations = buildEconomyOperations(
    {
      carteira: [],
      inventario: [{
        item_id: 'espada',
        titulo: 'Espada',
        quantidade: 2,
        dados: { origem: 'loja', equipado: false },
      }],
    },
    {
      carteira: [],
      inventario: [{
        item_id: 'espada',
        titulo: 'Espada',
        quantidade: 1,
        dados: { equipado: true, origem: 'loja' },
      }],
    },
  );

  assert.deepEqual(operations, [
    {
      tipo: 'editar_item',
      item_id: 'espada',
      titulo: 'Espada',
      dados: { equipado: true, origem: 'loja' },
    },
    { tipo: 'ajustar_quantidade', item_id: 'espada', delta: -1 },
  ]);
});

test('só cria itens manuais com UUID separado do catálogo', () => {
  const desired = {
    carteira: [],
    inventario: [{
      item_id: 'manual:123e4567-e89b-42d3-a456-426614174000',
      titulo: 'Carta antiga',
      quantidade: 1,
      dados: { descricao: 'Sem valor comercial' },
    }],
  };
  assert.deepEqual(buildEconomyOperations({ carteira: [], inventario: [] }, desired), [
    {
      tipo: 'criar_manual',
      item_id: desired.inventario[0].item_id,
      titulo: 'Carta antiga',
      quantidade: 1,
      dados: { descricao: 'Sem valor comercial' },
    },
    { tipo: 'reordenar', item_ids: [desired.inventario[0].item_id] },
  ]);

  assert.throws(
    () => buildEconomyOperations(
      { carteira: [], inventario: [] },
      { ...desired, inventario: [{ ...desired.inventario[0], item_id: 'item-forjado' }] },
    ),
    /identificador manual válido/,
  );
});

test('reordenação vira uma única intenção por IDs', () => {
  const first = {
    item_id: 'primeiro',
    titulo: 'Primeiro',
    quantidade: 1,
    dados: { ordem: 0, origem: 'loja' },
  };
  const second = {
    item_id: 'segundo',
    titulo: 'Segundo',
    quantidade: 1,
    dados: { ordem: 1, origem: 'loja' },
  };

  const operations = buildEconomyOperations(
    { carteira: [], inventario: [first, second] },
    {
      carteira: [],
      inventario: [
        { ...second, dados: { ...second.dados, ordem: 0 } },
        { ...first, dados: { ...first.dados, ordem: 1 } },
      ],
    },
  );

  assert.deepEqual(operations, [{ tipo: 'reordenar', item_ids: ['segundo', 'primeiro'] }]);
});
