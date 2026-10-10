import assert from 'node:assert/strict';
import test from 'node:test';
import {
  aplicarEfeitoNaVida,
  efeitoDoTurnoDaCondicao,
  resolverDanoDoTurno,
} from '../../src/services/efeitosDoTurnoService.ts';
import { aflicaoPorId, drenagensAtivas, sanidadeAoEntrar } from '../../src/services/aflicoesFichaService.ts';
import { resumirEquipamentos } from '../../src/services/equipamentoService.ts';

test('as quatro condições de turno são achadas por id ou por nome', () => {
  assert.equal(efeitoDoTurnoDaCondicao({ id: 'sangramento' })?.formula, '1d6');
  assert.equal(efeitoDoTurnoDaCondicao({ nome: 'Queimando' })?.resistenciaId, 'elemento-fogo');
  assert.equal(efeitoDoTurnoDaCondicao({ id: 'x', nome: 'Envenenado' })?.tipo, 'dano');
  assert.deepEqual(efeitoDoTurnoDaCondicao({ id: 'revigorado' }), { formula: '1d4', tipo: 'cura', rotulo: 'Revigorado' });
  assert.equal(efeitoDoTurnoDaCondicao({ id: 'caido' }), null);
  assert.equal(efeitoDoTurnoDaCondicao(null), null);
  assert.equal(efeitoDoTurnoDaCondicao('sangramento'), null);
});

test('a Resistência do tipo certo tira do dano, até zero', () => {
  const resistencias = [
    { id: 'elemento-fogo', nome: 'Fogo', modo: 'resistencia', valor: 3, nota: '' },
    { id: 'elemento-fogo', nome: 'Fogo', modo: 'resistencia', valor: 1, nota: 'anel' },
    { id: 'corte', nome: 'Corte', modo: 'resistencia', valor: 5, nota: '' },
  ];
  assert.deepEqual(resolverDanoDoTurno(6, resistencias, 'elemento-fogo'), { final: 2, reduzido: 4, imune: false, dobrado: false });
  assert.deepEqual(resolverDanoDoTurno(2, resistencias, 'elemento-fogo'), { final: 0, reduzido: 2, imune: false, dobrado: false });
  assert.deepEqual(resolverDanoDoTurno(5, resistencias, 'sangramento'), { final: 5, reduzido: 0, imune: false, dobrado: false });
  assert.deepEqual(resolverDanoDoTurno(5, undefined, 'sangramento'), { final: 5, reduzido: 0, imune: false, dobrado: false });
});

test('Imunidade zera o dano e Vulnerabilidade dobra antes da Resistência', () => {
  assert.deepEqual(
    resolverDanoDoTurno(4, [{ id: 'veneno-dano', nome: 'Veneno', modo: 'imunidade', valor: null, nota: '' }], 'veneno-dano'),
    { final: 0, reduzido: 4, imune: true, dobrado: false },
  );
  assert.deepEqual(
    resolverDanoDoTurno(4, [{ id: 'veneno-dano', nome: 'Veneno', modo: 'vulnerabilidade', valor: 2, nota: '' }], 'veneno-dano'),
    { final: 8, reduzido: 0, imune: false, dobrado: true },
  );
  // Ordem do livro: dobra primeiro, depois subtrai a Resistência.
  assert.deepEqual(
    resolverDanoDoTurno(3, [
      { id: 'elemento-fogo', nome: 'Fogo', modo: 'vulnerabilidade', valor: null, nota: '' },
      { id: 'elemento-fogo', nome: 'Fogo', modo: 'resistencia', valor: 2, nota: '' },
    ], 'elemento-fogo'),
    { final: 4, reduzido: 2, imune: false, dobrado: true },
  );
  // Imunidade ganha da vulnerabilidade.
  assert.equal(resolverDanoDoTurno(3, [
    { id: 'elemento-fogo', nome: 'Fogo', modo: 'vulnerabilidade', valor: null, nota: '' },
    { id: 'elemento-fogo', nome: 'Fogo', modo: 'imunidade', valor: null, nota: '' },
  ], 'elemento-fogo').final, 0);
});

test('o dano do turno tira Vida e pode levar a Morrendo; a cura não passa do máximo', () => {
  assert.equal(aplicarEfeitoNaVida({ vidaAtual: 10 }, 'dano', 4, 20, 10).vidaAtual, 6);
  const caindo = aplicarEfeitoNaVida({ vidaAtual: 2 }, 'dano', 5, 20, 10);
  assert.equal(caindo.vidaAtual, -3);
  assert.ok(Number(caindo.morrendo) >= 1);
  assert.equal(aplicarEfeitoNaVida({ vidaAtual: 19 }, 'cura', 4, 20, 10).vidaAtual, 20);
  const semMudar = { vidaAtual: 7 };
  assert.equal(aplicarEfeitoNaVida(semMudar, 'dano', 0, 20, 10), semMudar);
});

test('Vida temporária absorve o dano do turno primeiro', () => {
  const r = aplicarEfeitoNaVida({ vidaAtual: 10, vidaTemporaria: 3 }, 'dano', 5, 20, 10);
  assert.equal(r.vidaTemporaria, 0);
  assert.equal(r.vidaAtual, 8);
});

test('drenagem de atributo vale o estágio atual, sem acumular, só depois da incubação', () => {
  const ativa = (aflicaoId: string, estagio: number, incubando = false) => ({ id: `${aflicaoId}-${estagio}`, aflicaoId, estagio, desde: '2026-10-10', incubando });
  assert.deepEqual(drenagensAtivas([ativa('definhamento-arcano', 3)]), [
    { aflicaoId: 'definhamento-arcano', titulo: 'Definhamento Arcano', atributo: 'constituicao', valor: -2 },
  ]);
  assert.deepEqual(drenagensAtivas([ativa('definhamento-arcano', 1)]), []);
  assert.deepEqual(drenagensAtivas([ativa('definhamento-arcano', 3, true)]), []);
  assert.deepEqual(drenagensAtivas([ativa('desgaste-do-tempo', 2), ativa('apagamento', 3)]).map((d) => `${d.atributo}${d.valor}`), ['destreza-1', 'carisma-2']);
  assert.deepEqual(drenagensAtivas(undefined), []);
});

test('a drenagem entra nos atributos da ficha como efeito', () => {
  const ficha = { aflicoesAtivas: [{ id: 'x', aflicaoId: 'definhamento-arcano', estagio: 3, desde: '2026-10-10', incubando: false }] };
  const resumo = resumirEquipamentos([], ficha);
  assert.equal(resumo.bonusAtributos.constituicao, -2);
  assert.ok(resumo.efeitosAtivos.some((efeito) => efeito.origem === 'Aflição: Definhamento Arcano'));
});

test('perda de Sanidade é cobrada por estágio atravessado ao subir', () => {
  const frio = aflicaoPorId('frio-do-fim');
  assert.ok(frio);
  assert.deepEqual(sanidadeAoEntrar(frio!, 0, 3), ['1d4', '1d6']);
  assert.deepEqual(sanidadeAoEntrar(frio!, 2, 3), ['1d6']);
  assert.deepEqual(sanidadeAoEntrar(frio!, 3, 1), []);
  assert.deepEqual(sanidadeAoEntrar(aflicaoPorId('definhamento-arcano')!, 0, 3), []);
});
