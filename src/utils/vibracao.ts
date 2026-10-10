/** Os padrões de vibração do site, sem depender de nenhuma preferência: quem chama diz se está ligada.
 * (`vibracaoDoApp.ts` junta isto com a preferência da pessoa.) Em desktop e no iOS não há vibração: tudo segue igual. */

export type TipoDeVibracao = 'toque' | 'critico' | 'falha' | 'dano' | 'suaVez';

/** Em milissegundos: número é uma batida só; lista alterna vibra, pausa, vibra... */
export const PADROES_DE_VIBRACAO: Record<TipoDeVibracao, number | number[]> = {
  toque: 14,
  critico: [30, 40, 30, 40, 110],
  falha: [120, 60, 70],
  dano: [60, 30, 40],
  suaVez: [140, 70, 140],
};

interface AparelhoComVibracao {
  vibrate?: (padrao: number | number[]) => boolean;
}

export function vibracaoDisponivel(aparelho: AparelhoComVibracao | undefined = typeof navigator === 'undefined' ? undefined : navigator): boolean {
  return typeof aparelho?.vibrate === 'function';
}

/** Vibra com o padrão pedido. Devolve false quando não vibrou (desligada, sem suporte ou bloqueada pelo navegador). */
export function vibrar(
  tipo: TipoDeVibracao,
  { ligada = true, aparelho = typeof navigator === 'undefined' ? undefined : navigator }: { ligada?: boolean; aparelho?: AparelhoComVibracao } = {},
): boolean {
  if (!ligada || !aparelho || typeof aparelho.vibrate !== 'function') return false;
  try {
    return aparelho.vibrate(PADROES_DE_VIBRACAO[tipo]) !== false;
  } catch {
    return false;
  }
}
