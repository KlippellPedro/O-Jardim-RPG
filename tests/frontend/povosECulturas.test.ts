import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { REGRAS_OFICIAIS } from '../../data/regras/regras';
import { RACAS_CATALOGO } from '../../src/services/catalogoService';
import { estruturarGuiaMestre } from '../../src/pages/Regras/guiaMestre';

// Povos e culturas (docs/propostas/povos-e-culturas): a raça fixa só o que vem
// do corpo; a cultura de cada lugar fica com o reino e com as tabelas do Mestre.
const carregarCompendio = async () => await import('../../tools/documentos-mundo/compendio.mjs') as any;

test('toda raça jogável diz o que todo povo dela carrega, em três ou quatro linhas', () => {
  for (const raca of RACAS_CATALOGO) {
    const jogavel = !raca.indisponivel && raca.id !== 'raca-personalizada';
    if (!jogavel) {
      assert.equal(raca.povo, undefined, `${raca.titulo}: sem mecânica, sem povo fixo`);
      continue;
    }
    const linhas = raca.povo || [];
    assert.ok(linhas.length >= 3 && linhas.length <= 4, `${raca.titulo}: ${linhas.length} linhas de povo`);
    for (const linha of linhas) {
      assert.ok(linha.length >= 50, `${raca.titulo}: linha curta demais: ${linha}`);
      assert.match(linha, /\.$/, `${raca.titulo}: linha sem ponto final`);
    }
  }
});

test('o Livro imprime o povo junto da raça', async () => {
  const { corpoDaRaca } = await carregarCompendio();
  const anao = RACAS_CATALOGO.find((raca) => raca.id === 'anao');
  const html = corpoDaRaca(anao);
  assert.match(html, /O que todo povo carrega/);
  assert.match(html, /Uma peça bem feita é presente/);
});

test('o Guia do Mestre traz as seis tabelas de cultura, só para o Mestre', () => {
  const guia = estruturarGuiaMestre(REGRAS_OFICIAIS.mestre.corpo);
  const mundo = guia.estantes.find((estante) => estante.id === 'mundo');
  const cultura = mundo?.secoes.find((secao) => secao.titulo === 'Montar a cultura de um povo');
  assert.ok(cultura, 'a seção de cultura sumiu da estante O mundo reage');
  assert.deepEqual(
    cultura.tabelas.map((tabela) => tabela.titulo),
    ['Governo', 'Relação com o Fluxo', 'Os mortos', 'A comida', 'Os estrangeiros', 'A festa'],
  );
  assert.ok(cultura.tabelas.every((tabela) => tabela.dado === '1d8'));
  const corpo = REGRAS_OFICIAIS.mestre.corpo;
  const trecho = corpo.slice(corpo.indexOf('Montar a cultura de um povo'), corpo.indexOf('Escrever as tabelas da sua campanha'));
  const linhas = trecho.match(/<tr><td>\d<\/td>/g) || [];
  assert.equal(linhas.length, 6 * 8, 'cada tabela tem oito linhas');

  // O Guia é do Mestre: as regras públicas não podem levar a seção.
  const publicas = readFileSync(new URL('../../data/regras/regras-publicas-v1.md', import.meta.url), 'utf8');
  assert.doesNotMatch(publicas, /Montar a cultura de um povo/);
});
