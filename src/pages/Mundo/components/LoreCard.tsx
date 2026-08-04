import React from 'react';
import { motion } from 'framer-motion';
import { LoreEntry } from '../../../../data/gerado/mundoCatalog';
import { ShieldAlert } from 'lucide-react';
import { useAuthStore } from '../../../store/useAuthStore';

interface LoreCardProps {
  entry: LoreEntry;
  onClick: (entry: LoreEntry) => void;
}

export const LoreCard: React.FC<LoreCardProps> = ({ entry, onClick }) => {
  const { usuario, campanhaAtiva } = useAuthStore();
  const isMestre = usuario?.papel_plataforma === 'admin' || usuario?.papel_plataforma === 'criador' || campanhaAtiva?.papel === 'mestre' || campanhaAtiva?.papel === 'assistente';
  const isLocked = entry.revelado === false && !isMestre;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      onClick={() => onClick(entry)}
      className="bg-[#0b0a12]/60 backdrop-blur-md border border-white/10 rounded-2xl p-6 hover:border-yellow-600/50 hover:bg-[#15141b]/80 transition-all shadow-[0_4px_30px_rgba(0,0,0,0.5)] cursor-pointer group flex flex-col h-full justify-between"
    >
      <div>
        <div className="flex justify-between items-start mb-4">
          <h3 className="text-2xl font-bold text-white group-hover:text-yellow-500 transition-colors tracking-wide" style={{ fontFamily: 'Cinzel, serif' }}>
            {entry.titulo}
          </h3>
          <div className="flex flex-col items-end gap-2">
            <span className="px-3 py-1 rounded-full bg-yellow-600/20 text-yellow-500 text-[10px] font-bold uppercase tracking-wider border border-yellow-600/30">
              {entry.tipo}
            </span>
            {isLocked && (
              <span className="text-red-500 flex items-center gap-1 text-[10px] uppercase font-bold tracking-widest bg-red-900/40 px-2 py-0.5 rounded-full">
                <ShieldAlert size={10} /> Oculto
              </span>
            )}
          </div>
        </div>
        
        {entry.conteudo.epiteto && (
          <p className="text-xs text-yellow-600/70 italic font-serif mb-4">"{entry.conteudo.epiteto}"</p>
        )}
      </div>

      <div className="space-y-4">
        {isLocked ? (
          <p className="text-gray-600 text-sm italic">O Mestre ainda não revelou as informações deste tópico.</p>
        ) : (
          <p className="text-gray-400 text-sm leading-relaxed line-clamp-4 group-hover:text-gray-300 transition-colors">
            {entry.conteudo.descricao}
          </p>
        )}
      </div>
      
      <div className="mt-6 text-right">
        <span className="text-xs text-yellow-600/50 font-bold uppercase tracking-widest group-hover:text-yellow-500 transition-colors">Ver Detalhes &rarr;</span>
      </div>
    </motion.div>
  );
};
