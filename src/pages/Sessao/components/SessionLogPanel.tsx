import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useSessaoStore } from '../../../store/useSessaoStore';
import { ScrollText, Dice5 } from 'lucide-react';

export const SessionLogPanel: React.FC = () => {
  const { rolagens } = useSessaoStore();

  return (
    <motion.div 
      initial={{ x: -300, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      className="absolute left-[90px] top-0 bottom-0 w-[350px] p-6 bg-[#0f0e15]/90 backdrop-blur-xl border-x border-[#c7a44c]/20 flex flex-col z-10 shadow-[30px_0_50px_rgba(0,0,0,0.7)]"
      style={{ boxShadow: 'inset -1px 0 20px rgba(199,164,76,0.05)' }}
    >
      <div className="flex items-center gap-3 mb-6 pb-4 border-b border-white/10 shrink-0">
        <ScrollText className="text-[#c7a44c]" size={24} />
        <h3 className="text-xl font-bold text-[#c7a44c] tracking-wider" style={{fontFamily: 'Cinzel, serif'}}>
          Histórico
        </h3>
      </div>

      <div className="flex-1 overflow-y-auto pr-2 space-y-4 custom-scrollbar">
        {rolagens.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center gap-4 text-gray-500 opacity-50">
            <Dice5 size={48} />
            <p className="text-sm">Nenhum dado foi rolado nesta sessão ainda.</p>
          </div>
        ) : (
          <AnimatePresence>
            {rolagens.map((rolagem, idx) => {
              const isCritico = rolagem.resultado === 20;
              const isDesastre = rolagem.resultado === 1;
              const isRecente = idx === 0;

              return (
                <motion.div
                  key={rolagem.id}
                  initial={{ opacity: 0, x: -20, scale: 0.9 }}
                  animate={{ opacity: 1, x: 0, scale: 1 }}
                  layout
                  className={`relative overflow-hidden p-4 rounded-xl border ${
                    isCritico ? 'bg-[#c7a44c]/10 border-[#c7a44c]/50' : 
                    isDesastre ? 'bg-red-500/10 border-red-500/50' : 
                    'bg-black/60 border-white/5 hover:border-[#c7a44c]/30'
                  } transition-colors ${isRecente ? 'shadow-[0_0_20px_rgba(199,164,76,0.1)]' : ''}`}
                >
                  {isRecente && (
                    <div className="absolute top-0 right-0 w-16 h-16 bg-white opacity-5 rounded-bl-full pointer-events-none" />
                  )}
                  
                  <div className="flex justify-between items-start mb-2">
                    <span className="text-xs text-gray-400 font-bold uppercase tracking-widest">{rolagem.autor_nome}</span>
                    <span className="text-[10px] text-gray-600 font-mono">
                      {new Date(rolagem.criado_em).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>

                  <div className="flex justify-between items-center mt-1">
                    <div>
                      <h4 className="text-sm font-bold text-white">{rolagem.titulo}</h4>
                      <p className="text-xs text-gray-500 font-mono mt-1">{rolagem.formula}</p>
                    </div>
                    
                    <div className={`text-2xl font-bold font-mono px-4 py-2 rounded-lg border ${
                      isCritico ? 'text-[#c7a44c] border-[#c7a44c]/50 bg-[#c7a44c]/10 shadow-[0_0_15px_rgba(199,164,76,0.3)]' : 
                      isDesastre ? 'text-red-400 border-red-500/50 bg-red-500/10 shadow-[0_0_15px_rgba(239,68,68,0.3)]' : 
                      'text-white border-white/10 bg-black/50'
                    }`}>
                      {rolagem.resultado}
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
        )}
      </div>
    </motion.div>
  );
};
