import assert from 'node:assert/strict';
import test from 'node:test';

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
import { ajusteOrigem, chaveAjuste, totalAjustesManuais } from '../../src/services/ajustesFichaService.ts';

test('os três métodos de atributos ficam disponíveis para jogadores e Mestres', () => {
  assert.equal(rolagemAtributosPermitida(false), true);
  assert.equal(rolagemAtributosPermitida(true), true);
});

test('teste de atributo com modificador zero não recebe metade do nível', () => {
  assert.equal(bonusTesteAtributo(10), 0);
  assert.equal(bonusTesteAtributo(30), 10);
  assert.equal(bonusTesteAtributo(10, -2), -2);
});

test('origens e ajustes nomeados permanecem pequenos e somam pela fonte', () => {
  const ficha = {
    origemId: 'academico',
    ajustesFicha: {
      [chaveAjuste('pericia', 'conhecimento')]: [
        { id: 'livro', nome: 'Livro raro', valor: 2 },
        { id: 'invalido', nome: '', valor: 10 },
      ],
    },
  };
  assert.equal(ajusteOrigem(ficha, 'pericia', 'conhecimento'), 1);
  assert.equal(totalAjustesManuais(ficha, chaveAjuste('pericia', 'conhecimento')), 2);
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
