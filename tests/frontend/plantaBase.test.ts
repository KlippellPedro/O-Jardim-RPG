import assert from 'node:assert/strict';
import test from 'node:test';
import {
  acharPatamar,
  construcoesPossiveis,
  custoSugerido,
  espacosUsados,
  melhoriaDaInstalacao,
  proximoPatamar,
  type InstalacaoPlanta,
} from '../../src/pages/Ficha/utils/plantaBase';

const dormitorio1: InstalacaoPlanta = { id: 'a', nome: 'Dormitório', nivel: 1, espacos: 1 };

test('patamar aceita id e titulo', () => {
  assert.equal(acharPatamar('sede')?.id, 'sede');
  assert.equal(acharPatamar('Fortaleza')?.id, 'enclave');
  assert.equal(acharPatamar('nada'), undefined);
});

test('melhoria cobra so a diferenca de fatores e troca o nivel', () => {
  const m = melhoriaDaInstalacao(dormitorio1, acharPatamar('sede'), 3);
  assert.ok(m);
  assert.equal(m.proximo.nivel, 2);
  assert.equal(m.custo.aquisicao, 1000);
  assert.equal(m.custo.manutencao, 100);
  assert.equal(m.espacosExtras, 1);
  assert.equal(m.bloqueio, null);
});

test('patamar baixo bloqueia a melhoria e aponta quem libera', () => {
  const m = melhoriaDaInstalacao(dormitorio1, acharPatamar('posto'), 2);
  assert.equal(m?.bloqueio, 'patamar');
  assert.equal(m?.patamarNecessario?.id, 'sede');
});

test('sem espaco livre bloqueia por espacos', () => {
  assert.equal(melhoriaDaInstalacao(dormitorio1, acharPatamar('sede'), 0)?.bloqueio, 'espacos');
});

test('instalacao personalizada nao tem melhoria', () => {
  assert.equal(melhoriaDaInstalacao({ id: 'x', nome: 'Torre de vigia', nivel: 1, espacos: 1 }, acharPatamar('sede'), 3), null);
});

test('construcoes possiveis somem com o que ja existe e respeitam o espaco', () => {
  const lista = construcoesPossiveis([dormitorio1], acharPatamar('posto'), 2);
  assert.ok(!lista.some((c) => c.catalogo.id === 'dormitorio'));
  assert.ok(lista.every((c) => c.nivel.nivel <= 1 && c.nivel.espacos <= 2));
  assert.deepEqual(construcoesPossiveis([], undefined, 5), []);
});

test('proximo patamar soma espacos e o ultimo nao tem proximo', () => {
  const sobe = proximoPatamar(acharPatamar('posto'));
  assert.equal(sobe?.proximo.id, 'sede');
  assert.equal(sobe?.espacosExtras, 3);
  assert.equal(proximoPatamar(acharPatamar('enclave')), null);
  assert.equal(espacosUsados([dormitorio1, { ...dormitorio1, id: 'b', espacos: 2 }]), 3);
});

test('custo sugerido soma patamar e instalacoes e ignora personalizadas', () => {
  const c = custoSugerido('sede', 'residencia', [
    { id: 'a', nome: 'Dormitório', nivel: 1, espacos: 1 },
    { id: 'b', nome: 'Torre', nivel: 1, espacos: 1 },
  ]);
  assert.equal(c?.aquisicao, (3 + 1) * 1000);
  assert.equal(c?.manutencao, (2 + 1) * 100);
  assert.equal(c?.ignoradas, 1);
  assert.equal(custoSugerido('', 'residencia', []), null);
});

test('terreno sem estrutura paga metade da manutencao', () => {
  assert.equal(custoSugerido('posto', 'terreno', [])?.manutencao, 50);
  assert.equal(custoSugerido('posto', 'residencia', [])?.manutencao, 100);
});
