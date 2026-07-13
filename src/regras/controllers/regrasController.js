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
  });

  const titulo = document.querySelector('.regras-title');
  if (titulo) titulo.addEventListener('click', () => router.navegar('/'));

  router.iniciar();
}
