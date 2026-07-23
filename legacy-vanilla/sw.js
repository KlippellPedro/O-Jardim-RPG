/* Service worker do O Jardim RPG.
   Estratégia deliberada: NETWORK-FIRST para tudo que é do site (o código fresco
   sempre vence; o cache é só rede de segurança offline) e ZERO interferência na
   API e na sessão ao vivo (SSE) — essas seguem direto pra rede. Assim o app
   ganha "instalável" + funcionar offline sem o risco clássico de PWA de servir
   uma versão velha e travar o site. Suba CACHE_VERSAO ao mudar esta estratégia. */

const CACHE_VERSAO = 'jardim-v1';

const APP_SHELL = [
  '/',
  '/index.html',
  '/styles/core/variables.css',
  '/styles/core/reset.css',
  '/styles/core/animations.css',
  '/assets/img/icons/app-icon.svg',
  '/assets/img/icons/favicon-64.png',
  '/manifest.webmanifest',
];

self.addEventListener('install', event => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_VERSAO).then(cache => cache.addAll(APP_SHELL).catch(() => {})),
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(chaves => Promise.all(chaves.filter(c => c !== CACHE_VERSAO).map(c => caches.delete(c))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', event => {
  const req = event.request;
  if (req.method !== 'GET') return;

  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return; // deixa terceiros (fontes) passarem

  // Nunca intercepta a API nem o canal de eventos ao vivo — precisam ir sempre à rede.
  if (url.pathname.startsWith('/api/')) return;
  if (req.headers.get('accept')?.includes('text/event-stream')) return;

  event.respondWith(
    fetch(req)
      .then(resposta => {
        // Guarda uma cópia das respostas boas do próprio site para o modo offline.
        if (resposta.ok && resposta.type === 'basic') {
          const copia = resposta.clone();
          caches.open(CACHE_VERSAO).then(cache => cache.put(req, copia));
        }
        return resposta;
      })
      .catch(() =>
        caches.match(req).then(acerto => acerto || caches.match('/')),
      ),
  );
});
