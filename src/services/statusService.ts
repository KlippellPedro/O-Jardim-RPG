export interface IStatusVital {
  vidaAtual?: number;
  manaAtual?: number;
  sanidadeAtual?: number;
  cansacoAtual?: number;
  morrendo?: number;
  ferido?: number;
  estabilizado?: boolean;
  morto?: boolean;
  [key: string]: unknown;
}

export function limiteMorrendo(constituicao: unknown): 3 | 4 {
  return Number(constituicao) >= 20 ? 4 : 3;
}

export function atualizarStatusVital(
  statusAtual: IStatusVital,
  campo: string,
  alteracao: number,
  maximo: number,
  constituicao: unknown,
): IStatusVital {
  const maximoSeguro = Math.max(1, Number(maximo) || 1);
  const valorAtual = Number(statusAtual[campo] ?? (campo === 'cansacoAtual' ? 0 : maximoSeguro));
  const minimo = campo === 'vidaAtual' ? -maximoSeguro : 0;
  const proximoValor = Math.max(minimo, Math.min(maximoSeguro, valorAtual + Number(alteracao || 0)));
  const proximo: IStatusVital = { ...statusAtual, [campo]: proximoValor };

  if (campo !== 'vidaAtual') return proximo;

  const limite = limiteMorrendo(constituicao);
  if (proximoValor <= -maximoSeguro) {
    return { ...proximo, morto: true, estabilizado: false, morrendo: limite };
  }
  if (proximoValor <= 0 && valorAtual > 0) {
    return {
      ...proximo,
      morto: false,
      estabilizado: false,
      morrendo: Math.max(1, Number(statusAtual.morrendo) || 0),
    };
  }
  if (proximoValor >= 1 && valorAtual <= 0) {
    return {
      ...proximo,
      morto: false,
      estabilizado: false,
      morrendo: 0,
      ferido: Math.max(0, Number(statusAtual.ferido) || 0) + 1,
    };
  }
  return { ...proximo, morto: false };
}

export function estadoVida(status: IStatusVital, vidaMaxima: number): 'morto' | 'deficit' | 'consciente' {
  if (status.morto || Number(status.vidaAtual) <= -Math.max(1, Number(vidaMaxima) || 1)) return 'morto';
  if (Number(status.vidaAtual) <= 0) return 'deficit';
  return 'consciente';
}

export function penalidadeCansacoTeste(cansaco: unknown, testeFisico: boolean): number {
  const nivel = Math.max(0, Math.min(6, Math.trunc(Number(cansaco) || 0)));
  if (nivel >= 3) return -2;
  if (!testeFisico) return 0;
  if (nivel === 2) return -2;
  if (nivel === 1) return -1;
  return 0;
}

export function penalidadeCansacoIniciativa(cansaco: unknown): number {
  return Math.max(0, Math.trunc(Number(cansaco) || 0)) >= 2 ? -1 : 0;
}

export function multiplicadorMovimentoCansaco(cansaco: unknown): number {
  return Math.max(0, Math.trunc(Number(cansaco) || 0)) >= 5 ? 0.5 : 1;
}
