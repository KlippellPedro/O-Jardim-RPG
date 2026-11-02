// Contas das medições: quadros por segundo e suavidade do token visto pelo jogador.

export interface ResumoQuadros {
  quadros: number;
  fpsMediana: number;
  msP95: number;
  msP99: number;
  /** Porcentagem de quadros acima de 25 ms (abaixo de 40 quadros por segundo). */
  travadas: number;
}

function percentil(valores: number[], p: number): number {
  if (!valores.length) return 0;
  const ordenados = [...valores].sort((a, b) => a - b);
  return ordenados[Math.min(ordenados.length - 1, Math.floor((p / 100) * ordenados.length))];
}

export function resumirQuadros(duracoes: number[]): ResumoQuadros {
  const validos = duracoes.filter((d) => d > 0 && d < 1000);
  const mediana = percentil(validos, 50);
  return {
    quadros: validos.length,
    fpsMediana: mediana ? Math.round(1000 / mediana) : 0,
    msP95: +percentil(validos, 95).toFixed(1),
    msP99: +percentil(validos, 99).toFixed(1),
    travadas: validos.length ? +((validos.filter((d) => d > 25).length / validos.length) * 100).toFixed(1) : 0,
  };
}

/** Variação do passo entre quadros (0 = perfeitamente liso). */
export function variacaoDoPasso(posicoes: Array<{ x: number; y: number }>): number {
  const passos: number[] = [];
  for (let i = 1; i < posicoes.length; i++) {
    passos.push(Math.hypot(posicoes[i].x - posicoes[i - 1].x, posicoes[i].y - posicoes[i - 1].y));
  }
  if (passos.length < 2) return 0;
  const media = passos.reduce((s, v) => s + v, 0) / passos.length;
  if (!media) return 0;
  const variancia = passos.reduce((s, v) => s + (v - media) ** 2, 0) / passos.length;
  return +(Math.sqrt(variancia) / media).toFixed(3);
}

export function esperarQuadro(): Promise<number> {
  return new Promise((resolver) => requestAnimationFrame(resolver));
}
