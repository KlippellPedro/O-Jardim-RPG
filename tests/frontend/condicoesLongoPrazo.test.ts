import assert from 'node:assert/strict';
import test from 'node:test';
import { CONDICOES_OFICIAIS, CRISES_SANIDADE } from '../../data/regras/condicoes';
import {
  CONDICOES_LONGO_PRAZO,
  FILTRO_DO_GRUPO,
  GRUPOS_LONGO_PRAZO,
} from '../../data/regras/condicoes-longo-prazo';
import {
  FILTROS_CATALOGO,
  listarCondicoes,
  TODAS_AS_CONDICOES_DA_FICHA,
} from '../../src/pages/Ficha/utils/catalogoCondicoes';
import { adicionarCondicaoOficial } from '../../src/services/statusService';

test('ids do catálogo de condições são únicos entre cena, longo prazo e crises', () => {
  const ids = TODAS_AS_CONDICOES_DA_FICHA.map((item) => item.id);
  assert.equal(new Set(ids).size, ids.length);
  assert.equal(
    ids.length,
    CONDICOES_OFICIAIS.length + CONDICOES_LONGO_PRAZO.length + CRISES_SANIDADE.length,
  );
});

test('toda condição de longo prazo tem grupo, efeito e uma saída conhecida', () => {
  for (const item of CONDICOES_LONGO_PRAZO) {
    assert.ok(item.grupo && GRUPOS_LONGO_PRAZO.includes(item.grupo), `${item.id} sem grupo válido`);
    assert.ok(item.titulo.trim() && item.duracao.trim(), `${item.id} sem título ou duração`);
    assert.ok(item.efeitos.length > 0 && item.efeitos.every((efeito) => efeito.trim()), `${item.id} sem efeitos`);
    assert.ok(item.remocao.trim(), `${item.id} sem forma de remover`);
    assert.ok(item.categoria === 'física' || item.categoria === 'mental', `${item.id} com categoria inesperada`);
  }
});

test('o catálogo cobre os casos pedidos: membro quebrado, perdas permanentes e saúde mental', () => {
  const titulos = new Set(CONDICOES_LONGO_PRAZO.map((item) => item.titulo));
  for (const esperado of ['Braço Dominante Quebrado', 'Perna Quebrada', 'Perda de uma Perna', 'Ansiedade', 'Depressão', 'Estresse Pós-Traumático']) {
    assert.ok(titulos.has(esperado), `faltou ${esperado}`);
  }
  assert.ok(CONDICOES_LONGO_PRAZO.some((item) => item.permanente), 'precisa haver condições permanentes');
  assert.ok(
    CONDICOES_LONGO_PRAZO.filter((item) => item.categoria === 'mental').length >= 10,
    'o grupo mental precisa de variedade para a Quebra de Sanidade',
  );
});

test('condições permanentes dizem que são permanentes na duração', () => {
  for (const item of CONDICOES_LONGO_PRAZO.filter((condicao) => condicao.permanente)) {
    assert.match(item.duracao, /^Permanente/, `${item.id} marcada como permanente, mas a duração diz outra coisa`);
  }
});

test('texto do catálogo segue o tom da mesa: sem travessão e sem a palavra eco', () => {
  for (const item of CONDICOES_LONGO_PRAZO) {
    const texto = [item.titulo, item.duracao, ...item.efeitos, item.remocao].join(' ');
    assert.doesNotMatch(texto, /[—–]/, `${item.id} tem travessão`);
    assert.doesNotMatch(texto, /\beco\b/i, `${item.id} usa a palavra eco`);
  }
});

test('cada filtro lista só o que pertence a ele, e a busca atravessa os filtros ignorando acento', () => {
  assert.deepEqual(
    listarCondicoes('cena', '').map((item) => item.id),
    CONDICOES_OFICIAIS.map((item) => item.id),
  );
  for (const filtro of FILTROS_CATALOGO.filter((item) => item.id !== 'cena')) {
    const lista = listarCondicoes(filtro.id, '');
    assert.ok(lista.length > 0, `filtro ${filtro.id} vazio`);
    assert.ok(lista.every((item) => item.grupo && FILTRO_DO_GRUPO[item.grupo] === filtro.id));
  }
  assert.ok(listarCondicoes('cena', 'braco').some((item) => item.id === 'braco-dominante-quebrado'));
  assert.ok(listarCondicoes('cena', 'depressao').some((item) => item.id === 'depressao'));
  assert.equal(listarCondicoes('cena', 'xyzxyz').length, 0);
});

test('aplicar uma condição de longo prazo grava nome, duração e remoção na ficha, sem duplicar', () => {
  const regra = CONDICOES_LONGO_PRAZO.find((item) => item.id === 'perna-quebrada');
  assert.ok(regra);
  const primeira = adicionarCondicaoOficial([], regra);
  assert.equal(primeira.adicionada, true);
  assert.equal((primeira.condicoes[0] as { nome: string }).nome, 'Perna Quebrada');
  assert.equal((primeira.condicoes[0] as { duracao: string }).duracao, regra.duracao);
  const segunda = adicionarCondicaoOficial(primeira.condicoes, regra);
  assert.equal(segunda.adicionada, false);
  assert.equal(segunda.condicoes.length, 1);
});
