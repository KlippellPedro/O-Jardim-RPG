const MILLISECONDS_PER_SECOND = 1_000;

/**
 * requestAnimationFrame fornece milissegundos, enquanto o `advance` do
 * React Three Fiber 8 grava o timestamp diretamente no relógio em segundos.
 */
export function toR3fElapsedSeconds(timestampMs: number): number {
  if (!Number.isFinite(timestampMs) || timestampMs < 0) return 0;
  return timestampMs / MILLISECONDS_PER_SECOND;
}
