export interface IOrdenavel {
  id: string;
  ordem?: number;
}

/**
 * Reordena somente os itens visíveis sem remover nem deslocar para fora da
 * lista os itens escondidos por busca/filtro. Os itens filtrados ocupam os
 * mesmos "espaços" que já ocupavam na lista completa.
 */
export function mesclarOrdemFiltrada<T extends IOrdenavel>(
  todos: T[],
  visiveisReordenados: T[],
): T[] {
  const base = [...todos].sort((a, b) => (a.ordem || 0) - (b.ordem || 0));
  const idsRecebidos = visiveisReordenados.map((item) => item.id);
  const idsVisiveis = new Set(idsRecebidos);
  const idsOriginaisVisiveis = base.filter((item) => idsVisiveis.has(item.id)).map((item) => item.id);

  const conjuntoValido = idsRecebidos.length === idsVisiveis.size
    && idsRecebidos.length === idsOriginaisVisiveis.length
    && idsRecebidos.every((id) => idsOriginaisVisiveis.includes(id));

  if (!conjuntoValido) {
    return base.map((item, index) => ({ ...item, ordem: index }));
  }

  let cursor = 0;
  return base
    .map((item) => (idsVisiveis.has(item.id) ? visiveisReordenados[cursor++] : item))
    .map((item, index) => ({ ...item, ordem: index }));
}
