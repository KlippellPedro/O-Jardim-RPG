import { useEffect, useRef, useState } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { concederEntradaGambler, sortearEntradaGambler } from './gamblerAccess';

type GateState = 'parada' | 'girando' | 'resultado';

export function GamblerCoinGate() {
  const navigate = useNavigate();
  const reducedMotion = useReducedMotion();
  const [estado, setEstado] = useState<GateState>('parada');
  const [resultado, setResultado] = useState<boolean | null>(null);
  const timerRef = useRef<number | null>(null);

  useEffect(() => () => {
    if (timerRef.current !== null) window.clearTimeout(timerRef.current);
  }, []);

  const girar = () => {
    if (estado !== 'parada') return;
    const sim = sortearEntradaGambler();
    setResultado(sim);
    setEstado('girando');
  };

  const terminarGiro = () => {
    if (estado !== 'girando' || resultado === null) return;
    setEstado('resultado');
    timerRef.current = window.setTimeout(() => {
      if (resultado) {
        concederEntradaGambler();
        navigate('/entidades/gambler/cassino');
      } else {
        navigate('/entidades');
      }
    }, reducedMotion ? 350 : 900);
  };

  const giroFinal = resultado === null ? 0 : (resultado ? 1440 : 1620);

  return (
    <aside className="gambler-gate" aria-labelledby="gambler-gate-title">
      <span className="gambler-gate__eyebrow">Uma cadeira permanece vazia</span>
      <h2 id="gambler-gate-title">A ficha decide se a porta abre.</h2>
      <p>Clique uma vez. SIM leva ao salão; NÃO fecha o livro por enquanto.</p>

      <div className="gambler-gate__stage">
        <motion.button
          type="button"
          className="gambler-coin"
          onClick={girar}
          disabled={estado !== 'parada'}
          aria-label={estado === 'parada' ? 'Girar a ficha do Gambler' : 'A ficha está girando'}
          animate={{ rotateY: giroFinal, y: estado === 'girando' && !reducedMotion ? [0, -34, 0] : 0 }}
          transition={{ duration: reducedMotion ? 0.15 : 1.75, ease: [0.2, 0.7, 0.2, 1] }}
          onAnimationComplete={terminarGiro}
        >
          <span className="gambler-coin__face gambler-coin__face--sim">SIM</span>
          <span className="gambler-coin__face gambler-coin__face--nao">NÃO</span>
        </motion.button>
        <div className="gambler-gate__shadow" aria-hidden="true" />
      </div>

      <strong aria-live="polite">
        {estado === 'parada' ? 'Arrisque a entrada' : estado === 'girando' ? 'A ficha está no ar…' : resultado ? 'SIM' : 'NÃO'}
      </strong>
    </aside>
  );
}

