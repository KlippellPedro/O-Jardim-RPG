import { router } from '../../core/router.js';
import { categoriaPorTipo } from '../config/categorias.js';
import { getEntradas } from './entradasService.js';

export function caminhoDaEntrada(entrada) {
  const categoria = categoriaPorTipo(entrada.tipo);
  if (!categoria) return null;

  if (entrada.tipo === 'deidade') return `/deidades/${entrada.id}`;

  const mapa = getEntradas();

  if (entrada.tipo === 'galho' || entrada.tipo === 'realidade') {
    const arvoreId = entrada.conteudo?.arvore;
    if (arvoreId) return `/deidades/${arvoreId}/${entrada.id}`;
  }

  if (entrada.tipo === 'dimensao') {
    const galho = entrada.conteudo?.galho ? mapa[entrada.conteudo.galho] : null;
    const arvoreId = galho?.conteudo?.arvore;
    if (arvoreId) return `/deidades/${arvoreId}/${entrada.id}`;
  }

  if (entrada.tipo === 'reino' || entrada.tipo === 'mundo') {
    const dimensao = entrada.conteudo?.dimensao ? mapa[entrada.conteudo.dimensao] : null;
    const galho = dimensao?.conteudo?.galho ? mapa[dimensao.conteudo.galho] : null;
    const arvoreId = galho?.conteudo?.arvore;
    if (arvoreId) return `/deidades/${arvoreId}/${entrada.id}`;
  }

  return `/${categoria.id}/${entrada.id}`;
}

export function irParaEntrada(id) {
  const entrada = getEntradas()[id];
  if (!entrada) return;

  const caminho = caminhoDaEntrada(entrada);
  if (caminho) router.navegar(caminho);
}
