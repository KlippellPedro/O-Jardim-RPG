import { router } from '../../core/router.js';
import {
  importarRegrasMestre,
  temRegrasMestre,
} from '../services/masterRulesService.js';

let toastTimer = null;

function mostrarToast(mensagem, tipo) {
  const toast = document.getElementById('regras-toast');
  if (!toast) return;

  toast.textContent = mensagem;
  toast.dataset.tipo = tipo;
  toast.hidden = false;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => {
    toast.hidden = true;
  }, 5000);
}

function atualizarRotulo(botao) {
  botao.textContent = temRegrasMestre()
    ? 'Atualizar área do mestre'
    : 'Importar área do mestre';
}

export function inicializarImportacaoMestre() {
  const botao = document.getElementById('regras-master-import-btn');
  const input = document.getElementById('regras-master-import-input');
  if (!botao || !input) return;

  atualizarRotulo(botao);
  botao.addEventListener('click', () => input.click());

  input.addEventListener('change', async evento => {
    const [arquivo] = evento.target.files;
    if (!arquivo) return;

    try {
      const resultado = importarRegrasMestre(await arquivo.text());
      mostrarToast(resultado.mensagem, resultado.ok ? 'sucesso' : 'erro');
      if (resultado.ok) {
        atualizarRotulo(botao);
        router.navegar('/');
      }
    } catch (erro) {
      console.error(erro);
      mostrarToast('Não foi possível ler o arquivo selecionado.', 'erro');
    } finally {
      input.value = '';
    }
  });
}
