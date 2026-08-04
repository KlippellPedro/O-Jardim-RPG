import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

interface EventRecord {
  id: string;
  ordem: number;
  arvores?: string[];
}

interface TreeRecord {
  id: string;
  historia: string[];
  lugares: unknown[];
  cronologia: EventRecord[];
}

interface ChronicleRecord {
  linha_tempo_geral: EventRecord[];
  arvores: TreeRecord[];
}

const source = JSON.parse(readFileSync(new URL('../../data/mundo/cronicas-arvores.json', import.meta.url), 'utf8')) as ChronicleRecord;
const canonicalIds = ['aethel', 'aperion', 'chronus', 'erebus', 'haemus', 'ignis', 'keryx', 'moros', 'mulher-carmesim', 'ousias'];

test('crônicas cobrem exatamente as dez Árvores canônicas', () => {
  assert.deepEqual(source.arvores.map((tree) => tree.id).sort(), canonicalIds);
});

test('cada Árvore possui história, lugares e uma cronologia utilizável', () => {
  source.arvores.forEach((tree) => {
    assert.ok(tree.historia.length >= 3, `${tree.id} precisa de pelo menos 3 parágrafos`);
    assert.ok(tree.lugares.length >= 2, `${tree.id} precisa de pelo menos 2 lugares`);
    assert.ok(tree.cronologia.length >= 5, `${tree.id} precisa de pelo menos 5 eventos`);
  });
});

test('ids de eventos são únicos e referências da linha geral são válidas', () => {
  const eventIds = [
    ...source.linha_tempo_geral.map((event) => event.id),
    ...source.arvores.flatMap((tree) => tree.cronologia.map((event) => event.id)),
  ];
  assert.equal(new Set(eventIds).size, eventIds.length);

  source.linha_tempo_geral.forEach((event) => {
    event.arvores?.forEach((treeId) => assert.ok(canonicalIds.includes(treeId), `${treeId} não é uma Árvore válida`));
  });
});

test('cronologias possuem ordem crescente sem empates internos', () => {
  [source.linha_tempo_geral, ...source.arvores.map((tree) => tree.cronologia)].forEach((timeline) => {
    const order = timeline.map((event) => event.ordem);
    assert.deepEqual(order, [...order].sort((a, b) => a - b));
    assert.equal(new Set(order).size, order.length);
  });
});

