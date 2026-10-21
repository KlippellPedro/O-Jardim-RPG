import assert from 'node:assert/strict';
import test from 'node:test';

import catalogoLoja from '../../data/loja/catalogo.json';
import magiasData from '../../data/ficha/magias.json';
import { MAGIAS_CATALOGO } from '../../src/services/magiaService';

// Decisão de 2026-10-20 (balanceamento do Fim, opção A): a Palavra de Morte só
// mata quem está com metade ou menos da Vida, tudo que encerra efeito tem teto
// de círculo, e o resto do relatório do Fim foi corrigido.

const magia = (id: string) => {
  const encontrada = MAGIAS_CATALOGO.find((item) => item.id === id) as any;
  assert.ok(encontrada, `${id} sumiu do catálogo`);
  return encontrada;
};

test('a Palavra de Morte tem limiar de metade da Vida', () => {
  const palavra = magia('sentenca-final').efeito;
  assert.match(palavra, /metade ou menos da Vida máxima/);
  assert.doesNotMatch(palavra, /magia comum/);
  assert.equal(magia('conduzir-ao-termino').dano, '8d6');
});

test('o que encerra efeito tem teto de círculo', () => {
  assert.match(magia('fechar-ciclo').efeito, /de até 4º círculo/);
  assert.match(magia('termino-regional').efeito, /permanentes de até 8º círculo/);
  assert.match(magia('fim-de-todos-os-ciclos').efeito, /permanentes de até 9º círculo/);
  for (const [id, circulo] of [['egide-de-fluxo', 2], ['passo-canalizado', 2], ['muralha-canalizada', 4], ['clone-de-fluxo', 6], ['forma-de-fluxo', 7], ['convocacao-do-fluxo', 8]] as const) {
    assert.match(magia(id).efeitos_por_fluxo.fim, new RegExp(`de até ${circulo}º círculo`), id);
  }
  const lamina = (magiasData.encantamentos as any[]).find((item) => item.id === 'lamina-do-encerramento');
  assert.match(lamina.efeito, /de até 5º círculo/);
});

test('correções do relatório do Fim', () => {
  assert.doesNotMatch(magia('romper-vinculo').efeito, /já cumprido/);
  assert.doesNotMatch(JSON.stringify(MAGIAS_CATALOGO.filter((item) => item.fluxo === 'fim')), /ressurreição|abaixo de metade|abaixo da metade/);
  assert.match(magia('ferida-terminal').efeito, /Sangramento/);
  assert.match(magia('zona-de-deterioracao').efeito, /até -10/);
  const fusao = (magiasData.fusoes as any[]).find((item) => item.id === 'encerramento');
  assert.equal(fusao.titulo, 'Encerramento Rápido');
  const loja = (catalogoLoja as any).entradas;
  for (const id of ['fruto-fim', 'selo-fechamento']) {
    assert.equal(loja.find((item: any) => item.id === id).conteudo.requer_autorizacao_mestre, true, id);
  }
  const adeus = (magiasData.rituais as any[]).find((item) => item.id === 'ultimo-adeus');
  assert.equal(adeus.ingredientes[0].item_id, 'comp-lembranca-do-morto');
  assert.ok(loja.find((item: any) => item.id === 'comp-lembranca-do-morto'));
});
