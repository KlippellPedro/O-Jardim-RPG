import test from 'node:test';
import assert from 'node:assert/strict';

class MemoryStorage {
  private readonly values = new Map<string, string>();

  getItem(key: string): string | null {
    return this.values.get(key) ?? null;
  }

  setItem(key: string, value: string): void {
    this.values.set(key, value);
  }

  removeItem(key: string): void {
    this.values.delete(key);
  }

  clear(): void {
    this.values.clear();
  }
}

const storage = new MemoryStorage();
(globalThis as any).localStorage = storage;
(globalThis as any).window = { localStorage: storage };
(globalThis as any).document = { cookie: '' };

const { useCharacterStore } = await import('../../src/store/useCharacterStore.ts');
const { useAuthStore } = await import('../../src/store/useAuthStore.ts');

function jsonResponse(status: number, payload: unknown): Response {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { 'content-type': 'application/json' },
  });
}

function deferred(): { promise: Promise<void>; resolve: () => void } {
  let resolve!: () => void;
  const promise = new Promise<void>((done) => { resolve = done; });
  return { promise, resolve };
}

async function until(predicate: () => boolean): Promise<void> {
  for (let attempt = 0; attempt < 50; attempt += 1) {
    if (predicate()) return;
    await new Promise<void>((resolve) => setTimeout(resolve, 0));
  }
  throw new Error('A condição de teste não foi atingida.');
}

function makeCharacter(id: string) {
  return {
    id,
    nome: 'Aster',
    nivel: 1,
    versao: 1,
    ficha: { historia: 'base', nivel: 1 },
    criadoEm: '2026-01-01T00:00:00Z',
    atualizadoEm: '2026-01-01T00:00:00Z',
    derivados: { vida: 10, mana: 5, movimento: 6 },
    economiaVersao: 1,
    carteira: [{ moeda: 'Lunaris', saldo: 0 }],
    inventarioCentral: [],
  };
}

function resetStore(character: ReturnType<typeof makeCharacter>): void {
  storage.clear();
  useCharacterStore.setState({
    characters: [character],
    isLoading: false,
    error: null,
    persistence: {},
  });
}

test('edição durante PUT cria um segundo lote serial com a versão devolvida', async () => {
  const character = makeCharacter('sheet-in-flight');
  resetStore(character);
  const firstResponse = deferred();
  const bodies: any[] = [];
  let activeRequests = 0;
  let maxActiveRequests = 0;

  globalThis.fetch = (async (_input: RequestInfo | URL, init?: RequestInit) => {
    const body = JSON.parse(String(init?.body));
    bodies.push(body);
    activeRequests += 1;
    maxActiveRequests = Math.max(maxActiveRequests, activeRequests);
    const version = bodies.length + 1;
    if (bodies.length === 1) await firstResponse.promise;
    activeRequests -= 1;
    return jsonResponse(200, {
      personagem: {
        id: character.id,
        nome: body.nome,
        ficha: body.ficha,
        versao: version,
        atualizado_em: `2026-01-01T00:00:0${version}Z`,
      },
    });
  }) as typeof fetch;

  assert.equal(
    useCharacterStore.getState().patchCharacter(character.id, ['ficha', 'historia'], 'primeira'),
    true,
  );
  const flushing = useCharacterStore.getState().flushCharacterSaves(character.id);
  await until(() => bodies.length === 1);

  useCharacterStore.getState().patchCharacter(character.id, ['ficha', 'historia'], 'segunda');
  assert.equal(useCharacterStore.getState().characters[0].ficha?.historia, 'segunda');
  firstResponse.resolve();

  assert.equal(await flushing, true);
  assert.equal(maxActiveRequests, 1);
  assert.deepEqual(bodies.map((body) => body.versao_esperada), [1, 2]);
  assert.deepEqual(bodies.map((body) => body.ficha.historia), ['primeira', 'segunda']);

  const saved = useCharacterStore.getState().characters[0];
  assert.equal(saved.versao, 3);
  assert.equal(saved.ficha?.historia, 'segunda');
  assert.deepEqual(saved.carteira, character.carteira);
  assert.equal(saved.economiaVersao, 1);
  assert.equal(storage.getItem(`oj_rpg_sheet_draft_v1_${character.id}`), null);
});

