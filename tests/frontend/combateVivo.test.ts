import assert from 'node:assert/strict';
import test from 'node:test';
import {
  TEXTO_DO_AVISO,
  deltaDaBarra,
  forcaDoTremor,
  mudancaDeCombate,
  situacaoDaVida,
  textoDoDelta,
  tipoDoFlutuante,
} from '../../src/pages/Sessao/combateVivo';

test('a situação da Vida segue os mesmos cortes da barra da Ficha', () => {
  assert.equal(situacaoDaVida(100, 100), 'normal');
  assert.equal(situacaoDaVida(26, 100), 'normal');
  assert.equal(situacaoDaVida(25, 100), 'baixa');
  assert.equal(situacaoDaVida(11, 100), 'baixa');
  assert.equal(situacaoDaVida(10, 100), 'critica');
  assert.equal(situacaoDaVida(1, 100), 'critica');
  assert.equal(situacaoDaVida(0, 100), 'caida');
  assert.equal(situacaoDaVida(-4, 100), 'caida');
});

test('sem o número de Vida, só o texto de estado do servidor conta', () => {
  assert.equal(situacaoDaVida(undefined, undefined, 'Ferido'), 'normal');
  assert.equal(situacaoDaVida(undefined, undefined, 'Quase morto'), 'critica');
  assert.equal(situacaoDaVida(undefined, undefined, 'Fora de combate'), 'caida');
  assert.equal(situacaoDaVida(undefined, undefined, null), 'normal');
  assert.equal(situacaoDaVida(undefined, 80, undefined), 'normal');
});

test('Vida em zero cai mesmo sem máximo conhecido', () => {
  assert.equal(situacaoDaVida(0, undefined), 'caida');
  assert.equal(situacaoDaVida(5, 0), 'normal');
});

test('a variação de uma barra é a diferença entre as duas leituras, e 0 quando falta uma delas', () => {
  assert.equal(deltaDaBarra(40, 28), -12);
  assert.equal(deltaDaBarra(10, 18), 8);
  assert.equal(deltaDaBarra(10, 10), 0);
  assert.equal(deltaDaBarra(undefined, 10), 0);
  assert.equal(deltaDaBarra(10, undefined), 0);
  assert.equal(deltaDaBarra(Number.NaN, 10), 0);
});

test('o número flutuante tem a cor do recurso: dano vermelho, cura verde, Mana e Estamina as suas', () => {
  assert.equal(tipoDoFlutuante('health', -5), 'dano');
  assert.equal(tipoDoFlutuante('health', 5), 'cura');
  assert.equal(tipoDoFlutuante('mana', -5), 'mana');
  assert.equal(tipoDoFlutuante('mana', 5), 'mana');
  assert.equal(tipoDoFlutuante('stamina', -2), 'estamina');
});

test('o texto do número leva o sinal', () => {
  assert.equal(textoDoDelta(8), '+8');
  assert.equal(textoDoDelta(-12), '-12');
});

test('o tremor cresce com o tamanho do golpe e tem teto; cura não treme', () => {
  assert.equal(forcaDoTremor(5, 100), 0);
  assert.ok(forcaDoTremor(-5, 100) < forcaDoTremor(-50, 100));
  assert.equal(forcaDoTremor(-500, 100), 9);
  assert.ok(forcaDoTremor(-5, undefined) > 0, 'sem máximo ainda treme, com força média');
});

test('a primeira leitura da página nunca anuncia combate', () => {
  assert.equal(mudancaDeCombate(null, { sessaoId: 's1', emCombate: true, rodada: 3 }), null);
  assert.equal(mudancaDeCombate({ sessaoId: null, emCombate: false, rodada: 0 }, { sessaoId: 's1', emCombate: true, rodada: 1 }), null);
});

test('trocar de sessão não anuncia nada', () => {
  assert.equal(
    mudancaDeCombate({ sessaoId: 's1', emCombate: false, rodada: 0 }, { sessaoId: 's2', emCombate: true, rodada: 1 }),
    null,
  );
});

test('o combate que começa com a página aberta anuncia o início, sempre na rodada 1 ou mais', () => {
  assert.deepEqual(
    mudancaDeCombate({ sessaoId: 's1', emCombate: false, rodada: 0 }, { sessaoId: 's1', emCombate: true, rodada: 1 }),
    { tipo: 'inicio', rodada: 1 },
  );
  assert.deepEqual(
    mudancaDeCombate({ sessaoId: 's1', emCombate: false, rodada: 0 }, { sessaoId: 's1', emCombate: true, rodada: 0 }),
    { tipo: 'inicio', rodada: 1 },
  );
});

test('rodada nova anuncia; voltar um turno não', () => {
  const emCombate = (rodada: number) => ({ sessaoId: 's1', emCombate: true, rodada });
  assert.deepEqual(mudancaDeCombate(emCombate(1), emCombate(2)), { tipo: 'rodada', rodada: 2 });
  assert.equal(mudancaDeCombate(emCombate(2), emCombate(1)), null);
  assert.equal(mudancaDeCombate(emCombate(2), emCombate(2)), null);
});

test('o fim do combate anuncia com a rodada em que terminou', () => {
  assert.deepEqual(
    mudancaDeCombate({ sessaoId: 's1', emCombate: true, rodada: 4 }, { sessaoId: 's1', emCombate: false, rodada: 0 }),
    { tipo: 'fim', rodada: 4 },
  );
});

test('uma releitura igual (reconexão do canal ao vivo) não anuncia nada', () => {
  const estado = { sessaoId: 's1', emCombate: true, rodada: 2 };
  assert.equal(mudancaDeCombate(estado, { ...estado }), null);
  const parado = { sessaoId: 's1', emCombate: false, rodada: 0 };
  assert.equal(mudancaDeCombate(parado, { ...parado }), null);
});

test('os textos do aviso falam o nome de quem abre a rodada, quando a mesa pode saber', () => {
  const inicio = { chave: 'a', tipo: 'inicio' as const, rodada: 1, nomeDaVez: 'Lyra Valen' };
  assert.equal(TEXTO_DO_AVISO.inicio.titulo(1), 'Combate!');
  assert.equal(TEXTO_DO_AVISO.inicio.legenda(inicio), 'A rodada 1 abre com Lyra Valen');
  assert.equal(TEXTO_DO_AVISO.inicio.legenda({ ...inicio, nomeDaVez: undefined }), 'A rodada 1 começou');
  assert.equal(TEXTO_DO_AVISO.rodada.titulo(3), 'Rodada 3');
  assert.equal(TEXTO_DO_AVISO.rodada.legenda({ ...inicio, tipo: 'rodada', rodada: 3 }), 'Lyra Valen abre a rodada');
  assert.equal(TEXTO_DO_AVISO.rodada.legenda({ ...inicio, tipo: 'rodada', nomeDaVez: undefined }), 'Uma nova rodada começou');
  assert.equal(TEXTO_DO_AVISO.fim.titulo(2), 'Fim do combate');
});
