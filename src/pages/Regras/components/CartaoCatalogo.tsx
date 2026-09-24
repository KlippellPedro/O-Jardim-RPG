import React from 'react';
import { ArrowRight, CheckCircle2 } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { PremiumCard } from '../../../redesign/components/premium/PremiumCard';
import type { ThemeEntry } from '../../../redesign/themeMap';

/** Cartão de entrada do catálogo de Classes e de Raças. Os dois grids usam o
 * mesmo esqueleto (emblema, título, frase de identidade, bloco de números e
 * rodapé) e só mudam o que entra em `children`. */
interface CartaoCatalogoProps {
  titulo: string;
  descricao?: string;
  icone: LucideIcon;
  tema: ThemeEntry;
  /** Selo pequeno acima do título (ex.: Árvores da classe especial). */
  etiqueta?: string;
  rotuloAcao: string;
  concluido?: boolean;
  indice: number;
  onAbrir: () => void;
  children?: React.ReactNode;
}

const CORES_RECURSO = {
  vida: { cheio: 'bg-rose-400', rotulo: 'text-rose-300/80' },
  mana: { cheio: 'bg-sky-400', rotulo: 'text-sky-300/80' },
  estamina: { cheio: 'bg-emerald-400', rotulo: 'text-emerald-300/80' },
} as const;

export type RecursoCatalogo = keyof typeof CORES_RECURSO;

const SEGMENTOS_RECURSO = 6;

/** Uma linha "Vida ▮▮▮▮▯▯ 4". A escala é a mesma nos três recursos para que
 * um cartão possa ser comparado com o do lado só olhando. */
export const LinhaRecurso: React.FC<{ recurso: RecursoCatalogo; rotulo: string; valor: number }> = ({ recurso, rotulo, valor }) => {
  const cores = CORES_RECURSO[recurso];
  const cheios = Math.max(0, Math.min(SEGMENTOS_RECURSO, Math.round(valor)));
  return (
    <div className="flex items-center gap-2" title={`${rotulo}: ${valor} por nível`}>
      <span className={`w-14 text-[10px] font-bold uppercase tracking-wider ${cores.rotulo}`}>{rotulo}</span>
      <span className="flex flex-1 gap-[3px]" aria-hidden="true">
        {Array.from({ length: SEGMENTOS_RECURSO }, (_, i) => (
          <span key={i} className={`h-1.5 flex-1 rounded-full ${i < cheios ? cores.cheio : 'bg-white/10'}`} />
        ))}
      </span>
      <span className="w-4 text-right text-xs font-semibold tabular-nums text-gray-300">{valor}</span>
    </div>
  );
};

/** Pequena etiqueta arredondada (ajuste de atributo, movimento, estágios). */
export const ChipCatalogo: React.FC<{ children: React.ReactNode; tom?: 'positivo' | 'negativo' | 'neutro'; titulo?: string }> = ({ children, tom = 'neutro', titulo }) => {
  const estilo = tom === 'positivo'
    ? 'border-emerald-400/25 bg-emerald-400/10 text-emerald-200'
    : tom === 'negativo'
      ? 'border-rose-400/25 bg-rose-400/10 text-rose-200'
      : 'border-white/10 bg-white/5 text-gray-300';
  return (
    <span title={titulo} className={`inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-[11px] font-semibold tabular-nums ${estilo}`}>
      {children}
    </span>
  );
};

export const CartaoCatalogo: React.FC<CartaoCatalogoProps> = ({
  titulo, descricao, icone: Icone, tema, etiqueta, rotuloAcao, concluido, indice, onAbrir, children,
}) => (
  <PremiumCard
    glowColor={tema.glow}
    initial={{ opacity: 0, y: 16 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.28, delay: Math.min(indice * 0.03, 0.24) }}
    onClick={onAbrir}
    role="button"
    tabIndex={0}
    onKeyDown={(evento: React.KeyboardEvent) => {
      if (evento.key === 'Enter' || evento.key === ' ') {
        evento.preventDefault();
        onAbrir();
      }
    }}
    className={`group content-auto-list-item cursor-pointer min-h-[220px] p-5 text-left shadow-lg border focus-visible:outline focus-visible:outline-2 focus-visible:outline-white/40 ${tema.border} ${tema.bg}`}
  >
    {/* Luz de fundo e emblema gigante cortado no canto. */}
    <div
      className="pointer-events-none absolute right-0 top-0 -mr-10 -mt-10 h-32 w-32 rounded-full blur-2xl"
      style={{ backgroundColor: tema.glow.replace(/,[\d.]+\)/, ',0.2)') }}
    />
    <Icone
      aria-hidden="true"
      strokeWidth={1.25}
      className={`pointer-events-none absolute -bottom-6 -right-5 h-36 w-36 -rotate-12 opacity-[0.08] transition-all duration-300 group-hover:-rotate-6 group-hover:opacity-[0.16] ${tema.text}`}
    />

    <div className="relative flex flex-1 flex-col gap-3">
      <div className="flex items-center gap-3">
        <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-black/30 ring-1 ring-white/10 ${tema.text}`}>
          <Icone size={20} />
        </span>
        <div className="min-w-0">
          {etiqueta ? (
            <p title={etiqueta} className={`truncate text-[10px] font-bold uppercase tracking-wider ${tema.tag}`}>{etiqueta}</p>
          ) : null}
          <h3 className={`break-words text-xl font-bold leading-tight ${tema.text}`} style={{ fontFamily: 'Cinzel, serif' }}>
            {titulo}
          </h3>
        </div>
      </div>

      {descricao ? (
        <p
          className="text-[13px] leading-relaxed text-gray-400"
          style={{ display: '-webkit-box', WebkitBoxOrient: 'vertical', WebkitLineClamp: 3, overflow: 'hidden' }}
        >
          {descricao}
        </p>
      ) : null}

      {children ? <div className="mt-auto space-y-1.5 pt-1">{children}</div> : null}
    </div>

    <div className={`relative mt-4 flex items-center justify-between border-t border-white/5 pt-3 text-xs font-bold uppercase tracking-widest ${tema.icon}`}>
      <span className="flex items-center gap-2">
        {rotuloAcao}
        <ArrowRight size={14} className="transition-transform duration-200 group-hover:translate-x-1" />
      </span>
      {concluido ? (
        <span title="Progressão completa até o nível 20" className="text-emerald-400/70">
          <CheckCircle2 size={14} aria-label="Progressão completa" />
        </span>
      ) : null}
    </div>
  </PremiumCard>
);
