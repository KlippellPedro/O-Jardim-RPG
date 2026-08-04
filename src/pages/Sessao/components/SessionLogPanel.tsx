import React, { useDeferredValue, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { ChevronDown, Dice5, ScrollText, X } from 'lucide-react';
import { useSessaoStore } from '../../../store/useSessaoStore';
import {
  getRollBreakdown,
  getRollTone,
  matchesRollFilter,
  type RollFilter,
} from '../sessionUtils';

interface SessionLogPanelProps {
  onClose?: () => void;
}

const FILTERS: Array<{ value: RollFilter; label: string }> = [
  { value: 'todos', label: 'Todos' },
  { value: 'rolagem', label: 'Testes' },
  { value: 'dano', label: 'Fórmulas' },
  { value: 'uso', label: 'Usos' },
];

export const SessionLogPanel: React.FC<SessionLogPanelProps> = ({ onClose }) => {
  const rolagens = useSessaoStore((state) => state.rolagens);
  const [filter, setFilter] = useState<RollFilter>('todos');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const deferredFilter = useDeferredValue(filter);
  const reduceMotion = useReducedMotion();
  const visibleRolls = rolagens.filter((roll) => matchesRollFilter(roll, deferredFilter));

  return (
    <div className="flex h-full min-h-0 flex-col bg-[#0d0c12]/92">
      <div className="shrink-0 border-b border-white/10 px-6 pb-4 pt-6">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <ScrollText className="text-[#c7a44c]" size={19} />
            <div>
              <h2 className="font-semibold text-white">Histórico</h2>
              <p className="text-[11px] text-white/40">{rolagens.length} registros nesta sessão</p>
            </div>
          </div>
          {onClose ? (
            <button type="button" onClick={onClose} className="rounded-md p-2 text-white/50 hover:bg-white/5 hover:text-white" aria-label="Fechar histórico">
              <X size={18} />
            </button>
          ) : null}
        </div>

        <div className="mt-5 flex gap-1.5 overflow-x-auto pb-0.5" aria-label="Filtrar histórico">
          {FILTERS.map((item) => (
            <button
              key={item.value}
              type="button"
              onClick={() => setFilter(item.value)}
              className={`rounded-md px-2.5 py-1.5 text-[11px] font-medium transition-colors ${
                filter === item.value
                  ? 'bg-[#c7a44c]/15 text-[#e7c76f]'
                  : 'text-white/45 hover:bg-white/5 hover:text-white/75'
              }`}
              aria-pressed={filter === item.value}
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>

      <div className="custom-scrollbar min-h-0 flex-1 overflow-y-auto px-5 py-4 [scrollbar-gutter:stable]">
        {visibleRolls.length === 0 ? (
          <div className="flex h-full min-h-48 flex-col items-center justify-center gap-3 px-6 text-center text-white/35">
            <Dice5 size={34} strokeWidth={1.5} />
            <p className="text-sm">
              {rolagens.length === 0
                ? 'As rolagens feitas nesta sessão aparecerão aqui.'
                : 'Nenhum registro corresponde a este filtro.'}
            </p>
          </div>
        ) : (
          <div className="space-y-2.5">
            <AnimatePresence initial={false}>
              {visibleRolls.map((roll, index) => {
                const tone = getRollTone(roll);
                const breakdown = getRollBreakdown(roll);
                const expanded = expandedId === roll.id;
                const toneClasses = tone === 'critical'
                  ? 'border-[#c7a44c]/45 bg-[#c7a44c]/10'
                  : tone === 'failure'
                    ? 'border-red-400/35 bg-red-500/[0.08]'
                    : 'border-white/[0.07] bg-black/30 hover:border-white/15';
                const resultClasses = tone === 'critical'
                  ? 'text-[#e7c76f]'
                  : tone === 'failure'
                    ? 'text-red-300'
                    : 'text-white';

                return (
                  <motion.article
                    key={roll.id}
                    initial={reduceMotion || index > 0 ? false : { opacity: 0, y: -8 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={`[content-visibility:auto] overflow-hidden rounded-lg border transition-colors ${toneClasses}`}
                  >
                    <button
                      type="button"
                      onClick={() => setExpandedId(expanded ? null : roll.id)}
                      className="w-full p-3.5 text-left"
                      aria-expanded={expanded}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-white/40">
                            <span className="truncate">{roll.autor_nome}</span>
                            <span aria-hidden="true">•</span>
                            <time dateTime={roll.criado_em} className="shrink-0 font-mono font-normal tracking-normal text-white/30">
                              {new Date(roll.criado_em).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                            </time>
                          </div>
                          <h3 className="mt-1 truncate text-sm font-semibold text-white/90">{roll.titulo}</h3>
                          <p className="mt-0.5 font-mono text-[11px] text-white/35">{roll.formula || roll.tipo}</p>
                        </div>
                        <div className="flex shrink-0 items-center gap-2">
                          <span className={`font-mono text-xl font-bold ${resultClasses}`}>{roll.resultado ?? 'N/D'}</span>
                          <ChevronDown size={14} className={`text-white/30 transition-transform ${expanded ? 'rotate-180' : ''}`} />
                        </div>
                      </div>
                    </button>

                    {expanded ? (
                      <div className="border-t border-white/[0.07] px-3 py-2.5 text-xs text-white/55">
                        <p>{breakdown ?? 'Este registro não possui dados detalhados.'}</p>
                        {tone === 'critical' ? <p className="mt-1 font-medium text-[#e7c76f]">Crítico natural</p> : null}
                        {tone === 'failure' ? <p className="mt-1 font-medium text-red-300">Falha natural</p> : null}
                      </div>
                    ) : null}
                  </motion.article>
                );
              })}
            </AnimatePresence>
          </div>
        )}
      </div>
    </div>
  );
};
