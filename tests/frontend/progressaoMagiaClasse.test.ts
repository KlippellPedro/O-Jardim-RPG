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
  assert.deepEqual(linhas.map((linha) => linha.vagasSelos), [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11]);
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

test('o livro diz que Canalizador e Sintonizador seguem a mesma coluna: os dados precisam confirmar', () => {
  assert.deepEqual(linhasDeMagiaDaClasse(classe('canalizador')), linhasDeMagiaDaClasse(classe('sintonizador')));
});
