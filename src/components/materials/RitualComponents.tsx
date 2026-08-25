import { ChevronRight, CircleDot } from 'lucide-react';
import { Link } from 'react-router-dom';
import {
  ROTULO_RARIDADE_RECURSO,
  requisitoComponentesRitual,
} from '../../../data/regras/recursos-materiais';

interface RitualComponentsProps {
  complexidade: string;
  compact?: boolean;
}

export function RitualComponents({ complexidade, compact = false }: RitualComponentsProps) {
  const requisito = requisitoComponentesRitual(complexidade);
  const raridade = ROTULO_RARIDADE_RECURSO[requisito.raridade];

  return (
    <section
      className={`mt-3 rounded-xl border border-violet-400/20 bg-violet-400/[0.055] ${compact ? 'p-3' : 'p-4'}`}
      aria-label={`Componentes do ritual ${requisito.titulo}`}
    >
      <div className="flex items-center justify-between gap-3">
        <h5 className="flex items-center gap-2 text-[11px] font-black uppercase tracking-[0.16em] text-violet-200/85">
          <CircleDot className="h-4 w-4" /> Componentes Ritualísticos
        </h5>
        <Link
          to="/materiais?recurso=componentes-ritualisticos"
          className="inline-flex shrink-0 items-center gap-1 text-[11px] font-bold text-violet-300/70 hover:text-violet-100"
        >
          Ver exemplos <ChevronRight className="h-3.5 w-3.5" />
        </Link>
      </div>
      <p className="mt-2 text-[11px] leading-relaxed text-violet-100/60">
        Este rito é <strong className="text-violet-100">{requisito.titulo}</strong>: gaste{' '}
        <strong className="text-violet-100">
          {requisito.quantidade} {requisito.quantidade === 1 ? 'lote' : 'lotes'} de raridade {raridade}
        </strong>{' '}
        ao começar. A Mana também é comprometida nesse momento.
      </p>
      {!compact && (
        <p className="mt-2 text-[10px] leading-relaxed text-violet-100/45">
          Um lote superior pode substituir um inferior. Lotes inferiores não podem ser somados para alcançar outra raridade.
        </p>
      )}
    </section>
  );
}
