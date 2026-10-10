import { useEffect, useRef, useState } from 'react';
import { movimentoReduzido } from '../../utils/movimento';
import { deltaDaBarra } from './combateVivo';

export interface ReacaoDeBarra {
  /** Muda a cada reação, para o número flutuante recomeçar a animação. */
  chave: number;
  delta: number;
}

let contador = 0;

/** Avisa quando o valor de uma barra muda entre duas leituras (dano, cura, gasto de Mana...).
 *
 * `escopo` identifica de quem é a barra (ex.: o id do participante e o recurso): se ele muda, a
 * primeira leitura nova não conta como variação. Com movimento reduzido, nada reage: o número
 * da barra já mostra o valor novo. A reação some sozinha depois de `duracaoMs`. */
export function useReacaoDeBarra(escopo: string, valor: number | undefined, duracaoMs = 1300): ReacaoDeBarra | null {
  const anterior = useRef<{ escopo: string; valor: number | undefined } | null>(null);
  const [reacao, setReacao] = useState<ReacaoDeBarra | null>(null);

  useEffect(() => {
    const antes = anterior.current;
    anterior.current = { escopo, valor };
    if (!antes || antes.escopo !== escopo) {
      setReacao(null);
      return;
    }
    const delta = deltaDaBarra(antes.valor, valor);
    if (delta === 0 || movimentoReduzido()) return;
    contador += 1;
    setReacao({ chave: contador, delta });
  }, [escopo, valor]);

  useEffect(() => {
    if (!reacao) return undefined;
    const timer = window.setTimeout(() => setReacao(null), duracaoMs);
    return () => window.clearTimeout(timer);
  }, [reacao, duracaoMs]);

  return reacao;
}
