// Modal genérico reaproveitado pelas abas da ficha completa (info de
// cálculo, ajustes personalizados, level up...) — reaproveita o mesmo
// #ficha-modal-layer do wizard de criação (wizardCriacao.js), mas nunca
// abre ao mesmo tempo (o wizard só aparece a partir da lista de
// personagens, estas abas só a partir da ficha de um personagem já criado).

let modalLayer = null;
let callbackFechar = null;
let focoAnterior = null;
let modalAtual = null;

const SELETOR_FOCAVEL = [
  'a[href]', 'button:not([disabled])', 'input:not([disabled])',
  'select:not([disabled])', 'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(',');

function aoTeclado(e) {
  if (e.key === 'Escape') {
    fecharModalSimples();
    return;
  }
  if (e.key !== 'Tab' || !modalAtual) return;
  const focaveis = [...modalAtual.querySelectorAll(SELETOR_FOCAVEL)]
    .filter(elemento => !elemento.hidden && elemento.getClientRects().length > 0);
  if (focaveis.length === 0) {
    e.preventDefault();
    modalAtual.focus();
    return;
  }
  const primeiro = focaveis[0];
  const ultimo = focaveis[focaveis.length - 1];
  if (e.shiftKey && document.activeElement === primeiro) {
    e.preventDefault();
    ultimo.focus();
  } else if (!e.shiftKey && document.activeElement === ultimo) {
    e.preventDefault();
    primeiro.focus();
  }
}

export function fecharModalSimples() {
  if (!modalLayer || modalLayer.hidden) return;
  modalLayer.hidden = true;
  modalLayer.innerHTML = '';
  modalAtual = null;
  document.body.classList.remove('ficha-modal-aberto');
  const pagina = document.querySelector('.ficha-page');
  if (pagina) pagina.inert = false;
  document.removeEventListener('keydown', aoTeclado);
  const cb = callbackFechar;
  callbackFechar = null;
  if (cb) cb();
  const restaurar = focoAnterior;
  focoAnterior = null;
  if (restaurar?.isConnected && typeof restaurar.focus === 'function') restaurar.focus();
}

export function abrirModalSimples({ titulo, corpo, classeExtra, aoFechar } = {}) {
  modalLayer = document.getElementById('ficha-modal-layer');
  if (!modalLayer) return null;

  const estavaFechado = modalLayer.hidden;
  if (estavaFechado) focoAnterior = document.activeElement;
  callbackFechar = aoFechar || null;

  modalLayer.innerHTML = '';
  modalLayer.hidden = false;
  document.body.classList.add('ficha-modal-aberto');

  const backdrop = document.createElement('div');
  backdrop.className = 'ficha-modal-backdrop';
  backdrop.addEventListener('click', () => fecharModalSimples());

  const modal = document.createElement('div');
  modal.className = classeExtra ? `ficha-modal ${classeExtra}` : 'ficha-modal';
  modal.setAttribute('role', 'dialog');
  modal.setAttribute('aria-modal', 'true');
  modal.tabIndex = -1;
  if (titulo) modal.setAttribute('aria-label', titulo);
  modal.addEventListener('click', (e) => e.stopPropagation());

  const fechar = document.createElement('button');
  fechar.type = 'button';
  fechar.className = 'ficha-modal-fechar';
  fechar.setAttribute('aria-label', 'Fechar');
  fechar.textContent = '×';
  fechar.addEventListener('click', () => fecharModalSimples());
  modal.appendChild(fechar);

  if (titulo) {
    const h = document.createElement('h2');
    h.className = 'ficha-modal-title';
    h.textContent = titulo;
    modal.appendChild(h);
  }

  const corpoEl = document.createElement('div');
  corpoEl.className = 'ficha-modal-corpo-simples';
  if (typeof corpo === 'string') corpoEl.textContent = corpo;
  else if (corpo instanceof Node) corpoEl.appendChild(corpo);
  modal.appendChild(corpoEl);

  backdrop.appendChild(modal);
  modalLayer.appendChild(backdrop);
  modalAtual = modal;
  const pagina = document.querySelector('.ficha-page');
  if (pagina) pagina.inert = true;
  document.removeEventListener('keydown', aoTeclado);
  document.addEventListener('keydown', aoTeclado);

  fechar.focus();
  return modal;
}
