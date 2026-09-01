import assert from 'node:assert/strict';
import test from 'node:test';
import {
  SESSAO_TOUR_STORAGE_VERSION,
  obterPassosTourSessao,
  serializarSessaoTourVisto,
  sessaoTourJaVisto,
} from '../../src/pages/Sessao/sessionTourConfig';

test('guia da sessão mantém os passos essenciais para jogadores', () => {
  const passos = obterPassosTourSessao(false);
  assert.deepEqual(
    passos.map((passo) => passo.id),
    ['estado-ao-vivo', 'mesa-tatica', 'ficha-em-foco', 'lados-da-cena', 'abrir-ficha', 'ferramentas-da-mesa'],
  );
  assert.equal(passos.some((passo) => passo.id === 'comando-da-mesa'), false);
});

test('guia acrescenta controles administrativos somente para quem comanda', () => {
  const passos = obterPassosTourSessao(true);
  assert.equal(passos.at(-1)?.id, 'comando-da-mesa');
});

test('persistência do guia exige versão atual e conclusão', () => {
  assert.equal(sessaoTourJaVisto(serializarSessaoTourVisto()), true);
  assert.equal(sessaoTourJaVisto(JSON.stringify({ versao: SESSAO_TOUR_STORAGE_VERSION - 1, concluido: true })), false);
  assert.equal(sessaoTourJaVisto(JSON.stringify({ versao: SESSAO_TOUR_STORAGE_VERSION, concluido: false })), false);
  assert.equal(sessaoTourJaVisto('inválido'), false);
});
