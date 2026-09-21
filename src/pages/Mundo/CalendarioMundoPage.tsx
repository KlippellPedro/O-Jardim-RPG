import { useCallback, useEffect, useMemo, useState, type CSSProperties } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, CalendarDays, ChevronLeft, ChevronRight, EyeOff, Moon, Plus, Repeat, Sparkles, Trash2 } from 'lucide-react';
import { useAuthStore } from '../../store/useAuthStore';
import {
  calendarioMundoApi,
  type ChaveEstacao,
  type ICalendarioMundo,
  type IEventoCalendario,
  type Revelacao,
} from '../../services/calendarioMundoApi';
import { CarimboRetido, RasuraTitulo } from '../../components/ui/Rasura';
import { COR_DA_ESTACAO, ESTACOES_DO_ANO, rotuloDoEvento, somarMes, textoEmDias } from './calendarioMundo';

const campo = 'w-full min-h-11 rounded-xl border border-white/10 bg-black/40 px-3 py-2 text-sm text-white outline-none focus:border-yellow-500/50';
const botao = 'inline-flex min-h-10 items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/[0.03] px-3 text-xs font-bold text-gray-200 transition hover:bg-white/10 hover:text-white disabled:opacity-40';

const REVELACOES: Array<{ id: Revelacao; rotulo: string; ajuda: string }> = [
  { id: 'oculto', rotulo: 'Oculto', ajuda: 'Os jogadores nem sabem que existe.' },
  { id: 'rasurado', rotulo: 'Rasurado', ajuda: 'Veem que algo acontece nesse dia, sem saber o quê.' },
  { id: 'aberto', rotulo: 'Aberto', ajuda: 'Título e texto à vista.' },
];

/** Um evento no calendário: aberto mostra o título, rasurado mostra a faixa de tinta. */
const EventoNome = ({ evento }: { evento: IEventoCalendario }) =>
  evento.rasurado ? <RasuraTitulo semente={evento.id} className="text-sm" /> : <>{evento.titulo}</>;

