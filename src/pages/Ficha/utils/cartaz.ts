import { molduraDoRetrato, type EstiloMoldura } from './retrato';

/** Até onde a recompensa cresce 22% por nível. Depois dele o crescimento vira
 * linear: 22% por nível ao longo de 500 níveis passaria de 10^40 Lunaris, que
 * já não é valor de cartaz. */
const NIVEL_FIM_DO_CRESCIMENTO_COMPOSTO = 60;

/** Quanto a cabeça do personagem vale. Nível 1 vale um salário mínimo do Jardim
 * (300 Lunaris) e cada nível soma 22% ao anterior, então o nível 20 fica em
 * ~13 mil, abaixo do que uma casa nobre gasta num mês. Passando do 60 cada nível
 * soma mais 10% do valor do 60 (o nível 100 vale 5 vezes o 60). Cada ponto de
 * Fama soma 15%. Arredondado de 50 em 50 pra parecer valor de cartaz, não de
 * calculadora. */
export const calcularRecompensa = (nivel: number, fama = 0): number => {
  const nivelSeguro = Math.max(1, Math.trunc(Number(nivel) || 1));
  const famaSegura = Math.max(0, Math.min(5, Math.trunc(Number(fama) || 0)));
  const composto = 1.22 ** (Math.min(nivelSeguro, NIVEL_FIM_DO_CRESCIMENTO_COMPOSTO) - 1);
  const alemDoComposto = 1 + Math.max(0, nivelSeguro - NIVEL_FIM_DO_CRESCIMENTO_COMPOSTO) / 10;
  const bruto = 300 * composto * alemDoComposto * (1 + famaSegura * 0.15);
  return Math.round(bruto / 50) * 50;
};

/** Moldura do cartaz: a mesma escada do retrato (um grau novo a cada 5
 * níveis, até o 500), para o personagem ter a mesma "patente" nas duas telas
 * em vez de um selo próprio que parava no nível 20. */
export const molduraDoCartaz = molduraDoRetrato;
export type { EstiloMoldura };