test('mutações econômicas simultâneas compõem o estado e usam uma única requisição por vez', async () => {
  const character = makeCharacter('economy-in-flight');
  resetStore(character);
  const firstResponse = deferred();
  const bodies: any[] = [];
  let activeRequests = 0;
  let maxActiveRequests = 0;

  globalThis.fetch = (async (_input: RequestInfo | URL, init?: RequestInit) => {
    const body = JSON.parse(String(init?.body));
    bodies.push(body);
    activeRequests += 1;
    maxActiveRequests = Math.max(maxActiveRequests, activeRequests);
    const version = bodies.length + 1;
    if (bodies.length === 1) await firstResponse.promise;
    activeRequests -= 1;
    return jsonResponse(200, {
      economia_versao: version,
      carteira: [{ moeda: 'Lunaris', saldo: version - 1 }],
      inventario: [],
    });
  }) as typeof fetch;

  const increment = () => useCharacterStore.getState().mutateEconomy(character.id, (current) => ({
    ...current,
    carteira: current.carteira.map((wallet) => ({ ...wallet, saldo: wallet.saldo + 1 })),
  }));

  const firstMutation = increment();
  await until(() => bodies.length === 1);
  const secondMutation = increment();
  assert.equal(useCharacterStore.getState().characters[0].carteira?.[0].saldo, 2);
  firstResponse.resolve();

  assert.deepEqual(await Promise.all([firstMutation, secondMutation]), [true, true]);
  assert.equal(maxActiveRequests, 1);
  assert.deepEqual(bodies.map((body) => body.versao_esperada), [1, 2]);
  assert.deepEqual(bodies.map((body) => body.operacoes), [
    [{
      tipo: 'ajustar_saldo',
      moeda: 'Lunaris',
      delta: 1,
      motivo: 'Ajuste manual autorizado na ficha',
    }],
    [{
      tipo: 'ajustar_saldo',
      moeda: 'Lunaris',
      delta: 1,
      motivo: 'Ajuste manual autorizado na ficha',
    }],
  ]);
  assert.equal(bodies.some((body) => 'carteira' in body || 'inventario' in body), false);

  const saved = useCharacterStore.getState().characters[0];
  assert.equal(saved.economiaVersao, 3);
  assert.equal(saved.carteira?.[0].saldo, 2);
  assert.equal(saved.versao, 1);
  assert.equal(saved.ficha?.historia, 'base');
});

test('recarregar após comando externo atualiza a versão base da próxima operação', async () => {
  const character = makeCharacter('economy-after-shop');
  resetStore(character);
  useAuthStore.setState({
    campanhaAtiva: { id: 'campaign-1', nome: 'Campanha', papel: 'player' },
  });
  const operationBodies: any[] = [];
  let operationCount = 0;

  globalThis.fetch = (async (_input: RequestInfo | URL, init?: RequestInit) => {
    const method = init?.method ?? 'GET';
    if (method === 'GET') {
      return jsonResponse(200, {
        personagens: [{
          id: character.id,
          nome: character.nome,
          ficha: character.ficha,
          versao: 1,
          economia_versao: 3,
          carteira: [{ moeda: 'Lunaris', saldo: 5 }],
          inventario_central: [],
          criado_em: character.criadoEm,
          atualizado_em: character.atualizadoEm,
        }],
      });
    }

    const body = JSON.parse(String(init?.body));
    operationBodies.push(body);
    operationCount += 1;
    return jsonResponse(200, {
      economia_versao: operationCount === 1 ? 2 : 4,
      carteira: [{ moeda: 'Lunaris', saldo: operationCount === 1 ? 1 : 6 }],
      inventario: [],
    });
  }) as typeof fetch;

  const increment = () => useCharacterStore.getState().mutateEconomy(character.id, (current) => ({
    ...current,
    carteira: current.carteira.map((wallet) => ({ ...wallet, saldo: wallet.saldo + 1 })),
  }));

  assert.equal(await increment(), true);
  await useCharacterStore.getState().fetchCharacters();
  assert.equal(useCharacterStore.getState().characters[0].economiaVersao, 3);
  assert.equal(useCharacterStore.getState().characters[0].carteira?.[0].saldo, 5);

  assert.equal(await increment(), true);
  assert.deepEqual(operationBodies.map((body) => body.versao_esperada), [1, 3]);
  assert.deepEqual(operationBodies[1].operacoes, [{
    tipo: 'ajustar_saldo',
    moeda: 'Lunaris',
    delta: 1,
    motivo: 'Ajuste manual autorizado na ficha',
  }]);
});

