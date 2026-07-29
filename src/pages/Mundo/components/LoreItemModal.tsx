import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { LoreEntry } from '../../../data/mundoCatalog';
import { ShieldAlert, Info, Map as MapIcon, Calendar, User } from 'lucide-react';

interface LoreItemModalProps {
  entry: LoreEntry;
  onClose: () => void;
  isLocked?: boolean;
}

export const LoreItemModal: React.FC<LoreItemModalProps> = ({ entry, onClose, isLocked }) => {
  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        {/* Overlay Blur */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="absolute inset-0 bg-[#050508]/80 backdrop-blur-sm cursor-pointer"
        />

        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          transition={{ type: 'spring', damping: 25, stiffness: 300 }}
          className="relative w-full max-w-2xl bg-[#0a090e]/80 backdrop-blur-2xl border border-white/10 rounded-3xl overflow-hidden shadow-[0_20px_50px_rgba(0,0,0,0.8)] z-10 max-h-[85vh] flex flex-col"
        >
          {/* Header */}
          <div className="relative p-8 border-b border-white/5 bg-gradient-to-br from-white/5 to-transparent flex-shrink-0">
            <button 
              onClick={onClose}
              className="absolute top-6 right-6 text-gray-500 hover:text-white transition-colors"
            >
              &times;
            </button>
            
            <div className="flex items-center gap-3 mb-4">
              <span className="px-3 py-1 rounded-full bg-yellow-600/20 border border-yellow-600/30 text-yellow-500 text-[10px] font-bold uppercase tracking-widest">
                {entry.tipo}
              </span>
              {isLocked && (
                <span className="px-3 py-1 rounded-full bg-red-900/40 border border-red-500/30 text-red-400 text-[10px] font-bold uppercase tracking-widest flex items-center gap-1">
                  <ShieldAlert size={10} />
                  Oculto
                </span>
              )}
            </div>

            <h2 className="text-4xl font-bold text-white mb-2" style={{ fontFamily: 'Cinzel, serif' }}>
              {isLocked ? 'Fragmento Desconhecido' : entry.titulo}
            </h2>
            {!isLocked && entry.conteudo.epiteto && (
              <p className="text-yellow-600/80 italic text-lg font-serif">"{entry.conteudo.epiteto}"</p>
            )}
          </div>

          {/* Body */}
          <div className="p-8 overflow-y-auto custom-scrollbar flex-1 relative">
            {isLocked ? (
              <div className="h-full flex flex-col items-center justify-center text-center p-8 opacity-60">
                <ShieldAlert size={64} className="mb-4 text-red-500/50" />
                <p className="text-xl text-gray-300 font-serif mb-2">Conhecimento Proibido</p>
                <p className="text-gray-500 text-sm">O Mestre ainda não revelou este fragmento. Seus olhos mortais não podem ver isto.</p>
              </div>
            ) : (
              <div className="space-y-6">
                <p className="text-gray-300 leading-relaxed text-lg font-light">
                  {entry.conteudo.descricao}
                </p>

                {(entry.conteudo.dominio || entry.conteudo.arvore || entry.conteudo.era) && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-8 pt-8 border-t border-white/5">
                    {entry.conteudo.dominio && (
                      <div className="bg-black/40 border border-white/5 p-4 rounded-xl flex items-start gap-3">
                        <Info className="text-yellow-600 mt-1" size={18} />
                        <div>
                          <strong className="text-gray-500 uppercase tracking-widest text-xs block mb-1">Domínio</strong>
                          <span className="text-gray-300">{entry.conteudo.dominio}</span>
                        </div>
                      </div>
                    )}
                    {entry.conteudo.arvore && (
                      <div className="bg-black/40 border border-white/5 p-4 rounded-xl flex items-start gap-3">
                        <MapIcon className="text-yellow-600 mt-1" size={18} />
                        <div>
                          <strong className="text-gray-500 uppercase tracking-widest text-xs block mb-1">Árvore Parente</strong>
                          <span className="text-gray-300">{entry.conteudo.arvore}</span>
                        </div>
                      </div>
                    )}
                    {entry.conteudo.era && (
                      <div className="bg-black/40 border border-white/5 p-4 rounded-xl flex items-start gap-3">
                        <Calendar className="text-yellow-600 mt-1" size={18} />
                        <div>
                          <strong className="text-gray-500 uppercase tracking-widest text-xs block mb-1">Era Histórica</strong>
                          <span className="text-gray-300">{entry.conteudo.era}</span>
                        </div>
                      </div>
                    )}
                    {entry.conteudo.envolvidos && entry.conteudo.envolvidos.length > 0 && (
                      <div className="bg-black/40 border border-white/5 p-4 rounded-xl flex items-start gap-3 col-span-1 sm:col-span-2">
                        <User className="text-yellow-600 mt-1" size={18} />
                        <div>
                          <strong className="text-gray-500 uppercase tracking-widest text-xs block mb-1">Envolvidos</strong>
                          <span className="text-gray-300">{entry.conteudo.envolvidos}</span>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
