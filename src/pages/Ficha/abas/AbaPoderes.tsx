import { useState } from 'react';
import { Search, Zap } from 'lucide-react';
import { motion } from 'framer-motion';

export const AbaPoderes = ({ character }: { character: any; onUpdate?: any }) => {
  const [busca, setBusca] = useState('');
  
  const poderes = character.ficha?.poderes || [];

  const poderesVisiveis = poderes.filter((p: any) => 
    !busca || p.nome?.toLowerCase().includes(busca.toLowerCase())
  );

  return (
    <div className="space-y-6">
      
      {/* HEADER */}
      <div className="bg-[#0f0e15] border border-white/5 rounded-2xl p-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-white mb-1" style={{ fontFamily: 'Cinzel, serif' }}>Poderes</h2>
          <p className="text-gray-400 text-sm">Habilidades ativas, passivas e características especiais.</p>
        </div>
        <div className="flex items-center gap-3 bg-[#15141b] border border-white/5 rounded-xl px-4 py-3">
          <span className="text-3xl font-bold text-[#c7a44c]">{poderes.length}</span>
          <span className="text-sm text-gray-500 uppercase tracking-widest font-bold leading-tight">Poderes<br/>Conhecidos</span>
        </div>
      </div>

      {/* FERRAMENTAS */}
      <div className="flex gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={18} />
          <input 
            type="text" 
            placeholder="Buscar poder..."
            value={busca}
            onChange={e => setBusca(e.target.value)}
            className="w-full bg-[#0f0e15] border border-white/5 rounded-xl py-3 pl-10 pr-4 text-white focus:border-[#c7a44c]/50 outline-none text-sm"
          />
        </div>
        <button className="px-6 py-3 rounded-xl border border-yellow-600/30 text-yellow-600 font-bold text-sm hover:bg-yellow-600/10 transition-colors border-dashed">
          + Novo Poder
        </button>
      </div>

      {/* LISTA DE PODERES */}
      <div className="bg-[#0f0e15] border border-white/5 rounded-2xl overflow-hidden p-4">
        <div className="flex flex-col gap-4">
          {poderesVisiveis.map((p: any) => (
            <motion.div 
              layout
              initial={{ opacity: 0 }} animate={{ opacity: 1 }}
              key={p.id || Math.random()} 
              className="bg-[#121118] border border-white/5 rounded-xl p-5 hover:border-yellow-600/30 transition-colors group"
            >
              <div className="flex gap-4 items-start">
                <div className="w-10 h-10 rounded-full bg-black/50 border border-white/5 flex items-center justify-center text-yellow-600 flex-shrink-0 mt-1">
                  <Zap size={18} />
                </div>
                <div>
                  <h4 className="text-white font-bold text-lg mb-1">{p.nome || 'Poder Desconhecido'}</h4>
                  <div className="flex gap-2 mb-3">
                    <span className="text-[10px] px-2 py-0.5 bg-black/40 rounded border border-white/5 text-gray-400 capitalize">
                      {p.tipo || 'Passivo'}
                    </span>
                    <span className="text-[10px] px-2 py-0.5 bg-black/40 rounded border border-white/5 text-gray-400 capitalize">
                      {p.origem || 'Classe'}
                    </span>
                  </div>
                  <p className="text-gray-400 text-sm leading-relaxed">{p.descricao || 'Sem descrição cadastrada.'}</p>
                </div>
              </div>
            </motion.div>
          ))}
          {poderesVisiveis.length === 0 && (
            <div className="py-12 text-center">
              <Zap size={48} className="text-gray-700 mx-auto mb-4 opacity-50" />
              <p className="text-gray-500 font-bold uppercase tracking-widest">Nenhum Poder Encontrado</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
