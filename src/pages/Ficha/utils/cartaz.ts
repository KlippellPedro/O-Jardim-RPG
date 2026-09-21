export type TierCartaz = 'comum' | 'prata' | 'ouro' | 'lenda';

/** Quanto a cabeça do personagem vale. Nível 1 vale um salário mínimo do Jardim
 * (300 Lunaris) e cada nível soma 22% ao anterior, então o nível 20 fica em
 * ~13 mil, abaixo do que uma casa nobre gasta num mês. Cada ponto de Fama soma
 * 15%. Arredondado de 50 em 50 pra parecer valor de cartaz, não de calculadora. */
export const calcularRecompensa = (nivel: number, fama = 0): number => {
  const nivelSeguro = Math.max(1, Math.trunc(Number(nivel) || 1));
  const famaSegura = Math.max(0, Math.min(5, Math.trunc(Number(fama) || 0)));
  const bruto = 300 * 1.22 ** (nivelSeguro - 1) * (1 + famaSegura * 0.15);
  return Math.round(bruto / 50) * 50;
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
