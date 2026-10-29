import assert from 'node:assert/strict';
import test from 'node:test';

import { CLASSES_CATALOGO } from '../../src/services/catalogoService';
import { dtPadraoDoVd } from '../../src/services/curvaCriatura';
import { interceptacaoDaFicha } from '../../src/services/magiaService';

// Decisão de 2026-10-20 (A nas três perguntas da decisão 7): o Pacote Descartado
// vira habilidade do nível 1, poder de criatura usa a DT padrão do VD, as zonas
// poupam quem o Interceptador escolher, e o nível 18 ganha a Blindagem de Malha.

const interceptador = CLASSES_CATALOGO.find((classe) => classe.id === 'interceptador') as any;
const habilidade = (id: string) => interceptador.habilidades.find((item: any) => item.id === id);
const poder = (id: string) => interceptador.poderes.find((item: any) => item.id === id);
const recompensas = (nivel: number) => interceptador.progressao.find((item: any) => item.nivel === nivel).recompensas.map((item: any) => item.titulo);

test('o Pacote Descartado é habilidade do nível 1 e saiu da lista de poderes', () => {
  const pacote = habilidade('pacote-descartado');
  assert.ok(pacote);
  assert.deepEqual(pacote.niveis, [1]);
  assert.equal(pacote.custo_mana, 4);
  assert.equal(pacote.acao, 'Reação');
  assert.match(pacote.descricao, /DT padrão do VD/);
  assert.equal(poder('pacote-descartado'), undefined);
  assert.ok(recompensas(1).includes('Pacote Descartado'));
  // 11 poderes para as 8 vagas: o Ruído Branco entrou no lugar do Pacote, e o Choque de
  // Malha é o poder de reserva para a luta sem magia (questionário final, pergunta 22).
  assert.equal(interceptador.poderes.length, 11);
  assert.ok(poder('ruido-branco'));
});

test('o nível 18 ganha a Blindagem de Malha e o Acesso Administrador fica só no 20', () => {
  assert.deepEqual(habilidade('blindagem-de-malha')?.niveis, [18]);
  assert.ok(recompensas(18).includes('Blindagem de Malha'));
  assert.ok(!recompensas(18).includes('Acesso Administrador'));
  assert.ok(recompensas(20).includes('Acesso Administrador'));
  assert.match(habilidade('acesso-administrador').descricao, /no máximo uma delas/);
});

test('as zonas poupam quem o Interceptador escolher, e a Quarentena não facilita a conjuração inimiga', () => {
  for (const id of ['quarentena-arcana', 'apagao-local']) assert.match(poder(id).descricao, /que você escolher ficam de fora/, id);
  assert.match(poder('quarentena-arcana').descricao, /-2 no teste de conjuração/);
  assert.doesNotMatch(poder('quarentena-arcana').descricao, /na DT de conjuração/);
  assert.match(poder('apagao-local').descricao, /sem Mana anotada/);
});

test('a ficha calcula a interceptação de magia e de poder de criatura', () => {
  assert.equal(dtPadraoDoVd(10), 20);
  assert.equal(dtPadraoDoVd(1), 15);

  const nivel5 = interceptacaoDaFicha(5, { tipo: 'magia', circulo: 3 }, { bonusBase: 10 });
  assert.deepEqual(nivel5, { dt: 16, bonus: 10, custoMana: 4, rotulo: 'magia de 3º círculo', vantagem: false });

  // Assinatura Reconhecida soma +2 do nível 10 em diante; o círculo vai até o 10º, seja qual for o Fluxo.
  const nivel10 = interceptacaoDaFicha(10, { tipo: 'magia', circulo: 10 }, { bonusBase: 12 });
  assert.equal(nivel10.dt, 37);
  assert.equal(nivel10.bonus, 14);

  const criatura = interceptacaoDaFicha(12, { tipo: 'criatura', vd: 20 }, { bonusBase: 13 });
  assert.equal(criatura.dt, 25);
  assert.equal(criatura.rotulo, 'poder de criatura de VD 20');

  // Acesso Administrador: +5 e 3 de Mana a menos, só no nível 20.
  const administrador = interceptacaoDaFicha(20, { tipo: 'magia', circulo: 8 }, { bonusBase: 20, administradorAtivo: true });
  assert.equal(administrador.bonus, 27);
  assert.equal(administrador.custoMana, 1);
  const cedoDemais = interceptacaoDaFicha(19, { tipo: 'magia', circulo: 8 }, { bonusBase: 20, administradorAtivo: true });
  assert.equal(cedoDemais.bonus, 22);
  assert.equal(cedoDemais.custoMana, 4);
});
