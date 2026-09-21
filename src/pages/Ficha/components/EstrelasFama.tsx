import { memo, useEffect, useRef, useState, type CSSProperties } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Star } from 'lucide-react';
import { sfx } from '../../../utils/audioSynth';
import './estrelasFama.css';

const NIVEIS = [1, 2, 3, 4, 5];
const FAISCAS = [0, 1, 2, 3, 4, 5];
const PASSO_ACENDER_S = 0.11;

// Cada nível esquenta a cor: cinza, âmbar, dourado, até o branco-dourado da lenda.
const COR_NIVEL = ['#6b7280', '#d6a84a', '#e2b04a', '#f0be47', '#ffd15c', '#fff2b3'];

const semMovimento = () => (
  typeof window === 'undefined'
  || Boolean(window.matchMedia?.('(prefers-reduced-motion: reduce)').matches)
  || document.documentElement.dataset.performanceMode === 'reduced'
);

interface EstrelasFamaProps {
  fama: number;
  titulo: string;
  onChange: (nivel: number) => void;
}

/** Cinco estrelas que acendem em sequência quando a Fama sobe e revelam o título
 * da faixa. Clicar na última estrela acesa apaga ela (volta um nível). Só
 * apresentação: quem guarda a Fama é a ficha. */
export const EstrelasFama = memo(function EstrelasFama({ fama, titulo, onChange }: EstrelasFamaProps) {
  const anterior = useRef(fama);
  const [subida, setSubida] = useState<{ chave: number; de: number; ate: number } | null>(null);
  const montadoEm = useRef(typeof performance !== 'undefined' ? performance.now() : 0);

  useEffect(() => {
    const de = anterior.current;
    if (fama === de) return;
    anterior.current = fama;
    if (performance.now() - montadoEm.current < 700) return;
    if (fama > de) {
      setSubida({ chave: Date.now(), de, ate: fama });
      sfx.play('estrela');
    } else {
      setSubida(null);
      sfx.play('cancel');
    }
  }, [fama]);

  useEffect(() => {
    if (!subida) return undefined;
    const duracao = (subida.ate - subida.de) * PASSO_ACENDER_S * 1000 + 1400;
    const timer = window.setTimeout(() => setSubida(null), duracao);
    return () => window.clearTimeout(timer);
  }, [subida]);

  const animar = !semMovimento();
  const cor = COR_NIVEL[Math.max(0, Math.min(5, fama))];
  const lenda = fama >= 5;

  return (
    <div
      className={`estrelas-fama${lenda ? ' estrelas-fama--lenda' : ''}`}
      style={{ '--fama-cor': cor } as CSSProperties}
    >
      <div className="estrelas-fama__linha" role="group" aria-label="Nível de Fama">
        {NIVEIS.map((nivel) => {
          const acesa = fama >= nivel;
          const novaNaSubida = animar && subida && nivel > subida.de && nivel <= subida.ate;
          const atraso = novaNaSubida ? (nivel - subida.de - 1) * PASSO_ACENDER_S : 0;
          return (
            <button
              key={nivel}
              type="button"
              aria-label={`Fama ${fama === nivel ? nivel - 1 : nivel}`}
              aria-pressed={fama === nivel}
              onClick={() => onChange(fama === nivel ? nivel - 1 : nivel)}
              className={`estrelas-fama__estrela${acesa ? ' estrelas-fama__estrela--acesa' : ''}`}
            >
              <motion.span
                key={`${nivel}-${acesa}-${novaNaSubida ? subida?.chave : 0}`}
                className="estrelas-fama__icone"
                initial={novaNaSubida ? { scale: 0.3, rotate: -50, opacity: 0.3 } : false}
                animate={{ scale: 1, rotate: 0, opacity: 1 }}
                transition={{ type: 'spring', stiffness: 380, damping: 14, delay: atraso }}
              >
                <Star size={26} fill={acesa ? cor : 'transparent'} strokeWidth={acesa ? 1.5 : 1.6} />
              </motion.span>
              {novaNaSubida && (
                <span key={`faiscas-${subida?.chave}`} className="estrelas-fama__faiscas" aria-hidden="true" style={{ '--fama-atraso': `${atraso}s` } as CSSProperties}>
                  {FAISCAS.map((indice) => (
                    <i key={indice} style={{ '--fama-angulo': `${indice * 60}deg` } as CSSProperties} />
                  ))}
                </span>
              )}
            </button>
          );
        })}
      </div>

      <div className="estrelas-fama__titulo" aria-live="polite">
        <AnimatePresence mode="wait">
          <motion.strong
            key={titulo}
            initial={animar ? { opacity: 0, y: 8, letterSpacing: '0.5em' } : false}
            animate={{ opacity: 1, y: 0, letterSpacing: '0.14em' }}
            exit={animar ? { opacity: 0, y: -6 } : undefined}
            transition={{ duration: 0.4, delay: subida && animar ? (subida.ate - subida.de) * PASSO_ACENDER_S : 0 }}
            className={lenda ? 'estrelas-fama__titulo-lenda' : ''}
          >
            {titulo}
          </motion.strong>
        </AnimatePresence>
      </div>

      {lenda && animar && (
        <div className="estrelas-fama__confete" aria-hidden="true" key={subida?.chave ?? 'fixo'}>
          {Array.from({ length: 18 }, (_, indice) => (
            <i
              key={indice}
              style={{
                '--c-x': `${(indice / 17) * 100}%`,
                '--c-atraso': `${((indice * 37) % 10) / 10}s`,
                '--c-cor': indice % 3 === 0 ? '#fff2b3' : indice % 3 === 1 ? '#ffd15c' : '#f0be47',
              } as CSSProperties}
            />
          ))}
        </div>
      )}
    </div>
  );
});
