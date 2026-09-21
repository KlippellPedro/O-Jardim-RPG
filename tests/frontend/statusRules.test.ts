import assert from 'node:assert/strict';
import test from 'node:test';
import {
  adicionarCondicaoOficial,
  atualizarStatusVital,
  bonusIniciativaFicha,
  desvantagensAutomaticasTeste,
  estadoVida,
  gastarComTemporario,
  limiteMorrendo,
  movimentoBloqueadoPorCondicao,
  multiplicadorMovimentoCansaco,
  obterStatusFicha,
  obterTemporario,
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

test('cura acima do máximo vira extra temporário sem mexer no valor atual', () => {
  const cheio = { vidaAtual: 40, manaAtual: 10 };
  const curado = atualizarStatusVital(cheio, 'vidaAtual', 12, 40, 10);
  assert.equal(curado.vidaAtual, 40);
  assert.equal(curado.vidaTemporaria, 12);
  assert.equal(obterTemporario(curado, 'vidaAtual'), 12);

  // Cura que só completa a barra não gera extra; o que sobra gera.
  const parcial = atualizarStatusVital({ vidaAtual: 35 }, 'vidaAtual', 10, 40, 10);
  assert.equal(parcial.vidaAtual, 40);
  assert.equal(parcial.vidaTemporaria, 5);
});

test('o dano gasta o extra temporário antes da vida normal', () => {
  const comExtra = { vidaAtual: 40, vidaTemporaria: 12 };
  const leve = atualizarStatusVital(comExtra, 'vidaAtual', -5, 40, 10);
  assert.equal(leve.vidaAtual, 40);
  assert.equal(leve.vidaTemporaria, 7);

  const pesado = atualizarStatusVital(comExtra, 'vidaAtual', -20, 40, 10);
  assert.equal(pesado.vidaTemporaria, 0);
  assert.equal(pesado.vidaAtual, 32);
});

test('ajuste manual do valor atual não consome o extra temporário', () => {
  const comExtra = { manaAtual: 20, manaTemporaria: 6 };
  const ajustado = atualizarStatusVital(comExtra, 'manaAtual', -8, 20, 10, { ignorarTemporario: true });
  assert.equal(ajustado.manaAtual, 12);
  assert.equal(ajustado.manaTemporaria, 6);
});

test('Cansaço não tem extra temporário', () => {
  const resultado = atualizarStatusVital({ cansacoAtual: 5 }, 'cansacoAtual', 4, 6, 10);
  assert.equal(resultado.cansacoAtual, 6);
  assert.equal(resultado.cansacoTemporaria, undefined);
  assert.equal(obterTemporario({ cansacoTemporaria: 3 }, 'cansacoAtual'), 0);
});

test('custo de magia ou poder paga primeiro com o extra temporário', () => {
  const status = { manaAtual: 10, manaTemporaria: 4 };
  const meio = gastarComTemporario(status, 'manaAtual', 10, 3);
  assert.deepEqual(meio, { atual: 10, temporario: 1 });
  const alem = gastarComTemporario(status, 'manaAtual', 10, 7);
  assert.deepEqual(alem, { atual: 7, temporario: 0 });
});
