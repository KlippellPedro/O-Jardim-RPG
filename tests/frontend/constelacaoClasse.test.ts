import assert from 'node:assert/strict';
import test from 'node:test';
import { posicaoDaEstrela, tipoPrincipalDoNivel } from '../../src/pages/Ficha/utils/constelacaoClasse';

test('a forma da estrela segue a recompensa mais importante do nível', () => {
  assert.equal(tipoPrincipalDoNivel([{ tipo: 'grau_pericia', titulo: 'x' }, { tipo: 'poder', titulo: 'y' }]), 'poder');
  assert.equal(tipoPrincipalDoNivel([{ tipo: 'poder', titulo: 'y' }, { tipo: 'habilidade_final', titulo: 'z' }]), 'habilidade_final');
  assert.equal(tipoPrincipalDoNivel([]), null);
  assert.equal(tipoPrincipalDoNivel(undefined), null);
});

test('as 20 estrelas ficam dentro do quadro, em duas linhas, sem repetir lugar', () => {
  const posicoes = Array.from({ length: 20 }, (_, i) => posicaoDaEstrela(i + 1));
  posicoes.forEach(({ x, y }) => {
    assert.ok(x >= 0 && x <= 100 && y >= 0 && y <= 100, `${x},${y}`);
  });
  assert.equal(new Set(posicoes.map(({ x, y }) => `${x},${y}`)).size, 20);
  assert.ok(posicoes.slice(0, 10).every(({ y }) => y < 50));
  assert.ok(posicoes.slice(10).every(({ y }) => y > 50));
  assert.ok(posicoes[1].x > posicoes[0].x);
  assert.ok(Math.abs(posicoes[10].x - posicoes[9].x) < 1, "10 e 11 ficam lado a lado");
});

test('nível fora da faixa é preso entre 1 e 20', () => {
  assert.deepEqual(posicaoDaEstrela(0), posicaoDaEstrela(1));
  assert.deepEqual(posicaoDaEstrela(99), posicaoDaEstrela(20));
});
