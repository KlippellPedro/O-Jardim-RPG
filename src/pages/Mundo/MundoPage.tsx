import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MUNDO_CATALOG, LoreType, LoreEntry } from '../../data/mundoCatalog';
import { LoreCard } from './components/LoreCard';
import { CosmicTreeViewer } from './components/CosmicTreeViewer';
import { Map, ScrollText } from 'lucide-react';

type Tab = 'dimensoes' | 'panteao' | 'arvores' | 'historia';

export const MundoPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<Tab>('dimensoes');

  // Filtra as entidades por grupo
  const getEntriesByTypes = (types: LoreType[]): LoreEntry[] => {
    return MUNDO_CATALOG.filter(entry => types.includes(entry.tipo));
  };

  const tabs = [
    { id: 'dimensoes', label: 'Dimensões', types: ['galho', 'dimensao', 'reino'] as LoreType[] },
    { id: 'panteao', label: 'Panteão', types: ['deidade', 'fluxo', 'personagem'] as LoreType[] },
    { id: 'arvores', label: 'As Árvores', types: [] as LoreType[] }, // Renderiza o visualizador 3D
    { id: 'historia', label: 'História', types: ['evento'] as LoreType[] },
  ];

  const renderContent = () => {
    const currentTab = tabs.find(t => t.id === activeTab);
    if (!currentTab) return null;

    if (activeTab === 'arvores') {
      return (
        <motion.div
          key="arvores-view"
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          transition={{ duration: 0.5 }}
          className="w-full h-[600px] mt-8"
        >
          <CosmicTreeViewer />
        </motion.div>
      );
    }

    if (activeTab === 'historia') {
      return (
        <motion.div
          key="historia-view"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          transition={{ duration: 0.5 }}
          className="mt-8 flex flex-col items-center justify-center min-h-[400px] text-center max-w-3xl mx-auto"
        >
          <ScrollText size={48} className="text-primary/50 mb-6" />
          <p className="text-xl md:text-2xl text-gray-300 italic leading-relaxed" style={{ fontFamily: 'Cinzel, serif' }}>
            "No princípio, não havia luz, nem sombra. Apenas o vazio, esperando para ser preenchido pela canção das entidades... Os fios do destino foram tecidos por Aethel, mas é no silêncio de Erebus que todas as histórias encontram o seu descanso final."
          </p>
          <p className="mt-8 text-sm text-gray-500 uppercase tracking-widest">
            Os registros ancestrais estão sendo decifrados.
          </p>
        </motion.div>
      );
    }

    const entries = getEntriesByTypes(currentTab.types);

    return (
      <motion.div
        key={`${activeTab}-grid`}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full"
      >
        {activeTab === 'dimensoes' && (
          <div className="mb-12">
            <div className="w-full h-48 md:h-64 rounded-3xl bg-black/40 border border-primary/20 backdrop-blur-3xl flex flex-col items-center justify-center shadow-[0_0_50px_rgba(var(--color-primary),0.1)] hover:shadow-[0_0_80px_rgba(var(--color-primary),0.2)] transition-shadow">
              <Map size={48} className="text-primary mb-4" />
              <p className="text-lg text-gray-300 italic font-serif">
                "Os mapas das dimensões estão sendo desenhados pelos Cartógrafos de Aethel..."
              </p>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {entries.map(entry => (
            <LoreCard key={entry.id} entry={entry} />
          ))}
        </div>
      </motion.div>
    );
  };

  return (
    <div className="pl-32 pr-12 pt-12 pb-24 relative z-10 w-full min-h-screen flex flex-col max-w-[1600px] mx-auto">
      {/* Header com Abas */}
      <div className="flex flex-col items-center mb-16">
        <h2 className="text-6xl text-primary font-bold tracking-wider mb-8 text-center drop-shadow-[0_0_20px_rgba(var(--color-primary),0.5)]" style={{ fontFamily: 'Cinzel, serif' }}>
          Códice
        </h2>
        
        <div className="flex bg-black/40 backdrop-blur-md p-2 rounded-full border border-white/10 gap-2">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as Tab)}
              className={`px-6 py-2 rounded-full font-medium transition-all ${
                activeTab === tab.id 
                  ? 'bg-primary text-black shadow-[0_0_15px_rgba(var(--color-primary),0.5)]' 
                  : 'text-gray-400 hover:text-white hover:bg-white/5'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Conteúdo com Transições Suaves */}
      <div className="w-full flex-1">
        <AnimatePresence mode="wait">
          {renderContent()}
        </AnimatePresence>
      </div>
    </div>
  );
};
