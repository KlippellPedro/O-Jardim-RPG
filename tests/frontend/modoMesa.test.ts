import assert from 'node:assert/strict';
import test from 'node:test';
import {
  PASSOS_RECURSO,
  descreverConta,
  limitarBonus,
  lerResultadoRolagem,
  percentual,
  rotuloDoGrau,
  tomDaBarra,
  tomDoResultado,
} from '../../src/pages/Ficha/utils/modoMesa';

test('passos de recurso sao dois de dano e dois de cura', () => {
  assert.deepEqual([...PASSOS_RECURSO], [-5, -1, 1, 5]);
});

test('bonus fica entre -30 e 30 e ignora lixo', () => {
  assert.equal(limitarBonus(99), 30);
  assert.equal(limitarBonus(-99), -30);
  assert.equal(limitarBonus('abc'), 0);
  assert.equal(limitarBonus(2.9), 2);
});

test('percentual trata vida negativa, maximo zero e valores estranhos', () => {
  assert.equal(percentual(40, 80), 50);
  assert.equal(percentual(-10, 80), 0);
  assert.equal(percentual(200, 80), 100);
  assert.equal(percentual(5, 0), 0);
  assert.equal(percentual(Number.NaN, 10), 0);
});

test('tom da barra: vermelho abaixo de 25%, amarelo abaixo de 50%, e cansaco ao contrario', () => {
  assert.equal(tomDaBarra(80), 'ok');
  assert.equal(tomDaBarra(40), 'alerta');
  assert.equal(tomDaBarra(10), 'critico');
  assert.equal(tomDaBarra(90, true), 'critico');
  assert.equal(tomDaBarra(10, true), 'ok');
});

test('le o registro do servidor e monta a conta na tela', () => {
  const resultado = lerResultadoRolagem({
    resultado: 19,
    detalhes: { natural: 14, bonus: 5, total: 19, modo: 'vantagem', dt: 15, grau: 'sucesso' },
  })!;
  assert.equal(resultado.natural, 14);
  assert.equal(resultado.total, 19);
  assert.equal(descreverConta(resultado), '14 (vantagem) + 5 = 19');
  assert.equal(tomDoResultado(resultado), 'sucesso');
  assert.equal(rotuloDoGrau(resultado), 'SUCESSO');
});

test('bonus negativo aparece com sinal de menos e sem vantagem some o rotulo', () => {
  const resultado = lerResultadoRolagem({ resultado: 7, detalhes: { natural: 9, bonus: -2, total: 7 } })!;
  assert.equal(descreverConta(resultado), '9 − 2 = 7');
  assert.equal(tomDoResultado(resultado), 'neutro');
  assert.equal(rotuloDoGrau(resultado), null);
});

test('20 e 1 naturais viram critico e falha, mesmo sem a marcacao do servidor', () => {
  const critico = lerResultadoRolagem({ resultado: 25, detalhes: { natural: 20, total: 25 } })!;
  assert.equal(tomDoResultado(critico), 'critico');
  assert.equal(rotuloDoGrau(critico), 'CRÍTICO');
  const falha = lerResultadoRolagem({ resultado: 3, detalhes: { natural: 1, falha_natural: true, total: 3 } })!;
  assert.equal(tomDoResultado(falha), 'falha');
  assert.equal(rotuloDoGrau(falha), 'FALHA CRÍTICA');
});

test('grau abaixo do sucesso vira derrota', () => {
  const resultado = lerResultadoRolagem({ resultado: 8, detalhes: { natural: 8, total: 8, dt: 12, grau: 'falha' } })!;
  assert.equal(tomDoResultado(resultado), 'derrota');
});

test('registro vazio ou sem numeros nao vira resultado', () => {
  assert.equal(lerResultadoRolagem(null), null);
  assert.equal(lerResultadoRolagem({ resultado: null, detalhes: {} }), null);
  assert.equal(lerResultadoRolagem({ resultado: 12, detalhes: undefined })?.total, 12);
});
