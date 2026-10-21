import assert from 'node:assert/strict';
import test from 'node:test';

import magiasData from '../../data/ficha/magias.json';

// Decisão de 2026-10-20 (opção B da decisão 11): dispositivo "para de
// funcionar", e o Autômato, que é raça jogável, fica Paralisado, sempre com
// teste. Nada mais desliga, atordoa ou destrói Autômato sem resistência.

const textos = [
  ...magiasData.magias, ...magiasData.selos, ...magiasData.rituais, ...magiasData.encantamentos,
].flatMap((item: any) => [item.efeito || '', ...Object.values(item.efeitos_por_fluxo || {})].map((texto) => ({ id: item.id, texto: String(texto) })));

test('nenhum efeito desliga, atordoa ou destrói Autômato', () => {
  const restantes = textos.filter(({ id, texto }) => (
    id !== 'fabrica-de-campo' && /aut[oô]mato/i.test(texto) && /deslig|atordo|destru/i.test(texto)
  ));
  assert.deepEqual(restantes.map(({ id }) => id), []);
});

test('todo efeito que paralisa Autômato traz o teste', () => {
  const paralisam = textos.filter(({ texto }) => /Autômatos?[^.]*Paralisad/.test(texto));
  assert.ok(paralisam.length >= 6, `só ${paralisam.length} efeitos`);
  for (const { id, texto } of paralisam) assert.match(texto, /Reflexos|Fortitude/, id);
});
