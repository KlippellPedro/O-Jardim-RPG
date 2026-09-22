import assert from 'node:assert/strict';
import test from 'node:test';
import {
  entrarNaFilaDeVez,
  estaNaVez,
  inscreverVez,
  sairDaFilaDeVez,
} from '../../src/components/avisosRelampago/hub';

// Cada teste começa com os três tipos fora da fila, para não vazar estado de
// um teste para o outro (o hub é um módulo com estado compartilhado).
const limpar = () => {
  (['loot', 'conquista', 'suaVez'] as const).forEach(sairDaFilaDeVez);
};

test('quem pede primeiro ganha a vez na hora', () => {
  limpar();
  entrarNaFilaDeVez('loot');
  assert.equal(estaNaVez('loot'), true);
  assert.equal(estaNaVez('conquista'), false);
  limpar();
});

test('o segundo tipo espera enquanto o primeiro está com a vez', () => {
  limpar();
  entrarNaFilaDeVez('loot');
  entrarNaFilaDeVez('conquista');
  assert.equal(estaNaVez('loot'), true);
  assert.equal(estaNaVez('conquista'), false);
  limpar();
});

test('ao soltar a vez, quem esperava assume sozinho', () => {
  limpar();
  entrarNaFilaDeVez('loot');
  entrarNaFilaDeVez('conquista');
  entrarNaFilaDeVez('suaVez');
  sairDaFilaDeVez('loot');
  assert.equal(estaNaVez('conquista'), true);
  assert.equal(estaNaVez('suaVez'), false);
  sairDaFilaDeVez('conquista');
  assert.equal(estaNaVez('suaVez'), true);
  limpar();
});

test('pedir a vez de novo enquanto já está com ela não faz nada', () => {
  limpar();
  entrarNaFilaDeVez('loot');
  entrarNaFilaDeVez('loot');
  sairDaFilaDeVez('loot');
  assert.equal(estaNaVez('loot'), false);
  limpar();
});

test('desistir de quem só esperava na fila não mexe em quem está com a vez', () => {
  limpar();
  entrarNaFilaDeVez('loot');
  entrarNaFilaDeVez('conquista');
  sairDaFilaDeVez('conquista');
  assert.equal(estaNaVez('loot'), true);
  sairDaFilaDeVez('loot');
  assert.equal(estaNaVez('conquista'), false);
  assert.equal(estaNaVez('loot'), false);
  limpar();
});

test('quem se inscreve é avisado a cada mudança de vez, e para de ser avisado ao desinscrever', () => {
  limpar();
  let chamadas = 0;
  const parar = inscreverVez(() => { chamadas += 1; });

  entrarNaFilaDeVez('loot');
  entrarNaFilaDeVez('conquista');
  sairDaFilaDeVez('loot');
  assert.equal(chamadas, 3);

  parar();
  sairDaFilaDeVez('conquista');
  assert.equal(chamadas, 3);
  limpar();
});
