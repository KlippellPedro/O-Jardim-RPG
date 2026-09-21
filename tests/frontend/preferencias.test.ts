import assert from 'node:assert/strict';
import test from 'node:test';
import { categoriaDoSom, CATEGORIAS_PADRAO } from '../../src/utils/categoriasSom';
import { dispositivoFraco } from '../../src/utils/movimento';

test('cada efeito sonoro cai na sua categoria e o resto e interface', () => {
  assert.equal(categoriaDoSom('gongo'), 'eventos');
  assert.equal(categoriaDoSom('estrela'), 'eventos');
  assert.equal(categoriaDoSom('moeda'), 'moedas');
  assert.equal(categoriaDoSom('moeda-gasto'), 'moedas');
  assert.equal(categoriaDoSom('click'), 'interface');
  assert.equal(categoriaDoSom('qualquer-coisa'), 'interface');
  assert.deepEqual(CATEGORIAS_PADRAO, { interface: true, eventos: true, moedas: true });
});

test('modo leve automatico so para aparelho que parece fraco', () => {
  assert.equal(dispositivoFraco({ memoriaGb: 8, nucleos: 8, larguraTela: 1920 }), false);
  assert.equal(dispositivoFraco({ memoriaGb: 2, nucleos: 8 }), true);
  assert.equal(dispositivoFraco({ memoriaGb: 8, nucleos: 4 }), true);
  assert.equal(dispositivoFraco({ economiaDeDados: true, memoriaGb: 8, nucleos: 8 }), true);
  assert.equal(dispositivoFraco({ toque: true, larguraTela: 390, memoriaGb: 6, nucleos: 8 }), true);
  assert.equal(dispositivoFraco({ toque: true, larguraTela: 390, memoriaGb: 8, nucleos: 8 }), false);
  // Sem nenhum sinal (navegador que não informa nada) nunca liga sozinho.
  assert.equal(dispositivoFraco({}), false);
});
