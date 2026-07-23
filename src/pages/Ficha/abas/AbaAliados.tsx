import { useState } from 'react';
import { Search, Users } from 'lucide-react';
import { motion } from 'framer-motion';

export const AbaAliados = ({ character }: { character: any; onUpdate?: any }) => {
  const [busca, setBusca] = useState('');
  
  const aliados = character.ficha?.aliados || [];

  const aliadosVisiveis = aliados.filter((a: any) => 
    !busca || a.nome?.toLowerCase().includes(busca.toLowerCase())
  );

  return (
    <div className="space-y-6">
      
      {/* HEADER */}
      <div className="bg-[#0f0e15] border border-white/5 rounded-2xl p-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-white mb-1" style={{ fontFamily: 'Cinzel, serif' }}>Aliados</h2>
          <p className="text-gray-400 text-sm">Companheiros, familiares, montarias ou seguidores.</p>
        </div>
        <div className="flex items-center gap-3 bg-[#15141b] border border-white/5 rounded-xl px-4 py-3">
          <span className="text-3xl font-bold text-green-500">{aliados.length}</span>
          <span className="text-sm text-gray-500 uppercase tracking-widest font-bold leading-tight">Aliados<br/>Ativos</span>
        </div>
      </div>

      {/* FERRAMENTAS */}
      <div className="flex gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={18} />
          <input 
            type="text" 
            placeholder="Buscar aliado..."
            value={busca}
            onChange={e => setBusca(e.target.value)}
            className="w-full bg-[#0f0e15] border border-white/5 rounded-xl py-3 pl-10 pr-4 text-white focus:border-green-500/50 outline-none text-sm"
          />
        </div>
        <button className="px-6 py-3 rounded-xl border border-green-500/30 text-green-500 font-bold text-sm hover:bg-green-500/10 transition-colors border-dashed">
          + Novo Aliado
        </button>
      </div>

      {/* LISTA */}
      <div className="bg-[#0f0e15] border border-white/5 rounded-2xl overflow-hidden p-4">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {aliadosVisiveis.map((a: any) => (
            <motion.div 
              layout
              initial={{ opacity: 0 }} animate={{ opacity: 1 }}
              key={a.id || Math.random()} 
              className="bg-[#121118] border border-white/5 rounded-xl p-5 flex flex-col gap-4 hover:border-green-500/30 transition-colors group relative"
            >
              <div className="flex justify-between items-start">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-full bg-black/50 border border-white/5 flex items-center justify-center text-green-500 overflow-hidden">
                    {a.imagem ? <img src={a.imagem} alt={a.nome} className="w-full h-full object-cover opacity-80" /> : <Users size={20} />}
                  </div>
                  <div>
                    <h4 className="text-white font-bold mb-1">{a.nome || 'Aliado Desconhecido'}</h4>
                    <span className="text-[10px] px-2 py-0.5 bg-black/40 rounded border border-white/5 text-gray-400 capitalize">
                      {a.tipo || 'Seguidor'}
                    </span>
                  </div>
                </div>
              </div>

              <div className="text-sm text-gray-400">
                <p>{a.descricao || 'Nenhuma descrição detalhada sobre este aliado.'}</p>
              </div>

              <div className="flex justify-between items-center mt-2 pt-3 border-t border-white/5">
                <span className="text-[10px] text-gray-500 uppercase tracking-widest font-bold">Nível {a.nivel || 1}</span>
                <button className="px-4 py-2 rounded bg-black/40 border border-white/10 text-gray-400 hover:text-white flex items-center gap-2 text-xs font-bold transition-all">
                  Editar
                </button>
              </div>
            </motion.div>
          ))}
          {aliadosVisiveis.length === 0 && (
            <div className="col-span-full py-12 text-center">
              <Users size={48} className="text-gray-700 mx-auto mb-4 opacity-50" />
              <p className="text-gray-500 font-bold uppercase tracking-widest">Nenhum Aliado Encontrado</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
