import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';

interface EntityWanderingFigureProps {
  src: string;
}

interface PosicaoErrante {
  top?: string;
  bottom?: string;
  left?: string;
  right?: string;
  width: string;
}

const POSICOES: PosicaoErrante[] = [
  { top: '10%', left: '6%', width: '16rem' },
  { top: '14%', right: '9%', width: '13rem' },
  { bottom: '12%', left: '11%', width: '14rem' },
  { bottom: '16%', right: '7%', width: '17rem' },
  { top: '46%', left: '3%', width: '11rem' },
  { top: '52%', right: '4%', width: '12rem' },
];

const DURACAO_APARICAO_MS = 13000;

function usePrefereMovimentoReduzido() {
  const [reduzido, setReduzido] = useState(false);

  useEffect(() => {
    const consulta = window.matchMedia('(prefers-reduced-motion: reduce)');
    setReduzido(consulta.matches);
    const ouvir = (evento: MediaQueryListEvent) => setReduzido(evento.matches);
    consulta.addEventListener('change', ouvir);
    return () => consulta.removeEventListener('change', ouvir);
  }, []);

  return reduzido;
}

export function EntityWanderingFigure({ src }: EntityWanderingFigureProps) {
  const [indice, setIndice] = useState(() => Math.floor(Math.random() * POSICOES.length));
  const reduzMovimento = usePrefereMovimentoReduzido();

  useEffect(() => {
    if (reduzMovimento) return;
    const id = window.setInterval(() => {
      setIndice((atual) => {
        let proximo = atual;
        while (proximo === atual) proximo = Math.floor(Math.random() * POSICOES.length);
        return proximo;
      });
    }, DURACAO_APARICAO_MS);
    return () => window.clearInterval(id);
  }, [reduzMovimento]);

  const posicao = POSICOES[indice];

  return (
    <div className="entity-wander" aria-hidden="true">
      <AnimatePresence>
        <motion.img
          key={reduzMovimento ? 'fixa' : indice}
          src={src}
          alt=""
          className="entity-wander__figure"
          style={posicao}
          initial={{ opacity: 0, scale: 1.03 }}
          animate={{
            opacity: 0.4,
            scale: 1,
            y: reduzMovimento ? 0 : [0, -12, 0],
          }}
          exit={{ opacity: 0, transition: { duration: 3, ease: 'easeInOut' } }}
          transition={{
            opacity: { duration: 4, ease: 'easeInOut' },
            scale: { duration: 4, ease: 'easeInOut' },
            y: { duration: 9, repeat: Infinity, ease: 'easeInOut' },
          }}
        />
      </AnimatePresence>
    </div>
  );
}

export default EntityWanderingFigure;
