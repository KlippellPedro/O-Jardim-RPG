/** Passos dos botões de Vida, Mana e Sanidade no Modo mesa: dois de dano e dois de cura. */
export const PASSOS_RECURSO = [-5, -1, 1, 5] as const;

export const BONUS_MINIMO = -30;
export const BONUS_MAXIMO = 30;

export const limitarBonus = (valor: unknown): number => {
  const numero = Math.trunc(Number(valor) || 0);
  return Math.max(BONUS_MINIMO, Math.min(BONUS_MAXIMO, numero));
};

/** Porcentagem de 0 a 100 para a barra. Vida negativa (caído) conta como zero. */
export function percentual(atual: number, maximo: number): number {
  const teto = Number(maximo);
  const valor = Number(atual);
  if (!Number.isFinite(teto) || teto <= 0 || !Number.isFinite(valor)) return 0;
  return Math.max(0, Math.min(100, (valor / teto) * 100));
}

export type TomBarra = 'ok' | 'alerta' | 'critico';

/** Vermelho abaixo de 25%, amarelo abaixo de 50%. Cansaço vai ao contrário
 * (quanto mais cheio, pior) e fica com `invertido`. */
export function tomDaBarra(pct: number, invertido = false): TomBarra {
  const efetivo = invertido ? 100 - pct : pct;
  if (efetivo < 25) return 'critico';
  if (efetivo < 50) return 'alerta';
  return 'ok';
}

export interface IResultadoRolagem {
  natural: number | null;
  bonus: number;
  total: number | null;
  dt: number | null;
  grau: string | null;
  modo: 'normal' | 'vantagem' | 'desvantagem';
  critico: boolean;
  falha: boolean;
}

const inteiroOuNulo = (valor: unknown): number | null =>
  typeof valor === 'number' && Number.isFinite(valor) ? Math.trunc(valor) : null;

/** Lê o registro que o servidor devolve ao rolar. O dado é sempre sorteado
 * lá; aqui só se interpreta a resposta para mostrar na tela. */
export function lerResultadoRolagem(registro: { resultado?: number | null; detalhes?: Record<string, any> } | null | undefined): IResultadoRolagem | null {
  if (!registro) return null;
  const detalhes = registro.detalhes && typeof registro.detalhes === 'object' ? registro.detalhes : {};
  const natural = inteiroOuNulo(detalhes.natural);
  const total = inteiroOuNulo(detalhes.total) ?? inteiroOuNulo(registro.resultado);
  if (natural === null && total === null) return null;
  const modo = detalhes.modo === 'vantagem' || detalhes.modo === 'desvantagem' ? detalhes.modo : 'normal';
  return {
    natural,
    bonus: inteiroOuNulo(detalhes.bonus) ?? 0,
    total,
    dt: inteiroOuNulo(detalhes.dt),
    grau: typeof detalhes.grau === 'string' ? detalhes.grau : null,
    modo,
    critico: detalhes.critico_natural === true || natural === 20,
    falha: detalhes.falha_natural === true || natural === 1,
  };
}

const sinal = (valor: number) => (valor >= 0 ? `+ ${valor}` : `− ${Math.abs(valor)}`);

/** "14 + 5 = 19" ou, com vantagem, "14 (vantagem) + 5 = 19". */
export function descreverConta(resultado: IResultadoRolagem): string {
  const partes: string[] = [];
  if (resultado.natural !== null) {
    partes.push(`${resultado.natural}${resultado.modo !== 'normal' ? ` (${resultado.modo})` : ''}`);
    if (resultado.bonus !== 0) partes.push(sinal(resultado.bonus));
  }
  if (resultado.total !== null) partes.push(`= ${resultado.total}`);
  return partes.join(' ');
}

export type TomResultado = 'critico' | 'falha' | 'sucesso' | 'derrota' | 'neutro';

export function tomDoResultado(resultado: IResultadoRolagem): TomResultado {
  if (resultado.critico) return 'critico';
  if (resultado.falha) return 'falha';
  if (resultado.grau) return /^sucesso/i.test(resultado.grau) ? 'sucesso' : 'derrota';
  return 'neutro';
}

export function rotuloDoGrau(resultado: IResultadoRolagem): string | null {
  if (resultado.critico) return 'CRÍTICO';
  if (resultado.falha) return 'FALHA CRÍTICA';
  if (!resultado.grau) return null;
  return resultado.grau.toUpperCase();
}
