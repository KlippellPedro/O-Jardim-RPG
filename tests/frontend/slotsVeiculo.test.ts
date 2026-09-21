import assert from 'node:assert/strict';
import test from 'node:test';
import { montarGaragem, podeLigarMais, resumirSlots, sugestoesQueCabem, type ModuloSlot } from '../../src/pages/Ficha/utils/slotsVeiculo';

const modulo = (id: string, nome: string, espacos: number, ativo = true): ModuloSlot => ({ id, nome, espacos, ativo });

test('resumo de slots soma espacos e conta ativos', () => {
  const r = resumirSlots([modulo('a', 'Geladeira', 1), modulo('b', 'Blindagem extra', 2, false)], 4);
  assert.deepEqual(r, { usados: 3, livres: 1, maximos: 4, ativos: 1, estourou: false });
});

test('resumo marca estouro e nunca devolve vaga negativa', () => {
  const r = resumirSlots([modulo('a', 'X', 5)], 4);
  assert.equal(r.livres, 0);
  assert.equal(r.estourou, true);
});

test('sugestoes so mostram o que cabe e ainda nao esta instalado', () => {
  const lista = sugestoesQueCabem([modulo('a', 'geladeira', 1)], 1);
  assert.ok(!lista.some((s) => s.nome === 'Geladeira'));
  assert.ok(lista.every((s) => s.espacos <= 1));
  assert.deepEqual(sugestoesQueCabem([], 0), []);
});

test('limite de sistemas ativos', () => {
  assert.equal(podeLigarMais(1, 2), true);
  assert.equal(podeLigarMais(2, 2), false);
});

test('garagem liga cada peca ao seu veiculo e devolve orfas para guardadas', () => {
  const itens = [
    { id: 'v1', nome: 'Moto', categoria: 'veiculo' },
    { id: 'p1', nome: 'Baú', categoria: 'modulo-veicular', instaladoEm: 'v1', vagasModulo: 2 },
    { id: 'p2', nome: 'Radar', categoria: 'modulo-veicular', instaladoEm: 'v1', ligado: false },
    { id: 'p3', nome: 'Faroleiro', categoria: 'modulo-veicular', instaladoEm: 'vendido' },
    { id: 'p4', nome: 'Pneu', categoria: 'modulo-veicular' },
    { id: 'x', nome: 'Espada', categoria: 'arma' },
  ];
  const { veiculos, guardadas } = montarGaragem(itens);
  assert.equal(veiculos.length, 1);
  assert.deepEqual(veiculos[0].modulos.map((m) => [m.id, m.espacos, m.ativo]), [['p1', 2, true], ['p2', 1, false]]);
  assert.deepEqual(guardadas.map((g) => g.id), ['p3', 'p4']);
});

test('peca real com nome repetido continua oferecida', () => {
  const lista = sugestoesQueCabem([modulo('a', 'Baú', 1)], 2, [{ nome: 'Baú', espacos: 1, id: 'p9' }]);
  assert.equal(lista.length, 1);
});
