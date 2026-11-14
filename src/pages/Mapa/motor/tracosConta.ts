// As contas do desenho livre, sem Pixi nem React, para testar: pontos do lápis, ponta da seta, tempo na tela.

import type { IPonto } from './geometria';

export type FormaDeTraco = 'lapis' | 'linha' | 'seta' | 'circulo' | 'retangulo';

export const FORMAS_DE_TRACO: readonly FormaDeTraco[] = ['lapis', 'linha', 'seta', 'circulo', 'retangulo'];

/** O mesmo teto do servidor (MAX_PONTOS_TRACO em core/mapa.py). */
export const MAX_PONTOS_DO_TRACO = 64;

/** Quanto o traço fica na tela, em ms: os mesmos limites do servidor (3 a 60 segundos). */
export const DURACOES_DO_TRACO_MS = [5000, 10000, 30000, 60000] as const;
export const DURACAO_PADRAO_DO_TRACO_MS = 10000;
/** "Fixo" (só o Mestre): o traço não some, fica na cena até ele apagar. Não passa pelo tempo real: o servidor o guarda. */
export const DURACAO_FIXA_MS = 86_400_000;
/** Para o traço fixo nunca esmaecer na tela. */
export const DURACAO_DO_TRACO_FIXO_NA_TELA_MS = 1e12;
/** Nos últimos instantes o traço some devagar, em vez de sumir de uma vez. */
export const SUMIR_EM_MS = 1200;

export interface OpcoesDeDesenho {
  forma: FormaDeTraco;
  duracao: number;
  /** Só o Mestre vê (rascunho tático). Vale só para quem comanda; o servidor ignora o campo de jogador. */
  privado: boolean;
}

export const OPCOES_DE_DESENHO_PADRAO: OpcoesDeDesenho = { forma: 'lapis', duracao: DURACAO_PADRAO_DO_TRACO_MS, privado: false };

/** Opções vindas de fora (armazenamento do aparelho): o que não é conhecido volta ao padrão. */
export function opcoesDeDesenhoValidas(bruto: unknown): OpcoesDeDesenho {
  const dado = (bruto && typeof bruto === 'object' ? bruto : {}) as Partial<OpcoesDeDesenho>;
  return {
    forma: FORMAS_DE_TRACO.includes(dado.forma as FormaDeTraco) ? (dado.forma as FormaDeTraco) : OPCOES_DE_DESENHO_PADRAO.forma,
    duracao: [...DURACOES_DO_TRACO_MS, DURACAO_FIXA_MS].includes(dado.duracao as never) ? (dado.duracao as number) : OPCOES_DE_DESENHO_PADRAO.duracao,
    privado: dado.privado === true,
  };
}

/**
 * Mais um ponto do lápis: só entra se a mão andou pelo menos `passo` (em unidades do mapa) desde o último, para
 * o traço sair liso e leve. Passou do teto, o último ponto acompanha a mão em vez de crescer a lista.
 */
export function acrescentarPontoDoLapis(pontos: readonly IPonto[], ponto: IPonto, passo: number): IPonto[] {
  const ultimo = pontos[pontos.length - 1];
  if (ultimo && Math.hypot(ponto.x - ultimo.x, ponto.y - ultimo.y) < passo) return pontos as IPonto[];
  if (pontos.length >= MAX_PONTOS_DO_TRACO) return [...pontos.slice(0, -1), ponto];
  return [...pontos, ponto];
}

/** Reduz um traço comprido ao teto de pontos sem perder o começo nem o fim. */
export function reduzirPontos(pontos: readonly IPonto[], maximo = MAX_PONTOS_DO_TRACO): IPonto[] {
  if (pontos.length <= maximo) return [...pontos];
  const saida: IPonto[] = [];
  for (let i = 0; i < maximo; i++) saida.push(pontos[Math.round((i * (pontos.length - 1)) / (maximo - 1))]);
  return saida;
}

/** Os dois pontos da ponta da seta, para quem quer desenhar as duas linhas que saem de `fim`. */
export function pontaDaSeta(inicio: IPonto, fim: IPonto, tamanho: number): [IPonto, IPonto] {
  const angulo = Math.atan2(fim.y - inicio.y, fim.x - inicio.x);
  const abertura = Math.PI / 7;
  return [
    { x: fim.x - tamanho * Math.cos(angulo - abertura), y: fim.y - tamanho * Math.sin(angulo - abertura) },
    { x: fim.x - tamanho * Math.cos(angulo + abertura), y: fim.y - tamanho * Math.sin(angulo + abertura) },
  ];
}

/** 1 até perto do fim, depois some em `SUMIR_EM_MS`; 0 quando acabou. */
export function opacidadeDoTraco(idade: number, duracao: number): number {
  if (idade >= duracao) return 0;
  const faltam = duracao - idade;
  return faltam >= SUMIR_EM_MS ? 1 : Math.max(0, faltam / SUMIR_EM_MS);
}

/** Um traço de 2 pontos que mal saiu do lugar (um clique) não vale a pena mandar para a mesa. */
export function tracoValeAPena(forma: FormaDeTraco, pontos: readonly IPonto[], minimo: number): boolean {
  if (pontos.length < 2) return false;
  const primeiro = pontos[0];
  const ultimo = pontos[pontos.length - 1];
  if (forma === 'lapis') return pontos.some((p) => Math.hypot(p.x - primeiro.x, p.y - primeiro.y) >= minimo);
  return Math.hypot(ultimo.x - primeiro.x, ultimo.y - primeiro.y) >= minimo;
}
