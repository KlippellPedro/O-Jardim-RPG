import assert from 'node:assert/strict';
import test from 'node:test';
import { resumirBens, textoResumoBens } from '../../src/pages/Ficha/utils/resumoBens';
import { PROPRIEDADE_VAZIA, type IPropriedadeFicha } from '../../src/services/propriedadeService';

const casa = (dados: Partial<IPropriedadeFicha>): IPropriedadeFicha => ({ ...PROPRIEDADE_VAZIA, id: 'p', nome: 'Casa', ...dados } as IPropriedadeFicha);

test('resumo soma manutencao e espacos das propriedades', () => {
  const resumo = resumirBens([
    casa({ manutencao: 40, instalacoes: [{ id: 'a', nome: 'Oficina', nivel: 1, espacosOcupados: 2 }] }),
    casa({ manutencao: 60 }),
  ], 1);
  assert.equal(resumo.propriedades, 2);
  assert.equal(resumo.veiculos, 1);
  assert.equal(resumo.manutencaoMensal, 100);
  assert.equal(resumo.espacosUsados, 2);
});

test('texto do resumo usa singular e omite manutencao zerada', () => {
  assert.equal(textoResumoBens(resumirBens([casa({})], 1)), '1 propriedade · 1 veículo');
  assert.equal(textoResumoBens(resumirBens([], 0)), '0 propriedades · 0 veículos');
});
