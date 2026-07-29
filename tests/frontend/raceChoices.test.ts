import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { obterVarianteRacial } from '../../src/services/calculoService';
import { escolhaRacialEstaCompleta, obterGruposEscolhaRacial } from '../../src/services/racaService';
import type { IRaca } from '../../src/types/catalogo';

const racas = JSON.parse(
  readFileSync(new URL('../../data/ficha/racas.json', import.meta.url), 'utf8'),
) as IRaca[];

const casosEsperados = [
  ['animalia', 'varianteId', 3],
  ['elfo', 'linhagemId', 7],
  ['desperto', 'condicaoAncestralId', 6],
  ['automato', 'varianteId', 8],
  ['clone', 'varianteId', 4],
  ['bruxa', 'varianteId', 4],
] as const;

test('mapeia todas as sub-raças e escolhas raciais principais do catálogo', () => {
  for (const [racaId, campo, quantidade] of casosEsperados) {
    const raca = racas.find(item => item.id === racaId);
    assert.ok(raca, `Raça ausente: ${racaId}`);
    const grupos = obterGruposEscolhaRacial(raca);
    assert.equal(grupos.length, 1, `Quantidade de grupos inesperada em ${racaId}`);
    assert.equal(grupos[0].campo, campo);
    assert.equal(grupos[0].opcoes.length, quantidade);
    assert.equal(new Set(grupos[0].opcoes.map(opcao => opcao.id)).size, quantidade);
  }
});

test('exige uma escolha válida somente quando a raça possui um grupo obrigatório', () => {
  const elfo = racas.find(item => item.id === 'elfo');
  const humano = racas.find(item => item.id === 'humano');

  assert.equal(escolhaRacialEstaCompleta(elfo, {}), false);
  assert.equal(escolhaRacialEstaCompleta(elfo, { linhagemId: 'natureza' }), true);
  assert.equal(escolhaRacialEstaCompleta(elfo, { linhagemId: 'inexistente' }), false);
  assert.equal(escolhaRacialEstaCompleta(humano, {}), true);
});

test('o cálculo racial reconhece linhagem élfica e condição ancestral', () => {
  const elfo = racas.find(item => item.id === 'elfo') || null;
  const desperto = racas.find(item => item.id === 'desperto') || null;

  assert.equal(obterVarianteRacial(elfo, { linhagemId: 'tempestades' })?.titulo, 'Tempestades');
  assert.equal(
    obterVarianteRacial(desperto, { condicaoAncestralId: 'juramento-inacabado' })?.titulo,
    'Juramento Inacabado',
  );
});
