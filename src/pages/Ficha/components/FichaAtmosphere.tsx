import { memo, type CSSProperties } from 'react';
import type { TemaVisualFicha } from '../fichaTheme';

const PARTICULAS = [7, 14, 22, 31, 39, 48, 57, 66, 74, 83, 91];

const estiloParticula = (x: number, indice: number) => ({
  '--ficha-particle-x': `${x}%`,
  '--ficha-particle-delay': `${-(indice * 0.73)}s`,
  '--ficha-particle-duration': `${6 + (indice % 5) * 1.15}s`,
} as CSSProperties);

export const FichaAtmosphere = memo(function FichaAtmosphere({ tema }: { tema: TemaVisualFicha }) {
  return (
    <div className="ficha-atmosphere performance-decorative" aria-hidden="true">
      {tema.raca.fundo && (
        <div
          className="ficha-atmosphere__art ficha-atmosphere__art--raca"
          style={{ backgroundImage: `url('${tema.raca.fundo}')` }}
        />
      )}
      {tema.classe.fundo && (
        <div
          className="ficha-atmosphere__art ficha-atmosphere__art--classe"
          style={{ backgroundImage: `url('${tema.classe.fundo}')` }}
        />
      )}

      <div className="ficha-atmosphere__veil" />
      <div className={`ficha-effect ficha-effect--${tema.raca.efeito} ficha-effect--raca performance-ambient-motion`}>
        {PARTICULAS.slice(0, 7).map((x, indice) => <i key={`r-${x}`} style={estiloParticula(x, indice)} />)}
      </div>
      <div className={`ficha-effect ficha-effect--${tema.classe.efeito} ficha-effect--classe performance-ambient-motion`}>
        {PARTICULAS.map((x, indice) => <i key={`c-${x}`} style={estiloParticula(x, indice)} />)}
      </div>
      <div className="ficha-atmosphere__sigil" />
    </div>
  );
});

