/* ─────────────────────────────────────────────────────────
   O Jardim RPG — Mundo
   Tela navegável por categoria + import de conteúdo.
   ───────────────────────────────────────────────────────── */

import { router } from '../core/router.js';
import { CATEGORIAS, categoriaPorTipo } from './categorias.js';
import { getEntradas, entradasPorCategoria, processarArquivo } from './mundoImport.js';

const content = document.getElementById('mundo-content');
const toast = document.getElementById('mundo-toast');
let toastTimer = null;

// ── Toast de feedback ────────────────────────────────────

function mostrarToast(mensagem, tipo) {
  toast.textContent = mensagem;
  toast.dataset.tipo = tipo;
  toast.hidden = false;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { toast.hidden = true; }, 5000);
}

// ── Render de conteúdo genérico + links cruzados ─────────

function humanizarChave(chave) {
  const texto = chave.replace(/_/g, ' ');
  return texto.charAt(0).toUpperCase() + texto.slice(1);
}

function irParaEntrada(id) {
  const entrada = getEntradas()[id];
  if (!entrada) return;
  const cat = categoriaPorTipo(entrada.tipo);
  if (!cat) return;

  router.navegar(`/${cat.id}`);

  requestAnimationFrame(() => {
    const alvo = content.querySelector(`[data-entry-id="${CSS.escape(id)}"]`);
    if (!alvo) return;
    alvo.scrollIntoView({ behavior: 'smooth', block: 'center' });
    alvo.classList.add('mundo-entry--highlight');
    setTimeout(() => alvo.classList.remove('mundo-entry--highlight'), 1600);
  });
}

function renderValor(valor, mapa) {
  if (Array.isArray(valor)) {
    const span = document.createElement('span');
    valor.forEach((item, i) => {
      if (i > 0) span.append(', ');
      span.appendChild(renderValor(item, mapa));
    });
    return span;
  }

  if (valor && typeof valor === 'object') {
    return renderConteudo(valor, mapa);
  }

  // Cross-link automático: se o valor bate com o id de outra entrada
  // já descoberta, vira link. Se não, é só texto — o player não vê
  // o que ainda não importou.
  if (typeof valor === 'string' && mapa[valor]) {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'entry-link';
    btn.textContent = mapa[valor].titulo;
    btn.addEventListener('click', () => irParaEntrada(valor));
    return btn;
  }

  const span = document.createElement('span');
  span.textContent = String(valor);
  return span;
}

function renderConteudo(conteudo, mapa) {
  const dl = document.createElement('dl');
  dl.className = 'entry-fields';
  Object.entries(conteudo).forEach(([chave, valor]) => {
    if (valor === null || valor === undefined || valor === '') return;
    const dt = document.createElement('dt');
    dt.textContent = humanizarChave(chave);
    const dd = document.createElement('dd');
    dd.appendChild(renderValor(valor, mapa));
    dl.append(dt, dd);
  });
  return dl;
}

// ── Render de categoria ──────────────────────────────────

function renderCategoria(catId) {
  const cat = CATEGORIAS.find(c => c.id === catId) || CATEGORIAS[0];

  document.querySelectorAll('.mundo-tab').forEach(tab => {
    tab.setAttribute('aria-selected', tab.dataset.cat === cat.id ? 'true' : 'false');
  });

  const mapaCompleto = getEntradas();
  const entradas = entradasPorCategoria(cat);

  content.innerHTML = '';

  const header = document.createElement('div');
  header.className = 'mundo-cat-header';
  const h2 = document.createElement('h2');
  h2.className = 'mundo-cat-title';
  h2.textContent = cat.titulo;
  const desc = document.createElement('p');
  desc.className = 'mundo-cat-desc';
  desc.textContent = cat.descricao;
  header.append(h2, desc);
  content.appendChild(header);

  if (entradas.length === 0) {
    const vazio = document.createElement('div');
    vazio.className = 'mundo-empty';
    vazio.innerHTML = `
      <div class="mundo-empty-icon" aria-hidden="true">✦</div>
      <p class="mundo-empty-text"></p>
      <button type="button" class="mundo-cta-btn" data-action="importar">Importar conteúdo</button>
    `;
    vazio.querySelector('.mundo-empty-text').textContent = cat.vazio;
    content.appendChild(vazio);
    return;
  }

  const lista = document.createElement('div');
  lista.className = 'mundo-entry-list';
  entradas
    .slice()
    .sort((a, b) => a.titulo.localeCompare(b.titulo, 'pt-BR'))
    .forEach(entrada => {
      const card = document.createElement('article');
      card.className = 'mundo-entry';
      card.dataset.entryId = entrada.id;

      const h3 = document.createElement('h3');
      h3.className = 'mundo-entry-title';
      h3.textContent = entrada.titulo;
      card.appendChild(h3);
      card.appendChild(renderConteudo(entrada.conteudo, mapaCompleto));

      lista.appendChild(card);
    });
  content.appendChild(lista);
}

// ── Import ───────────────────────────────────────────────

function initImport() {
  const btn = document.getElementById('mundo-import-btn');
  const input = document.getElementById('mundo-import-input');

  function disparar() { input.click(); }

  btn.addEventListener('click', disparar);
  content.addEventListener('click', (e) => {
    if (e.target.closest('[data-action="importar"]')) disparar();
  });

  input.addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const raw = await file.text();
    const resultado = processarArquivo(raw);
    mostrarToast(resultado.mensagem, resultado.ok ? 'sucesso' : 'erro');
    input.value = '';

    if (resultado.ok) {
      const catAtual = router.atual().replace('/', '') || CATEGORIAS[0].id;
      renderCategoria(catAtual);
    }
  });
}

// ── Init ─────────────────────────────────────────────────

document.addEventListener('DOMContentLoaded', () => {
  CATEGORIAS.forEach(cat => {
    router.registrar(`/${cat.id}`, () => renderCategoria(cat.id));
  });

  document.querySelectorAll('.mundo-tab').forEach(tab => {
    tab.addEventListener('click', () => router.navegar(`/${tab.dataset.cat}`));
  });

  initImport();

  const atual = router.atual();
  const valido = CATEGORIAS.some(c => `/${c.id}` === atual);
  router.iniciar();
  if (!valido) {
    router.navegar(`/${CATEGORIAS[0].id}`);
  }
});
