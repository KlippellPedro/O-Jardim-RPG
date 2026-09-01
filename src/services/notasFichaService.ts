export const LIMITE_ETIQUETAS_NOTA = 8;
export const LIMITE_CARACTERES_ETIQUETA = 32;

interface INotaComEtiquetas {
  categoria?: unknown;
  etiquetas?: unknown;
}

export function normalizarEtiqueta(valor: unknown): string {
  if (typeof valor !== 'string') return '';
  return valor
    .replace(/^#+/, '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, LIMITE_CARACTERES_ETIQUETA);
}

export function normalizarEtiquetas(valores: unknown): string[] {
  if (!Array.isArray(valores)) return [];
  const chaves = new Set<string>();
  const resultado: string[] = [];
  valores.forEach((valor) => {
    const etiqueta = normalizarEtiqueta(valor);
    const chave = etiqueta.toLocaleLowerCase('pt-BR');
    if (!etiqueta || chaves.has(chave) || resultado.length >= LIMITE_ETIQUETAS_NOTA) return;
    chaves.add(chave);
    resultado.push(etiqueta);
  });
  return resultado;
}

/** Mantém compatibilidade com notas antigas, que possuíam somente `categoria`. */
export function obterEtiquetasNota(nota: INotaComEtiquetas): string[] {
  const etiquetas = normalizarEtiquetas(nota?.etiquetas);
  if (etiquetas.length) return etiquetas;
  const categoriaLegada = normalizarEtiqueta(nota?.categoria);
  return [categoriaLegada || 'Geral'];
}

export function separarEtiquetasDigitadas(valor: string): string[] {
  return normalizarEtiquetas(valor.split(/[,;\n]/g));
}
