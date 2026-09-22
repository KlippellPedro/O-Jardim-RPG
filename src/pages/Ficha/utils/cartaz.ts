import { molduraDoRetrato, type EstiloMoldura } from './retrato';

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

/** Moldura do cartaz: a mesma escada do retrato (um grau novo a cada 5
 * níveis, até o 60), para o personagem ter a mesma "patente" nas duas telas
 * em vez de um selo próprio que parava no nível 20. */
export const molduraDoCartaz = molduraDoRetrato;
export type { EstiloMoldura };
