import assert from 'node:assert/strict';
import test from 'node:test';
import classes from '../../data/ficha/classes.json';
import { classeTemMagia, linhasDeMagiaDaClasse } from '../../src/services/progressaoMagiaClasse';

const classe = (id: string) => (classes as any[]).find((item) => item.id === id);

test('Canalizador: círculo e vagas de magia do 1 ao 50, teto só do 25 em diante', () => {
  const linhas = linhasDeMagiaDaClasse(classe('canalizador'));
  assert.deepEqual(linhas.map((linha) => linha.nivel), [1, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50]);
  assert.deepEqual(linhas.map((linha) => linha.vagasMagia), [2, 4, 6, 8, 10, 12, 14, 16, 18, 20, 22]);
  assert.deepEqual(linhas.map((linha) => linha.circulo), [2, 4, 6, 8, 10, 10, 10, 10, 10, 10, 10]);
  assert.deepEqual(linhas.map((linha) => linha.tetoPorCirculo), [null, null, null, null, null, 4, 4, 4, 4, 4, 4]);
  // Cada Fluxo tem 3 selos e o Canalizador só aprende do nativo: a vaga para em 3 (decisão de 2026-10-20).
  assert.deepEqual(linhas.map((linha) => linha.vagasSelos), [1, 2, 3, 3, 3, 3, 3, 3, 3, 3, 3]);
});

test('Ritualista tem ritual sem círculo, e o valor vale até o próximo marco', () => {
  const linhas = linhasDeMagiaDaClasse(classe('ritualista'));
  assert.ok(linhas.every((linha) => linha.circulo === null && linha.vagasMagia === null));
  const no20 = linhas.find((linha) => linha.nivel === 15)!;
  assert.equal(no20.vagasRituais, 4);
  const ultimo = linhas[linhas.length - 1];
  assert.deepEqual([ultimo.nivel, ultimo.vagasRituais], [50, 7]);
});

test('só as classes de magia têm tabela; Guerreiro não tem', () => {
  assert.equal(classeTemMagia(classe('guerreiro')), false);
  for (const id of ['canalizador', 'sintonizador', 'ritualista', 'elementarista', 'cartista-arcano']) {
    assert.equal(classeTemMagia(classe(id)), true, id);
  }
});

test('o livro diz que Canalizador e Sintonizador seguem a mesma coluna de magia: os dados precisam confirmar', () => {
  // A coluna do livro é a de círculo e vagas de magia. Selo e encantamento divergem
  // de propósito: o Sintonizador aprende também dos catalisadores e segue até 11.
  const magia = (id: string) => linhasDeMagiaDaClasse(classe(id))
    .map(({ nivel, circulo, vagasMagia, tetoPorCirculo }) => ({ nivel, circulo, vagasMagia, tetoPorCirculo }));
  assert.deepEqual(magia('canalizador'), magia('sintonizador'));
});