export default function CalendarioMundoPage() {
  const navigate = useNavigate();
  const campanha = useAuthStore((estado) => estado.campanhaAtiva);
  const campanhaId = campanha?.id;
  const [dados, setDados] = useState<ICalendarioMundo | null>(null);
  const [visto, setVisto] = useState<{ ano: number; mes: number } | null>(null);
  const [erro, setErro] = useState('');
  const [ocupado, setOcupado] = useState(false);
  const [diaAberto, setDiaAberto] = useState<number | null>(null);

  const carregar = useCallback(async (alvo?: { ano: number; mes: number }) => {
    if (!campanhaId) return;
    try {
      const resposta = await calendarioMundoApi.obter(campanhaId, alvo?.ano, alvo?.mes);
      setDados(resposta);
      setVisto({ ano: resposta.mes.ano, mes: resposta.mes.mes });
      setErro('');
    } catch (falha) {
      setErro(falha instanceof Error ? falha.message : 'Não foi possível abrir o calendário.');
    }
  }, [campanhaId]);
  const escondido = Boolean(campanha?.configuracoes && (campanha.configuracoes as Record<string, unknown>).calendario_oculto === true) && campanha?.papel !== 'mestre' && campanha?.papel !== 'assistente';

  useEffect(() => { void carregar(); }, [carregar]);

  /** Ação do Mestre: o servidor devolve o calendário novo e a tela volta ao mês de hoje. */
  const agir = async (acao: () => Promise<ICalendarioMundo>) => {
    setOcupado(true);
    setErro('');
    try {
      const resposta = await acao();
      setDados(resposta);
      setVisto({ ano: resposta.mes.ano, mes: resposta.mes.mes });
    } catch (falha) {
      setErro(falha instanceof Error ? falha.message : 'Não foi possível concluir.');
    } finally {
      setOcupado(false);
    }
  };

  const ir = (delta: number) => {
    if (!visto) return;
    const alvo = somarMes(visto.ano, visto.mes, delta);
    setDiaAberto(null);
    void carregar(alvo);
  };

  if (!campanhaId) {
    return <main className="app-page mx-auto max-w-3xl text-center text-gray-400"><p>Escolha uma campanha para ver o calendário do mundo.</p></main>;
  }
  if (escondido) {
    return <main className="app-page mx-auto max-w-3xl text-center text-gray-400"><p>O Mestre ainda não liberou o calendário do mundo.</p><button type="button" onClick={() => navigate('/mundo')} className="mt-4 text-xs font-bold text-yellow-500 hover:underline">Voltar ao Mundo</button></main>;
  }

  const estacao = dados?.estacao;
  const cor = estacao ? COR_DA_ESTACAO[estacao.chave] : '#c7a44c';
  const eventosDoDia = dados && diaAberto ? dados.mes.dias.find((dia) => dia.dia === diaAberto)?.eventos ?? [] : [];

  return (
    <main className="app-page mx-auto flex max-w-6xl flex-col gap-6" style={{ '--cor-estacao': cor } as CSSProperties}>
      <header>
        <button type="button" onClick={() => navigate('/mundo')} className="mb-3 inline-flex items-center gap-1.5 text-xs font-bold text-gray-400 hover:text-white"><ArrowLeft size={14} /> Voltar ao Mundo</button>
        <p className="text-[11px] font-bold uppercase tracking-[0.28em] text-yellow-500">{campanha?.nome}</p>
        <h1 className="mt-1 text-[clamp(1.9rem,6vw,3rem)] font-bold text-white" style={{ fontFamily: 'Cinzel, serif' }}>Calendário e Estações</h1>
      </header>

      {erro ? <p role="alert" className="rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-200">{erro}</p> : null}
      {!dados ? <p className="py-16 text-center text-sm text-gray-500" aria-busy="true">Abrindo o calendário...</p> : (
        <>
          <section
            className="relative overflow-hidden rounded-3xl border p-6 sm:p-8"
            style={{ borderColor: `${cor}55`, background: `radial-gradient(circle at 85% 0%, ${cor}33, transparent 55%), linear-gradient(160deg, #101018, #0a0a10)` }}
            aria-label="Hoje no mundo"
          >
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <p className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.24em]" style={{ color: cor }}>
                  {estacao?.tipo === 'especial' ? <Moon size={14} /> : <Sparkles size={14} />} {estacao?.tipo === 'especial' ? 'Estação especial' : 'Estação'}
                </p>
                <h2 className="mt-1 text-4xl font-bold text-white sm:text-5xl" style={{ fontFamily: 'Cinzel, serif' }}>{estacao?.rotulo}</h2>
                <p className="mt-2 max-w-xl text-sm leading-6 text-gray-300/80">{estacao?.descricao}</p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-black/35 px-5 py-4 text-right">
                <p className="text-[10px] font-bold uppercase tracking-widest text-gray-500">Hoje no mundo</p>
                <p className="mt-1 text-xl font-bold text-white" style={{ fontFamily: 'Cinzel, serif' }}>{dados.hoje_extenso}</p>
              </div>
            </div>
            <ol className="mt-6 grid grid-cols-4 gap-2" aria-label="Estações do ano">
              {ESTACOES_DO_ANO.map((chave, indice) => {
                const atual = dados.mes.estacao === chave || (dados.estacao_especial === null && Math.floor(dados.hoje.mes / 3) === indice);
                return (
                  <li key={chave} className="rounded-xl border px-2 py-2 text-center text-[11px] font-bold uppercase tracking-wider" style={{ borderColor: atual ? COR_DA_ESTACAO[chave] : 'rgba(255,255,255,0.08)', color: atual ? COR_DA_ESTACAO[chave] : '#6b7280', backgroundColor: atual ? `${COR_DA_ESTACAO[chave]}18` : 'transparent' }}>
                    {['Primavera', 'Verão', 'Outono', 'Inverno'][indice]}
                  </li>
                );
              })}
            </ol>
          </section>

          <div className="grid gap-6 lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
            <section className="rounded-3xl border border-white/10 bg-[#0c0b11]/85 p-5" aria-label="Mês">
              <header className="mb-4 flex items-center justify-between gap-2">
                <button type="button" className={`${botao} w-10 px-0`} aria-label="Mês anterior" onClick={() => ir(-1)}><ChevronLeft size={16} /></button>
                <div className="text-center">
                  <h3 className="text-2xl font-bold text-white" style={{ fontFamily: 'Cinzel, serif' }}>{dados.mes.nome}</h3>
                  <p className="text-[11px] font-bold uppercase tracking-widest text-gray-500">Ano {dados.mes.ano} · {['Primavera', 'Verão', 'Outono', 'Inverno'][Math.floor(dados.mes.mes / 3)]}</p>
                </div>
                <button type="button" className={`${botao} w-10 px-0`} aria-label="Próximo mês" onClick={() => ir(1)}><ChevronRight size={16} /></button>
              </header>
              <div className="grid grid-cols-6 gap-1.5 sm:gap-2" role="grid" aria-label={`Dias de ${dados.mes.nome}`}>
                {dados.mes.dias.map((dia) => {
                  const ativo = diaAberto === dia.dia;
                  return (
                    <button
                      key={dia.dia}
                      type="button"
                      role="gridcell"
                      aria-label={`Dia ${dia.dia}${dia.hoje ? ', hoje' : ''}${dia.eventos.length ? `, ${dia.eventos.length} acontecimento(s)` : ''}`}
                      aria-selected={ativo}
                      onClick={() => setDiaAberto(ativo ? null : dia.dia)}
                      className="flex min-h-[4.2rem] flex-col rounded-xl border p-1.5 text-left transition hover:border-white/30 sm:min-h-[5rem] sm:p-2"
                      style={{ borderColor: dia.hoje ? cor : ativo ? 'rgba(255,255,255,0.35)' : 'rgba(255,255,255,0.07)', backgroundColor: dia.hoje ? `${cor}1f` : 'rgba(0,0,0,0.25)' }}
                    >
                      <span className={`text-xs font-bold ${dia.hoje ? 'text-white' : 'text-gray-500'}`}>{dia.dia}</span>
                      {dia.eventos.slice(0, 2).map((evento) => (
                        evento.rasurado
                          ? <span key={evento.id} className="mt-1 block h-2 rounded-sm bg-black ring-1 ring-white/10" aria-hidden="true" />
                          : <span key={evento.id} className="mt-1 block truncate rounded px-1 text-[10px] font-bold leading-4" style={{ backgroundColor: `${cor}33`, color: cor }}>{evento.titulo}</span>
                      ))}
                    </button>
                  );
                })}
              </div>

              {diaAberto ? (
                <div className="mt-4 rounded-2xl border border-white/10 bg-black/30 p-4">
                  <h4 className="text-sm font-bold text-white">{diaAberto} de {dados.mes.nome}</h4>
                  {eventosDoDia.length === 0 ? <p className="mt-2 text-sm text-gray-500">Nada de especial neste dia.</p> : (
                    <ul className="mt-3 space-y-3">
                      {eventosDoDia.map((evento) => (
                        <li key={evento.id}>
                          <p className="font-bold text-white"><EventoNome evento={evento} /></p>
                          {evento.rasurado ? <div className="mt-2"><CarimboRetido texto="Algo acontece aqui" /></div> : evento.nota ? <p className="mt-1 text-sm leading-6 text-gray-400">{evento.nota}</p> : null}
                          {dados.gestor ? <p className="mt-1 text-[10px] uppercase tracking-widest text-gray-600">{rotuloDoEvento(evento)}</p> : null}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              ) : null}
            </section>

            <section className="rounded-3xl border border-white/10 bg-[#0c0b11]/85 p-5" aria-label="Próximos acontecimentos">
              <h3 className="mb-4 flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.22em] text-gray-500"><CalendarDays size={14} className="text-yellow-500" /> Nos próximos dias</h3>
              {dados.proximos.length === 0 ? <p className="text-sm text-gray-500">Nenhum acontecimento à vista.</p> : (
                <ul className="space-y-3">
                  {dados.proximos.map((evento) => (
                    <li key={`${evento.id}-${evento.ano}`} className="rounded-2xl border border-white/[0.07] bg-black/25 p-3">
                      <p className="text-[10px] font-bold uppercase tracking-widest" style={{ color: cor }}>{textoEmDias(evento.em_dias)} · {evento.dia} de {dados.config.meses[evento.mes]}</p>
                      <p className="mt-1 font-bold text-white"><EventoNome evento={evento} /></p>
                      {evento.rasurado ? <div className="mt-2"><CarimboRetido texto="Informação retida" /></div> : evento.nota ? <p className="mt-1 line-clamp-2 text-xs leading-5 text-gray-400">{evento.nota}</p> : null}
                    </li>
                  ))}
                </ul>
              )}
            </section>
          </div>

          {dados.gestor ? <PainelDoMestre campanhaId={campanhaId} dados={dados} ocupado={ocupado} agir={agir} /> : null}
        </>
      )}
    </main>
  );
}

interface IPainelProps {
  campanhaId: string;
  dados: ICalendarioMundo;
  ocupado: boolean;
  agir: (acao: () => Promise<ICalendarioMundo>) => Promise<void>;
}

/** Só o Mestre: mexer no tempo do mundo e marcar acontecimentos com o grau de revelação. */
const PainelDoMestre = ({ campanhaId, dados, ocupado, agir }: IPainelProps) => {
  const meses = dados.config.meses;
  const [ano, setAno] = useState(String(dados.hoje.ano));
  const [mes, setMes] = useState(dados.hoje.mes);
  const [dia, setDia] = useState(String(dados.hoje.dia));
  const [dias, setDias] = useState('7');
  const [titulo, setTitulo] = useState('');
  const [nota, setNota] = useState('');
  const [eMes, setEMes] = useState(dados.hoje.mes);
  const [eDia, setEDia] = useState('1');
  const [eAno, setEAno] = useState(String(dados.hoje.ano));
  const [anual, setAnual] = useState(false);
  const [revelacao, setRevelacao] = useState<Revelacao>('rasurado');
  const [nomesMeses, setNomesMeses] = useState<string[] | null>(null);

  useEffect(() => {
    setAno(String(dados.hoje.ano));
    setMes(dados.hoje.mes);
    setDia(String(dados.hoje.dia));
  }, [dados.hoje.ano, dados.hoje.mes, dados.hoje.dia]);

  const todosEventos = useMemo(() => {
    const lista: IEventoCalendario[] = [];
    const vistos = new Set<string>();
    dados.mes.dias.forEach((d) => d.eventos.forEach((e) => { if (!vistos.has(e.id)) { vistos.add(e.id); lista.push(e); } }));
    dados.proximos.forEach((e) => { if (!vistos.has(e.id)) { vistos.add(e.id); lista.push(e); } });
    return lista;
  }, [dados]);

  return (
    <section className="grid gap-6 lg:grid-cols-2" aria-label="Ferramentas do Mestre">
      <div className="space-y-5 rounded-3xl border border-yellow-600/20 bg-[#0c0b11]/85 p-5">
        <h3 className="text-[11px] font-bold uppercase tracking-[0.22em] text-yellow-500">Mexer no tempo</h3>
        <div>
          <p className="mb-2 text-xs text-gray-400">Avançar o dia do mundo</p>
          <div className="flex flex-wrap gap-2">
            {[1, 3, 7, 30].map((quantidade) => <button key={quantidade} type="button" className={botao} disabled={ocupado} onClick={() => void agir(() => calendarioMundoApi.avancar(campanhaId, quantidade))}>+{quantidade} {quantidade === 1 ? 'dia' : 'dias'}</button>)}
            <input className={`${campo} !w-20`} type="number" value={dias} onChange={(evento) => setDias(evento.target.value)} aria-label="Quantidade de dias" />
            <button type="button" className={botao} disabled={ocupado || !Number(dias)} onClick={() => void agir(() => calendarioMundoApi.avancar(campanhaId, Number(dias)))}>Avançar</button>
          </div>
        </div>
        <div>
          <p className="mb-2 text-xs text-gray-400">Definir a data de hoje</p>
          <div className="grid grid-cols-[4.5rem_1fr_4.5rem_auto] gap-2">
            <input className={campo} type="number" value={dia} min={1} max={30} onChange={(evento) => setDia(evento.target.value)} aria-label="Dia" />
            <select className={campo} value={mes} onChange={(evento) => setMes(Number(evento.target.value))} aria-label="Mês">{meses.map((nome, indice) => <option key={nome + indice} value={indice}>{nome}</option>)}</select>
            <input className={campo} type="number" value={ano} onChange={(evento) => setAno(evento.target.value)} aria-label="Ano" />
            <button type="button" className={botao} disabled={ocupado} onClick={() => void agir(() => calendarioMundoApi.definirHoje(campanhaId, { ano: Number(ano), mes, dia: Number(dia) }))}>Definir</button>
          </div>
        </div>
        <div>
          <p className="mb-2 text-xs text-gray-400">Estação especial (vale até a estação do mês mudar)</p>
          <div className="flex flex-wrap gap-2">
            {([[null, 'Nenhuma'], ['noite_eterna', 'Noite Eterna'], ['eclipse', 'Eclipse']] as Array<[ChaveEstacao | null, string]>).map(([chave, rotulo]) => (
              <button key={rotulo} type="button" className={botao} aria-pressed={dados.estacao_especial === chave} style={dados.estacao_especial === chave ? { borderColor: '#c7a44c', color: '#f3dc8f' } : undefined} disabled={ocupado} onClick={() => void agir(() => calendarioMundoApi.estacaoEspecial(campanhaId, chave))}>{rotulo}</button>
            ))}
          </div>
        </div>
        <label className="flex items-start gap-2 text-xs leading-5 text-gray-400">
          <input type="checkbox" className="mt-0.5" checked={Boolean(dados.config.sincronizar_discord)} onChange={(evento) => void agir(() => calendarioMundoApi.config(campanhaId, { sincronizar_discord: evento.target.checked }))} />
          Manter a estação do Discord igual à do calendário (o Jornalista usa a estação para sortear o loot).
        </label>
        <details>
          <summary className="cursor-pointer text-xs font-bold text-gray-400 hover:text-white">Renomear os meses</summary>
          <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3">
            {(nomesMeses ?? meses).map((nome, indice) => (
              <input key={indice} className={campo} value={nome} maxLength={24} aria-label={`Nome do mês ${indice + 1}`} onChange={(evento) => setNomesMeses((atual) => (atual ?? meses).map((item, i) => (i === indice ? evento.target.value : item)))} />
            ))}
          </div>
          <button type="button" className={`${botao} mt-3`} disabled={ocupado || !nomesMeses || nomesMeses.some((nome) => !nome.trim())} onClick={() => { if (nomesMeses) void agir(() => calendarioMundoApi.config(campanhaId, { meses: nomesMeses })).then(() => setNomesMeses(null)); }}>Salvar nomes</button>
        </details>
      </div>

      <div className="space-y-5 rounded-3xl border border-yellow-600/20 bg-[#0c0b11]/85 p-5">
        <h3 className="text-[11px] font-bold uppercase tracking-[0.22em] text-yellow-500">Marcar um acontecimento</h3>
        <form
          className="space-y-3"
          onSubmit={(evento) => {
            evento.preventDefault();
            if (!titulo.trim()) return;
            void agir(() => calendarioMundoApi.criarEvento(campanhaId, { titulo, nota, mes: eMes, dia: Number(eDia), ano: anual ? null : Number(eAno), anual, revelacao })).then(() => { setTitulo(''); setNota(''); });
          }}
        >
          <input className={campo} value={titulo} maxLength={80} onChange={(evento) => setTitulo(evento.target.value)} placeholder="Ex.: Festa da Colheita, o selo se rompe" aria-label="Título do acontecimento" />
          <textarea className={`${campo} min-h-20`} value={nota} maxLength={600} onChange={(evento) => setNota(evento.target.value)} placeholder="O que acontece (só aparece quando estiver aberto)" aria-label="Texto do acontecimento" />
          <div className="grid grid-cols-[4.5rem_1fr_5rem] gap-2">
            <input className={campo} type="number" min={1} max={30} value={eDia} onChange={(evento) => setEDia(evento.target.value)} aria-label="Dia do acontecimento" />
            <select className={campo} value={eMes} onChange={(evento) => setEMes(Number(evento.target.value))} aria-label="Mês do acontecimento">{meses.map((nome, indice) => <option key={nome + indice} value={indice}>{nome}</option>)}</select>
            <input className={campo} type="number" value={eAno} disabled={anual} onChange={(evento) => setEAno(evento.target.value)} aria-label="Ano do acontecimento" />
          </div>
          <label className="flex items-center gap-2 text-xs text-gray-400"><input type="checkbox" checked={anual} onChange={(evento) => setAnual(evento.target.checked)} /> <Repeat size={12} /> Todo ano (festival, data fixa)</label>
          <div role="group" aria-label="Quanto os jogadores enxergam" className="grid gap-2 sm:grid-cols-3">
            {REVELACOES.map((opcao) => (
              <button key={opcao.id} type="button" aria-pressed={revelacao === opcao.id} onClick={() => setRevelacao(opcao.id)} className="rounded-xl border p-2.5 text-left transition" style={{ borderColor: revelacao === opcao.id ? '#c7a44c' : 'rgba(255,255,255,0.1)', backgroundColor: revelacao === opcao.id ? 'rgba(199,164,76,0.12)' : 'transparent' }}>
                <span className="block text-xs font-bold text-white">{opcao.rotulo}</span>
                <span className="block text-[11px] leading-4 text-gray-500">{opcao.ajuda}</span>
              </button>
            ))}
          </div>
          <button type="submit" className={botao} disabled={ocupado || !titulo.trim()}><Plus size={14} /> Marcar no calendário</button>
        </form>

        {todosEventos.length ? (
          <div>
            <p className="mb-2 text-xs text-gray-400">Deste mês e dos próximos dias</p>
            <ul className="space-y-2">
              {todosEventos.map((evento) => (
                <li key={evento.id} className="flex items-center gap-2 rounded-xl border border-white/[0.07] bg-black/25 p-2.5">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-bold text-white">{evento.titulo}</p>
                    <p className="text-[10px] uppercase tracking-widest text-gray-500">{evento.dia} de {meses[evento.mes]} · {rotuloDoEvento(evento)}</p>
                  </div>
                  <select className="min-h-9 rounded-lg border border-white/10 bg-black/40 px-2 text-xs text-gray-200" value={evento.revelacao} aria-label={`Revelação de ${evento.titulo}`} disabled={ocupado} onChange={(e) => void agir(() => calendarioMundoApi.editarEvento(campanhaId, evento.id, { revelacao: e.target.value as Revelacao }))}>
                    {REVELACOES.map((opcao) => <option key={opcao.id} value={opcao.id}>{opcao.rotulo}</option>)}
                  </select>
                  {evento.revelacao === 'oculto' ? <EyeOff size={14} className="text-amber-300" aria-label="Oculto dos jogadores" /> : null}
                  <button type="button" className="flex h-9 w-9 items-center justify-center rounded-lg border border-white/10 text-gray-500 hover:text-red-400" aria-label={`Apagar ${evento.titulo}`} onClick={() => { if (window.confirm(`Apagar "${evento.titulo}" do calendário?`)) void agir(() => calendarioMundoApi.apagarEvento(campanhaId, evento.id)); }}><Trash2 size={14} /></button>
                </li>
              ))}
            </ul>
          </div>
        ) : null}
      </div>
    </section>
  );
};
