import { useCallback, useEffect, useState, type CSSProperties } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  BookOpen, CalendarClock, CalendarDays, Car, Copy, Crown, Globe, History, Palette, Radio,
  ScrollText, Shield, ShoppingBag, Sparkles, Swords, Users,
} from 'lucide-react';
import { useAuthStore } from '../../store/useAuthStore';
import { campanhasApi } from '../../services/campanhasApi';
import { campanhaPainelApi, type IPainelCampanha } from '../../services/campanhaPainelApi';
import { calendarioMundoApi, type ICalendarioMundo } from '../../services/calendarioMundoApi';
import { engajamentoApi, type ICalendario } from '../../services/engajamentoApi';
import { CarimboRetido, RasuraTitulo } from '../../components/ui/Rasura';
import { ResumoSessaoModal } from '../Sessao/components/ResumoSessaoModal';
import { formatarDataDaSessao } from '../Quadro/quadro';
import { IdentidadeModal } from './IdentidadeModal';
import { EpilogoModal } from './EpilogoModal';
import { SeletorDeCampanha } from './SeletorDeCampanha';
import { CronicaCampanha } from './CronicaCampanha';
import { ROTULO_PAPEL, corDaCampanha, textoDeDuracao, textoDeVisita, urlDaCapa } from './campanha';

const ATALHOS = [
  { rotulo: 'Ficha', caminho: '/ficha', icone: Shield },
  { rotulo: 'Sessão', caminho: '/sessao', icone: Swords },
  { rotulo: 'Quadro', caminho: '/quadro', icone: ScrollText },
  { rotulo: 'Mundo', caminho: '/mundo', icone: Globe },
  { rotulo: 'Loja', caminho: '/loja', icone: ShoppingBag },
  { rotulo: 'Livro', caminho: '/regras', icone: BookOpen },
  { rotulo: 'Frota', caminho: '/frota', icone: Car },
] as const;

const cartao = 'rounded-3xl border border-white/10 bg-[#0c0b11]/85 p-5';
const titulo = 'mb-4 flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.22em] text-gray-500';

