import assert from 'node:assert/strict';
import test from 'node:test';
import { ESTILOS_DE_EFEITO, ESTILO_DO_FLUXO, estiloDoFluxo, ruidoFixo } from '../../src/pages/Mapa/motor/estiloDeMagia.ts';
import { FLUXOS_DO_MAPA } from '../../src/pages/Mapa/motor/molduras.ts';

test('todo Fluxo do mapa tem um estilo de movimento, e cada estilo é de um Fluxo só', () => {
  for (const { id } of FLUXOS_DO_MAPA) assert.ok(ESTILO_DO_FLUXO[id], `o Fluxo ${id} ficou sem estilo`);
  assert.equal(Object.keys(ESTILO_DO_FLUXO).length, FLUXOS_DO_MAPA.length);
  assert.equal(ESTILOS_DE_EFEITO.length, FLUXOS_DO_MAPA.length, 'dois Fluxos com o mesmo movimento não se distinguem na mesa');
});

test('um Fluxo desconhecido não ganha estilo (só a cor padrão)', () => {
  assert.equal(estiloDoFluxo('vitalidade'), 'brotos');
  assert.equal(estiloDoFluxo('vazio'), 'implosao');
  assert.equal(estiloDoFluxo('inventado'), null);
});

test('o ruído é repetível e fica entre 0 e 1: o efeito se move igual em todas as telas', () => {
  for (let i = 0; i < 50; i++) {
    const valor = ruidoFixo(i, 3);
    assert.ok(valor >= 0 && valor < 1);
    assert.equal(valor, ruidoFixo(i, 3));
  }
  assert.notEqual(ruidoFixo(1, 1), ruidoFixo(2, 1));
});
