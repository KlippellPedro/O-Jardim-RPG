import React, { memo, useMemo } from 'react';
import { motion } from 'framer-motion';
import { ChronicleEvent } from '../worldChronicles';

interface ChronicleTimelineProps {
  events: ChronicleEvent[];
  color: string;
  compact?: boolean;
  eventMeta?: (event: ChronicleEvent) => string | undefined;
}

export const ChronicleTimeline: React.FC<ChronicleTimelineProps> = memo(({ events, color, compact = false, eventMeta }) => {
  const orderedEvents = useMemo(() => [...events].sort((a, b) => a.ordem - b.ordem), [events]);
  return (
    <ol className="relative ml-2 space-y-0 border-l border-white/10 md:ml-4">
      {orderedEvents.map((event, index) => {
        const meta = eventMeta?.(event);
        return (
          <motion.li
            key={event.id}
            initial={{ opacity: 0, x: -14 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true, margin: '-60px' }}
            transition={{ duration: 0.35, delay: Math.min(index * 0.04, 0.24) }}
            className={compact ? 'relative pb-7 pl-7' : 'relative pb-10 pl-8 md:pb-12 md:pl-12'}
          >
            <span className="absolute -left-[7px] top-1 h-[13px] w-[13px] rounded-full border-[3px] border-[#09080d] shadow-[0_0_18px_currentColor]" style={{ backgroundColor: color, color }} aria-hidden="true" />
            <div className="mb-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[10px] font-bold uppercase tracking-[0.2em]">
              <span style={{ color }}>{event.era}</span>
              {meta && <span className="text-gray-600">{meta}</span>}
            </div>
            <h3 className={`${compact ? 'text-lg' : 'text-xl md:text-2xl'} font-bold text-white`} style={{ fontFamily: 'Cinzel, serif' }}>{event.titulo}</h3>
            <p className={`${compact ? 'mt-2 text-sm' : 'mt-3 text-sm md:text-base'} max-w-3xl leading-7 text-gray-400`}>{event.resumo}</p>
          </motion.li>
        );
      })}
    </ol>
  );
});
