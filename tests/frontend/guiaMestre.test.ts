import assert from 'node:assert/strict';
import test from 'node:test';
import { REGRAS_OFICIAIS } from '../../data/regras/regras';
import {
  ESTANTE_BIBLIOTECA,
  buscarNoGuia,
  estantesParaNavegacao,
  estruturarGuiaMestre,
  idDaSecao,
} from '../../src/pages/Regras/guiaMestre';

const corpo = REGRAS_OFICIAIS.mestre.corpo;
const guia = estruturarGuiaMestre(corpo);

test('o Guia do Mestre se organiza em estantes, na ordem de uso', () => {
  assert.deepEqual(guia.estantes.map((estante) => estante.id), ['conduzir', 'cena', 'mundo', 'ameaca']);
  guia.estantes.forEach((estante) => {
    assert.ok(estante.titulo && estante.titulo !== estante.id, `${estante.id}: estante sem título`);
    assert.ok(estante.quando.length >= 40, `${estante.id}: estante sem dizer quando usar`);
    assert.ok(estante.secoes.length >= 1, `${estante.id}: estante vazia`);
    assert.doesNotMatch(estante.html, /regras-estante-cabeca/, `${estante.id}: cabeçalho vazou para o conteúdo`);
  });
});

// Seção fora de estante some do mapa: o Mestre só acharia rolando a página.
test('nenhuma seção do guia fica fora de uma estante', () => {
  const titulosNoHtml = [...corpo.matchAll(/<h3[^>]*>([^<]+)<\/h3>/g)].map((achado) => achado[1].trim());
  const titulosNasEstantes = guia.estantes.flatMap((estante) => estante.secoes.map((secao) => secao.titulo));
  assert.deepEqual(titulosNasEstantes, titulosNoHtml);
  assert.doesNotMatch(guia.introducao, /<h3/, 'a introdução não pode carregar seção');
  assert.ok(guia.introducao.length > 100, 'o guia perdeu a introdução');
});

test('o mapa enxerga as tabelas de cada seção', () => {
  const secoes = guia.estantes.flatMap((estante) => estante.secoes);
  const momentos = secoes.find((secao) => secao.titulo === 'Descrever momentos');
  const boatos = secoes.find((secao) => secao.titulo === 'Boatos por Árvore');
  assert.equal(momentos?.tabelas.length, 11);
  assert.equal(momentos?.tabelas[0].titulo, 'Uma criatura aparece');
  assert.equal(momentos?.tabelas[0].dado, '1d6');
  assert.equal(boatos?.tabelas.length, 10);
  assert.equal(guia.estantes.find((estante) => estante.id === 'cena')?.totalTabelas, 11);
});

test('o id da seção é o mesmo que a leitura grava no título', () => {
  assert.equal(idDaSecao('Sua primeira sessão'), 'secao-sua-primeira-sessao');
  assert.equal(idDaSecao('Eventos aleatórios em 2d6'), 'secao-eventos-aleatorios-em-2d6');
});

test('a Biblioteca entra como última estante da navegação', () => {
  const navegacao = estantesParaNavegacao(guia);
  assert.equal(navegacao.length, guia.estantes.length + 1);
  assert.deepEqual(navegacao.at(-1), { id: ESTANTE_BIBLIOTECA.id, titulo: ESTANTE_BIBLIOTECA.titulo });
});

test('capítulo sem estantes continua legível como estante única', () => {
  const avulso = estruturarGuiaMestre('<p>Abertura.</p><h3 class="regras-subtitle">Uma seção</h3><p>Texto.</p>');
  assert.equal(avulso.estantes.length, 1);
  assert.equal(avulso.estantes[0].id, 'guia');
  assert.deepEqual(avulso.estantes[0].secoes.map((secao) => secao.titulo), ['Uma seção']);
});

test('a busca do guia ignora acento e aponta estante, seção e tabela', () => {
  assert.deepEqual(buscarNoGuia(guia, ''), []);

  const relogio = buscarNoGuia(guia, 'relogio');
  assert.ok(relogio.some((item) => item.estanteId === 'mundo' && item.secaoTitulo === 'Relógios de pressão'));

  const cachorro = buscarNoGuia(guia, 'cachorro canto vazio');
  const achado = cachorro.find((item) => item.tabelaTitulo === 'Algo está errado');
  assert.ok(achado, 'a busca não achou a linha dentro da tabela');
  assert.equal(achado?.estanteId, 'cena');
  assert.equal(achado?.secaoId, 'secao-descrever-momentos');

  assert.ok(buscarNoGuia(guia, 'boato').length <= 12, 'a busca precisa respeitar o limite de resultados');
});
