import assert from 'node:assert/strict';
import test from 'node:test';
import {
  chaveDoPadrao,
  etiquetasDaLista,
  filtrarRegistros,
  itensParaTexto,
  mesclarRegistros,
  textoParaItens,
  type IRegistro,
} from '../../src/pages/Mundo/universais/registros';
import type { IRegistroDoServidor } from '../../src/services/registrosUniversaisApi';

const padrao = (id: string, titulo: string, extra: Partial<IRegistro> = {}): IRegistro => ({
  chave: chaveDoPadrao('bestiario', id), secao: 'bestiario', origemId: id, serverId: null, titulo, subtitulo: 'Criatura',
  descricao: `Descricao de ${titulo}`, campos: [['Nível', '5']], blocos: [], etiquetas: ['Animal'], revelacao: 'aberto',
  editado: false, proprio: false, editor: 'servidor', ...extra,
});

const servidor = (extra: Partial<IRegistroDoServidor> & { id: string }): IRegistroDoServidor => ({
  secao: 'bestiario', origem_id: null, revelacao: 'aberto', dados: {}, ...extra,
});

test('ajuste do Mestre troca so os campos escritos e marca o registro como editado', () => {
  const lista = mesclarRegistros(
    [padrao('lobo', 'Lobo'), padrao('urso', 'Urso')],
    [servidor({ id: 's1', origem_id: 'lobo', dados: { descricao: 'Versao da mesa' } })],
    false,
  );
  assert.equal(lista[0].descricao, 'Versao da mesa');
  assert.equal(lista[0].titulo, 'Lobo');
  assert.deepEqual(lista[0].campos, [['Nível', '5']]);
  assert.equal(lista[0].editado, true);
  assert.equal(lista[0].serverId, 's1');
  assert.equal(lista[1].editado, false);
});

test('registro oculto some para o jogador mas continua para o Mestre', () => {
  const ajustes = [servidor({ id: 's1', origem_id: 'lobo', revelacao: 'oculto' }), servidor({ id: 's2', secao: 'rumores', revelacao: 'oculto', dados: { titulo: 'Segredo' } })];
  const jogador = mesclarRegistros([padrao('lobo', 'Lobo')], ajustes, false);
  assert.equal(jogador.length, 0);
  const mestre = mesclarRegistros([padrao('lobo', 'Lobo')], ajustes, true);
  assert.equal(mestre.length, 2);
});

test('registro proprio nasce depois dos de fabrica e rasurado segue na lista', () => {
  const lista = mesclarRegistros(
    [padrao('lobo', 'Lobo')],
    [servidor({ id: 's9', secao: 'personagens', revelacao: 'rasurado', dados: {} })],
    false,
  );
  assert.equal(lista.length, 2);
  assert.equal(lista[1].chave, 'proprio:s9');
  assert.equal(lista[1].revelacao, 'rasurado');
  assert.equal(lista[1].proprio, true);
  assert.equal(lista[1].titulo, '');
});

test('busca ignora acento e maiuscula, e nao acha texto de registro rasurado para jogador', () => {
  const lista = [
    padrao('lobo', 'Lobo Sombrio', { descricao: 'Ronda a noite' }),
    padrao('segredo', 'Registro retido', { revelacao: 'rasurado', descricao: 'Texto secreto do dragao' }),
  ];
  assert.equal(filtrarRegistros(lista, 'sombrio', '', false).length, 1);
  assert.equal(filtrarRegistros(lista, 'RONDA A NOITE', '', false).length, 1);
  assert.equal(filtrarRegistros(lista, 'dragao', '', false).length, 0);
  assert.equal(filtrarRegistros(lista, 'dragao', '', true).length, 1);
  assert.equal(filtrarRegistros(lista, '', 'Animal', false).length, 2);
  assert.equal(filtrarRegistros(lista, '', 'Voador', false).length, 0);
});

test('etiquetas mais comuns vem primeiro', () => {
  const lista = [padrao('a', 'A', { etiquetas: ['Animal', 'Raro'] }), padrao('b', 'B', { etiquetas: ['Animal'] }), padrao('c', 'C', { etiquetas: ['Morto-Vivo'] })];
  assert.deepEqual(etiquetasDaLista(lista), ['Animal', 'Morto-Vivo', 'Raro']);
});

test('lista de itens vira texto e volta sem linhas vazias', () => {
  assert.equal(itensParaTexto(['Mordida', 'Garras']), 'Mordida\nGarras');
  assert.deepEqual(textoParaItens('  Mordida \n\n Garras  \n'), ['Mordida', 'Garras']);
});
