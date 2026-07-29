import test from 'node:test';
import assert from 'node:assert/strict';

(globalThis as any).document = { cookie: '' };

const { hasVerifiableShopOrigin, lojaApi, prepareCheckoutAttempt } = await import('../../src/services/lojaApi.ts');
const {
  calcularValorRevenda,
  mapearCatalogoLoja,
  normalizarRaridadeChave,
  rotuloRaridadeChave,
  somarPrecosNativos,
} = await import('../../src/data/lojaCatalog.ts');
const { reivindicarRecompensa, resolverRecompensa } = await import('../../src/services/bountiesApi.ts');

function jsonResponse(payload: unknown): Response {
  return new Response(JSON.stringify(payload), {
    status: 200,
    headers: { 'content-type': 'application/json' },
  });
}

test('retry da mesma compra preserva payload e idempotência; alteração cria nova tentativa', () => {
  let generated = 0;
  const createId = () => `fixed-${++generated}`;
  const base = {
    campanha_id: 'campaign-1',
    personagem_id: 'character-1',
    economia_versao_esperada: 7,
    itens: [
      { item_id: 'sword', quantidade: 1 },
      { item_id: 'potion', quantidade: 2 },
      { item_id: 'sword', quantidade: 2 },
    ],
  };

  const first = prepareCheckoutAttempt(null, 'compra', base, createId);
  const retry = prepareCheckoutAttempt(first, 'compra', base, createId);
  assert.strictEqual(retry, first);
  assert.equal(first.payload.idempotencia, 'loja-compra:fixed-1');
  assert.deepEqual(first.payload.itens, [
    { item_id: 'potion', quantidade: 2 },
    { item_id: 'sword', quantidade: 3 },
  ]);
  assert.deepEqual(Object.keys(first.payload).sort(), [
    'campanha_id',
    'economia_versao_esperada',
    'idempotencia',
    'itens',
    'personagem_id',
  ]);

  const changed = prepareCheckoutAttempt(first, 'compra', {
    ...base,
    itens: [{ item_id: 'sword', quantidade: 4 }],
  }, createId);
  assert.notEqual(changed.payload.idempotencia, first.payload.idempotencia);
  assert.equal(generated, 2);
});

test('compra e venda enviam apenas comandos; nunca carteira, inventário, preço ou total', async () => {
  const requests: Array<{ url: string; method: string; body: Record<string, unknown> }> = [];
  globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
    requests.push({
      url: String(input),
      method: init?.method ?? 'GET',
      body: JSON.parse(String(init?.body)),
    });
    return jsonResponse({
      operacao_id: 'operation-1',
      repetida: false,
      economia_versao: 8,
      itens: [],
    });
  }) as typeof fetch;

  const payload = {
    campanha_id: 'campaign-1',
    personagem_id: 'character-1',
    economia_versao_esperada: 7,
    idempotencia: 'loja:test-operation',
    itens: [{ item_id: 'catalog-item', quantidade: 2 }],
  };
  await lojaApi.comprar(payload);
  await lojaApi.vender(payload);

  assert.deepEqual(requests.map(({ url, method }) => ({ url, method })), [
    { url: '/api/v1/loja/compras', method: 'POST' },
    { url: '/api/v1/loja/vendas', method: 'POST' },
  ]);
  for (const { body } of requests) {
    assert.deepEqual(Object.keys(body).sort(), [
      'campanha_id',
      'economia_versao_esperada',
      'idempotencia',
      'itens',
      'personagem_id',
    ]);
    for (const forbidden of ['carteira', 'inventario', 'preco', 'valor_total', 'saldo', 'metadados']) {
      assert.equal(forbidden in body, false);
    }
  }
});

