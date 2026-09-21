import { useEffect, useRef, useState } from 'react';
import { semMovimento } from '../../../utils/movimento';


const desacelerar = (t: number) => 1 - (1 - t) ** 3;

/** Faz um número "rolar" até o valor novo, como um contador de RPG. Quanto
 * maior a diferença, mais tempo ele leva (limitado). Sem movimento, pula
 * direto. Só apresentação: quem chama continua guardando o valor de verdade. */
export function useNumeroAnimado(valor: number, duracaoMaximaMs = 1200): number {
  const [exibido, setExibido] = useState(valor);
  const atual = useRef(valor);

  useEffect(() => {
    if (valor === atual.current) return undefined;
    if (semMovimento()) {
      atual.current = valor;
      setExibido(valor);
      return undefined;
    }
    const de = atual.current;
    const delta = valor - de;
    const duracao = Math.min(duracaoMaximaMs, 320 + Math.log10(Math.abs(delta) + 1) * 260);
    const inicio = performance.now();
    let quadro = 0;
    const passo = (agora: number) => {
      const t = Math.min(1, (agora - inicio) / duracao);
      atual.current = de + delta * desacelerar(t);
      setExibido(atual.current);
      if (t < 1) quadro = window.requestAnimationFrame(passo);
      else atual.current = valor;
    };
    quadro = window.requestAnimationFrame(passo);
    return () => window.cancelAnimationFrame(quadro);
  }, [valor, duracaoMaximaMs]);

  return Math.round(exibido);
}
