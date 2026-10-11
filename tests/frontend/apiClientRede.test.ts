import assert from 'node:assert/strict';
import test from 'node:test';
import {
  ApiError,
  MENSAGEM_DEMORA,
  MENSAGEM_RESPOSTA_INCOMPLETA,
  MENSAGEM_SEM_CONEXAO,
  api,
  traduzirFalhaDeRede,
  type IDetalheDeRespostaVazia,
} from '../../src/services/apiClient';

test('sem rede, o erro do navegador vira um texto que a pessoa entende', () => {
  const traduzido = traduzirFalhaDeRede(new TypeError('Failed to fetch'));
  assert.ok(traduzido instanceof ApiError);
  assert.equal(traduzido.message, MENSAGEM_SEM_CONEXAO);
  assert.equal(traduzido.status, 0, 'status 0: a resposta nunca chegou');
});

test('estouro do tempo limite também ganha texto próprio', () => {
  const traduzido = traduzirFalhaDeRede(new DOMException('signal timed out', 'TimeoutError'));
  assert.ok(traduzido instanceof ApiError);
  assert.equal(traduzido.message, MENSAGEM_DEMORA);
  assert.equal(traduzido.status, 0);
});

test('cancelar de propósito segue como AbortError, porque quem cancela depende do nome', () => {
  const cancelamento = new DOMException('aborted', 'AbortError');
  assert.equal(traduzirFalhaDeRede(cancelamento), cancelamento);
  assert.equal((traduzirFalhaDeRede(cancelamento) as DOMException).name, 'AbortError');
});

test('qualquer outro erro passa intacto', () => {
  const outro = new Error('bug nosso');
  assert.equal(traduzirFalhaDeRede(outro), outro);
  assert.equal(traduzirFalhaDeRede('texto solto'), 'texto solto');
});

test('api() devolve o texto amigável quando o fetch falha de verdade', async () => {
  const fetchOriginal = globalThis.fetch;
  (globalThis as { document?: unknown }).document = { cookie: '' };
  globalThis.fetch = (async () => { throw new TypeError('Failed to fetch'); }) as typeof fetch;
  try {
    await assert.rejects(
      () => api('/contexto'),
      (erro: unknown) => erro instanceof ApiError && erro.message === MENSAGEM_SEM_CONEXAO && erro.status === 0,
    );
  } finally {
    globalThis.fetch = fetchOriginal;
    delete (globalThis as { document?: unknown }).document;
  }
});

test('api() não mexe no cancelamento do chamador', async () => {
  const fetchOriginal = globalThis.fetch;
  (globalThis as { document?: unknown }).document = { cookie: '' };
  globalThis.fetch = (async () => { throw new DOMException('aborted', 'AbortError'); }) as typeof fetch;
  try {
    await assert.rejects(
      () => api('/contexto', { signal: new AbortController().signal }),
      (erro: unknown) => erro instanceof DOMException && erro.name === 'AbortError',
    );
  } finally {
    globalThis.fetch = fetchOriginal;
    delete (globalThis as { document?: unknown }).document;
  }
});

// ---------------------------------------------------------------- resposta "ok" sem corpo utilizável

const comFetch = (resposta: () => unknown) => {
  const fetchOriginal = globalThis.fetch;
  (globalThis as { document?: unknown }).document = { cookie: '' };
  globalThis.fetch = (async () => resposta()) as typeof fetch;
  return () => {
    globalThis.fetch = fetchOriginal;
    delete (globalThis as { document?: unknown }).document;
  };
};

const jsonOk = () => new Response('{"a":1}', { status: 200, headers: { 'content-type': 'application/json' } });
const html200 = () => new Response('<html></html>', { status: 200, headers: { 'content-type': 'text/html' } });

test('exigirCorpo: resposta ok em HTML vira ApiError (status 0) com o que o navegador recebeu', async () => {
  const restaurar = comFetch(html200);
  try {
    await assert.rejects(
      () => api('/calendario/x', { exigirCorpo: true }),
      (erro: unknown) => erro instanceof ApiError
        && erro.message === MENSAGEM_RESPOSTA_INCOMPLETA
        && erro.status === 0
        && (erro.details as IDetalheDeRespostaVazia).http === 200
        && (erro.details as IDetalheDeRespostaVazia).tipo === 'text/html'
        && (erro.details as IDetalheDeRespostaVazia).motivo === 'tipo inesperado',
    );
  } finally {
    restaurar();
  }
});

test('exigirCorpo: JSON cortado no meio e corpo vazio dizem o motivo', async () => {
  const cortado = comFetch(() => new Response('{"hoje":', { status: 200, headers: { 'content-type': 'application/json' } }));
  try {
    await assert.rejects(
      () => api('/calendario/x', { exigirCorpo: true }),
      (erro: unknown) => erro instanceof ApiError && (erro.details as IDetalheDeRespostaVazia).motivo === 'corpo ilegível (SyntaxError)',
    );
  } finally {
    cortado();
  }
  const vazio = comFetch(() => new Response(null, { status: 204 }));
  try {
    await assert.rejects(
      () => api('/calendario/x', { exigirCorpo: true }),
      (erro: unknown) => erro instanceof ApiError && (erro.details as IDetalheDeRespostaVazia).motivo === 'sem corpo',
    );
  } finally {
    vazio();
  }
});

test('exigirCorpo: estourar o tempo no meio do corpo é demora, e cancelar de propósito continua cancelamento', async () => {
  const corpoLento = (nome: string) => ({
    ok: true,
    status: 200,
    headers: new Headers({ 'content-type': 'application/json' }),
    json: async () => { throw new DOMException('x', nome); },
  });
  const demora = comFetch(() => corpoLento('TimeoutError'));
  try {
    await assert.rejects(
      () => api('/calendario/x', { exigirCorpo: true }),
      (erro: unknown) => erro instanceof ApiError && erro.message === MENSAGEM_DEMORA && erro.status === 0,
    );
  } finally {
    demora();
  }
  const cancelado = comFetch(() => corpoLento('AbortError'));
  try {
    await assert.rejects(
      () => api('/calendario/x', { exigirCorpo: true }),
      (erro: unknown) => erro instanceof DOMException && erro.name === 'AbortError',
    );
  } finally {
    cancelado();
  }
});

test('sem exigirCorpo nada muda: HTML ou 204 seguem devolvendo null, e JSON bom segue passando', async () => {
  for (const resposta of [html200, () => new Response(null, { status: 204 })]) {
    const restaurar = comFetch(resposta);
    try {
      assert.equal(await api('/qualquer'), null);
    } finally {
      restaurar();
    }
  }
  const restaurar = comFetch(jsonOk);
  try {
    assert.deepEqual(await api('/qualquer', { exigirCorpo: true }), { a: 1 });
  } finally {
    restaurar();
  }
});
