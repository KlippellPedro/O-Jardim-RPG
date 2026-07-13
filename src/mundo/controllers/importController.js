import { router } from '../../core/router.js';
import { CATEGORIAS } from '../config/categorias.js';
import { processarArquivo } from '../services/entradasService.js';
import { renderizarArvores } from '../views/arvores/arvoresView.js';
import { renderizarCategoria } from '../views/categories/categoriaView.js';
import { content, obterElemento } from '../views/dom.js';
import { mostrarToast } from '../views/feedbackView.js';

export function inicializarImportacao() {
  const botao = obterElemento('mundo-import-btn');
  const input = obterElemento('mundo-import-input');
  const abrirSeletor = () => input.click();

  botao.addEventListener('click', abrirSeletor);
  content.addEventListener('click', evento => {
    const alvo = evento.target;
    if (alvo instanceof Element && alvo.closest('[data-action="importar"]')) abrirSeletor();
  });

  input.addEventListener('change', async () => {
    const arquivo = input.files?.[0];
    if (!arquivo) return;

    try {
      const resultado = processarArquivo(await arquivo.text());
      mostrarToast(resultado.mensagem, resultado.ok ? 'sucesso' : 'erro');

      if (resultado.ok) {
        const [categoriaAtual = CATEGORIAS[0].id] = router.atual().split('/').filter(Boolean);
        if (categoriaAtual === 'arvores') renderizarArvores();
        else renderizarCategoria(categoriaAtual);
      }
    } catch (erro) {
      console.error('Falha ao ler o arquivo de Mundo:', erro);
      mostrarToast('Erro: não foi possível ler o arquivo selecionado.', 'erro');
    } finally {
      input.value = '';
    }
  });
}
