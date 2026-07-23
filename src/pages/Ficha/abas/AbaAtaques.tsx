import { useState } from 'react';
import { Search, Crosshair, Dices } from 'lucide-react';
import { motion } from 'framer-motion';

export const AbaAtaques = ({ character }: { character: any; onUpdate?: any }) => {
  const [busca, setBusca] = useState('');
  
  const ataques = character.ficha?.ataques || [];

  const ataquesVisiveis = ataques.filter((a: any) => 
    !busca || a.nome?.toLowerCase().includes(busca.toLowerCase())
  );

  return (
    <div className="space-y-6">
      
      {/* HEADER */}
      <div className="bg-[#0f0e15] border border-white/5 rounded-2xl p-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-white mb-1" style={{ fontFamily: 'Cinzel, serif' }}>Ataques</h2>
          <p className="text-gray-400 text-sm">Armas equipadas e manobras de combate.</p>
        </div>
        <div className="flex items-center gap-3 bg-[#15141b] border border-white/5 rounded-xl px-4 py-3">
          <span className="text-3xl font-bold text-red-500">{ataques.length}</span>
          <span className="text-sm text-gray-500 uppercase tracking-widest font-bold leading-tight">Ataques<br/>Prontos</span>
        </div>
      </div>

      {/* FERRAMENTAS */}
      <div className="flex gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={18} />
          <input 
            type="text" 
            placeholder="Buscar ataque..."
            value={busca}
            onChange={e => setBusca(e.target.value)}
            className="w-full bg-[#0f0e15] border border-white/5 rounded-xl py-3 pl-10 pr-4 text-white focus:border-red-500/50 outline-none text-sm"
          />
        </div>
        <button className="px-6 py-3 rounded-xl border border-red-500/30 text-red-500 font-bold text-sm hover:bg-red-500/10 transition-colors border-dashed">
          + Novo Ataque
        </button>
      </div>

      {/* LISTA */}
      <div className="bg-[#0f0e15] border border-white/5 rounded-2xl overflow-hidden p-4">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {ataquesVisiveis.map((a: any) => (
            <motion.div 
              layout
              initial={{ opacity: 0 }} animate={{ opacity: 1 }}
              key={a.id || Math.random()} 
              className="bg-[#121118] border border-white/5 rounded-xl p-5 flex flex-col gap-4 hover:border-red-500/30 transition-colors group relative"
            >
              <div className="flex justify-between items-start">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-black/50 border border-white/5 flex items-center justify-center text-red-500">
                    <Crosshair size={18} />
                  </div>
                  <div>
                    <h4 className="text-white font-bold mb-1">{a.nome || 'Ataque Desconhecido'}</h4>
                    <span className="text-[10px] px-2 py-0.5 bg-black/40 rounded border border-white/5 text-gray-400 capitalize">
                      {a.tipo || 'Corpo a Corpo'}
                    </span>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 mt-2">
                <div className="bg-black/30 border border-white/5 rounded p-2 text-center">
                  <span className="block text-[10px] text-gray-500 uppercase font-bold tracking-wider mb-1">Teste (Acerto)</span>
                  <span className="text-lg font-bold text-white font-mono">{a.teste || '1d20'}</span>
                </div>
                <div className="bg-black/30 border border-white/5 rounded p-2 text-center">
                  <span className="block text-[10px] text-gray-500 uppercase font-bold tracking-wider mb-1">Dano</span>
                  <span className="text-lg font-bold text-red-400 font-mono">{a.dano || '1d6'}</span>
                </div>
              </div>

              <div className="flex justify-between items-center mt-2 pt-3 border-t border-white/5">
                <span className="text-xs text-gray-500">{a.alcance || 'Alcance: 1,5m'}</span>
                <button className="px-4 py-2 rounded bg-red-500/10 border border-red-500/30 text-red-500 hover:bg-red-500/20 flex items-center gap-2 text-xs font-bold transition-all">
                  <Dices size={14} /> Atacar
                </button>
              </div>
            </motion.div>
          ))}
          {ataquesVisiveis.length === 0 && (
            <div className="col-span-full py-12 text-center">
              <Crosshair size={48} className="text-gray-700 mx-auto mb-4 opacity-50" />
              <p className="text-gray-500 font-bold uppercase tracking-widest">Nenhum Ataque Encontrado</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
