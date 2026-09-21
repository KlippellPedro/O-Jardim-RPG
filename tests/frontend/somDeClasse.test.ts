import assert from 'node:assert/strict';
import test from 'node:test';
import classes from '../../data/ficha/classes.json';
import { PERFIS_SONOROS, perfilDaClasse } from '../../src/utils/somDeClasse';

const lista = (Array.isArray(classes) ? classes : Object.values(classes).find(Array.isArray)) as Array<{ id: string }>;

test('toda classe do catálogo tem um perfil sonoro', () => {
  const sem = lista.filter((classe) => !perfilDaClasse(classe.id)).map((classe) => classe.id);
  assert.deepEqual(sem, []);
});

test('perfis usados existem na lista de perfis', () => {
  lista.forEach((classe) => assert.ok(PERFIS_SONOROS.includes(perfilDaClasse(classe.id)!)));
});

test('classe desconhecida ou vazia não tem perfil', () => {
  assert.equal(perfilDaClasse('nao-existe'), null);
  assert.equal(perfilDaClasse(''), null);
  assert.equal(perfilDaClasse(undefined), null);
});
