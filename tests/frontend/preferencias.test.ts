import assert from 'node:assert/strict';
import test from 'node:test';
import { categoriaDoSom, CATEGORIAS_PADRAO } from '../../src/utils/categoriasSom';
import { aparelhoEngasgando, dispositivoFraco } from '../../src/utils/movimento';

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

test('aparelho engasgando: quadros lentos ou trancos frequentes ligam o modo leve', () => {
  const repetir = (ms: number, vezes: number) => Array.from({ length: vezes }, () => ms);
  // 60 e 30 quadros por segundo estão bem; o Chrome em economia de bateria fica em 30.
  assert.equal(aparelhoEngasgando(repetir(16.7, 200)), false);
  assert.equal(aparelhoEngasgando(repetir(33.3, 120)), false);
  // Uns 20 quadros por segundo o tempo todo já é travado.
  assert.equal(aparelhoEngasgando(repetir(50, 80)), true);
  // Fluido na maior parte, mas um tranco a cada quatro quadros também conta.
  assert.equal(aparelhoEngasgando([...repetir(16.7, 75), ...repetir(90, 25)]), true);
  // Poucos trancos soltos (carregou uma imagem) não contam.
  assert.equal(aparelhoEngasgando([...repetir(16.7, 95), ...repetir(120, 5)]), false);
  // Amostra pequena nunca acusa; intervalos absurdos (aba escondida) são ignorados.
  assert.equal(aparelhoEngasgando(repetir(80, 10)), false);
  assert.equal(aparelhoEngasgando([...repetir(16.7, 60), 5000, 8000, NaN]), false);
});
