import { limparCenas } from './components/cenaLifecycle.js';
import { content } from './dom.js';

export function resetarAnimacao() {
  content.style.animation = 'none';
  void content.offsetHeight;
  content.style.animation = '';
}

export function prepararPagina() {
  limparCenas();
  resetarAnimacao();
  content.innerHTML = '';
}

export function renderizarCabecalhoCategoria(categoria) {
  const header = document.createElement('div');
  header.className = 'mundo-cat-header';

  const titulo = document.createElement('h2');
  titulo.className = 'mundo-cat-title';
  titulo.textContent = categoria.titulo;

  const descricao = document.createElement('p');
  descricao.className = 'mundo-cat-desc';
  descricao.textContent = categoria.descricao;

  header.append(titulo, descricao);
  content.appendChild(header);
}

export function renderizarEstadoVazio(categoria) {
  const vazio = document.createElement('div');
  vazio.className = 'mundo-empty';
  vazio.innerHTML = `
    <div class="mundo-empty-ornament" aria-hidden="true">
      <span class="mundo-empty-ornament-line"></span>
      <span class="mundo-empty-ornament-rune">✦</span>
      <span class="mundo-empty-ornament-line"></span>
    </div>
    <p class="mundo-empty-text"></p>
    <button type="button" class="mundo-cta-btn" data-action="importar">Importar conteúdo</button>
  `;
  vazio.querySelector('.mundo-empty-text').textContent = categoria.vazio;
  content.appendChild(vazio);
}
