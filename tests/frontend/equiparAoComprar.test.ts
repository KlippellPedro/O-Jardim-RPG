import assert from 'node:assert/strict';
import test from 'node:test';
import { escolherItensParaEquipar } from '../../src/services/equiparAoComprar.ts';
import { slotDeEquipamento } from '../../src/services/equipamentoService.ts';

const peca = (id: string, categoria: string, extras: Record<string, unknown> = {}) => ({
  item_id: `inv-${id}`,
  titulo: id,
  quantidade: 1,
  dados: { categoria, catalogo_item_id: id, equipado: false, ...extras },
});

test('cada tipo de peça cai na vaga certa', () => {
  assert.equal(slotDeEquipamento(peca('espada', 'arma')), 'arma');
  assert.equal(slotDeEquipamento(peca('couro', 'armadura', { categoria_protecao: 'armadura' })), 'armadura');
  assert.equal(slotDeEquipamento(peca('escudo-simples', 'armadura', { categoria_protecao: 'escudo' })), 'escudo');
  assert.equal(slotDeEquipamento(peca('x', 'armadura', { subtipo: 'escudo' })), 'escudo');
  assert.equal(slotDeEquipamento(peca('cota', 'armadura', { material: 'Malha de aço' })), 'malha');
  assert.equal(slotDeEquipamento(peca('pocao', 'consumivel')), null);
});

test('quem não tem nada equipado já sai com arma, armadura e escudo', () => {
  const inventario = [
    peca('adaga', 'arma', { subtipo: 'simples' }),
    peca('gibao', 'armadura', { categoria_protecao: 'armadura', subtipo: 'simples' }),
    peca('broquel', 'armadura', { categoria_protecao: 'escudo', subtipo: 'simples' }),
  ];
  assert.deepEqual(escolherItensParaEquipar(inventario, ['adaga', 'gibao', 'broquel'], []), ['inv-adaga', 'inv-gibao', 'inv-broquel']);
});

test('vaga ocupada ou segunda peça do mesmo tipo fica na mochila', () => {
  const inventario = [
    peca('espada', 'arma', { equipado: true, subtipo: 'simples' }),
    peca('adaga', 'arma', { subtipo: 'simples' }),
    peca('gibao', 'armadura', { categoria_protecao: 'armadura', subtipo: 'simples' }),
    peca('placas', 'armadura', { categoria_protecao: 'armadura', subtipo: 'simples' }),
  ];
  assert.deepEqual(escolherItensParaEquipar(inventario, ['adaga'], []), []);
  assert.deepEqual(escolherItensParaEquipar(inventario, ['gibao', 'placas'], []), ['inv-gibao']);
});

test('peça marcial sem a proficiência não é equipada sozinha', () => {
  const inventario = [
    peca('montante', 'arma', { subtipo: 'marcial' }),
    peca('placas', 'armadura', { categoria_protecao: 'armadura', subtipo: 'marcial' }),
  ];
  assert.deepEqual(escolherItensParaEquipar(inventario, ['montante', 'placas'], []), []);
  assert.deepEqual(escolherItensParaEquipar(inventario, ['montante', 'placas'], ['armas marciais', 'armaduras_marcial']), ['inv-montante', 'inv-placas']);
});

test('item que não é equipamento ou que não foi comprado é ignorado', () => {
  const inventario = [peca('pocao', 'consumivel'), peca('adaga', 'arma', { subtipo: 'simples' })];
  assert.deepEqual(escolherItensParaEquipar(inventario, ['pocao', 'inexistente'], []), []);
  assert.deepEqual(escolherItensParaEquipar([], ['adaga'], []), []);
});
