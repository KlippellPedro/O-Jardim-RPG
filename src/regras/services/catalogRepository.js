const URLS = {
  classes: new URL('../../../data/ficha/classes.json', import.meta.url),
  racas: new URL('../../../data/ficha/racas.json', import.meta.url),
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

export async function carregarCatalogos() {
  if (!cache) {
    cache = Promise.all([
      buscarJson(URLS.classes),
      buscarJson(URLS.racas),
      buscarJson(URLS.legados),
      buscarJson(URLS.legadosNovos),
    ])
      .then(([classes, racas, legados, legadosNovos]) => ({
        classes,
        racas,
        legados,
        legadosNovos,
      }))
      .catch(erro => {
        cache = null;
        throw erro;
      });
  }

  return cache;
}
