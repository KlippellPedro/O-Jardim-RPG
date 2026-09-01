import assert from 'node:assert/strict';
import test from 'node:test';
import { ORIGENS } from '../../data/ficha/origensData.ts';

import {
  ATRIBUTOS,
  VALORES_ATRIBUTOS_PADRAO,
  COMPRA_PONTOS_ORCAMENTO,
  bonusTesteAtributo,
  calcularDerivadosComClasses,
  calcularPontosAtributos,
  compraPontosValida,
  conjuntoAtributosValido,
  criarCompraPontosVazia,
  distribuirValoresAtributos,
  rolagemAtributosPermitida,
} from '../../src/services/calculoService.ts';
import { ajusteOrigem, chaveAjuste, nomeAjusteOrigem, totalAjustesManuais } from '../../src/services/ajustesFichaService.ts';

test('os três métodos de atributos ficam disponíveis para jogadores e Mestres', () => {
  assert.equal(rolagemAtributosPermitida(false), true);
  assert.equal(rolagemAtributosPermitida(true), true);
});

test('catálogo de origens tem vinte opções simples, ids únicos e um benefício por origem', () => {
  assert.equal(ORIGENS.length, 20);
  assert.equal(new Set(ORIGENS.map((origem) => origem.id)).size, ORIGENS.length);
  ORIGENS.forEach((origem) => {
    assert.ok(origem.titulo.trim());
    assert.ok(origem.descricao.trim());
    assert.equal(origem.ajustes.length, 1);
    origem.ajustes.forEach((ajuste) => {
      assert.ok(Number.isFinite(ajuste.valor));
      assert.notEqual(ajuste.valor, 0);
      assert.ok(ajuste.rotulo.trim());
    });
  });
});

test('teste de atributo com modificador zero não recebe metade do nível', () => {
  assert.equal(bonusTesteAtributo(10), 0);
  assert.equal(bonusTesteAtributo(30), 10);
  assert.equal(bonusTesteAtributo(10, -2), -2);
});

test('origem de atributo aplica apenas o atributo escolhido e aumenta seu modificador em um', () => {
  const ficha = {
    origemId: 'academico',
    ajustesFicha: {
      [chaveAjuste('pericia', 'conhecimento')]: [
        { id: 'livro', nome: 'Livro raro', valor: 2 },
        { id: 'invalido', nome: '', valor: 10 },
      ],
    },
  };
  assert.equal(ajusteOrigem(ficha, 'pericia', 'conhecimento'), 0);
  assert.equal(ajusteOrigem(ficha, 'pericia', 'investigacao'), 0);
  assert.equal(ajusteOrigem(ficha, 'pericia', 'percepcao'), 0);
  assert.equal(ajusteOrigem(ficha, 'atributo', 'inteligencia'), 2);
  assert.equal(
    bonusTesteAtributo(10 + ajusteOrigem(ficha, 'atributo', 'inteligencia')) - bonusTesteAtributo(10),
    1,
  );
  assert.equal(totalAjustesManuais(ficha, chaveAjuste('pericia', 'conhecimento')), 2);
});

test('origem Artesão aplica o bônus de Ofício a uma perícia personalizada pelo título, já que Ofício não tem id fixo', () => {
  const ficha = { origemId: 'artesao' };
  // Ofício foi removido do catálogo fixo (ver data/ficha/pericias.json): toda
  // perícia de Ofício nasce personalizada com id gerado por timestamp, nunca
  // literalmente "oficio" — então ajusteOrigem precisa casar pelo título.
  const idPersonalizado = 'custom_1735000000000';
  assert.equal(ajusteOrigem(ficha, 'pericia', idPersonalizado, 'Ofício'), 2);
  assert.equal(ajusteOrigem(ficha, 'pericia', idPersonalizado, 'Ofício (Ferreiro)'), 0);
  assert.equal(nomeAjusteOrigem(ficha, 'pericia', idPersonalizado, 'Ofício'), 'Origem: Artesão');
  // Uma perícia sem relação nenhuma com Ofício não deve ganhar o bônus.
  assert.equal(ajusteOrigem(ficha, 'pericia', idPersonalizado, 'Furtividade'), 0);
  // Compatibilidade: se algum dia "oficio" voltar a ser um id fixo, o match direto continua valendo.
  assert.equal(ajusteOrigem(ficha, 'pericia', 'oficio'), 2);
});

