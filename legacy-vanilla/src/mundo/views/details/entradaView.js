import { router } from '../../../core/router.js';
import { ARVORES } from '../../config/arvores.js';
import { CATEGORIAS } from '../../config/categorias.js';
import { getEntradas } from '../../services/entradasService.js';
import { caminhoDaEntrada } from '../../services/navegacaoService.js';
import { renderizarProsa } from '../components/prosaView.js';
import { content } from '../dom.js';
import { prepararPagina } from '../pageView.js';
import { camposIgnorados, decorarDetalhe } from './decorators.js';

const CATEGORIAS_SEM_INDICE = new Set(['deidades', 'realidades', 'reinos']);

function construirCrumbsRealidade(entrada, mapa) {
  const crumbs = [];

  if (entrada.tipo === 'dimensao') {
    const galho = entrada.conteudo?.galho ? mapa[entrada.conteudo.galho] : null;
    if (!galho) return crumbs;

    const arvore = galho.conteudo?.arvore ? mapa[galho.conteudo.arvore] : null;
    if (arvore) crumbs.push({ label: arvore.titulo, path: caminhoDaEntrada(arvore) });
    crumbs.push({ label: galho.titulo, path: caminhoDaEntrada(galho) });
    return crumbs;
  }

  const arvore = entrada.conteudo?.arvore ? mapa[entrada.conteudo.arvore] : null;
  if (arvore) crumbs.push({ label: arvore.titulo, path: caminhoDaEntrada(arvore) });
  return crumbs;
}

function construirCrumbsLocal(entrada, mapa) {
  const crumbs = [];
  const dimensao = entrada.conteudo?.dimensao ? mapa[entrada.conteudo.dimensao] : null;
  if (!dimensao) return crumbs;

  const galho = dimensao.conteudo?.galho ? mapa[dimensao.conteudo.galho] : null;
  const arvore = galho?.conteudo?.arvore ? mapa[galho.conteudo.arvore] : null;

  if (arvore) crumbs.push({ label: arvore.titulo, path: caminhoDaEntrada(arvore) });
  if (galho) crumbs.push({ label: galho.titulo, path: caminhoDaEntrada(galho) });
  crumbs.push({ label: dimensao.titulo, path: caminhoDaEntrada(dimensao) });
  return crumbs;
}

function construirCrumbsExtras(categoriaId, entrada, mapa) {
  if (categoriaId === 'realidades') return construirCrumbsRealidade(entrada, mapa);
  if (categoriaId === 'reinos') return construirCrumbsLocal(entrada, mapa);
  return [];
}

function criarBreadcrumb(categoria, entrada, mapa) {
  const breadcrumb = document.createElement('nav');
  breadcrumb.className = 'entry-breadcrumb';
  breadcrumb.setAttribute('aria-label', 'Caminho de navegação');

  const voltarCategoria = document.createElement('button');
  voltarCategoria.type = 'button';
  voltarCategoria.className = 'entry-breadcrumb-link';

  if (CATEGORIAS_SEM_INDICE.has(categoria.id)) {
    voltarCategoria.textContent = '‹ Árvores';
    voltarCategoria.addEventListener('click', () => router.navegar('/arvores'));
  } else {
    voltarCategoria.textContent = `‹ ${categoria.titulo}`;
    voltarCategoria.addEventListener('click', () => router.navegar(`/${categoria.id}`));
  }

  breadcrumb.appendChild(voltarCategoria);

  construirCrumbsExtras(categoria.id, entrada, mapa).forEach(crumb => {
    const botao = document.createElement('button');
    botao.type = 'button';
    botao.className = 'entry-breadcrumb-link';
    botao.textContent = `‹ ${crumb.label}`;
    if (crumb.path) botao.addEventListener('click', () => router.navegar(crumb.path));
    breadcrumb.appendChild(botao);
  });

  return breadcrumb;
}

function obterEntrada(categoriaId, entradaId, mapa) {
  const entrada = mapa[entradaId];
  if (entrada) return entrada;

  const arvore = categoriaId === 'deidades'
    ? ARVORES.find(item => item.id === entradaId)
    : null;

  if (!arvore) return null;
  return {
    id: entradaId,
    titulo: arvore.titulo,
    tipo: 'deidade',
    conteudo: {},
    _semDados: true,
  };
}

export function renderizarEntrada(categoriaId, entradaId) {
  const categoria = CATEGORIAS.find(item => item.id === categoriaId);
  if (!categoria) {
    router.navegar(`/${CATEGORIAS[0].id}`);
    return;
  }

  const mapa = getEntradas();
  const entrada = obterEntrada(categoriaId, entradaId, mapa);
  if (!entrada) {
    router.navegar(`/${categoriaId}`);
    return;
  }

  prepararPagina();
  content.appendChild(criarBreadcrumb(categoria, entrada, mapa));

  const header = document.createElement('div');
  header.className = 'entry-detail-header';

  const titulo = document.createElement('h2');
  titulo.className = 'entry-detail-title';
  titulo.textContent = entrada.titulo;
  header.appendChild(titulo);
  content.appendChild(header);

  const artigo = renderizarProsa(entrada.conteudo, camposIgnorados(categoriaId));
  content.appendChild(artigo);
  decorarDetalhe(categoriaId, entrada, { headerWrap: header, h2: titulo, article: artigo });
}
