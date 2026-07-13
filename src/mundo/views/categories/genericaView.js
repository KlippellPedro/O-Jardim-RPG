import { getEntradas } from '../../services/entradasService.js';
import { content } from '../dom.js';
import { renderizarConteudo } from '../components/camposView.js';

export function renderizarListaGenerica(entradas) {
  const mapa = getEntradas();
  const lista = document.createElement('div');
  lista.className = 'mundo-entry-list';

  entradas
    .slice()
    .sort((a, b) => a.titulo.localeCompare(b.titulo, 'pt-BR'))
    .forEach(entrada => {
      const card = document.createElement('article');
      card.className = 'mundo-entry';
      card.dataset.entryId = entrada.id;

      const titulo = document.createElement('h3');
      titulo.className = 'mundo-entry-title';
      titulo.textContent = entrada.titulo;

      card.append(titulo, renderizarConteudo(entrada.conteudo, mapa));
      lista.appendChild(card);
    });

  content.appendChild(lista);
}
