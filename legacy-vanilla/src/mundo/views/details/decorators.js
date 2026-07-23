import { router } from '../../../core/router.js';
import { corDaArvore } from '../../config/arvores.js';
import { temaDeEntrada } from '../../config/temas.js';
import { getEntradas } from '../../services/entradasService.js';
import { caminhoDaEntrada, irParaEntrada } from '../../services/navegacaoService.js';
import { humanizarSlug, truncar } from '../../utils/texto.js';
import { montarClusterCirculos } from '../components/circleCluster.js';
import { criarSecaoLinks, criarTituloSecao } from '../components/prosaView.js';

const CAMPOS_IGNORADOS = {
  deidades: ['fluxo', 'cor'],
  realidades: ['arvore', 'galho'],
  reinos: ['dimensao'],
};

function criarCardCategoria(titulo, resumo, corCss, aoClicar) {
  const card = document.createElement('button');
  card.type = 'button';
  card.className = 'arvore-categoria-card';
  card.style.setProperty('--accent', corCss);
  card.addEventListener('click', aoClicar);

  const h3 = document.createElement('h3');
  h3.className = 'arvore-categoria-card-titulo';
  h3.textContent = titulo;

  const paragrafo = document.createElement('p');
  paragrafo.className = 'arvore-categoria-card-resumo';
  paragrafo.textContent = resumo;

  card.append(h3, paragrafo);
  return card;
}

function criarCluster(host, itens) {
  montarClusterCirculos(host, itens, {
    resolverDestino: item => item.caminho,
    aoEntrar: caminho => router.navegar(caminho),
  });
}

function decorarDeidade(entrada, { headerWrap, h2, article }) {
  const mapa = getEntradas();
  const corArvore = corDaArvore(entrada.id);
  const corCss = `rgb(${corArvore})`;

  const simbolo = document.createElement('span');
  simbolo.className = 'entry-detail-simbolo';
  simbolo.setAttribute('aria-hidden', 'true');
  simbolo.style.setProperty('--accent', corCss);
  simbolo.textContent = temaDeEntrada(entrada).simbolo;
  h2.prepend(simbolo);

  const fluxoId = entrada.conteudo?.fluxo;
  if (fluxoId) {
    const subtitulo = document.createElement('p');
    subtitulo.className = 'entry-detail-subtitulo';
    subtitulo.style.setProperty('--accent', corCss);
    subtitulo.textContent = humanizarSlug(fluxoId);
    headerWrap.appendChild(subtitulo);
  }

  article.innerHTML = '';

  const grade = document.createElement('div');
  grade.className = 'arvore-tres-categorias';
  grade.appendChild(criarCardCategoria(
    'Árvore',
    `${entrada.titulo} é uma das Árvores do Jardim.`,
    corCss,
    () => router.navegar(`/deidades/${entrada.id}/arvore`),
  ));

  const resumoDeidade = entrada._semDados
    ? 'Nada foi descoberto ainda.'
    : truncar(entrada.conteudo?.descricao, 90) || 'Ver detalhes.';
  grade.appendChild(criarCardCategoria(
    'Deidade',
    resumoDeidade,
    corCss,
    () => router.navegar(`/deidades/${entrada.id}/deidade`),
  ));

  const fluxo = fluxoId ? mapa[fluxoId] : null;
  const resumoFluxo = fluxo
    ? truncar(fluxo.conteudo?.descricao, 90) || 'Ver detalhes.'
    : 'Nada foi descoberto ainda.';
  grade.appendChild(criarCardCategoria(
    'Fluxo',
    resumoFluxo,
    corCss,
    () => router.navegar(`/deidades/${entrada.id}/fluxo`),
  ));

  article.appendChild(grade);

  const galhos = Object.values(mapa).filter(item => (
    (item.tipo === 'galho' || item.tipo === 'realidade')
    && item.conteudo?.arvore === entrada.id
  ));

  if (galhos.length > 0) {
    article.appendChild(criarTituloSecao('Galhos desta Árvore'));
    const host = document.createElement('div');
    article.appendChild(host);
    criarCluster(host, galhos.map(galho => ({
      id: galho.id,
      titulo: galho.titulo,
      rgb: corArvore,
      caminho: caminhoDaEntrada(galho),
    })));
  }
}

