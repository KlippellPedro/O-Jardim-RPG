import { useMemo } from 'react';
import './rasura.css';
import { larguraDasFaixas } from './rasuraUtil';

interface IRasuraProps {
  /** Identifica o registro (o id da entrada): a mesma semente gera a mesma rasura. */
  semente: string;
  linhas?: number;
  className?: string;
}

/** Parágrafo "rasurado": faixas escuras no lugar do texto, como um documento censurado. */
export const RasuraTexto = ({ semente, linhas = 3, className = '' }: IRasuraProps) => {
  const larguras = useMemo(() => larguraDasFaixas(semente, linhas), [semente, linhas]);
  return (
    <span className={`rasura-bloco ${className}`} role="img" aria-label="Trecho rasurado, ainda não revelado">
      {larguras.map((largura, indice) => (
        <span key={indice} className="rasura-linha" style={{ width: `${largura}%`, animationDelay: `${(indice % 4) * 0.6}s` }} />
      ))}
    </span>
  );
};

/** Título rasurado, numa linha só, com a largura aproximando um nome. */
export const RasuraTitulo = ({ semente, className = '' }: { semente: string; className?: string }) => {
  const largura = useMemo(() => larguraDasFaixas(`titulo:${semente}`, 1, 38, 82)[0], [semente]);
  return (
    <span className={`rasura-titulo ${className}`} role="img" aria-label="Nome rasurado, ainda não revelado">
      <span className="rasura-linha" style={{ width: `${largura}%` }} />
    </span>
  );
};

/** Carimbo inclinado que avisa que a informação existe mas está retida. */
export const CarimboRetido = ({ texto = 'Informação retida', className = '' }: { texto?: string; className?: string }) => (
  <span className={`rasura-carimbo ${className}`}>{texto}</span>
);
