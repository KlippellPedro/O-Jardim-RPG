import { renderizarPaginaClasses } from '../views/catalog/classesView.js';
import { renderizarPaginaLegados } from '../views/catalog/legaciesView.js';
import { renderizarPaginaRacas } from '../views/catalog/racesView.js';
import { carregarCatalogos } from './catalogRepository.js';

export async function resolverTopicoCatalogo(topico) {
  if (!topico.catalogo) return topico;

  try {
    const dados = await carregarCatalogos();
    if (topico.catalogo === 'classes') {
      return renderizarPaginaClasses(dados.classes, topico.id);
    }
    if (topico.catalogo === 'racas') {
      return renderizarPaginaRacas(dados.racas, topico.id);
    }
    if (topico.catalogo === 'legados') {
      return renderizarPaginaLegados(dados.legados, dados.legadosNovos);
    }
    return topico;
  } catch (erro) {
    console.error(erro);
    return {
      resumo: 'Não foi possível carregar este catálogo.',
      corpo: '<p class="regras-note">Os dados da ficha não responderam. Recarregue a página ou confira se o site está sendo servido por HTTP.</p>',
    };
  }
}
