import React, { useEffect } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { BookOpen, Crown, X } from 'lucide-react';
import { useSessaoStore, type AvisoDeLenda } from '../../../store/useSessaoStore';

const SEGUNDOS_NA_TELA = 22;

const Aviso = ({ aviso, onFechar }: { aviso: AvisoDeLenda; onFechar: () => void }) => {
  const reduzir = useReducedMotion();
  const navigate = useNavigate();
  useEffect(() => {
    const tempo = window.setTimeout(onFechar, SEGUNDOS_NA_TELA * 1000);
    return () => window.clearTimeout(tempo);
  }, [onFechar]);

  return (
    <motion.div
      layout={!reduzir}
      initial={reduzir ? false : { opacity: 0, y: -16, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={reduzir ? { opacity: 0 } : { opacity: 0, y: -10 }}
      className="pointer-events-auto w-full max-w-xl rounded-2xl border border-[#c7a44c]/50 bg-[#14110a]/95 p-4 shadow-[0_18px_60px_rgba(0,0,0,0.55)] backdrop-blur"
      role="status"
    >
      <div className="flex items-start gap-3">
        <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-[#c7a44c]/45 bg-[#c7a44c]/10 text-[#e3c363]"><Crown size={17} aria-hidden="true" /></span>
        <div className="min-w-0 flex-1">
          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#e3c363]">Uma lenda caiu</p>
          <h3 className="mt-0.5 text-lg font-bold leading-tight text-white" style={{ fontFamily: 'Cinzel, serif' }}>{aviso.nome}, {aviso.epiteto}</h3>
          <p className="mt-1.5 text-sm italic leading-6 text-white/80">{aviso.consequencia}</p>
          <button
            type="button"
            onClick={() => { onFechar(); navigate('/mundo/livro-da-verdade'); }}
            className="mt-2.5 inline-flex items-center gap-1.5 text-xs font-bold text-[#e3c363] hover:underline"
          >
            <BookOpen size={13} aria-hidden="true" /> Abrir a página no Livro da Verdade
          </button>
        </div>
        <button type="button" onClick={onFechar} className="rounded-md p-1.5 text-white/40 hover:bg-white/5 hover:text-white" aria-label={`Fechar o aviso da queda de ${aviso.nome}`}>
          <X size={15} />
        </button>
      </div>
    </motion.div>
  );
};

/** Aparece para a mesa inteira quando uma lenda do Bestiário chega a 0 de Vida. */
export const AvisoDeLendaCaida: React.FC = () => {
  const avisos = useSessaoStore((estado) => estado.avisosDeLenda);
  const dispensar = useSessaoStore((estado) => estado.dispensarAvisoDeLenda);
  if (!avisos.length) return null;
  return (
    <div className="pointer-events-none fixed inset-x-0 top-16 z-[96] flex flex-col items-center gap-2 px-3" aria-live="assertive">
      <AnimatePresence initial={false}>
        {avisos.slice(-2).map((aviso) => (
          <Aviso key={aviso.chave} aviso={aviso} onFechar={() => dispensar(aviso.chave)} />
        ))}
      </AnimatePresence>
    </div>
  );
};
