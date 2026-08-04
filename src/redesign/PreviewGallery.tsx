import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, ChevronRight, Layers, User } from 'lucide-react';
import { RACAS_CATALOGO, CLASSES_CATALOGO } from '../services/catalogoService';
import { RACA_PAGES } from './raca/registry';
import { CLASSE_PAGES } from './classe/registry';

type ItemType = 'raca' | 'classe';

export const PreviewGallery = () => {
  const [type, setType] = useState<ItemType>('raca');

  const racaIds = Object.keys(RACA_PAGES);
  const classeIds = Object.keys(CLASSE_PAGES);

  const currentIds = type === 'raca' ? racaIds : classeIds;

  const [currentIndex, setCurrentIndex] = useState(0);

  const handleNext = () => {
    setCurrentIndex((prev) => (prev + 1) % currentIds.length);
  };

  const handlePrev = () => {
    setCurrentIndex((prev) => (prev - 1 + currentIds.length) % currentIds.length);
  };

  const switchType = (newType: ItemType) => {
    setType(newType);
    setCurrentIndex(0);
  };

  const currentId = currentIds[currentIndex];
  const raca = type === 'raca' ? RACAS_CATALOGO.find(item => item.id === currentId) : undefined;
  const classe = type === 'classe' ? CLASSES_CATALOGO.find(item => item.id === currentId) : undefined;
  const RacaPage = type === 'raca' ? RACA_PAGES[currentId] : undefined;
  const ClassePage = type === 'classe' ? CLASSE_PAGES[currentId] : undefined;

  return (
    <div className="relative min-h-screen bg-black overflow-hidden">
      {/* Navigation Overlay (fixed on top of the components) */}
      <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 flex flex-col items-center gap-4">

        {/* Type Switcher */}
        <div className="flex bg-zinc-900/80 p-1 rounded-full border border-zinc-700/50 backdrop-blur-md">
          <button
            onClick={() => switchType('raca')}
            className={`flex items-center gap-2 px-6 py-2 rounded-full font-medium transition-all ${type === 'raca' ? 'bg-white text-black' : 'text-zinc-400 hover:text-white'}`}
          >
            <User size={18} />
            Raças ({racaIds.length})
          </button>
          <button
            onClick={() => switchType('classe')}
            className={`flex items-center gap-2 px-6 py-2 rounded-full font-medium transition-all ${type === 'classe' ? 'bg-white text-black' : 'text-zinc-400 hover:text-white'}`}
          >
            <Layers size={18} />
            Classes ({classeIds.length})
          </button>
        </div>

        {/* Item Navigation */}
        <div className="flex items-center gap-4 bg-zinc-900/80 px-4 py-2 rounded-full border border-zinc-700/50 backdrop-blur-md">
          <button onClick={handlePrev} className="p-2 hover:bg-zinc-800 rounded-full transition-colors text-white">
            <ChevronLeft size={24} />
          </button>

          <span className="min-w-[200px] text-center font-bold text-xl text-white tracking-wider">
            {raca?.titulo || classe?.titulo || currentId}
          </span>

          <button onClick={handleNext} className="p-2 hover:bg-zinc-800 rounded-full transition-colors text-white">
            <ChevronRight size={24} />
          </button>
        </div>
      </div>

      {/* Component Renderer */}
      <AnimatePresence mode="wait">
        <motion.div
          key={type + currentId}
          initial={{ opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 1.02 }}
          transition={{ duration: 0.3 }}
          className="absolute inset-0 overflow-y-auto"
        >
          {RacaPage && raca
            ? <RacaPage raca={raca} />
            : ClassePage && classe
              ? <ClassePage classe={classe} />
              : <div className="text-white p-20">Componente não encontrado.</div>}
        </motion.div>
      </AnimatePresence>
    </div>
  );
};

export default PreviewGallery;
