import {
  REGRAS_LEGADOS,
  REQUISITOS_LEGADOS_V1,
} from '../../regras/config/catalogos.js';

const URLS = {
  classes: new URL('../../../data/ficha/classes.json', import.meta.url),
  racas: new URL('../../../data/ficha/racas.json', import.meta.url),
  pericias: new URL('../../../data/ficha/pericias.json', import.meta.url),
  legados: new URL('../../../data/ficha/legados.json', import.meta.url),
  legadosNovos: new URL('../../../data/ficha/legados-novos.json', import.meta.url),
};

let cache = null;

async function buscarJson(url) {
  const resposta = await fetch(url);
  if (!resposta.ok) {
    throw new Error(`Falha ${resposta.status} ao carregar ${url.pathname}`);
  }
  return resposta.json();
}

export async function carregarCatalogo() {
  if (!cache) {
    cache = Promise.all([
      buscarJson(URLS.classes),
      buscarJson(URLS.racas),
      buscarJson(URLS.pericias),
      buscarJson(URLS.legados),
      buscarJson(URLS.legadosNovos),
    ])
      .then(([classes, racas, pericias, legados, legadosNovos]) => {
        const todasPericias = [...(pericias.pericias || []), ...(pericias.resistencias || [])];
        const unicas = [...new Map(todasPericias.map(item => [item.id, item])).values()];
        return {
          classes,
          racas,
          // Fortitude, Reflexos e Vontade fazem parte da lista normal de
          // pericias. `resistencias` permanece vazio apenas por compatibilidade
          // com eventuais consumidores antigos do catalogo.
          pericias: unicas,
          resistencias: [],
          legados: [
            ...legados.legados.map(legado => ({
              ...legado,
              descricao: REGRAS_LEGADOS[legado.id] || legado.descricao,
              pre_requisitos: REQUISITOS_LEGADOS_V1[legado.id] || legado.pre_requisitos,
              versaoRegras: REGRAS_LEGADOS[legado.id] ? '1.0' : 'fonte',
            })),
            ...legadosNovos.novos.map(legado => ({ ...legado, versaoRegras: '1.0' })),
          ],
        };
      })
      .catch(erro => {
        cache = null;
        throw erro;
      });
  }
  return cache;
}
