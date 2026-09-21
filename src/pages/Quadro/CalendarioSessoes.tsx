import { useCallback, useEffect, useMemo, useState } from 'react';
import { CalendarClock, ChevronLeft, ChevronRight, Plus, RotateCcw, Trash2, X } from 'lucide-react';
import { engajamentoApi, type ICalendario, type ISessaoDoCalendario } from '../../services/engajamentoApi';
import { DIAS_CURTOS, formatarDataDaSessao, horaLocal, mesDe, montarMes, rotuloDoMes, sessoesPorDia, somarMeses } from './quadro';

interface ICalendarioSessoesProps {
  campanhaId: string;
  /** Mestre: toca num dia para cancelar a sessão fixa ou marcar uma especial. */
  editavel?: boolean;
  onMudou?: () => void;
}

const campo = 'w-full rounded-lg border border-white/10 bg-[#0b0a10] px-3 py-2 text-sm text-white outline-none focus:border-[#c7a44c]/50';
const hojeIso = () => {
  const agora = new Date();
  return `${agora.getFullYear()}-${String(agora.getMonth() + 1).padStart(2, '0')}-${String(agora.getDate()).padStart(2, '0')}`;
};

const estiloDaSessao = (sessao: ISessaoDoCalendario) => {
  if (sessao.cancelada) return 'border-red-400/30 bg-red-400/10 text-red-300/80 line-through';
  if (sessao.tipo === 'especial') return 'border-violet-400/50 bg-violet-400/15 text-violet-100';
  return 'border-[#c7a44c]/50 bg-[#c7a44c]/15 text-[#f3dc8f]';
};

