import assert from 'node:assert/strict';
import test from 'node:test';

import { MUNDO_CATALOG } from '../../data/gerado/mundoCatalog.ts';
import { ARVORES } from '../../data/mundo/arvoresCatalog.ts';
import { buildTreeCodex, universalLoreEntries } from '../../src/pages/Mundo/worldCodex.ts';

const treeIds = ARVORES.filter((tree) => tree.id !== 'universal').map((tree) => tree.id);

test('códice de Gênese encadeia Galho, seis Dimensões e seus Reinos', () => {
  const codex = buildTreeCodex(MUNDO_CATALOG, 'aethel');
  assert.equal(codex.deity?.titulo, 'Aethel');
  assert.equal(codex.flow?.id, 'fluxo-da-origem');
  assert.deepEqual(codex.roots.map((node) => node.entry.id), ['realidade-0']);
  assert.equal(codex.entries.filter((entry) => entry.tipo === 'dimensao').length, 6);
  // Astraluna e as Máscaras da AstraTech saíram pra Árvore da A.X.I.S junto de
  // Jota Macedo, e o Orfanato de Ofélia foi retirado - por isso oito, não doze.
  assert.deepEqual(
    codex.entries.filter((entry) => entry.tipo === 'reino').map((entry) => entry.titulo).sort(),
    ['Alfarn', 'Colônias de Întuneric', 'Emberhold', 'Império', 'Khazad', 'Lionês', 'Salém', 'Transilvânia'],
  );
  // Iwagakure é vila ninja, não reino.
  assert.deepEqual(codex.entries.filter((entry) => entry.tipo === 'local').map((entry) => entry.id), ['iwagakure']);
  // A cascata só carrega geografia: soberanos e figuras ficam fora dela.
  assert.equal(codex.entries.some((entry) => entry.tipo === 'personagem'), false);
});

test('Astraluna e Jota Macedo pertencem à Árvore da A.X.I.S, não a Gênese', () => {
  const axis = buildTreeCodex(MUNDO_CATALOG, 'keryx');
  assert.ok(axis.entries.some((entry) => entry.id === 'astraluna'));
  assert.ok(axis.entries.some((entry) => entry.id === 'mascaras-astratech'));
  const genese = buildTreeCodex(MUNDO_CATALOG, 'aethel');
  assert.equal(genese.entries.some((entry) => entry.id === 'astraluna'), false);
  assert.equal(genese.entries.some((entry) => entry.id === 'orfanato-de-ofelia'), false);
});

test('Vazio preserva Bordo e A Saída como locais encadeados, sem inventar Galho', () => {
  const codex = buildTreeCodex(MUNDO_CATALOG, 'erebus');
  assert.equal(codex.roots.length, 1);
  assert.equal(codex.roots[0].entry.id, 'bordo');
  assert.equal(codex.roots[0].entry.tipo, 'local');
  assert.deepEqual(codex.roots[0].children.map((node) => [node.entry.id, node.entry.tipo]), [['a-saida', 'local']]);
  assert.equal(codex.entries.some((entry) => entry.tipo === 'galho'), false);
});

test('Sonhar é um conceito transversal das nove Árvores, separado do Vazio', () => {
  const realTrees = treeIds.filter((treeId) => treeId !== 'erebus');
  realTrees.forEach((treeId) => {
    const concepts = buildTreeCodex(MUNDO_CATALOG, treeId).crossTreeConcepts;
    assert.ok(concepts.some((entry) => entry.id === 'sonhar-entre-as-arvores'), `${treeId} precisa receber o conceito de Sonhar`);
  });
  assert.equal(buildTreeCodex(MUNDO_CATALOG, 'erebus').crossTreeConcepts.length, 0);
});

test('Registros Universais usa marcação explícita e aceita apenas seres e locais', () => {
  const universal = universalLoreEntries(MUNDO_CATALOG);
  assert.deepEqual(
    [...new Set(universal.map((entry) => entry.registro_universal))].sort(),
    ['local', 'ser'],
  );
  assert.ok(universal.some((entry) => entry.id === 'blanc'));
  assert.ok(universal.some((entry) => entry.id === 'amadheus-colona'));
  assert.ok(universal.some((entry) => entry.id === 'grimm'));
  assert.ok(universal.some((entry) => entry.id === 'banco-lunar'));
  assert.ok(universal.some((entry) => entry.id === 'sonhar-entre-as-arvores'));
  assert.equal(universal.some((entry) => entry.id === 'erebus'), false);
  assert.equal(universal.some((entry) => entry.id === 'bordo'), false);
  assert.equal(universal.some((entry) => entry.id === 'a-saida'), false);
  assert.equal(universal.some((entry) => entry.id === 'hierarquia-do-jardim'), false);
  assert.equal(universal.some((entry) => entry.tipo === 'evento'), false);
});
