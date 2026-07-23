import { router } from '../../../core/router.js';
import { ARVORES, corDaArvore } from '../../config/arvores.js';
import { temaDeEntrada } from '../../config/temas.js';
import { getEntradas } from '../../services/entradasService.js';
import { criarProsaTexto, criarProsaVazia, renderizarProsa } from '../components/prosaView.js';
import { content } from '../dom.js';
import { prepararPagina } from '../pageView.js';

const TITULOS_FACETA = {
  arvore: 'Árvore',
  deidade: 'Deidade',
  fluxo: 'Fluxo',
};

function criarBreadcrumb(arvoreId, nomeArvore) {
  const breadcrumb = document.createElement('nav');
  breadcrumb.className = 'entry-breadcrumb';
  breadcrumb.setAttribute('aria-label', 'Caminho de navegação');

  const voltarArvores = document.createElement('button');
  voltarArvores.type = 'button';
  voltarArvores.className = 'entry-breadcrumb-link';
  voltarArvores.textContent = '‹ Árvores';
  voltarArvores.addEventListener('click', () => router.navegar('/arvores'));

  const voltarArvore = document.createElement('button');
  voltarArvore.type = 'button';
  voltarArvore.className = 'entry-breadcrumb-link';
  voltarArvore.textContent = `‹ ${nomeArvore}`;
  voltarArvore.addEventListener('click', () => router.navegar(`/deidades/${arvoreId}`));

  breadcrumb.append(voltarArvores, voltarArvore);
  return breadcrumb;
}

function preencherConteudoFaceta(artigo, faceta, nomeArvore, entradaDeidade, mapa) {
  if (faceta === 'arvore') {
    artigo.appendChild(criarProsaTexto(
      `${nomeArvore} é uma das Árvores do Jardim. A deidade e o Fluxo que ela abriga são a mesma entidade.`,
    ));
    return;
  }

  if (faceta === 'deidade') {
    artigo.appendChild(entradaDeidade
      ? renderizarProsa(entradaDeidade.conteudo, ['fluxo', 'cor'])
      : criarProsaVazia('Nada foi descoberto sobre esta deidade ainda.'));
    return;
  }

  const fluxoId = entradaDeidade?.conteudo?.fluxo;
  const fluxo = fluxoId ? mapa[fluxoId] : null;
  artigo.appendChild(fluxo
    ? renderizarProsa(fluxo.conteudo, ['arvore', 'cor'])
    : criarProsaVazia('Nada foi descoberto sobre o Fluxo desta Árvore ainda.'));
}

export function renderizarFacetaArvore(arvoreId, faceta) {
  const arvoreInfo = ARVORES.find(arvore => arvore.id === arvoreId);
  if (!arvoreInfo) {
    router.navegar('/arvores');
    return;
  }

  const mapa = getEntradas();
  const entradaDeidade = mapa[arvoreId];
  const corCss = `rgb(${corDaArvore(arvoreId)})`;
  const nomeArvore = entradaDeidade?.titulo || arvoreInfo.titulo;

  prepararPagina();
  content.appendChild(criarBreadcrumb(arvoreId, nomeArvore));

  const header = document.createElement('div');
  header.className = 'entry-detail-header';

  const titulo = document.createElement('h2');
  titulo.className = 'entry-detail-title';

  const simbolo = document.createElement('span');
  simbolo.className = 'entry-detail-simbolo';
  simbolo.setAttribute('aria-hidden', 'true');
  simbolo.style.setProperty('--accent', corCss);
  simbolo.textContent = entradaDeidade ? temaDeEntrada(entradaDeidade).simbolo : '✦';
  titulo.append(simbolo, TITULOS_FACETA[faceta]);

  const subtitulo = document.createElement('p');
  subtitulo.className = 'entry-detail-subtitulo';
  subtitulo.style.setProperty('--accent', corCss);
  subtitulo.textContent = nomeArvore;

  header.append(titulo, subtitulo);
  content.appendChild(header);

  const artigo = document.createElement('article');
  artigo.className = 'entry-detail';
  content.appendChild(artigo);
  preencherConteudoFaceta(artigo, faceta, nomeArvore, entradaDeidade, mapa);
}
