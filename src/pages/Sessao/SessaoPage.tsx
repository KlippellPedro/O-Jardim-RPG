import React, { useEffect, useState } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import {
  AlertTriangle,
  LockKeyhole,
  PanelLeft,
  PanelRight,
  Radio,
  RefreshCw,
  Users,
  Wifi,
  WifiOff,
  X,
} from 'lucide-react';
import { ActiveTurnCard } from './components/ActiveTurnCard';
import { InitiativeTracker } from './InitiativeTracker';
import { SessionLogPanel } from './components/SessionLogPanel';
import { useSessaoStore, type SessionRollRequest } from '../../store/useSessaoStore';
import { useAuthStore } from '../../store/useAuthStore';
import { roleLabel } from './sessionUtils';

export const SessaoPage: React.FC = () => {
  const [isRolling, setIsRolling] = useState(false);
  const [isChangingLive, setIsChangingLive] = useState(false);
  const [liveActionError, setLiveActionError] = useState<string | null>(null);
  const [leftDrawerOpen, setLeftDrawerOpen] = useState(false);
  const [rightDrawerOpen, setRightDrawerOpen] = useState(false);
  const reduceMotion = useReducedMotion();
  const {
    rolarDados,
    conectarSSE,
    desconectarSSE,
    fetchEstadoSessao,
    publicarAoVivo,
    encerrarSessao,
    turnoAtualIndex,
    turnoAtualId,
    emCombate,
    rodada,
    iniciativa,
    tituloSessao,
    meuPapel,
    comando,
    bloqueada,
    sessaoStatus,
    connectionStatus,
    isLoading,
    error,
    clearError,
  } = useSessaoStore();
  const { campanhaAtiva } = useAuthStore();
  const activeCampaignId = campanhaAtiva?.id;

  useEffect(() => {
    if (!activeCampaignId) return undefined;
    conectarSSE(activeCampaignId);
    return () => desconectarSSE();
  }, [activeCampaignId, conectarSSE, desconectarSSE]);

  if (!activeCampaignId) {
    return (
      <div className="absolute inset-0 flex items-center justify-center bg-[#07070b] px-6 text-center text-white">
        <div>
          <Users className="mx-auto mb-4 text-[#c7a44c]" size={36} />
          <h2 className="text-xl font-semibold">Selecione uma campanha para abrir a mesa.</h2>
        </div>
      </div>
    );
  }

  const handleRequestRoll = async (request: SessionRollRequest) => {
    if (isRolling) return;
    setIsRolling(true);
    try {
      await rolarDados(request);
    } catch {
      // A mensagem contextual é mantida no store e exibida no alerta da página.
    } finally {
      setIsRolling(false);
    }
  };

  const handleLiveToggle = async () => {
    if (isChangingLive) return;
    if (sessaoStatus === 'aberta' && !window.confirm('Encerrar a sessão ao vivo para todos os jogadores?')) return;
    setIsChangingLive(true);
    setLiveActionError(null);
    try {
      if (sessaoStatus === 'aberta') await encerrarSessao();
      else await publicarAoVivo();
    } catch (actionError) {
      setLiveActionError(actionError instanceof Error ? actionError.message : 'Não foi possível alterar o estado da sessão.');
    } finally {
      setIsChangingLive(false);
    }
  };

  const activeEntity = iniciativa.find((entity) => entity.id === turnoAtualId) ?? iniciativa[turnoAtualIndex];
  const connectionLabel = connectionStatus === 'online'
    ? 'Conectado'
    : connectionStatus === 'connecting'
      ? 'Conectando'
      : 'Reconectando';

  if (!isLoading && bloqueada && !comando) {
    return (
      <motion.div
        initial={reduceMotion ? false : { opacity: 0 }}
        animate={{ opacity: 1 }}
        className="absolute inset-0 z-10 overflow-hidden bg-[#07070b] pl-24 text-white"
      >
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_36%,rgba(199,164,76,0.12),transparent_42%)]" />
        <main className="relative flex h-full items-center justify-center px-6">
          <section className="w-full max-w-xl rounded-3xl border border-[#c7a44c]/20 bg-[#0d0c12]/95 p-8 text-center shadow-2xl backdrop-blur-xl sm:p-12" aria-labelledby="sessao-bloqueada-titulo">
            <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full border border-[#c7a44c]/25 bg-[#c7a44c]/10 text-[#d9b95f]">
              <LockKeyhole size={34} aria-hidden="true" />
            </div>
            <p className="mt-7 text-[11px] font-semibold uppercase tracking-[0.28em] text-[#c7a44c]">{campanhaAtiva.nome}</p>
            <h1 id="sessao-bloqueada-titulo" className="mt-3 text-3xl font-semibold text-[#f3ead7]" style={{ fontFamily: 'Cinzel, serif' }}>
              Sessão bloqueada
            </h1>
            <p className="mx-auto mt-4 max-w-md text-sm leading-7 text-white/55">
              O Mestre ainda está preparando a mesa. Esta página será liberada automaticamente quando a sessão entrar ao vivo.
            </p>
            <div className="mt-7 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.03] px-4 py-2 text-xs text-white/50" role="status">
              {connectionStatus === 'online' ? <Wifi size={14} className="text-emerald-300" /> : <WifiOff size={14} className="text-amber-200" />}
              {connectionLabel} · aguardando o Mestre
            </div>
          </section>
        </main>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={reduceMotion ? false : { opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={reduceMotion ? undefined : { opacity: 0 }}
      className="absolute inset-0 z-10 overflow-hidden bg-[#07070b] text-white"
    >
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_52%_18%,rgba(199,164,76,0.10),transparent_46%)]" />

      <div className="relative z-10 h-full pl-24">
        <div className="grid h-full min-h-0 grid-rows-[76px_minmax(0,1fr)] xl:grid-cols-[320px_minmax(0,1fr)_340px]">
          <header className="col-span-full flex min-w-0 items-center justify-between border-b border-white/10 bg-[#0b0a10]/95 pl-4 pr-20 backdrop-blur-xl sm:pl-6 sm:pr-24">
            <div className="flex min-w-0 items-center gap-3">
              <div className="min-w-0">
                <p className="truncate text-[11px] font-semibold uppercase tracking-[0.22em] text-[#c7a44c]">
                  {campanhaAtiva.nome}
                </p>
                <div className="mt-1 flex min-w-0 items-center gap-2">
                  <h1 className="truncate text-base font-semibold text-white sm:text-lg">
                    {tituloSessao ?? 'Aguardando sessão'}
                  </h1>
                  <span className="hidden text-xs text-white/30 sm:inline">•</span>
                  <span className="hidden whitespace-nowrap text-xs text-white/55 sm:inline">
                    {sessaoStatus === 'aberta'
                      ? emCombate
                      ? `Rodada ${rodada}${activeEntity ? ` · ${activeEntity.nome}` : ''}`
                        : 'Ao vivo'
                      : 'Preparação privada'}
                  </span>
                </div>
              </div>
            </div>

            <div className="flex shrink-0 items-center gap-1.5 sm:gap-2">
              <button
                type="button"
                onClick={() => setLeftDrawerOpen(true)}
                className="rounded-lg border border-white/10 p-2 text-white/70 hover:border-[#c7a44c]/40 hover:text-white xl:hidden"
                aria-label="Abrir histórico"
              >
                <PanelLeft size={18} />
              </button>
              <button
                type="button"
                onClick={() => setRightDrawerOpen(true)}
                className="rounded-lg border border-white/10 p-2 text-white/70 hover:border-[#c7a44c]/40 hover:text-white xl:hidden"
                aria-label="Abrir iniciativa"
              >
                <PanelRight size={18} />
              </button>

              <span className="hidden rounded-full border border-white/10 bg-white/[0.03] px-3 py-1.5 text-xs text-white/60 md:inline">
                {roleLabel(meuPapel)}
              </span>
              {comando && sessaoStatus ? (
                <button
                  type="button"
                  onClick={() => void handleLiveToggle()}
                  disabled={isChangingLive}
                  className={`flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors disabled:cursor-wait disabled:opacity-50 ${
                    sessaoStatus === 'aberta'
                      ? 'border-red-400/25 bg-red-400/10 text-red-200 hover:bg-red-400/15'
                      : 'border-emerald-400/25 bg-emerald-400/10 text-emerald-200 hover:bg-emerald-400/15'
                  }`}
                  aria-label={sessaoStatus === 'aberta' ? 'Encerrar sessão ao vivo' : 'Liberar sessão para os jogadores'}
                >
                  {isChangingLive ? <RefreshCw size={13} className="animate-spin" /> : <Radio size={13} />}
                  <span className="hidden sm:inline">{sessaoStatus === 'aberta' ? 'Encerrar ao vivo' : 'Iniciar ao vivo'}</span>
                </button>
              ) : null}
              <span
                className={`flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs ${
                  connectionStatus === 'online'
                    ? 'border-emerald-400/20 bg-emerald-400/10 text-emerald-300'
                    : 'border-amber-400/20 bg-amber-400/10 text-amber-200'
                }`}
                role="status"
              >
                {connectionStatus === 'online' ? <Wifi size={13} /> : <WifiOff size={13} />}
                <span className="hidden sm:inline">{connectionLabel}</span>
              </span>
            </div>
          </header>

          <aside className="hidden min-h-0 border-r border-white/10 xl:block">
            <SessionLogPanel />
          </aside>

          <main className="relative min-h-0 min-w-0 overflow-hidden">
            {isLoading ? (
              <div className="flex h-full items-center justify-center text-sm text-white/50" role="status">
                <RefreshCw className="mr-3 animate-spin text-[#c7a44c]" size={18} />
                Preparando a mesa…
              </div>
            ) : (
              <ActiveTurnCard onRequestRoll={handleRequestRoll} isRollDisabled={isRolling} />
            )}
          </main>

          <aside className="hidden min-h-0 border-l border-white/10 xl:block">
            <InitiativeTracker />
          </aside>
        </div>
      </div>

      {leftDrawerOpen ? (
        <div className="fixed inset-0 z-40 bg-black/70 pl-24 xl:hidden" role="presentation" onClick={() => setLeftDrawerOpen(false)}>
          <aside
            className="h-full w-[min(360px,calc(100vw-6rem))] border-r border-white/10 bg-[#0b0a10]"
            onClick={(event) => event.stopPropagation()}
          >
            <SessionLogPanel onClose={() => setLeftDrawerOpen(false)} />
          </aside>
        </div>
      ) : null}

      {rightDrawerOpen ? (
        <div className="fixed inset-0 z-40 flex justify-end bg-black/70 pl-24 xl:hidden" role="presentation" onClick={() => setRightDrawerOpen(false)}>
          <aside
            className="h-full w-[min(380px,calc(100vw-6rem))] border-l border-white/10 bg-[#0b0a10]"
            onClick={(event) => event.stopPropagation()}
          >
            <InitiativeTracker onClose={() => setRightDrawerOpen(false)} />
          </aside>
        </div>
      ) : null}

      {error ? (
        <div className="fixed bottom-5 left-1/2 z-50 flex w-[min(560px,calc(100vw-2rem))] -translate-x-1/2 items-start gap-3 rounded-xl border border-amber-400/25 bg-[#17120b]/95 p-4 text-sm text-amber-100 shadow-2xl backdrop-blur-xl" role="alert">
          <AlertTriangle className="mt-0.5 shrink-0 text-amber-300" size={18} />
          <p className="flex-1">{error}</p>
          <button type="button" onClick={clearError} className="text-amber-100/60 hover:text-white" aria-label="Fechar alerta">
            <X size={17} />
          </button>
          {connectionStatus === 'offline' ? (
            <button
              type="button"
              onClick={() => void fetchEstadoSessao()}
              className="rounded-md border border-amber-300/25 px-2 py-1 text-xs hover:bg-amber-300/10"
            >
              Atualizar
            </button>
          ) : null}
        </div>
      ) : null}

      {liveActionError ? (
        <div className="fixed bottom-5 left-1/2 z-50 flex w-[min(560px,calc(100vw-2rem))] -translate-x-1/2 items-start gap-3 rounded-xl border border-red-400/25 bg-[#1b0d0f]/95 p-4 text-sm text-red-100 shadow-2xl backdrop-blur-xl" role="alert">
          <AlertTriangle className="mt-0.5 shrink-0 text-red-300" size={18} />
          <p className="flex-1">{liveActionError}</p>
          <button type="button" onClick={() => setLiveActionError(null)} className="text-red-100/60 hover:text-white" aria-label="Fechar alerta">
            <X size={17} />
          </button>
        </div>
      ) : null}
    </motion.div>
  );
};
