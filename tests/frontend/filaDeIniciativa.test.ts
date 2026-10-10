import assert from 'node:assert/strict';
import test from 'node:test';
import {
  filaEstaEmOrdem,
  mensagemDeFilaForaDeOrdem,
  primeiraInversaoDaFila,
} from '../../src/pages/Sessao/filaDeIniciativa';

const p = (nome: string, iniciativa: number) => ({ nome, iniciativa });

test('fila vazia, de um só ou em ordem decrescente está em ordem', () => {
  assert.equal(filaEstaEmOrdem([]), true);
  assert.equal(filaEstaEmOrdem([p('Lyra', 12)]), true);
  assert.equal(filaEstaEmOrdem([p('Anzhur', 46), p('Lyra', 20), p('Bram', 3)]), true);
});

test('iniciativa igual conta como em ordem: o desempate é do Mestre', () => {
  assert.equal(filaEstaEmOrdem([p('A', 15), p('B', 15), p('C', 15)]), true);
});

test('acha o primeiro par em que a iniciativa sobe (o caso que vimos: 20 antes de 46)', () => {
  const fila = [p('Alquimista Residente', 20), p('Anzhur, o Avô do Fogo', 46), p('Lyra', 8)];
  const inversao = primeiraInversaoDaFila(fila);
  assert.ok(inversao);
  assert.equal(inversao.antes.nome, 'Alquimista Residente');
  assert.equal(inversao.depois.nome, 'Anzhur, o Avô do Fogo');
  assert.equal(filaEstaEmOrdem(fila), false);
});

test('com mais de uma inversão, devolve a primeira da fila', () => {
  const inversao = primeiraInversaoDaFila([p('A', 30), p('B', 5), p('C', 9), p('D', 40)]);
  assert.equal(inversao?.antes.nome, 'B');
  assert.equal(inversao?.depois.nome, 'C');
});

test('a pergunta ao Mestre cita quem joga antes de quem', () => {
  const texto = mensagemDeFilaForaDeOrdem({ antes: p('Alquimista', 20), depois: p('Anzhur', 46) });
  assert.equal(
    texto,
    'Alquimista (iniciativa 20) joga antes de Anzhur (iniciativa 46). Ordenar a fila pela iniciativa antes de começar?',
  );
});
