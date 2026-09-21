import { useEffect, useState } from 'react';

/** Devolve o relógio de parede e o atualiza a cada segundo enquanto `ativo`. */
export function useTempo(ativo = true, intervaloMs = 1000): number {
  const [agora, setAgora] = useState(() => Date.now());
  useEffect(() => {
    if (!ativo) return undefined;
    setAgora(Date.now());
    const timer = window.setInterval(() => setAgora(Date.now()), intervaloMs);
    return () => window.clearInterval(timer);
  }, [ativo, intervaloMs]);
  return agora;
}
