import assert from 'node:assert/strict';
import test from 'node:test';
import type { IItemAcervo, IPastaAcervo } from '../../src/services/acervoApi';
import {
  alternarFavorito, buscaVazia, caminhoDaPasta, empacotarItem, itensDaVista, LIMITE_DA_JANELA, LIMITE_DE_RECENTES, lerItemArrastado, lerListaDeIds, raizDaPasta, registrarRecente, subpastas,
} from '../../src/pages/Mapa/componentes/dockAcervoConta';

const pastas: IPastaAcervo[] = [
  { id: 'p-cidades', pai_id: null, nome: 'Cidades' },
  { id: 'p-masmorras', pai_id: null, nome: 'Masmorras' },
  { id: 'p-porto', pai_id: 'p-cidades', nome: 'Porto' },
  { id: 'p-docas', pai_id: 'p-porto', nome: 'Docas' },
];

const item = (id: string, nome: string, extra: Partial<IItemAcervo> = {}): IItemAcervo => ({
  id, nome, tipo: 'mapa', largura: 1000, altura: 800, pasta_id: null, etiquetas: [], estado: 'pronto', bytes: 1, chaves: [], criado_em: '', ...extra,
});

const acervo = {
  itens: [
    item('1', 'Praça da Fonte', { pasta_id: 'p-cidades', etiquetas: ['cidade'] }),
    item('2', 'Taverna', { tipo: 'token', pasta_id: 'p-cidades' }),
    item('3', 'Cripta', { pasta_id: 'p-masmorras' }),
    item('4', 'Lobo', { tipo: 'token', pasta_id: null }),
    item('5', 'Barril', { tipo: 'objeto', pasta_id: 'p-porto' }),
    item('6', 'Mapa em envio', { estado: 'enviando' }),
    item('7', 'Árvore Velha', { tipo: 'objeto', etiquetas: ['Floresta'] }),
  ],
};

test('o pacote do arrasto vai e volta, e o que vier torto é recusado', () => {
  const pronto = item('x', 'Praça', { largura: 3000, altura: 2000 });
  assert.deepEqual(lerItemArrastado(empacotarItem(pronto)), { id: 'x', nome: 'Praça', tipo: 'mapa', largura: 3000, altura: 2000 });
  for (const ruim of ['', 'nao-e-json', 'null', '[]', '{}', '{"id":"x"}',
    '{"id":"x","nome":"a","tipo":"inimigo","largura":1,"altura":1}',
    '{"id":"","nome":"a","tipo":"mapa","largura":1,"altura":1}',
    '{"id":"x","nome":"a","tipo":"mapa","largura":"1","altura":1}',
    '{"id":"x","nome":"a","tipo":"mapa","largura":1,"altura":null}']) {
    assert.equal(lerItemArrastado(ruim), null, ruim);
  }
});

test('a árvore de pastas: filhas em ordem, caminho até a pasta e a raiz de cada uma', () => {
  assert.deepEqual(subpastas(pastas, null).map((p) => p.nome), ['Cidades', 'Masmorras']);
  assert.deepEqual(subpastas(pastas, 'p-cidades').map((p) => p.nome), ['Porto']);
  assert.deepEqual(subpastas(pastas, 'p-docas'), []);
  assert.deepEqual(caminhoDaPasta(pastas, 'p-docas').map((p) => p.nome), ['Cidades', 'Porto', 'Docas']);
  assert.deepEqual(caminhoDaPasta(pastas, 'nao-existe'), []);
  assert.equal(raizDaPasta(pastas, 'p-docas'), 'p-cidades');
  assert.equal(raizDaPasta(pastas, 'p-masmorras'), 'p-masmorras');
  assert.equal(raizDaPasta(pastas, 'nao-existe'), null);
  // Uma pasta que aponta para si mesma não prende a conta.
  assert.deepEqual(caminhoDaPasta([{ id: 'a', pai_id: 'a', nome: 'A' }], 'a').map((p) => p.id), ['a']);
});

test('a janela mostra só imagens prontas, por tipo, por pasta ou pela busca', () => {
  const nomes = (vista: Parameters<typeof itensDaVista>[1], busca = '') => itensDaVista(acervo, vista, busca).itens.map((i) => i.nome);
  assert.deepEqual(nomes({ modo: 'tipo', tipo: 'mapa' }), ['Cripta', 'Praça da Fonte']);
  assert.deepEqual(nomes({ modo: 'tipo', tipo: 'token' }), ['Lobo', 'Taverna']);
  assert.deepEqual(nomes({ modo: 'tipo', tipo: 'objeto' }), ['Árvore Velha', 'Barril']);
  // A pasta mostra o que está nela, de qualquer tipo, sem as subpastas (elas viram atalhos).
  assert.deepEqual(nomes({ modo: 'pasta', pastaId: 'p-cidades' }), ['Praça da Fonte', 'Taverna']);
  assert.deepEqual(nomes({ modo: 'pasta', pastaId: 'p-porto' }), ['Barril']);
  // Imagem ainda em envio não aparece em lugar nenhum.
  assert.ok(!nomes({ modo: 'busca' }, 'envio').length);
});

