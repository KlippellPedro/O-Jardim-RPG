import React, { Suspense, lazy, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { BookMarked, BookOpen, Compass, History, Lock, ShoppingBag } from 'lucide-react';
import { Navigate, useLocation, useNavigate, useParams } from 'react-router-dom';
import { MUNDO_CATALOG, type LoreEntry } from '../../../data/gerado/mundoCatalog';
import { ARVORES, VAZIO_ID, arvoreVisivel, corDeInterface } from '../../../data/mundo/arvoresCatalog';
import { useAuthStore } from '../../store/useAuthStore';
import { usePerformanceProfile } from '../../hooks/usePerformance';
import { conteudoEditorialApi } from '../../services/conteudoEditorialApi';
import { GuidedTour } from '../../components/ui/GuidedTour';
import { MUNDO_TOUR_STEPS, mundoTourJaVisto, serializarMundoTourVisto } from './mundoTourConfig';
import { BANCO_LUNAR_INFO } from './bancoLunarInfo';
import { VAZIO_INFO } from './vazioInfo';
import { loreBloqueado } from './loreVisibility';
import { paginaGeralDoMundoVisivel } from './worldPageVisibility';
import { WORLD_CHRONICLES, type WorldChronicleCatalog } from './worldChronicles';

const CosmicTreeViewer = lazy(() => import('./components/CosmicTreeViewer').then((module) => ({ default: module.CosmicTreeViewer })));
const TreeCodexPage = lazy(() => import('./components/TreeCodexPage').then((module) => ({ default: module.TreeCodexPage })));
const GlobalChroniclePage = lazy(() => import('./components/GlobalChroniclePage').then((module) => ({ default: module.GlobalChroniclePage })));
const SimpleTreeList = lazy(() => import('./components/SimpleTreeList').then((module) => ({ default: module.SimpleTreeList })));
const UniversalCodexPage = lazy(() => import('./components/UniversalCodexPage').then((module) => ({ default: module.UniversalCodexPage })));

const EMPTY_CONFIG: Record<string, unknown> = {};

/** Tudo que tem crônica e trava de visibilidade própria: as 9 Árvores mais O
 * Vazio. Diferente de COSMIC_TREES (9 corpos orbitais): o Vazio não orbita na
 * cena 3D e não é uma Árvore, mas tem crônica e locais próprios - excluí-lo
 * daqui escondia da Linha do Tempo do Jardim qualquer marco que cite Erebus,
 * mesmo pro Mestre. "universal" fica de fora por ser só uma sentinela. */
const CANONICAL_TREE_IDS = ARVORES.filter((arvore) => arvore.id !== 'universal').map((arvore) => arvore.id);

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
  const [vazioAberto, setVazioAberto] = useState(false);
  const [visaoSimples, setVisaoSimples] = useState(false);
  const [tourAberto, setTourAberto] = useState(false);
  const tourTentadoRef = useRef(false);
  const navigate = useNavigate();
  const location = useLocation();
  const { arvoreId, entryType, entryId } = useParams<{ arvoreId?: string; entryType?: string; entryId?: string }>();
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
  const entidadesRevelado = config.entidades_revelado as string[] | undefined ?? [];
  const entidadesOculto = config.entidades_oculto as string[] | undefined ?? [];
  const cronicaSecoesOcultas = config.cronica_secoes_ocultas as string[] | undefined ?? [];
  const cronicaEventosOcultos = config.cronica_eventos_ocultos as string[] | undefined ?? [];
  const cronologiaGeralVisivel = paginaGeralDoMundoVisivel(config.cronologia_geral_oculta, isMestre);
  const registrosUniversaisVisiveis = paginaGeralDoMundoVisivel(config.registros_universais_ocultos, isMestre);

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
        const resolvedEntries = response.entradas.filter((entry) => entry.tipo !== 'cronologia');
        const resolvedByKey = new Map(resolvedEntries.map((entry) => [entry.chave_origem || `${entry.tipo}:${entry.id}`, entry]));
        const officialKeys = new Set(MUNDO_CATALOG.map((entry) => `${entry.tipo}:${entry.id}`));
        setMundoCatalog([
          ...MUNDO_CATALOG.map((official) => ({
            ...official,
            ...resolvedByKey.get(`${official.tipo}:${official.id}`),
            registro_universal: official.registro_universal,
            arvore_origem: official.arvore_origem,
          })),
          ...resolvedEntries.filter((entry) => !officialKeys.has(entry.chave_origem || `${entry.tipo}:${entry.id}`)),
        ] as unknown as LoreEntry[]);
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

  // Trava a Árvore em si (some do visualizador 3D, da lista e da navegação),
  // que é um controle diferente de esconder o resumo da Deidade dentro da
  // página da Árvore - aquele é por-entrada, via `loreBloqueado`, dentro de
  // TreeCodexPage. Antes esta lista também travava a Árvore inteira quando só
  // o resumo da Deidade estava oculto, impedindo o Mestre de deixar a Árvore
  // visível/selecionável com o resumo escondido.
  const lockedDeidades = useMemo(() => CANONICAL_TREE_IDS
    .filter((id) => {
      if (isMestre) return false;
      return !arvoreVisivel(id, config, isMestre);
    }), [config, isMestre]);
  const lockedSet = useMemo(() => new Set(lockedDeidades), [lockedDeidades]);
  const visibleTreeIds = useMemo(
    () => CANONICAL_TREE_IDS.filter((id) => !lockedSet.has(id)),
    [lockedSet],
  );
  // `/mundo/vazio` é a rota própria do Vazio: ele não é uma Árvore, então não
  // faz sentido só existir debaixo de `/mundo/arvores/`. A página renderizada
  // é a mesma, com os rótulos trocados (ver `ehVazio` em TreeCodexPage).
  const isVazioPage = location.pathname.startsWith('/mundo/vazio');
  const codexId = isVazioPage ? VAZIO_ID : arvoreId;
  const activeTree = codexId ? ARVORES.find((tree) => tree.id === codexId && tree.id !== 'universal') : undefined;
  const isGlobalTimeline = location.pathname === '/mundo/cronologia';
  const isUniversalCodex = location.pathname === '/mundo/universal';
  const emPaginaArvore = Boolean(codexId && activeTree && !lockedSet.has(codexId));
  const naPaginaRaiz = !emPaginaArvore && !isGlobalTimeline && !isUniversalCodex;
  const chaveTourMundo = `jardim:mundo-tour:v1:${usuario?.id || 'local'}`;

  useEffect(() => {
    if (entryType && entryId && window.matchMedia('(max-width: 1023px)').matches) return;
    window.scrollTo({ top: 0, behavior: 'auto' });
  }, [entryId, entryType, location.pathname]);

  const abrirTourMundo = useCallback(() => {
    setVisaoSimples(false);
    setTourAberto(true);
  }, []);

  const encerrarTourMundo = useCallback(() => {
    try {
      localStorage.setItem(chaveTourMundo, serializarMundoTourVisto());
    } catch {
      // O botão manual continua disponível mesmo se o navegador bloquear o armazenamento.
    }
    setTourAberto(false);
  }, [chaveTourMundo]);

  useEffect(() => {
    if (!naPaginaRaiz || visaoSimples || tourAberto || tourTentadoRef.current) return;
    try {
      if (mundoTourJaVisto(localStorage.getItem(chaveTourMundo))) return;
    } catch {
      // Sem armazenamento, o guia ainda abre uma vez nesta montagem.
    }
    const timer = window.setTimeout(() => {
      tourTentadoRef.current = true;
      setTourAberto(true);
    }, 750);
    return () => window.clearTimeout(timer);
  }, [chaveTourMundo, naPaginaRaiz, tourAberto, visaoSimples]);

  const openTreeChronicle = useCallback((treeId: string) => {
    if (lockedSet.has(treeId)) return;
    navigate(treeId === VAZIO_ID ? '/mundo/vazio' : `/mundo/arvores/${treeId}`);
  }, [lockedSet, navigate]);

  const handleSelectDeidade = useCallback((id: string | null) => {
    setSelectedDeidadeId(id);
    if (!id) {
      setInfoDeidadeId(null);
      setBancoLunarAberto(false);
      setVazioAberto(false);
    }
  }, []);

  const handleOpenInfo = useCallback((id: string) => {
    setInfoDeidadeId(id);
    setBancoLunarAberto(false);
    setVazioAberto(false);
  }, []);

  const handleOpenBancoLunar = useCallback(() => {
    setBancoLunarAberto(true);
    setVazioAberto(false);
    setInfoDeidadeId(null);
  }, []);

  const handleOpenVazio = useCallback(() => {
    setVazioAberto(true);
    setBancoLunarAberto(false);
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

  if ((isGlobalTimeline && !cronologiaGeralVisivel) || (isUniversalCodex && !registrosUniversaisVisiveis)) {
    return <Navigate to="/mundo" replace />;
  }

  if (codexId && activeTree && !lockedSet.has(codexId)) {
    // O preto do Vazio some quando vira cor de letra, então a página usa a
    // cor de leitura em vez da canônica.
    const treeColor = `rgb(${corDeInterface(activeTree.id)})`;
    return (
      <Suspense fallback={<WorldLoading label="Carregando códice da Árvore..." />}>
        <TreeCodexPage
          treeId={codexId}
          treeName={activeTree.nome}
          color={treeColor}
          catalog={mundoCatalog}
          chronicles={worldChronicles}
          entryType={entryType}
          entryId={entryId}
          isMestre={isMestre}
          loreRevelado={loreRevelado}
          loreOculto={loreOculto}
          cronicaSecoesOcultas={cronicaSecoesOcultas}
          cronicaEventosOcultos={cronicaEventosOcultos}
          onBack={() => navigate('/mundo')}
          onOpenOverview={() => navigate(isVazioPage ? '/mundo/vazio' : `/mundo/arvores/${codexId}`)}
          onOpenGlobalTimeline={cronologiaGeralVisivel ? () => navigate('/mundo/cronologia') : undefined}
          onOpenEntry={(entry) => navigate(
            isVazioPage
              ? `/mundo/vazio/${entry.tipo}/${entry.id}`
              : `/mundo/arvores/${codexId}/${entry.tipo}/${entry.id}`,
          )}
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

  if (isUniversalCodex) {
    return (
      <Suspense fallback={<WorldLoading label="Carregando registros universais..." />}>
        <UniversalCodexPage
          catalog={mundoCatalog}
          isMestre={isMestre}
          loreRevelado={loreRevelado}
          loreOculto={loreOculto}
          entidadesRevelado={entidadesRevelado}
          entidadesOculto={entidadesOculto}
          onBack={() => navigate('/mundo')}
          onOpenGlobalTimeline={cronologiaGeralVisivel ? () => navigate('/mundo/cronologia') : undefined}
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

      <div role="main" className="mundo-shell app-viewport mx-auto flex max-w-[112.5rem] flex-col overflow-hidden">
        <div className="mb-3 flex shrink-0 flex-col items-center sm:mb-5">
          <h1 className="text-center text-[clamp(2rem,7vw,3.75rem)] font-bold leading-tight tracking-wider text-yellow-500 drop-shadow-[0_0_20px_rgba(202,138,4,0.5)]" style={{ fontFamily: 'Cinzel, serif' }}>
            Geografia do Jardim
          </h1>
          <div data-tour="mundo-nav-geral" className="mt-2 flex flex-wrap items-center justify-center gap-2 sm:mt-4">
            {cronologiaGeralVisivel && (
              <button
                type="button"
                onClick={() => navigate('/mundo/cronologia')}
                className="inline-flex items-center gap-2 rounded-full border border-yellow-600/30 bg-black/25 px-4 py-2 text-xs font-bold uppercase tracking-widest text-yellow-500 transition hover:border-yellow-500/60 hover:bg-yellow-500/5"
              >
                <History size={15} /> Linha do tempo geral
              </button>
            )}
            {registrosUniversaisVisiveis && (
              <button
                type="button"
                onClick={() => navigate('/mundo/universal')}
                className="inline-flex items-center gap-2 rounded-full border border-cyan-500/30 bg-black/25 px-4 py-2 text-xs font-bold uppercase tracking-widest text-cyan-300 transition hover:border-cyan-400/60 hover:bg-cyan-400/5"
              >
                <BookMarked size={15} /> Registros Universais
              </button>
            )}
            <button
              type="button"
              onClick={abrirTourMundo}
              className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-black/25 px-4 py-2 text-xs font-bold uppercase tracking-widest text-gray-300 transition hover:border-white/30 hover:text-white"
            >
              <Compass size={15} /> Guia do Mundo
            </button>
          </div>
        </div>

        <div data-tour="mundo-projecao" className="performance-expensive-effects relative flex min-h-0 w-full flex-1 overflow-hidden rounded-2xl border border-white/10 shadow-[0_0_50px_rgba(0,0,0,0.8)] sm:rounded-3xl">
          {visaoSimples ? (
            <Suspense fallback={<WorldLoading label="Carregando lista das Árvores..." />}>
              <SimpleTreeList
                lockedDeidades={lockedSet}
                onSelectTree={openTreeChronicle}
                onBack={() => setVisaoSimples(false)}
              />
            </Suspense>
          ) : (
            <Suspense fallback={<WorldLoading label="Preparando projeção astral..." />}>
              <CosmicTreeViewer
                selectedDeidadeId={selectedDeidadeId}
                onSelectDeidade={handleSelectDeidade}
                onOpenInfo={handleOpenInfo}
                onOpenBancoLunar={handleOpenBancoLunar}
                onOpenVazio={handleOpenVazio}
                onOpenListView={() => setVisaoSimples(true)}
                lockedDeidades={lockedDeidades}
              />
            </Suspense>
          )}

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

          <AnimatePresence>
            {vazioAberto && (
              <motion.div
                initial={reduceMotion ? false : { x: '100%', opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                exit={reduceMotion ? { opacity: 0 } : { x: '100%', opacity: 0 }}
                transition={panelTransition}
                className="performance-expensive-effects absolute right-0 top-0 z-20 flex h-full w-full flex-col gap-4 overflow-y-auto border-l border-white/10 bg-[#0a090e]/90 p-4 pb-[max(1rem,env(safe-area-inset-bottom))] shadow-[-20px_0_50px_rgba(0,0,0,0.5)] backdrop-blur-2xl custom-scrollbar pointer-events-auto sm:w-[min(400px,100%)] sm:gap-6 sm:p-6"
              >
                <div className="mb-2 flex shrink-0 items-start justify-between">
                  <h3 className="text-3xl font-bold tracking-widest" style={{ fontFamily: 'Cinzel, serif', color: VAZIO_INFO.cor }}>{VAZIO_INFO.nome}</h3>
                  <button type="button" onClick={() => setVazioAberto(false)} className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-2xl text-gray-500 hover:bg-white/10 hover:text-white" aria-label="Fechar O Vazio">&times;</button>
                </div>
                {/* Cada card abre o registro correspondente, igual acontece no
                    painel das Árvores. Antes eram divs mortas e o único jeito
                    de sair daqui era o botão lá do fim. */}
                <button
                  type="button"
                  onClick={() => navigate('/mundo/vazio')}
                  className="group flex w-full cursor-pointer flex-col gap-2 rounded-2xl border border-white/5 bg-black/30 p-4 text-left transition-colors hover:border-white/25"
                >
                  <span className="text-[10px] font-bold uppercase tracking-widest text-gray-500">Sobre</span>
                  <p className="text-sm leading-relaxed text-gray-400">{VAZIO_INFO.descricao}</p>
                  <span className="mt-2 inline-flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest opacity-70 transition group-hover:opacity-100" style={{ color: VAZIO_INFO.cor }}>
                    <BookOpen size={13} /> Abrir página do Vazio
                  </span>
                </button>
                <button
                  type="button"
                  onClick={() => navigate(`/mundo/vazio/${VAZIO_INFO.deidade.tipo}/${VAZIO_INFO.deidade.id}`)}
                  className="group flex w-full cursor-pointer flex-col gap-2 rounded-2xl border border-white/5 bg-black/30 p-4 text-left transition-colors hover:border-white/25"
                >
                  <span className="text-[10px] font-bold uppercase tracking-widest text-gray-500">Deidade</span>
                  <h4 className="text-lg font-bold leading-tight text-white">{VAZIO_INFO.deidade.nome}</h4>
                  <span className="text-xs italic" style={{ color: VAZIO_INFO.cor }}>“{VAZIO_INFO.deidade.epiteto}”</span>
                  <p className="mt-2 text-sm leading-relaxed text-gray-400">{VAZIO_INFO.deidade.descricao}</p>
                  <span className="mt-2 inline-flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest opacity-70 transition group-hover:opacity-100" style={{ color: VAZIO_INFO.cor }}>
                    <BookOpen size={13} /> Abrir registro
                  </span>
                </button>
                <button
                  type="button"
                  onClick={() => navigate(`/mundo/vazio/${VAZIO_INFO.fluxo.tipo}/${VAZIO_INFO.fluxo.id}`)}
                  className="group flex w-full cursor-pointer flex-col gap-2 rounded-2xl border border-white/5 bg-black/30 p-4 text-left transition-colors hover:border-white/25"
                >
                  <span className="text-[10px] font-bold uppercase tracking-widest text-gray-500">Fluxo Cósmico</span>
                  <h4 className="text-lg font-bold leading-tight text-white">{VAZIO_INFO.fluxo.nome}</h4>
                  <p className="mt-2 text-sm leading-relaxed text-gray-400">{VAZIO_INFO.fluxo.descricao}</p>
                  <span className="mt-2 inline-flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest opacity-70 transition group-hover:opacity-100" style={{ color: VAZIO_INFO.cor }}>
                    <BookOpen size={13} /> Abrir registro
                  </span>
                </button>
                <div className="flex flex-col gap-4">
                  {VAZIO_INFO.locais.map((local) => (
                    <button
                      key={local.id}
                      type="button"
                      onClick={() => navigate(`/mundo/vazio/${local.tipo}/${local.id}`)}
                      className="group flex w-full cursor-pointer flex-col gap-2 rounded-2xl border border-white/5 bg-black/30 p-4 text-left transition-colors hover:border-white/25"
                    >
                      <span className="text-[10px] font-bold uppercase tracking-widest text-gray-500">Local</span>
                      <h4 className="text-lg font-bold leading-tight text-white">{local.nome}</h4>
                      <p className="mt-2 text-sm leading-relaxed text-gray-400">{local.resumo}</p>
                      <span className="mt-2 inline-flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest opacity-70 transition group-hover:opacity-100" style={{ color: VAZIO_INFO.cor }}>
                        <BookOpen size={13} /> Abrir registro
                      </span>
                    </button>
                  ))}
                </div>
                {/* Sem isto o painel era um beco sem saída: mostrava o resumo
                    do Vazio e não levava a lugar nenhum. */}
                {!lockedSet.has(VAZIO_ID) && (
                  <button
                    type="button"
                    onClick={() => navigate('/mundo/vazio')}
                    className="mt-auto inline-flex w-full items-center justify-center gap-2 rounded-2xl border px-4 py-3 text-xs font-bold uppercase tracking-widest transition hover:bg-white/5"
                    style={{ borderColor: `${VAZIO_INFO.cor}66`, color: VAZIO_INFO.cor }}
                  >
                    <BookOpen size={15} /> Abrir página do Vazio
                  </button>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {tourAberto ? (
        <GuidedTour
          passos={MUNDO_TOUR_STEPS}
          accent="#eab308"
          nomeGuia="Guia do Mundo"
          rootSelector=".mundo-shell"
          onClose={encerrarTourMundo}
          onFinish={encerrarTourMundo}
        />
      ) : null}
    </>
  );
};
