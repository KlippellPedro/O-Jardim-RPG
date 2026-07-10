/* ─────────────────────────────────────────────────────────
   O Jardim RPG — Regras
   Índice em cards + página dedicada por tópico/mecânica.
   Roteamento client-side isolado a esta página (mesmo esquema
   usado em Mundo): hash vazio = índice, #/<id> = detalhe.
   ───────────────────────────────────────────────────────── */

import { router } from '../core/router.js';
import { TOPICOS, topicoPorId } from './regrasData.js';

const content = document.getElementById('regras-content');

// Troca de página com a View Transitions API quando o navegador
// suporta — cross-fade suave do conteúdo inteiro (ver keyframes
// regras-vt-in/out no CSS). Sem suporte, cai pra troca instantânea
// + as animações de entrada normais dos elementos recém-criados.
function comTransicao(fn) {
  if (document.startViewTransition) {
    // `ready`/`finished` rejeitam quando o navegador pula a transição
    // (ex.: uma navegação nova chega antes da anterior terminar) — isso é
    // normal, não um erro da aplicação, então só evita a rejeição não tratada.
    const transicao = document.startViewTransition(fn);
    transicao.ready.catch(() => {});
    transicao.finished.catch(() => {});
  } else {
    fn();
  }
}

// `.regras-content` é reaproveitado entre renders (só o innerHTML
// muda) — precisa reiniciar a própria animação manualmente a cada
// troca, senão ela só toca na primeira vez.
function resetarAnimacao() {
  content.style.animation = 'none';
  void content.offsetHeight;
  content.style.animation = '';
}

// ── Índice — grid de cards, um por tópico ────────────────

function criarCard(topico, indice) {
  const card = document.createElement('button');
  card.type = 'button';
  card.className = 'regras-card';
  card.style.setProperty('--accent', topico.accent);
  card.style.animationDelay = `${indice * 70}ms`;
  card.setAttribute('aria-label', `Ver regras de ${topico.titulo}`);

  const icone = document.createElement('span');
  icone.className = 'regras-card-icon';
  icone.setAttribute('aria-hidden', 'true');
  icone.textContent = topico.simbolo;

  const titulo = document.createElement('span');
  titulo.className = 'regras-card-title';
  titulo.textContent = topico.titulo;

  const desc = document.createElement('span');
  desc.className = 'regras-card-desc';
  desc.textContent = topico.resumo;

  const seta = document.createElement('span');
  seta.className = 'regras-card-arrow';
  seta.setAttribute('aria-hidden', 'true');
  seta.textContent = '›';

  card.append(icone, titulo, desc, seta);
  card.addEventListener('click', () => router.navegar(`/${topico.id}`));
  return card;
}

function renderIndice() {
  resetarAnimacao();
  content.innerHTML = '';

  const intro = document.createElement('p');
  intro.className = 'regras-intro';
  intro.textContent = 'As mecânicas gerais que sustentam O Jardim. Escolha um tópico para ver os detalhes.';
  content.appendChild(intro);

  const grid = document.createElement('div');
  grid.className = 'regras-grid';
  TOPICOS.forEach((topico, i) => grid.appendChild(criarCard(topico, i)));
  content.appendChild(grid);
}

// ── Página de detalhe — um tópico por vez ────────────────

function renderTopico(id) {
  const topico = topicoPorId(id);
  if (!topico) { router.navegar('/'); return; }

  resetarAnimacao();
  content.innerHTML = '';

  const crumb = document.createElement('button');
  crumb.type = 'button';
  crumb.className = 'regras-crumb';
  crumb.style.setProperty('--accent', topico.accent);
  crumb.textContent = '‹ Regras';
  crumb.addEventListener('click', () => router.navegar('/'));
  content.appendChild(crumb);

  const header = document.createElement('div');
  header.className = 'regras-detail-header';
  header.style.setProperty('--accent', topico.accent);

  const h2 = document.createElement('h2');
  h2.className = 'regras-detail-title';

  const icone = document.createElement('span');
  icone.className = 'regras-detail-icon';
  icone.setAttribute('aria-hidden', 'true');
  icone.textContent = topico.simbolo;

  h2.append(icone, topico.titulo);
  header.appendChild(h2);

  const resumo = document.createElement('p');
  resumo.className = 'regras-detail-resumo';
  resumo.textContent = topico.resumo;
  header.appendChild(resumo);

  content.appendChild(header);

  const article = document.createElement('article');
  article.className = 'regras-detail';
  article.innerHTML = topico.corpo;
  content.appendChild(article);
}

// ── Init ──────────────────────────────────────────────────

document.addEventListener('DOMContentLoaded', () => {
  router.registrar('/', () => comTransicao(renderIndice));
  TOPICOS.forEach(topico => {
    router.registrar(`/${topico.id}`, () => comTransicao(() => renderTopico(topico.id)));
  });
  router.registrarFallback(() => router.navegar('/'));

  // Links cruzados entre tópicos, embutidos no HTML de `corpo` (delegação —
  // os botões só existem depois de um innerHTML, então não dá pra ligar o
  // listener direto neles).
  content.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-topico-link]');
    if (btn) router.navegar(`/${btn.dataset.topicoLink}`);
  });

  const titulo = document.querySelector('.regras-title');
  if (titulo) titulo.addEventListener('click', () => router.navegar('/'));

  router.iniciar();
});
