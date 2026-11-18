import { useEffect, useRef, useState, type CSSProperties } from 'react';
import { motion } from 'framer-motion';
import { DieIcon, type DieSides } from './components/dice/DieIcon';
import { usePerformanceProfile } from './hooks/usePerformance';
import './interactiveModuleCard.css';

interface InteractiveModuleCardProps {
  title: string;
  description: string;
  dieSides: DieSides;
  /** Cor do módulo: tinge o degradê, a borda, o brilho e o dado do cartão. */
  cor?: string;
}

export default function InteractiveModuleCard({ title, description, dieSides, cor = '#c7a44c' }: InteractiveModuleCardProps) {
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
      className="cartao-modulo group relative h-full cursor-pointer overflow-hidden rounded-2xl p-[1px]"
      style={{ '--card-cor': cor } as CSSProperties}
    >
      <div className="cartao-modulo__aura pointer-events-none absolute -inset-1 opacity-0 blur-xl transition-opacity duration-500 group-hover:opacity-100" />

      <div className="cartao-modulo__corpo relative flex h-full flex-col items-start overflow-hidden rounded-2xl p-6 backdrop-blur-md transition-colors">
        <span aria-hidden="true" className="cartao-modulo__faixa pointer-events-none absolute inset-x-6 top-0 h-px" />

        <DieIcon
          sides={dieSides}
          className="cartao-modulo__dado-fundo performance-decorative pointer-events-none absolute -bottom-7 -right-7 h-32 w-32 transition-transform duration-700 ease-out group-hover:rotate-[22deg]"
        />

        <span aria-hidden="true" className="cartao-modulo__canto pointer-events-none absolute left-2.5 top-2.5 h-3 w-3 border-l border-t" />
        <span aria-hidden="true" className="cartao-modulo__canto pointer-events-none absolute right-2.5 top-2.5 h-3 w-3 border-r border-t" />
        <span aria-hidden="true" className="cartao-modulo__canto pointer-events-none absolute bottom-2.5 left-2.5 h-3 w-3 border-b border-l" />

        <div
          className="cartao-modulo__dado absolute right-4 top-4 z-10 flex h-9 min-w-9 items-center justify-center rounded-full border bg-black/30 px-1.5 text-xs font-bold tracking-wide tabular-nums"
          style={{ fontFamily: 'Cinzel, serif' }}
        >
          {valorRolado !== null ? valorRolado : `d${dieSides}`}
        </div>

        <h2 className="relative z-10 mb-2 mt-1 pr-12 text-xl font-semibold text-white">{title}</h2>
        <span aria-hidden="true" className="cartao-modulo__traco relative z-10 mb-3 h-0.5 w-8 rounded-full transition-all duration-500 group-hover:w-14" />
        <p className="relative z-10 text-sm text-gray-400">{description}</p>
      </div>
    </motion.div>
  );
}