test('catálogo visual é mapeado somente das entradas devolvidas pelo servidor', async () => {
  globalThis.fetch = (async (input: RequestInfo | URL) => {
    assert.equal(String(input), '/api/v1/loja/catalogo?campanha_id=campaign-1');
    return jsonResponse({
      itens: [{
        id: 'published-item',
        tipo: 'arma',
        titulo: 'Espada publicada',
        conteudo: { preco: 12, raridade: 'raro', descricao: 'Validada pelo servidor.' },
        preco: { moeda: 'Solares', valor: 12 },
      }],
    });
  }) as typeof fetch;

  const response = await lojaApi.listarCatalogo('campaign-1');
  const catalog = mapearCatalogoLoja(response.itens);
  assert.equal(catalog.length, 1);
  assert.equal(catalog[0].id, 'published-item');
  assert.equal(catalog[0].nome, 'Espada publicada');
  assert.equal(catalog[0].moedaPreco, 'Solares');
  assert.equal(catalog[0].valorOriginal, 12);
});

test('raridade de relíquia da criação aceita grafia canônica e acentuada', () => {
  assert.equal(normalizarRaridadeChave('Relíquia da Criação'), 'reliquia da criacao');
  assert.equal(normalizarRaridadeChave('reliquia da criacao'), 'reliquia da criacao');
  assert.equal(rotuloRaridadeChave('reliquia da criacao'), 'Relíquia da Criação');
});

test('recompensas enviam identidade e decisão, mas nunca o valor exibido', async () => {
  const bodies: Record<string, unknown>[] = [];
  globalThis.fetch = (async (_input: RequestInfo | URL, init?: RequestInit) => {
    bodies.push(JSON.parse(String(init?.body)));
    return jsonResponse({ status: 'ok' });
  }) as typeof fetch;

  await reivindicarRecompensa('campaign-1', {
    cacador_personagem_id: 'hunter-1',
    alvo_personagem_id: 'target-1',
    idempotencia: 'claim:fixed',
  });
  await resolverRecompensa('campaign-1', {
    claim_id: 'claim-1',
    aprovado: true,
    idempotencia: 'resolve:fixed',
  });

  assert.deepEqual(bodies, [
    {
      cacador_personagem_id: 'hunter-1',
      alvo_personagem_id: 'target-1',
      idempotencia: 'claim:fixed',
    },
    {
      claim_id: 'claim-1',
      aprovado: true,
      idempotencia: 'resolve:fixed',
    },
  ]);
  assert.equal(bodies.some((body) => 'valor_total' in body), false);
});

test('venda visual aceita somente item com proveniência canônica da loja', () => {
  assert.equal(hasVerifiableShopOrigin({
    item_id: 'catalog-item',
    dados: { origem: 'loja', catalogo_item_id: 'catalog-item' },
  }), true);
  assert.equal(hasVerifiableShopOrigin({
    item_id: 'catalog-item',
    dados: { origem: 'manual', catalogo_item_id: 'catalog-item' },
  }), false);
  assert.equal(hasVerifiableShopOrigin({
    item_id: 'forged-id',
    dados: { origem: 'loja', catalogo_item_id: 'catalog-item' },
  }), false);
  assert.equal(hasVerifiableShopOrigin({ item_id: 'legacy-item', dados: {} }), false);
});

test('estimativa mantém moedas separadas e revenda usa metade na moeda original', () => {
  const totals = somarPrecosNativos([
    { item: { moedaPreco: 'Fragmentos de Estrela', valorOriginal: 50 }, quantidade: 2 },
    { item: { moedaPreco: 'Créditos Sombrios', valorOriginal: 800 }, quantidade: 1 },
    { item: { moedaPreco: 'Fragmentos de Estrela', valorOriginal: 10 }, quantidade: 1 },
  ]);
  assert.deepEqual(totals, [
    { moeda: 'Fragmentos de Estrela', valor: 110 },
    { moeda: 'Créditos Sombrios', valor: 800 },
  ]);
  assert.equal(calcularValorRevenda(80), 40);
  assert.equal(calcularValorRevenda(3), 1);
});
