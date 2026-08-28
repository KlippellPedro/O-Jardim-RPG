import test from 'node:test';
import assert from 'node:assert/strict';

import {
  concederEntradaGambler,
  possuiEntradaGambler,
  sortearEntradaGambler,
} from '../../src/pages/Entidades/gamblerAccess.ts';

class MemoryStorage {
  private values = new Map<string, string>();
  get length() { return this.values.size; }
  clear() { this.values.clear(); }
  getItem(key: string) { return this.values.get(key) ?? null; }
  key(index: number) { return [...this.values.keys()][index] ?? null; }
  removeItem(key: string) { this.values.delete(key); }
  setItem(key: string, value: string) { this.values.set(key, value); }
}

test('a ficha distribui inteiros pares e ímpares entre SIM e NÃO', () => {
  assert.equal(sortearEntradaGambler(0), true);
  assert.equal(sortearEntradaGambler(2), true);
  assert.equal(sortearEntradaGambler(1), false);
  assert.equal(sortearEntradaGambler(3), false);
});

test('a entrada só existe depois de a ficha conceder acesso', () => {
  const storage = new MemoryStorage() as Storage;
  assert.equal(possuiEntradaGambler(storage), false);
  concederEntradaGambler(storage);
  assert.equal(possuiEntradaGambler(storage), true);
});

test('o sorteio rejeita valores que quebrariam a distribuição binária', () => {
  assert.throws(() => sortearEntradaGambler(-1), TypeError);
  assert.throws(() => sortearEntradaGambler(1.5), TypeError);
});

