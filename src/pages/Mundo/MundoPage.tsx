import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MUNDO_CATALOG, LoreEntry } from '../../../data/gerado/mundoCatalog';
import { CosmicTreeViewer, COSMIC_TREES } from './components/CosmicTreeViewer';
import { BANCO_LUNAR_INFO } from './bancoLunarInfo';
import { BookOpen, History, Lock, ShoppingBag } from 'lucide-react';
import { useAuthStore } from '../../store/useAuthStore';
import { ARVORES, arvoreVisivel } from '../../../data/mundo/arvoresCatalog';
import { loreBloqueado } from './loreVisibility';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { getTreeChronicle } from './worldChronicles';
import { TreeChroniclePage } from './components/TreeChroniclePage';
import { GlobalChroniclePage } from './components/GlobalChroniclePage';

export const MundoPage: React.FC = () => {
  const [selectedDeidadeId, setSelectedDeidadeId] = useState<string | null>(null);
  const [infoDeidadeId, setInfoDeidadeId] = useState<string | null>(null);
  const [bancoLunarAberto, setBancoLunarAberto] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const { arvoreId } = useParams<{ arvoreId?: string }>();

  const { usuario, campanhaAtiva } = useAuthStore();
  const isMestre = usuario?.papel_plataforma === 'admin' || usuario?.papel_plataforma === 'criador' || campanhaAtiva?.papel === 'mestre' || campanhaAtiva?.papel === 'assistente';

  const config = campanhaAtiva?.configuracoes || {};
  const loreRevelado = config.lore_revelado || [];
  const loreOculto = config.lore_oculto || [];

  const lockedDeidades = COSMIC_TREES.map(t => t.deidadeId).filter(id => {
    if (isMestre) return false;
    // Uma Árvore fica trancada se a Deidade estiver oculta pelo lore granular
    // OU se o mestre tiver trancado a Árvore inteira (toggle dedicado, mais
    // direto que mexer em deidade/fluxo/galho um por um).
    if (!arvoreVisivel(id, config, isMestre)) return true;
    const entry = MUNDO_CATALOG.find(e => e.id === id && e.tipo === 'deidade');
    if (!entry) return true;
    return loreBloqueado(entry, { isMestre, loreRevelado, loreOculto });
  });

  const visibleTreeIds = ARVORES.map((tree) => tree.id).filter((id) => !lockedDeidades.includes(id));
  const chronicle = arvoreId ? getTreeChronicle(arvoreId) : undefined;
  const isGlobalTimeline = location.pathname === '/mundo/cronologia';

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'auto' });
  }, [location.pathname]);

  const openTreeChronicle = (treeId: string) => {
    if (lockedDeidades.includes(treeId)) return;
    navigate(`/mundo/arvores/${treeId}`);
  };

  const getTreeDetails = (deidadeId: string) => {
    const deidade = MUNDO_CATALOG.find(e => e.id === deidadeId && e.tipo === 'deidade');
    const fluxo = MUNDO_CATALOG.find(e => e.id === deidade?.conteudo.fluxo && e.tipo === 'fluxo');
    const galhos = MUNDO_CATALOG.filter(e => e.tipo === 'galho' && e.conteudo.arvore === deidadeId);
    return { deidade, fluxo, galhos };
  };

  const renderLoreBlock = (
    entry: LoreEntry | undefined,
    label: string,
    paiBloqueado = false,
  ) => {
    if (!entry) return null;
    const isLocked = loreBloqueado(entry, {
      isMestre,
      loreRevelado,
      loreOculto,
      paiBloqueado,
    });

    if (isLocked) {
      return (
        <div key={entry.id} className="bg-black/60 border border-white/5 p-4 rounded-2xl flex flex-col items-center justify-center text-center gap-3">
          <Lock className="text-gray-600" size={24} />
          <h4 className="text-gray-500 font-bold tracking-widest uppercase text-xs">Conhecimento Oculto</h4>
          <p className="text-xs text-gray-700 italic">O Mestre ainda não revelou este fragmento da criação.</p>
        </div>
      );
    }

    return (
      <button
        type="button"
        key={entry.id}
        onClick={() => infoDeidadeId && openTreeChronicle(infoDeidadeId)}
        className="w-full bg-black/30 border border-white/5 p-4 rounded-2xl flex flex-col gap-2 hover:border-yellow-600/30 transition-colors group cursor-pointer text-left"
      >
        <span className="text-[10px] text-gray-500 uppercase tracking-widest font-bold">{label}</span>
        <h4 className="text-lg font-bold text-white leading-tight">{entry.titulo}</h4>

        {entry.conteudo.epiteto && (
          <span className="text-xs text-yellow-500/80 italic">"{entry.conteudo.epiteto}"</span>
        )}

        <p className="text-sm text-gray-400 mt-2 leading-relaxed line-clamp-5">
          {entry.conteudo.descricao}
        </p>

        {entry.conteudo.dominio && (
          <div className="mt-2 bg-black/40 p-2 rounded-lg text-xs">
            <strong className="text-gray-500 uppercase tracking-widest block mb-1">Domínio</strong>
            <span className="text-gray-300">{entry.conteudo.dominio}</span>
          </div>
        )}
        <span className="mt-2 inline-flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-yellow-600 opacity-70 transition group-hover:opacity-100">
          <BookOpen size={13} /> Abrir capítulo completo
        </span>
      </button>
    );
  };

  const details = infoDeidadeId ? getTreeDetails(infoDeidadeId) : null;
  const arvoreDetalheTrancada = infoDeidadeId ? lockedDeidades.includes(infoDeidadeId) : false;

  if (arvoreId && chronicle && !lockedDeidades.includes(arvoreId)) {
    const color = COSMIC_TREES.find((tree) => tree.deidadeId === arvoreId)?.color || '#d6ae43';
    return (
      <TreeChroniclePage
        chronicle={chronicle}
        color={color}
        onBack={() => navigate('/mundo')}
        onOpenGlobalTimeline={() => navigate('/mundo/cronologia')}
      />
    );
  }

  if (isGlobalTimeline) {
    return (
      <GlobalChroniclePage
        visibleTreeIds={visibleTreeIds}
        onBack={() => navigate('/mundo')}
        onOpenTree={openTreeChronicle}
      />
    );
  }

  return (
    <>
      <div className="fixed inset-0 z-0 pointer-events-none opacity-40 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-[#1a1829] via-[#050508] to-black">
        <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/stardust.png')] opacity-30 mix-blend-screen"></div>
      </div>

      <div className="pl-20 md:pl-32 pr-4 md:pr-12 pt-7 md:pt-12 pb-8 md:pb-12 relative z-10 w-full h-screen flex flex-col max-w-[1800px] mx-auto overflow-hidden">
        <div className="flex flex-col items-center mb-5 shrink-0">
          <h2 className="text-6xl text-yellow-500 font-bold tracking-wider text-center drop-shadow-[0_0_20px_rgba(202,138,4,0.5)]" style={{ fontFamily: 'Cinzel, serif' }}>
            Códice do Jardim
          </h2>
          <button
            type="button"
            onClick={() => navigate('/mundo/cronologia')}
            className="mt-4 inline-flex items-center gap-2 rounded-full border border-yellow-600/30 bg-black/25 px-4 py-2 text-xs font-bold uppercase tracking-widest text-yellow-500 transition hover:border-yellow-500/60 hover:bg-yellow-500/5"
          >
            <History size={15} /> Linha do tempo geral
          </button>
        </div>

        <div className="w-full h-[calc(100vh-14rem)] min-h-[420px] shrink-0 relative flex rounded-3xl overflow-hidden border border-white/10 shadow-[0_0_50px_rgba(0,0,0,0.8)]">
          <CosmicTreeViewer
            selectedDeidadeId={selectedDeidadeId}
            onSelectDeidade={(id) => {
              setSelectedDeidadeId(id);
              if (!id) {
                setInfoDeidadeId(null);
                setBancoLunarAberto(false);
              }
            }}
            onOpenInfo={(id) => {
              setInfoDeidadeId(id);
              setBancoLunarAberto(false);
            }}
            onOpenBancoLunar={() => {
              setBancoLunarAberto(true);
              setInfoDeidadeId(null);
            }}
            lockedDeidades={lockedDeidades}
          />

          <AnimatePresence>
            {details && (
              <motion.div
                initial={{ x: '100%', opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                exit={{ x: '100%', opacity: 0 }}
                transition={{ type: 'spring', stiffness: 200, damping: 25 }}
                className="absolute right-0 top-0 h-full w-[400px] bg-[#0a090e]/80 backdrop-blur-2xl border-l border-white/10 p-6 overflow-y-auto custom-scrollbar flex flex-col gap-6 shadow-[-20px_0_50px_rgba(0,0,0,0.5)] z-20 pointer-events-auto"
              >
                <div className="flex justify-between items-start mb-2 shrink-0">
                  <h3 className="text-3xl font-bold text-yellow-500 tracking-widest" style={{ fontFamily: 'Cinzel, serif' }}>
                    {arvoreDetalheTrancada ? 'Árvore Desconhecida' : (details.fluxo?.conteudo.arvore || 'Árvore Desconhecida')}
                  </h3>
                  <button onClick={() => setInfoDeidadeId(null)} className="text-gray-500 hover:text-white">&times;</button>
                </div>

                {renderLoreBlock(details.deidade, 'Deidade', arvoreDetalheTrancada)}
                {renderLoreBlock(details.fluxo, 'Fluxo Cósmico', arvoreDetalheTrancada)}

                {!arvoreDetalheTrancada && (
                  <div className="mt-4 pt-4 border-t border-white/5 shrink-0">
                    <h4 className="text-sm font-bold text-gray-500 uppercase tracking-widest mb-4">Galhos (Realidades)</h4>
                    <div className="flex flex-col gap-4">
                      {details.galhos.length > 0 ? details.galhos.map(g => renderLoreBlock(g, 'Galho')) : (
                        <p className="text-xs text-gray-600 italic">Nenhum galho documentado.</p>
                      )}
                    </div>
                  </div>
                )}

                {!arvoreDetalheTrancada && infoDeidadeId && (
                  <button
                    type="button"
                    onClick={() => openTreeChronicle(infoDeidadeId)}
                    className="mt-auto inline-flex w-full items-center justify-center gap-2 rounded-2xl border border-yellow-600/40 bg-yellow-600/10 px-5 py-4 text-sm font-bold uppercase tracking-widest text-yellow-500 transition hover:border-yellow-500/70 hover:bg-yellow-600/20"
                  >
                    <BookOpen size={17} /> Ler crônica completa
                  </button>
                )}
              </motion.div>
            )}
          </AnimatePresence>

          <AnimatePresence>
            {bancoLunarAberto && (
              <motion.div
                initial={{ x: '100%', opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                exit={{ x: '100%', opacity: 0 }}
                transition={{ type: 'spring', stiffness: 200, damping: 25 }}
                className="absolute right-0 top-0 h-full w-[400px] bg-[#0a090e]/80 backdrop-blur-2xl border-l border-white/10 p-6 overflow-y-auto custom-scrollbar flex flex-col gap-6 shadow-[-20px_0_50px_rgba(0,0,0,0.5)] z-20 pointer-events-auto"
              >
                <div className="flex justify-between items-start mb-2 shrink-0">
                  <h3 className="text-3xl font-bold tracking-widest" style={{ fontFamily: 'Cinzel, serif', color: BANCO_LUNAR_INFO.cor }}>
                    {BANCO_LUNAR_INFO.nome}
                  </h3>
                  <button onClick={() => setBancoLunarAberto(false)} className="text-gray-500 hover:text-white">&times;</button>
                </div>

                <div className="w-full bg-black/30 border border-white/5 p-4 rounded-2xl flex flex-col gap-2">
                  <span className="text-[10px] text-gray-500 uppercase tracking-widest font-bold">Sobre</span>
                  <p className="text-sm text-gray-400 leading-relaxed">{BANCO_LUNAR_INFO.descricao}</p>
                </div>

                <div className="w-full bg-black/30 border border-white/5 p-4 rounded-2xl flex flex-col gap-2">
                  <span className="text-[10px] text-gray-500 uppercase tracking-widest font-bold">Criado por</span>
                  <h4 className="text-lg font-bold text-white leading-tight">{BANCO_LUNAR_INFO.responsavel.nome}</h4>
                  <span className="text-xs italic" style={{ color: BANCO_LUNAR_INFO.cor }}>
                    "{BANCO_LUNAR_INFO.responsavel.epiteto}"
                  </span>
                  <p className="text-sm text-gray-400 mt-2 leading-relaxed">
                    {BANCO_LUNAR_INFO.responsavel.descricao}
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => navigate('/loja?localizacao=4')}
                  className="mt-auto inline-flex w-full items-center justify-center gap-2 rounded-2xl border px-5 py-4 text-sm font-bold uppercase tracking-widest transition hover:opacity-90"
                  style={{ borderColor: `${BANCO_LUNAR_INFO.cor}66`, backgroundColor: `${BANCO_LUNAR_INFO.cor}1a`, color: BANCO_LUNAR_INFO.cor }}
                >
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
