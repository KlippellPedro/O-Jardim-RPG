import React, { useEffect } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { Flame, X } from 'lucide-react';
import { useSessaoStore, type AvisoDeFase } from '../../../store/useSessaoStore';

const SEGUNDOS_PARA_A_MESA = 14;

const Aviso = ({ aviso, comando, onFechar }: { aviso: AvisoDeFase; comando: boolean; onFechar: () => void }) => {
  const reduzir = useReducedMotion();
  // O Mestre decide quando fechar: tem regra nova para ler. A mesa só ouve a frase e segue.
  useEffect(() => {
    if (comando) return undefined;
    const tempo = window.setTimeout(onFechar, SEGUNDOS_PARA_A_MESA * 1000);
    return () => window.clearTimeout(tempo);
  }, [comando, onFechar]);

  return (
    <motion.div
      layout={!reduzir}
      initial={reduzir ? false : { opacity: 0, y: -16, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={reduzir ? { opacity: 0 } : { opacity: 0, y: -10 }}
      className="pointer-events-auto w-full max-w-xl rounded-2xl border border-[#e0645f]/40 bg-[#160c0e]/95 p-4 shadow-[0_18px_60px_rgba(0,0,0,0.55)] backdrop-blur"
      role="status"
    >
      <div className="flex items-start gap-3">
        <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-[#e0645f]/40 bg-[#e0645f]/10 text-[#f19a96]"><Flame size={17} aria-hidden="true" /></span>
        <div className="min-w-0 flex-1">
          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#f19a96]">
            Fase {aviso.fase}{aviso.fasesTotal ? ` de ${aviso.fasesTotal}` : ''}{comando && aviso.nomeDaFase ? ` · ${aviso.nomeDaFase}` : ''}
          </p>
          <h3 className="mt-0.5 text-lg font-bold leading-tight text-white" style={{ fontFamily: 'Cinzel, serif' }}>{aviso.nome}</h3>
          {aviso.anuncio ? <p className="mt-1.5 text-sm italic leading-6 text-white/80">{aviso.anuncio}</p> : null}
          {comando && aviso.mudancas.length ? (
            <ul className="mt-2.5 space-y-1.5 border-t border-white/10 pt-2.5">
              {aviso.mudancas.map((mudanca) => (
                <li key={mudanca} className="text-[13px] leading-5 text-white/65">{mudanca}</li>
              ))}
            </ul>
          ) : null}
        </div>
        <button type="button" onClick={onFechar} className="rounded-md p-1.5 text-white/40 hover:bg-white/5 hover:text-white" aria-label={`Fechar o aviso da fase ${aviso.fase} de ${aviso.nome}`}>
          <X size={15} />
        </button>
      </div>
    </motion.div>
  );
};

/** Aparece quando um chefe entra numa fase nova: o Mestre vê o que muda, a mesa ouve a frase de cena. */
export const AvisoDeFaseDeChefe: React.FC = () => {
  const avisos = useSessaoStore((estado) => estado.avisosDeFase);
  const comando = useSessaoStore((estado) => estado.comando);
  const dispensar = useSessaoStore((estado) => estado.dispensarAvisoDeFase);
  if (!avisos.length) return null;
  return (
    <div className="pointer-events-none fixed inset-x-0 top-16 z-[95] flex flex-col items-center gap-2 px-3" aria-live="assertive">
      <AnimatePresence initial={false}>
        {avisos.slice(-3).map((aviso) => (
          <Aviso key={aviso.chave} aviso={aviso} comando={comando} onFechar={() => dispensar(aviso.chave)} />
        ))}
      </AnimatePresence>
    </div>
  );
};
