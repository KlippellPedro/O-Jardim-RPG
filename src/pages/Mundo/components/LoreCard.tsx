import React from 'react';
import { motion } from 'framer-motion';
import { LoreEntry } from '../../../data/mundoCatalog';

export const LoreCard: React.FC<{ entry: LoreEntry }> = ({ entry }) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="bg-[#0b0a12]/60 backdrop-blur-md border border-white/10 rounded-2xl p-6 hover:border-primary/50 transition-colors shadow-[0_4px_30px_rgba(0,0,0,0.5)]"
    >
      <div className="flex justify-between items-start mb-4">
        <h3 className="text-2xl font-bold text-white tracking-wide" style={{ fontFamily: 'Cinzel, serif' }}>
          {entry.titulo}
        </h3>
        <span className="px-3 py-1 rounded-full bg-primary/20 text-primary text-xs font-bold uppercase tracking-wider border border-primary/30">
          {entry.tipo}
        </span>
      </div>
      
      <div className="space-y-4">
        {Object.entries(entry.conteudo).map(([key, value]) => {
          if (!value) return null;
          
          return (
            <div key={key}>
              <h4 className="text-gray-500 text-xs uppercase tracking-widest mb-1">
                {key.replace('_', ' ')}
              </h4>
              <p className="text-gray-300 text-sm leading-relaxed whitespace-pre-line">
                {value}
              </p>
            </div>
          );
        })}
      </div>
    </motion.div>
  );
};
