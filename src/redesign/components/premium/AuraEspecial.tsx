import { type CSSProperties } from 'react';
import { Sparkles } from 'lucide-react';
import './auraEspecial.css';

const POSICOES_FAIXA = [8, 22, 38, 54, 70, 86];
const POSICOES_PAGINA = [4, 13, 24, 35, 47, 58, 69, 78, 88, 95];

interface AuraEspecialProps {
  cor: string;
  variante?: 'pagina' | 'faixa';
  className?: string;
}

const estiloParticula = (x: number, indice: number, cor: string): CSSProperties => ({
  '--aura-x': `${x}%`,
  '--aura-cor': cor,
  '--aura-atraso': `${-(indice * 0.8)}s`,
  '--aura-duracao': `${4.5 + (indice % 4) * 1.3}s`,
} as CSSProperties);

/** Camada ambiente (halo + poeira mágica) que diferencia raças e classes
 * especiais das comuns. Some por inteiro no modo de desempenho reduzido,
 * igual ao restante das camadas decorativas do app (ver `FichaAtmosphere`). */
export const AuraEspecial = ({ cor, variante = 'pagina', className = '' }: AuraEspecialProps) => {
  const posicoes = variante === 'pagina' ? POSICOES_PAGINA : POSICOES_FAIXA;
  return (
    <div
      aria-hidden="true"
      className={`aura-especial aura-especial--${variante} performance-decorative pointer-events-none absolute inset-0 overflow-hidden ${className}`}
      style={{ '--aura-cor': cor } as CSSProperties}
    >
      <div className="aura-especial__brilho" />
      {posicoes.map((x, indice) => (
        <i key={x} className="aura-especial__particula" style={estiloParticula(x, indice, cor)} />
      ))}
    </div>
  );
};

/** Selo "Especial" com ícone pulsante e texto varrido por brilho. */
export const SeloEspecial = ({ texto = 'Especial', cor = '#facc15' }: { texto?: string; cor?: string }) => (
  <span className="inline-flex items-center gap-1.5" style={{ '--aura-cor-texto': cor } as CSSProperties}>
    <Sparkles size={14} className="aura-selo__icone" style={{ color: cor }} />
    <span className="aura-texto-brilho font-bold">{texto}</span>
  </span>
);
