import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { ShoppingBag } from 'lucide-react';

interface EstadoVazioBemProps {
  icone: ReactNode;
  titulo: string;
  /** O que este bem dá ao personagem: é o que faz a pessoa querer ter um. */
  explicacao: string;
  /** Categoria da Loja que vende isso. Sem ela, não há atalho. */
  categoriaLoja?: string;
  /** Ação de cadastrar à mão, quando a pessoa pode. */
  acao?: { rotulo: string; onClick: () => void };
  /** Dica extra, por exemplo quem pode criar aquilo na campanha. */
  nota?: string;
}

/** Tela vazia que ensina: diz o que o bem faz, de onde ele vem e o que clicar. */
export const EstadoVazioBem = ({ icone, titulo, explicacao, categoriaLoja, acao, nota }: EstadoVazioBemProps) => (
  <div className="col-span-full rounded-xl border border-dashed border-white/10 px-6 py-10 text-center">
    <div className="mx-auto mb-3 flex justify-center text-gray-700" aria-hidden="true">{icone}</div>
    <p className="text-xs font-bold uppercase tracking-widest text-gray-500">{titulo}</p>
    <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-gray-500">{explicacao}</p>
    {(categoriaLoja || acao) ? (
      <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
        {categoriaLoja ? (
          <Link
            to={`/loja?categoria=${encodeURIComponent(categoriaLoja)}`}
            className="inline-flex items-center gap-2 rounded-xl border border-amber-300/25 bg-amber-300/10 px-4 py-2 text-xs font-bold text-amber-100 transition-colors hover:bg-amber-300/20"
          >
            <ShoppingBag size={14} aria-hidden="true" /> Ver na Loja
          </Link>
        ) : null}
        {acao ? (
          <button type="button" onClick={acao.onClick} className="rounded-xl border border-white/15 px-4 py-2 text-xs font-bold text-gray-300 transition-colors hover:border-white/30 hover:text-white">
            {acao.rotulo}
          </button>
        ) : null}
      </div>
    ) : null}
    {nota ? <p className="mt-3 text-[11px] text-gray-600">{nota}</p> : null}
  </div>
);
