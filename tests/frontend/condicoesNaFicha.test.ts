import assert from 'node:assert/strict';
import test from 'node:test';
import {
  BONUS_INSPIRADO,
  efeitosCondicoesNoTeste,
  inspiradoAtivo,
  removerCondicao,
  movimentoComCondicoes,
  penalidadeDanoCorpoACorpoCondicoes,
  textoMovimentoCondicoes,
} from '../../src/services/statusService.ts';
import { montarDano } from '../../src/pages/Ficha/utils/rolagemAtaque.ts';

const com = (...ids: string[]) => ids.map((id) => ({ id, nome: id }));

test('Enfraquecido tira 2 de tudo que usa Força e 2 do dano corpo a corpo', () => {
  const condicoes = com('enfraquecido');
  assert.equal(efeitosCondicoesNoTeste(condicoes, { periciaId: 'atletismo', atributoId: 'forca' }).bonus, -2);
  assert.equal(efeitosCondicoesNoTeste(condicoes, { periciaId: 'luta', atributoId: 'forca', ataque: true }).bonus, -2);
  assert.equal(efeitosCondicoesNoTeste(condicoes, { periciaId: 'acrobacia', atributoId: 'destreza' }).bonus, 0);
  assert.equal(penalidadeDanoCorpoACorpoCondicoes(condicoes), -2);
  assert.equal(penalidadeDanoCorpoACorpoCondicoes([]), 0);
  assert.equal(montarDano({ dano: '1d4', modificadorAtributo: 3, ajusteCondicoes: -2 }).formula, '1d4+1');
});

test('Favorecido soma 1 só nos três testes de resistência', () => {
  const condicoes = com('favorecido');
  for (const pericia of ['fortitude', 'reflexos', 'vontade']) {
    assert.equal(efeitosCondicoesNoTeste(condicoes, { periciaId: pericia }).bonus, 1, pericia);
  }
  assert.equal(efeitosCondicoesNoTeste(condicoes, { periciaId: 'luta' }).bonus, 0);
});

test('Desorientado atrapalha ataque e Percepção; Cego, só Percepção', () => {
  assert.equal(efeitosCondicoesNoTeste(com('desorientado'), { periciaId: 'luta', ataque: true }).desvantagens, 1);
  assert.equal(efeitosCondicoesNoTeste(com('desorientado'), { periciaId: 'percepcao' }).desvantagens, 1);
  assert.equal(efeitosCondicoesNoTeste(com('desorientado'), { periciaId: 'atletismo' }).desvantagens, 0);
  assert.equal(efeitosCondicoesNoTeste(com('cego'), { periciaId: 'percepcao' }).desvantagens, 1);
  assert.equal(efeitosCondicoesNoTeste(com('cego'), { periciaId: 'luta', ataque: true }).desvantagens, 0);
  assert.equal(efeitosCondicoesNoTeste(com('cego', 'desorientado'), { periciaId: 'percepcao' }).desvantagens, 2);
});

test('condição achada pelo nome também vale, com ou sem acento', () => {
  assert.equal(efeitosCondicoesNoTeste([{ nome: 'Enfraquecido' }], { atributoId: 'forca' }).bonus, -2);
  assert.equal(efeitosCondicoesNoTeste(['enfraquecido'], { atributoId: 'forca' }).bonus, -2);
});

test('Lento corta o Movimento pela metade, Apressado soma 3 m e os dois se anulam', () => {
  assert.equal(movimentoComCondicoes(9, com('lento')), 4);
  assert.equal(movimentoComCondicoes(9, com('apressado')), 12);
  assert.equal(movimentoComCondicoes(9, com('lento', 'apressado')), 9);
  assert.equal(movimentoComCondicoes(9, []), 9);
  assert.equal(textoMovimentoCondicoes(com('lento')), 'Lento: metade');
  assert.equal(textoMovimentoCondicoes(com('apressado')), 'Apressado: +3 m');
  assert.equal(textoMovimentoCondicoes([]), '');
});

