import { useEffect, useReducer } from 'react';
import { entrarNaFilaDeVez, estaNaVez, inscreverVez, sairDaFilaDeVez, type TipoAvisoRelampago } from './hub';

/** `querAparecer` diz se este tipo tem algo pronto para mostrar; o retorno diz
 * se é a vez dele de fato tocar som e aparecer na tela agora. */
export function useVezAvisoRelampago(tipo: TipoAvisoRelampago, querAparecer: boolean): boolean {
  const [, avisar] = useReducer((contagem: number) => contagem + 1, 0);

  useEffect(() => inscreverVez(avisar), []);

  useEffect(() => {
    if (querAparecer) entrarNaFilaDeVez(tipo);
    else sairDaFilaDeVez(tipo);
    return () => sairDaFilaDeVez(tipo);
  }, [tipo, querAparecer]);

  return estaNaVez(tipo);
}
