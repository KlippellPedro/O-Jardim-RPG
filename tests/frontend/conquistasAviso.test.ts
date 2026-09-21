import assert from 'node:assert/strict';
import test from 'node:test';
import { dispararConquistas, inscreverConquistas } from '../../src/components/conquistas/conquistas';

const nova = (chave: string) => ({ chave, nome: chave, descricao: '', raridade: 'comum' as const, icone: 'dados' });

test('a mesma conquista não repete para o mesmo personagem, mas vale para outro', () => {
  const recebidas: string[] = [];
  const parar = inscreverConquistas((novas) => novas.forEach((item) => recebidas.push(item.chave)));

  dispararConquistas([nova('primeira_rolagem')], 'ficha-a');
  dispararConquistas([nova('primeira_rolagem')], 'ficha-a');
  dispararConquistas([nova('primeira_rolagem')], 'ficha-b');
  parar();

  assert.deepEqual(recebidas, ['primeira_rolagem', 'primeira_rolagem']);
});

test('lista vazia ou nula não avisa ninguém', () => {
  let chamadas = 0;
  const parar = inscreverConquistas(() => { chamadas += 1; });
  dispararConquistas([], 'ficha-c');
  dispararConquistas(null, 'ficha-c');
  dispararConquistas(undefined);
  parar();
  assert.equal(chamadas, 0);
});
