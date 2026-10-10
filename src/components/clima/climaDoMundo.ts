/** O clima do mundo no fundo do site: a estação do calendário (primavera, verão, outono, inverno,
 * Noite Eterna, Eclipse) e a Lua Carmesim mudam a cor e as partículas do `AtmosphericBackground`.
 *
 * Este módulo só traduz o calendário em "clima" e descreve as partículas de cada estação. Quem busca
 * o calendário é o `ClimaDoMundoHost`; quem desenha é o fundo, que lê os atributos `data-clima-*` da
 * raiz do documento. Assim o CSS cuida das cores e o canvas cuida das partículas, sem um conhecer o outro. */

import type { ChaveEstacao, ICalendarioMundo } from '../../services/calendarioMundoApi';

export const ESTACOES_DO_CLIMA: readonly ChaveEstacao[] = ['primavera', 'verao', 'outono', 'inverno', 'noite_eterna', 'eclipse'];

export interface ClimaDoMundo {
  estacao: ChaveEstacao | null;
  /** Hoje é o dia da Lua Carmesim (e o evento está ligado no calendário). */
  luaCarmesim: boolean;
}

export const SEM_CLIMA: ClimaDoMundo = { estacao: null, luaCarmesim: false };

/** O que o calendário diz sobre o clima de hoje. A estação já vem a valer: com a especial do Mestre ou a que uma lenda forçou. */
export function climaDoCalendario(
  calendario: { estacao?: Pick<ICalendarioMundo['estacao'], 'chave'> | null; hoje_lua_carmesim?: boolean } | null | undefined,
): ClimaDoMundo {
  const chave = calendario?.estacao?.chave;
  return {
    estacao: chave && ESTACOES_DO_CLIMA.includes(chave) ? chave : null,
    luaCarmesim: calendario?.hoje_lua_carmesim === true,
  };
}

export function mesmoClima(a: ClimaDoMundo, b: ClimaDoMundo): boolean {
  return a.estacao === b.estacao && a.luaCarmesim === b.luaCarmesim;
}

/** Os atributos que o fundo lê na raiz do documento (`<html>`). */
export interface RaizComDataset {
  dataset: Record<string, string | undefined>;
}

export function aplicarClima(raiz: RaizComDataset, clima: ClimaDoMundo): void {
  if (clima.estacao) raiz.dataset.climaEstacao = clima.estacao;
  else delete raiz.dataset.climaEstacao;
  if (clima.luaCarmesim) raiz.dataset.climaLua = 'on';
  else delete raiz.dataset.climaLua;
}

export function limparClima(raiz: RaizComDataset): void {
  aplicarClima(raiz, SEM_CLIMA);
}

/** O clima que a raiz está pedindo agora, ou null quando a pessoa desligou o clima do mundo. */
export function lerClimaDaRaiz(raiz: RaizComDataset): ClimaDoMundo | null {
  if (raiz.dataset.climaMundo === 'off') return null;
  const estacao = raiz.dataset.climaEstacao as ChaveEstacao | undefined;
  return {
    estacao: estacao && ESTACOES_DO_CLIMA.includes(estacao) ? estacao : null,
    luaCarmesim: raiz.dataset.climaLua === 'on',
  };
}

export type TipoDeParticula = 'petala' | 'folha' | 'neve' | 'vagalume' | 'brasa';
export type CorRgb = readonly [number, number, number];

export interface EspecificacaoDeParticula {
  tipo: TipoDeParticula;
  /** Quantas partículas numa tela de 1280 x 720; cresce e encolhe com a área. */
  quantidade: number;
  cores: readonly CorRgb[];
  /** Tamanho em pixels, do menor ao maior. */
  tamanho: readonly [number, number];
  /** Quantas alturas de tela por segundo (queda, subida ou deriva). */
  velocidade: readonly [number, number];
  /** Opacidade, da mais fraca à mais forte. */
  alfa: readonly [number, number];
}

export const PARTICULAS_DA_ESTACAO: Record<ChaveEstacao, EspecificacaoDeParticula> = {
  primavera: {
    tipo: 'petala',
    quantidade: 26,
    cores: [[248, 180, 217], [251, 207, 232], [255, 228, 240], [190, 242, 200]],
    tamanho: [3.2, 6.2],
    velocidade: [0.035, 0.08],
    alfa: [0.45, 0.8],
  },
  verao: {
    tipo: 'vagalume',
    quantidade: 24,
    cores: [[250, 230, 120], [220, 245, 140], [255, 214, 102]],
    tamanho: [1.6, 3.4],
    velocidade: [0.006, 0.02],
    alfa: [0.5, 0.95],
  },
  outono: {
    tipo: 'folha',
    quantidade: 22,
    cores: [[224, 122, 45], [184, 65, 45], [217, 164, 59], [150, 84, 40]],
    tamanho: [5, 9],
    velocidade: [0.045, 0.09],
    alfa: [0.5, 0.85],
  },
  inverno: {
    tipo: 'neve',
    quantidade: 46,
    cores: [[255, 255, 255], [214, 232, 255], [190, 215, 255]],
    tamanho: [1.2, 3],
    velocidade: [0.025, 0.06],
    alfa: [0.4, 0.85],
  },
  noite_eterna: {
    tipo: 'vagalume',
    quantidade: 20,
    cores: [[150, 140, 255], [120, 170, 255], [190, 150, 255]],
    tamanho: [1.4, 3],
    velocidade: [0.004, 0.014],
    alfa: [0.45, 0.9],
  },
  eclipse: {
    tipo: 'brasa',
    quantidade: 26,
    cores: [[255, 140, 60], [240, 100, 40], [200, 70, 30]],
    tamanho: [1.2, 3],
    velocidade: [0.02, 0.05],
    alfa: [0.45, 0.9],
  },
};

const AREA_DE_REFERENCIA = 1280 * 720;

/** Quantas partículas cabem na tela: o número da estação, proporcional à área e com piso e teto. */
export function quantidadeDeParticulas(base: number, largura: number, altura: number): number {
  const proporcao = Math.min(1.6, Math.max(0.5, (largura * altura) / AREA_DE_REFERENCIA));
  return Math.max(0, Math.round(base * proporcao));
}
