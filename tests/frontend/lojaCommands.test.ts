import test from 'node:test';
import assert from 'node:assert/strict';

(globalThis as any).document = { cookie: '' };

const { hasVerifiableShopOrigin, lojaApi, prepareCheckoutAttempt } = await import('../../src/services/lojaApi.ts');
const {
  calcularValorRevenda,
  itemCorrespondeBusca,
  itemCorrespondeSubfiltro,
  itemEhVeiculoCompleto,
  lerRaridadeChave,
  mapearCatalogoLoja,
  normalizarCategoriaInventarioLoja,
  normalizarRaridadeChave,
  obterBonusDefesaCatalogo,
  personagemAtendeRequisitosLoja,
  personagemPodeAdquirirItemLoja,
  rotuloRaridadeChave,
  somarPrecosNativos,
} = await import('../../src/services/lojaCatalogService.ts');
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
    { item_id: 'potion', quantidade: 2, alvo_item_id: undefined },
    { item_id: 'sword', quantidade: 3, alvo_item_id: undefined },
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

test('localização integra a assinatura idempotente e aceita somente os quatro locais', () => {
  const base = {
    campanha_id: 'campaign-1', personagem_id: 'character-1', economia_versao_esperada: 7,
    localizacao_loja: 2, itens: [{ item_id: 'sword', quantidade: 1 }],
  };
  const first = prepareCheckoutAttempt(null, 'compra', base, () => 'first');
  const changed = prepareCheckoutAttempt(first, 'compra', { ...base, localizacao_loja: 3 }, () => 'second');
  assert.equal(first.payload.localizacao_loja, 2);
  assert.notEqual(first.payload.idempotencia, changed.payload.idempotencia);
  assert.throws(() => prepareCheckoutAttempt(null, 'compra', { ...base, localizacao_loja: 5 }), /localização/i);
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

test('raridade mítica mantém compatibilidade com a antiga chave relíquia', () => {
  assert.equal(normalizarRaridadeChave('Mítico'), 'reliquia');
  assert.equal(normalizarRaridadeChave('Relíquia'), 'reliquia');
  assert.equal(rotuloRaridadeChave('reliquia'), 'Mítico');
});

test('raridade desconhecida fica explícita e não é rebaixada visualmente para Comum', () => {
  assert.equal(lerRaridadeChave('ultrarraro'), null);
  assert.equal(rotuloRaridadeChave('ultrarraro'), 'Desconhecida');
  const [item] = mapearCatalogoLoja([{
    id: 'estranho', tipo: 'equipamento', titulo: 'Estranho',
    conteudo: { preco: 1, raridade: 'ultrarraro' }, preco: { moeda: 'Solares', valor: 1 },
  }]);
  assert.equal(item.raridade, 'Desconhecida');
  assert.equal(item.nivelLoja, 4);
});

test('armadura lê bonus, veículos completos e módulos mantêm identidades distintas', () => {
  assert.equal(obterBonusDefesaCatalogo({ bonus: '+4' }), '+4');
  assert.equal(obterBonusDefesaCatalogo({ defesa: 2 }), 2);
  assert.equal(normalizarCategoriaInventarioLoja({ tipo: 'veiculo' }), 'modulo-veicular');
  assert.equal(normalizarCategoriaInventarioLoja({ tipo: 'veiculo-completo' }), 'veiculo');
  assert.equal(itemEhVeiculoCompleto({ tipoOrigem: 'veiculo-completo', dadosBrutos: {} }), true);
  assert.equal(itemEhVeiculoCompleto({ tipoOrigem: 'veiculo', dadosBrutos: { subtipo: 'Estável' } }), false);
});

test('requisitos explícitos consideram nível e todas as classes do comprador', () => {
  const item = { requisitoNivel: 5, requisitoClasse: ['Piloto'] };
  assert.equal(personagemAtendeRequisitosLoja(item, { nivel: 5, classes: [{ id: 'piloto' }] }), true);
  assert.equal(personagemAtendeRequisitosLoja(item, { nivel: 4, classes: [{ id: 'piloto' }] }), false);
  assert.equal(personagemAtendeRequisitosLoja(item, { nivel: 8, classes: [{ id: 'guerreiro' }] }), false);
});

test('itens com autorização do Mestre só entram no carrinho para gestores', () => {
  const item = { dadosBrutos: { requer_autorizacao_mestre: true } };
  const personagem = { nivel: 10, classes: [{ id: 'piloto' }] };
  assert.equal(personagemPodeAdquirirItemLoja(item, personagem, false), false);
  assert.equal(personagemPodeAdquirirItemLoja(item, personagem, true), true);
});

test('subfiltros reconhecem veículos pelo tipo real e Frutos pelos marcadores', () => {
  const [veiculoCompleto, modulo, frutoElemental, frutoMutacao] = mapearCatalogoLoja([
    {
      id: 'moto', tipo: 'veiculo-completo', titulo: 'Moto',
      conteudo: { preco: 100, raridade: 'incomum', subtipo: 'completo' },
      preco: { moeda: 'Solares', valor: 100 },
    },
    {
      id: 'motor', tipo: 'veiculo', titulo: 'Motor',
      conteudo: { preco: 50, raridade: 'comum', sistema: 'Núcleo', subtipo: 'Estável' },
      preco: { moeda: 'Solares', valor: 50 },
    },
    {
      id: 'chamas', tipo: 'fruto-eden', titulo: 'Chamas',
      conteudo: { preco: 10, raridade: 'raro', atributos: ['Sobrenatural', 'Elemental'] },
      preco: { moeda: 'Fragmentos de Estrela', valor: 10 },
    },
    {
      id: 'dragao', tipo: 'fruto-eden', titulo: 'Dragão',
      conteudo: { preco: 20, raridade: 'raro', atributos: ['Mutação', 'Mitológico'] },
      preco: { moeda: 'Fragmentos de Estrela', valor: 20 },
    },
  ]);

  assert.equal(itemCorrespondeSubfiltro(veiculoCompleto, 'Bens', 'Veículos Completos'), true);
  assert.equal(itemCorrespondeSubfiltro(veiculoCompleto, 'Bens', 'Peças e Módulos'), false);
  assert.equal(itemCorrespondeSubfiltro(modulo, 'Bens', 'Peças e Módulos'), true);
  assert.equal(itemCorrespondeSubfiltro(frutoElemental, 'Frutos do Éden', 'Elemental'), true);
  assert.equal(itemCorrespondeSubfiltro(frutoElemental, 'Frutos do Éden', 'Mutação'), false);
  assert.equal(itemCorrespondeSubfiltro(frutoMutacao, 'Frutos do Éden', 'Mutação'), true);
});

test('arma híbrida aparece tanto no subfiltro corpo a corpo quanto à distância', () => {
  const [hibrida] = mapearCatalogoLoja([{
    id: 'rhaast', tipo: 'arma', titulo: 'Rhaast',
    conteudo: { preco: 1, raridade: 'lendario', modo: 'Híbrida' },
    preco: { moeda: 'Solares', valor: 1 },
  }]);
  assert.equal(itemCorrespondeSubfiltro(hibrida, 'Armas', 'Corpo a Corpo'), true);
  assert.equal(itemCorrespondeSubfiltro(hibrida, 'Armas', 'À Distância'), true);
});

test('selos aparecem pelo subfiltro e pela busca no plural', () => {
  const [selo] = mapearCatalogoLoja([{
    id: 'selo-teste', tipo: 'consumivel', titulo: 'Selo: Teste',
    conteudo: {
      preco: 120,
      raridade: 'incomum',
      subtipo: 'selo',
      atributos: ['Selo', 'Fluxo: Origem'],
      descricao: 'Selo consumível para testes.',
    },
    preco: { moeda: 'Solares', valor: 120 },
  }]);

  assert.equal(selo.categoria, 'Consumíveis');
  assert.equal(itemCorrespondeSubfiltro(selo, 'Consumíveis', 'Selos'), true);
  assert.equal(itemCorrespondeBusca(selo, 'selos'), true);
});

// Espelha plataforma/core/economy_commands.py::resolve_catalog_price: um número
// puro em conteudo.preco vira Solares; só um objeto de uma chave declara outra
// moeda. É o único lugar que decide a moeda — testar com um preco fabricado
// (como {moeda:'Lunaris', valor:N}) esconderia um conteudo.preco errado.
const resolverPrecoComoBackend = (conteudoPreco: unknown): { moeda: string; valor: number } => {
  if (typeof conteudoPreco === 'number' && Number.isInteger(conteudoPreco) && conteudoPreco > 0) {
    return { moeda: 'Solares', valor: conteudoPreco };
  }
  if (conteudoPreco && typeof conteudoPreco === 'object' && Object.keys(conteudoPreco).length === 1) {
    const [moeda, valor] = Object.entries(conteudoPreco as Record<string, unknown>)[0];
    if (typeof valor === 'number' && Number.isInteger(valor) && valor > 0) return { moeda, valor };
  }
  throw new Error(`preço de catálogo inválido: ${JSON.stringify(conteudoPreco)}`);
};

test('modificações viram categoria própria, com nível de loja pelo tipo da modificação', async () => {
  const catalogo = (await import('../../data/loja/catalogo.json', { with: { type: 'json' } })).default as any;
  const entradas = catalogo.entradas
    .filter((entrada: any) => entrada.tipo === 'modificacao')
    .map((entrada: any) => ({ ...entrada, preco: resolverPrecoComoBackend(entrada.conteudo.preco) }));
  const modificacoes = mapearCatalogoLoja(entradas);

  assert.equal(modificacoes.length, 51);
  assert.ok(modificacoes.every((item) => item.categoria === 'Modificações'));
  assert.ok(modificacoes.every((item) => item.valorOriginal > 0 && item.moedaPreco === 'Lunaris'));

  // Marcial mexe em número grande e só se acha da Metrópole para cima;
  // efeitos épicos ou proibidos avançam ao Mercado Negro.
  const marciais = modificacoes.filter((item) => item.dadosBrutos?.nivel_modificacao === 'marcial');
  assert.ok(marciais.every((item) => item.nivelLoja >= 2));
  assert.equal(modificacoes.find((item) => item.id === 'mod-balanceada')?.nivelLoja, 1);
  assert.equal(modificacoes.find((item) => item.id === 'mod-assombrada')?.nivelLoja, 2);
  assert.equal(modificacoes.find((item) => item.id === 'mod-vampirica')?.nivelLoja, 3);
  assert.equal(modificacoes.find((item) => item.id === 'mod-selado')?.nivelLoja, 3);

  const afiada = modificacoes.find((item) => item.id === 'mod-afiada');
  assert.ok(afiada);
  assert.equal(afiada.valorOriginal, 60);
  assert.match(afiada.descricao, /dado de dano/);
  assert.equal(itemCorrespondeSubfiltro(afiada, 'Modificações', 'Armas'), true);
  assert.equal(itemCorrespondeSubfiltro(afiada, 'Modificações', 'Escudos'), false);
  assert.equal(itemCorrespondeSubfiltro(afiada, 'Modificações', 'Comuns'), true);
  assert.equal(itemCorrespondeSubfiltro(afiada, 'Modificações', 'Marciais'), false);
});

test('todo item declara a loja mínima e a Vila fica restrita ao catálogo simples', async () => {
  const catalogo = (await import('../../data/loja/catalogo.json', { with: { type: 'json' } })).default as any;
  const entradas = catalogo.entradas as any[];
  const nivel = (item: any) => item.conteudo?.nivelMinimoLoja;
  const normalizar = (valor: unknown) => String(valor ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();

  assert.equal(entradas.length, 462);
  assert.ok(entradas.every((item) => Number.isInteger(nivel(item)) && nivel(item) >= 1 && nivel(item) <= 4));
  assert.ok([1, 2, 3, 4].every((loja) => entradas.some((item) => nivel(item) === loja)));

  const vila = entradas.filter((item) => nivel(item) === 1);
  assert.ok(vila.filter((item) => item.tipo === 'arma').every((item) => item.conteudo.subtipo === 'simples'));
  assert.ok(vila.filter((item) => item.tipo === 'monstro').every((item) => ['Criatura', 'Ajudante'].includes(item.conteudo.classe)));
  assert.ok(vila.every((item) => !['artefato', 'fruto-eden', 'implante', 'propriedade', 'veiculo', 'veiculo-completo'].includes(item.tipo)));
  assert.ok(vila.every((item) => !/(plasma|antimateria|monomolecular|contrabando|mercado negro)/.test(normalizar([
    item.titulo,
    item.conteudo?.descricao,
    item.conteudo?.material,
  ].join(' ')))));

  assert.equal(nivel(entradas.find((item) => item.id === 'arma-chicote-plasma')), 3);
  assert.equal(nivel(entradas.find((item) => item.id === 'arma-sniper-antimateria')), 4);
  assert.ok(entradas.filter((item) => item.tipo === 'fruto-eden').every((item) => nivel(item) === 4));
  assert.ok(entradas.filter((item) => normalizar(item.conteudo?.raridade) === 'lendario').every((item) => nivel(item) === 4));
  assert.ok(entradas.filter((item) => ['veiculo', 'veiculo-completo'].includes(item.tipo)).every((item) => nivel(item) >= 2));
});

test('preço da Loja acompanha a faixa de valor publicada nas regras, em Lunaris', async () => {
  const { PRECO_MODIFICACAO_POR_VALOR } = await import('../../data/regras/raridadesEquipamentos.ts');
  const catalogo = (await import('../../data/loja/catalogo.json', { with: { type: 'json' } })).default as any;
  const modificacoes = catalogo.entradas.filter((entrada: any) => entrada.tipo === 'modificacao');

  modificacoes.forEach((entrada: any) => {
    // Precisa ser objeto {"Lunaris": N}: um número puro no catálogo vira
    // Solares por convenção do servidor (resolve_catalog_price), o que já
    // aconteceu aqui uma vez e só apareceu testando contra a API real.
    assert.deepEqual(
      entrada.conteudo.preco,
      { Lunaris: PRECO_MODIFICACAO_POR_VALOR[entrada.conteudo.valor_efeito as 0 | 1 | 2 | 3] },
      `${entrada.id} fora da faixa de preço ou não declarado em Lunaris`,
    );
  });
});

test('equipamentos mágicos não são classificados como consumíveis', () => {
  const [manto, pocao, corda] = mapearCatalogoLoja([
    {
      id: 'manto-das-sombras', tipo: 'equipamento', titulo: 'Manto das Sombras',
      conteudo: { preco: 250, raridade: 'epico', categoria_loja: 'Artefatos Mágicos', material: 'Seda Sombria' },
      preco: { moeda: 'Solares', valor: 250 },
    },
    {
      id: 'pocao-cura-menor', tipo: 'equipamento', titulo: 'Poção de Cura Menor',
      conteudo: { preco: 20, raridade: 'comum', descricao: 'Restaura Vida. (1 uso)' },
      preco: { moeda: 'Solares', valor: 20 },
    },
    {
      id: 'corda-de-escalada', tipo: 'equipamento', titulo: 'Corda de Escalada',
      conteudo: { preco: 10, raridade: 'comum', material: 'Cânhamo' },
      preco: { moeda: 'Solares', valor: 10 },
    },
  ]);

  assert.equal(manto.categoria, 'Artefatos Mágicos');
  assert.equal(pocao.categoria, 'Consumíveis');
  assert.equal(corda.categoria, 'Outros');
});

test('promoção só aparece quando preço anterior e moeda são válidos', () => {
  const [promocional, inconsistente] = mapearCatalogoLoja([
    {
      id: 'oferta', tipo: 'arma', titulo: 'Oferta',
      conteudo: { preco: 80, preco_original: 100, promocao: { ativa: true, rotulo: 'Oferta real' } },
      preco: { moeda: 'Solares', valor: 80 },
    },
    {
      id: 'forjado', tipo: 'arma', titulo: 'Forjado',
      conteudo: { preco: 80, preco_original: { Lunaris: 100 }, promocao: { ativa: true } },
      preco: { moeda: 'Solares', valor: 80 },
    },
  ]);

  assert.equal(promocional.precoAnterior, 100);
  assert.deepEqual(promocional.promocao, { rotulo: 'Oferta real', descontoPercentual: 20 });
  assert.equal(inconsistente.promocao, undefined);
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
