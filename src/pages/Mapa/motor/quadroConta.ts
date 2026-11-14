// O quadro de investigação: as contas do mural (barbantes entre cartas, limites, quem edita), sem React, para testar.
// O servidor decide tudo o que importa (plataforma/core/quadro.py); aqui ficam só as medidas e as cores.

import type { CorDaCarta, ICartaDoQuadro, IQuadro } from '../../../services/mapaApi';

/** O tamanho do mural e da carta, em pixels do mural (o mesmo do servidor). */
export const LARGURA_DO_QUADRO = 2400;
export const ALTURA_DO_QUADRO = 1600;
export const LARGURA_DA_CARTA = 190;
export const ALTURA_DA_CARTA = 126;
export const MAXIMO_DE_CARTAS_DO_JOGADOR = 12;
export const TITULO_MAXIMO = 60;
export const TEXTO_MAXIMO = 240;

export interface ICorDaCarta {
  id: CorDaCarta;
  rotulo: string;
  fundo: string;
  borda: string;
}

export const CORES_DA_CARTA: readonly ICorDaCarta[] = [
  { id: 'papel', rotulo: 'Papel', fundo: '#efe6cf', borda: '#b9a97d' },
  { id: 'amarelo', rotulo: 'Amarelo', fundo: '#f6e58d', borda: '#c9b447' },
  { id: 'vermelho', rotulo: 'Vermelho', fundo: '#f1a9a0', borda: '#c2564a' },
  { id: 'azul', rotulo: 'Azul', fundo: '#a9cdf0', borda: '#5486b8' },
  { id: 'verde', rotulo: 'Verde', fundo: '#b6e0b0', borda: '#5f9b57' },
  { id: 'roxo', rotulo: 'Roxo', fundo: '#d2b9ee', borda: '#8a62b5' },
];

export const corDaCarta = (id: string): ICorDaCarta => CORES_DA_CARTA.find((cor) => cor.id === id) ?? CORES_DA_CARTA[0];

export const centroDaCarta = (carta: Pick<ICartaDoQuadro, 'x' | 'y'>) => ({ x: carta.x + LARGURA_DA_CARTA / 2, y: carta.y + 14 });

export interface IBarbante {
  chave: string;
  x1: number;
  y1: number;
  x2: number;
  y2: number;
}

/** Os barbantes entre as cartas (do alfinete de uma ao da outra). Barbante que aponta para carta que não está na lista some. */
export function barbantesDoQuadro(
  cartas: readonly ICartaDoQuadro[], ligacoes: IQuadro['ligacoes'], posicoes: Readonly<Record<string, { x: number; y: number }>> = {},
): IBarbante[] {
  const porId = new Map(cartas.map((carta) => [carta.id, carta]));
  const saida: IBarbante[] = [];
  for (const { de, para } of ligacoes) {
    const a = porId.get(de);
    const b = porId.get(para);
    if (!a || !b) continue;
    const ca = centroDaCarta({ ...a, ...posicoes[de] });
    const cb = centroDaCarta({ ...b, ...posicoes[para] });
    saida.push({ chave: `${de}:${para}`, x1: ca.x, y1: ca.y, x2: cb.x, y2: cb.y });
  }
  return saida;
}

/** Mantém a carta inteira dentro do mural. */
export function limitarAoQuadro(x: number, y: number): { x: number; y: number } {
  return {
    x: Math.round(Math.max(0, Math.min(LARGURA_DO_QUADRO - LARGURA_DA_CARTA, x)) * 10) / 10,
    y: Math.round(Math.max(0, Math.min(ALTURA_DO_QUADRO - ALTURA_DA_CARTA, y)) * 10) / 10,
  };
}

/** Só o autor e o Mestre mudam o texto e apagam (qualquer um move e liga). */
export const podeEditarCarta = (carta: Pick<ICartaDoQuadro, 'autor'>, usuarioId: string | null | undefined, gestor: boolean): boolean =>
  gestor || (Boolean(carta.autor) && carta.autor === usuarioId);

/** Já existe um barbante entre estas duas cartas (nos dois sentidos)? */
export const jaLigadas = (ligacoes: IQuadro['ligacoes'], a: string, b: string): boolean =>
  ligacoes.some((ligacao) => (ligacao.de === a && ligacao.para === b) || (ligacao.de === b && ligacao.para === a));

/** Quantas cartas o jogador já pregou (para avisar antes do limite). */
export const cartasDe = (cartas: readonly ICartaDoQuadro[], usuarioId: string | null | undefined): number =>
  cartas.filter((carta) => carta.autor && carta.autor === usuarioId).length;

/** A linha de resumo do mural ("5 cartas, 3 barbantes"). */
export function resumoDoQuadro(quadro: IQuadro | undefined): string {
  const cartas = quadro?.cartas.length ?? 0;
  const ligacoes = quadro?.ligacoes.length ?? 0;
  if (!cartas) return 'Nenhuma carta ainda';
  return `${cartas} ${cartas === 1 ? 'carta' : 'cartas'}, ${ligacoes} ${ligacoes === 1 ? 'barbante' : 'barbantes'}`;
}
