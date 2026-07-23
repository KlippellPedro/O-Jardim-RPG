import { CATEGORIAS } from '../../config/categorias.js';
import { entradasPorCategoria } from '../../services/entradasService.js';
import {
  prepararPagina,
  renderizarCabecalhoCategoria,
  renderizarEstadoVazio,
} from '../pageView.js';
import { renderizarCosmologia } from './cosmologiaView.js';
import { renderizarDeidades } from './deidadesView.js';
import { renderizarListaGenerica } from './genericaView.js';
import { renderizarRealidades } from './realidadesView.js';

const RENDERIZADORES = {
  cosmologia: renderizarCosmologia,
  deidades: renderizarDeidades,
  realidades: renderizarRealidades,
};

export function renderizarCategoria(categoriaId) {
  const categoria = CATEGORIAS.find(item => item.id === categoriaId) || CATEGORIAS[0];
  prepararPagina();
  renderizarCabecalhoCategoria(categoria);

  const entradas = entradasPorCategoria(categoria);
  if (entradas.length === 0) {
    renderizarEstadoVazio(categoria);
    return;
  }

  const renderizador = RENDERIZADORES[categoria.id] || renderizarListaGenerica;
  renderizador(entradas);
}
