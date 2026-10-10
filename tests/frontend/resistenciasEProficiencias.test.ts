import assert from 'node:assert/strict';
import test from 'node:test';
import {
  GRUPOS_PROFICIENCIA,
  GRUPOS_RESISTENCIA,
  normalizarProficiencia,
  normalizarResistencias,
  rotuloProficiencia,
  temProficienciaEquipamento,
} from '../../src/pages/Ficha/utils/catalogoResistProf.ts';
import { resumirEquipamentos } from '../../src/services/equipamentoService.ts';

test('ids do catálogo de resistências e proficiências não se repetem', () => {
  for (const grupos of [GRUPOS_RESISTENCIA, GRUPOS_PROFICIENCIA]) {
    const ids = grupos.flatMap((grupo) => grupo.itens.map((opcao) => opcao.id));
    assert.equal(new Set(ids).size, ids.length);
  }
});

test('o catálogo de resistências cobre os sete elementos, as aflições e as condições do jogo', () => {
  const nomes = GRUPOS_RESISTENCIA.flatMap((grupo) => grupo.itens.map((opcao) => opcao.nome));
  for (const elemento of ['Terra', 'Água', 'Fogo', 'Ar', 'Raio', 'Luz', 'Escuridão', 'Corte', 'Balístico', 'Doenças comuns']) {
    assert.ok(nomes.includes(elemento), elemento);
  }
  assert.ok(!nomes.includes('Inspirado'), 'condição benéfica não é resistência');
});

test('textos antigos de proficiência apontam para o catálogo e continuam valendo no ataque', () => {
  assert.equal(normalizarProficiencia('armas marciais'), 'armas_marcial');
  assert.equal(normalizarProficiencia('Marcial'), 'armas_marcial');
  assert.equal(normalizarProficiencia('espadas curtas'), 'espadas curtas');
  assert.deepEqual(rotuloProficiencia('armas_marcial'), { rotulo: 'Armas marciais', personalizada: false });
  assert.equal(rotuloProficiencia('espadas curtas').personalizada, true);
  assert.equal(temProficienciaEquipamento(['armas marciais'], 'armas', 'marcial'), true);
  assert.equal(temProficienciaEquipamento(['armaduras_marcial'], 'armas', 'marcial'), false);
  assert.equal(temProficienciaEquipamento(undefined, 'armas', 'marcial'), false);
});

test('resistências salvas são saneadas e o nome oficial vence o salvo', () => {
  const lista = normalizarResistencias([
    { id: 'elemento-fogo', nome: 'qualquer', modo: 'resistencia', valor: '5', nota: 'Anel' },
    { id: '', nome: ' Frio do Norte ', modo: 'invalido', valor: 'abc' },
    { nome: '' },
    'lixo',
  ]);
  assert.equal(lista.length, 2);
  assert.deepEqual(lista[0], { id: 'elemento-fogo', nome: 'Fogo', modo: 'resistencia', valor: 5, nota: 'Anel' });
  assert.deepEqual(lista[1], { id: '', nome: 'Frio do Norte', modo: 'resistencia', valor: null, nota: '' });
  assert.deepEqual(normalizarResistencias(undefined), []);
});

const peca = (titulo: string, categoriaProtecao: 'armadura' | 'escudo', subtipo: string, bonus: string, penalidade: string) => ({
  item_id: titulo,
  titulo,
  quantidade: 1,
  dados: { categoria: 'armadura', categoria_protecao: categoriaProtecao, subtipo, bonus, penalidade, equipado: true, espacos: 1 },
});

test('armadura e escudo marciais sem proficiência perdem 2 de Defesa e dobram a penalidade', () => {
  const inventario = [peca('Placas Pesadas', 'armadura', 'marcial', '+5', '-2'), peca('Escudo de Torre', 'escudo', 'marcial', '+2', '-1')];
  const sem = resumirEquipamentos(inventario, { proficiencias: [] });
  assert.equal(sem.defesaEquipamento, 7 - 4);
  assert.equal(sem.penalidadeArmadura, (2 + 1) * 2);
  assert.deepEqual(sem.semProficienciaArmadura, ['Placas Pesadas', 'Escudo de Torre']);
  assert.ok(sem.conflitos.some((aviso) => aviso.includes('Placas Pesadas')));

  const so = resumirEquipamentos(inventario, { proficiencias: ['armaduras_marcial'] });
  assert.equal(so.defesaEquipamento, 7 - 2);
  assert.equal(so.penalidadeArmadura, 2 + 1 * 2);
  assert.deepEqual(so.semProficienciaArmadura, ['Escudo de Torre']);

  const com = resumirEquipamentos(inventario, { proficiencias: ['armaduras_marcial', 'escudos_marcial'] });
  assert.equal(com.defesaEquipamento, 7);
  assert.equal(com.penalidadeArmadura, 3);
  assert.deepEqual(com.semProficienciaArmadura, []);
});

test('armadura e escudo simples qualquer um usa, sem custo', () => {
  const r = resumirEquipamentos([peca('Gibão', 'armadura', 'simples', '+2', '-1'), peca('Broquel', 'escudo', 'simples', '+1', '0')], { proficiencias: [] });
  assert.equal(r.defesaEquipamento, 3);
  assert.equal(r.penalidadeArmadura, 1);
  assert.deepEqual(r.semProficienciaArmadura, []);
});
