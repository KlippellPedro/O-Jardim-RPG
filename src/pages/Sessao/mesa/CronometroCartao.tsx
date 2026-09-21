import { Eye, EyeOff, Pause, Play, RotateCcw, Trash2 } from 'lucide-react';
import type { CSSProperties } from 'react';
import type { ICronometro } from '../../../services/mesaApi';
import { COR_RELOGIO } from './relogios';
import { formatarTempo, nivelDeUrgencia, restanteAgora } from './cronometros';

interface ICronometroCartaoProps {
  cronometro: ICronometro;
  recebidoEm: number;
  agora: number;
  gestor: boolean;
  ocupado: boolean;
  agir: (acao: string, dados?: Record<string, unknown>) => Promise<boolean>;
}

/** Contagem regressiva à vista de todos: o número grande, a barra e, para o Mestre, os controles. */
export const CronometroCartao = ({ cronometro, recebidoEm, agora, gestor, ocupado, agir }: ICronometroCartaoProps) => {
  const paleta = COR_RELOGIO[cronometro.cor] ?? COR_RELOGIO.perigo;
  const restante = restanteAgora(cronometro, recebidoEm, agora);
  const nivel = nivelDeUrgencia(restante, cronometro.duracao_s, cronometro.situacao);
  const percentual = cronometro.duracao_s > 0 ? Math.min(100, (restante / cronometro.duracao_s) * 100) : 0;
  const correndo = cronometro.situacao === 'correndo' && restante > 0;
  const id = { cronometro_id: cronometro.id };
  const situacao = nivel === 'zerado' ? 'Acabou o tempo' : correndo ? 'Correndo' : cronometro.situacao === 'pausado' ? 'Pausado' : 'Parado';

  return (
    <li
      className={`mesa-cronometro ${nivel === 'urgente' ? 'mesa-cronometro--urgente' : ''} ${nivel === 'zerado' ? 'mesa-cronometro--zerado' : ''}`}
      style={{ '--cor': paleta.cheia } as CSSProperties}
    >
      <div className="flex items-start justify-between gap-2">
        <h4 className="min-w-0 truncate font-bold text-white">{cronometro.titulo}</h4>
        <span className="shrink-0 text-[10px] font-extrabold uppercase tracking-widest" style={{ color: paleta.cheia }}>{situacao}</span>
      </div>
      <div className="mesa-cronometro__tempo" role="timer" aria-label={`${cronometro.titulo}: ${formatarTempo(restante)}`}>
        {formatarTempo(restante)}
      </div>
      <div className="mesa-cronometro__barra" aria-hidden="true"><i style={{ width: `${percentual}%` }} /></div>

      {gestor ? (
        <div className="flex flex-wrap items-center gap-1.5">
          {correndo ? (
            <button type="button" className="mesa-botao mesa-botao--pequeno" disabled={ocupado} onClick={() => void agir('cronometro_pausar', id)}><Pause size={14} /> Pausar</button>
          ) : (
            <button type="button" className="mesa-botao mesa-botao--ouro mesa-botao--pequeno" disabled={ocupado || restante <= 0} onClick={() => void agir('cronometro_iniciar', id)}><Play size={14} /> {cronometro.situacao === 'pausado' ? 'Continuar' : 'Iniciar'}</button>
          )}
          <button type="button" className="mesa-botao mesa-botao--pequeno mesa-botao--icone" aria-label={`Reiniciar ${cronometro.titulo}`} title="Voltar ao tempo inicial" disabled={ocupado} onClick={() => void agir('cronometro_reiniciar', id)}><RotateCcw size={14} /></button>
          <button type="button" className="mesa-botao mesa-botao--pequeno" disabled={ocupado} onClick={() => void agir('cronometro_ajustar', { ...id, delta_s: -30 })}>−30 s</button>
          <button type="button" className="mesa-botao mesa-botao--pequeno" disabled={ocupado} onClick={() => void agir('cronometro_ajustar', { ...id, delta_s: 30 })}>+30 s</button>
          <button type="button" className="mesa-botao mesa-botao--pequeno mesa-botao--icone" aria-pressed={!cronometro.visivel} aria-label={cronometro.visivel ? 'Esconder dos jogadores' : 'Mostrar aos jogadores'} title={cronometro.visivel ? 'Visível aos jogadores' : 'Escondido dos jogadores'} onClick={() => void agir('cronometro_editar', { ...id, visivel: !cronometro.visivel })}>
            {cronometro.visivel ? <Eye size={14} /> : <EyeOff size={14} className="text-amber-300" />}
          </button>
          <button type="button" className="mesa-botao mesa-botao--pequeno mesa-botao--icone ml-auto" aria-label={`Apagar ${cronometro.titulo}`} onClick={() => { if (window.confirm(`Apagar o cronômetro "${cronometro.titulo}"?`)) void agir('cronometro_apagar', id); }}><Trash2 size={14} /></button>
        </div>
      ) : null}
    </li>
  );
};
