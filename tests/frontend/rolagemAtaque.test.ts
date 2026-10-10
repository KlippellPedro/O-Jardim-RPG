import assert from 'node:assert/strict';
import test from 'node:test';
import {
  montarDano,
  normalizarConfigDano,
  resolverAtributoDano,
  resumirVantagens,
  tipoAtaqueDaArma,
  validarDadoExtra,
} from '../../src/pages/Ficha/utils/rolagemAtaque.ts';

test('faca de 1d4 corpo a corpo soma o modificador de Força', () => {
  const r = montarDano({ dano: '1d4', modificadorAtributo: 3 });
  assert.equal(r.formula, '1d4+3');
  assert.equal(montarDano({ dano: '1d4', modificadorAtributo: -1 }).formula, '1d4-1');
  assert.equal(montarDano({ dano: '1d4', modificadorAtributo: 0 }).formula, '1d4');
});

test('arma à distância é só o dano da arma e o bônus de itens', () => {
  assert.equal(montarDano({ dano: '1d8', modificadorAtributo: 0, bonusEquipamento: 2 }).formula, '1d8+2');
});

test('crítico multiplica só os dados da arma; fixos e dado extra entram uma vez', () => {
  const r = montarDano({ dano: '1d6+1', modificadorAtributo: 2, bonusEquipamento: 1, dadoExtra: '1d4', critico: true, multiplicadorCritico: 3 });
  assert.equal(r.formula, '3d6+1+3+1d4');
  assert.equal(r.formulaBase, '1d6+1+3+1d4');
});

test('bônus extra e dado extra negativo entram na fórmula', () => {
  assert.equal(montarDano({ dano: '2d6', bonusExtra: 2, dadoExtra: '-1d4' }).formula, '2d6+2-1d4');
  assert.equal(montarDano({ dano: '2d6', modificadorAtributo: 2, bonusExtra: -2 }).formula, '2d6');
});

test('dano vazio, dado extra inválido e fórmula longa demais viram erro', () => {
  assert.ok(montarDano({ dano: '' }).erro);
  assert.ok(montarDano({ dano: '1d6', dadoExtra: 'abc' }).erro);
  assert.ok(montarDano({ dano: '1d6', dadoExtra: '1d4+1d4+1d4+1d4+1d4+1d4+1d4+1d4' }).erro);
});

test('dado extra aceita dados e números com sinal e recusa o resto', () => {
  assert.deepEqual(validarDadoExtra(' 1D4 '), { ok: true, formula: '1d4' });
  assert.deepEqual(validarDadoExtra('+2'), { ok: true, formula: '+2' });
  assert.deepEqual(validarDadoExtra('-1d6+1'), { ok: true, formula: '-1d6+1' });
  assert.deepEqual(validarDadoExtra(''), { ok: true, formula: '' });
  for (const ruim of ['3#d4', 'd', '1d', '1d4+', 'abc', '1d4;drop']) assert.equal(validarDadoExtra(ruim).ok, false, ruim);
});

test('o modo do catálogo define como a arma ataca', () => {
  assert.deepEqual(tipoAtaqueDaArma({ modo: 'À distância' }), { tipo: 'Distância', hibrida: false });
  assert.deepEqual(tipoAtaqueDaArma({ modo: 'Corpo a corpo' }), { tipo: 'Corpo a Corpo', hibrida: false });
  assert.deepEqual(tipoAtaqueDaArma({ modo: 'Híbrida' }), { tipo: 'Corpo a Corpo', hibrida: true });
  assert.deepEqual(tipoAtaqueDaArma({}), { tipo: 'Corpo a Corpo', hibrida: false });
  assert.deepEqual(tipoAtaqueDaArma({ modo: 'À distância', tipoAtaque: 'Corpo a Corpo' }), { tipo: 'Corpo a Corpo', hibrida: false });
});

test('vantagens e desvantagens se anulam uma a uma', () => {
  assert.equal(resumirVantagens(2, 1).modo, 'vantagem');
  assert.equal(resumirVantagens(0, 1).modo, 'desvantagem');
  assert.equal(resumirVantagens(1, 1).modo, 'normal');
  assert.equal(resumirVantagens(0, 0).texto, '1d20');
});

test('o padrão soma atributo no corpo a corpo e não soma à distância', () => {
  const padrao = normalizarConfigDano(undefined);
  assert.deepEqual(resolverAtributoDano(padrao, 'Corpo a Corpo', 'forca'), { ativo: true, atributoId: 'forca' });
  assert.deepEqual(resolverAtributoDano(padrao, 'Distância', 'destreza'), { ativo: false, atributoId: 'destreza' });
  assert.deepEqual(resolverAtributoDano(padrao, 'Alcance', 'destreza'), { ativo: false, atributoId: 'destreza' });
});

test('automático segue a troca de atributo da perícia de combate', () => {
  const padrao = normalizarConfigDano({});
  // Um poder que troca o atributo de Luta de Força para Destreza leva o dano junto.
  assert.deepEqual(resolverAtributoDano(padrao, 'Corpo a Corpo', 'destreza'), { ativo: true, atributoId: 'destreza' });
});

test('a ficha pode fixar o atributo e ligar ou desligar cada tipo', () => {
  const config = normalizarConfigDano({
    corpo: { ativo: true, atributo: 'inteligencia' },
    distancia: { ativo: true, atributo: 'auto' },
  });
  assert.deepEqual(resolverAtributoDano(config, 'Corpo a Corpo', 'forca'), { ativo: true, atributoId: 'inteligencia' });
  assert.deepEqual(resolverAtributoDano(config, 'Distância', 'destreza'), { ativo: true, atributoId: 'destreza' });
  assert.equal(resolverAtributoDano(normalizarConfigDano({ corpo: { ativo: false } }), 'Corpo a Corpo', 'forca').ativo, false);
});

test('configuração inválida volta ao padrão sem quebrar', () => {
  for (const ruim of [null, 'x', 7, [], { corpo: 'x' }, { corpo: { ativo: 'sim', atributo: 'pizza' } }]) {
    assert.deepEqual(normalizarConfigDano(ruim), { corpo: { ativo: true, atributo: 'auto' }, distancia: { ativo: false, atributo: 'auto' } });
  }
});
