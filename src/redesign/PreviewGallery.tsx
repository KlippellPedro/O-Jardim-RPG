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
    <div className="preview-gallery relative overflow-hidden bg-black">
      {/* Navigation Overlay (fixed on top of the components) */}
      <div className="preview-toolbar fixed left-1/2 top-4 z-50 flex -translate-x-1/2 flex-col items-center gap-4">

        {/* Type Switcher */}
        <div className="flex bg-zinc-900/80 p-1 rounded-full border border-zinc-700/50 backdrop-blur-md">
          <button
            onClick={() => switchType('raca')}
            className={`flex min-h-11 items-center gap-2 px-6 py-2 rounded-full font-medium transition-all ${type === 'raca' ? 'bg-white text-black' : 'text-zinc-400 hover:text-white'}`}
          >
            <User size={18} />
            Raças ({racaIds.length})
          </button>
          <button
            onClick={() => switchType('classe')}
            className={`flex min-h-11 items-center gap-2 px-6 py-2 rounded-full font-medium transition-all ${type === 'classe' ? 'bg-white text-black' : 'text-zinc-400 hover:text-white'}`}
          >
            <Layers size={18} />
            Classes ({classeIds.length})
          </button>
        </div>

        {/* Item Navigation */}
        <div className="preview-item-navigation flex items-center gap-4 bg-zinc-900/80 px-4 py-2 rounded-full border border-zinc-700/50 backdrop-blur-md">
          <button onClick={handlePrev} aria-label="Item anterior" className="flex min-h-11 min-w-11 items-center justify-center hover:bg-zinc-800 rounded-full transition-colors text-white">
            <ChevronLeft size={24} />
          </button>

          <span className="preview-item-title min-w-[200px] text-center font-bold text-xl text-white tracking-wider">
            {raca?.titulo || classe?.titulo || currentId}
          </span>

          <button onClick={handleNext} aria-label="Próximo item" className="flex min-h-11 min-w-11 items-center justify-center hover:bg-zinc-800 rounded-full transition-colors text-white">
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
          className="preview-stage absolute inset-0 overflow-y-auto overscroll-contain custom-scrollbar"
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
