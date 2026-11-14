import assert from 'node:assert/strict';
import test from 'node:test';
import { fonteComCopias, teclaDeForma, textoDaFonte } from '../../src/pages/Mapa/motor/formasConta.ts';

const formas = [{ id: 'a', nome: 'Ferido' }, { id: 'b', nome: 'Lobisomem' }];

test('a tecla 1 é a imagem de base e a 2 em diante vestem as formas, na ordem da lista', () => {
  assert.deepEqual(teclaDeForma(1, formas), { tipo: 'base' });
  assert.deepEqual(teclaDeForma(2, formas), { tipo: 'forma', id: 'a' });
  assert.deepEqual(teclaDeForma(3, formas), { tipo: 'forma', id: 'b' });
});

test('uma tecla além das formas avisa quantas o token tem, e sem forma nenhuma a tecla não faz nada', () => {
  assert.deepEqual(teclaDeForma(4, formas), { tipo: 'inexistente', tem: 3 });
  assert.deepEqual(teclaDeForma(9, formas), { tipo: 'inexistente', tem: 3 });
  for (const numero of [1, 2, 9]) assert.deepEqual(teclaDeForma(numero, []), { tipo: 'nenhuma' });
});

test('o texto da fonte diz quantas cópias saíram e quantas ainda saem', () => {
  assert.equal(textoDaFonte({ limite: null, usados: 0 }), 'Sem limite: nenhuma cópia gerada ainda.');
  assert.equal(textoDaFonte({ limite: null, usados: 1 }), 'Sem limite: 1 cópia gerada.');
  assert.equal(textoDaFonte({ limite: null, usados: 7 }), 'Sem limite: 7 cópias geradas.');
  assert.equal(textoDaFonte({ limite: 5, usados: 2 }), '2 de 5 geradas, restam 3.');
  assert.match(textoDaFonte({ limite: 5, usados: 5 }), /acabaram/);
  assert.match(textoDaFonte({ limite: 3, usados: 9 }), /acabaram/, 'contador acima do limite (limite baixado) também acabou');
});

test('a fonte só gera cópia enquanto sobra', () => {
  assert.equal(fonteComCopias(null), false);
  assert.equal(fonteComCopias(undefined), false);
  assert.equal(fonteComCopias({ limite: null, usados: 999 }), true);
  assert.equal(fonteComCopias({ limite: 3, usados: 2 }), true);
  assert.equal(fonteComCopias({ limite: 3, usados: 3 }), false);
});
