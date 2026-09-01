import { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { ChevronDown, EyeOff, RotateCcw } from 'lucide-react';

export interface ItemAutomaticoOculto {
  id: string;
  titulo: string;
  origem?: string;
}

interface ItensAutomaticosOcultosProps {
  itens: ItemAutomaticoOculto[];
  tipo: 'habilidade' | 'poder';
  onRestaurar: (id: string) => void;
}

export function ItensAutomaticosOcultos({ itens, tipo, onRestaurar }: ItensAutomaticosOcultosProps) {
  const [aberto, setAberto] = useState(false);
  if (!itens.length) return null;

  const plural = tipo === 'habilidade' ? 'Habilidades ocultas' : 'Poderes ocultos';

  return (
    <motion.section
      layout
      data-tour={tipo === 'habilidade' ? 'habilidades-ocultas' : 'poderes-ocultos'}
      initial={{ opacity: 0, y: -6 }}
      animate={{ opacity: 1, y: 0 }}
      className="ficha-hidden-items overflow-hidden rounded-xl border border-dashed"
    >
      <button
        type="button"
        onClick={() => setAberto((atual) => !atual)}
        className="ficha-hidden-items__trigger flex w-full items-center justify-between gap-3 px-3.5 py-3 text-left sm:px-4"
        aria-expanded={aberto}
      >
        <span className="flex min-w-0 items-center gap-3">
          <span className="ficha-hidden-items__icon flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border">
            <EyeOff size={15} aria-hidden="true" />
          </span>
          <span className="min-w-0">
            <strong className="block text-xs uppercase tracking-[0.14em] text-gray-300">{plural}</strong>
            <span className="mt-0.5 block truncate text-[11px] text-gray-600">Ficam fora da ficha até você restaurar.</span>
          </span>
        </span>
        <span className="flex shrink-0 items-center gap-2">
          <span className="ficha-hidden-items__count rounded-full border px-2 py-0.5 text-[10px] font-black">{itens.length}</span>
          <ChevronDown size={15} className={`text-gray-500 transition-transform duration-200 ${aberto ? 'rotate-180' : ''}`} aria-hidden="true" />
        </span>
      </button>

      <AnimatePresence initial={false}>
        {aberto && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
            className="overflow-hidden"
          >
            <div className="grid gap-2 border-t border-white/5 p-2.5 sm:grid-cols-2 sm:p-3">
              {itens.map((item) => (
                <motion.div
                  layout
                  key={item.id}
                  initial={{ opacity: 0, scale: 0.98 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.97 }}
                  className="flex min-w-0 items-center justify-between gap-3 rounded-lg border border-white/5 bg-black/20 px-3 py-2.5"
                >
                  <span className="min-w-0">
                    <strong className="block truncate text-xs text-gray-300">{item.titulo}</strong>
                    {item.origem && <span className="mt-0.5 block truncate text-[10px] text-gray-600">{item.origem}</span>}
                  </span>
                  <button
                    type="button"
                    onClick={() => onRestaurar(item.id)}
                    className="ficha-hidden-items__restore flex shrink-0 items-center gap-1.5 rounded-md border px-2.5 py-1.5 text-[10px] font-black uppercase tracking-wider transition-all"
                    aria-label={`Restaurar ${item.titulo}`}
                  >
                    <RotateCcw size={12} aria-hidden="true" /> Restaurar
                  </button>
                </motion.div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.section>
  );
}
