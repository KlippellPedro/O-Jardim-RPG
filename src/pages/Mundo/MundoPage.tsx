import React, { Suspense, lazy, useCallback, useEffect, useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { BookOpen, History, Lock, ShoppingBag } from 'lucide-react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { MUNDO_CATALOG, type LoreEntry } from '../../../data/gerado/mundoCatalog';
import { arvoreVisivel } from '../../../data/mundo/arvoresCatalog';
import { useAuthStore } from '../../store/useAuthStore';
import { usePerformanceProfile } from '../../hooks/usePerformance';
import { conteudoEditorialApi } from '../../services/conteudoEditorialApi';
import { BANCO_LUNAR_INFO } from './bancoLunarInfo';
import { COSMIC_TREES } from './cosmicTrees';
import { loreBloqueado } from './loreVisibility';
import { WORLD_CHRONICLES, type WorldChronicleCatalog } from './worldChronicles';

const CosmicTreeViewer = lazy(() => import('./components/CosmicTreeViewer').then((module) => ({ default: module.CosmicTreeViewer })));
const TreeChroniclePage = lazy(() => import('./components/TreeChroniclePage').then((module) => ({ default: module.TreeChroniclePage })));
const GlobalChroniclePage = lazy(() => import('./components/GlobalChroniclePage').then((module) => ({ default: module.GlobalChroniclePage })));

const EMPTY_CONFIG: Record<string, unknown> = {};

const WorldLoading = ({ label }: { label: string }) => (
  <div className="flex min-h-[320px] w-full items-center justify-center rounded-3xl border border-white/10 bg-[#08070c]/85 text-sm text-gray-500">
    <div className="flex items-center gap-3">
      <span className="h-5 w-5 animate-spin rounded-full border-2 border-yellow-500/20 border-t-yellow-500" />
      {label}
    </div>
  </div>
);

export const MundoPage: React.FC = () => {
  const [mundoCatalog, setMundoCatalog] = useState<LoreEntry[]>(MUNDO_CATALOG);
  const [worldChronicles, setWorldChronicles] = useState<WorldChronicleCatalog>(WORLD_CHRONICLES);
  const [selectedDeidadeId, setSelectedDeidadeId] = useState<string | null>(null);
  const [infoDeidadeId, setInfoDeidadeId] = useState<string | null>(null);
  const [bancoLunarAberto, setBancoLunarAberto] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const { arvoreId } = useParams<{ arvoreId?: string }>();
  const usuario = useAuthStore((state) => state.usuario);
  const campanhaAtiva = useAuthStore((state) => state.campanhaAtiva);
  const { reduceMotion } = usePerformanceProfile();

  const isMestre = usuario?.papel_plataforma === 'admin'
    || usuario?.papel_plataforma === 'criador'
    || campanhaAtiva?.papel === 'mestre'
    || campanhaAtiva?.papel === 'assistente';
  const config = campanhaAtiva?.configuracoes ?? EMPTY_CONFIG;
  const loreRevelado = config.lore_revelado as string[] | undefined ?? [];
  const loreOculto = config.lore_oculto as string[] | undefined ?? [];

  useEffect(() => {
    if (!campanhaAtiva?.id) {
      setMundoCatalog(MUNDO_CATALOG);
      setWorldChronicles(WORLD_CHRONICLES);
      return undefined;
    }
    const controller = new AbortController();
    conteudoEditorialApi.carregarMundoResolvido(campanhaAtiva.id, controller.signal)
      .then((response) => {
        const chronology = response.entradas.find((entry) => entry.tipo === 'cronologia');
        const chronologyContent = chronology?.conteudo;
        if (
          chronologyContent
          && Array.isArray(chronologyContent.linha_tempo_geral)
          && Array.isArray(chronologyContent.arvores)
        ) {
          setWorldChronicles(chronologyContent as unknown as WorldChronicleCatalog);
        } else {
          setWorldChronicles(WORLD_CHRONICLES);
        }
        setMundoCatalog(
          response.entradas.filter((entry) => entry.tipo !== 'cronologia') as unknown as LoreEntry[],
        );
      })
      .catch((error) => {
        if (error?.name !== 'AbortError') {
          console.error('Não foi possível carregar o conteúdo personalizado do Mundo.', error);
          setMundoCatalog(MUNDO_CATALOG);
          setWorldChronicles(WORLD_CHRONICLES);
        }
      });
    return () => controller.abort();
  }, [campanhaAtiva?.id]);

  const lockedDeidades = useMemo(() => COSMIC_TREES
    .map((tree) => tree.deidadeId)
    .filter((id) => {
      if (isMestre) return false;
      if (!arvoreVisivel(id, config, isMestre)) return true;
      const entry = mundoCatalog.find((item) => item.id === id && item.tipo === 'deidade');
      if (!entry) return true;
      return loreBloqueado(entry, { isMestre, loreRevelado, loreOculto });
    }), [config, isMestre, loreOculto, loreRevelado, mundoCatalog]);
  const lockedSet = useMemo(() => new Set(lockedDeidades), [lockedDeidades]);
  const visibleTreeIds = useMemo(
    () => COSMIC_TREES.map((tree) => tree.deidadeId).filter((id) => !lockedSet.has(id)),
    [lockedSet],
  );
  const activeTree = arvoreId
    ? COSMIC_TREES.find((tree) => tree.deidadeId === arvoreId)
    : undefined;
  const isGlobalTimeline = location.pathname === '/mundo/cronologia';

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'auto' });
  }, [location.pathname]);

  const openTreeChronicle = useCallback((treeId: string) => {
    if (!lockedSet.has(treeId)) navigate(`/mundo/arvores/${treeId}`);
  }, [lockedSet, navigate]);

  const handleSelectDeidade = useCallback((id: string | null) => {
    setSelectedDeidadeId(id);
    if (!id) {
      setInfoDeidadeId(null);
      setBancoLunarAberto(false);
    }
  }, []);

  const handleOpenInfo = useCallback((id: string) => {
    setInfoDeidadeId(id);
    setBancoLunarAberto(false);
  }, []);

  const handleOpenBancoLunar = useCallback(() => {
    setBancoLunarAberto(true);
    setInfoDeidadeId(null);
  }, []);

  const details = useMemo(() => {
    if (!infoDeidadeId) return null;
    const deidade = mundoCatalog.find((entry) => entry.id === infoDeidadeId && entry.tipo === 'deidade');
    const fluxo = mundoCatalog.find((entry) => entry.id === deidade?.conteudo.fluxo && entry.tipo === 'fluxo');
    const galhos = mundoCatalog.filter((entry) => entry.tipo === 'galho' && entry.conteudo.arvore === infoDeidadeId);
    return { deidade, fluxo, galhos };
  }, [infoDeidadeId, mundoCatalog]);

  const renderLoreBlock = useCallback((
    entry: LoreEntry | undefined,
    label: string,
    paiBloqueado = false,
  ) => {
    if (!entry) return null;
    const isLocked = loreBloqueado(entry, { isMestre, loreRevelado, loreOculto, paiBloqueado });
    if (isLocked) {
      return (
        <div key={entry.id} className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-white/5 bg-black/60 p-4 text-center">
          <Lock className="text-gray-600" size={24} />
          <h4 className="text-xs font-bold uppercase tracking-widest text-gray-500">Conhecimento Oculto</h4>
          <p className="text-xs italic text-gray-700">O Mestre ainda não revelou este fragmento da criação.</p>
        </div>
      );
    }
    return (
      <button
        type="button"
        key={entry.id}
        onClick={() => infoDeidadeId && openTreeChronicle(infoDeidadeId)}
        className="group flex w-full cursor-pointer flex-col gap-2 rounded-2xl border border-white/5 bg-black/30 p-4 text-left transition-colors hover:border-yellow-600/30"
      >
        <span className="text-[10px] font-bold uppercase tracking-widest text-gray-500">{label}</span>
        <h4 className="text-lg font-bold leading-tight text-white">{entry.titulo}</h4>
        {entry.conteudo.epiteto && <span className="text-xs italic text-yellow-500/80">“{entry.conteudo.epiteto}”</span>}
        <p className="mt-2 line-clamp-5 text-sm leading-relaxed text-gray-400">{entry.conteudo.descricao}</p>
        {entry.conteudo.dominio && (
          <div className="mt-2 rounded-lg bg-black/40 p-2 text-xs">
            <strong className="mb-1 block uppercase tracking-widest text-gray-500">Domínio</strong>
            <span className="text-gray-300">{entry.conteudo.dominio}</span>
          </div>
        )}
        <span className="mt-2 inline-flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-yellow-600 opacity-70 transition group-hover:opacity-100">
          <BookOpen size={13} /> Abrir capítulo completo
        </span>
      </button>
    );
  }, [infoDeidadeId, isMestre, loreOculto, loreRevelado, openTreeChronicle]);

  if (arvoreId && activeTree && !lockedSet.has(arvoreId)) {
    return (
      <Suspense fallback={<WorldLoading label="Carregando crônica..." />}>
        <TreeChroniclePage
          treeId={arvoreId}
          color={activeTree.color}
          chronicles={worldChronicles}
          onBack={() => navigate('/mundo')}
          onOpenGlobalTimeline={() => navigate('/mundo/cronologia')}
        />
      </Suspense>
    );
  }

  if (isGlobalTimeline) {
    return (
      <Suspense fallback={<WorldLoading label="Carregando linha do tempo..." />}>
        <GlobalChroniclePage
          visibleTreeIds={visibleTreeIds}
          chronicles={worldChronicles}
          onBack={() => navigate('/mundo')}
          onOpenTree={openTreeChronicle}
        />
      </Suspense>
    );
  }

  const panelTransition = reduceMotion ? { duration: 0 } : { type: 'spring' as const, stiffness: 200, damping: 25 };
  const arvoreDetalheTrancada = infoDeidadeId ? lockedSet.has(infoDeidadeId) : false;

  return (
    <>
      <div className="fixed inset-0 z-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-[#1a1829] via-[#050508] to-black opacity-40 pointer-events-none">
        <div className="world-stardust absolute inset-0 opacity-30 mix-blend-screen" />
      </div>

      <div role="main" className="app-viewport mx-auto flex max-w-[112.5rem] flex-col overflow-hidden">
        <div className="mb-3 flex shrink-0 flex-col items-center sm:mb-5">
          <h1 className="text-center text-[clamp(2rem,7vw,3.75rem)] font-bold leading-tight tracking-wider text-yellow-500 drop-shadow-[0_0_20px_rgba(202,138,4,0.5)]" style={{ fontFamily: 'Cinzel, serif' }}>
            Códice do Jardim
          </h1>
          <button
            type="button"
            onClick={() => navigate('/mundo/cronologia')}
            className="mt-2 inline-flex items-center gap-2 rounded-full border border-yellow-600/30 bg-black/25 px-4 py-2 text-xs font-bold uppercase tracking-widest text-yellow-500 transition hover:border-yellow-500/60 hover:bg-yellow-500/5 sm:mt-4"
          >
            <History size={15} /> Linha do tempo geral
          </button>
        </div>

        <div className="performance-expensive-effects relative flex min-h-0 w-full flex-1 overflow-hidden rounded-2xl border border-white/10 shadow-[0_0_50px_rgba(0,0,0,0.8)] sm:rounded-3xl">
          <Suspense fallback={<WorldLoading label="Preparando projeção astral..." />}>
            <CosmicTreeViewer
              selectedDeidadeId={selectedDeidadeId}
              onSelectDeidade={handleSelectDeidade}
              onOpenInfo={handleOpenInfo}
              onOpenBancoLunar={handleOpenBancoLunar}
              lockedDeidades={lockedDeidades}
            />
          </Suspense>

          <AnimatePresence>
            {details && (
              <motion.div
                initial={reduceMotion ? false : { x: '100%', opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                exit={reduceMotion ? { opacity: 0 } : { x: '100%', opacity: 0 }}
                transition={panelTransition}
                className="performance-expensive-effects absolute right-0 top-0 z-20 flex h-full w-full flex-col gap-4 overflow-y-auto border-l border-white/10 bg-[#0a090e]/90 p-4 pb-[max(1rem,env(safe-area-inset-bottom))] shadow-[-20px_0_50px_rgba(0,0,0,0.5)] backdrop-blur-2xl custom-scrollbar pointer-events-auto sm:w-[min(400px,100%)] sm:gap-6 sm:p-6"
              >
                <div className="mb-2 flex shrink-0 items-start justify-between">
                  <h3 className="text-3xl font-bold tracking-widest text-yellow-500" style={{ fontFamily: 'Cinzel, serif' }}>
                    {arvoreDetalheTrancada ? 'Árvore Desconhecida' : (details.fluxo?.conteudo.arvore || 'Árvore Desconhecida')}
                  </h3>
                  <button type="button" onClick={() => setInfoDeidadeId(null)} className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-2xl text-gray-500 hover:bg-white/10 hover:text-white" aria-label="Fechar detalhes">&times;</button>
                </div>

                {renderLoreBlock(details.deidade, 'Deidade', arvoreDetalheTrancada)}
                {renderLoreBlock(details.fluxo, 'Fluxo Cósmico', arvoreDetalheTrancada)}
                {!arvoreDetalheTrancada && (
                  <div className="mt-4 shrink-0 border-t border-white/5 pt-4">
                    <h4 className="mb-4 text-sm font-bold uppercase tracking-widest text-gray-500">Galhos (Realidades)</h4>
                    <div className="flex flex-col gap-4">
                      {details.galhos.length > 0
                        ? details.galhos.map((galho) => renderLoreBlock(galho, 'Galho'))
                        : <p className="text-xs italic text-gray-600">Nenhum galho documentado.</p>}
                    </div>
                  </div>
                )}
                {!arvoreDetalheTrancada && infoDeidadeId && (
                  <button type="button" onClick={() => openTreeChronicle(infoDeidadeId)} className="mt-auto inline-flex w-full items-center justify-center gap-2 rounded-2xl border border-yellow-600/40 bg-yellow-600/10 px-5 py-4 text-sm font-bold uppercase tracking-widest text-yellow-500 transition hover:border-yellow-500/70 hover:bg-yellow-600/20">
                    <BookOpen size={17} /> Ler crônica completa
                  </button>
                )}
              </motion.div>
            )}
          </AnimatePresence>

          <AnimatePresence>
            {bancoLunarAberto && (
              <motion.div
                initial={reduceMotion ? false : { x: '100%', opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                exit={reduceMotion ? { opacity: 0 } : { x: '100%', opacity: 0 }}
                transition={panelTransition}
                className="performance-expensive-effects absolute right-0 top-0 z-20 flex h-full w-full flex-col gap-4 overflow-y-auto border-l border-white/10 bg-[#0a090e]/90 p-4 pb-[max(1rem,env(safe-area-inset-bottom))] shadow-[-20px_0_50px_rgba(0,0,0,0.5)] backdrop-blur-2xl custom-scrollbar pointer-events-auto sm:w-[min(400px,100%)] sm:gap-6 sm:p-6"
              >
                <div className="mb-2 flex shrink-0 items-start justify-between">
                  <h3 className="text-3xl font-bold tracking-widest" style={{ fontFamily: 'Cinzel, serif', color: BANCO_LUNAR_INFO.cor }}>{BANCO_LUNAR_INFO.nome}</h3>
                  <button type="button" onClick={() => setBancoLunarAberto(false)} className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-2xl text-gray-500 hover:bg-white/10 hover:text-white" aria-label="Fechar Banco Lunar">&times;</button>
                </div>
                <div className="flex w-full flex-col gap-2 rounded-2xl border border-white/5 bg-black/30 p-4">
                  <span className="text-[10px] font-bold uppercase tracking-widest text-gray-500">Sobre</span>
                  <p className="text-sm leading-relaxed text-gray-400">{BANCO_LUNAR_INFO.descricao}</p>
                </div>
                <div className="flex w-full flex-col gap-2 rounded-2xl border border-white/5 bg-black/30 p-4">
                  <span className="text-[10px] font-bold uppercase tracking-widest text-gray-500">Criado por</span>
                  <h4 className="text-lg font-bold leading-tight text-white">{BANCO_LUNAR_INFO.responsavel.nome}</h4>
                  <span className="text-xs italic" style={{ color: BANCO_LUNAR_INFO.cor }}>“{BANCO_LUNAR_INFO.responsavel.epiteto}”</span>
                  <p className="mt-2 text-sm leading-relaxed text-gray-400">{BANCO_LUNAR_INFO.responsavel.descricao}</p>
                </div>
                <button type="button" onClick={() => navigate('/loja?localizacao=4')} className="mt-auto inline-flex w-full items-center justify-center gap-2 rounded-2xl border px-5 py-4 text-sm font-bold uppercase tracking-widest transition hover:opacity-90" style={{ borderColor: `${BANCO_LUNAR_INFO.cor}66`, backgroundColor: `${BANCO_LUNAR_INFO.cor}1a`, color: BANCO_LUNAR_INFO.cor }}>
                  <ShoppingBag size={17} /> Ir para a Loja
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </>
  );
};
