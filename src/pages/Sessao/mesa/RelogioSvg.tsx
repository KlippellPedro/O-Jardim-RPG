import type { IRelogio } from '../../../services/mesaApi';
import { COR_RELOGIO, caminhoDaFatia, relogioCompleto } from './relogios';

interface IRelogioSvgProps {
  relogio: IRelogio;
  tamanho?: number;
  /** Quando informado, tocar numa fatia leva o relógio até ela (só o Mestre usa). */
  onFatia?: (indice: number) => void;
}

/** Relógio de progresso em fatias, do tipo "o ritual se completa em 6". */
export const RelogioSvg = ({ relogio, tamanho = 96, onFatia }: IRelogioSvgProps) => {
  const cor = COR_RELOGIO[relogio.cor] ?? COR_RELOGIO.perigo;
  const completo = relogioCompleto(relogio);
  return (
    <svg
      viewBox="0 0 100 100"
      width={tamanho}
      height={tamanho}
      role="img"
      aria-label={`${relogio.titulo}: ${relogio.cheias} de ${relogio.fatias}`}
      className={completo ? 'drop-shadow-[0_0_10px_rgba(255,255,255,0.35)]' : ''}
    >
      <circle cx={50} cy={50} r={47} fill="#0b0a10" stroke={completo ? cor.cheia : 'rgba(255,255,255,0.18)'} strokeWidth={2.5} />
      {Array.from({ length: relogio.fatias }, (_, indice) => {
        const cheia = indice < relogio.cheias;
        return (
          <path
            key={indice}
            d={caminhoDaFatia(50, 50, 42, indice, relogio.fatias)}
            fill={cheia ? cor.cheia : cor.vazia}
            stroke={cheia ? cor.cheia : 'rgba(255,255,255,0.14)'}
            strokeWidth={1}
            style={{ cursor: onFatia ? 'pointer' : 'default', transition: 'fill 0.35s ease' }}
            onClick={onFatia ? () => onFatia(indice) : undefined}
          />
        );
      })}
      <circle cx={50} cy={50} r={5} fill="#0b0a10" stroke="rgba(255,255,255,0.3)" strokeWidth={1} pointerEvents="none" />
    </svg>
  );
};
