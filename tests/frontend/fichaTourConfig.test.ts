import assert from 'node:assert/strict';
import test from 'node:test';
import {
  FICHA_TOUR_TABS,
  lerAbasVistasTourFicha,
  obterPassosTourFicha,
  serializarAbasVistasTourFicha,
} from '../../src/pages/Ficha/fichaTourConfig';
import {
  LOJA_TOUR_STEPS,
  lojaTourJaVisto,
  serializarLojaTourVisto,
} from '../../src/pages/Loja/lojaTourConfig';

test('todas as abas da ficha têm um tour completo com alvos utilizáveis', () => {
  for (const aba of FICHA_TOUR_TABS) {
    const passos = obterPassosTourFicha(aba);
    assert.ok(passos.length >= 4, `${aba} precisa explicar seus blocos principais`);
    assert.ok(passos.length <= 12, `${aba} deve manter um número navegável de etapas`);
    assert.equal(new Set(passos.map((passo) => passo.id)).size, passos.length, `${aba} tem ids repetidos`);

    for (const passo of passos) {
      assert.ok(passo.titulo.trim().length > 0, `${aba} tem título vazio`);
      assert.ok(passo.descricao.trim().length > 0, `${aba} tem descrição vazia`);
      assert.ok(passo.alvos.some((alvo) => alvo.startsWith('[data-tour')), `${aba} tem alvo inválido`);
      assert.ok(passo.opcional === undefined || typeof passo.opcional === 'boolean', `${aba} tem opcional inválido`);
    }
  }
});

test('a introdução geral aparece apenas na aba principal', () => {
  assert.equal(obterPassosTourFicha('Ficha')[0].id, 'resumo-personagem');
  assert.equal(obterPassosTourFicha('Inventário')[0].id, 'aba-Inventário');
  assert.equal(obterPassosTourFicha('Magias')[0].titulo, 'Aba Magias');
});

test('o guia principal cobre atributos, recursos, combate e experiência', () => {
  const ids = new Set(obterPassosTourFicha('Ficha').map((passo) => passo.id));
  for (const id of ['ficha-atributos', 'ficha-recursos', 'ficha-combate', 'ficha-condicoes', 'ficha-experiencia']) {
    assert.ok(ids.has(id), `faltou a etapa ${id}`);
  }
});

test('blocos condicionais são marcados como opcionais', () => {
  const fruto = obterPassosTourFicha('Ficha').find((passo) => passo.id === 'ficha-fruto');
  const catalisadores = obterPassosTourFicha('Magias').find((passo) => passo.id === 'magias-catalisadores');
  const ocultos = obterPassosTourFicha('Poderes').find((passo) => passo.id === 'poderes-ocultos');
  assert.equal(fruto?.opcional, true);
  assert.equal(catalisadores?.opcional, true);
  assert.equal(ocultos?.opcional, true);
});

test('persistência ignora versões, valores e JSON inválidos', () => {
  assert.deepEqual([...lerAbasVistasTourFicha(null)], []);
  assert.deepEqual([...lerAbasVistasTourFicha('{incompleto')], []);
  assert.deepEqual([...lerAbasVistasTourFicha('{"versao":2,"abas":["Ficha"]}')], []);
  assert.deepEqual(
    [...lerAbasVistasTourFicha('{"versao":3,"abas":["Ficha","desconhecida",7,"Ficha"]}')],
    ['Ficha'],
  );
});

test('persistência serializa somente abas conhecidas e sem repetição', () => {
  const serializado = serializarAbasVistasTourFicha(['Ficha', 'Notas', 'Ficha']);
  assert.deepEqual(JSON.parse(serializado), { versao: 3, abas: ['Ficha', 'Notas'] });
});

test('o inventário explica o limite compartilhado de itens especiais', () => {
  const passo = obterPassosTourFicha('Inventário').find((item) => item.id === 'inventario-itens-especiais');
  assert.ok(passo);
  assert.match(passo.descricao, /nível total dividido por 4/i);
  assert.ok(passo.alvos.includes('[data-tour="inventario-itens-especiais"]'));
});

test('o guia da Loja cobre operação, regras, filtros, item e lote', () => {
  const ids = new Set(LOJA_TOUR_STEPS.map((passo) => passo.id));
  for (const id of ['mercados', 'operacoes', 'regras', 'filtros', 'catalogo', 'item', 'carrinho']) {
    assert.ok(ids.has(id), `faltou a etapa ${id}`);
  }
  assert.equal(lojaTourJaVisto(null), false);
  assert.equal(lojaTourJaVisto('{"versao":0,"concluido":true}'), false);
  assert.equal(lojaTourJaVisto(serializarLojaTourVisto()), true);
});
