import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import vm from 'node:vm';
import { decidirSituacao, ehDispositivoIos } from '../../src/pwa/instalacao';

const raiz = path.resolve('.');
const publico = (caminho: string) => path.join(raiz, 'public', caminho.replace(/^\//, ''));

interface IconeDoManifest { src: string; sizes: string; type: string; purpose?: string }
interface AtalhoDoManifest { name: string; url: string; icons?: IconeDoManifest[] }
const manifesto = JSON.parse(fs.readFileSync(publico('manifest.webmanifest'), 'utf8')) as {
  name: string;
  short_name: string;
  start_url: string;
  scope: string;
  display: string;
  id: string;
  lang: string;
  background_color: string;
  theme_color: string;
  icons: IconeDoManifest[];
  shortcuts: AtalhoDoManifest[];
};

/** Largura e altura que o PNG declara no cabeçalho. */
const dimensoesDoPng = (arquivo: string): [number, number] => {
  const bytes = fs.readFileSync(arquivo);
  assert.equal(bytes.subarray(1, 4).toString('latin1'), 'PNG', `${arquivo} não é PNG`);
  return [bytes.readUInt32BE(16), bytes.readUInt32BE(20)];
};

test('o manifest tem o que o navegador exige para oferecer a instalação', () => {
  assert.equal(manifesto.name, 'O Jardim RPG');
  assert.ok(manifesto.short_name.length <= 12);
  assert.equal(manifesto.display, 'standalone');
  assert.equal(manifesto.lang, 'pt-BR');
  assert.equal(manifesto.id, '/');
  assert.equal(manifesto.scope, '/');
  assert.ok(manifesto.start_url.startsWith(manifesto.scope));
  assert.match(manifesto.theme_color, /^#[0-9a-f]{6}$/i);
  assert.match(manifesto.background_color, /^#[0-9a-f]{6}$/i);
});

test('os ícones do manifest existem e têm o tamanho que declaram', () => {
  for (const icone of manifesto.icons) {
    assert.ok(icone.src.startsWith('/'), icone.src);
    assert.ok(fs.existsSync(publico(icone.src)), `ícone ausente: ${icone.src}`);
    if (icone.type === 'image/png') {
      const [largura, altura] = dimensoesDoPng(publico(icone.src));
      assert.equal(`${largura}x${altura}`, icone.sizes, icone.src);
    }
  }
});

test('há ícone de 192 e de 512, os dois mascaráveis (o sistema pode cortar em círculo)', () => {
  for (const tamanho of ['192x192', '512x512']) {
    const icone = manifesto.icons.find((item) => item.sizes === tamanho && item.type === 'image/png');
    assert.ok(icone, `falta o ícone ${tamanho}`);
    assert.match(icone.purpose ?? '', /maskable/);
  }
});

test('os atalhos do ícone apontam para telas que existem e têm ícone', () => {
  assert.ok(manifesto.shortcuts.length >= 3);
  const app = fs.readFileSync(path.join(raiz, 'src/App.tsx'), 'utf8');
  for (const atalho of manifesto.shortcuts) {
    assert.ok(atalho.url.startsWith('/'), atalho.url);
    assert.ok(app.includes(`path="${atalho.url}"`), `rota inexistente no App: ${atalho.url}`);
    assert.ok(atalho.name.length > 0);
    for (const icone of atalho.icons ?? []) assert.ok(fs.existsSync(publico(icone.src)), `ícone de atalho ausente: ${icone.src}`);
  }
});

test('o index.html liga o manifest e o ícone do iOS', () => {
  const html = fs.readFileSync(path.join(raiz, 'index.html'), 'utf8');
  assert.match(html, /<link rel="manifest" href="\/manifest\.webmanifest"/);
  assert.match(html, /<meta name="apple-mobile-web-app-capable" content="yes"/);
  const toque = /rel="apple-touch-icon" href="([^"]+)"/.exec(html);
  assert.ok(toque, 'falta o apple-touch-icon');
  assert.ok(fs.existsSync(publico(toque[1])));
  const [largura, altura] = dimensoesDoPng(publico(toque[1]));
  assert.equal(largura, altura);
  assert.ok(largura >= 180, 'o iOS pede 180 px');
});

// ---------------------------------------------------------------- service worker

const codigoDoSw = fs.readFileSync(publico('sw.js'), 'utf8');
const ORIGEM = 'https://jardim.test';

/** Um `caches` em memória, só com o que o service worker usa. */
const criarCaches = () => {
  const lojas = new Map<string, Map<string, Response>>();
  const chave = (pedido: unknown) => (typeof pedido === 'string' ? pedido : (pedido as { url: string }).url);
  const resolver = (url: string) => (url.startsWith('http') ? url : `${ORIGEM}${url}`);
  const abrir = (nome: string) => {
    if (!lojas.has(nome)) lojas.set(nome, new Map());
    const loja = lojas.get(nome)!;
    return {
      put: async (pedido: unknown, resposta: Response) => { loja.set(resolver(chave(pedido)), resposta); },
      match: async (pedido: unknown) => loja.get(resolver(chave(pedido)))?.clone(),
      keys: async () => [...loja.keys()].map((url) => ({ url })),
      delete: async (pedido: unknown) => loja.delete(resolver(chave(pedido))),
      addAll: async (urls: string[]) => { urls.forEach((url) => loja.set(resolver(url), new Response('casca'))); },
    };
  };
  return {
    lojas,
    open: async (nome: string) => abrir(nome),
    match: async (pedido: unknown) => {
      for (const loja of lojas.values()) {
        const achada = loja.get(resolver(chave(pedido)));
        if (achada) return achada.clone();
      }
      return undefined;
    },
    keys: async () => [...lojas.keys()],
    delete: async (nome: string) => lojas.delete(nome),
  };
};

interface PedidoFalso { method: string; url: string; mode: string; headers: Headers }

const pedido = (caminho: string, extra: Partial<PedidoFalso> & { headers?: Record<string, string> } = {}): PedidoFalso => ({
  method: extra.method ?? 'GET',
  url: caminho.startsWith('http') ? caminho : `${ORIGEM}${caminho}`,
  mode: extra.mode ?? 'no-cors',
  headers: new Headers(extra.headers ?? {}),
});

/** Carrega o sw.js num ambiente falso e devolve como disparar eventos nele. */
const carregarSw = (redeResponde: (url: string) => Promise<Response>) => {
  const caches = criarCaches();
  const ouvintes: Record<string, (evento: unknown) => void> = {};
  const chamadasDeRede: string[] = [];
  const self = {
    location: { origin: ORIGEM },
    addEventListener: (tipo: string, funcao: (evento: unknown) => void) => { ouvintes[tipo] = funcao; },
    skipWaiting: async () => undefined,
    clients: { claim: async () => undefined },
  };
  const fetchFalso = async (entrada: { url: string } | string) => {
    const url = typeof entrada === 'string' ? entrada : entrada.url;
    chamadasDeRede.push(url);
    const resposta = await redeResponde(url);
    // Uma resposta de verdade do mesmo site chega como "basic"; o `new Response()` do teste nasce "default".
    Object.defineProperty(resposta, 'type', { value: 'basic' });
    return resposta;
  };
  vm.runInNewContext(codigoDoSw, { self, caches, fetch: fetchFalso, Response, URL, Promise, console });

  const disparar = async (requisicao: PedidoFalso) => {
    let resposta: Promise<Response> | undefined;
    const esperas: Promise<unknown>[] = [];
    ouvintes.fetch({
      request: requisicao,
      respondWith: (promessa: Promise<Response>) => { resposta = promessa; },
      waitUntil: (promessa: Promise<unknown>) => { esperas.push(promessa); },
    });
    const final = resposta ? await resposta : undefined;
    await Promise.all(esperas);
    return { interceptou: Boolean(resposta), resposta: final };
  };
  return { caches, chamadasDeRede, disparar, ouvintes };
};

const html = () => new Response('<html></html>', { headers: { 'content-type': 'text/html' } });

test('o service worker deixa passar direto: API, canal ao vivo, áudio, modelos, catálogos, Range, POST e terceiros', async () => {
  const { disparar } = carregarSw(async () => new Response('x'));
  const direto: PedidoFalso[] = [
    pedido('/api/v1/contexto'),
    pedido('/api/v1/sessao/abc/eventos', { headers: { accept: 'text/event-stream' } }),
    pedido('/audio/sabio/frase.mp3'),
    pedido('/models/arvore.glb'),
    pedido('/data/ficha/classes.json'),
    pedido('/assets/img/fundo.webp', { headers: { range: 'bytes=0-100' } }),
    pedido('/api/v1/personagens', { method: 'POST' }),
    pedido('https://fonts.gstatic.com/s/cinzel.woff2'),
  ];
  for (const requisicao of direto) {
    assert.equal((await disparar(requisicao)).interceptou, false, `${requisicao.method} ${requisicao.url}`);
  }
});

test('o service worker cuida da página e dos arquivos estáticos do próprio site', async () => {
  const { disparar } = carregarSw(async () => html());
  assert.equal((await disparar(pedido('/ficha/123', { mode: 'navigate', headers: { accept: 'text/html' } }))).interceptou, true);
  assert.equal((await disparar(pedido('/assets/index-qpKvKkZz.js'))).interceptou, true);
  assert.equal((await disparar(pedido('/assets/img/icons/icon-192.png'))).interceptou, true);
});

test('a página vai à rede primeiro e guarda a casca; sem rede, abre a casca guardada', async () => {
  let rede = true;
  const { disparar, caches } = carregarSw(async () => {
    if (!rede) throw new TypeError('sem rede');
    return html();
  });
  const online = await disparar(pedido('/loja', { mode: 'navigate' }));
  assert.equal(await online.resposta?.text(), '<html></html>');
  const casca = await (await caches.open('jardim-v2-casca')).match('/');
  assert.ok(casca, 'a casca ficou guardada');

  rede = false;
  const offline = await disparar(pedido('/ficha/1', { mode: 'navigate' }));
  assert.equal(await offline.resposta?.text(), '<html></html>', 'qualquer rota abre a mesma casca');
});

test('sem rede e sem nada guardado, a página falha em vez de inventar uma resposta', async () => {
  const { disparar } = carregarSw(async () => { throw new TypeError('sem rede'); });
  await assert.rejects(() => disparar(pedido('/', { mode: 'navigate' })), TypeError);
});

test('só página HTML boa vira casca: erro do servidor não entra no cache', async () => {
  const { disparar, caches } = carregarSw(async () => new Response('quebrou', { status: 500, headers: { 'content-type': 'text/html' } }));
  const resposta = await disparar(pedido('/regras', { mode: 'navigate' }));
  assert.equal(resposta.resposta?.status, 500);
  assert.equal(await (await caches.open('jardim-v2-casca')).match('/'), undefined);
});

test('arquivo com hash no nome é buscado uma vez só e depois sai do cache', async () => {
  const { disparar, chamadasDeRede } = carregarSw(async () => new Response('codigo', { headers: { 'content-type': 'text/javascript' } }));
  const url = '/assets/Home-DKgoWxpF.js';
  assert.equal(await (await disparar(pedido(url))).resposta?.text(), 'codigo');
  assert.equal(await (await disparar(pedido(url))).resposta?.text(), 'codigo');
  assert.equal(chamadasDeRede.filter((chamada) => chamada.endsWith(url)).length, 1);
});

test('imagem sem hash sai do cache na hora e é atualizada em segundo plano', async () => {
  let versao = 'antiga';
  const { disparar, chamadasDeRede } = carregarSw(async () => new Response(versao));
  const url = '/assets/img/icons/menu/ficha.webp';
  assert.equal(await (await disparar(pedido(url))).resposta?.text(), 'antiga');
  versao = 'nova';
  assert.equal(await (await disparar(pedido(url))).resposta?.text(), 'antiga', 'responde com o que já tinha');
  assert.equal(await (await disparar(pedido(url))).resposta?.text(), 'nova', 'e na vez seguinte já é a atualizada');
  assert.equal(chamadasDeRede.filter((chamada) => chamada.endsWith(url)).length, 3);
});

test('resposta de erro ou de outra origem nunca entra no cache de arquivos', async () => {
  const { disparar, caches } = carregarSw(async () => new Response('nao achei', { status: 404 }));
  await disparar(pedido('/assets/img/sumiu.webp'));
  const loja = await caches.open('jardim-v2-arquivos');
  assert.equal((await loja.keys()).length, 0);
});

test('o cache de arquivos tem teto: passou dele, saem os mais antigos', async () => {
  const { disparar, caches } = carregarSw(async (url) => new Response(url));
  for (let i = 0; i < 175; i += 1) await disparar(pedido(`/assets/chunk${i}-ABCDEFGH${i}.js`));
  const loja = await caches.open('jardim-v2-arquivos');
  const guardados = (await loja.keys()).map((item) => item.url);
  assert.equal(guardados.length, 160);
  assert.ok(!guardados.some((url) => url.includes('chunk0-')), 'o primeiro já saiu');
  assert.ok(guardados.some((url) => url.includes('chunk174-')), 'o último ficou');
});

test('ao ativar, o service worker apaga os caches de versões antigas e fica com os da atual', async () => {
  const { ouvintes, caches } = carregarSw(async () => new Response('x'));
  await caches.open('jardim-v1');
  await caches.open('jardim-v2-casca');
  await caches.open('outro-site');
  let espera: Promise<unknown> = Promise.resolve();
  ouvintes.activate({ waitUntil: (promessa: Promise<unknown>) => { espera = promessa; } });
  await espera;
  assert.deepEqual([...caches.lojas.keys()].sort(), ['jardim-v2-casca']);
});

test('ao instalar, a casca (página, manifest e ícones) é guardada e o service worker não espera para assumir', async () => {
  const { ouvintes, caches } = carregarSw(async () => new Response('x'));
  let espera: Promise<unknown> = Promise.resolve();
  ouvintes.install({ waitUntil: (promessa: Promise<unknown>) => { espera = promessa; } });
  await espera;
  const casca = await caches.open('jardim-v2-casca');
  const urls = (await casca.keys()).map((item) => item.url.replace(ORIGEM, ''));
  assert.ok(urls.includes('/') && urls.includes('/manifest.webmanifest'));
  for (const url of urls.filter((item) => item.startsWith('/assets/'))) assert.ok(fs.existsSync(publico(url)), `a casca guarda um arquivo que não existe: ${url}`);
});

// ---------------------------------------------------------------- instalar como app

test('a situação de instalação: já instalado vence, depois o botão, depois o iOS', () => {
  const base = { rodandoComoApp: false, instaladoNestaSessao: false, temEvento: false, ios: false };
  assert.equal(decidirSituacao({ ...base, rodandoComoApp: true, temEvento: true }), 'instalado');
  assert.equal(decidirSituacao({ ...base, instaladoNestaSessao: true }), 'instalado');
  assert.equal(decidirSituacao({ ...base, temEvento: true, ios: true }), 'disponivel');
  assert.equal(decidirSituacao({ ...base, ios: true }), 'ios');
  assert.equal(decidirSituacao(base), 'indisponivel');
});

test('reconhece iPhone, iPad e o iPad que se apresenta como Mac, e só esses', () => {
  const iphone = 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15';
  const chromeWindows = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120 Safari/537.36';
  const androidChrome = 'Mozilla/5.0 (Linux; Android 14) AppleWebKit/537.36 Chrome/120 Mobile Safari/537.36';
  assert.equal(ehDispositivoIos(iphone, 'iPhone', 5), true);
  assert.equal(ehDispositivoIos('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)', 'MacIntel', 5), true, 'iPad novo');
  assert.equal(ehDispositivoIos('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)', 'MacIntel', 0), false, 'Mac de verdade');
  assert.equal(ehDispositivoIos(chromeWindows, 'Win32', 10), false);
  assert.equal(ehDispositivoIos(androidChrome, 'Linux armv81', 5), false);
});
