import assert from 'node:assert/strict';
import test from 'node:test';
import { falantesVisiveis, legendaLimpa, montagemDoVisor } from '../../src/pages/Mapa/motor/visorConta.ts';

test('uma imagem pequena vem num pedaço só, no nível normal', () => {
  const m = montagemDoVisor(800, 600)!;
  assert.equal(m.nivel, 'n0');
  assert.deepEqual(m.pedacos, [{ chave: 'n0/0/0', x: 0, y: 0, w: 1, h: 1 }]);
});

test('uma imagem até 2048 px de lado usa os pedaços de 1024 com as sobras nas pontas', () => {
  const m = montagemDoVisor(2048, 1500)!;
  assert.equal(m.nivel, 'n0');
  assert.deepEqual(m.pedacos.map((p) => p.chave), ['n0/0/0', 'n0/0/1', 'n0/1/0', 'n0/1/1']);
  const ultima = m.pedacos[3];
  assert.equal(ultima.x, 0.5);
  assert.ok(Math.abs(ultima.h - 476 / 1500) < 1e-9, 'o pedaço de baixo tem só o que sobra');
  // A soma das áreas dos pedaços é a imagem inteira.
  assert.ok(Math.abs(m.pedacos.reduce((soma, p) => soma + p.w * p.h, 0) - 1) < 1e-9);
});

test('acima de 2048 px o visor usa a versão em 1/4, para não baixar dezenas de pedaços', () => {
  const m = montagemDoVisor(8000, 6000)!;
  assert.equal(m.nivel, 'n2');
  assert.deepEqual([m.largura, m.altura], [2000, 1500]);
  assert.equal(m.pedacos.length, 4);
  assert.ok(m.pedacos.every((p) => p.chave.startsWith('n2/')));
  assert.ok(Math.abs(m.pedacos.reduce((soma, p) => soma + p.w * p.h, 0) - 1) < 1e-9);
});

test('tamanho inválido não monta nada', () => {
  assert.equal(montagemDoVisor(0, 100), null);
  assert.equal(montagemDoVisor(100, Number.NaN), null);
  assert.equal(montagemDoVisor(-5, 5), null);
});

test('a legenda fica limpa e dentro do teto do servidor', () => {
  assert.equal(legendaLimpa('  um   convite \n selado '), 'um convite selado');
  assert.equal(legendaLimpa('x'.repeat(500)).length, 200);
  assert.equal(legendaLimpa('   '), '');
});

test('só aparecem na cena os falantes que quem olha enxerga, na ordem do Mestre', () => {
  const tokens = [{ id: 'a', nome: 'Velho' }, { id: 'c', nome: 'Cão' }];
  assert.deepEqual(falantesVisiveis(['c', 'b', 'a'], tokens).map((t) => t.id), ['c', 'a'], 'b é um NPC escondido: nunca chega à tela');
  assert.deepEqual(falantesVisiveis([], tokens), []);
});
