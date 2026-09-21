import type { ReactNode } from 'react';

export type AcentoBem = 'emerald' | 'amber';

const ACENTO: Record<AcentoBem, { borda: string; fundo: string; kicker: string }> = {
  emerald: { borda: 'border-emerald-500/15', fundo: 'bg-emerald-950/10', kicker: 'text-emerald-400' },
  amber: { borda: 'border-amber-500/15', fundo: 'bg-amber-950/10', kicker: 'text-amber-400' },
};

interface CardBemProps {
  kicker: string;
  titulo: string;
  acento?: AcentoBem;
  acoes?: ReactNode;
  children?: ReactNode;
}

/** Casca única dos bens (propriedade, veículo): mesmo cabeçalho, mesmas ações,
 * só o miolo muda. Base e veículo passam a falar a mesma língua visual. */
export const CardBem = ({ kicker, titulo, acento = 'emerald', acoes, children }: CardBemProps) => {
  const cor = ACENTO[acento];
  return (
    <article className={`rounded-xl border ${cor.borda} ${cor.fundo} p-5`}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <span className={`text-[10px] font-black uppercase tracking-widest ${cor.kicker}`}>{kicker}</span>
          <h3 className="mt-1 truncate text-lg font-bold text-white">{titulo}</h3>
        </div>
        {acoes ? <div className="flex gap-1">{acoes}</div> : null}
      </div>
      {children}
    </article>
  );
};
