import { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { DieIcon, type DieSides } from './components/dice/DieIcon';
import { usePerformanceProfile } from './hooks/usePerformance';

interface InteractiveModuleCardProps {
  title: string;
  description: string;
  iconUrl: string;
  dieSides: DieSides;
}

export default function InteractiveModuleCard({ title, description, iconUrl, dieSides }: InteractiveModuleCardProps) {
  const { reduceMotion } = usePerformanceProfile();
  const [valorRolado, setValorRolado] = useState<number | null>(null);
  const intervaloRef = useRef<number | null>(null);
  const timeoutRef = useRef<number | null>(null);

  const pararRolagem = () => {
    if (intervaloRef.current !== null) {
      window.clearInterval(intervaloRef.current);
      intervaloRef.current = null;
    }
    if (timeoutRef.current !== null) {
      window.clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  };

  // A ficha de cada módulo "rola" o próprio dado ao passar o mouse - um
  // capricho de mesa em vez de um card estático como qualquer outro.
  const iniciarRolagem = () => {
    if (reduceMotion) return;
    pararRolagem();
    intervaloRef.current = window.setInterval(() => {
      setValorRolado(1 + Math.floor(Math.random() * dieSides));
    }, 55);
    timeoutRef.current = window.setTimeout(() => {
      if (intervaloRef.current !== null) {
        window.clearInterval(intervaloRef.current);
        intervaloRef.current = null;
      }
      setValorRolado(1 + Math.floor(Math.random() * dieSides));
    }, 550);
  };

  const encerrarRolagem = () => {
    pararRolagem();
    setValorRolado(null);
  };

  useEffect(() => pararRolagem, []);

  return (
    <motion.div
      // Sem `scale`: escalar borra o texto do cartao enquanto se le. So o deslocamento.
      whileHover={{ y: -6 }}
      whileTap={{ y: -1 }}
      transition={{ type: 'spring', stiffness: 300, damping: 22 }}
      onHoverStart={iniciarRolagem}
      onHoverEnd={encerrarRolagem}
      className="relative p-[1px] rounded-2xl bg-gradient-to-b from-primary/30 to-transparent overflow-hidden group cursor-pointer h-full"
    >
      <div className="absolute -inset-1 bg-gradient-to-br from-primary/0 via-primary/15 to-purple-500/0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 blur-xl pointer-events-none" />

      <div className="relative h-full overflow-hidden bg-gradient-to-b from-white/[0.08] to-white/[0.03] backdrop-blur-md rounded-2xl p-6 flex flex-col items-start border border-white/10 group-hover:border-primary/30 transition-colors">

        <DieIcon
          sides={dieSides}
          className="performance-decorative pointer-events-none absolute -bottom-7 -right-7 h-32 w-32 text-primary/[0.08] transition-transform duration-700 ease-out group-hover:rotate-[22deg] group-hover:text-primary/[0.16]"
        />

        <span aria-hidden="true" className="pointer-events-none absolute left-2.5 top-2.5 h-3 w-3 border-l border-t border-primary/20" />
        <span aria-hidden="true" className="pointer-events-none absolute right-2.5 top-2.5 h-3 w-3 border-r border-t border-primary/20" />
        <span aria-hidden="true" className="pointer-events-none absolute bottom-2.5 left-2.5 h-3 w-3 border-b border-l border-primary/20" />

        <div
          className="absolute right-4 top-4 z-10 flex h-9 min-w-9 items-center justify-center rounded-full border border-primary/30 bg-black/30 px-1.5 text-xs font-bold tracking-wide text-primary/80 tabular-nums"
          style={{ fontFamily: 'Cinzel, serif' }}
        >
          {valorRolado !== null ? valorRolado : `d${dieSides}`}
        </div>

        <div className="relative z-10 mb-4">
          <img src={iconUrl} alt={title} className="w-12 h-12 object-contain filter drop-shadow-[0_0_15px_rgba(196,160,82,0.5)]" />
        </div>
        <h2 className="relative z-10 text-xl font-semibold mb-2">{title}</h2>
        <p className="relative z-10 text-sm text-gray-400">{description}</p>
      </div>
    </motion.div>
  );
}
