import { useEffect, useMemo, useRef, useState, type CSSProperties } from 'react';
import { History, Pause, Play, RotateCcw, SkipBack, SkipForward } from 'lucide-react';
import { mesaApi, type IEventoReplay, type IReplay, type ISessaoResumo } from '../../../services/mesaApi';
import {
  FILTROS_REPLAY,
  VELOCIDADES_REPLAY,
  densidade,
  esperaEntreEventos,
  filtrarEventos,
  formatarDuracao,
  type FiltroReplay,
} from './replay';

interface IAbaReplayProps {
  campanhaId: string;
  sessaoAtualId: string | null;
}

const COR_TIPO: Record<string, string> = {
  sessao: '#c7a44c', combate: '#ef4444', turno: '#fb923c', rolagem: '#60a5fa', dano: '#f87171',
  poder: '#c084fc', habilidade: '#c084fc', magia: '#c084fc', clima: '#34d399', mapa: '#38bdf8',
  votacao: '#facc15', relogio: '#f472b6', cronometro: '#fb7185', bilhete: '#a78bfa',
};

const corDoEvento = (evento: IEventoReplay) => {
  if (evento.destaque === 'critico') return '#facc15';
  if (evento.destaque === 'falha') return '#f87171';
  return COR_TIPO[evento.tipo] ?? '#9ca3af';
};

