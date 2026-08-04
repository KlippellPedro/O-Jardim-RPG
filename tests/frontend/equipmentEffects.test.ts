import assert from 'node:assert/strict';
import test from 'node:test';

import { resumirEquipamentos } from '../../src/services/equipamentoService.ts';

const efeito = (id: string, categoria: string, alvo: string, valor: number, modo = 'bonus') => ({
  id,
  categoria,
  alvo,
  valor,
  modo,
});

test('efeitos de modificações e raridade só funcionam com o item equipado', () => {
  const item = (equipado: boolean) => ({
    item_id: 'item-1',
    titulo: 'Armadura da Aurora',
    quantidade: 1,
    dados: {
      categoria: 'armadura',
      equipado,
      raridade: 'raro',
      defesa: 2,
      espacos: 1,
      modificacoes: [{
        id: 'mod-1',
        nome: 'Núcleo vital',
        efeito: 'Fortalece o portador.',
        tipo: 'especial',
        efeitos: [efeito('e-1', 'recurso', 'vidaMaxima', 2)],
      }, {
        id: 'mod-2', nome: 'Placas reforçadas', efeito: '', tipo: 'comum',
        efeitos: [efeito('e-2', 'pericia', 'fortitude', 2)],
      }, {
        id: 'mod-3', nome: 'Estabilizador', efeito: '', tipo: 'comum',
        efeitos: [efeito('e-3', 'pericia', 'fortitude', 1, 'vantagem')],
      }],
      efeitosRaridade: [
        efeito('e-4', 'atributo', 'constituicao', 2),
      ],
    },
  });

  const ativo = resumirEquipamentos([item(true)], { atributosFinais: { forca: 10 }, nivel: 1 });
  assert.equal(ativo.defesaEquipamento, 2);
  assert.equal(ativo.bonusRecursos.vidaMaxima, 2);
  assert.equal(ativo.bonusAtributos.constituicao, 2);
  assert.equal(ativo.bonusCombate.defesa, undefined);
  assert.equal(ativo.bonusPericias.fortitude, 2);
  assert.equal(ativo.vantagensPericias.fortitude, 1);
  assert.equal(ativo.efeitosAtivos.length, 4);

  const inativo = resumirEquipamentos([item(false)], { atributosFinais: { forca: 10 }, nivel: 1 });
  assert.deepEqual(inativo.bonusRecursos, {});
  assert.deepEqual(inativo.bonusAtributos, {});
  assert.equal(inativo.efeitosAtivos.length, 0);
});

test('raridade limita mods, quantidade de efeitos e valor aplicado', () => {
  const resumo = resumirEquipamentos([{
    item_id: 'item-limite',
    titulo: 'Peça instável',
    dados: {
      categoria: 'geral',
      equipado: true,
      raridade: 'incomum',
      modificacoes: [{
        id: 'mod-1', nome: 'Excesso', tipo: 'especial', efeitos: [
          efeito('e-1', 'recurso', 'vidaMaxima', 20),
          efeito('e-2', 'recurso', 'manaMaxima', 20),
        ],
      }, {
        id: 'mod-2', nome: 'Segundo', tipo: 'comum', efeitos: [efeito('e-3', 'combate', 'defesa', 8)],
      }, {
        id: 'mod-3', nome: 'Terceiro', tipo: 'comum', efeitos: [efeito('e-4', 'combate', 'ataque', 8)],
      }],
      efeitosRaridade: [
        efeito('e-5', 'atributo', 'forca', 9),
        efeito('e-6', 'atributo', 'destreza', 9),
      ],
    },
  }], { atributosFinais: { forca: 10 }, nivel: 1 });

  assert.equal(resumo.bonusRecursos.vidaMaxima, 1);
  assert.equal(resumo.bonusRecursos.manaMaxima, undefined);
  assert.equal(resumo.bonusCombate.defesa, 1);
  assert.equal(resumo.bonusCombate.ataque, undefined);
  assert.equal(resumo.bonusAtributos.forca, 1);
  assert.equal(resumo.bonusAtributos.destreza, undefined);
  assert.equal(resumo.efeitosAtivos.length, 3);
  assert.match(resumo.conflitos[0], /excede os limites de Incomum/);
});

test('efeitos inválidos não contaminam os totais da ficha', () => {
  const resumo = resumirEquipamentos([{
    item_id: 'item-invalido',
    titulo: 'Item inválido',
    quantidade: 1,
    dados: {
      equipado: true,
      modificacoes: [{ id: 'mod', efeitos: [
        efeito('zero', 'recurso', 'vidaMaxima', 0),
        efeito('nan', 'recurso', 'manaMaxima', Number.NaN),
        efeito('desconhecido', 'outra', 'vidaMaxima', 10),
      ] }],
    },
  }], { atributosFinais: { forca: 10 }, nivel: 1 });

  assert.deepEqual(resumo.bonusRecursos, {});
  assert.equal(resumo.efeitosAtivos.length, 0);
});
