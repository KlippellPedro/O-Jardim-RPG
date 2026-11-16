// Quando o mapa troca a versão em 1/4 pelos ladrilhos cheios, e que pedaço da tela vale pedir. Sem Pixi, para testar.

/** Com a tela mais perto que isso (em tela de densidade 1), vêm os ladrilhos cheios. */
export const ZOOM_DETALHE = 0.3;
/** Mesmo com a tela muito densa (retina), os ladrilhos cheios só vêm a partir deste zoom, para não encher a memória de imagem. */
export const ZOOM_DETALHE_MINIMO = 0.16;
/** A densidade a partir da qual o limite deixa de descer (acima disso, o custo de imagem passa do que vale). */
const DENSIDADE_MAXIMA_CONSIDERADA = 1.8;

/**
 * A partir de que zoom da tela os ladrilhos cheios substituem a versão em 1/4. A versão em 1/4 é nítida enquanto cada
 * pixel dela ocupa até um pixel da tela; em tela densa (devicePixelRatio 2) isso acaba na metade do zoom, e a imagem
 * ficava borrada entre os dois limites. Por isso o limite desce com a densidade, sem passar de ZOOM_DETALHE_MINIMO.
 */
export function zoomDeDetalhe(densidade: number = typeof window === 'undefined' ? 1 : window.devicePixelRatio || 1): number {
  if (!Number.isFinite(densidade) || densidade <= 1) return ZOOM_DETALHE;
  return Math.max(ZOOM_DETALHE_MINIMO, ZOOM_DETALHE / Math.min(densidade, DENSIDADE_MAXIMA_CONSIDERADA));
}

export interface Retangulo {
  x: number;
  y: number;
  width: number;
  height: number;
}

/** A área que se pede de ladrilhos: a tela com uma folga em volta (um quarto do menor lado), para o que está logo ao lado já estar pronto. */
export function areaDeCarga<T extends Retangulo>(visivel: T, folga = 0.25): { left: number; right: number; top: number; bottom: number } {
  const margem = Math.min(visivel.width, visivel.height) * folga;
  return {
    left: visivel.x - margem,
    right: visivel.x + visivel.width + margem,
    top: visivel.y - margem,
    bottom: visivel.y + visivel.height + margem,
  };
}