const dataCurta = (iso: string) => new Date(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' });

export const AbaReplay = ({ campanhaId, sessaoAtualId }: IAbaReplayProps) => {
  const [sessoes, setSessoes] = useState<ISessaoResumo[] | null>(null);
  const [sessaoId, setSessaoId] = useState<string | null>(null);
  const [replay, setReplay] = useState<IReplay | null>(null);
  const [erro, setErro] = useState('');
  const [carregando, setCarregando] = useState(false);
  const [filtro, setFiltro] = useState<FiltroReplay>('tudo');
  const [indice, setIndice] = useState(0);
  const [tocando, setTocando] = useState(false);
  const [velocidade, setVelocidade] = useState<number>(2);
  const fimRef = useRef<HTMLLIElement>(null);

  useEffect(() => {
    let ativo = true;
    mesaApi.sessoes(campanhaId)
      .then((resposta) => {
        if (!ativo) return;
        setSessoes(resposta.sessoes);
        setSessaoId((atual) => atual ?? resposta.sessoes.find((sessao) => sessao.id !== sessaoAtualId)?.id ?? resposta.sessoes[0]?.id ?? null);
      })
      .catch((falha) => { if (ativo) setErro(falha instanceof Error ? falha.message : 'Não foi possível listar as sessões.'); });
    return () => { ativo = false; };
  }, [campanhaId, sessaoAtualId]);

  useEffect(() => {
    if (!sessaoId) return undefined;
    let ativo = true;
    setCarregando(true);
    setErro('');
    setTocando(false);
    setIndice(0);
    mesaApi.replay(campanhaId, sessaoId)
      .then((resposta) => { if (ativo) setReplay(resposta); })
      .catch((falha) => { if (ativo) { setReplay(null); setErro(falha instanceof Error ? falha.message : 'Não foi possível abrir o replay.'); } })
      .finally(() => { if (ativo) setCarregando(false); });
    return () => { ativo = false; };
  }, [campanhaId, sessaoId]);

  const eventos = useMemo(() => (replay ? filtrarEventos(replay.eventos, filtro) : []), [replay, filtro]);
  const ultimo = Math.max(0, eventos.length - 1);
  const atual = eventos[Math.min(indice, ultimo)];
  const ritmo = useMemo(() => (replay ? densidade(eventos, replay.duracao_s) : []), [replay, eventos]);
  const maiorRitmo = Math.max(1, ...ritmo);

  useEffect(() => { setIndice(0); setTocando(false); }, [filtro]);

  useEffect(() => {
    if (!tocando) return undefined;
    if (indice >= ultimo) {
      setTocando(false);
      return undefined;
    }
    const espera = esperaEntreEventos(eventos[indice + 1].s - eventos[indice].s, velocidade);
    const timer = window.setTimeout(() => setIndice((valor) => Math.min(ultimo, valor + 1)), espera * 1000);
    return () => window.clearTimeout(timer);
  }, [tocando, indice, ultimo, eventos, velocidade]);

  useEffect(() => {
    if (tocando) fimRef.current?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  }, [indice, tocando]);

  const alternar = () => {
    if (!tocando && indice >= ultimo) setIndice(0);
    setTocando((valor) => !valor);
  };

  if (erro && !sessoes) return <p role="alert" className="rounded-2xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-200">{erro}</p>;
  if (!sessoes) return <p className="py-10 text-center text-sm text-gray-500" aria-busy="true">Buscando as sessões...</p>;
  if (sessoes.length === 0) {
    return (
      <div className="mesa-cartao mesa-cartao--vazio">
        <History className="mx-auto mb-2 text-gray-600" size={26} aria-hidden="true" />
        Ainda não há sessão para rever. Depois da primeira noite ao vivo, ela aparece aqui.
      </div>
    );
  }

  const posicao = Math.min(indice, ultimo);
  const corAtual = atual ? corDoEvento(atual) : '#c7a44c';

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end gap-3">
        <label className="mesa-rotulo min-w-0 flex-1">
          Sessão
          <select className="mesa-campo" value={sessaoId ?? ''} onChange={(evento) => setSessaoId(evento.target.value)}>
            {sessoes.map((sessao) => (
              <option key={sessao.id} value={sessao.id}>
                {sessao.titulo || 'Sessão'} · {dataCurta(sessao.iniciada_em)}{sessao.status === 'aberta' ? ' (ao vivo)' : ''}
              </option>
            ))}
          </select>
        </label>
        <div className="flex flex-wrap gap-1.5" role="group" aria-label="Filtrar eventos">
          {FILTROS_REPLAY.map((opcao) => (
            <button key={opcao.valor} type="button" className="mesa-botao mesa-botao--pequeno !rounded-full" aria-pressed={filtro === opcao.valor} onClick={() => setFiltro(opcao.valor)}>{opcao.rotulo}</button>
          ))}
        </div>
      </div>

      {erro ? <p role="alert" className="rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-200">{erro}</p> : null}
      {carregando ? <p className="py-6 text-center text-sm text-gray-500" aria-busy="true">Rebobinando a noite...</p> : null}

      {replay && !carregando ? (
        <>
          <section className="mesa-cartao space-y-4" aria-label="Reprodutor">
            <div
              className="relative overflow-hidden rounded-xl border border-white/10 px-4 py-5 sm:px-6"
              style={{ background: `linear-gradient(120deg, ${corAtual}26, transparent 70%), #0b0a10`, borderLeft: `4px solid ${corAtual}` }}
              aria-live={tocando ? 'polite' : 'off'}
            >
              <p className="mb-1 text-[10px] font-extrabold uppercase tracking-[0.22em]" style={{ color: corAtual }}>
                {atual ? `${formatarDuracao(atual.s)} · ${atual.tipo}` : 'Sem eventos'}
              </p>
              <p className="min-h-[3.25rem] text-lg font-semibold leading-snug text-white sm:text-xl">
                {atual ? atual.texto : 'Nenhum evento com esse filtro.'}
              </p>
            </div>

            <div>
              <div className="relative h-12" aria-hidden="true">
                <svg viewBox={`0 0 ${Math.max(1, ritmo.length)} 20`} preserveAspectRatio="none" className="absolute inset-0 h-full w-full">
                  {ritmo.map((quantidade, i) => <rect key={i} x={i + 0.12} width={0.76} rx={0.2} y={20 - (quantidade / maiorRitmo) * 20} height={(quantidade / maiorRitmo) * 20} fill="rgba(199,164,76,0.45)" />)}
                </svg>
                {replay.duracao_s > 0 && atual ? <div className="absolute inset-y-0 w-0.5 bg-white shadow-[0_0_8px_white]" style={{ left: `${Math.min(100, (atual.s / replay.duracao_s) * 100)}%` }} /> : null}
              </div>
              <input
                type="range"
                className="mesa-range"
                min={0}
                max={ultimo}
                value={posicao}
                style={{ '--pct': `${ultimo > 0 ? (posicao / ultimo) * 100 : 0}%` } as CSSProperties}
                onChange={(evento) => { setTocando(false); setIndice(Number(evento.target.value)); }}
                aria-label="Ir para um momento da sessão"
                disabled={eventos.length < 2}
              />
              <div className="flex justify-between text-[11px] tabular-nums text-gray-500">
                <span>{formatarDuracao(atual?.s ?? 0)}</span>
                <span>{eventos.length ? `${posicao + 1} de ${eventos.length}` : '0 eventos'}</span>
                <span>{formatarDuracao(replay.duracao_s)}</span>
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-center gap-2 sm:justify-between">
              <div className="flex items-center gap-2">
                <button type="button" className="mesa-botao mesa-botao--icone" aria-label="Voltar ao começo" onClick={() => { setTocando(false); setIndice(0); }}><RotateCcw size={16} /></button>
                <button type="button" className="mesa-botao mesa-botao--icone" aria-label="Evento anterior" onClick={() => { setTocando(false); setIndice((valor) => Math.max(0, valor - 1)); }}><SkipBack size={16} /></button>
                <button type="button" className="mesa-botao mesa-botao--ouro min-w-36" onClick={alternar} disabled={eventos.length < 2}>{tocando ? <Pause size={16} /> : <Play size={16} />}{tocando ? 'Pausar' : 'Reproduzir'}</button>
                <button type="button" className="mesa-botao mesa-botao--icone" aria-label="Próximo evento" onClick={() => { setTocando(false); setIndice((valor) => Math.min(ultimo, valor + 1)); }}><SkipForward size={16} /></button>
              </div>
              <div className="flex items-center gap-1" role="group" aria-label="Velocidade">
                {VELOCIDADES_REPLAY.map((valor) => <button key={valor} type="button" className="mesa-botao mesa-botao--pequeno" aria-pressed={velocidade === valor} onClick={() => setVelocidade(valor)}>{valor}×</button>)}
              </div>
            </div>
          </section>

          <section aria-label="Linha do tempo da sessão">
            <h3 className="mesa-titulo">Até agora</h3>
            <ol className="max-h-[38vh] space-y-1 overflow-y-auto rounded-2xl border border-white/10 bg-black/30 p-2">
              {eventos.slice(0, posicao + 1).map((evento, i) => {
                const cor = corDoEvento(evento);
                const ehAtual = i === posicao;
                return (
                  <li key={`${evento.t}-${i}`} ref={ehAtual ? fimRef : undefined} className={`flex gap-3 rounded-lg py-2 pl-3 pr-3 text-sm transition-colors ${ehAtual ? 'bg-white/[0.07]' : ''}`} style={{ borderLeft: `3px solid ${cor}` }}>
                    <span className="w-14 shrink-0 text-xs tabular-nums text-gray-500">{formatarDuracao(evento.s)}</span>
                    <span className={ehAtual ? 'font-bold text-white' : 'text-gray-300'}>{evento.texto}</span>
                  </li>
                );
              })}
              {eventos.length === 0 ? <li className="py-6 text-center text-sm text-gray-500">Nenhum evento com esse filtro.</li> : null}
            </ol>
          </section>
        </>
      ) : null}
    </div>
  );
};