/** O calendário do grupo: a sessão fixa da semana, as canceladas (riscadas) e as especiais. */
export const CalendarioSessoes = ({ campanhaId, editavel = false, onMudou }: ICalendarioSessoesProps) => {
  const [mes, setMes] = useState(() => mesDe(new Date()));
  const [dados, setDados] = useState<ICalendario | null>(null);
  const [erro, setErro] = useState('');
  const [selecionado, setSelecionado] = useState<string | null>(null);
  const [hora, setHora] = useState('20:00');
  const [titulo, setTitulo] = useState('');
  const [nota, setNota] = useState('');
  const [ocupado, setOcupado] = useState(false);

  const carregar = useCallback(async () => {
    try {
      setDados(await engajamentoApi.calendario(campanhaId, mes));
      setErro('');
    } catch (falha) {
      setErro(falha instanceof Error ? falha.message : 'Não foi possível abrir o calendário.');
    }
  }, [campanhaId, mes]);

  useEffect(() => { void carregar(); }, [carregar]);

  const semanas = useMemo(() => montarMes(mes), [mes]);
  const porDia = useMemo(() => sessoesPorDia(dados?.sessoes ?? []), [dados]);
  const hoje = hojeIso();

  const executar = async (acao: () => Promise<unknown>) => {
    setOcupado(true);
    setErro('');
    try {
      await acao();
      await carregar();
      onMudou?.();
    } catch (falha) {
      setErro(falha instanceof Error ? falha.message : 'Não foi possível concluir.');
    } finally {
      setOcupado(false);
    }
  };

  const marcarEspecial = () => {
    if (!selecionado) return;
    const instante = new Date(`${selecionado}T${hora}`);
    if (Number.isNaN(instante.getTime())) { setErro('Escolha uma hora válida.'); return; }
    void executar(async () => {
      await engajamentoApi.marcarEspecial(campanhaId, { em: instante.toISOString(), titulo, nota });
      setTitulo('');
      setNota('');
    });
  };

  const sessoesDoSelecionado = selecionado ? porDia.get(selecionado) ?? [] : [];

  return (
    <section className="rounded-2xl border border-white/10 bg-[#0f0e15]/90 p-5" aria-label="Calendário de sessões">
      <header className="mb-3 flex items-center justify-between gap-2">
        <h2 className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.2em] text-[#c7a44c]"><CalendarClock size={14} aria-hidden="true" /> Calendário</h2>
        <div className="flex items-center gap-1">
          <button type="button" aria-label="Mês anterior" onClick={() => setMes((atual) => somarMeses(atual, -1))} className="flex h-9 w-9 items-center justify-center rounded-lg border border-white/10 text-gray-300 hover:text-white"><ChevronLeft size={16} /></button>
          <button type="button" onClick={() => setMes(mesDe(new Date()))} className="min-h-9 rounded-lg border border-white/10 px-3 text-xs font-bold text-gray-300 hover:text-white">{rotuloDoMes(mes)}</button>
          <button type="button" aria-label="Próximo mês" onClick={() => setMes((atual) => somarMeses(atual, 1))} className="flex h-9 w-9 items-center justify-center rounded-lg border border-white/10 text-gray-300 hover:text-white"><ChevronRight size={16} /></button>
        </div>
      </header>

      {dados?.proxima ? (
        <p className="mb-3 rounded-xl border border-[#c7a44c]/25 bg-[#c7a44c]/5 px-3 py-2 text-sm text-[#f3dc8f]">
          <strong>Próxima:</strong> {dados.proxima.texto}, {formatarDataDaSessao(dados.proxima.em)}
          {dados.proxima.titulo ? <span className="text-gray-400"> · {dados.proxima.titulo}</span> : null}
        </p>
      ) : (
        <p className="mb-3 text-sm text-gray-500">{dados ? 'Nenhuma sessão marcada ainda.' : 'Carregando...'}</p>
      )}
      {dados?.recorrencia ? <p className="mb-3 text-xs text-gray-400">{dados.recorrencia.texto}{dados.recorrencia.titulo ? `: ${dados.recorrencia.titulo}` : ''}</p> : null}
      {dados?.proxima?.nota ? <p className="mb-3 text-xs leading-5 text-gray-400">{dados.proxima.nota}</p> : null}

      <div className="grid grid-cols-7 gap-1 text-center" role="grid" aria-label={rotuloDoMes(mes)}>
        {DIAS_CURTOS.map((dia) => <div key={dia} className="pb-1 text-[10px] font-bold uppercase tracking-widest text-gray-600" role="columnheader">{dia}</div>)}
        {semanas.flat().map((celula, indice) => {
          if (!celula.data) return <div key={`vazio-${indice}`} role="gridcell" />;
          const sessoes = porDia.get(celula.data) ?? [];
          const ehHoje = celula.data === hoje;
          const ativo = selecionado === celula.data;
          const conteudo = (
            <>
              <span className={`text-xs ${ehHoje ? 'font-black text-white' : 'text-gray-400'}`}>{celula.dia}</span>
              {sessoes.map((sessao, i) => (
                <span key={`${sessao.em}-${i}`} className={`mt-0.5 block truncate rounded border px-0.5 text-[9px] font-bold leading-4 ${estiloDaSessao(sessao)}`} title={`${sessao.titulo || (sessao.tipo === 'fixa' ? 'Sessão fixa' : 'Sessão especial')}${sessao.cancelada ? ' (cancelada)' : ''}`}>
                  {horaLocal(sessao.em)}
                </span>
              ))}
            </>
          );
          const classe = `flex min-h-[3.4rem] flex-col rounded-lg border p-1 text-center transition-colors ${ehHoje ? 'border-white/40' : 'border-white/5'} ${ativo ? 'bg-white/10' : 'bg-black/20'}`;
          return editavel ? (
            <button key={celula.data} type="button" role="gridcell" aria-selected={ativo} aria-label={`${celula.dia} de ${rotuloDoMes(mes)}${sessoes.length ? `, ${sessoes.length} sessão(ões)` : ''}`} onClick={() => setSelecionado(ativo ? null : celula.data)} className={`${classe} hover:border-[#c7a44c]/50`}>{conteudo}</button>
          ) : (
            <div key={celula.data} role="gridcell" className={classe}>{conteudo}</div>
          );
        })}
      </div>

      <ul className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-[10px] text-gray-500">
        <li className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-sm bg-[#c7a44c]" /> Sessão fixa</li>
        <li className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-sm bg-violet-400" /> Sessão especial</li>
        <li className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-sm bg-red-400" /> Cancelada</li>
      </ul>

      {erro ? <p role="alert" className="mt-3 text-sm text-red-300">{erro}</p> : null}

      {editavel && selecionado ? (
        <div className="mt-4 space-y-3 rounded-xl border border-white/10 bg-black/30 p-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-white">{new Date(`${selecionado}T12:00`).toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' })}</h3>
            <button type="button" aria-label="Fechar o dia" onClick={() => setSelecionado(null)} className="text-gray-500 hover:text-white"><X size={16} /></button>
          </div>
          {sessoesDoSelecionado.map((sessao, i) => (
            <div key={`${sessao.em}-${i}`} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-white/5 px-3 py-2 text-sm">
              <span className={sessao.cancelada ? 'text-red-300 line-through' : 'text-gray-200'}>{horaLocal(sessao.em)} · {sessao.tipo === 'fixa' ? 'Sessão fixa' : 'Sessão especial'}{sessao.titulo ? `: ${sessao.titulo}` : ''}</span>
              {sessao.tipo === 'fixa' ? (
                <button type="button" disabled={ocupado} onClick={() => void executar(() => engajamentoApi.alternarCancelamento(campanhaId, sessao.data))} className="flex min-h-9 items-center gap-1.5 rounded-lg border border-white/10 px-3 text-xs font-bold text-gray-200 hover:text-white disabled:opacity-40">
                  {sessao.cancelada ? <><RotateCcw size={12} /> Restaurar</> : <><X size={12} /> Cancelar esta semana</>}
                </button>
              ) : sessao.id ? (
                <button type="button" disabled={ocupado} aria-label="Apagar a sessão especial" onClick={() => void executar(() => engajamentoApi.apagarEspecial(campanhaId, sessao.id as string))} className="flex h-9 w-9 items-center justify-center rounded-lg border border-white/10 text-gray-500 hover:text-red-400 disabled:opacity-40"><Trash2 size={13} /></button>
              ) : null}
            </div>
          ))}
          <form className="space-y-2" onSubmit={(evento) => { evento.preventDefault(); marcarEspecial(); }}>
            <p className="text-[11px] font-bold uppercase tracking-widest text-gray-500">Marcar sessão especial neste dia</p>
            <div className="grid grid-cols-[6.5rem_1fr] gap-2">
              <input type="time" value={hora} onChange={(evento) => setHora(evento.target.value)} aria-label="Hora" className={campo} />
              <input value={titulo} maxLength={120} onChange={(evento) => setTitulo(evento.target.value)} placeholder="Título (opcional)" aria-label="Título da sessão especial" className={campo} />
            </div>
            <input value={nota} maxLength={600} onChange={(evento) => setNota(evento.target.value)} placeholder="Recado para o grupo (opcional)" aria-label="Recado" className={campo} />
            <button type="submit" disabled={ocupado} className="flex min-h-10 items-center gap-1.5 rounded-lg border border-violet-400/40 bg-violet-400/10 px-4 text-xs font-bold text-violet-100 disabled:opacity-40"><Plus size={13} /> Marcar e avisar a mesa</button>
          </form>
        </div>
      ) : null}
    </section>
  );
};

export default CalendarioSessoes;
