import React, { useEffect } from 'react';
import { motion } from 'framer-motion';
import { useCharacterStore } from '../../../store/useCharacterStore';
import { Shield, Heart, Zap, User } from 'lucide-react';

export const PlayerGallery: React.FC = () => {
  const { characters, fetchCharacters } = useCharacterStore();

  useEffect(() => {
    fetchCharacters();
  }, [fetchCharacters]);

  return (
    <div className="absolute inset-0 flex items-center justify-center pointer-events-none pb-24">
      <div className="w-[60%] h-[75%] max-h-[800px] pointer-events-auto overflow-y-auto custom-scrollbar p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {characters.map((char, index) => (
            <motion.div
              key={char.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              className="bg-black/60 backdrop-blur-md border border-white/10 rounded-2xl p-5 flex flex-col gap-4 shadow-xl hover:border-[#c7a44c]/50 hover:shadow-[0_0_20px_rgba(199,164,76,0.2)] transition-all"
            >
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 rounded-full border-2 border-[#c7a44c]/50 bg-black/40 overflow-hidden flex items-center justify-center flex-shrink-0">
                  {char.foto ? (
                    <img src={char.foto} alt={char.nome} className="w-full h-full object-cover" />
                  ) : (
                    <User size={32} className="text-[#c7a44c]/50" />
                  )}
                </div>
                <div>
                  <h3 className="text-xl font-bold text-white tracking-wide" style={{ fontFamily: 'Cinzel, serif' }}>{char.nome}</h3>
                  <p className="text-sm text-gray-400 mt-1">
                    Nível {char.nivel} • {char.racaId || 'Raça'}
                  </p>
                </div>
              </div>
              
              <div className="grid grid-cols-3 gap-2 mt-2">
                <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-2 flex flex-col items-center justify-center">
                  <Heart size={16} className="text-red-400 mb-1" />
                  <span className="text-[10px] uppercase tracking-wider text-gray-400">HP Max</span>
                  <span className="text-sm font-bold text-white">{char.derivados?.vida || 0}</span>
                </div>
                <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-2 flex flex-col items-center justify-center">
                  <Zap size={16} className="text-blue-400 mb-1" />
                  <span className="text-[10px] uppercase tracking-wider text-gray-400">Mana</span>
                  <span className="text-sm font-bold text-white">{char.derivados?.mana || 0}</span>
                </div>
                <div className="bg-gray-500/10 border border-gray-500/20 rounded-lg p-2 flex flex-col items-center justify-center">
                  <Shield size={16} className="text-gray-400 mb-1" />
                  <span className="text-[10px] uppercase tracking-wider text-gray-400">Defesa</span>
                  <span className="text-sm font-bold text-white">{char.derivados?.defesaNatural || 10}</span>
                </div>
              </div>
            </motion.div>
          ))}
          {characters.length === 0 && (
            <div className="col-span-full flex flex-col items-center justify-center text-gray-500 mt-20 opacity-50">
              <User size={48} className="mb-4" />
              <p>Nenhum jogador na campanha.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
