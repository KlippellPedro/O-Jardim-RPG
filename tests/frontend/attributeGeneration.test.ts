import assert from 'node:assert/strict';
import test from 'node:test';

import {
  ATRIBUTOS,
  VALORES_ATRIBUTOS_PADRAO,
  COMPRA_PONTOS_ORCAMENTO,
  calcularPontosAtributos,
  compraPontosValida,
  conjuntoAtributosValido,
  criarCompraPontosVazia,
  distribuirValoresAtributos,
} from '../../src/services/calculoService.ts';

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
