import assert from 'node:assert/strict';
import test from 'node:test';

import {
  CATALOGO_AFLICOES,
  REGRA_AFLICOES,
  TIPOS_AFLICAO,
  VIAS_EXPOSICAO,
} from '../../data/regras/aflicoes.ts';

test('catálogo possui ids únicos e tipos válidos', () => {
  const ids = CATALOGO_AFLICOES.map(aflicao => aflicao.id);
  assert.equal(new Set(ids).size, ids.length);
  assert.ok(CATALOGO_AFLICOES.length >= 5);

  for (const aflicao of CATALOGO_AFLICOES) {
    assert.match(aflicao.id, /^[a-z0-9]+(?:-[a-z0-9]+)*$/);
    assert.ok(TIPOS_AFLICAO.includes(aflicao.tipo));
    assert.ok(aflicao.exposicao.vias.length > 0);
    assert.ok(aflicao.exposicao.vias.every(via => VIAS_EXPOSICAO.includes(via)));
  }
});

test('cada aflição começa no estágio zero e avança sem lacunas', () => {
  for (const aflicao of CATALOGO_AFLICOES) {
    const numeros = aflicao.estagios.map(estagio => estagio.numero);
    assert.deepEqual(numeros, numeros.map((_, indice) => indice), aflicao.id);
    assert.deepEqual(aflicao.estagios[0].efeitos, [], aflicao.id);
    assert.ok(aflicao.estagios.length >= 3, aflicao.id);
  }
});

test('DTs e períodos permanecem dentro dos limites publicados', () => {
  for (const aflicao of CATALOGO_AFLICOES) {
    assert.ok(aflicao.dtFortitude >= 10 && aflicao.dtFortitude <= 30, aflicao.id);
    assert.equal(aflicao.tratamento.dt, aflicao.dtFortitude, aflicao.id);
    assert.ok(aflicao.incubacao.quantidade >= 0, aflicao.id);
    assert.ok(aflicao.intervalo.quantidade > 0, aflicao.id);
    assert.deepEqual(aflicao.progressao, {
      teste: 'Fortitude',
      sucessoCritico: -1,
      sucesso: 0,
      falha: 1,
      falhaCritica: 2,
    });
  }
});

test('drenagem de atributo é temporária, limitada e não aparece em vícios', () => {
  for (const aflicao of CATALOGO_AFLICOES) {
    for (const estagio of aflicao.estagios) {
      if (!estagio.drenagemAtributo) continue;
      assert.notEqual(aflicao.tipo, 'vicio');
      assert.equal(estagio.drenagemAtributo.temporaria, true);
      assert.ok(estagio.drenagemAtributo.valor >= 1);
      assert.ok(estagio.drenagemAtributo.valor <= 3);
      assert.match(estagio.drenagemAtributo.recuperacao, /estágio 0/i);
    }
  }
});

test('tratamento usa Cura e preserva a função dos antídotos', () => {
  const venenos = CATALOGO_AFLICOES.filter(aflicao => aflicao.tipo === 'veneno');
  assert.ok(venenos.length >= 2);
  assert.ok(venenos.every(aflicao => aflicao.tratamento.antidoto === 'encerra'));

  for (const aflicao of CATALOGO_AFLICOES) {
    assert.equal(aflicao.tratamento.pericia, 'Cura');
    assert.match(aflicao.tratamento.efeitoSucesso, /Reduza o estágio em 1/i);
    assert.ok(aflicao.tratamento.limite.length > 0);
  }
});

test('vícios definem dependência e abstinência sem retirar agência', () => {
  const vicios = CATALOGO_AFLICOES.filter(aflicao => aflicao.tipo === 'vicio');
  assert.ok(vicios.length > 0);

  for (const vicio of vicios) {
    assert.ok(vicio.dependencia);
    assert.ok(vicio.dependencia.inicioAbstinencia.quantidade > 0);
    assert.match(vicio.dependencia.restricaoAgencia, /não obriga/i);
    assert.doesNotMatch(vicio.dependencia.restricaoAgencia, /deve usar|deve comprar|perde o controle/i);
  }
  assert.match(REGRA_AFLICOES.corpo, /O jogador continua decidindo as ações/i);
});

test('regra referencia Cansaço e imunidades raciais sem ampliá-las', () => {
  assert.match(REGRA_AFLICOES.corpo, /Cansaço/i);
  assert.match(REGRA_AFLICOES.corpo, /Golem não contrai doenças comuns/i);
  assert.match(REGRA_AFLICOES.corpo, /Auleth é imune a doenças comuns e sobrenaturais/i);
  assert.match(REGRA_AFLICOES.corpo, /Autômato é imune a doenças e venenos/i);
  assert.match(REGRA_AFLICOES.corpo, /Máquina Viva/i);
});
