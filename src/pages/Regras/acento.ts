import type { CSSProperties } from 'react';
import { acentoDoCapitulo, cssRgb } from '../../../data/regras/livro';

/** As duas variáveis de cor que o CSS do leitor lê (`--acento` e `--acento-forte`), para o capítulo dado. */
export const estiloDoAcento = (idDoCapitulo?: string): CSSProperties => {
  const acento = acentoDoCapitulo(idDoCapitulo);
  return {
    '--acento': cssRgb(acento.vivo),
    '--acento-forte': cssRgb(acento.claro),
  } as CSSProperties;
};
