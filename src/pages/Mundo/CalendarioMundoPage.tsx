import { useCallback, useEffect, useState, type CSSProperties } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, CalendarDays, CalendarPlus, ChevronLeft, ChevronRight, Moon, Sparkles, Sunrise } from 'lucide-react';
import { useAuthStore } from '../../store/useAuthStore';
import {
  calendarioMundoApi,
  type ChaveEstacao,
  type ICalendarioMundo,
  type IEventoCalendario,
} from '../../services/calendarioMundoApi';
import { CarimboRetido, RasuraTitulo } from '../../components/ui/Rasura';
import { COR_DA_ESTACAO, ESTACOES_DO_ANO, faseDaLua, rotuloDoEvento, somarMes, textoEmDias } from './calendarioMundo';
import { PainelCalendarioMestre, type IPreenchimento } from './PainelCalendarioMestre';
import { LuaFase } from './LuaFase';

const botao = 'inline-flex min-h-10 items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/[0.03] px-3 text-xs font-bold text-gray-200 transition hover:bg-white/10 hover:text-white disabled:opacity-40';

const NOME_DA_ESTACAO: Record<ChaveEstacao, string> = {
  primavera: 'Primavera', verao: 'Verão', outono: 'Outono', inverno: 'Inverno', noite_eterna: 'Noite Eterna', eclipse: 'Eclipse',
};

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
  const [preencher, setPreencher] = useState<IPreenchimento | null>(null);

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
  const diaSelecionado = dados && diaAberto ? dados.mes.dias.find((dia) => dia.dia === diaAberto) : undefined;
  const eventosDoDia = diaSelecionado?.eventos ?? [];
  const eventosDoAnoNoDia = diaSelecionado?.do_ano ?? [];

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
                <p className="mt-2 flex items-center justify-end gap-2 text-xs text-gray-400">
                  <LuaFase dia={dados.hoje.dia} carmesim={dados.hoje_lua_carmesim} tamanho={18} decorativa /> {faseDaLua(dados.hoje.dia, dados.hoje_lua_carmesim).nome}
                </p>
              </div>
            </div>
            <ol className="mt-6 grid grid-cols-4 gap-2" aria-label="Estações do ano">
              {ESTACOES_DO_ANO.map((chave) => {
                const atual = dados.estacao_normal === chave;
                return (
                  <li key={chave} className="rounded-xl border px-2 py-2 text-center text-[11px] font-bold uppercase tracking-wider" style={{ borderColor: atual ? COR_DA_ESTACAO[chave] : 'rgba(255,255,255,0.08)', color: atual ? COR_DA_ESTACAO[chave] : '#6b7280', backgroundColor: atual ? `${COR_DA_ESTACAO[chave]}18` : 'transparent' }}>
                    {NOME_DA_ESTACAO[chave]}
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
                  <p className="text-[11px] font-bold uppercase tracking-widest text-gray-500">Ano {dados.mes.ano} · {NOME_DA_ESTACAO[dados.mes.estacao_normal]}</p>
                </div>
                <button type="button" className={`${botao} w-10 px-0`} aria-label="Próximo mês" onClick={() => ir(1)}><ChevronRight size={16} /></button>
              </header>
              <div className="grid grid-cols-7 gap-1.5 sm:gap-2" role="grid" aria-label={`Dias de ${dados.mes.nome}`}>
                {dados.mes.dias.map((dia) => {
                  const ativo = diaAberto === dia.dia;
                  return (
                    <button
                      key={dia.dia}
                      type="button"
                      role="gridcell"
                      aria-label={`Dia ${dia.dia}${dia.do_ano.length ? `, ${dia.do_ano.map((item) => item.nome).join(', ')}` : ''}, ${faseDaLua(dia.dia, dia.lua_carmesim).nome}${dia.hoje ? ', hoje' : ''}${dia.eventos.length ? `, ${dia.eventos.length} acontecimento(s)` : ''}`}
                      aria-selected={ativo}
                      onClick={() => setDiaAberto(ativo ? null : dia.dia)}
                      className="flex min-h-[4.2rem] flex-col rounded-xl border p-1.5 text-left transition hover:border-white/30 sm:min-h-[5rem] sm:p-2"
                      style={{ borderColor: dia.hoje ? cor : ativo ? 'rgba(255,255,255,0.35)' : dia.lua_carmesim ? 'rgba(225,29,72,0.55)' : dia.extra ? 'rgba(199,164,76,0.5)' : 'rgba(255,255,255,0.07)', backgroundColor: dia.hoje ? `${cor}1f` : dia.lua_carmesim ? 'rgba(225,29,72,0.08)' : dia.extra ? 'rgba(199,164,76,0.07)' : 'rgba(0,0,0,0.25)' }}
                    >
                      <span className="flex items-start justify-between gap-1">
                        <span className={`text-xs font-bold ${dia.hoje ? 'text-white' : 'text-gray-500'}`}>{dia.dia}</span>
                        <LuaFase dia={dia.dia} carmesim={dia.lua_carmesim} tamanho={20} decorativa className={dia.dia === 1 || dia.dia === 15 || dia.dia > 28 ? 'opacity-100' : 'opacity-60'} />
                      </span>
                      {dia.do_ano.map((item) => (
                        <span key={item.id} title={item.descricao} className="mt-1 block truncate rounded px-1 text-[10px] font-bold leading-4" style={item.id === 'lua-carmesim' ? { backgroundColor: 'rgba(225,29,72,0.18)', color: '#fb7185' } : { backgroundColor: 'rgba(199,164,76,0.16)', color: '#e7c76a' }}>{item.nome}{item.duracao > 1 ? ` ${item.parte}/${item.duracao}` : ''}</span>
                      ))}
                      {dia.eventos.slice(0, 2).map((evento) => (
                        evento.rasurado
                          ? <span key={evento.id} className="mt-1 block h-2 rounded-sm bg-black ring-1 ring-white/10" aria-hidden="true" />
                          : <span key={evento.id} className="mt-1 block truncate rounded px-1 text-[10px] font-bold leading-4" style={{ backgroundColor: `${cor}33`, color: cor }}>{evento.titulo}{evento.duracao > 1 ? ` ${evento.parte}/${evento.duracao}` : ''}</span>
                      ))}
                    </button>
                  );
                })}
              </div>

              {diaAberto ? (
                <div className="mt-4 rounded-2xl border border-white/10 bg-black/30 p-4">
                  <h4 className="flex items-center gap-2 text-sm font-bold text-white">
                    Dia {diaAberto} · {dados.mes.nome}
                    <span className="flex items-center gap-1.5 text-xs font-normal text-gray-400"><LuaFase dia={diaAberto} carmesim={Boolean(diaSelecionado?.lua_carmesim)} tamanho={16} decorativa /> {faseDaLua(diaAberto, Boolean(diaSelecionado?.lua_carmesim)).nome}</span>
                  </h4>
                  {dados.gestor ? (
                    <div className="mt-3 flex flex-wrap gap-2">
                      <button type="button" className={botao} onClick={() => setPreencher((atual) => ({ mes: dados.mes.mes, dia: diaAberto, ano: dados.mes.ano, n: (atual?.n ?? 0) + 1 }))}>
                        <CalendarPlus size={13} /> Marcar acontecimento neste dia
                      </button>
                      <button type="button" className={botao} disabled={ocupado} onClick={() => void agir(() => calendarioMundoApi.definirHoje(campanhaId, { ano: dados.mes.ano, mes: dados.mes.mes, dia: diaAberto }))}>
                        <Sunrise size={13} /> Hoje é este dia
                      </button>
                    </div>
                  ) : null}
                  {eventosDoAnoNoDia.map((item) => (
                    <p key={item.id} className={`mt-2 text-sm leading-6 ${item.id === 'lua-carmesim' ? 'text-rose-200/90' : 'text-amber-100/85'}`}>
                      <strong className={item.id === 'lua-carmesim' ? 'text-rose-300' : 'text-amber-300'}>{item.nome}{item.duracao > 1 ? ` (dia ${item.parte} de ${item.duracao})` : ''}.</strong> {item.descricao}
                      {dados.gestor && item.sorteado ? <span className="ml-1 text-[10px] uppercase tracking-widest text-gray-500">(dia sorteado, os jogadores só veem quando chegar)</span> : null}
                    </p>
                  ))}
                  {eventosDoDia.length === 0 && eventosDoAnoNoDia.length === 0 ? <p className="mt-2 text-sm text-gray-500">Nada de especial neste dia.</p> : (
                    <ul className="mt-3 space-y-3">
                      {eventosDoDia.map((evento) => (
                        <li key={evento.id}>
                          <p className="font-bold text-white"><EventoNome evento={evento} />{evento.duracao > 1 ? <span className="ml-2 text-xs font-normal text-gray-500">dia {evento.parte} de {evento.duracao}</span> : null}</p>
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
                      <p className="text-[10px] font-bold uppercase tracking-widest" style={{ color: cor }}>{textoEmDias(evento.em_dias)} · dia {evento.dia} · {dados.config.meses[evento.mes]}</p>
                      <p className="mt-1 font-bold text-white"><EventoNome evento={evento} /></p>
                      {evento.rasurado ? <div className="mt-2"><CarimboRetido texto="Informação retida" /></div> : evento.nota ? <p className="mt-1 line-clamp-2 text-xs leading-5 text-gray-400">{evento.nota}</p> : null}
                    </li>
                  ))}
                </ul>
              )}
            </section>
          </div>

          {dados.gestor ? <PainelCalendarioMestre campanhaId={campanhaId} dados={dados} ocupado={ocupado} agir={agir} preencher={preencher} /> : null}
        </>
      )}
    </main>
  );
}
