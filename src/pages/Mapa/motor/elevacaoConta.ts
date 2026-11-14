// A altura dos tokens: o selo "↑ 6 m", a distância em 3D que a régua soma e o dano de queda do Livro de Regras. Sem Pixi nem React.

import { dadosDeQueda, METROS_POR_DADO_DE_QUEDA } from '../../../../data/regras/perigosAmbiente';

export const ELEVACAO_MINIMA = -50;
export const ELEVACAO_MAXIMA = 300;

/** O texto do selo no token: "↑ 6 m" (no ar), "↓ 3 m" (num fosso) ou nada (no chão). */
export function rotuloDaElevacao(metros: number | undefined | null, unidade = 'm'): string | null {
  const valor = Math.round(metros ?? 0);
  if (!valor) return null;
  return `${valor > 0 ? '↑' : '↓'} ${Math.abs(valor)} ${unidade}`;
}

/** A distância em linha reta entre dois pontos na horizontal (`metros`) e na vertical (`desnivel`). */
export function distanciaEm3D(metros: number, desnivel: number): number {
  return Math.round(Math.hypot(metros, desnivel) * 10) / 10;
}

/** O que a régua escreve entre dois tokens de alturas diferentes; nada quando estão no mesmo nível. */
export function textoDaDistanciaEm3D(metros: number, de: number | undefined, para: number | undefined, unidade = 'm'): string | undefined {
  const desnivel = Math.abs((para ?? 0) - (de ?? 0));
  if (!desnivel) return undefined;
  return `Em 3D: ${distanciaEm3D(metros, desnivel).toLocaleString('pt-BR')} ${unidade} (${desnivel.toLocaleString('pt-BR')} ${unidade} de diferença de altura)`;
}

export interface IQueda {
  metros: number;
  /** Quantos d6 (0 abaixo de três metros: sem dano, mas cai Caído). */
  dados: number;
  formula: string | null;
  texto: string;
}

/** A queda de uma altura até o chão, pelo Livro: 1d6 de impacto a cada 3 m, até 20d6. */
export function quedaDe(metros: number): IQueda {
  const altura = Math.max(0, Math.round(metros));
  const dados = dadosDeQueda(altura);
  if (dados <= 0) {
    return { metros: altura, dados: 0, formula: null, texto: `Caiu ${altura} m: menos de ${METROS_POR_DADO_DE_QUEDA} m não causa dano, mas quem cai sem querer fica Caído.` };
  }
  return { metros: altura, dados, formula: `${dados}d6`, texto: `Caiu ${altura} m: ${dados}d6 de dano de impacto. Quem pulou por vontade própria pode cair de pé com Acrobacia.` };
}
