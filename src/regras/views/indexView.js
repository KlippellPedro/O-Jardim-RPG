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

export function renderizarIndice(content, topicos) {
  content.innerHTML = '';
  content.classList.remove('regras-content--detail');

  const intro = document.createElement('p');
  intro.className = 'regras-intro';
  intro.textContent = 'As mecânicas gerais que sustentam O Jardim. Escolha um tópico para ver os detalhes.';
  content.appendChild(intro);

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
