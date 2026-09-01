import assert from 'node:assert/strict';
import test from 'node:test';
import {
  marcarItemAutomaticoOculto,
  restaurarVisibilidadeItemAutomatico,
  salvarPersonalizacaoAutomatica,
} from '../../src/services/personalizacaoAutomaticaService';

test('ocultar e restaurar preserva o texto personalizado do item automático', () => {
  const personalizada = { titulo: 'Nome próprio', texto: 'Descrição da ficha.' };
  const oculta = marcarItemAutomaticoOculto(personalizada);

  assert.deepEqual(oculta, { ...personalizada, oculta: true });
  assert.deepEqual(personalizada, { titulo: 'Nome próprio', texto: 'Descrição da ficha.' });
  assert.deepEqual(restaurarVisibilidadeItemAutomatico(oculta), personalizada);
});

test('restaurar um item sem personalização remove o registro vazio da ficha', () => {
  const chamadas: Array<{ caminho: string[]; valor: unknown }> = [];
  const ficha = { personalizacoesAutomaticas: { automatico: { oculta: true }, outro: { titulo: 'Mantido' } } };

  salvarPersonalizacaoAutomatica(
    (caminho, valor) => chamadas.push({ caminho, valor }),
    ficha,
    'automatico',
    restaurarVisibilidadeItemAutomatico(ficha.personalizacoesAutomaticas.automatico),
  );

  assert.deepEqual(chamadas, [{
    caminho: ['ficha', 'personalizacoesAutomaticas'],
    valor: { outro: { titulo: 'Mantido' } },
  }]);
});
