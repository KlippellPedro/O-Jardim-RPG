import assert from 'node:assert/strict';
import test from 'node:test';
import {
  ApiError,
  MENSAGEM_DEMORA,
  MENSAGEM_SEM_CONEXAO,
  api,
  traduzirFalhaDeRede,
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
