import { useEffect } from 'react';
import { Clock, History, LockKeyhole, Mail, Vote, X } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { useMesaStore } from '../../../store/useMesaStore';
import { useAuthStore } from '../../../store/useAuthStore';
import { AbaBilhetes } from './AbaBilhetes';
import { AbaRelogios } from './AbaRelogios';
import { AbaReplay } from './AbaReplay';
import { AbaVotacao } from './AbaVotacao';
import type { AbaMesa } from './avisos';
import './mesa.css';

const ABAS: Array<{ id: AbaMesa; rotulo: string; icone: LucideIcon }> = [
  { id: 'relogios', rotulo: 'Tempo', icone: Clock },
  { id: 'votacao', rotulo: 'Votação', icone: Vote },
  { id: 'bilhetes', rotulo: 'Bilhetes', icone: Mail },
  { id: 'replay', rotulo: 'Replay', icone: History },
];

const SUBTITULO: Record<AbaMesa, string> = {
  relogios: 'Relógios e cronômetros',
  votacao: 'Decisões do grupo',
  bilhetes: 'Segredos passados em voz baixa',
  replay: 'Reveja a noite em ordem',
};

interface IMesaPanelProps {
  aba: AbaMesa;
  onAba: (aba: AbaMesa) => void;
  onClose: () => void;
}

/** A mesa num painel só: tempo (relógios e cronômetros), votação, bilhetes e replay.
 * O Mestre vê as ferramentas; o jogador, só o que é dele. */
export const MesaPanel = ({ aba, onAba, onClose }: IMesaPanelProps) => {
  const dados = useMesaStore((estado) => estado.dados);
  const recebidoEm = useMesaStore((estado) => estado.recebidoEm);
  const ocupado = useMesaStore((estado) => estado.ocupado);
  const erro = useMesaStore((estado) => estado.erro);
  const agir = useMesaStore((estado) => estado.agir);
  const limparErro = useMesaStore((estado) => estado.limparErro);
  const campanhaId = useAuthStore((estado) => estado.campanhaAtiva?.id);

  useEffect(() => { limparErro(); }, [aba, limparErro]);

  const estado = dados?.estado ?? null;
  const gestor = Boolean(dados?.gestor);
  const badges: Partial<Record<AbaMesa, number>> = estado ? {
    votacao: estado.votacao && (gestor || !estado.votacao.meu_voto) ? 1 : 0,
    bilhetes: gestor ? 0 : estado.bilhetes.filter((bilhete) => !bilhete.aberto_em).length,
    relogios: estado.relogios.length + estado.cronometros.length,
  } : {};

  return (
    <div className="mesa flex h-full min-h-0 flex-col bg-[#0b0a10]">
      <header className="flex items-center justify-between gap-3 border-b border-white/10 px-4 py-3 sm:px-6">
        <div className="min-w-0">
          <p className="text-[10px] font-extrabold uppercase tracking-[0.24em] text-[#c7a44c]">{gestor ? 'Mesa do Mestre' : 'Mesa'}</p>
          <h2 className="truncate text-lg font-bold text-white sm:text-xl" style={{ fontFamily: 'Cinzel, serif' }}>{SUBTITULO[aba]}</h2>
        </div>
        <button type="button" onClick={onClose} aria-label="Fechar a mesa" className="mesa-botao mesa-botao--icone"><X size={18} /></button>
      </header>

      <nav className="mesa-nav" role="tablist" aria-label="Seções da mesa">
        {ABAS.map(({ id, rotulo, icone: Icone }) => {
          const total = badges[id] ?? 0;
          return (
            <button key={id} type="button" role="tab" aria-selected={aba === id} onClick={() => onAba(id)} className="mesa-nav__item">
              <Icone size={15} aria-hidden="true" /> {rotulo}
              {total > 0 ? <span className="mesa-nav__selo">{total}</span> : null}
            </button>
          );
        })}
      </nav>

      <div className="min-h-0 flex-1 overflow-y-auto px-4 py-5 sm:px-6">
        <div className="mx-auto w-full max-w-5xl">
          {erro ? (
            <p role="alert" className="mb-4 flex items-start justify-between gap-3 rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-200">
              <span>{erro}</span>
              <button type="button" onClick={limparErro} aria-label="Fechar erro" className="text-red-200/60 hover:text-white"><X size={15} /></button>
            </p>
          ) : null}

          {!dados ? (
            <p className="py-16 text-center text-sm text-gray-500" aria-busy="true">Abrindo a mesa...</p>
          ) : dados.bloqueada || !estado ? (
            aba === 'replay' && campanhaId ? (
              <AbaReplay campanhaId={campanhaId} sessaoAtualId={dados.sessao_id} />
            ) : (
              <div className="mx-auto max-w-md py-16 text-center">
                <LockKeyhole size={36} className="mx-auto mb-4 text-[#c7a44c]" aria-hidden="true" />
                <p className="font-bold text-white">A mesa abre com a sessão ao vivo.</p>
                <p className="mt-2 text-sm text-gray-500">Enquanto o Mestre prepara, os segredos ficam guardados. Você ainda pode rever sessões passadas na aba Replay.</p>
              </div>
            )
          ) : aba === 'relogios' ? (
            <AbaRelogios relogios={estado.relogios} cronometros={estado.cronometros ?? []} recebidoEm={recebidoEm} gestor={gestor} ocupado={ocupado} agir={agir} />
          ) : aba === 'votacao' ? (
            <AbaVotacao votacao={estado.votacao} ultima={estado.ultima_votacao} gestor={gestor} ocupado={ocupado} agir={agir} />
          ) : aba === 'bilhetes' ? (
            <AbaBilhetes bilhetes={estado.bilhetes} gestor={gestor} ocupado={ocupado} jogadores={dados.jogadores} agir={agir} />
          ) : campanhaId ? (
            <AbaReplay campanhaId={campanhaId} sessaoAtualId={dados.sessao_id} />
          ) : null}
        </div>
      </div>
    </div>
  );
};
