// Contas da luz do dia, sem o motor (testáveis): o período de cada hora, o escuro e a cor
// de cada hora, e o peso do mundo (lua, Lua Carmesim, Noite Eterna, Eclipse). O desenho
// mora em ceu.ts; a hora vem do calendário da campanha (plataforma/core/calendario.py).

import type { ICeu, ITempoMapa } from '../../../services/mapaApi';
import { faseDaLua } from '../../Mundo/calendarioMundo';

export const MINUTOS_DO_DIA = 24 * 60;

export type ChavePeriodo = 'madrugada' | 'amanhecer' | 'manha' | 'tarde' | 'entardecer' | 'noite';

export interface IPeriodo {
  chave: ChavePeriodo;
  rotulo: string;
}

const PERIODOS: Array<{ ate: number } & IPeriodo> = [
  { ate: 5 * 60, chave: 'madrugada', rotulo: 'Madrugada' },
  { ate: 7 * 60, chave: 'amanhecer', rotulo: 'Amanhecer' },
  { ate: 12 * 60, chave: 'manha', rotulo: 'Manhã' },
  { ate: 17 * 60, chave: 'tarde', rotulo: 'Tarde' },
  { ate: 19 * 60, chave: 'entardecer', rotulo: 'Entardecer' },
  { ate: MINUTOS_DO_DIA, chave: 'noite', rotulo: 'Noite' },
];

function noDia(minuto: number): number {
  return ((Math.round(minuto) % MINUTOS_DO_DIA) + MINUTOS_DO_DIA) % MINUTOS_DO_DIA;
}

export function periodoDaHora(minuto: number): IPeriodo {
  const m = noDia(minuto);
  const achado = PERIODOS.find((periodo) => m < periodo.ate) ?? PERIODOS[PERIODOS.length - 1];
  return { chave: achado.chave, rotulo: achado.rotulo };
}

export function horaExtenso(minuto: number): string {
  const m = noDia(minuto);
  return `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`;
}

/** Os pulos do painel Tempo: ir para a próxima vez que o relógio marca essa hora. */
export const MARCOS_DO_DIA = [
  { id: 'amanhecer', rotulo: 'Amanhecer', minuto: 6 * 60 },
  { id: 'meio-dia', rotulo: 'Meio-dia', minuto: 12 * 60 },
  { id: 'entardecer', rotulo: 'Entardecer', minuto: 18 * 60 },
  { id: 'meia-noite', rotulo: 'Meia-noite', minuto: 0 },
] as const;

/** Quantos minutos até o relógio marcar `alvo` de novo. Sempre para a frente: na mesma hora, um dia inteiro. */
export function minutosAte(atual: number, alvo: number): number {
  const diferenca = noDia(alvo - atual);
  return diferenca === 0 ? MINUTOS_DO_DIA : diferenca;
}

export interface ILuzDoCeu {
  /** De 0 (dia claro) a pouco mais de 0,8: o quanto a escuridão cobre a cena. */
  escuro: number;
  /** Cor da escuridão (azul de noite, roxo no crepúsculo, vermelho na Lua Carmesim). */
  corEscuro: number;
  /** Cor que tinge a cena inteira (por multiplicação) e com que força, de 0 a 1. */
  tinta: number;
  tintaForca: number;
}

// [minuto, escuro, cor da escuridão, tinta, força da tinta]. Entre dois quadros, a luz passa aos poucos.
const QUADROS: Array<[number, number, number, number, number]> = [
  [0, 0.78, 0x070b1f, 0x8ea2ff, 0.3],
  [4 * 60 + 30, 0.74, 0x080c22, 0x8ea2ff, 0.28],
  [5 * 60 + 30, 0.45, 0x1a1030, 0xff9a6a, 0.34],
  [6 * 60 + 30, 0.14, 0x2a1428, 0xffb27a, 0.28],
  [8 * 60, 0, 0x2a1428, 0xfff0d2, 0.08],
  [12 * 60, 0, 0x2a1428, 0xffffff, 0],
  [16 * 60, 0, 0x2a1020, 0xffe6b8, 0.1],
  [17 * 60 + 45, 0.1, 0x2a1020, 0xff8a4c, 0.32],
  [18 * 60 + 45, 0.42, 0x1b0f2e, 0xb06ad8, 0.3],
  [20 * 60, 0.74, 0x080c22, 0x8ea2ff, 0.28],
  [MINUTOS_DO_DIA, 0.78, 0x070b1f, 0x8ea2ff, 0.3],
];

