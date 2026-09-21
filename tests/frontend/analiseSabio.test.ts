import assert from 'node:assert/strict';
import test from 'node:test';
import { analisarFicha, FALAS_ANALISE, type EntradaAnalise } from '../../src/pages/Ficha/utils/analiseSabio';

const saudavel: EntradaAnalise = { pendencias: [], vida: 100, mana: 100, sanidade: 100, condicoesAtivas: 0 };

test('ficha em dia recebe uma única observação tranquila', () => {
  const r = analisarFicha(saudavel);
  assert.equal(r.length, 1);
  assert.equal(r[0].id, 'nada');
});

test('vida crítica vem antes de pendências de progressão', () => {
  const r = analisarFicha({ ...saudavel, vida: 12, pendencias: [{ id: 'poder:guerreiro', quantidade: 2 }] });
  assert.deepEqual(r.map((o) => o.id), ['vida', 'poderes']);
  assert.equal(r[0].gravidade, 'urgente');
  assert.match(r[1].detalhe, /2 vagas abertas/);
});

test('pendências de mesma família somam', () => {
  const r = analisarFicha({ ...saudavel, pendencias: [{ id: 'poder:a', quantidade: 1 }, { id: 'poder:b', quantidade: 1 }, { id: 'legados', quantidade: 1 }] });
  assert.equal(r.find((o) => o.id === 'poderes')?.detalhe.startsWith('2 vagas'), true);
  assert.ok(r.some((o) => o.id === 'legado'));
});

test('limites de vida, mana, sanidade e condições', () => {
  assert.equal(analisarFicha({ ...saudavel, vida: 51 })[0].id, 'nada');
  assert.equal(analisarFicha({ ...saudavel, vida: 50 })[0].id, 'vida');
  assert.equal(analisarFicha({ ...saudavel, mana: 25 })[0].id, 'mana');
  assert.equal(analisarFicha({ ...saudavel, sanidade: 40 })[0].id, 'sanidade');
  assert.equal(analisarFicha({ ...saudavel, condicoesAtivas: 1 })[0].id, 'condicoes');
});

test('toda fala é frase fixa, sem números (para a voz gravada)', () => {
  FALAS_ANALISE.forEach((fala) => assert.doesNotMatch(fala, /\d/));
});
