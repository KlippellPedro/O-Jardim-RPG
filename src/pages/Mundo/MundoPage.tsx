import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MUNDO_CATALOG, LoreEntry } from '../../data/mundoCatalog';
import { CosmicTreeViewer, COSMIC_TREES } from './components/CosmicTreeViewer';
import { LoreItemModal } from './components/LoreItemModal';
import { Lock } from 'lucide-react';
import { useAuthStore } from '../../store/useAuthStore';
import { arvoreVisivel } from '../../data/arvoresCatalog';
import { loreBloqueado } from './loreVisibility';

export const MundoPage: React.FC = () => {
  const [selectedDeidadeId, setSelectedDeidadeId] = useState<string | null>(null);
  const [infoDeidadeId, setInfoDeidadeId] = useState<string | null>(null);
  const [selectedLore, setSelectedLore] = useState<LoreEntry | null>(null);

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
      <div
        key={entry.id}
        onClick={() => setSelectedLore(entry)}
        className="bg-black/30 border border-white/5 p-4 rounded-2xl flex flex-col gap-2 hover:border-yellow-600/30 transition-colors group cursor-pointer"
      >
        <span className="text-[10px] text-gray-500 uppercase tracking-widest font-bold">{label}</span>
        <h4 className="text-lg font-bold text-white leading-tight">{entry.titulo}</h4>

        {entry.conteudo.epiteto && (
          <span className="text-xs text-yellow-500/80 italic">"{entry.conteudo.epiteto}"</span>
        )}

        <p className="text-sm text-gray-400 mt-2 leading-relaxed">
          {entry.conteudo.descricao}
        </p>

        {entry.conteudo.dominio && (
          <div className="mt-2 bg-black/40 p-2 rounded-lg text-xs">
            <strong className="text-gray-500 uppercase tracking-widest block mb-1">Domínio</strong>
            <span className="text-gray-300">{entry.conteudo.dominio}</span>
          </div>
        )}
      </div>
    );
  };

  const details = infoDeidadeId ? getTreeDetails(infoDeidadeId) : null;
  const arvoreDetalheTrancada = infoDeidadeId ? lockedDeidades.includes(infoDeidadeId) : false;

  return (
    <>
      <div className="fixed inset-0 z-0 pointer-events-none opacity-40 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-[#1a1829] via-[#050508] to-black">
        <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/stardust.png')] opacity-30 mix-blend-screen"></div>
      </div>

      <div className="pl-32 pr-12 pt-12 pb-12 relative z-10 w-full h-screen flex flex-col overflow-hidden max-w-[1800px] mx-auto">
        <div className="flex flex-col items-center mb-6 shrink-0">
          <h2 className="text-6xl text-yellow-500 font-bold tracking-wider text-center drop-shadow-[0_0_20px_rgba(202,138,4,0.5)]" style={{ fontFamily: 'Cinzel, serif' }}>
            Códice do Jardim
          </h2>
        </div>

        <div className="w-full flex-1 relative flex rounded-3xl overflow-hidden border border-white/10 shadow-[0_0_50px_rgba(0,0,0,0.8)]">
          <CosmicTreeViewer
            selectedDeidadeId={selectedDeidadeId}
            onSelectDeidade={(id) => {
              setSelectedDeidadeId(id);
              if (!id) setInfoDeidadeId(null);
            }}
            onOpenInfo={(id) => {
              setSelectedLore(null);
              setInfoDeidadeId(id);
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
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* LORE MODAL */}
        {selectedLore && (
          <LoreItemModal
            entry={selectedLore}
            onClose={() => setSelectedLore(null)}
            isLocked={loreBloqueado(selectedLore, {
              isMestre,
              loreRevelado,
              loreOculto,
              paiBloqueado: arvoreDetalheTrancada,
            })}
          />
        )}
      </div>
    </>
  );
};
