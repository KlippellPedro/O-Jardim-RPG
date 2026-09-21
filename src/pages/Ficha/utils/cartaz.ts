export type TierCartaz = 'comum' | 'prata' | 'ouro' | 'lenda';

/** Valor da recompensa (flavor puro): cresce com o nível, na escala econômica
 * do Jardim (salário-base de 300 Lunaris), e ganha 25% a cada ponto de Fama. */
export const calcularRecompensa = (nivel: number, fama = 0): number => {
  const nivelSeguro = Math.max(1, Math.trunc(Number(nivel) || 1));
  const famaSegura = Math.max(0, Math.min(5, Math.trunc(Number(fama) || 0)));
  return Math.round((nivelSeguro + 1) * 3000 * (1 + famaSegura * 0.25));
};

/** Moldura do cartaz: comum até o nível 9, prata de 10 a 14, ouro de 15 a 19 e
 * lenda no 20. */
export const tierDoCartaz = (nivel: number): TierCartaz => {
  const valor = Math.trunc(Number(nivel) || 1);
  if (valor >= 20) return 'lenda';
  if (valor >= 15) return 'ouro';
  if (valor >= 10) return 'prata';
  return 'comum';
};

export const ROTULO_TIER: Record<TierCartaz, string | null> = {
  comum: null,
  prata: 'Veterano',
  ouro: 'Renomado',
  lenda: 'Lendário',
};
