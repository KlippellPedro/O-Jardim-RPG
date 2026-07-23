import { router } from '../../../core/router.js';
import { categoriaPorTipo } from '../../config/categorias.js';
import { temaDeEntrada } from '../../config/temas.js';
import { humanizarSlug } from '../../utils/texto.js';
import { content } from '../dom.js';

function criarCardDeidade(entrada) {
  const tema = temaDeEntrada(entrada);
  const card = document.createElement('button');
  card.type = 'button';
  card.className = 'deidade-card';
  card.style.setProperty('--accent', tema.cor);

  const simbolo = document.createElement('span');
  simbolo.className = 'deidade-card-simbolo';
  simbolo.setAttribute('aria-hidden', 'true');
  simbolo.textContent = tema.simbolo;
  card.appendChild(simbolo);

  const titulo = document.createElement('span');
  titulo.className = 'deidade-card-titulo';
  titulo.textContent = entrada.titulo;
  card.appendChild(titulo);

  const fluxoId = entrada.conteudo?.fluxo;
  if (fluxoId) {
    const fluxo = document.createElement('span');
    fluxo.className = 'deidade-card-fluxo';
    fluxo.textContent = humanizarSlug(fluxoId);
    card.appendChild(fluxo);
  }

  card.addEventListener('click', () => {
    const categoria = categoriaPorTipo(entrada.tipo);
    if (categoria) router.navegar(`/${categoria.id}/${entrada.id}`);
  });

  return card;
}

export function renderizarDeidades(entradas) {
  const grade = document.createElement('div');
  grade.className = 'deidade-grid';

  entradas
    .slice()
    .sort((a, b) => a.titulo.localeCompare(b.titulo, 'pt-BR'))
    .forEach(entrada => grade.appendChild(criarCardDeidade(entrada)));

  content.appendChild(grade);
}
