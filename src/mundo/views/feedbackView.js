import { obterElemento } from './dom.js';

const toast = obterElemento('mundo-toast');
let toastTimer = null;

export function mostrarToast(mensagem, tipo) {
  toast.textContent = mensagem;
  toast.dataset.tipo = tipo;
  toast.hidden = false;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => {
    toast.hidden = true;
  }, 5000);
}
