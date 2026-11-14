import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import type { IDocumentoUniversal, IResumoDocumento } from '../../src/services/documentosApi';
import {
  GRUPO_DOS_SALVOS,
  agruparDocumentos,
  contagemPorOrigem,
  escolhaValida,
  montarItens,
  partirChave,
  vizinho,
} from '../../src/pages/Mapa/componentes/listaDeDocumentos';

// A janela "Mostrar um documento" do mapa: salvos e universais numa lista só, com filtro e busca.

const salvo = (id: string, titulo: string): IResumoDocumento => ({ id, modelo: 'carta', titulo, criado_em: null, atualizado_em: null });
const universal = (id: string, tema: string, titulo: string, extras: Partial<IDocumentoUniversal> = {}): IDocumentoUniversal => ({
  id, tema, missao: null, papel_na_missao: null, titulo, ensina: '', entregar: '', fontes: [], inventado: [], modelo: 'carta', campos: { corpo: titulo }, editado: false, editado_em: null, ...extras,
});

const itens = montarItens(
  [salvo('s1', 'Convite para o baile'), salvo('s2', 'Mapa do porão')],
  [
    universal('u1', 'Cosmologia', 'Lição de casa: o que tem dentro do Jardim', { ensina: 'Apresenta as nove Árvores', entregar: 'No primeiro dia' }),
    universal('u2', 'Cosmologia', 'Almanaque: dez meses, nove Árvores e um vazio'),
    universal('u3', 'Fluxos', 'Edital da Vigília'),
    universal('u4', '  ', 'Sem assunto'),
  ],
);

test('salvos e universais viram uma lista só, com a chave que a rota de mostrar entende', () => {
  assert.deepEqual(itens.map((item) => item.chave), ['salvo:s1', 'salvo:s2', 'universal:u1', 'universal:u2', 'universal:u3', 'universal:u4']);
  assert.equal(itens[0].grupo, GRUPO_DOS_SALVOS);
  assert.equal(itens[0].campos, null, 'o salvo busca os campos ao ser escolhido');
  assert.deepEqual(itens[2].campos, { corpo: 'Lição de casa: o que tem dentro do Jardim' });
  assert.equal(itens[2].ensina, 'Apresenta as nove Árvores');
  assert.equal(itens[5].grupo, 'Outros', 'tema em branco vai para Outros');
});

test('a chave se parte em origem e id, e id com dois-pontos continua inteiro', () => {
  assert.deepEqual(partirChave('universal:u1'), { origem: 'universal', id: 'u1' });
  assert.deepEqual(partirChave('salvo:a:b'), { origem: 'salvo', id: 'a:b' });
  assert.equal(partirChave('outro:x'), null);
  assert.equal(partirChave('semdoispontos'), null);
  assert.equal(partirChave('salvo:'), null);
});

test('agrupa na ordem em que cada grupo aparece, e o filtro de origem corta o resto', () => {
  assert.deepEqual(agruparDocumentos(itens, 'todos', '').map((g) => [g.titulo, g.itens.length]), [
    [GRUPO_DOS_SALVOS, 2], ['Cosmologia', 2], ['Fluxos', 1], ['Outros', 1],
  ]);
  assert.deepEqual(agruparDocumentos(itens, 'salvo', '').map((g) => g.titulo), [GRUPO_DOS_SALVOS]);
  assert.deepEqual(agruparDocumentos(itens, 'universal', '').map((g) => g.titulo), ['Cosmologia', 'Fluxos', 'Outros']);
});

test('a busca acha pelo título e pelo assunto, sem acento nem caixa', () => {
  assert.deepEqual(agruparDocumentos(itens, 'todos', 'LICAO').flatMap((g) => g.itens.map((i) => i.chave)), ['universal:u1']);
  assert.deepEqual(agruparDocumentos(itens, 'todos', 'cosmologia').flatMap((g) => g.itens.map((i) => i.chave)), ['universal:u1', 'universal:u2']);
  assert.deepEqual(agruparDocumentos(itens, 'todos', 'nove arvores').flatMap((g) => g.itens.map((i) => i.chave)), ['universal:u2']);
  assert.deepEqual(agruparDocumentos(itens, 'todos', 'xyz'), []);
  assert.equal(agruparDocumentos(itens, 'salvo', 'edital').length, 0, 'filtro e busca valem juntos');
});

test('a escolha acompanha a lista e as setas andam sem dar a volta', () => {
  const todos = agruparDocumentos(itens, 'todos', '');
  assert.equal(escolhaValida(todos, 'universal:u3'), 'universal:u3');
  assert.equal(escolhaValida(todos, 'salvo:sumiu'), 'salvo:s1', 'cai no primeiro');
  assert.equal(escolhaValida([], 'salvo:s1'), '');
  const universais = agruparDocumentos(itens, 'universal', '');
  assert.equal(escolhaValida(universais, 'salvo:s1'), 'universal:u1', 'o salvo saiu do filtro');
  assert.equal(vizinho(todos, 'salvo:s1', 1), 'salvo:s2');
  assert.equal(vizinho(todos, 'salvo:s1', -1), 'salvo:s1', 'para no começo');
  assert.equal(vizinho(todos, 'universal:u4', 1), 'universal:u4', 'para no fim');
  assert.equal(vizinho(todos, 'nada', 1), 'salvo:s1');
});

test('a contagem de cada filtro bate com a lista', () => {
  assert.deepEqual(contagemPorOrigem(itens), { todos: 6, salvo: 2, universal: 4 });
});

test('a janela usa a prévia do mesmo desenho que a mesa recebe e não depende de select nativo para escolher o documento', () => {
  const painel = readFileSync(new URL('../../src/pages/Mapa/componentes/PainelDocumentosMesa.tsx', import.meta.url), 'utf8');
  assert.match(painel, /useDocumentoNoCanvas/);
  assert.match(painel, /role="dialog"/);
  assert.doesNotMatch(painel, /<optgroup/, 'o documento se escolhe na lista própria, não no select');
  const mesa = readFileSync(new URL('../../src/pages/Mapa/componentes/DocumentoDaMesa.tsx', import.meta.url), 'utf8');
  assert.match(mesa, /useDocumentoNoCanvas/, 'a mesa e a prévia desenham pelo mesmo caminho');
});
