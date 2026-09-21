import { memo, useEffect, useMemo, useState, type CSSProperties } from 'react';
import { createPortal } from 'react-dom';
import { sfx } from '../../../utils/audioSynth';
import { inscreverCirculoMagico, type CenaCirculo } from './circuloMagico';
import './circuloMagico.css';
import { semMovimento } from '../../../utils/movimento';

const DURACAO_MS = 2100;


const pontos = (lados: number, raio: number, rotacao = -90) => Array.from({ length: lados }, (_, i) => {
  const angulo = ((rotacao + (360 / lados) * i) * Math.PI) / 180;
  return `${(Math.cos(angulo) * raio).toFixed(2)},${(Math.sin(angulo) * raio).toFixed(2)}`;
}).join(' ');

/** Estrela {n/k}: liga cada ponto ao k-ésimo seguinte (hexagrama, pentagrama...). */
const estrela = (lados: number, raio: number, salto: number) => {
  const vertices = Array.from({ length: lados }, (_, i) => {
    const angulo = ((-90 + (360 / lados) * i) * Math.PI) / 180;
    return [Math.cos(angulo) * raio, Math.sin(angulo) * raio] as const;
  });
  return vertices.map((_, i) => {
    const [x1, y1] = vertices[i];
    const [x2, y2] = vertices[(i + salto) % lados];
    return { x1, y1, x2, y2 };
  });
};

/** Círculo mágico que se desenha e gira ao conjurar. Quanto mais alto o
 * círculo da magia, mais lados tem o polígono. O custo em Mana cai no centro.
 * Não captura clique e some sozinho. */
export const CirculoMagicoHost = memo(function CirculoMagicoHost() {
  const [cena, setCena] = useState<CenaCirculo | null>(null);

  useEffect(() => inscreverCirculoMagico((nova) => {
    if (semMovimento()) return;
    setCena(nova);
  }), []);

  useEffect(() => {
    if (!cena) return undefined;
    sfx.play('conjurar');
    const timer = window.setTimeout(() => setCena(null), DURACAO_MS);
    return () => window.clearTimeout(timer);
  }, [cena]);

  const lados = cena ? (cena.circulo === 'ritual' ? 8 : Math.min(12, 3 + Number(cena.circulo))) : 6;
  const runas = useMemo(() => Array.from({ length: 24 }, (_, i) => {
    const angulo = (360 / 24) * i;
    return { angulo, longo: i % 2 === 0 };
  }), []);
  const linhasEstrela = useMemo(() => estrela(lados >= 5 ? lados : 6, 50, lados >= 7 ? 3 : 2), [lados]);

  if (!cena) return null;
  const estilo = { '--cm-cor': cena.destaque, '--cm-brilho': cena.brilho } as CSSProperties;

  return createPortal(
    <div className="circulo-magico" style={estilo} aria-hidden="true">
      <div className="circulo-magico__aura" />
      <div className="circulo-magico__palco">
        <svg viewBox="-100 -100 200 200" className="circulo-magico__svg">
          <g className="circulo-magico__giro circulo-magico__giro--lento">
            <circle r="94" pathLength="1" className="circulo-magico__traco" />
            <circle r="88" pathLength="1" className="circulo-magico__traco circulo-magico__traco--fino" />
            {runas.map((runa) => (
              <line
                key={runa.angulo}
                x1="0"
                y1={runa.longo ? -80 : -82}
                x2="0"
                y2={-86}
                transform={`rotate(${runa.angulo})`}
                className="circulo-magico__runa"
              />
            ))}
          </g>
          <g className="circulo-magico__giro circulo-magico__giro--inverso">
            <polygon points={pontos(lados, 70)} pathLength="1" className="circulo-magico__traco" />
            <polygon points={pontos(lados, 70, -90 + 180 / lados)} pathLength="1" className="circulo-magico__traco circulo-magico__traco--fino" />
          </g>
          <g className="circulo-magico__giro">
            {linhasEstrela.map((linha, i) => (
              <line key={i} x1={linha.x1} y1={linha.y1} x2={linha.x2} y2={linha.y2} pathLength="1" className="circulo-magico__traco circulo-magico__traco--fino" />
            ))}
            <circle r="50" pathLength="1" className="circulo-magico__traco circulo-magico__traco--fino" />
          </g>
          <circle r="8" className="circulo-magico__centro" />
        </svg>
        <div className="circulo-magico__custo">−{cena.custo} Mana</div>
        <div className="circulo-magico__nome">{cena.titulo}</div>
      </div>
    </div>,
    document.body,
  );
});
