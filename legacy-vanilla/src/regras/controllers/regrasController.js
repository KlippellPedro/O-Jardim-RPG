import { router } from '../../core/router.js';
import { executarComTransicao, reiniciarAnimacao } from '../../core/viewTransition.js';
import { regraOficialPorId } from '../config/regrasOficiais.js';
import { TOPICOS, topicoPorId } from '../config/topicos.js';
import { resolverTopicoCatalogo } from '../services/catalogService.js';
import {
  getRegrasMestre,
  temRegrasMestre,
  TOPICO_MESTRE,
} from '../services/masterRulesService.js';
import {
  criarDestaques,
  criarNavegacaoSecoes,
  estruturarArtigo,
} from '../views/articleView.js';
import { criarCalculadora } from '../views/calculatorView.js';
import { criarCabecalhoDetalhe } from '../views/detailView.js';
import { renderizarIndice as montarIndice } from '../views/indexView.js';
import { criarPaginaMestre } from '../views/masterView.js';

const content = document.getElementById('regras-content');
let renderizacaoAtual = 0;

function voltarAoTopo() {
  window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
}

function normalizarBusca(valor) {
  return String(valor || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLocaleLowerCase('pt-BR')
    .trim();
}

function filtrarCatalogo(input) {
  const secao = input.closest('.regras-rule-section');
  const toolbar = input.closest('[data-catalog-toolbar]');
  if (!secao || !toolbar) return;
  const termo = normalizarBusca(input.value);
  const itens = [...secao.querySelectorAll('[data-catalog-item]')];
  let visiveis = 0;
  itens.forEach(item => {
    const corresponde = !termo || normalizarBusca(item.textContent).includes(termo);
    item.hidden = !corresponde;
    if (corresponde) visiveis += 1;
  });
  const contador = toolbar.querySelector('[data-catalog-count]');
  const rotulo = toolbar.dataset.catalogLabel || 'itens';
  if (contador) {
    contador.textContent = termo
      ? `${visiveis} de ${itens.length} ${rotulo}`
      : `${itens.length} ${rotulo}`;
  }
  const vazio = secao.querySelector('[data-catalog-empty]');
  if (vazio) vazio.hidden = visiveis !== 0;
}

function renderizarIndice() {
  renderizacaoAtual += 1;
  reiniciarAnimacao(content);
  const topicos = temRegrasMestre() ? [...TOPICOS, TOPICO_MESTRE] : TOPICOS;
  montarIndice(content, topicos);
  voltarAoTopo();
}

function criarTrilhaVolta(topico) {
  const crumb = document.createElement('button');
  const topicoPai = topico.pai ? topicoPorId(topico.pai) : null;

  crumb.type = 'button';
  crumb.className = 'regras-crumb';
  crumb.style.setProperty('--accent', topico.accent);
  crumb.textContent = topicoPai ? `‹ ${topicoPai.titulo}` : '‹ Regras';
  crumb.addEventListener('click', () => {
    router.navegar(topicoPai ? `/${topicoPai.id}` : '/');
  });
  return crumb;
}

async function renderizarTopico(id) {
  const renderizacao = ++renderizacaoAtual;
  const topico = id === TOPICO_MESTRE.id && temRegrasMestre()
    ? TOPICO_MESTRE
    : topicoPorId(id);
  if (!topico) {
    router.navegar('/');
    return;
  }

  let dados;
  if (id === TOPICO_MESTRE.id) {
    dados = criarPaginaMestre(getRegrasMestre());
  } else {
    dados = topico.catalogo
      ? await resolverTopicoCatalogo(topico)
      : regraOficialPorId(id) || topico;
  }

  if (renderizacao !== renderizacaoAtual) return;

  reiniciarAnimacao(content);
  content.innerHTML = '';
  content.classList.add('regras-content--detail');
  content.appendChild(criarTrilhaVolta(topico));

  content.appendChild(criarCabecalhoDetalhe({ topico, dados }));
  if (dados.destaques?.length) content.appendChild(criarDestaques(dados.destaques));
  if (id === 'sistema-base') {
    content.appendChild(criarCalculadora());
  }

  const { article, secoes } = estruturarArtigo(dados.corpo);
  const layout = document.createElement('div');
  layout.className = 'regras-detail-layout';
  layout.append(criarNavegacaoSecoes(secoes), article);
  content.appendChild(layout);
  voltarAoTopo();
}

export function inicializarRegras() {
  if (!content) return;

  router.registrar('/', () => executarComTransicao(renderizarIndice));
  TOPICOS.forEach(topico => {
    router.registrar(
      `/${topico.id}`,
      () => executarComTransicao(() => renderizarTopico(topico.id)),
    );
  });
  router.registrar(
    `/${TOPICO_MESTRE.id}`,
    () => executarComTransicao(() => renderizarTopico(TOPICO_MESTRE.id)),
  );
  router.registrarFallback(() => router.navegar('/'));

  content.addEventListener('click', evento => {
    const botao = evento.target.closest('[data-topico-link]');
    if (botao) router.navegar(`/${botao.dataset.topicoLink}`);

    const expansao = evento.target.closest('[data-catalog-expand]');
    if (expansao) {
      const secao = expansao.closest('.regras-rule-section');
      const abrir = expansao.dataset.catalogExpand === 'open';
      secao?.querySelectorAll('details[data-catalog-item]:not([hidden])')
        .forEach(item => { item.open = abrir; });
    }
  });

  content.addEventListener('input', evento => {
    if (evento.target.matches('[data-catalog-search]')) filtrarCatalogo(evento.target);
  });

  const titulo = document.querySelector('.regras-title');
  if (titulo) titulo.addEventListener('click', () => router.navegar('/'));

  router.iniciar();
}
