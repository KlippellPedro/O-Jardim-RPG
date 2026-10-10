/* Service worker do O Jardim RPG.

   O objetivo é o site ser instalável e abrir rápido no celular da mesa. A estratégia é
   deliberada, para o cache nunca servir um site velho nem atrapalhar o jogo ao vivo:

   - A API (/api/), o canal ao vivo (SSE), a voz do Grande Sábio (/audio/), os modelos 3D
     (/models/), os catálogos (/data/) e pedidos parciais (Range) vão sempre direto à rede.
   - A página (navegação) vai à rede primeiro; o cache só entra quando a rede falha. É o que
     faz o site abrir sem internet (a tela abre; os dados continuam precisando de conexão).
   - Arquivos com hash no nome (/assets/nome-HASH.js) nunca mudam, então ficam no cache e
     saem dele sem pedir à rede. Imagens e ícones, que mudam de conteúdo com o mesmo nome,
     são servidos do cache e atualizados em segundo plano.

   Mudou a estratégia? Suba a VERSAO: os caches da versão anterior são apagados na ativação. */

const VERSAO = 'jardim-v2';
const CACHE_CASCA = `${VERSAO}-casca`;
const CACHE_ARQUIVOS = `${VERSAO}-arquivos`;
const LIMITE_DE_ARQUIVOS = 160;

const CASCA = [
  '/',
  '/manifest.webmanifest',
  '/assets/img/icons/app-icon.svg',
  '/assets/img/icons/icon-192.png',
];

const DIRETO_PARA_A_REDE = ['/api/', '/audio/', '/models/', '/data/'];
const ARQUIVO_COM_HASH = /^\/assets\/.+-[A-Za-z0-9_-]{8,}\.(?:js|mjs|css|woff2?)$/;

self.addEventListener('install', (evento) => {
  evento.waitUntil(
    caches.open(CACHE_CASCA)
      .then((cache) => cache.addAll(CASCA))
      .catch(() => undefined)
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener('activate', (evento) => {
  evento.waitUntil(
    caches.keys()
      .then((chaves) => Promise.all(chaves.filter((chave) => !chave.startsWith(VERSAO)).map((chave) => caches.delete(chave))))
      .then(() => self.clients.claim()),
  );
});

async function aparar(cache) {
  const chaves = await cache.keys();
  if (chaves.length <= LIMITE_DE_ARQUIVOS) return;
  // As chaves vêm na ordem em que entraram: sai o que está há mais tempo.
  await Promise.all(chaves.slice(0, chaves.length - LIMITE_DE_ARQUIVOS).map((chave) => cache.delete(chave)));
}

async function guardar(pedido, resposta) {
  if (!resposta || !resposta.ok || resposta.type !== 'basic') return;
  const cache = await caches.open(CACHE_ARQUIVOS);
  await cache.put(pedido, resposta.clone());
  await aparar(cache);
}

async function navegacao(pedido) {
  try {
    const resposta = await fetch(pedido);
    if (resposta.ok && (resposta.headers.get('content-type') || '').includes('text/html')) {
      const cache = await caches.open(CACHE_CASCA);
      // O site é uma página só (o roteador cuida do resto): qualquer rota abre a mesma casca.
      await cache.put('/', resposta.clone());
    }
    return resposta;
  } catch (erro) {
    const guardada = await caches.match('/');
    if (guardada) return guardada;
    throw erro;
  }
}

async function cacheDepois(pedido) {
  const guardada = await caches.match(pedido);
  if (guardada) return guardada;
  const resposta = await fetch(pedido);
  await guardar(pedido, resposta);
  return resposta;
}

function revalidar(evento, pedido) {
  const atualizacao = fetch(pedido)
    .then(async (resposta) => {
      await guardar(pedido, resposta);
      return resposta;
    })
    .catch(() => null);
  evento.waitUntil(atualizacao);
  return caches.match(pedido).then((guardada) => guardada || atualizacao.then((resposta) => resposta || Response.error()));
}

self.addEventListener('fetch', (evento) => {
  const pedido = evento.request;
  if (pedido.method !== 'GET') return;

  const url = new URL(pedido.url);
  if (url.origin !== self.location.origin) return;
  if (DIRETO_PARA_A_REDE.some((prefixo) => url.pathname.startsWith(prefixo))) return;
  if (pedido.headers.has('range')) return;
  if ((pedido.headers.get('accept') || '').includes('text/event-stream')) return;

  if (pedido.mode === 'navigate') {
    evento.respondWith(navegacao(pedido));
    return;
  }
  if (ARQUIVO_COM_HASH.test(url.pathname)) {
    evento.respondWith(cacheDepois(pedido));
    return;
  }
  evento.respondWith(revalidar(evento, pedido));
});
