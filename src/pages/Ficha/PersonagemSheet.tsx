import React, { type CSSProperties, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import {
  useCharacterStore,
  flushEconomyWithKeepalive,
  type CharacterDomainSaveState,
  type CharacterSaveDomain,
} from '../../store/useCharacterStore';
import {
  Bell,
  ChevronRight,
  Compass,
  Crown,
  Dices,
  Eye,
  EyeOff,
  HelpCircle,
  Landmark,
  Moon,
  Package,
  Radio,
  RefreshCw,
  ScrollText,
  Sparkles,
  Swords,
  TrendingUp,
  UserRound,
  Users,
  WandSparkles,
  WifiOff,
} from 'lucide-react';
import { carregarCatalogo } from '../../services/catalogoService';
import { ICatalogo } from '../../types/catalogo';
import { nomeExibicaoRaca } from '../../services/racaService';
import { pendenciasProgressao } from '../../services/progressaoFichaService';
import { ModalInfoFicha } from './components/ModalInfoFicha';
import { FichaModal } from './components/FichaModal';
import { AbaFicha } from './abas/AbaFicha';
import { AbaPericias } from './abas/AbaPericias';
import { AbaInventario } from './abas/AbaInventario';
import { AbaPoderes } from './abas/AbaPoderes';
import { AbaHabilidades } from './abas/AbaHabilidades';
import { AbaAtaques } from './abas/AbaAtaques';
import { AbaMagias } from './abas/AbaMagias';
import { AbaAliados } from './abas/AbaAliados';
import { AbaNotas } from './abas/AbaNotas';
import { AbaProgressao } from './abas/AbaProgressao';
import { AbaDescanso } from './abas/AbaDescanso';
import { AbaBens } from './abas/AbaBens';
import { useCampaignSSE } from '../../hooks/useCampaignSSE';
import { useAuthStore } from '../../store/useAuthStore';
import { FichaAtmosphere } from './components/FichaAtmosphere';
import { FichaGuidedTour } from './components/FichaGuidedTour';
import { criarTemaVisualFicha } from './fichaTheme';
import {
  type FichaTourTabId,
  lerAbasVistasTourFicha,
  obterPassosTourFicha,
  serializarAbasVistasTourFicha,
} from './fichaTourConfig';
import './ficha.css';


const TABS = [
  { id: 'Ficha', icon: UserRound },
  { id: 'Perícias', icon: Dices },
  { id: 'Inventário', icon: Package },
  { id: 'Bens', icon: Landmark },
  { id: 'Habilidades', icon: Sparkles },
  { id: 'Poderes', icon: Crown },
  { id: 'Magias', icon: WandSparkles },
  { id: 'Ataques', icon: Swords },
  { id: 'Aliados', icon: Users },
  { id: 'Progressão', icon: TrendingUp },
  { id: 'Descanso', icon: Moon },
  { id: 'Notas', icon: ScrollText },
] as const;

const TAB_IDS = TABS.map((tab) => tab.id);

const EMPTY_SAVE_STATE: CharacterDomainSaveState = { phase: 'idle' };

const SAVE_PHASE_LABELS: Record<CharacterDomainSaveState['phase'], string> = {
  idle: 'pronto',
  pending: 'alterações pendentes',
  saving: 'salvando…',
  saved: 'salvo',
  error: 'falha ao salvar',
  conflict: 'conflito detectado',
};

const SAVE_PHASE_STYLES: Record<CharacterDomainSaveState['phase'], string> = {
  idle: 'border-white/10 text-gray-500 bg-white/5',
  pending: 'border-amber-500/30 text-amber-300 bg-amber-500/10',
  saving: 'border-sky-500/30 text-sky-300 bg-sky-500/10',
  saved: 'border-emerald-500/30 text-emerald-300 bg-emerald-500/10',
  error: 'border-red-500/40 text-red-300 bg-red-500/10',
  conflict: 'border-orange-500/50 text-orange-200 bg-orange-500/10',
};

type LiveSyncState = 'idle' | 'waiting' | 'syncing' | 'updated' | 'error';

export const PersonagemSheet: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const {
    characters,
    isLoading,
    loadCharacter,
    fetchCharacters,
    syncRemoteCharacter,
    patchCharacter,
    persistence,
    flushCharacterSaves,
    retryCharacterSave,
    resolveCharacterConflict,
    hasPendingCharacterSaves,
    error,
  } = useCharacterStore();

  const [activeTab, setActiveTab] = useState<FichaTourTabId>(() => {
    const savedTab = localStorage.getItem(`rpg_active_tab_${id}`);
    return savedTab && TAB_IDS.includes(savedTab as (typeof TAB_IDS)[number])
      ? savedTab as FichaTourTabId
      : 'Ficha';
  });
  const [showAjuda, setShowAjuda] = useState(false);
  const [showPendencias, setShowPendencias] = useState(false);
  const [tourTab, setTourTab] = useState<FichaTourTabId | null>(null);
  const [catalogo, setCatalogo] = useState<ICatalogo | null>(null);
  const [liveSyncState, setLiveSyncState] = useState<LiveSyncState>('idle');
  const abasVistasNestaSessao = useRef(new Set<FichaTourTabId>());
  const remoteVersionPendingRef = useRef(0);
  const liveSyncRunningRef = useRef(false);
  const liveSyncRunTokenRef = useRef(0);
  const liveSyncRetryRef = useRef<number | null>(null);

  useEffect(() => {
    carregarCatalogo().then(setCatalogo);
  }, []);

  useEffect(() => {
    remoteVersionPendingRef.current = 0;
    liveSyncRunningRef.current = false;
    liveSyncRunTokenRef.current += 1;
    setLiveSyncState('idle');
    if (liveSyncRetryRef.current !== null) {
      window.clearTimeout(liveSyncRetryRef.current);
      liveSyncRetryRef.current = null;
    }
  }, [id]);

  const handleTabChange = (tab: FichaTourTabId) => {
    setActiveTab(tab);
    localStorage.setItem(`rpg_active_tab_${id}`, tab);
  };

  const openActiveConditions = () => {
    handleTabChange('Ficha');
    window.setTimeout(() => {
      const painel = document.getElementById('ficha-condicoes-ativas');
      const reduzirMovimento = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      painel?.scrollIntoView({ behavior: reduzirMovimento ? 'auto' : 'smooth', block: 'center' });
      if (!reduzirMovimento) painel?.animate(
        [
          { boxShadow: '0 0 0 0 rgba(248, 113, 113, 0)' },
          { boxShadow: '0 0 0 3px rgba(248, 113, 113, 0.28)' },
          { boxShadow: '0 0 0 0 rgba(248, 113, 113, 0)' },
        ],
        { duration: 1300, easing: 'ease-out' },
      );
    }, 120);
  };

  const character = characters.find((c) => c.id === id);
  const somenteLeitura = character?.somenteLeitura === true;
  const characterPersistence = id ? persistence[id] : undefined;
  const campanhaId = useAuthStore((state) => state.campanhaAtiva?.id);

  const racaIdTema = character?.ficha?.racaId || '';
  const classePrincipalIdTema = (character?.ficha?.classes?.length
    ? character.ficha.classes.map((slot: { classeId?: string }) => slot.classeId).find((classeId: unknown): classeId is string => typeof classeId === 'string' && Boolean(classeId))
    : character?.ficha?.classeId) || '';
  const temaVisual = useMemo(
    () => criarTemaVisualFicha(racaIdTema, classePrincipalIdTema),
    [racaIdTema, classePrincipalIdTema],
  );
  const usuarioId = useAuthStore((state) => state.usuario?.id);
  const chaveTour = `jardim:ficha-tour:v1:${usuarioId || 'local'}`;

  const iniciarTour = useCallback((aba: FichaTourTabId) => {
    setShowAjuda(false);
    setShowPendencias(false);
    setTourTab(aba);
  }, []);

  const encerrarTour = useCallback(() => {
    if (!tourTab) return;
    abasVistasNestaSessao.current.add(tourTab);
    try {
      const vistas = lerAbasVistasTourFicha(localStorage.getItem(chaveTour));
      vistas.add(tourTab);
      localStorage.setItem(chaveTour, serializarAbasVistasTourFicha(vistas));
    } catch {
      // O guia continua utilizável mesmo quando o navegador bloqueia o armazenamento local.
    }
    setTourTab(null);
  }, [chaveTour, tourTab]);

  useEffect(() => {
    if (!character || tourTab || showAjuda || showPendencias) return undefined;
    if (abasVistasNestaSessao.current.has(activeTab)) return undefined;
    try {
      const vistas = lerAbasVistasTourFicha(localStorage.getItem(chaveTour));
      if (vistas.has(activeTab)) return undefined;
    } catch {
      // A referência em memória evita repetição quando o navegador bloqueia o armazenamento local.
    }

    const atraso = activeTab === 'Ficha' ? 850 : 450;
    const timer = window.setTimeout(() => iniciarTour(activeTab), atraso);
    return () => window.clearTimeout(timer);
  }, [activeTab, character, chaveTour, iniciarTour, showAjuda, showPendencias, tourTab]);

  const tentarSincronizarAoVivo = useCallback(async (silent = false) => {
    if (!id || liveSyncRunningRef.current) return;
    const current = useCharacterStore.getState().characters.find((item) => item.id === id);
    if (!current) return;
    const expectedVersion = remoteVersionPendingRef.current;

    if (expectedVersion > 0 && Number(current.versao) >= expectedVersion) {
      remoteVersionPendingRef.current = 0;
      setLiveSyncState('idle');
      return;
    }
    const elementoAtivo = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const editandoCampo = Boolean(elementoAtivo?.matches(
      'input:not([readonly]):not([disabled]), textarea:not([readonly]):not([disabled]), [contenteditable="true"]',
    ));
    const modalAberto = Boolean(document.querySelector('[role="dialog"]'));
    if (!silent && expectedVersion > 0 && (editandoCampo || modalAberto)) {
      setLiveSyncState('waiting');
      if (liveSyncRetryRef.current !== null) window.clearTimeout(liveSyncRetryRef.current);
      liveSyncRetryRef.current = window.setTimeout(() => void tentarSincronizarAoVivo(), 400);
      return;
    }
    if (hasPendingCharacterSaves(id)) {
      if (!silent) setLiveSyncState('waiting');
      return;
    }

    liveSyncRunningRef.current = true;
    const runToken = ++liveSyncRunTokenRef.current;
    if (!silent) setLiveSyncState('syncing');
    const result = await syncRemoteCharacter(id, expectedVersion);
    if (runToken !== liveSyncRunTokenRef.current) return;
    liveSyncRunningRef.current = false;

    const latest = useCharacterStore.getState().characters.find((item) => item.id === id);
    if (result === 'updated') {
      if (!remoteVersionPendingRef.current || Number(latest?.versao) >= remoteVersionPendingRef.current) {
        remoteVersionPendingRef.current = 0;
      }
      setLiveSyncState('updated');
      if (remoteVersionPendingRef.current > Number(latest?.versao)) {
        window.setTimeout(() => void tentarSincronizarAoVivo(), 0);
      }
      return;
    }
    if (result === 'unchanged') {
      if (!remoteVersionPendingRef.current || Number(latest?.versao) >= remoteVersionPendingRef.current) {
        remoteVersionPendingRef.current = 0;
      }
      if (remoteVersionPendingRef.current > Number(latest?.versao)) {
        if (!silent) setLiveSyncState('syncing');
        window.setTimeout(() => void tentarSincronizarAoVivo(silent), 0);
      } else if (!silent) setLiveSyncState('idle');
      return;
    }
    if (result === 'deferred') {
      if (!silent) setLiveSyncState('waiting');
      return;
    }
    if (result === 'retry') {
      if (!silent) setLiveSyncState('waiting');
      if (liveSyncRetryRef.current !== null) window.clearTimeout(liveSyncRetryRef.current);
      liveSyncRetryRef.current = window.setTimeout(() => void tentarSincronizarAoVivo(silent), 500);
      return;
    }
    setLiveSyncState('error');
    if (expectedVersion > 0) {
      if (liveSyncRetryRef.current !== null) window.clearTimeout(liveSyncRetryRef.current);
      liveSyncRetryRef.current = window.setTimeout(() => void tentarSincronizarAoVivo(), 1_500);
    }
  }, [hasPendingCharacterSaves, id, syncRemoteCharacter]);

  const liveConnectionState = useCampaignSSE(campanhaId, (tipo, payload) => {
    if (tipo !== 'personagem_atualizado' || !character) return;
    const personagemAtualizadoId = String(payload.personagem_id || '');
    if (personagemAtualizadoId === character.id) {
      const versaoRemota = Math.max(0, Math.trunc(Number(payload.versao) || 0));
      if (versaoRemota > Number(character.versao)) {
        remoteVersionPendingRef.current = Math.max(remoteVersionPendingRef.current, versaoRemota);
        setLiveSyncState(hasPendingCharacterSaves(character.id) ? 'waiting' : 'syncing');
        void tentarSincronizarAoVivo();
      }
      return;
    }
    const destinos = Array.isArray(payload.aliados_compartilhados_com)
      ? payload.aliados_compartilhados_com.map(String)
      : [];
    const origensAtuais = (character.aliadosCompartilhados || [])
      .map((aliado) => String(aliado?.compartilhadoDe || ''))
      .filter(Boolean);
    if (destinos.includes(character.id) || origensAtuais.includes(personagemAtualizadoId)) {
      void fetchCharacters();
    }
  }, () => void tentarSincronizarAoVivo(true));

  useEffect(() => {
    if (!id || remoteVersionPendingRef.current <= 0) return;
    const faseFicha = characterPersistence?.sheet.phase;
    const faseEconomia = characterPersistence?.economy.phase;
    const bloqueante = (fase?: string) => fase === 'pending' || fase === 'saving' || fase === 'conflict' || fase === 'error';
    if (bloqueante(faseFicha) || bloqueante(faseEconomia)) return;
    if (!hasPendingCharacterSaves(id)) void tentarSincronizarAoVivo();
  }, [character?.versao, characterPersistence?.sheet.phase, characterPersistence?.economy.phase, hasPendingCharacterSaves, id, tentarSincronizarAoVivo]);

  useEffect(() => {
    if (liveSyncState !== 'updated') return undefined;
    const timer = window.setTimeout(() => setLiveSyncState('idle'), 3_500);
    return () => window.clearTimeout(timer);
  }, [liveSyncState]);

  useEffect(() => () => {
    liveSyncRunTokenRef.current += 1;
    liveSyncRunningRef.current = false;
    if (liveSyncRetryRef.current !== null) window.clearTimeout(liveSyncRetryRef.current);
  }, []);

  useEffect(() => {
    if (id && !character) void loadCharacter(id);
  }, [character, id, loadCharacter]);

  const handleUpdate = useCallback((path: string[], value: unknown) => {
    if (id && !somenteLeitura) patchCharacter(id, path, value);
  }, [id, patchCharacter, somenteLeitura]);

  useEffect(() => {
    if (!id || somenteLeitura) return undefined;

    const flush = () => {
      void flushCharacterSaves(id);
    };
    // A2: no pagehide (fechamento real da aba) usa keepalive para que o
    // browser não aborte o fetch antes de concluir.
    const handlePageHide = () => {
      void flushEconomyWithKeepalive(id);
      flush(); // ficha continua sem keepalive (tem fallback em localStorage)
    };
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') flush();
    };
    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      if (!hasPendingCharacterSaves(id)) return;
      event.preventDefault();
      event.returnValue = '';
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('pagehide', handlePageHide);
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('pagehide', handlePageHide);
      window.removeEventListener('beforeunload', handleBeforeUnload);
      flush();
    };
  }, [flushCharacterSaves, hasPendingCharacterSaves, id, somenteLeitura]);

  if (isLoading && !character) {
    return (
      <div className="app-page flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-yellow-600/20 border-t-yellow-600 rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-400">Carregando Grimório...</p>
        </div>
      </div>
    );
  }

  // M1: Distingue erro de rede/servidor de "personagem realmente não existe"
  if (!character) {
    const isNetworkError = !isLoading && Boolean(error);
    return (
      <div className="app-page flex items-center justify-center">
        <div className="text-center space-y-4">
          {isNetworkError ? (
            <>
              <p className="text-red-400 text-lg">Falha ao carregar a ficha.</p>
              <p className="text-gray-500 text-sm">{error}</p>
              <button
                onClick={() => { if (id) void loadCharacter(id); }}
                className="mt-4 px-6 py-2 rounded-full bg-yellow-600/20 hover:bg-yellow-600/30 border border-yellow-600/30 text-yellow-300 transition-colors"
              >
                Tentar novamente
              </button>
            </>
          ) : (
            <>
              <p className="text-red-400 text-lg">Personagem não encontrado.</p>
              <p className="text-gray-500 text-sm">O ID solicitado não existe ou foi arquivado.</p>
            </>
          )}
          <button
            onClick={() => navigate('/ficha')}
            className="mt-4 px-6 py-2 rounded-full bg-white/5 hover:bg-white/10 border border-white/10 text-white transition-colors"
          >
            ← Voltar para Fichas
          </button>
        </div>
      </div>
    );
  }

  const handleRetry = (domain: CharacterSaveDomain) => {
    void retryCharacterSave(character.id, domain);
  };

  const handleConflict = (domain: CharacterSaveDomain, strategy: 'reload' | 'overwrite') => {
    if (
      strategy === 'overwrite'
      && !window.confirm('Manter sua ficha substituirá integralmente a ficha que está no servidor. Deseja continuar?')
    ) return;
    void resolveCharacterConflict(character.id, domain, strategy);
  };

  const renderSaveDomain = (
    domain: CharacterSaveDomain,
    label: string,
    state: CharacterDomainSaveState,
  ) => (
    <div key={domain} className="flex flex-wrap items-center gap-2">
      <span className={`px-2.5 py-1 rounded-full border text-[11px] font-bold ${SAVE_PHASE_STYLES[state.phase]}`}>
        {label}: {SAVE_PHASE_LABELS[state.phase]}
      </span>
      {state.phase === 'error' && (
        <button
          type="button"
          onClick={() => handleRetry(domain)}
          className="text-[11px] font-bold text-red-300 underline underline-offset-2 hover:text-red-200"
        >
          Tentar novamente
        </button>
      )}
      {state.phase === 'conflict' && (
        <>
          <button
            type="button"
            onClick={() => handleConflict(domain, 'reload')}
            className="text-[11px] font-bold text-orange-200 underline underline-offset-2 hover:text-white"
          >
            Recarregar servidor
          </button>
          {domain === 'sheet' && (
            <button
              type="button"
              onClick={() => handleConflict(domain, 'overwrite')}
              className="text-[11px] font-bold text-orange-200 underline underline-offset-2 hover:text-white"
            >
              Manter minha ficha
            </button>
          )}
        </>
      )}
      {(state.phase === 'error' || state.phase === 'conflict') && state.message && (
        <span className="basis-full text-[11px] text-gray-400">{state.message}</span>
      )}
    </div>
  );

  const fotoPersonagem = character.foto ?? character.ficha?.foto ?? null;
  const ficha = character.ficha || {};
  const racaId = ficha.racaId || '';
  const classeIds: string[] = ficha.classes?.length
    ? ficha.classes
        .map((slot: { classeId?: string }) => slot.classeId)
        .filter((classeId: unknown): classeId is string => typeof classeId === 'string' && Boolean(classeId))
    : (ficha.classeId ? [ficha.classeId] : []);
  const classePrincipalId = classeIds[0] || '';
  const racaCatalogo = catalogo?.racas.find((raca) => raca.id === racaId);
  const classesCatalogo = classeIds.flatMap((classeId) => {
    const classe = catalogo?.classes.find((item) => item.id === classeId);
    return classe ? [classe] : [];
  });
  const nomeRaca = racaId
    ? nomeExibicaoRaca(racaId, ficha.racaNomePersonalizado, racaCatalogo?.titulo) || 'Sem raça'
    : 'Sem raça';
  const nomesClasses = classesCatalogo.length
    ? classesCatalogo.map((classe) => classe?.titulo).filter(Boolean).join(' · ')
    : (classePrincipalId || 'Sem classe');
  const estiloTema = {
    '--ficha-accent': temaVisual.accent,
    '--ficha-secondary': temaVisual.secondary,
    '--ficha-glow': temaVisual.glow,
  } as CSSProperties;
  const fundoCabecalho = temaVisual.classe.fundo || temaVisual.raca.fundo;
  const pendencias = somenteLeitura ? [] : pendenciasProgressao(character.ficha || {});
  const totalPendencias = pendencias.reduce((total, item) => total + item.quantidade, 0);
  const liveIndicator = (() => {
    if (liveConnectionState === 'disabled') return {
      label: 'Ao vivo indisponível',
      title: 'Selecione uma campanha para ativar as atualizações ao vivo.',
      icon: WifiOff,
      style: 'border-white/10 bg-white/[0.04] text-gray-500',
    };
    if (liveConnectionState === 'reconnecting') return {
      label: 'Reconectando',
      title: 'A conexão ao vivo caiu e será restabelecida automaticamente.',
      icon: WifiOff,
      style: 'border-orange-400/25 bg-orange-400/10 text-orange-200',
    };
    if (liveConnectionState === 'connecting') return {
      label: 'Conectando',
      title: 'Conectando a ficha às atualizações da campanha.',
      icon: RefreshCw,
      style: 'border-sky-400/25 bg-sky-400/10 text-sky-200',
    };
    if (liveSyncState === 'waiting') return {
      label: 'Atualização aguardando',
      title: 'Outra tela alterou a ficha. A atualização será aplicada depois que suas edições locais terminarem de salvar.',
      icon: RefreshCw,
      style: 'border-amber-400/30 bg-amber-400/10 text-amber-200',
    };
    if (liveSyncState === 'syncing') return {
      label: 'Sincronizando',
      title: 'Carregando uma alteração feita em outra tela.',
      icon: RefreshCw,
      style: 'border-sky-400/25 bg-sky-400/10 text-sky-200',
    };
    if (liveSyncState === 'updated') return {
      label: 'Atualizada ao vivo',
      title: 'Uma alteração feita em outra tela foi aplicada.',
      icon: Radio,
      style: 'border-emerald-400/30 bg-emerald-400/10 text-emerald-200',
    };
    if (liveSyncState === 'error') return {
      label: 'Falha na atualização',
      title: 'Não foi possível carregar a alteração remota. A ficha tentará novamente sem apagar dados locais.',
      icon: WifiOff,
      style: 'border-red-400/30 bg-red-400/10 text-red-200',
    };
    return {
      label: 'Ao vivo',
      title: 'Alterações salvas em outras telas aparecem automaticamente aqui.',
      icon: Radio,
      style: 'border-emerald-400/20 bg-emerald-400/[0.07] text-emerald-300',
    };
  })();
  const LiveIndicatorIcon = liveIndicator.icon;

  const abrirPendencia = () => {
    setShowPendencias(false);
    handleTabChange('Progressão');
  };

  const abrirModalPendencias = () => {
    setShowAjuda(false);
    setShowPendencias(true);
  };

  const renderHeader = () => (
    <div className="ficha-header mb-8 rounded-2xl border p-4 sm:p-6" data-tour="character-header">
      {fundoCabecalho && (
        <div className="ficha-header__art" style={{ backgroundImage: `url('${fundoCabecalho}')` }} aria-hidden="true" />
      )}
      <div className="ficha-header__content flex flex-col gap-5 md:flex-row md:justify-between md:items-start">
        <div className="flex items-start gap-5 min-w-0">
          <div className="ficha-portrait flex h-20 w-20 flex-shrink-0 items-center justify-center overflow-hidden rounded-2xl border bg-black/50 shadow-inner sm:h-24 sm:w-24">
            {fotoPersonagem ? (
              <img
                src={fotoPersonagem}
                alt={`Foto de ${character.nome || 'personagem'}`}
                loading="lazy"
                decoding="async"
                className="w-full h-full object-cover"
              />
            ) : (
              <span className="text-3xl font-bold text-gray-500" style={{ fontFamily: 'Cinzel, serif' }}>
                {(character.nome?.charAt(0) || '?').toUpperCase()}
              </span>
            )}
          </div>
          <div className="min-w-0">
            <h4 className="mb-2 text-[10px] font-bold uppercase tracking-[0.24em] sm:text-xs" style={{ color: temaVisual.accent }}>
              {somenteLeitura ? 'Grimório vinculado • Somente leitura' : 'Grimório de personagem'}
            </h4>
            <h1 className="ficha-character-name mb-3 break-words text-[clamp(1.8rem,7vw,2.5rem)] leading-tight" style={{ fontFamily: 'Cinzel, serif' }}>
              {character.nome?.toUpperCase() || 'DESCONHECIDO'}
            </h1>
            <div className="flex flex-wrap gap-2">
              <span className="ficha-meta-chip" style={{ '--chip-color': temaVisual.raca.tema.primary } as CSSProperties}>
                <Sparkles size={12} aria-hidden="true" /> {nomeRaca}
              </span>
              <span className="ficha-meta-chip" style={{ '--chip-color': temaVisual.classe.tema.primary } as CSSProperties}>
                <Swords size={12} aria-hidden="true" /> {nomesClasses}
              </span>
              <span className="ficha-meta-chip">
                Nível {character.nivel}
              </span>
            </div>
            {ficha.titulo && <p className="mt-3 text-sm italic text-gray-400">{ficha.titulo}</p>}
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <span role="status" title={liveIndicator.title} className={`flex h-10 items-center gap-2 rounded-full border px-3 text-[10px] font-bold uppercase tracking-wider ${liveIndicator.style}`}>
            <LiveIndicatorIcon size={14} className={liveSyncState === 'syncing' || liveConnectionState === 'connecting' ? 'animate-spin' : ''} aria-hidden="true" />
            <span className="hidden sm:inline">{liveIndicator.label}</span>
          </span>
          {!somenteLeitura && <button
            onClick={() => handleUpdate(['ficha', 'compartilhada'], !character.ficha?.compartilhada)}
            className={`px-4 py-2 rounded-full border text-sm font-bold flex items-center gap-2 transition-colors ${
              character.ficha?.compartilhada
                ? 'border-green-500/50 text-green-400 bg-green-500/10 hover:bg-green-500/20'
                : 'border-white/10 text-gray-500 bg-white/5 hover:bg-white/10'
            }`}
            title="Se ativo, outros jogadores poderão ver seus status básicos na Mesa Virtual"
          >
            {character.ficha?.compartilhada ? <Eye size={16} /> : <EyeOff size={16} />}
            {character.ficha?.compartilhada ? 'Visível na Sessão' : 'Ficha Privada'}
          </button>}
          {!somenteLeitura && (
            <button
              type="button"
              onClick={abrirModalPendencias}
              className={`w-10 h-10 rounded-full border flex items-center justify-center transition-colors relative ${
                totalPendencias > 0
                  ? 'border-amber-500/40 text-amber-400 hover:bg-amber-500/10'
                  : 'border-white/10 text-gray-500 hover:bg-white/5'
              }`}
              aria-label={totalPendencias > 0 ? `Ver ${totalPendencias} pendências da ficha` : 'Ver pendências da ficha'}
              aria-haspopup="dialog"
              aria-expanded={showPendencias}
              title="Pendências da ficha"
            >
              <Bell size={18} aria-hidden="true" />
              {totalPendencias > 0 && (
                <span aria-hidden="true" className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full bg-amber-500 text-black text-[10px] font-black flex items-center justify-center">
                  {totalPendencias}
                </span>
              )}
            </button>
          )}
          <button
            type="button"
            onClick={() => iniciarTour(activeTab)}
            className="ficha-guide-button flex h-10 items-center gap-2 rounded-full border px-3.5 text-xs font-bold uppercase tracking-[0.12em] transition-colors"
            aria-label={`Abrir guia da aba ${activeTab}`}
            title={`Guia da aba ${activeTab}`}
          >
            <Compass size={17} aria-hidden="true" />
            <span className="hidden lg:inline">Guia da aba</span>
          </button>
          <button
            onClick={() => setShowAjuda(true)}
            className="w-10 h-10 rounded-full border border-yellow-600/30 flex items-center justify-center text-yellow-600 hover:bg-yellow-600/10 transition-colors"
            aria-label="Abrir ajuda da ficha"
          >
            <HelpCircle size={18} />
          </button>
        </div>
      </div>
      {somenteLeitura ? (
        <div className="ficha-header__content mt-4 rounded-xl border border-sky-500/20 bg-sky-500/10 px-4 py-3 text-sm text-sky-200">
          Esta ficha foi aberta por um vínculo complexo. Você pode consultar todas as abas, mas somente o dono e a equipe da campanha podem alterá-la.
        </div>
      ) : (
        <div className="ficha-header__content mt-4 flex flex-col gap-2 border-t border-white/5 pt-4" aria-live="polite" aria-atomic="false">
          {renderSaveDomain('sheet', 'Ficha', characterPersistence?.sheet ?? EMPTY_SAVE_STATE)}
          {renderSaveDomain('economy', 'Economia', characterPersistence?.economy ?? EMPTY_SAVE_STATE)}
        </div>
      )}
    </div>
  );

  const renderAjuda = () => (
    <ModalInfoFicha
      isOpen={showAjuda}
      onClose={() => setShowAjuda(false)}
      title="Como usar a Ficha"
      description="As edições são salvas em sequência e aparecem ao vivo para o dono e a equipe da campanha. O indicador do cabeçalho mostra conexão, atualização remota e conflitos sem apagar rascunhos locais."
      items={[
        { label: 'Ao vivo', value: 'Depois do autosave, alterações do jogador ou da equipe aparecem automaticamente nas outras telas abertas' },
        { label: 'Ficha', value: 'Identidade, classe, Fama, Prestígio, atributos, status vitais e experiência' },
        { label: 'Progressão', value: 'Características raciais, habilidades e eventos automáticos, poderes de classe e Legados' },
        { label: 'Descanso', value: 'Recuperação, Cansaço, condições e crises de Sanidade' },
        { label: 'Perícias', value: 'Graus, vantagens/desvantagens e rolagens' },
        { label: 'Inventário', value: 'Itens e moedas (sincronizados com o servidor)' },
        { label: 'Bens', value: 'Propriedades e veículos' },
        { label: 'Poderes / Habilidades / Magias', value: 'Escolher progressão, consultar efeitos, conjurar pelo catálogo oficial e registrar na mesa' },
        { label: 'Ataques', value: 'Criar, editar e rolar acerto/dano no servidor' },
        { label: 'Aliados', value: 'Companheiros e seguidores' },
        { label: 'Notas', value: 'História e anotações de sessão' },
      ]}
    />
  );

  const renderTabs = () => (
    <div className="ficha-tabs horizontal-scroll custom-scrollbar mb-8 flex items-center gap-2 overflow-x-auto pb-5 sm:flex-wrap sm:gap-3 sm:overflow-x-visible sm:pb-7" role="tablist" aria-label="Seções da ficha" data-tour="sheet-tabs">
      {TABS.map(({ id: tab, icon: Icon }) => (
        <button
          key={tab}
          onClick={() => handleTabChange(tab)}
          data-sfx="select"
          role="tab"
          data-tour-tab={tab}
          id={`ficha-tab-${tab}`}
          aria-selected={activeTab === tab}
          aria-controls={`ficha-tabpanel-${tab}`}
          className="ficha-tab flex shrink-0 items-center gap-2 rounded-full border px-4 py-2.5 text-sm font-bold transition-all duration-300 sm:px-5"
        >
          <Icon size={15} strokeWidth={1.8} aria-hidden="true" />
          {tab}
        </button>
      ))}
    </div>
  );

  const renderActiveTab = () => {
    const props = { character, onUpdate: handleUpdate };
    
    switch (activeTab) {
      case 'Ficha': return <AbaFicha {...props} />;
      case 'Progressão': return <AbaProgressao {...props} />;
      case 'Perícias': return <AbaPericias {...props} />;
      case 'Inventário': return <AbaInventario {...props} />;
      case 'Bens': return <AbaBens {...props} />;
      case 'Poderes': return <AbaPoderes {...props} />;
      case 'Habilidades': return <AbaHabilidades {...props} />;
      case 'Ataques': return <AbaAtaques {...props} />;
      case 'Descanso': return <AbaDescanso {...props} onOpenConditions={openActiveConditions} />;
      case 'Magias': return <AbaMagias {...props} />;
      case 'Aliados': return <AbaAliados {...props} />;
      case 'Notas': return <AbaNotas {...props} />;
      default: return null;
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      role="main"
      className="ficha-shell app-page w-full overflow-x-hidden"
      style={estiloTema}
      data-ficha-raca={racaId || undefined}
      data-ficha-classe={classePrincipalId || undefined}
    >
      <FichaAtmosphere tema={temaVisual} />
      <div className="relative z-[1] mx-auto max-w-6xl">
        <button onClick={() => navigate('/ficha')} className="text-gray-500 hover:text-white mb-6 text-sm font-bold uppercase tracking-wider flex items-center gap-2">
          &larr; Voltar
        </button>
        
        {renderHeader()}
        {renderAjuda()}
        {renderTabs()}

        <fieldset disabled={somenteLeitura} className="m-0 min-w-0 border-0 p-0">
          <AnimatePresence mode="wait" initial={false}>
            <motion.div
              key={activeTab}
              id={`ficha-tabpanel-${activeTab}`}
              role="tabpanel"
              data-tour="tab-content"
              aria-labelledby={`ficha-tab-${activeTab}`}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -5 }}
              transition={{ duration: 0.18, ease: 'easeOut' }}
            >
              {renderActiveTab()}
            </motion.div>
          </AnimatePresence>
        </fieldset>
      </div>
      {!somenteLeitura && (
        <FichaModal
          isOpen={showPendencias}
          onClose={() => setShowPendencias(false)}
          title="Pendências da ficha"
          size="md"
        >
          {pendencias.length > 0 ? (
            <div className="space-y-4">
              <div className="flex items-start gap-3 rounded-xl border border-amber-500/25 bg-amber-500/10 p-4">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-amber-500/30 bg-black/20 text-amber-300">
                  <Bell size={18} aria-hidden="true" />
                </span>
                <div className="min-w-0">
                  <strong className="block text-sm text-amber-200">
                    {totalPendencias === 1 ? '1 escolha esperando por você' : `${totalPendencias} escolhas esperando por você`}
                  </strong>
                  <p className="mt-1 text-xs leading-relaxed text-gray-400">
                    Estas opções já foram liberadas pela raça, classes ou nível do personagem. Abra uma delas para concluir na aba Progressão.
                  </p>
                </div>
              </div>

              <div className="grid gap-2.5">
                {pendencias.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={abrirPendencia}
                    className="group flex w-full items-center gap-3 rounded-xl border border-white/[0.07] bg-black/20 p-4 text-left transition-all hover:border-amber-500/35 hover:bg-amber-500/[0.07] focus-visible:border-amber-400 focus-visible:outline-none"
                  >
                    <span className="flex h-9 min-w-9 shrink-0 items-center justify-center rounded-lg border border-amber-500/25 bg-amber-500/10 px-2 font-mono text-sm font-black text-amber-300">
                      {item.quantidade}
                    </span>
                    <span className="min-w-0 flex-1">
                      <strong className="block text-sm text-white transition-colors group-hover:text-amber-200">{item.titulo}</strong>
                      <span className="mt-1 block text-xs leading-relaxed text-gray-400">{item.descricao}</span>
                      <span className="mt-2 flex items-center gap-1 text-[10px] font-bold uppercase tracking-widest text-amber-400/75">
                        Abrir em Progressão <ChevronRight size={12} aria-hidden="true" />
                      </span>
                    </span>
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/[0.07] px-5 py-8 text-center">
              <Sparkles size={26} className="mx-auto text-emerald-300" aria-hidden="true" />
              <strong className="mt-3 block text-sm text-emerald-200">Sua ficha está em dia</strong>
              <p className="mt-1 text-xs leading-relaxed text-gray-400">Nenhuma escolha de progressão está pendente neste momento.</p>
            </div>
          )}
        </FichaModal>
      )}
      {tourTab && (
        <FichaGuidedTour
          key={tourTab}
          passos={obterPassosTourFicha(tourTab)}
          accent={temaVisual.accent}
          onClose={encerrarTour}
          onFinish={encerrarTour}
        />
      )}
    </motion.div>
  );
};