test('origens alternativas podem trocar o atributo por recursos ou movimento', () => {
  assert.equal(ajusteOrigem({ origemId: 'viajante' }, 'movimento'), 1.5);
  assert.equal(ajusteOrigem({ origemId: 'viajante' }, 'atributo', 'destreza'), 0);
  assert.equal(ajusteOrigem({ origemId: 'sobrevivente' }, 'vidaMaxima'), 2);
  assert.equal(ajusteOrigem({ origemId: 'batedor' }, 'pericia', 'percepcao'), 2);
});

test('conjunto padrão equivale exatamente à compra de 24 pontos', () => {
  const atributos = distribuirValoresAtributos(VALORES_ATRIBUTOS_PADRAO);
  assert.equal(calcularPontosAtributos(atributos), COMPRA_PONTOS_ORCAMENTO);
  assert.equal(compraPontosValida(atributos), true);
  assert.equal(conjuntoAtributosValido(atributos, VALORES_ATRIBUTOS_PADRAO), true);
});

test('compra por pontos exige gastar tudo e respeitar o intervalo 8–15', () => {
  const vazia = criarCompraPontosVazia();
  assert.equal(calcularPontosAtributos(vazia), 0);
  assert.equal(compraPontosValida(vazia), false);

  const acimaDoLimite = { ...distribuirValoresAtributos(VALORES_ATRIBUTOS_PADRAO), forca: 16 };
  assert.equal(compraPontosValida(acimaDoLimite), false);
});

test('organização preserva inclusive valores repetidos do conjunto', () => {
  const reorganizados = distribuirValoresAtributos([8, 15, 8, 14, 13, 12, 10]);
  assert.equal(conjuntoAtributosValido(reorganizados, VALORES_ATRIBUTOS_PADRAO), true);

  const duplicadoIlegal = { ...reorganizados, [ATRIBUTOS[0]]: 15 };
  assert.equal(conjuntoAtributosValido(duplicadoIlegal, VALORES_ATRIBUTOS_PADRAO), false);
});

test('Vida e Mana acumulam os ganhos de cada nível e de cada classe', () => {
  const atributos = Object.fromEntries(ATRIBUTOS.map(atributo => [atributo, 10]));
  const classes = [
    { id: 'guerreiro', titulo: 'Guerreiro', vida: 5, mana: 2 },
    { id: 'mago', titulo: 'Mago', vida: 3, mana: 4 },
  ];
  const derivados = calcularDerivadosComClasses(
    atributos,
    null,
    [{ classeId: 'guerreiro', nivel: 3 }, { classeId: 'mago', nivel: 1 }],
    classes,
  );

  assert.equal(derivados.vida, 18);
  assert.equal(derivados.mana, 10);
  assert.equal(derivados.recursosDefinidos, true);
  assert.equal(derivados.defesaNatural, 12);
});

test('Vida e Mana do nível 1 incluem modificador e recurso da classe', () => {
  const atributos = {
    ...Object.fromEntries(ATRIBUTOS.map(atributo => [atributo, 10])),
    constituicao: 14,
    sabedoria: 12,
  };
  const classes = [
    { id: 'guardiao', titulo: 'Guardião', vida: 5, mana: 2 },
  ];
  const derivados = calcularDerivadosComClasses(
    atributos,
    null,
    [{ classeId: 'guardiao', nivel: 1 }],
    classes,
  );

  assert.equal(derivados.vida, 13);
  assert.equal(derivados.mana, 5);
});
