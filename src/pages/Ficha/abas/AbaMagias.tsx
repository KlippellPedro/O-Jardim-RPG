import { useState } from 'react';
import { Search, Flame, Dices } from 'lucide-react';
import { motion } from 'framer-motion';

export const AbaMagias = ({ character }: { character: any; onUpdate?: any }) => {
  const [busca, setBusca] = useState('');
  
  const magias = character.ficha?.magias || [];

  const magiasVisiveis = magias.filter((m: any) => 
    !busca || m.nome?.toLowerCase().includes(busca.toLowerCase())
  );

  return (
    <div className="space-y-6">
      
      {/* HEADER */}
      <div className="bg-[#0f0e15] border border-white/5 rounded-2xl p-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-white mb-1" style={{ fontFamily: 'Cinzel, serif' }}>Magias</h2>
          <p className="text-gray-400 text-sm">Lista de magias, milagres e feitiços conhecidos.</p>
        </div>
        <div className="flex items-center gap-3 bg-[#15141b] border border-white/5 rounded-xl px-4 py-3">
          <span className="text-3xl font-bold text-[#29b6f6]">{magias.length}</span>
          <span className="text-sm text-gray-500 uppercase tracking-widest font-bold leading-tight">Magias<br/>Conhecidas</span>
        </div>
      </div>

      {/* FERRAMENTAS */}
      <div className="flex gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={18} />
          <input 
            type="text" 
            placeholder="Buscar magia..."
            value={busca}
            onChange={e => setBusca(e.target.value)}
            className="w-full bg-[#0f0e15] border border-white/5 rounded-xl py-3 pl-10 pr-4 text-white focus:border-[#29b6f6]/50 outline-none text-sm"
          />
        </div>
        <button className="px-6 py-3 rounded-xl border border-[#29b6f6]/30 text-[#29b6f6] font-bold text-sm hover:bg-[#29b6f6]/10 transition-colors border-dashed">
          + Nova Magia
        </button>
      </div>

      {/* LISTA */}
      <div className="bg-[#0f0e15] border border-white/5 rounded-2xl overflow-hidden p-4">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {magiasVisiveis.map((m: any) => (
            <motion.div 
              layout
              initial={{ opacity: 0 }} animate={{ opacity: 1 }}
              key={m.id || Math.random()} 
              className="bg-[#121118] border border-white/5 rounded-xl p-5 flex flex-col gap-4 hover:border-[#29b6f6]/30 transition-colors group relative"
            >
              <div className="flex justify-between items-start">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-black/50 border border-white/5 flex items-center justify-center text-[#29b6f6]">
                    <Flame size={18} />
                  </div>
                  <div>
                    <h4 className="text-white font-bold mb-1">{m.nome || 'Magia Desconhecida'}</h4>
                    <span className="text-[10px] px-2 py-0.5 bg-black/40 rounded border border-white/5 text-gray-400 capitalize">
                      {m.circulo || '1º Círculo'} • {m.escola || 'Universal'}
                    </span>
                  </div>
                </div>
              </div>

              <div className="text-sm text-gray-400 space-y-1">
                <p><strong>Custo:</strong> {m.custo || '1 PM'}</p>
                <p><strong>Execução:</strong> {m.execucao || 'Padrão'}</p>
                <p><strong>Alcance:</strong> {m.alcance || 'Curto'}</p>
              </div>

              <div className="flex justify-between items-center mt-2 pt-3 border-t border-white/5">
                <span className="text-xs text-gray-500 truncate pr-4">{m.efeito || 'Efeito principal da magia...'}</span>
                <button className="px-4 py-2 rounded bg-[#29b6f6]/10 border border-[#29b6f6]/30 text-[#29b6f6] hover:bg-[#29b6f6]/20 flex items-center gap-2 text-xs font-bold transition-all whitespace-nowrap">
                  <Dices size={14} /> Conjurar
                </button>
              </div>
            </motion.div>
          ))}
          {magiasVisiveis.length === 0 && (
            <div className="col-span-full py-12 text-center">
              <Flame size={48} className="text-gray-700 mx-auto mb-4 opacity-50" />
              <p className="text-gray-500 font-bold uppercase tracking-widest">Nenhuma Magia Encontrada</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