/** A página da campanha: o que é dela (mundo, sessão, quem joga, o que já aconteceu). */
export default function CampanhaPage() {
  const navigate = useNavigate();
  const campanhaAtiva = useAuthStore((estado) => estado.campanhaAtiva);
  const initContexto = useAuthStore((estado) => estado.initContexto);
  const campanhaId = campanhaAtiva?.id;
  const [painel, setPainel] = useState<IPainelCampanha | null>(null);
  const [mundo, setMundo] = useState<ICalendarioMundo | null>(null);
  const [agenda, setAgenda] = useState<ICalendario | null>(null);
  const [erro, setErro] = useState('');
  const [editando, setEditando] = useState(false);
  const [epilogo, setEpilogo] = useState(false);
  const [resumoId, setResumoId] = useState<string | null>(null);
  const [duplicando, setDuplicando] = useState(false);
  const [aviso, setAviso] = useState('');

  const carregar = useCallback(async () => {
    if (!campanhaId) return;
    setErro('');
    try {
      setPainel(await campanhaPainelApi.painel(campanhaId));
    } catch (falha) {
      setErro(falha instanceof Error ? falha.message : 'Não foi possível abrir a campanha.');
    }
    // Hoje no mundo e a próxima sessão vêm dos próprios módulos; se falharem, o cartão só some.
    calendarioMundoApi.obter(campanhaId).then(setMundo).catch(() => setMundo(null));
    engajamentoApi.calendario(campanhaId).then(setAgenda).catch(() => setAgenda(null));
  }, [campanhaId]);

  useEffect(() => { setPainel(null); void carregar(); }, [carregar]);

  const duplicar = async () => {
    if (!campanhaId || duplicando) return;
    if (!window.confirm('Criar uma cópia desta campanha só com o conteúdo (Mundo, Loja, informações e calendário)? Fichas, jogadores e histórico não vão.')) return;
    setDuplicando(true);
    setAviso('');
    try {
      const nova = await campanhaPainelApi.duplicar(campanhaId);
      await initContexto();
      setAviso(`Cópia criada: ${nova.nome}. Troque de campanha pelo seletor no topo para abrir.`);
    } catch (falha) {
      setErro(falha instanceof Error ? falha.message : 'Não foi possível duplicar.');
    } finally {
      setDuplicando(false);
    }
  };

  const encerrar = async () => {
    if (!campanhaId) return;
    await campanhasApi.arquivar(campanhaId);
    await initContexto();
    navigate('/campanhas');
  };

  if (!campanhaId) {
    return <main className="app-page mx-auto max-w-3xl text-center text-gray-400"><p>Escolha uma campanha para abrir a página dela.</p></main>;
  }

  const identidade = painel?.campanha.identidade ?? null;
  const cor = corDaCampanha(identidade);
  const capa = urlDaCapa(campanhaId, identidade);
  const proximaProxima = agenda?.proxima ?? null;
  const proximoEvento = mundo?.proximos[0] ?? null;

  return (
    <main className="app-page mx-auto flex max-w-6xl flex-col gap-6" style={{ '--cor-campanha': cor } as CSSProperties}>
      <div className="flex justify-end"><SeletorDeCampanha /></div>

      <header className="relative overflow-hidden rounded-3xl border" style={{ borderColor: `${cor}55` }}>
        <div className="absolute inset-0" style={{ background: capa ? `url(${capa}) center / cover` : `radial-gradient(circle at 80% 0%, ${cor}44, transparent 60%), linear-gradient(160deg, #14131c, #0a0a10)` }} />
        <div className="absolute inset-0 bg-gradient-to-t from-[#0a0a10] via-[#0a0a10]/70 to-transparent" />
        <div className="relative flex min-h-[15rem] flex-col justify-end gap-3 p-6 sm:min-h-[19rem] sm:p-9">
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-full border px-3 py-1 text-[11px] font-bold uppercase tracking-widest" style={{ borderColor: `${cor}88`, color: cor, backgroundColor: 'rgba(10,10,16,0.7)' }}>{ROTULO_PAPEL[painel?.meu_papel ?? campanhaAtiva?.papel ?? ''] ?? 'Membro'}</span>
            {painel?.ao_vivo ? (
              <button type="button" onClick={() => navigate('/sessao')} className="inline-flex items-center gap-2 rounded-full border border-emerald-400/50 bg-emerald-400/15 px-3 py-1 text-[11px] font-bold uppercase tracking-widest text-emerald-200">
                <Radio size={12} className="animate-pulse" /> Sessão ao vivo · entrar
              </button>
            ) : null}
          </div>
          <h1 className="text-[clamp(2rem,7vw,3.5rem)] font-bold leading-tight text-white drop-shadow-lg" style={{ fontFamily: 'Cinzel, serif' }}>{painel?.campanha.nome ?? campanhaAtiva?.nome}</h1>
          {identidade?.frase ? <p className="max-w-2xl text-base italic leading-7 text-gray-200/90">“{identidade.frase}”</p> : painel?.campanha.descricao ? <p className="line-clamp-2 max-w-2xl text-sm leading-6 text-gray-300">{painel.campanha.descricao}</p> : null}
          {painel?.gestor ? (
            <div className="flex flex-wrap gap-2 pt-1">
              {painel.meu_papel === 'mestre' || painel.meu_papel === 'assistente' ? (
                <>
                  <button type="button" onClick={() => setEditando(true)} className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-white/20 bg-black/40 px-3 text-xs font-bold text-white hover:bg-black/60"><Palette size={14} /> Personalizar</button>
                  <button type="button" onClick={() => void duplicar()} disabled={duplicando} className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-white/20 bg-black/40 px-3 text-xs font-bold text-white hover:bg-black/60 disabled:opacity-50"><Copy size={14} /> {duplicando ? 'Copiando...' : 'Duplicar como modelo'}</button>
                </>
              ) : null}
              <button type="button" onClick={() => setEpilogo(true)} className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-white/20 bg-black/40 px-3 text-xs font-bold text-white hover:bg-black/60"><History size={14} /> Epílogo e encerramento</button>
            </div>
          ) : (
            <div className="pt-1"><button type="button" onClick={() => setEpilogo(true)} className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-white/20 bg-black/40 px-3 text-xs font-bold text-white hover:bg-black/60"><History size={14} /> Ver a retrospectiva</button></div>
          )}
        </div>
      </header>

      {aviso ? <p role="status" className="rounded-xl border border-emerald-400/30 bg-emerald-400/10 p-3 text-sm text-emerald-200">{aviso}</p> : null}
      {erro ? <p role="alert" className="rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-200">{erro}</p> : null}

      <nav className="grid grid-cols-3 gap-2 sm:grid-cols-4 lg:grid-cols-7" aria-label="Atalhos da campanha">
        {ATALHOS.map(({ rotulo, caminho, icone: Icone }) => (
          <button key={caminho} type="button" onClick={() => navigate(caminho)} className="flex min-h-[4.5rem] flex-col items-center justify-center gap-1.5 rounded-2xl border border-white/10 bg-white/[0.03] text-xs font-bold text-gray-200 transition hover:-translate-y-0.5 hover:bg-white/[0.07]" style={{ borderColor: undefined }}>
            <Icone size={20} style={{ color: cor }} aria-hidden="true" /> {rotulo}
          </button>
        ))}
      </nav>

      {!painel && !erro ? <p className="py-10 text-center text-sm text-gray-500" aria-busy="true">Abrindo a campanha...</p> : null}

      {painel ? (
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)]">
          <div className="space-y-6">
            <section className={cartao} aria-label="Hoje no mundo">
              <h2 className={titulo}><Globe size={14} style={{ color: cor }} /> Hoje no mundo</h2>
              {mundo ? (
                <>
                  <p className="text-2xl font-bold text-white" style={{ fontFamily: 'Cinzel, serif' }}>{mundo.hoje_extenso}</p>
                  <p className="mt-1 text-sm text-gray-400"><Sparkles size={13} className="mr-1 inline" style={{ color: cor }} />{mundo.estacao.rotulo}: {mundo.estacao.descricao}</p>
                  {proximoEvento ? (
                    <div className="mt-4 rounded-2xl border border-white/[0.07] bg-black/25 p-3">
                      <p className="text-[10px] font-bold uppercase tracking-widest" style={{ color: cor }}>{proximoEvento.em_dias <= 0 ? 'Hoje' : proximoEvento.em_dias === 1 ? 'Amanhã' : `Em ${proximoEvento.em_dias} dias`}</p>
                      {proximoEvento.rasurado ? <><div className="mt-1"><RasuraTitulo semente={proximoEvento.id} className="text-base" /></div><div className="mt-2"><CarimboRetido texto="Algo se aproxima" /></div></> : <p className="mt-1 font-bold text-white">{proximoEvento.titulo}</p>}
                    </div>
                  ) : null}
                  <button type="button" onClick={() => navigate('/mundo/calendario')} className="mt-4 inline-flex items-center gap-2 text-xs font-bold hover:underline" style={{ color: cor }}><CalendarDays size={14} /> Abrir o calendário e as estações</button>
                </>
              ) : <p className="text-sm text-gray-500">O Mestre ainda não abriu o calendário do mundo.</p>}
            </section>

            <section className={cartao} aria-label="Próxima sessão">
              <h2 className={titulo}><CalendarClock size={14} style={{ color: cor }} /> Próxima sessão</h2>
              {proximaProxima ? (
                <>
                  <p className="text-xl font-bold text-white">{formatarDataDaSessao(proximaProxima.em)}</p>
                  <p className="mt-1 text-sm text-gray-400">{proximaProxima.texto}{proximaProxima.titulo ? ` · ${proximaProxima.titulo}` : ''}</p>
                  {proximaProxima.nota ? <p className="mt-2 text-sm leading-6 text-gray-400">{proximaProxima.nota}</p> : null}
                </>
              ) : <p className="text-sm text-gray-500">Nenhuma sessão marcada. {painel.gestor ? 'Defina o dia fixo no Quadro, na aba Agenda.' : ''}</p>}
            </section>

            <section className={cartao} aria-label="Anteriormente">
              <h2 className={titulo}><History size={14} style={{ color: cor }} /> Anteriormente...</h2>
              {painel.anteriormente.length === 0 ? <p className="text-sm text-gray-500">A primeira noite ainda vai acontecer.</p> : (
                <ul className="space-y-3">
                  {painel.anteriormente.map((sessao) => (
                    <li key={sessao.sessao_id}>
                      <button type="button" onClick={() => setResumoId(sessao.sessao_id)} className="flex w-full items-center gap-3 rounded-2xl border border-white/[0.07] bg-black/25 p-3 text-left transition hover:border-white/25">
                        <span className="min-w-0 flex-1">
                          <span className="block truncate font-bold text-white">{sessao.titulo}</span>
                          <span className="text-xs text-gray-500">
                            {sessao.encerrada_em ? new Date(sessao.encerrada_em).toLocaleDateString('pt-BR', { day: 'numeric', month: 'short' }) : ''}
                            {sessao.duracao_min ? ` · ${textoDeDuracao(sessao.duracao_min)}` : ''}
                            {` · ${sessao.rolagens} rolagens`}{sessao.criticos ? ` · ${sessao.criticos} 20 natural` : ''}
                          </span>
                        </span>
                        <span className="text-[11px] font-bold uppercase tracking-widest" style={{ color: cor }}>Resumo</span>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </section>

            <CronicaCampanha campanhaId={campanhaId} cor={cor} />
          </div>

          <section className={`${cartao} h-fit`} aria-label="A mesa">
            <h2 className={titulo}><Users size={14} style={{ color: cor }} /> A mesa</h2>
            <ul className="space-y-2.5">
              {painel.membros.map((membro) => (
                <li key={membro.usuario_id} className="flex items-center gap-3 rounded-2xl border border-white/[0.07] bg-black/25 p-3">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border text-sm font-bold text-white" style={{ borderColor: `${cor}77`, backgroundColor: `${cor}22` }} aria-hidden="true">
                    {membro.papel === 'mestre' ? <Crown size={16} style={{ color: cor }} /> : membro.nome.slice(0, 1).toUpperCase()}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-bold text-white">{membro.nome}<span className="ml-2 text-[10px] font-bold uppercase tracking-widest text-gray-500">{ROTULO_PAPEL[membro.papel] ?? membro.papel}</span></span>
                    <span className="block truncate text-xs text-gray-400">{membro.personagem ? `${membro.personagem.nome}${membro.personagem.nivel ? ` · nível ${membro.personagem.nivel}` : ''}` : membro.papel === 'jogador' ? 'sem personagem escolhido' : ' '}</span>
                    <span className="block text-[11px] text-gray-600">{textoDeVisita(membro.visto_em)}</span>
                  </span>
                </li>
              ))}
            </ul>
          </section>
        </div>
      ) : null}

      {editando && painel ? (
        <IdentidadeModal
          campanhaId={campanhaId}
          identidade={painel.campanha.identidade}
          onFechar={() => setEditando(false)}
          onSalvo={(nova) => { setPainel({ ...painel, campanha: { ...painel.campanha, identidade: nova } }); setEditando(false); void initContexto(); }}
        />
      ) : null}
      {epilogo ? (
        <EpilogoModal
          campanhaId={campanhaId}
          campanhaNome={painel?.campanha.nome ?? campanhaAtiva?.nome ?? ''}
          cor={cor}
          podeEncerrar={painel?.meu_papel === 'mestre'}
          onEncerrar={encerrar}
          onFechar={() => setEpilogo(false)}
        />
      ) : null}
      {resumoId ? <ResumoSessaoModal sessaoId={resumoId} onClose={() => setResumoId(null)} /> : null}
    </main>
  );
}
