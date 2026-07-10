/* ─────────────────────────────────────────────────────────
   O Jardim RPG — Loja
   Índice em cards (uma por categoria) + galeria de itens por
   categoria + página de detalhe por item. Conteúdo chega por
   import de JSON (mesmo princípio do Mundo — ver lojaImport.js),
   com o mesmo polimento visual de Regras (cards, glow, transições).
   ───────────────────────────────────────────────────────── */

import { router } from '../core/router.js';
import { CATEGORIAS, categoriaPorId, categoriaPorTipo } from './categorias.js';
import { getEntradas, entradasPorCategoria, processarArquivo } from './lojaImport.js';

const content = document.getElementById('loja-content');
const toast   = document.getElementById('loja-toast');
let toastTimer = null;

// ── Toast de feedback ────────────────────────────────────

function mostrarToast(mensagem, tipo) {
  toast.textContent = mensagem;
  toast.dataset.tipo = tipo;
  toast.hidden = false;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { toast.hidden = true; }, 5000);
}

// ── Transição de página — View Transitions API quando o
// navegador suporta; sem suporte, cai pra troca instantânea. ──

function comTransicao(fn) {
  if (document.startViewTransition) {
    const transicao = document.startViewTransition(fn);
    transicao.ready.catch(() => {});
    transicao.finished.catch(() => {});
  } else {
    fn();
  }
}

// `.loja-content` é reaproveitado entre renders — precisa reiniciar
// a própria animação manualmente a cada troca de rota.
function resetarAnimacao() {
  content.style.animation = 'none';
  void content.offsetHeight;
  content.style.animation = '';
}

function truncar(texto, tamanho) {
  const t = String(texto || '').trim();
  return t.length > tamanho ? `${t.slice(0, tamanho).trim()}…` : t;
}

function humanizarChave(chave) {
  const texto = chave.replace(/_/g, ' ');
  return texto.charAt(0).toUpperCase() + texto.slice(1);
}

// ── Render genérico de campos de `conteudo` + cross-links ──
// O schema de arma/veículo/monstro/drop ainda não foi definido,
// então qualquer chave vira uma linha — sem supor nomes de campo.

