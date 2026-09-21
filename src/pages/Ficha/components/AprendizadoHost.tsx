import { memo, useEffect, useState, type CSSProperties } from 'react';
import { createPortal } from 'react-dom';
import { sfx } from '../../../utils/audioSynth';
import { inscreverAprendizado, type CenaAprendizado } from './aprendizado';
import { falarSequencia, vozGrandeSabioDisponivel, vozGrandeSabioLigada } from './vozGrandeSabio';
import './aprendizado.css';
import { semMovimento } from '../../../utils/movimento';

const DURACAO_MS = 6200;
const PAUSA_APOS_FALA_MS = 2200;


const hexagono = (raio: number, rotacao = -90) => Array.from({ length: 6 }, (_, i) => {
  const angulo = ((rotacao + 60 * i) * Math.PI) / 180;
  return `${(Math.cos(angulo) * raio).toFixed(2)},${(Math.sin(angulo) * raio).toFixed(2)}`;
}).join(' ');

/** Painel de "Magia aprendida" no estilo do Grande Sábio: o emblema gira na cor
 * do Fluxo, o nome aparece e a voz anuncia. Clique ou tecla fecha. */
export const AprendizadoHost = memo(function AprendizadoHost() {
  const [cena, setCena] = useState<CenaAprendizado | null>(null);

  useEffect(() => inscreverAprendizado(setCena), []);

  useEffect(() => {
    if (!cena) return undefined;
    sfx.play('estrela');
    const fechar = () => setCena(null);
    let timer = window.setTimeout(fechar, DURACAO_MS);
    let pararVoz = () => undefined as void;
    if (vozGrandeSabioDisponivel() && vozGrandeSabioLigada()) {
      pararVoz = falarSequencia(
        [{ texto: cena.frase }, { texto: cena.titulo }],
        {
          aoIniciarPasso: () => undefined,
          aoTerminar: () => { window.clearTimeout(timer); timer = window.setTimeout(fechar, PAUSA_APOS_FALA_MS); },
        },
      );
    }
    const aoTecla = (evento: KeyboardEvent) => {
      if (evento.key === 'Escape' || evento.key === 'Enter' || evento.key === ' ') fechar();
    };
    document.addEventListener('keydown', aoTecla, true);
    return () => {
      window.clearTimeout(timer);
      pararVoz();
      document.removeEventListener('keydown', aoTecla, true);
    };
  }, [cena]);

  if (!cena) return null;
  const parado = semMovimento();

  return createPortal(
    <div
      role="dialog"
      aria-label={`${cena.frase}: ${cena.titulo}`}
      className={`aprendizado${parado ? ' aprendizado--parado' : ''}`}
      style={{ '--ap-cor': cena.destaque, '--ap-brilho': cena.brilho } as CSSProperties}
      onClick={() => setCena(null)}
    >
      <div className="aprendizado__cartao">
        <div className="aprendizado__emblema" aria-hidden="true">
          <svg viewBox="-60 -60 120 120">
            <g className="aprendizado__giro">
              <polygon points={hexagono(52)} className="aprendizado__traco" />
              <polygon points={hexagono(52, -60)} className="aprendizado__traco aprendizado__traco--fino" />
            </g>
            <g className="aprendizado__giro aprendizado__giro--inverso">
              <circle r="36" className="aprendizado__traco aprendizado__traco--fino" />
              <polygon points={hexagono(30, -60)} className="aprendizado__traco" />
            </g>
            <circle r="5" className="aprendizado__centro" />
          </svg>
        </div>
        <small>{cena.frase}</small>
        <h2>{cena.titulo}</h2>
        <p>{cena.detalhe}</p>
        <span className="aprendizado__dica">Toque para fechar</span>
      </div>
    </div>,
    document.body,
  );
});
