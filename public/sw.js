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
   - Só a página e o que está em /assets/ passam por aqui. Qualquer outra coisa segue o
     caminho normal do navegador.

   O cache é só uma otimização e nunca pode derrubar o site. Se o armazenamento do navegador
   falhar (disco cheio, perfil corrompido, caminho longo demais no Windows), a resposta que
   a rede entregou segue para a página do mesmo jeito: guardar acontece depois, em segundo
   plano, e qualquer erro de leitura ou de escrita do cache vira "não tem nada guardado".

   Mudou a estratégia? Suba a VERSAO: os caches da versão anterior são apagados na ativação. */

const VERSAO = 'jardim-v3';
const CACHE_CASCA = `${VERSAO}-casca`;
const CACHE_ARQUIVOS = `${VERSAO}-arquivos`;
const LIMITE_DE_ARQUIVOS = 160;
/** Quanto esperar o armazenamento do navegador responder antes de seguir sem ele. */
const ESPERA_DO_CACHE_MS = 2500;

const CASCA = [
  '/',
  '/manifest.webmanifest',
  '/assets/img/icons/app-icon.svg',
  '/assets/img/icons/icon-192.png',
];

const DIRETO_PARA_A_REDE = ['/api/', '/audio/', '/models/', '/data/'];
const ARQUIVO_COM_HASH = /^\/assets\/.+-[A-Za-z0-9_-]{8,}\.(?:js|mjs|css|woff2?)$/;

let avisouDoCache = false;

/** Uma linha no console do service worker (uma vez só) para quem for investigar um armazenamento com defeito. */
function avisarDoCache(motivo) {
  if (avisouDoCache) return;
  avisouDoCache = true;
  console.warn('O armazenamento do navegador falhou; o site segue sem cache.', motivo);
}

/** Roda uma operação do cache sem deixar que ela derrube ou trave quem chamou. */
function tentar(operacao) {
  let relogio;
  const limite = new Promise((resolver) => {
    relogio = setTimeout(() => {
      avisarDoCache('sem resposta em ' + ESPERA_DO_CACHE_MS + ' ms');
      resolver(undefined);
    }, ESPERA_DO_CACHE_MS);
  });
  return Promise.race([
    Promise.resolve().then(operacao).catch((erro) => {
      avisarDoCache(erro);
      return undefined;
    }),
    limite,
  ]).then((valor) => {
    clearTimeout(relogio);
    return valor;
  });
}

/** O que está guardado para o pedido, ou `undefined` (também quando o cache falha). */
function achar(pedido) {
  return tentar(() => caches.match(pedido));
}

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
      .catch(() => undefined)
      .then(() => self.clients.claim()),
  );
});

async function aparar(cache) {
  const chaves = await cache.keys();
  if (chaves.length <= LIMITE_DE_ARQUIVOS) return;
  // As chaves vêm na ordem em que entraram: sai o que está há mais tempo.
  await Promise.all(chaves.slice(0, chaves.length - LIMITE_DE_ARQUIVOS).map((chave) => cache.delete(chave)));
}

/** Guarda um arquivo. Recebe uma CÓPIA da resposta: a original já está a caminho da página. */
function guardar(pedido, copia) {
  return tentar(async () => {
    const cache = await caches.open(CACHE_ARQUIVOS);
    await cache.put(pedido, copia);
    await aparar(cache);
  });
}

/** Guarda a página como a casca do site (o roteador cuida do resto, qualquer rota abre a mesma). */
function guardarCasca(copia) {
  return tentar(async () => {
    const cache = await caches.open(CACHE_CASCA);
    await cache.put('/', copia);
  });
}

/** Só resposta boa do próprio site entra no cache de arquivos. */
const merece = (resposta) => Boolean(resposta && resposta.ok && resposta.type === 'basic');

async function navegacao(evento, pedido) {
  let resposta;
  try {
    resposta = await fetch(pedido);
  } catch (erro) {
    const guardada = await achar('/');
    if (guardada) return guardada;
    throw erro;
  }
  if (resposta.ok && (resposta.headers.get('content-type') || '').includes('text/html')) {
    evento.waitUntil(guardarCasca(resposta.clone()));
  }
  return resposta;
}

async function cacheDepois(evento, pedido) {
  const guardada = await achar(pedido);
  if (guardada) return guardada;
  const resposta = await fetch(pedido);
  if (merece(resposta)) evento.waitUntil(guardar(pedido, resposta.clone()));
  return resposta;
}

function revalidar(evento, pedido) {
  const rede = fetch(pedido);
  evento.waitUntil(
    rede
      .then((resposta) => (merece(resposta) ? guardar(pedido, resposta.clone()) : undefined))
      .catch(() => undefined),
  );
  // Sem nada guardado, vale a resposta da rede; se ela falhar, o pedido falha como falharia sem
  // service worker (nunca uma resposta de erro inventada aqui).
  return achar(pedido).then((guardada) => guardada || rede);
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
    evento.respondWith(navegacao(evento, pedido));
    return;
  }
  if (!url.pathname.startsWith('/assets/')) return;
  if (ARQUIVO_COM_HASH.test(url.pathname)) {
    evento.respondWith(cacheDepois(evento, pedido));
    return;
  }
  evento.respondWith(revalidar(evento, pedido));
});
