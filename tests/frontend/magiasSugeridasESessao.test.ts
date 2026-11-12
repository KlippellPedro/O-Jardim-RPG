import assert from 'node:assert/strict';
import test from 'node:test';
import fs from 'node:fs';

import { MAGIAS_CATALOGO } from '../../src/services/magiaService';
import { ESTILOS_SUGERIDOS, estiloSugeridoDaMagia, listasSugeridas, magiaNoPapel } from '../../src/services/magiasSugeridas';
import { REGRAS_OFICIAIS } from '../../data/regras/regras';

// Pedido do Pedro (2026-11-12): listas de magia sugeridas por Fluxo, e o que é
// de combate e dizia "por sessão" passa a "por descanso".

const FLUXOS = [...new Set(MAGIAS_CATALOGO.map((magia) => magia.fluxo))].filter((fluxo) => fluxo !== 'universal');

test('cada Fluxo tem três caminhos de uma magia por círculo, sem repetir magia', () => {
  assert.equal(FLUXOS.length, 11);
  for (const fluxo of FLUXOS) {
    const listas = listasSugeridas(fluxo);
    assert.deepEqual(listas.map((lista) => lista.estilo), ESTILOS_SUGERIDOS.map((estilo) => estilo.id));
    const ids = listas.flatMap((lista) => lista.magias.map((magia) => magia.id));
    assert.equal(new Set(ids).size, ids.length, `${fluxo}: magia repetida entre caminhos`);
    for (const lista of listas) {
      assert.equal(lista.magias.length, 10, `${fluxo}/${lista.estilo}: ${lista.magias.length} círculos`);
      assert.deepEqual(lista.magias.map((magia) => magia.circulo), [1, 2, 3, 4, 5, 6, 7, 8, 9, 10], `${fluxo}/${lista.estilo}: fora de ordem`);
      assert.ok(lista.magias.every((magia) => magia.fluxo === fluxo));
    }
  }
});

test('os caminhos seguem o papel da magia quando o círculo tem a opção', () => {
  for (const fluxo of FLUXOS) {
    for (const lista of listasSugeridas(fluxo)) {
      // O caminho pega toda magia do papel que o Fluxo tem, até uma por círculo.
      const doFluxoNoPapel = MAGIAS_CATALOGO.filter((magia) => magia.fluxo === fluxo && magiaNoPapel(magia, lista.estilo));
      const circulosComPapel = new Set(doFluxoNoPapel.map((magia) => magia.circulo)).size;
      assert.ok(lista.noPapel >= Math.min(circulosComPapel, 5), `${fluxo}/${lista.estilo}: ${lista.noPapel} no papel, o Fluxo tem em ${circulosComPapel} círculos`);
    }
  }
  const exemplo = listasSugeridas('tempo').find((lista) => lista.estilo === 'controle')!.magias[0];
  assert.equal(estiloSugeridoDaMagia(exemplo), 'controle');
  assert.equal(estiloSugeridoDaMagia({ id: 'qualquer', fluxo: 'universal' }), null);
  assert.match(String(REGRAS_OFICIAIS['catalogo-magico'].corpo), /Caminhos sugeridos/);
});

test('poder de combate volta no descanso; história e sorte seguem por sessão', () => {
  const ler = (arquivo: string) => fs.readFileSync(arquivo, 'utf8');
  const classes = ler('data/ficha/classes.json');
  const racas = ler('data/ficha/racas.json');
  // Combate: finais e poderes de batalha.
  assert.match(classes, /"titulo": "Bankai"[\s\S]{0,400}?uma vez por descanso/i);
  assert.match(racas, /Duas vezes por descanso, gaste uma ação completa e 56 Mana/);
  // História, informação e sorte: continuam por sessão.
  assert.match(classes, /Uma vez por sessão, pergunte à Guilda se alguém já viu sua presa/);
  assert.match(racas, /Uma vez por sessão, depois de rolar qualquer teste de perícia, role de novo/);
  assert.match(String(REGRAS_OFICIAIS['poderes-habilidades'].corpo), /Poder de combate volta no descanso/);
});