test('lesões com número fixo entram nos testes e ataques', () => {
  const ctxLuta = { periciaId: 'luta', atributoId: 'forca', ataque: true, tipoAtaque: 'corpo' as const };
  const ctxArco = { periciaId: 'pontaria', atributoId: 'destreza', ataque: true, tipoAtaque: 'distancia' as const };
  assert.equal(efeitosCondicoesNoTeste(com('braco-dominante-quebrado'), ctxLuta).bonus, -2);
  // Braço quebrado e mão perdida tiram 2 da mesma mão: não somam.
  assert.equal(efeitosCondicoesNoTeste(com('braco-dominante-quebrado', 'perda-mao-dominante'), ctxArco).bonus, -2);
  assert.equal(efeitosCondicoesNoTeste(com('ombro-deslocado'), ctxLuta).desvantagens, 1);
  assert.equal(efeitosCondicoesNoTeste(com('ombro-deslocado'), ctxArco).desvantagens, 0);
  assert.equal(efeitosCondicoesNoTeste(com('perda-olho'), ctxArco).bonus, -2);
  assert.equal(efeitosCondicoesNoTeste(com('perda-olho'), ctxLuta).bonus, 0);
  assert.equal(efeitosCondicoesNoTeste(com('perda-olho'), { periciaId: 'percepcao' }).bonus, -2);
  assert.equal(efeitosCondicoesNoTeste(com('tremor-nas-maos'), ctxArco).desvantagens, 1);
  assert.equal(efeitosCondicoesNoTeste(com('costelas-fraturadas'), { periciaId: 'atletismo' }).bonus, -2);
  assert.equal(efeitosCondicoesNoTeste(com('concussao'), { periciaId: 'investigacao' }).desvantagens, 1);
  assert.equal(efeitosCondicoesNoTeste(com('mandibula-quebrada'), { periciaId: 'diplomacia' }).desvantagens, 1);
  assert.equal(efeitosCondicoesNoTeste(com('perna-quebrada', 'perda-perna'), { periciaId: 'acrobacia' }).desvantagens, 1);
  assert.deepEqual(efeitosCondicoesNoTeste(com('concussao'), { periciaId: 'percepcao' }).fontesDesvantagem, ['Concussão']);
});

test('condição de longo prazo salva só com o nome também vale', () => {
  assert.equal(efeitosCondicoesNoTeste([{ nome: 'Costelas Fraturadas' }], { periciaId: 'atletismo' }).bonus, -2);
});

test('pernas cortam o Movimento pela metade uma vez só, e Apressado ainda soma', () => {
  assert.equal(movimentoComCondicoes(9, com('perna-quebrada')), 4);
  assert.equal(movimentoComCondicoes(10, com('perna-quebrada', 'lento')), 5);
  assert.equal(movimentoComCondicoes(10, com('perna-quebrada', 'apressado')), 8);
  assert.equal(movimentoComCondicoes(10, com('lento', 'apressado', 'perda-perna')), 5);
  assert.equal(textoMovimentoCondicoes(com('perna-quebrada', 'lento')), 'Lento e Perna Quebrada: metade');
  assert.equal(textoMovimentoCondicoes(com('lento', 'apressado')), 'Lento e Apressado se anulam');
});

test('Inspirado é achado e removido da ficha depois do teste', () => {
  const lista = [{ id: 'inspirado', nome: 'Inspirado' }, { id: 'lento', nome: 'Lento' }];
  assert.equal(inspiradoAtivo(lista), true);
  assert.deepEqual(removerCondicao(lista, 'inspirado'), [{ id: 'lento', nome: 'Lento' }]);
  assert.equal(inspiradoAtivo(removerCondicao(lista, 'inspirado')), false);
  assert.deepEqual(removerCondicao(undefined, 'inspirado'), []);
  assert.equal(BONUS_INSPIRADO, 2);
});
