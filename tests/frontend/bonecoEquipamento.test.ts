import assert from 'node:assert/strict';
import test from 'node:test';
import { distribuirNoBoneco, encaixeDaArmadura, type ItemDoBoneco } from '../../src/pages/Ficha/utils/bonecoEquipamento';

const item = (id: string, nome: string, categoria: string, equipado = true): ItemDoBoneco => ({ id, nome, categoria, equipado });
const nunca = () => false;

test('armadura vai para o encaixe pelo nome, com torso como padrão', () => {
  assert.equal(encaixeDaArmadura('Elmo de Ferro'), 'cabeca');
  assert.equal(encaixeDaArmadura('Botas Aladas'), 'pes');
  assert.equal(encaixeDaArmadura('Manoplas de Aço'), 'luvas');
  assert.equal(encaixeDaArmadura('Escudo de Torre'), 'maoSecundaria');
  assert.equal(encaixeDaArmadura('Cota de Malha'), 'torso');
});

test('só entram itens equipados', () => {
  const r = distribuirNoBoneco([item('a', 'Espada', 'arma', false), item('b', 'Adaga', 'arma')], nunca);
  assert.equal(r.corpo.maoPrincipal?.id, 'b');
});

test('escudo pega a mão secundária e a segunda arma vira "outros"', () => {
  const r = distribuirNoBoneco([
    item('a', 'Espada', 'arma'),
    item('b', 'Escudo', 'armadura'),
    item('c', 'Adaga', 'arma'),
  ], nunca);
  assert.equal(r.corpo.maoPrincipal?.id, 'a');
  assert.equal(r.corpo.maoSecundaria?.id, 'b');
  assert.deepEqual(r.outros.map((i) => i.id), ['c']);
});

test('duas armas usam as duas mãos', () => {
  const r = distribuirNoBoneco([item('a', 'Espada', 'arma'), item('b', 'Adaga', 'arma')], nunca);
  assert.equal(r.corpo.maoSecundaria?.id, 'b');
});

test('implantes, especiais e o resto ficam separados', () => {
  const r = distribuirNoBoneco([
    item('i', 'Olho Ótico', 'implante'),
    item('r', 'Anel', 'geral'),
    item('p', 'Corda', 'geral'),
  ], (x) => x.id === 'r');
  assert.deepEqual(r.implantes.map((x) => x.id), ['i']);
  assert.deepEqual(r.especiais.map((x) => x.id), ['r']);
  assert.deepEqual(r.outros.map((x) => x.id), ['p']);
});
