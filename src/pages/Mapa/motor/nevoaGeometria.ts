// Contas da névoa que não dependem do motor: o traço do pincel, o retângulo e o
// polígono que o Mestre desenha, e quais ladrilhos o jogador pede. A regra de
// verdade (o que está à vista, o que o servidor libera) mora em
// plataforma/core/nevoa.py; aqui só se evita pedir o que o servidor vai negar.

import type { IFormaNevoa, OperacaoNevoa } from '../../../services/mapaApi';
import type { IPonto } from './geometria';

/** O mesmo teto do servidor (MAX_PONTOS_FORMA): traço maior é cortado em vários. */
export const MAX_PONTOS_TRACO = 600;
export const RAIO_MINIMO = 4;

/** Ponto novo do pincel só entra se andou um pedaço do raio: o traço fica leve e liso. */
export function acrescentarAoTraco(pontos: IPonto[], ponto: IPonto, raio: number): boolean {
  const ultimo = pontos[pontos.length - 1];
  if (ultimo && Math.hypot(ponto.x - ultimo.x, ponto.y - ultimo.y) < Math.max(2, raio * 0.35)) return false;
  pontos.push({ x: ponto.x, y: ponto.y });
  return true;
}

const arredondar = (valor: number) => Math.round(valor * 10) / 10;

export function formaDoTraco(op: OperacaoNevoa, pontos: IPonto[], raio: number): IFormaNevoa | null {
  if (!pontos.length) return null;
  return { op, tipo: 'pincel', raio: arredondar(Math.max(RAIO_MINIMO, raio)), pontos: pontos.map((p) => [arredondar(p.x), arredondar(p.y)]) };
}

/** Retângulo entre dois cantos quaisquer; pequeno demais (um clique sem arrastar) não vale. */
export function formaDoRetangulo(op: OperacaoNevoa, a: IPonto, b: IPonto, minimo = 4): IFormaNevoa | null {
  const x = Math.min(a.x, b.x);
  const y = Math.min(a.y, b.y);
  const w = Math.abs(a.x - b.x);
  const h = Math.abs(a.y - b.y);
  if (w < minimo || h < minimo) return null;
  return { op, tipo: 'retangulo', x: arredondar(x), y: arredondar(y), w: arredondar(w), h: arredondar(h) };
}

export function formaDoPoligono(op: OperacaoNevoa, pontos: IPonto[]): IFormaNevoa | null {
  if (pontos.length < 3) return null;
  return { op, tipo: 'poligono', pontos: pontos.slice(0, MAX_PONTOS_TRACO).map((p) => [arredondar(p.x), arredondar(p.y)]) };
}

/** Clique perto do primeiro ponto (em px da tela) fecha o polígono. */
export function fechaPoligono(pontos: IPonto[], ponto: IPonto, escala: number, raioTela = 14): boolean {
  if (pontos.length < 3) return false;
  return Math.hypot(ponto.x - pontos[0].x, ponto.y - pontos[0].y) * escala <= raioTela;
}

/** Pedaços que formam o fundo: a versão em 1/4 quando há, senão os ladrilhos cheios. Com a névoa, só os liberados. */
export function chavesDoFundo(chaves: string[], liberados: ReadonlySet<string> | null): { chaves: string[]; escala: number } {
  const reduzidos = chaves.filter((c) => c.startsWith('n2/'));
  const base = reduzidos.length ? reduzidos : chaves.filter((c) => c.startsWith('n0/'));
  return { chaves: liberados ? base.filter((c) => liberados.has(c)) : base, escala: reduzidos.length ? 4 : 1 };
}

/** Ladrilho cheio que vem mesmo com o zoom de longe: a névoa segurou a versão reduzida dele. */
export function detalheSempre(chave: string, liberados: ReadonlySet<string> | null): boolean {
  if (!liberados || !chave.startsWith('n0/') || !liberados.has(chave)) return false;
  const [, coluna, linha] = chave.split('/').map(Number);
  return !liberados.has(`n2/${Math.floor(coluna / 4)}/${Math.floor(linha / 4)}`);
}