function decorarRealidade(entrada, { headerWrap, h2, article }) {
  const mapa = getEntradas();

  if (entrada.tipo === 'galho' || entrada.tipo === 'realidade') {
    const arvoreId = entrada.conteudo?.arvore;
    const arvore = arvoreId ? mapa[arvoreId] : null;
    const corArvore = corDaArvore(arvoreId);

    if (arvore) {
      const tema = temaDeEntrada(arvore);
      const simbolo = document.createElement('span');
      simbolo.className = 'entry-detail-simbolo';
      simbolo.setAttribute('aria-hidden', 'true');
      simbolo.style.setProperty('--accent', tema.cor);
      simbolo.textContent = tema.simbolo;
      h2.prepend(simbolo);

      const subtitulo = document.createElement('p');
      subtitulo.className = 'entry-detail-subtitulo';
      subtitulo.style.setProperty('--accent', tema.cor);
      subtitulo.textContent = `Galho de ${arvore.titulo}`;
      headerWrap.appendChild(subtitulo);
    }

    const dimensoes = Object.values(mapa)
      .filter(item => item.tipo === 'dimensao' && item.conteudo?.galho === entrada.id);

    if (dimensoes.length > 0) {
      article.appendChild(criarTituloSecao('Dimensões'));
      const host = document.createElement('div');
      article.appendChild(host);
      criarCluster(host, dimensoes.map(dimensao => ({
        id: dimensao.id,
        titulo: dimensao.titulo,
        rgb: corArvore,
        caminho: caminhoDaEntrada(dimensao),
      })));
    }

    if (arvore) {
      article.appendChild(criarSecaoLinks('Árvore', [{
        titulo: arvore.titulo,
        aoClicar: () => irParaEntrada(arvore.id),
      }]));
    }
    return;
  }

  if (entrada.tipo !== 'dimensao') return;

  const galho = entrada.conteudo?.galho ? mapa[entrada.conteudo.galho] : null;
  const arvoreId = galho?.conteudo?.arvore;
  const arvore = arvoreId ? mapa[arvoreId] : null;
  const corArvore = corDaArvore(arvoreId);
  const locais = Object.values(mapa).filter(item => (
    (item.tipo === 'reino' || item.tipo === 'mundo')
    && item.conteudo?.dimensao === entrada.id
  ));

  if (locais.length > 0) {
    article.appendChild(criarTituloSecao('Locais'));
    const host = document.createElement('div');
    article.appendChild(host);
    criarCluster(host, locais.map(local => ({
      id: local.id,
      titulo: local.titulo,
      rgb: corArvore,
      caminho: caminhoDaEntrada(local),
    })));
  }

  const links = [];
  if (galho) links.push({ titulo: galho.titulo, aoClicar: () => irParaEntrada(galho.id) });
  if (arvore) links.push({ titulo: arvore.titulo, aoClicar: () => irParaEntrada(arvore.id) });
  if (links.length > 0) article.appendChild(criarSecaoLinks('Contexto', links));
}

function decorarLocal(entrada, { article }) {
  const mapa = getEntradas();
  const dimensao = entrada.conteudo?.dimensao ? mapa[entrada.conteudo.dimensao] : null;
  const galho = dimensao?.conteudo?.galho ? mapa[dimensao.conteudo.galho] : null;
  const arvore = galho?.conteudo?.arvore ? mapa[galho.conteudo.arvore] : null;
  const links = [];

  if (dimensao) links.push({ titulo: dimensao.titulo, aoClicar: () => irParaEntrada(dimensao.id) });
  if (galho) links.push({ titulo: galho.titulo, aoClicar: () => irParaEntrada(galho.id) });
  if (arvore) links.push({ titulo: arvore.titulo, aoClicar: () => irParaEntrada(arvore.id) });
  if (links.length > 0) article.appendChild(criarSecaoLinks('Contexto', links));
}

const DECORADORES = {
  deidades: decorarDeidade,
  realidades: decorarRealidade,
  reinos: decorarLocal,
};

export function camposIgnorados(categoriaId) {
  return CAMPOS_IGNORADOS[categoriaId] || [];
}

export function decorarDetalhe(categoriaId, entrada, elementos) {
  const decorador = DECORADORES[categoriaId];
  if (decorador) decorador(entrada, elementos);
}
