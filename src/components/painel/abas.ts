/** Aba pedida na URL (`?aba=`) que o painel conhece; qualquer outra coisa cai na aba padrão. */
export function abaValida<T extends string>(abas: readonly T[], pedida: string | null | undefined, padrao: T): T {
  return pedida && (abas as readonly string[]).includes(pedida) ? (pedida as T) : padrao;
}

/** Aba vizinha ao navegar com as setas (dá a volta nas pontas); Home e End vão para a primeira e a última. */
export function abaPorTecla<T extends string>(abas: readonly T[], atual: T, tecla: string): T | null {
  const indice = abas.indexOf(atual);
  if (indice < 0 || abas.length === 0) return null;
  switch (tecla) {
    case 'ArrowRight': return abas[(indice + 1) % abas.length];
    case 'ArrowLeft': return abas[(indice - 1 + abas.length) % abas.length];
    case 'Home': return abas[0];
    case 'End': return abas[abas.length - 1];
    default: return null;
  }
}
