import assert from 'node:assert/strict';
import test from 'node:test';
import {
  adicionarCondicaoOficial,
  atualizarStatusVital,
  bonusIniciativaFicha,
  desvantagensAutomaticasTeste,
  estadoVida,
  limiteMorrendo,
  movimentoBloqueadoPorCondicao,
  multiplicadorMovimentoCansaco,
  obterStatusFicha,
  penalidadeAtaqueCondicoes,
  penalidadeCansacoIniciativa,
  penalidadeCansacoTeste,
  penalidadeDefesaCondicoes,
  penalidadeIniciativaCondicoes,
} from '../../src/services/statusService';

test('condição oficial entra no formato da ficha sem criar duplicatas', () => {
  const regra = {
    id: 'caido',
    titulo: 'Caído',
    categoria: 'física',
    duracao: 'Até se levantar.',
    efeitos: ['Seus ataques sofrem -2.'],
    remocao: 'Gaste uma ação de movimento.',
  };
  const primeira = adicionarCondicaoOficial([], regra);
  assert.equal(primeira.adicionada, true);
  assert.deepEqual(primeira.condicoes, [{
    id: 'caido',
    nome: 'Caído',
    descricao: 'Seus ataques sofrem -2.',
    afeta: 'física',
    duracao: 'Até se levantar.',
    remocao: 'Gaste uma ação de movimento.',
  }]);

  const repetida = adicionarCondicaoOficial(primeira.condicoes, regra);
  assert.equal(repetida.adicionada, false);
  assert.equal(repetida.condicoes.length, 1);
});

test('Vida continua abaixo de zero e inicia Morrendo 1', () => {
  const status = atualizarStatusVital({ vidaAtual: 2 }, 'vidaAtual', -7, 20, 12);
  assert.equal(status.vidaAtual, -5);
  assert.equal(status.morrendo, 1);
  assert.equal(status.morto, false);
  assert.equal(estadoVida(status, 20), 'deficit');
});

test('Cansaço aplica as penalidades graduais publicadas', () => {
  assert.equal(penalidadeCansacoTeste(1, true), -1);
  assert.equal(penalidadeCansacoTeste(1, false), 0);
  assert.equal(penalidadeCansacoTeste(2, true), -2);
  assert.equal(penalidadeCansacoTeste(3, false), -2);
  assert.equal(penalidadeCansacoIniciativa(2), -1);
  assert.equal(multiplicadorMovimentoCansaco(5), 0.5);
  assert.equal(desvantagensAutomaticasTeste(4, true, false), 1);
  assert.equal(desvantagensAutomaticasTeste(4, true, true), 2);
  assert.equal(desvantagensAutomaticasTeste(4, false, true), 0);
});

test('condições oficiais alteram defesa, iniciativa, ataques e movimento', () => {
  const condicoes = [{ id: 'exposto' }, { nome: 'Atordoado' }, 'Surpreendido', { titulo: 'Caído' }];
  assert.equal(penalidadeDefesaCondicoes(condicoes), 7);
  assert.equal(penalidadeIniciativaCondicoes(condicoes), -5);
  assert.equal(penalidadeAtaqueCondicoes(condicoes), -2);
  assert.equal(movimentoBloqueadoPorCondicao([{ nome: 'Imobilizado' }]), true);
});

test('status atual prevalece sobre recursos legados', () => {
  assert.deepEqual(
    obterStatusFicha({ recursos: { vidaAtual: 12, manaAtual: 3 }, status: { vidaAtual: 8 } }),
    { vidaAtual: 8, manaAtual: 3 },
  );
});

test('iniciativa soma bônus nomeados e efeitos ativos', () => {
  assert.equal(bonusIniciativaFicha({
    recursos: { bonusIniciativa: 2, ajustesIniciativa: [{ valor: 3 }, { valor: -1 }] },
    efeitosAtivos: { ativa: true },
    habilidades: [{ id: 'ativa', efeitos: [{ modo: 'ativavel', tipo: 'combate', alvo: 'iniciativa', valor: 2 }] }],
  }), 6);
});

test('déficit igual à Vida máxima causa morte imediata', () => {
  const status = atualizarStatusVital({ vidaAtual: -15, morrendo: 1 }, 'vidaAtual', -5, 20, 12);
  assert.equal(status.vidaAtual, -20);
  assert.equal(status.morto, true);
  assert.equal(status.morrendo, 3);
});

test('maestria de Constituição amplia Morrendo e despertar aumenta Ferido', () => {
  assert.equal(limiteMorrendo(20), 4);
  const status = atualizarStatusVital({ vidaAtual: -2, morrendo: 2, ferido: 1 }, 'vidaAtual', 3, 20, 20);
  assert.equal(status.vidaAtual, 1);
  assert.equal(status.morrendo, 0);
  assert.equal(status.ferido, 2);
  assert.equal(estadoVida(status, 20), 'consciente');
});
