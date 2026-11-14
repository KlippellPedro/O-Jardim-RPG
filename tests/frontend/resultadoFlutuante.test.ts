import assert from 'node:assert/strict';
import test from 'node:test';
import { COR_DO_RESULTADO, resultadoFlutuante } from '../../src/pages/Mapa/motor/resultadoFlutuante.ts';

test('o número sobe com o selo certo: crítico no 20 natural, falha no 1, dano e cura com o próprio tom', () => {
  assert.deepEqual(resultadoFlutuante('rolagem', { total: 27, critico_natural: true }), { texto: '27', selo: 'CRÍTICO!', tom: 'critico' });
  assert.deepEqual(resultadoFlutuante('rolagem', { total: 4, falha_natural: true }), { texto: '4', selo: 'FALHA!', tom: 'falha' });
  assert.deepEqual(resultadoFlutuante('rolagem', { total: 15 }), { texto: '15', selo: null, tom: 'normal' });
  assert.deepEqual(resultadoFlutuante('dano', { total: 11 }), { texto: '11', selo: 'dano', tom: 'dano' });
  assert.deepEqual(resultadoFlutuante('', { total: 9, termos: [{ tipo: 'dado', faces: 6, valores: [4, 5] }] }), { texto: '9', selo: 'dano', tom: 'dano' }, 'o dado da mesa não diz o tipo: os termos entregam que é dano');
  assert.deepEqual(resultadoFlutuante('cura', { total: 6 }), { texto: '+6', selo: 'cura', tom: 'cura' });
});

test('dado quebrado não vira número: nada sobe sobre o token', () => {
  assert.equal(resultadoFlutuante('rolagem', null), null);
  assert.equal(resultadoFlutuante('rolagem', {}), null);
  assert.equal(resultadoFlutuante('rolagem', { total: 'x' }), null);
});

test('o resultado nunca diz se passou da Defesa ou da DT: só o número e o selo do d20 natural', () => {
  const resultado = resultadoFlutuante('rolagem', { total: 19, dt: 15, grau: 'sucesso' } as never)!;
  assert.deepEqual(Object.keys(resultado).sort(), ['selo', 'texto', 'tom']);
  assert.equal(resultado.selo, null);
  for (const cor of Object.values(COR_DO_RESULTADO)) assert.match(cor, /^#[0-9a-f]{6}$/i);
});
