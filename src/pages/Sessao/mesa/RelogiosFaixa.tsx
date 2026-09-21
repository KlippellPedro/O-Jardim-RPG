import type { CSSProperties } from 'react';
import { Timer } from 'lucide-react';
import { useMesaStore } from '../../../store/useMesaStore';
import { RelogioSvg } from './RelogioSvg';
import { COR_RELOGIO } from './relogios';
import { formatarTempo, nivelDeUrgencia, restanteAgora } from './cronometros';
import { useTempo } from './useTempo';

interface IRelogiosFaixaProps {
  onAbrir: () => void;
}

const pilula = 'pointer-events-auto flex items-center gap-2 rounded-full border border-white/10 bg-[#0b0a10]/90 py-1 pl-1 pr-3 text-xs font-bold text-white/80 shadow-lg backdrop-blur-md transition-colors hover:border-[#c7a44c]/40';

/** Relógios e cronômetros que todos podem ver, sempre à mostra no canto da mesa. */
export const RelogiosFaixa = ({ onAbrir }: IRelogiosFaixaProps) => {
  const dados = useMesaStore((estado) => estado.dados);
  const recebidoEm = useMesaStore((estado) => estado.recebidoEm);
  const relogios = dados?.estado?.relogios ?? [];
  const cronometros = dados?.estado?.cronometros ?? [];
  const agora = useTempo(cronometros.some((cronometro) => cronometro.situacao === 'correndo'));
  if (!relogios.length && !cronometros.length) return null;
  return (
    <div className="pointer-events-none absolute left-3 top-3 z-20 flex max-w-[calc(100%-1.5rem)] flex-wrap gap-2" aria-label="Relógios e cronômetros da mesa">
      {cronometros.slice(0, 4).map((cronometro) => {
        const restante = restanteAgora(cronometro, recebidoEm, agora);
        const urgencia = nivelDeUrgencia(restante, cronometro.duracao_s, cronometro.situacao);
        const cor = COR_RELOGIO[cronometro.cor]?.cheia ?? '#ef4444';
        return (
          <button
            key={cronometro.id}
            type="button"
            onClick={onAbrir}
            title={`${cronometro.titulo}: ${formatarTempo(restante)}`}
            className={`${pilula} pl-2 ${urgencia === 'urgente' ? 'mesa-cronometro--urgente' : ''}`}
            style={{ '--cor': cor, borderColor: urgencia === 'calmo' ? undefined : cor } as CSSProperties}
          >
            <Timer size={16} style={{ color: cor }} aria-hidden="true" />
            <span className="max-w-[9rem] truncate">{cronometro.titulo}</span>
            <span className="tabular-nums" style={{ color: urgencia === 'calmo' ? undefined : cor }}>{formatarTempo(restante)}</span>
          </button>
        );
      })}
      {relogios.slice(0, 6).map((relogio) => (
        <button key={relogio.id} type="button" onClick={onAbrir} title={`${relogio.titulo}: ${relogio.cheias}/${relogio.fatias}`} className={pilula}>
          <RelogioSvg relogio={relogio} tamanho={30} />
          <span className="max-w-[9rem] truncate">{relogio.titulo}</span>
          <span className="text-white/50">{relogio.cheias}/{relogio.fatias}</span>
        </button>
      ))}
    </div>
  );
};