test('a busca ignora acento e caixa, olha as etiquetas e vale dentro de um tipo', () => {
  const nomes = (vista: Parameters<typeof itensDaVista>[1], busca: string) => itensDaVista(acervo, vista, busca).itens.map((i) => i.nome);
  assert.deepEqual(nomes({ modo: 'busca' }, 'praca'), ['Praça da Fonte']);
  assert.deepEqual(nomes({ modo: 'busca' }, 'ARVORE'), ['Árvore Velha']);
  assert.deepEqual(nomes({ modo: 'busca' }, 'floresta'), ['Árvore Velha']);
  assert.deepEqual(nomes({ modo: 'tipo', tipo: 'token' }, 'lo'), ['Lobo']);
  assert.deepEqual(nomes({ modo: 'busca' }, 'zzz'), []);
  assert.deepEqual(itensDaVista(null, { modo: 'busca' }, 'a'), { itens: [], total: 0 });
});

test('o limite da janela corta a lista mas conta todos, e a busca sem texto não lista o Acervo inteiro', () => {
  const muitos = { itens: Array.from({ length: LIMITE_DA_JANELA + 30 }, (_, i) => item(String(i), `Mapa ${i}`)) };
  const { itens, total } = itensDaVista(muitos, { modo: 'tipo', tipo: 'mapa' }, '');
  assert.equal(itens.length, LIMITE_DA_JANELA);
  assert.equal(total, LIMITE_DA_JANELA + 30);
  // Ordem natural: Mapa 2 vem antes de Mapa 10.
  assert.deepEqual(itens.slice(0, 3).map((i) => i.nome), ['Mapa 0', 'Mapa 1', 'Mapa 2']);
  assert.equal(buscaVazia({ modo: 'busca' }, '   '), true);
  assert.equal(buscaVazia({ modo: 'busca' }, 'a'), false);
  assert.equal(buscaVazia({ modo: 'tipo', tipo: 'mapa' }, ''), false);
});

test('recentes: o último usado vai para a frente, sem repetir e com limite', () => {
  assert.deepEqual(registrarRecente([], 'a'), ['a']);
  assert.deepEqual(registrarRecente(['a', 'b', 'c'], 'c'), ['c', 'a', 'b']);
  assert.deepEqual(registrarRecente(['a', 'b'], 'z', 2), ['z', 'a']);
  const longa = Array.from({ length: 40 }, (_, i) => `i${i}`);
  assert.equal(registrarRecente(longa, 'novo').length, LIMITE_DE_RECENTES);
  assert.equal(registrarRecente(longa, 'novo')[0], 'novo');
  // A lista de entrada não é alterada.
  const original = ['a', 'b'];
  registrarRecente(original, 'b');
  assert.deepEqual(original, ['a', 'b']);
});

test('favoritos: a estrela liga e desliga', () => {
  assert.deepEqual(alternarFavorito([], '1'), ['1']);
  assert.deepEqual(alternarFavorito(['1', '2'], '1'), ['2']);
  assert.deepEqual(alternarFavorito(['1'], '2'), ['1', '2']);
});

test('a lista guardada no aparelho aguenta lixo, repetidos e o que não é texto', () => {
  assert.deepEqual(lerListaDeIds(null), []);
  assert.deepEqual(lerListaDeIds(''), []);
  assert.deepEqual(lerListaDeIds('nao-e-json'), []);
  assert.deepEqual(lerListaDeIds('{"a":1}'), []);
  assert.deepEqual(lerListaDeIds('["a","b","a",1,null,"",{"x":1}]'), ['a', 'b']);
  assert.deepEqual(lerListaDeIds(JSON.stringify(['x'.repeat(100), 'ok'])), ['ok']);
  const enorme = JSON.stringify(Array.from({ length: 2000 }, (_, i) => `id${i}`));
  assert.equal(lerListaDeIds(enorme).length, 500);
});

test('a janela de Recentes segue a ordem de uso e a de Favoritos, a do nome', () => {
  const listas = { recentes: ['5', '1', '4'], favoritos: ['3', '1'] };
  const nomes = (vista: Parameters<typeof itensDaVista>[1], busca = '') => itensDaVista(acervo, vista, busca, 120, listas).itens.map((i) => i.nome);
  assert.deepEqual(nomes({ modo: 'recentes' }), ['Barril', 'Praça da Fonte', 'Lobo']);
  assert.deepEqual(nomes({ modo: 'favoritos' }), ['Cripta', 'Praça da Fonte']);
  // Filtro de nome vale dentro da vista; ids que não existem mais (imagem apagada) simplesmente não aparecem.
  assert.deepEqual(nomes({ modo: 'recentes' }, 'lobo'), ['Lobo']);
  assert.deepEqual(itensDaVista(acervo, { modo: 'favoritos' }, '', 120, { recentes: [], favoritos: ['inexistente'] }).itens, []);
  // Sem listas, as duas vistas ficam vazias (não listam o Acervo inteiro).
  assert.deepEqual(itensDaVista(acervo, { modo: 'recentes' }, '').itens, []);
  assert.deepEqual(itensDaVista(acervo, { modo: 'favoritos' }, '').itens, []);
});