test('409 preserva o rascunho local e só sobrescreve após decisão explícita', async () => {
  const character = makeCharacter('sheet-conflict');
  resetStore(character);
  const remote = {
    id: character.id,
    nome: character.nome,
    ficha: { historia: 'alterada em outro dispositivo', nivel: 1 },
    versao: 2,
    economia_versao: 1,
    carteira: character.carteira,
    inventario_central: character.inventarioCentral,
    atualizado_em: '2026-01-01T00:00:02Z',
  };
  const putBodies: any[] = [];

  globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
    const method = init?.method ?? 'GET';
    if (method === 'GET') return jsonResponse(200, { personagem: remote });

    const body = JSON.parse(String(init?.body));
    putBodies.push(body);
    if (putBodies.length === 1) {
      return jsonResponse(409, {
        detail: { mensagem: 'a ficha foi alterada em outro lugar', versao_atual: 2 },
      });
    }
    assert.equal(String(input).endsWith(`/${character.id}`), true);
    return jsonResponse(200, {
      personagem: {
        ...remote,
        nome: body.nome,
        ficha: body.ficha,
        versao: 3,
      },
    });
  }) as typeof fetch;

  useCharacterStore.getState().patchCharacter(
    character.id,
    ['ficha', 'historia'],
    'meu rascunho local',
  );
  assert.equal(await useCharacterStore.getState().flushCharacterSaves(character.id), false);

  let local = useCharacterStore.getState().characters[0];
  assert.equal(local.ficha?.historia, 'meu rascunho local');
  assert.equal(local.versao, 1);
  assert.equal(useCharacterStore.getState().persistence[character.id].sheet.phase, 'conflict');
  assert.notEqual(storage.getItem(`oj_rpg_sheet_draft_v1_${character.id}`), null);

  assert.equal(
    await useCharacterStore.getState().resolveCharacterConflict(character.id, 'sheet', 'overwrite'),
    true,
  );
  local = useCharacterStore.getState().characters[0];
  assert.equal(putBodies[1].versao_esperada, 2);
  assert.equal(local.ficha?.historia, 'meu rascunho local');
  assert.equal(local.versao, 3);
  assert.equal(useCharacterStore.getState().persistence[character.id].sheet.phase, 'saved');
  assert.equal(storage.getItem(`oj_rpg_sheet_draft_v1_${character.id}`), null);
});

test('sincronização ao vivo aplica versão remota e atualiza a base do próximo autosave', async () => {
  const character = makeCharacter('live-remote-update');
  resetStore(character);
  const bodies: any[] = [];

  globalThis.fetch = (async (_input: RequestInfo | URL, init?: RequestInit) => {
    const method = init?.method ?? 'GET';
    if (method === 'GET') {
      return jsonResponse(200, {
        personagem: {
          ...character,
          ficha: { ...character.ficha, historia: 'alterada pelo mestre' },
          versao: 2,
          economia_versao: 1,
          carteira: character.carteira,
          inventario_central: character.inventarioCentral,
          atualizado_em: '2026-01-01T00:00:02Z',
        },
      });
    }

    const body = JSON.parse(String(init?.body));
    bodies.push(body);
    return jsonResponse(200, {
      personagem: {
        ...character,
        nome: body.nome,
        ficha: body.ficha,
        versao: 3,
        economia_versao: 1,
        atualizado_em: '2026-01-01T00:00:03Z',
      },
    });
  }) as typeof fetch;

  assert.equal(
    await useCharacterStore.getState().syncRemoteCharacter(character.id, 2),
    'updated',
  );
  let current = useCharacterStore.getState().characters[0];
  assert.equal(current.versao, 2);
  assert.equal(current.ficha?.historia, 'alterada pelo mestre');

  useCharacterStore.getState().patchCharacter(character.id, ['ficha', 'historia'], 'resposta do jogador');
  assert.equal(await useCharacterStore.getState().flushCharacterSaves(character.id), true);
  assert.equal(bodies[0].versao_esperada, 2);
  current = useCharacterStore.getState().characters[0];
  assert.equal(current.versao, 3);
  assert.equal(current.ficha?.historia, 'resposta do jogador');
});

