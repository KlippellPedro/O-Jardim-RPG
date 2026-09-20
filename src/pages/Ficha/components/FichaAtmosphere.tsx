import { memo, type CSSProperties } from 'react';
import type { TemaVisualFicha } from '../fichaTheme';
import type { EstiloAuraFicha } from '../auraEspecialFicha';
import './fichaAuraEspecial.css';

const PARTICULAS = [7, 14, 22, 31, 39, 48, 57, 66, 74, 83, 91];

const estiloParticula = (x: number, indice: number) => ({
  '--ficha-particle-x': `${x}%`,
  '--ficha-particle-delay': `${-(indice * 0.73)}s`,
  '--ficha-particle-duration': `${6 + (indice % 5) * 1.15}s`,
} as CSSProperties);

const estiloAura = (x: number, indice: number, cor: string, cor2: string) => ({
  '--aura-x': `${x}%`,
  '--aura-a': cor,
  '--aura-b': cor2,
  '--aura-tam': `${3 + (indice % 4) * 1.5}px`,
  '--aura-atraso': `${-(indice * 0.9)}s`,
  '--aura-dur': `${7 + (indice % 5) * 1.3}s`,
} as CSSProperties);

const AuraEspecial = ({ estilo, cor, cor2, escopo }: { estilo: EstiloAuraFicha; cor: string; cor2: string; escopo: 'raca' | 'classe' }) => (
  <div className={`ficha-aura ficha-aura--${estilo} ficha-aura--${escopo} performance-ambient-motion`}>
    <div className="ficha-aura__brilho" style={{ '--aura-a': cor } as CSSProperties} />
    {PARTICULAS.slice(0, escopo === 'raca' ? 7 : PARTICULAS.length).map((x, indice) => (
      <i key={x} style={estiloAura(x, indice, cor, cor2)} />
    ))}
  </div>
);

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
      {tema.raca.aura && (
        <AuraEspecial estilo={tema.raca.aura} cor={tema.raca.tema.primary} cor2={tema.raca.tema.secondary} escopo="raca" />
      )}
      {tema.classe.aura && (
        <AuraEspecial estilo={tema.classe.aura} cor={tema.classe.tema.primary} cor2={tema.classe.tema.secondary} escopo="classe" />
      )}
      <div className="ficha-atmosphere__sigil" />
    </div>
  );
});

