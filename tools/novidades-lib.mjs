// Monta a lista do mural "Novidades do Jardim" da Home.
//
// O mural conta o que mudou para quem joga, escrito à mão em
// src/data/novidades-manuais.json, uma vez a cada versão que vai para o ar
// (quando os ZIPs da Discloud são regerados). Commits não aparecem aqui.

/** Ordena da mais nova para a mais antiga, descarta entrada inválida ou com id repetido e corta no limite. */
export function montarNovidades(manuais = [], limite = 80) {
  const vistos = new Set();
  const validas = manuais.filter((item) => {
    if (!item || !item.id || !item.titulo || !/^\d{4}-\d{2}-\d{2}$/.test(item.data)) return false;
    if (vistos.has(item.id)) return false;
    vistos.add(item.id);
    return true;
  });
  return validas
    .map((item, ordem) => ({ item, ordem }))
    .sort((a, b) => (a.item.data === b.item.data ? a.ordem - b.ordem : a.item.data < b.item.data ? 1 : -1))
    .map(({ item }) => item)
    .slice(0, limite);
}