test('eco SSE da versão já aplicada não faz nova requisição', async () => {
  const character = makeCharacter('live-own-echo');
  resetStore(character);
  let requests = 0;
  globalThis.fetch = (async () => {
    requests += 1;
    throw new Error('não deveria buscar o próprio eco');
  }) as typeof fetch;

  assert.equal(
    await useCharacterStore.getState().syncRemoteCharacter(character.id, character.versao),
    'unchanged',
  );
  assert.equal(requests, 0);
});

test('evento remoto aguarda o autosave local sem apagar o rascunho', async () => {
  const character = makeCharacter('live-deferred-draft');
  resetStore(character);
  let getRequests = 0;

  globalThis.fetch = (async (_input: RequestInfo | URL, init?: RequestInit) => {
    const method = init?.method ?? 'GET';
    if (method === 'GET') {
      getRequests += 1;
      return jsonResponse(500, { detail: 'não deveria buscar com rascunho pendente' });
    }
    const body = JSON.parse(String(init?.body));
    return jsonResponse(200, {
      personagem: {
        ...character,
        nome: body.nome,
        ficha: body.ficha,
        versao: 2,
        economia_versao: 1,
      },
    });
  }) as typeof fetch;

  useCharacterStore.getState().patchCharacter(character.id, ['ficha', 'historia'], 'rascunho local');
  assert.equal(
    await useCharacterStore.getState().syncRemoteCharacter(character.id, 2),
    'deferred',
  );
  assert.equal(getRequests, 0);
  assert.equal(useCharacterStore.getState().characters[0].ficha?.historia, 'rascunho local');
  assert.notEqual(storage.getItem(`oj_rpg_sheet_draft_v1_${character.id}`), null);

  assert.equal(await useCharacterStore.getState().flushCharacterSaves(character.id), true);
  assert.equal(storage.getItem(`oj_rpg_sheet_draft_v1_${character.id}`), null);
});

test('edição iniciada durante o GET impede aplicar a resposta remota', async () => {
  const character = makeCharacter('live-edit-during-get');
  resetStore(character);
  const getResponse = deferred();

  globalThis.fetch = (async (_input: RequestInfo | URL, init?: RequestInit) => {
    const method = init?.method ?? 'GET';
    if (method === 'GET') {
      await getResponse.promise;
      return jsonResponse(200, {
        personagem: {
          ...character,
          ficha: { ...character.ficha, historia: 'versão remota' },
          versao: 2,
          economia_versao: 1,
          carteira: character.carteira,
          inventario_central: character.inventarioCentral,
        },
      });
    }
    const body = JSON.parse(String(init?.body));
    return jsonResponse(200, {
      personagem: {
        ...character,
        nome: body.nome,
        ficha: body.ficha,
        versao: 2,
        economia_versao: 1,
      },
    });
  }) as typeof fetch;

  const synchronizing = useCharacterStore.getState().syncRemoteCharacter(character.id, 2);
  await Promise.resolve();
  useCharacterStore.getState().patchCharacter(character.id, ['ficha', 'historia'], 'edição durante a busca');
  getResponse.resolve();

  assert.equal(await synchronizing, 'deferred');
  assert.equal(useCharacterStore.getState().characters[0].ficha?.historia, 'edição durante a busca');
  assert.equal(useCharacterStore.getState().characters[0].versao, 1);
  assert.equal(await useCharacterStore.getState().flushCharacterSaves(character.id), true);
});

test('sincronização pede nova tentativa quando o GET ainda não alcançou a versão do evento', async () => {
  const character = makeCharacter('live-stale-read');
  resetStore(character);

  globalThis.fetch = (async () => jsonResponse(200, {
    personagem: {
      ...character,
      ficha: { ...character.ficha, historia: 'versão intermediária' },
      versao: 2,
      economia_versao: 1,
      carteira: character.carteira,
      inventario_central: character.inventarioCentral,
    },
  })) as typeof fetch;

  assert.equal(
    await useCharacterStore.getState().syncRemoteCharacter(character.id, 3),
    'retry',
  );
  const current = useCharacterStore.getState().characters[0];
  assert.equal(current.versao, 1);
  assert.equal(current.ficha?.historia, 'base');
});
