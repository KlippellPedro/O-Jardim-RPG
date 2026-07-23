import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useSessaoStore } from '../../store/useSessaoStore';
import { Play, Plus, Trash2, ArrowRight, Dices } from 'lucide-react';

interface InitiativeTrackerProps {
  onRequestRoll: () => void;
}

export const InitiativeTracker: React.FC<InitiativeTrackerProps> = ({ onRequestRoll }) => {
  const { 
    iniciativa, 
    turnoAtualIndex, 
    carregarJogadoresAtivos, 
    adicionarEntidade, 
    removerEntidade,
    proximoTurno,
    rolagens
  } = useSessaoStore();

  const [isAdding, setIsAdding] = useState(false);
  const [novoNome, setNovoNome] = useState('');
  const [novaIniciativa, setNovaIniciativa] = useState(10);

  // Carrega jogadores ativos ao montar o painel
  useEffect(() => {
    carregarJogadoresAtivos();
  }, [carregarJogadoresAtivos]);

  const handleAddNPC = (e: React.FormEvent) => {
    e.preventDefault();
    if (!novoNome.trim()) return;
    
    adicionarEntidade({
      nome: novoNome,
      iniciativa: novaIniciativa,
      hpAtual: 50,
      hpTotal: 50,
      tipo: 'npc',
      cor: '#ef4444' // red for NPCs/Monsters
    });
    
    setNovoNome('');
    setNovaIniciativa(10);
    setIsAdding(false);
  };

  return (
    <motion.div 
      initial={{ x: 300, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      className="absolute right-0 top-0 bottom-0 w-80 bg-[#0b0a12]/70 backdrop-blur-xl border-l border-white/10 p-6 flex flex-col z-10"
    >
      <div className="flex justify-between items-center mb-6">
        <h3 className="text-xl font-bold text-white tracking-wider" style={{fontFamily: 'Cinzel, serif'}}>
          Iniciativa
        </h3>
        <button 
          onClick={onRequestRoll}
          className="p-2 bg-primary/20 hover:bg-primary/40 rounded-full border border-primary/50 text-primary transition-all shadow-[0_0_15px_rgba(var(--color-primary),0.3)]"
          title="Rolar D20"
        >
          <Dices size={20} />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto pr-2 space-y-3 custom-scrollbar">
        <AnimatePresence>
          {iniciativa.map((entidade, index) => {
            const isAtivo = index === turnoAtualIndex;
            return (
              <motion.div
                key={entidade.id}
                layout
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                className={`relative flex items-center justify-between p-3 rounded-xl border transition-all ${
                  isAtivo 
                    ? 'bg-primary/20 border-primary shadow-[0_0_20px_rgba(var(--color-primary),0.3)]' 
                    : 'bg-white/5 border-white/10 opacity-70'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full border-2 flex items-center justify-center font-bold text-sm bg-black/40"
                       style={{ borderColor: entidade.cor, color: entidade.cor }}>
                    {entidade.iniciativa}
                  </div>
                  <div>
                    <div className="text-white font-medium">{entidade.nome}</div>
                    <div className="text-xs text-gray-400">HP: {entidade.hpAtual}/{entidade.hpTotal}</div>
                  </div>
                </div>
                
                <button 
                  onClick={() => removerEntidade(entidade.id)}
                  className="text-gray-500 hover:text-red-400 transition-colors"
                >
                  <Trash2 size={16} />
                </button>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>

      {isAdding && (
        <motion.form 
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: 'auto', opacity: 1 }}
          className="mt-4 p-4 bg-black/40 border border-white/10 rounded-xl flex flex-col gap-3"
          onSubmit={handleAddNPC}
        >
          <input 
            type="text" 
            placeholder="Nome (NPC/Monstro)"
            value={novoNome}
            onChange={e => setNovoNome(e.target.value)}
            className="w-full bg-black/60 border border-white/20 rounded-lg p-2 text-sm text-white focus:outline-none focus:border-red-500"
            autoFocus
          />
          <div className="flex gap-2">
            <input 
              type="number" 
              placeholder="Iniciativa"
              value={novaIniciativa}
              onChange={e => setNovaIniciativa(Number(e.target.value))}
              className="w-full bg-black/60 border border-white/20 rounded-lg p-2 text-sm text-white focus:outline-none focus:border-red-500"
            />
            <button type="submit" className="bg-red-500/20 text-red-400 p-2 rounded-lg border border-red-500/50 hover:bg-red-500/40">
              <Plus size={18} />
            </button>
          </div>
        </motion.form>
      )}

      <div className="mt-6 flex flex-col gap-3">
        {!isAdding && (
          <button 
            onClick={() => setIsAdding(true)}
            className="w-full py-2 border border-dashed border-white/20 text-gray-400 hover:text-white hover:border-white/50 rounded-xl transition-all text-sm flex items-center justify-center gap-2"
          >
            <Plus size={16} /> Adicionar Entidade
          </button>
        )}
        
        <button 
          onClick={proximoTurno}
          disabled={iniciativa.length === 0}
          className="w-full py-3 bg-primary text-black font-bold rounded-xl hover:bg-primary/80 transition-colors shadow-[0_0_15px_rgba(var(--color-primary),0.5)] flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Próximo Turno <ArrowRight size={18} />
        </button>
      </div>

      {/* Mini histórico de rolagens do lado esquerdo desse painel ou no bottom */}
      {rolagens.length > 0 && (
        <div className="mt-6 border-t border-white/10 pt-4 max-h-32 overflow-y-auto custom-scrollbar">
          <h4 className="text-xs text-gray-500 uppercase tracking-widest mb-2">Últimas Rolagens</h4>
          <div className="space-y-2">
            {rolagens.slice(0, 3).map(r => (
              <div key={r.id} className="text-sm bg-black/30 p-2 rounded-lg flex justify-between items-center border border-white/5">
                <span className="text-gray-400">{r.ator}</span>
                <span className={`font-bold ${r.isCritico ? 'text-yellow-400' : r.isDesastre ? 'text-red-400' : 'text-white'}`}>
                  {r.resultado_total}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </motion.div>
  );
};
