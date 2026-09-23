import assert from 'node:assert/strict';
import test from 'node:test';
import { CLASSES_CATALOGO } from '../../src/services/catalogoService';
import { custoAtivacaoHabilidadeNoNivel, habilidadesAutomaticas } from '../../src/services/progressaoFichaService';

const habilidade = (classeId: string, habilidadeId: string) => {
  const classe = CLASSES_CATALOGO.find((item) => item.id === classeId);
  const encontrada = classe?.habilidades?.find((item) => item.id === habilidadeId);
  assert.ok(encontrada, `${classeId}/${habilidadeId} não existe`);
  return encontrada;
};

test('o custo de Provocar sobe com os estágios: 4, 5, 6 e 7 de Estamina', () => {
  const provocar = habilidade('guardiao', 'provocar');
  assert.deepEqual(custoAtivacaoHabilidadeNoNivel(provocar, 1), { custoMana: 0, custoEstamina: 0 });
  assert.equal(custoAtivacaoHabilidadeNoNivel(provocar, 3).custoEstamina, 4);
  assert.equal(custoAtivacaoHabilidadeNoNivel(provocar, 8).custoEstamina, 5);
  assert.equal(custoAtivacaoHabilidadeNoNivel(provocar, 14).custoEstamina, 6);
  assert.equal(custoAtivacaoHabilidadeNoNivel(provocar, 20).custoEstamina, 7);
});

test('Implacável só cobra 8 de Estamina quando o estágio 20 chega', () => {
  const implacavel = habilidade('guerreiro', 'implacavel');
  assert.deepEqual(custoAtivacaoHabilidadeNoNivel(implacavel, 15), { custoMana: 0, custoEstamina: 0 });
  assert.deepEqual(custoAtivacaoHabilidadeNoNivel(implacavel, 20), { custoMana: 0, custoEstamina: 8 });
});

test('habilidade final sem estágios lê o custo da própria habilidade', () => {
  assert.deepEqual(custoAtivacaoHabilidadeNoNivel(habilidade('medico', 'milagre'), 18), { custoMana: 12, custoEstamina: 0 });
  assert.deepEqual(custoAtivacaoHabilidadeNoNivel(habilidade('alquimista', 'transmutacao-mestra'), 18), { custoMana: 8, custoEstamina: 0 });
  assert.deepEqual(custoAtivacaoHabilidadeNoNivel(habilidade('engenheiro', 'arquitetura-tech'), 18), { custoMana: 0, custoEstamina: 8 });
});

test('nenhuma habilidade de classe cobra Mana e Estamina ao mesmo tempo', () => {
  for (const classe of CLASSES_CATALOGO) {
    for (const habilidadeClasse of classe.habilidades || []) {
      for (const fonte of [habilidadeClasse, ...(habilidadeClasse.estagios || [])]) {
        assert.ok(!((fonte.custo_mana || 0) > 0 && (fonte.custo_estamina || 0) > 0), `${classe.id}/${habilidadeClasse.id}: dois recursos`);
      }
    }
  }
});

test('a ficha de Guardião nível 8 mostra Provocar com 5 de Estamina', () => {
  const ficha = { classes: [{ classeId: 'guardiao', nivel: 8 }] };
  const provocar = habilidadesAutomaticas(ficha).find((item) => item.id === 'classe:guardiao:provocar');
  assert.equal(provocar?.custoEstamina, 5);
  assert.equal(provocar?.custoMana, 0);
});
