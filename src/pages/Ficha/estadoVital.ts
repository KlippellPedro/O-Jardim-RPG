import { useSyncExternalStore } from 'react';

/** Estado de Vida e Sanidade da ficha aberta, em porcentagem (0 a 100), para
 * a vinheta de tela cheia reagir sem precisar conhecer o cálculo dos máximos.
 * As barras de Status Vitais publicam aqui; só isso. */
export interface EstadoVital {
  vida: number;
  sanidade: number;
  /** Não move a vinheta; só a Análise do Grande Sábio lê. */
  mana: number;
}

export type TipoPancada = 'dano' | 'cura' | 'sanidade';

export interface Pancada {
  chave: number;
  tipo: TipoPancada;
  /** 0 a 1: o quanto o golpe pesou em relação ao máximo. */
  forca: number;
}

const PADRAO: EstadoVital = { vida: 100, sanidade: 100, mana: 100 };

let estado: EstadoVital = PADRAO;
const ouvintesEstado = new Set<() => void>();
const ouvintesPancada = new Set<(pancada: Pancada) => void>();
let contador = 0;

export const publicarEstadoVital = (parcial: Partial<EstadoVital>) => {
  const proximo = { ...estado, ...parcial };
  if (proximo.vida === estado.vida && proximo.sanidade === estado.sanidade && proximo.mana === estado.mana) return;
  estado = proximo;
  ouvintesEstado.forEach((ouvinte) => ouvinte());
};

export const resetarEstadoVital = () => publicarEstadoVital(PADRAO);

export const useEstadoVital = (): EstadoVital => useSyncExternalStore(
  (aviso) => { ouvintesEstado.add(aviso); return () => { ouvintesEstado.delete(aviso); }; },
  () => estado,
  () => PADRAO,
);

export const dispararPancada = (tipo: TipoPancada, forca: number) => {
  contador += 1;
  const pancada = { chave: contador, tipo, forca: Math.min(1, Math.max(0.15, forca)) };
  ouvintesPancada.forEach((ouvinte) => ouvinte(pancada));
};

export const inscreverPancada = (ouvinte: (pancada: Pancada) => void) => {
  ouvintesPancada.add(ouvinte);
  return () => { ouvintesPancada.delete(ouvinte); };
};
