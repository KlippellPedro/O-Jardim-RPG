export const MARGEM_AMEACA_PADRAO = 20;
export const MULTIPLICADOR_CRITICO_PADRAO = 2;

export function normalizarMargemAmeaca(valor: unknown): number {
  const numero = Math.trunc(Number(valor));
  if (!Number.isFinite(numero)) return MARGEM_AMEACA_PADRAO;
  return Math.min(20, Math.max(1, numero));
}

export function normalizarMultiplicadorCritico(valor: unknown): number {
  const numero = Math.trunc(Number(valor));
  if (!Number.isFinite(numero)) return MULTIPLICADOR_CRITICO_PADRAO;
  return Math.min(999, Math.max(1, numero));
}

export function normalizarCriticoBalanceado(margem: unknown, multiplicador: unknown) {
  const inicio = normalizarMargemAmeaca(margem);
  const vezes = normalizarMultiplicadorCritico(multiplicador);
  return { margemAmeaca: inicio, multiplicadorCritico: vezes };
}

export function formatarCritico(margem: unknown, multiplicador: unknown): string {
  const { margemAmeaca: inicio, multiplicadorCritico: vezes } = normalizarCriticoBalanceado(margem, multiplicador);
  const faixa = inicio === 20 ? '20' : `${inicio}-20`;
  return `${faixa}/x${vezes}`;
}

export function ameacaCritico(natural: unknown, margem: unknown): boolean {
  const dado = Math.trunc(Number(natural));
  return Number.isFinite(dado) && dado >= normalizarMargemAmeaca(margem) && dado <= 20;
}

/**
 * Multiplica somente os dados da arma. Em `2d6+1d4+5`, um crítico x3 vira
 * `6d6+3d4+5`: bônus fixos continuam entrando uma única vez.
 */
export function formulaDanoCritico(formula: string, multiplicador: unknown): string | null {
  const texto = String(formula || '').trim().replace(/\s+/g, '');
  if (!texto || !/\d*d\d+/i.test(texto)) return null;

  const vezes = normalizarMultiplicadorCritico(multiplicador);
  return texto.replace(/(^|[+-])(\d*)d(\d+)/gi, (_termo, sinal: string, quantidade: string, faces: string) => {
    const total = (quantidade ? Number(quantidade) : 1) * vezes;
    return `${sinal}${total}d${faces}`;
  });
}
