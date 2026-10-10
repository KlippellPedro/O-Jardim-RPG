import assert from 'node:assert/strict';
import test from 'node:test';
import { houveDanoNosMeus } from '../../src/pages/Sessao/combateVivo';
import { TEXTO_DO_DESTAQUE, empilharDestaque, lerDestaque } from '../../src/pages/Sessao/destaqueDaMesa';
import { PADROES_DE_VIBRACAO, vibracaoDisponivel, vibrar } from '../../src/utils/vibracao';

test('o corpo do evento vira um destaque com o autor e o título', () => {
  const destaque = lerDestaque({ destaque: 'critico', autor: ' Kael ', titulo: 'Ataque: Espada', usuario_id: 'u2' }, 'u1');
  assert.ok(destaque);
  assert.equal(destaque.tipo, 'critico');
  assert.equal(destaque.autor, 'Kael');
  assert.equal(destaque.titulo, 'Ataque: Espada');
  assert.equal(destaque.proprio, false);
});

test('quem rolou reconhece a própria rolagem e não ganha som nem vibração de novo', () => {
  assert.equal(lerDestaque({ destaque: 'falha', autor: 'Kael', usuario_id: 'u1' }, 'u1')?.proprio, true);
  assert.equal(lerDestaque({ destaque: 'falha', autor: 'Kael', usuario_id: 'u1' }, null)?.proprio, false);
});

test('evento sem tipo conhecido ou sem autor não gera destaque', () => {
  for (const lixo of [{}, { destaque: 'sucesso', autor: 'Kael' }, { destaque: 'critico' }, { destaque: 'critico', autor: '   ' }, { destaque: 1, autor: 'Kael' }]) {
    assert.equal(lerDestaque(lixo, 'u1'), null, JSON.stringify(lixo));
  }
});

test('textos enormes são cortados', () => {
  const destaque = lerDestaque({ destaque: 'critico', autor: 'a'.repeat(500), titulo: 'b'.repeat(500) }, null);
  assert.equal(destaque?.autor.length, 60);
  assert.equal(destaque?.titulo.length, 80);
});

test('cada destaque tem chave própria e o mais novo substitui o da tela', () => {
  const um = lerDestaque({ destaque: 'critico', autor: 'A' }, null);
  const dois = lerDestaque({ destaque: 'falha', autor: 'B' }, null);
  assert.ok(um && dois);
  assert.notEqual(um.chave, dois.chave);
  assert.deepEqual(empilharDestaque([um], dois), [dois]);
});

test('o 20 e o 1 têm texto próprio', () => {
  assert.equal(TEXTO_DO_DESTAQUE.critico.titulo, '20 natural');
  assert.equal(TEXTO_DO_DESTAQUE.falha.titulo, '1 natural');
});

test('o dano nos meus só conta com número dos dois lados e Vida menor', () => {
  const antes = [{ id: 'a', hpAtual: 20 }, { id: 'b', hpAtual: 30 }, { id: 'c', hpAtual: undefined }];
  assert.equal(houveDanoNosMeus(antes, [{ id: 'a', eMeu: true, hpAtual: 12 }]), true);
  assert.equal(houveDanoNosMeus(antes, [{ id: 'a', eMeu: true, hpAtual: 20 }]), false, 'sem mudança');
  assert.equal(houveDanoNosMeus(antes, [{ id: 'a', eMeu: true, hpAtual: 25 }]), false, 'cura não vibra');
  assert.equal(houveDanoNosMeus(antes, [{ id: 'b', eMeu: false, hpAtual: 1 }]), false, 'dano nos outros não conta');
  assert.equal(houveDanoNosMeus(antes, [{ id: 'c', eMeu: true, hpAtual: 5 }]), false, 'sem número antes não dá para comparar');
  assert.equal(houveDanoNosMeus(antes, [{ id: 'a', eMeu: true, hpAtual: undefined }]), false, 'sem número depois também não');
  assert.equal(houveDanoNosMeus(antes, [{ id: 'novo', eMeu: true, hpAtual: 1 }]), false, 'quem acabou de entrar na cena não levou dano');
});

test('a vibração usa o padrão do tipo e respeita o interruptor', () => {
  const chamadas: Array<number | number[]> = [];
  const aparelho = { vibrate: (padrao: number | number[]) => { chamadas.push(padrao); return true; } };
  assert.equal(vibrar('critico', { aparelho }), true);
  assert.deepEqual(chamadas, [PADROES_DE_VIBRACAO.critico]);
  assert.equal(vibrar('dano', { ligada: false, aparelho }), false);
  assert.equal(chamadas.length, 1, 'desligada, nem chama o aparelho');
});

test('sem suporte, ou com o navegador bloqueando, a vibração só devolve false', () => {
  assert.equal(vibrar('toque', { aparelho: {} }), false);
  assert.equal(vibrar('toque', { aparelho: { vibrate: () => { throw new Error('bloqueado'); } } }), false);
  assert.equal(vibrar('toque', { aparelho: { vibrate: () => false } }), false);
  assert.equal(vibracaoDisponivel({}), false);
  assert.equal(vibracaoDisponivel({ vibrate: () => true }), true);
});

test('todo tipo de vibração tem padrão e nenhum passa de meio segundo seguido', () => {
  for (const [tipo, padrao] of Object.entries(PADROES_DE_VIBRACAO)) {
    const pedacos = Array.isArray(padrao) ? padrao : [padrao];
    assert.ok(pedacos.every((ms) => ms > 0 && ms <= 500), tipo);
  }
});
