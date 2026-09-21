import { memo } from 'react';

interface Props {
  chave: string;
  /** O sinal desenhado: quase invisível até o cursor passar por cima. */
  glifo: string;
  /** Quantos cliques (em 5 segundos) até valer como achado. */
  cliques?: number;
  className?: string;
}

/**
 * Um sinalzinho escondido na página. O DescobertasHost conta os cliques pelo
 * `data-descoberta`; aqui só fica o desenho, sem nenhum texto que denuncie o segredo.
 */
export const SimboloOculto = memo(function SimboloOculto({ chave, glifo, cliques = 3, className = '' }: Props) {
  return (
    <span
      aria-hidden="true"
      data-descoberta={chave}
      data-cliques={cliques}
      className={`inline-block select-none px-2 py-1 font-serif text-lg text-violet-200 opacity-[0.05] transition-[opacity,transform,filter] duration-500 hover:scale-125 hover:opacity-80 hover:drop-shadow-[0_0_8px_rgba(167,139,250,0.9)] active:scale-90 ${className}`}
    >
      {glifo}
    </span>
  );
});

export default SimboloOculto;
