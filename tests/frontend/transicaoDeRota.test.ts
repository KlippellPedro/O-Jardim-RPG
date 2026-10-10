import assert from 'node:assert/strict';
import test from 'node:test';
import { chaveDeTransicao } from '../../src/utils/transicaoDeRota';

test('cada tela principal tem a sua chave', () => {
  const caminhos = ['/', '/campanhas', '/ficha', '/loja', '/sessao', '/quadro', '/campanha', '/cofre', '/frota', '/materiais', '/admin', '/mestre', '/criador', '/login'];
  const chaves = caminhos.map(chaveDeTransicao);
  assert.equal(new Set(chaves).size, caminhos.length);
  assert.equal(chaveDeTransicao('/'), 'home');
  assert.equal(chaveDeTransicao('/loja'), 'loja');
});

test('lista e ficha aberta são telas diferentes, e todas as fichas são a mesma tela', () => {
  assert.notEqual(chaveDeTransicao('/ficha'), chaveDeTransicao('/ficha/abc'));
  assert.equal(chaveDeTransicao('/ficha/abc'), chaveDeTransicao('/ficha/def'));
});

test('navegar por dentro do Mundo não refaz a tela (o estado da MundoPage fica)', () => {
  const mundo = chaveDeTransicao('/mundo');
  for (const caminho of ['/mundo/arvores/genese', '/mundo/arvores/genese/lore/galho', '/mundo/vazio', '/mundo/vazio/lore/bordo', '/mundo/universal', '/mundo/cronologia']) {
    assert.equal(chaveDeTransicao(caminho), mundo, caminho);
  }
});

test('o calendário e o Livro da Verdade são telas próprias dentro de /mundo', () => {
  assert.notEqual(chaveDeTransicao('/mundo/calendario'), chaveDeTransicao('/mundo'));
  assert.notEqual(chaveDeTransicao('/mundo/livro-da-verdade'), chaveDeTransicao('/mundo'));
  assert.notEqual(chaveDeTransicao('/mundo/calendario'), chaveDeTransicao('/mundo/livro-da-verdade'));
});

test('as regras separam o livro de um item aberto', () => {
  assert.notEqual(chaveDeTransicao('/regras'), chaveDeTransicao('/regras/classes/guerreiro'));
  assert.equal(chaveDeTransicao('/regras/classes/guerreiro'), chaveDeTransicao('/regras/racas/humano'));
});

test('as páginas de entidades seguem as rotas do App', () => {
  const chaves = ['/entidades', '/entidades/sobre', '/entidades/gambler/cassino', '/entidades/gambler'].map(chaveDeTransicao);
  assert.equal(new Set(chaves.slice(0, 3)).size, 3);
  assert.equal(chaves[3], 'entidades-conto');
  assert.equal(chaveDeTransicao('/entidades/escritor'), 'entidades-conto');
});

test('barra no fim e endereço vazio não mudam a chave', () => {
  assert.equal(chaveDeTransicao('/loja/'), chaveDeTransicao('/loja'));
  assert.equal(chaveDeTransicao(''), 'home');
});
