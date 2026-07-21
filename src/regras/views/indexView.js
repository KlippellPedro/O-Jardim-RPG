import { router } from '../../core/router.js';
import { criarIcone } from './iconView.js';

function criarCard(topico, indice) {
  const card = document.createElement('button');
  card.type = 'button';
  card.className = 'regras-card';
  if (topico.hierarquia === 'subtopico') {
    card.classList.add('regras-card--subtopic');
  }
  card.style.setProperty('--accent', topico.accent);
  card.style.animationDelay = `${indice * 70}ms`;
  card.setAttribute('aria-label', `Ver regras de ${topico.titulo}`);
  card.dataset.busca = [topico.titulo, topico.resumo, topico.grupo, (topico.termos || []).join(' ')]
    .filter(Boolean).join(' ');

  const titulo = document.createElement('span');
  titulo.className = 'regras-card-title';
  titulo.textContent = topico.titulo;

  const desc = document.createElement('span');
  desc.className = 'regras-card-desc';
  desc.textContent = topico.resumo;

  const meta = document.createElement('span');
  meta.className = 'regras-card-meta';
  meta.textContent = topico.status === 'desenvolvimento' ? 'Em desenvolvimento' : '';

  const seta = document.createElement('span');
  seta.className = 'regras-card-arrow';
  seta.setAttribute('aria-hidden', 'true');
  seta.textContent = '›';

  card.append(criarIcone(topico, 'regras-card-icon'), titulo, desc);
  if (meta.textContent) card.appendChild(meta);
  card.appendChild(seta);
  card.addEventListener('click', () => router.navegar(`/${topico.id}`));
  return card;
}

/* Busca sem acento: "pericia" acha "Perícias". Filtra por título, resumo e
   pelas palavras-chave do tópico — no meio do jogo ninguém lembra em qual card
   está a regra de condições. */
function normalizar(valor) {
  return String(valor || '')
    .toLocaleLowerCase('pt-BR')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

function criarBusca(content) {
  const area = document.createElement('div');
  area.className = 'regras-busca';

  const campo = document.createElement('input');
  campo.type = 'search';
  campo.className = 'regras-busca-campo';
  campo.placeholder = 'Buscar regra… (ex.: condições, descanso, crítico)';
  campo.setAttribute('aria-label', 'Buscar nas regras');

  const contador = document.createElement('span');
  contador.className = 'regras-busca-contador';

  area.append(campo, contador);

  function filtrar() {
    const termo = normalizar(campo.value.trim());
    const cards = [...content.querySelectorAll('.regras-card')];
    let visiveis = 0;
    cards.forEach(card => {
      const casa = !termo || normalizar(card.dataset.busca).includes(termo);
      card.hidden = !casa;
      if (casa) visiveis += 1;
    });
    // Grupo inteiro sem resultado some junto com o título.
    content.querySelectorAll('.regras-index-section').forEach(grupo => {
      grupo.hidden = ![...grupo.querySelectorAll('.regras-card')].some(card => !card.hidden);
    });
    contador.textContent = termo
      ? (visiveis ? `${visiveis} tópico(s)` : 'Nada encontrado')
      : '';
  }

  campo.addEventListener('input', filtrar);
  campo.addEventListener('keydown', evento => {
    if (evento.key === 'Escape') { campo.value = ''; filtrar(); }
  });
  return area;
}

export function renderizarIndice(content, topicos) {
  content.innerHTML = '';
  content.classList.remove('regras-content--detail');

  const intro = document.createElement('p');
  intro.className = 'regras-intro';
  intro.textContent = 'As mecânicas gerais que sustentam O Jardim. Escolha um tópico para ver os detalhes.';
  content.appendChild(intro);
  content.appendChild(criarBusca(content));

  const grupos = [
    { nome: 'Mecânicas', topicos: topicos.filter(topico => !topico.grupo) },
    {
      nome: 'Personagens',
      topicos: topicos.filter(topico => (
        topico.grupo === 'Personagens' && topico.hierarquia !== 'subtopico'
      )),
    },
  ];
  const topicosMestre = topicos.filter(topico => topico.grupo === 'Mestre');
  if (topicosMestre.length > 0) {
    grupos.push({ nome: 'Mestre', topicos: topicosMestre });
  }

  let indice = 0;
  grupos.forEach(grupo => {
    const section = document.createElement('section');
    section.className = 'regras-index-section';

    const titulo = document.createElement('h2');
    titulo.className = 'regras-index-title';
    titulo.textContent = grupo.nome;

    const grid = document.createElement('div');
    grid.className = 'regras-grid';
    grupo.topicos.forEach(topico => {
      grid.appendChild(criarCard(topico, indice));
      indice += 1;
    });

    section.append(titulo, grid);
    content.appendChild(section);
  });
}
