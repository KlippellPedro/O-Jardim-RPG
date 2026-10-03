import assert from 'node:assert/strict';
import test from 'node:test';
import { CONDICOES_OFICIAIS, CRISES_SANIDADE } from '../../data/regras/condicoes';
import { CONDICOES_LONGO_PRAZO } from '../../data/regras/condicoes-longo-prazo';
import { REGRAS_OFICIAIS } from '../../data/regras/regras';

const NOVAS_NEGATIVAS = ['queimando', 'envenenado', 'lento', 'enfraquecido', 'paralisado', 'silenciado', 'desorientado'];
const NOVAS_POSITIVAS = ['inspirado', 'favorecido', 'resguardado', 'focado', 'apressado', 'revigorado'];

test('ids das condições de cena são únicos e não repetem os do longo prazo nem os das crises', () => {
  const ids = [
    ...CONDICOES_OFICIAIS.map((item) => item.id),
    ...CONDICOES_LONGO_PRAZO.map((item) => item.id),
    ...CRISES_SANIDADE.map((item) => item.id),
  ];
  assert.equal(new Set(ids).size, ids.length);
});

test('as condições novas de cena existem, e só as benéficas levam a marca positiva', () => {
  const porId = new Map(CONDICOES_OFICIAIS.map((item) => [item.id, item]));
  for (const id of NOVAS_NEGATIVAS) {
    assert.ok(porId.has(id), `faltou ${id}`);
    assert.notEqual(porId.get(id)?.positiva, true, `${id} não é benéfica`);
  }
  for (const id of NOVAS_POSITIVAS) {
    assert.equal(porId.get(id)?.positiva, true, `${id} precisa da marca positiva`);
  }
  assert.equal(CONDICOES_OFICIAIS.filter((item) => item.positiva).length, NOVAS_POSITIVAS.length);
});

test('toda condição de cena tem duração, efeito e remoção, e as benéficas não acumulam', () => {
  for (const item of CONDICOES_OFICIAIS) {
    assert.ok(item.duracao.trim() && item.remocao.trim(), `${item.id} sem duração ou remoção`);
    assert.ok(item.efeitos.length > 0 && item.efeitos.every((efeito) => efeito.trim()), `${item.id} sem efeitos`);
  }
  for (const item of CONDICOES_OFICIAIS.filter((condicao) => condicao.positiva)) {
    const texto = item.efeitos.join(' ');
    if (item.id === 'focado') continue;
    assert.match(texto, /Não acumula consigo mesm[oa]|A condição termina/, `${item.id} precisa dizer que não acumula`);
  }
});

test('texto das condições de cena segue o tom da mesa: sem travessão e sem a palavra eco', () => {
  for (const item of CONDICOES_OFICIAIS) {
    const texto = [item.titulo, item.duracao, ...item.efeitos, item.remocao].join(' ');
    assert.doesNotMatch(texto, /[—–]/, `${item.id} tem travessão`);
    assert.doesNotMatch(texto, /eco/i, `${item.id} usa a palavra eco`);
  }
});

test('o livro lista as benéficas numa tabela própria e as outras na tabela geral', () => {
  const corpo = REGRAS_OFICIAIS.condicoes.corpo;
  const [geral, beneficas] = corpo.split('Condições benéficas');
  assert.ok(beneficas, 'faltou o título Condições benéficas');
  for (const id of NOVAS_POSITIVAS) {
    const titulo = CONDICOES_OFICIAIS.find((item) => item.id === id)!.titulo;
    assert.ok(beneficas.includes(`<strong>${titulo}</strong>`), `${titulo} fora da tabela benéfica`);
    assert.ok(!geral.includes(`<strong>${titulo}</strong>`), `${titulo} repetida na tabela geral`);
  }
  assert.ok(geral.includes('<strong>Queimando</strong>'));
});
