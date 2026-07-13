import { router } from '../../../core/router.js';
import { categoriaPorTipo } from '../../config/categorias.js';
import { content } from '../dom.js';

function criarTile(entrada) {
  const botao = document.createElement('button');
  botao.type = 'button';
  botao.className = 'entry-tile';

  const titulo = document.createElement('span');
  titulo.className = 'entry-tile-title';
  titulo.textContent = entrada.titulo;
  botao.appendChild(titulo);

  const descricaoTexto = typeof entrada.conteudo?.descricao === 'string'
    ? entrada.conteudo.descricao
    : '';

  if (descricaoTexto) {
    const descricao = document.createElement('span');
    descricao.className = 'entry-tile-desc';
    descricao.textContent = descricaoTexto;
    botao.appendChild(descricao);
  }

  botao.addEventListener('click', () => {
    const categoria = categoriaPorTipo(entrada.tipo);
    if (categoria) router.navegar(`/${categoria.id}/${entrada.id}`);
  });

  return botao;
}

function renderizarDiagramaHierarquia(entrada) {
  const niveis = Array.isArray(entrada.conteudo?.ordem) ? entrada.conteudo.ordem : [];
  if (niveis.length === 0) return;

  const diagrama = document.createElement('div');
  diagrama.className = 'cosmo-diagram';
  diagrama.setAttribute('role', 'group');
  diagrama.setAttribute('aria-label', 'Hierarquia do Jardim — clique para ver detalhes');

  niveis.forEach((nivel, indice) => {
    const botao = document.createElement('button');
    botao.type = 'button';
    botao.className = 'cosmo-node';
    botao.dataset.nivel = indice;
    botao.textContent = nivel;
    botao.addEventListener('click', () => {
      const categoria = categoriaPorTipo(entrada.tipo);
      if (categoria) router.navegar(`/${categoria.id}/${entrada.id}`);
    });
    diagrama.appendChild(botao);

    if (indice < niveis.length - 1) {
      const conector = document.createElement('div');
      conector.className = 'cosmo-connector';
      conector.setAttribute('aria-hidden', 'true');
      diagrama.appendChild(conector);
    }
  });

  content.appendChild(diagrama);
}

export function renderizarCosmologia(entradas) {
  const hierarquia = entradas.find(entrada => entrada.id === 'hierarquia-do-jardim');
  const demaisEntradas = entradas
    .filter(entrada => entrada.id !== 'hierarquia-do-jardim')
    .sort((a, b) => a.titulo.localeCompare(b.titulo, 'pt-BR'));

  if (hierarquia) renderizarDiagramaHierarquia(hierarquia);

  if (demaisEntradas.length > 0) {
    const tiles = document.createElement('div');
    tiles.className = 'entry-tiles';
    demaisEntradas.forEach(entrada => tiles.appendChild(criarTile(entrada)));
    content.appendChild(tiles);
  }
}
