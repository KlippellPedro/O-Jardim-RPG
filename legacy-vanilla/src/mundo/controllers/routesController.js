import { router } from '../../core/router.js';
import { CATEGORIAS, categoriaPorTipo } from '../config/categorias.js';
import { getEntradas } from '../services/entradasService.js';
import { renderizarArvores } from '../views/arvores/arvoresView.js';
import { renderizarCategoria } from '../views/categories/categoriaView.js';
import { renderizarEntrada } from '../views/details/entradaView.js';
import { renderizarFacetaArvore } from '../views/details/facetaArvoreView.js';

const FACETAS_ARVORE = new Set(['arvore', 'deidade', 'fluxo']);

function despacharRotaDinamica(path) {
  const partes = path.split('/').filter(Boolean);

  if (partes.length === 3 && partes[0] === 'deidades') {
    const [, arvoreId, destino] = partes;

    if (FACETAS_ARVORE.has(destino)) {
      renderizarFacetaArvore(arvoreId, destino);
      return;
    }

    const entrada = getEntradas()[destino];
    const categoria = entrada ? categoriaPorTipo(entrada.tipo) : null;
    if (categoria) {
      renderizarEntrada(categoria.id, destino);
      return;
    }

    router.navegar(`/deidades/${arvoreId}`);
    return;
  }

  if (partes.length === 2) {
    const [categoriaId, entradaId] = partes;
    if (CATEGORIAS.some(categoria => categoria.id === categoriaId)) {
      renderizarEntrada(categoriaId, entradaId);
      return;
    }
  }

  router.navegar('/arvores');
}

export function inicializarRotas() {
  router.registrar('/arvores', renderizarArvores);

  CATEGORIAS.forEach(categoria => {
    router.registrar(`/${categoria.id}`, () => renderizarCategoria(categoria.id));
  });

  router.registrarFallback(despacharRotaDinamica);

  const titulo = document.querySelector('.mundo-title');
  if (titulo) titulo.addEventListener('click', () => router.navegar('/arvores'));

  router.iniciar();
}