export function misturarCor(a: number, b: number, t: number): number {
  const canal = (cor: number, deslocamento: number) => (cor >> deslocamento) & 0xff;
  const mistura = (deslocamento: number) => Math.round(canal(a, deslocamento) + (canal(b, deslocamento) - canal(a, deslocamento)) * t);
  return (mistura(16) << 16) | (mistura(8) << 8) | mistura(0);
}

function luzDaHora(minuto: number): ILuzDoCeu {
  const m = noDia(minuto);
  let indice = 0;
  while (indice < QUADROS.length - 2 && QUADROS[indice + 1][0] <= m) indice++;
  const [m0, e0, c0, t0, f0] = QUADROS[indice];
  const [m1, e1, c1, t1, f1] = QUADROS[indice + 1];
  const t = m1 === m0 ? 0 : (m - m0) / (m1 - m0);
  return {
    escuro: e0 + (e1 - e0) * t,
    corEscuro: misturarCor(c0, c1, t),
    tinta: misturarCor(t0, t1, t),
    tintaForca: f0 + (f1 - f0) * t,
  };
}

export interface IMundoNoCeu {
  estacao?: string;
  /** Posição na lunação: 0 Nova, 0,5 Cheia. */
  lua?: number;
  luaCarmesim?: boolean;
}

/** O quanto a lua ilumina: 0 na Nova, 1 na Cheia. */
export function brilhoDaLua(lua: number): number {
  return (1 - Math.cos(2 * Math.PI * lua)) / 2;
}

/** A luz de uma hora, com o peso do mundo: a lua clareia a noite, a Lua Carmesim tinge de vermelho,
 * a Noite Eterna não deixa o dia nascer e o Eclipse escurece o dia em vermelho. */
export function luzDoCeu(minuto: number, mundo: IMundoNoCeu = {}): ILuzDoCeu {
  const luz = luzDaHora(mundo.estacao === 'noite_eterna' ? 0 : minuto);
  // De 0 (dia) a 1 (noite fechada): quanto do efeito da lua vale nesta hora.
  const noite = Math.max(0, Math.min(1, (luz.escuro - 0.2) / 0.58));
  if (mundo.lua !== undefined) luz.escuro *= 1 - 0.18 * brilhoDaLua(mundo.lua) * noite;
  if (mundo.luaCarmesim) {
    luz.corEscuro = misturarCor(luz.corEscuro, 0x2a0508, noite);
    luz.tinta = misturarCor(luz.tinta, 0xff4a4a, noite);
    luz.tintaForca = Math.max(luz.tintaForca, 0.34 * noite);
  }
  if (mundo.estacao === 'eclipse') {
    const dia = 1 - noite;
    luz.escuro = Math.max(luz.escuro, 0.55 * dia);
    luz.corEscuro = misturarCor(luz.corEscuro, 0x1a0503, dia);
    luz.tinta = misturarCor(luz.tinta, 0xff5a3a, dia);
    luz.tintaForca = Math.max(luz.tintaForca, 0.36 * dia);
  }
  return luz;
}

/** A hora que vale na cena, ou null quando a luz dela não muda com a hora. */
export function minutoDaCena(ceu: ICeu | undefined | null, tempo: ITempoMapa | null): number | null {
  if (!ceu || ceu.modo === 'nenhum') return null;
  if (ceu.modo === 'fixo') return ceu.minuto;
  return tempo ? tempo.minuto : null;
}

/** A luz da cena agora. A hora fixa é só a hora (sem lua nem estação); seguindo o mundo, vale tudo. */
export function luzDaCena(ceu: ICeu | undefined | null, tempo: ITempoMapa | null): ILuzDoCeu | null {
  const minuto = minutoDaCena(ceu, tempo);
  if (minuto === null) return null;
  const mundo = ceu?.modo === 'mundo' && tempo ? { estacao: tempo.estacao, lua: tempo.lua, luaCarmesim: tempo.lua_carmesim } : {};
  return luzDoCeu(minuto, mundo);
}

export function nomeDaLua(lua: number, carmesim: boolean): string {
  if (carmesim) return 'Lua Carmesim';
  return faseDaLua(Math.round(lua * 28) + 1).nome;
}
