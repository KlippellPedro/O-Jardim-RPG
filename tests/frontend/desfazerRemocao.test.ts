import assert from 'node:assert/strict';
import test from 'node:test';
import { lerAvisos, limparAvisos } from '../../src/components/avisos/avisos';
import { devolverItem, removerComDesfazer } from '../../src/components/avisos/desfazer';

interface Item { id: string; nome: string }
const item = (id: string): Item => ({ id, nome: `Item ${id}` });

/** Uma "ficha" com a lista e o par ler/gravar que o componente usaria. */
const fichaCom = (...ids: string[]) => {
  let lista: Item[] = ids.map(item);
  return {
    ler: () => lista,
    gravar: (nova: Item[]) => { lista = nova; },
    ids: () => lista.map((outro) => outro.id),
  };
};

test('o item sai da lista na hora e o aviso traz o botão Desfazer', () => {
  limparAvisos();
  const ficha = fichaCom('a', 'b', 'c');
  const saiu = removerComDesfazer({ item: item('b'), ler: ficha.ler, gravar: ficha.gravar, texto: 'Ataque excluído.' });
  assert.equal(saiu, true);
  assert.deepEqual(ficha.ids(), ['a', 'c']);
  const [aviso] = lerAvisos();
  assert.equal(aviso.texto, 'Ataque excluído.');
  assert.equal(aviso.acao?.rotulo, 'Desfazer');
  assert.ok(aviso.duracaoMs >= 9000, 'dá tempo de usar o botão');
  limparAvisos();
});

test('desfazer devolve o item exatamente onde ele estava', () => {
  limparAvisos();
  const ficha = fichaCom('a', 'b', 'c', 'd');
  removerComDesfazer({ item: item('c'), ler: ficha.ler, gravar: ficha.gravar, texto: 'x' });
  void lerAvisos()[0].acao?.aoClicar();
  assert.deepEqual(ficha.ids(), ['a', 'b', 'c', 'd']);
  limparAvisos();
});

test('desfazer respeita o que mudou na lista depois da exclusão', () => {
  limparAvisos();
  const ficha = fichaCom('a', 'b', 'c');
  removerComDesfazer({ item: item('b'), ler: ficha.ler, gravar: ficha.gravar, texto: 'x' });
  ficha.gravar([...ficha.ler(), item('novo')]);
  void lerAvisos()[0].acao?.aoClicar();
  assert.deepEqual(ficha.ids(), ['a', 'b', 'c', 'novo'], 'o item novo não se perde');
  limparAvisos();
});

test('se a lista encolheu, o item volta ao fim em vez de sumir', () => {
  limparAvisos();
  const ficha = fichaCom('a', 'b', 'c');
  removerComDesfazer({ item: item('c'), ler: ficha.ler, gravar: ficha.gravar, texto: 'x' });
  ficha.gravar([]);
  void lerAvisos()[0].acao?.aoClicar();
  assert.deepEqual(ficha.ids(), ['c']);
  limparAvisos();
});

test('desfazer duas vezes não duplica o item', () => {
  limparAvisos();
  const ficha = fichaCom('a', 'b');
  removerComDesfazer({ item: item('a'), ler: ficha.ler, gravar: ficha.gravar, texto: 'x' });
  const { acao } = lerAvisos()[0];
  void acao?.aoClicar();
  void acao?.aoClicar();
  assert.deepEqual(ficha.ids(), ['a', 'b']);
  limparAvisos();
});

test('item que já não estava na lista não gera aviso nenhum', () => {
  limparAvisos();
  const ficha = fichaCom('a');
  const saiu = removerComDesfazer({ item: item('fantasma'), ler: ficha.ler, gravar: ficha.gravar, texto: 'x' });
  assert.equal(saiu, false);
  assert.equal(lerAvisos().length, 0);
  assert.deepEqual(ficha.ids(), ['a']);
});

test('quem pediu um gancho é avisado quando o item volta', () => {
  limparAvisos();
  const ficha = fichaCom('a', 'b');
  let voltou = 0;
  removerComDesfazer({ item: item('a'), ler: ficha.ler, gravar: ficha.gravar, texto: 'x', aoDesfazer: () => { voltou += 1; } });
  void lerAvisos()[0].acao?.aoClicar();
  assert.equal(voltou, 1);
  limparAvisos();
});

test('devolverItem não mexe na lista original e limita o índice', () => {
  const original = [item('a'), item('b')];
  const nova = devolverItem(original, item('z'), 99);
  assert.deepEqual(nova?.map((i) => i.id), ['a', 'b', 'z']);
  assert.equal(original.length, 2);
  assert.deepEqual(devolverItem(original, item('y'), -5)?.map((i) => i.id), ['y', 'a', 'b']);
  assert.equal(devolverItem(original, item('a'), 0), null);
});
