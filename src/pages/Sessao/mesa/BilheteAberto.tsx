import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { motion, useReducedMotion } from 'framer-motion';
import { X } from 'lucide-react';
import type { EstiloBilhete, IBilhete } from '../../../services/mesaApi';
import { sfx } from '../../../utils/audioSynth';

// Mesmo número de pontos nos dois polígonos: é isso que deixa o navegador
// interpolar do papel amassado até a folha inteira.
const AMASSADO = 'polygon(32% 28%, 42% 20%, 58% 24%, 70% 30%, 76% 42%, 72% 58%, 68% 72%, 58% 78%, 42% 74%, 30% 70%, 26% 56%, 28% 40%)';
const ABERTO = 'polygon(0% 0%, 33% 0%, 66% 0%, 100% 0%, 100% 33%, 100% 66%, 100% 100%, 66% 100%, 33% 100%, 0% 100%, 0% 66%, 0% 33%)';

interface IEstilo {
  folha: string;
  tinta: string;
  titulo: string;
  borda: string;
  fonte: string;
}

export const ESTILOS_BILHETE: Record<EstiloBilhete, IEstilo & { rotulo: string }> = {
  papel: {
    rotulo: 'Papel dobrado',
    folha: 'linear-gradient(160deg, #eadfbe, #d8c79a 60%, #c9b482)',
    tinta: '#3b2f1a',
    titulo: '#5c1a1a',
    borda: '#a68d55',
    fonte: 'Georgia, "Times New Roman", serif',
  },
  carta: {
    rotulo: 'Carta lacrada',
    folha: 'linear-gradient(160deg, #f6efdd, #ece0c4)',
    tinta: '#2b2a3a',
    titulo: '#7a1f2b',
    borda: '#b89a5a',
    fonte: '"Palatino Linotype", Georgia, serif',
  },
  runa: {
    rotulo: 'Pedra rúnica',
    folha: 'linear-gradient(160deg, #1b1f2e, #12141f 60%, #0c0e17)',
    tinta: '#9be7f5',
    titulo: '#67e8f9',
    borda: '#22d3ee',
    fonte: 'Cinzel, Georgia, serif',
  },
};

interface IBilheteAbertoProps {
  bilhete: IBilhete;
  /** Primeira leitura: toca a animação do papel se desamassando. */
  animar: boolean;
  onFechar: () => void;
}

/** O bilhete do Mestre: chega amassado e se desdobra na frente do jogador. */
export const BilheteAberto = ({ bilhete, animar, onFechar }: IBilheteAbertoProps) => {
  const reduzir = useReducedMotion();
  const animado = animar && !reduzir;
  const [textoVisivel, setTextoVisivel] = useState(!animado);
  const estilo = ESTILOS_BILHETE[bilhete.estilo] ?? ESTILOS_BILHETE.papel;

  useEffect(() => {
    if (animado) sfx.play('open');
    const aoTeclar = (evento: KeyboardEvent) => { if (evento.key === 'Escape') onFechar(); };
    document.addEventListener('keydown', aoTeclar);
    return () => document.removeEventListener('keydown', aoTeclar);
  }, [animado, onFechar]);

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-label={`Bilhete: ${bilhete.titulo}`}
      className="fixed inset-0 z-[140] flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm"
      onClick={onFechar}
    >
      <motion.div
        initial={animado ? { clipPath: AMASSADO, scale: 0.4, rotate: -14, opacity: 0.6 } : false}
        animate={{ clipPath: ABERTO, scale: 1, rotate: 0, opacity: 1 }}
        transition={{ duration: animado ? 1.15 : 0, ease: [0.22, 1, 0.36, 1] }}
        onAnimationComplete={() => setTextoVisivel(true)}
        onClick={(evento) => evento.stopPropagation()}
        className="relative w-full max-w-lg overflow-hidden rounded-sm shadow-[0_30px_80px_rgba(0,0,0,0.7)]"
        style={{ background: estilo.folha, border: `1px solid ${estilo.borda}`, fontFamily: estilo.fonte }}
      >
        {/* Vincos do papel: somem quando ele termina de abrir. */}
        <motion.svg
          aria-hidden="true"
          viewBox="0 0 100 100"
          preserveAspectRatio="none"
          className="pointer-events-none absolute inset-0 h-full w-full"
          initial={{ opacity: animado ? 0.9 : 0.12 }}
          animate={{ opacity: 0.12 }}
          transition={{ duration: animado ? 1.6 : 0, delay: animado ? 0.4 : 0 }}
        >
          <g stroke="#000" strokeWidth="0.4" fill="none">
            <path d="M0 22 L38 30 L61 18 L100 34" />
            <path d="M12 0 L30 44 L18 70 L34 100" />
            <path d="M74 0 L62 40 L80 62 L66 100" />
            <path d="M0 70 L44 62 L70 78 L100 66" />
          </g>
        </motion.svg>
        <div className="relative p-7 sm:p-9">
          <button type="button" onClick={onFechar} aria-label="Fechar bilhete" className="absolute right-3 top-3 flex h-9 w-9 items-center justify-center rounded-full opacity-60 hover:opacity-100" style={{ color: estilo.tinta }}>
            <X size={18} />
          </button>
          <motion.div initial={{ opacity: textoVisivel ? 1 : 0, y: textoVisivel ? 0 : 6 }} animate={{ opacity: textoVisivel ? 1 : 0, y: textoVisivel ? 0 : 6 }} transition={{ duration: 0.6 }}>
            <p className="mb-2 text-[10px] font-bold uppercase tracking-[0.3em]" style={{ color: estilo.titulo, opacity: 0.7 }}>Só para os seus olhos</p>
            <h2 className="mb-4 text-2xl font-bold leading-tight" style={{ color: estilo.titulo }}>{bilhete.titulo}</h2>
            <p className="whitespace-pre-wrap text-[17px] leading-8" style={{ color: estilo.tinta }}>{bilhete.texto}</p>
            {bilhete.estilo === 'carta' ? <div aria-hidden="true" className="mx-auto mt-6 h-11 w-11 rounded-full" style={{ background: 'radial-gradient(circle at 35% 30%, #d1495b, #7a1f2b 70%)', boxShadow: '0 3px 8px rgba(0,0,0,0.4)' }} /> : null}
          </motion.div>
        </div>
      </motion.div>
    </div>,
    document.body,
  );
};