function irParaEntrada(id) {
  const entrada = getEntradas()[id];
  if (!entrada) return;
  const cat = categoriaPorTipo(entrada.tipo);
  if (cat) router.navegar(`/${cat.id}/${entrada.id}`);
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

  if (typeof valor === 'string' && mapa[valor]) {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'loja-entry-link';
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
  dl.className = 'loja-fields';
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

// ── Índice — grid de cards, uma por categoria ────────────

function criarCategoriaCard(categoria, indice) {
  const card = document.createElement('button');
  card.type = 'button';
  card.className = 'loja-card';
  card.style.setProperty('--accent', categoria.accent);
  card.style.animationDelay = `${indice * 70}ms`;
  card.setAttribute('aria-label', `Ver ${categoria.titulo}`);

  const icone = document.createElement('span');
  icone.className = 'loja-card-icon';
  icone.setAttribute('aria-hidden', 'true');
  icone.textContent = categoria.simbolo;

  const titulo = document.createElement('span');
  titulo.className = 'loja-card-title';
  titulo.textContent = categoria.titulo;

  const desc = document.createElement('span');
  desc.className = 'loja-card-desc';
  desc.textContent = categoria.descricao;

  const seta = document.createElement('span');
  seta.className = 'loja-card-arrow';
  seta.setAttribute('aria-hidden', 'true');
  seta.textContent = '›';

  card.append(icone, titulo, desc, seta);
  card.addEventListener('click', () => router.navegar(`/${categoria.id}`));
  return card;
}

function renderIndice() {
  resetarAnimacao();
  content.innerHTML = '';

  const intro = document.createElement('p');
  intro.className = 'loja-intro';
  intro.textContent = 'O que se compra, se caça ou se pilota em O Jardim. Escolha uma categoria.';
  content.appendChild(intro);

  const grid = document.createElement('div');
  grid.className = 'loja-grid';
  CATEGORIAS.forEach((cat, i) => grid.appendChild(criarCategoriaCard(cat, i)));
  content.appendChild(grid);
}

// ── Categoria — galeria de itens ou estado vazio ─────────

function renderEmpty(categoria) {
  const vazio = document.createElement('div');
  vazio.className = 'loja-empty';
  vazio.style.setProperty('--accent', categoria.accent);
  vazio.innerHTML = `
    <div class="loja-empty-ornament" aria-hidden="true">
      <span class="loja-empty-ornament-line"></span>
      <span class="loja-empty-ornament-rune">${categoria.simbolo}</span>
      <span class="loja-empty-ornament-line"></span>
    </div>
    <p class="loja-empty-text"></p>
    <button type="button" class="loja-cta-btn" data-action="importar">Importar conteúdo</button>
  `;
  vazio.querySelector('.loja-empty-text').textContent = categoria.vazio;
  content.appendChild(vazio);
}

function criarItemCard(entrada, categoria) {
  const card = document.createElement('button');
  card.type = 'button';
  card.className = 'loja-item-card';
  card.style.setProperty('--accent', categoria.accent);

  const titulo = document.createElement('span');
  titulo.className = 'loja-item-card-title';
  titulo.textContent = entrada.titulo;
  card.appendChild(titulo);

  const descTexto = typeof entrada.conteudo?.descricao === 'string' ? entrada.conteudo.descricao : '';
  if (descTexto) {
    const desc = document.createElement('span');
    desc.className = 'loja-item-card-desc';
    desc.textContent = truncar(descTexto, 90);
    card.appendChild(desc);
  }

  card.addEventListener('click', () => router.navegar(`/${categoria.id}/${entrada.id}`));
  return card;
}

function renderCategoria(catId) {
  const categoria = categoriaPorId(catId);
  if (!categoria) { router.navegar('/'); return; }

  resetarAnimacao();
  content.innerHTML = '';

  const crumb = document.createElement('button');
  crumb.type = 'button';
  crumb.className = 'loja-crumb';
  crumb.style.setProperty('--accent', categoria.accent);
  crumb.textContent = '‹ Loja';
  crumb.addEventListener('click', () => router.navegar('/'));
  content.appendChild(crumb);

  const header = document.createElement('div');
  header.className = 'loja-cat-header';
  header.style.setProperty('--accent', categoria.accent);

  const h2 = document.createElement('h2');
  h2.className = 'loja-cat-title';

  const icone = document.createElement('span');
  icone.className = 'loja-cat-icon';
  icone.setAttribute('aria-hidden', 'true');
  icone.textContent = categoria.simbolo;

  h2.append(icone, categoria.titulo);
  header.appendChild(h2);

  const desc = document.createElement('p');
  desc.className = 'loja-cat-desc';
  desc.textContent = categoria.descricao;
  header.appendChild(desc);

  content.appendChild(header);

  const entradas = entradasPorCategoria(categoria);

  if (entradas.length === 0) {
    renderEmpty(categoria);
    return;
  }

  const grid = document.createElement('div');
  grid.className = 'loja-item-grid';
  entradas
    .slice()
    .sort((a, b) => a.titulo.localeCompare(b.titulo, 'pt-BR'))
    .forEach(entrada => grid.appendChild(criarItemCard(entrada, categoria)));
  content.appendChild(grid);
}

// ── Item — página de detalhe ─────────────────────────────

function renderItem(catId, itemId) {
  const categoria = categoriaPorId(catId);
  const entrada = getEntradas()[itemId];
  if (!categoria || !entrada) { router.navegar(`/${catId || ''}`); return; }

  resetarAnimacao();
  content.innerHTML = '';

  const breadcrumb = document.createElement('nav');
  breadcrumb.className = 'loja-breadcrumb';
  breadcrumb.setAttribute('aria-label', 'Caminho de navegação');

  const voltarLoja = document.createElement('button');
  voltarLoja.type = 'button';
  voltarLoja.className = 'loja-breadcrumb-link';
  voltarLoja.textContent = '‹ Loja';
  voltarLoja.addEventListener('click', () => router.navegar('/'));
  breadcrumb.appendChild(voltarLoja);

  const voltarCat = document.createElement('button');
  voltarCat.type = 'button';
  voltarCat.className = 'loja-breadcrumb-link';
  voltarCat.textContent = `‹ ${categoria.titulo}`;
  voltarCat.addEventListener('click', () => router.navegar(`/${categoria.id}`));
  breadcrumb.appendChild(voltarCat);

  content.appendChild(breadcrumb);

  const header = document.createElement('div');
  header.className = 'loja-detail-header';
  header.style.setProperty('--accent', categoria.accent);

  const h2 = document.createElement('h2');
  h2.className = 'loja-detail-title';

  const icone = document.createElement('span');
  icone.className = 'loja-detail-icon';
  icone.setAttribute('aria-hidden', 'true');
  icone.textContent = categoria.simbolo;

  h2.append(icone, entrada.titulo);
  header.appendChild(h2);

  const subtitulo = document.createElement('p');
  subtitulo.className = 'loja-detail-subtitulo';
  subtitulo.style.setProperty('--accent', categoria.accent);
  subtitulo.textContent = categoria.titulo;
  header.appendChild(subtitulo);

  content.appendChild(header);

  const mapa = getEntradas();
  const article = document.createElement('article');
  article.className = 'loja-detail';

  // `descricao` vira prosa de abertura (sem rótulo) — mesmo tratamento que
  // Mundo dá a esse campo, em vez de listá-lo como mais uma linha genérica.
  if (typeof entrada.conteudo?.descricao === 'string' && entrada.conteudo.descricao.trim()) {
    const p = document.createElement('p');
    p.className = 'loja-detail-descricao';
    p.textContent = entrada.conteudo.descricao;
    article.appendChild(p);
  }

  const demaisCampos = { ...entrada.conteudo };
  delete demaisCampos.descricao;
  if (Object.keys(demaisCampos).length > 0) {
    article.appendChild(renderConteudo(demaisCampos, mapa));
  }

  content.appendChild(article);
}

// ── Import ───────────────────────────────────────────────

function initImport() {
  const btn   = document.getElementById('loja-import-btn');
  const input = document.getElementById('loja-import-input');

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
      // Permanece na tela atual (índice ou categoria), só re-renderiza
      // com o conteúdo novo já refletido.
      const partes = router.atual().split('/').filter(Boolean);
      if (partes.length >= 1 && categoriaPorId(partes[0])) {
        renderCategoria(partes[0]);
      } else {
        renderIndice();
      }
    }
  });
}

// ── Init ──────────────────────────────────────────────────

document.addEventListener('DOMContentLoaded', () => {
  router.registrar('/', () => comTransicao(renderIndice));
  CATEGORIAS.forEach(categoria => {
    router.registrar(`/${categoria.id}`, () => comTransicao(() => renderCategoria(categoria.id)));
  });

  router.registrarFallback((path) => {
    const partes = path.split('/').filter(Boolean);
    if (partes.length === 2 && categoriaPorId(partes[0])) {
      comTransicao(() => renderItem(partes[0], partes[1]));
      return;
    }
    router.navegar('/');
  });

  const titulo = document.querySelector('.loja-title');
  if (titulo) titulo.addEventListener('click', () => router.navegar('/'));

  initImport();
  router.iniciar();
});
