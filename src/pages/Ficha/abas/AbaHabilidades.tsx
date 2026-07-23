import { useState } from 'react';
import { Search, Star } from 'lucide-react';
import { motion } from 'framer-motion';

export const AbaHabilidades = ({ character }: { character: any; onUpdate?: any }) => {
  const [busca, setBusca] = useState('');
  
  const habilidades = character.ficha?.habilidades || [];

  const habilidadesVisiveis = habilidades.filter((h: any) => 
    !busca || h.nome?.toLowerCase().includes(busca.toLowerCase())
  );

  return (
    <div className="space-y-6">
      
      {/* HEADER */}
      <div className="bg-[#0f0e15] border border-white/5 rounded-2xl p-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-white mb-1" style={{ fontFamily: 'Cinzel, serif' }}>Habilidades</h2>
          <p className="text-gray-400 text-sm">Traços raciais, talentos e competências diversas.</p>
        </div>
        <div className="flex items-center gap-3 bg-[#15141b] border border-white/5 rounded-xl px-4 py-3">
          <span className="text-3xl font-bold text-[#c7a44c]">{habilidades.length}</span>
          <span className="text-sm text-gray-500 uppercase tracking-widest font-bold leading-tight">Habilidades<br/>Conhecidas</span>
        </div>
      </div>

      {/* FERRAMENTAS */}
      <div className="flex gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={18} />
          <input 
            type="text" 
            placeholder="Buscar habilidade..."
            value={busca}
            onChange={e => setBusca(e.target.value)}
            className="w-full bg-[#0f0e15] border border-white/5 rounded-xl py-3 pl-10 pr-4 text-white focus:border-[#c7a44c]/50 outline-none text-sm"
          />
        </div>
        <button className="px-6 py-3 rounded-xl border border-yellow-600/30 text-yellow-600 font-bold text-sm hover:bg-yellow-600/10 transition-colors border-dashed">
          + Nova Habilidade
        </button>
      </div>

      {/* LISTA */}
      <div className="bg-[#0f0e15] border border-white/5 rounded-2xl overflow-hidden p-4">
        <div className="flex flex-col gap-4">
          {habilidadesVisiveis.map((h: any) => (
            <motion.div 
              layout
              initial={{ opacity: 0 }} animate={{ opacity: 1 }}
              key={h.id || Math.random()} 
              className="bg-[#121118] border border-white/5 rounded-xl p-5 hover:border-yellow-600/30 transition-colors group"
            >
              <div className="flex gap-4 items-start">
                <div className="w-10 h-10 rounded-full bg-black/50 border border-white/5 flex items-center justify-center text-yellow-600 flex-shrink-0 mt-1">
                  <Star size={18} />
                </div>
                <div>
                  <h4 className="text-white font-bold text-lg mb-1">{h.nome || 'Habilidade Desconhecida'}</h4>
                  <div className="flex gap-2 mb-3">
                    <span className="text-[10px] px-2 py-0.5 bg-black/40 rounded border border-white/5 text-gray-400 capitalize">
                      {h.origem || 'Geral'}
                    </span>
                  </div>
                  <p className="text-gray-400 text-sm leading-relaxed">{h.descricao || 'Sem descrição cadastrada.'}</p>
                </div>
              </div>
            </motion.div>
          ))}
          {habilidadesVisiveis.length === 0 && (
            <div className="py-12 text-center">
              <Star size={48} className="text-gray-700 mx-auto mb-4 opacity-50" />
              <p className="text-gray-500 font-bold uppercase tracking-widest">Nenhuma Habilidade Encontrada</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
