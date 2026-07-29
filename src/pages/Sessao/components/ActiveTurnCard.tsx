import React from 'react';
import { motion } from 'framer-motion';
import { useSessaoStore } from '../../../store/useSessaoStore';
import { useCharacterStore } from '../../../store/useCharacterStore';
import { Shield, Heart, Zap, User, Sword, Sparkles } from 'lucide-react';
import { PlayerGallery } from './PlayerGallery';

interface ActiveTurnCardProps {
  onRequestRoll: (formula?: string, title?: string) => void;
}

export const ActiveTurnCard: React.FC<ActiveTurnCardProps> = ({ onRequestRoll }) => {
  const { iniciativa, turnoAtualIndex } = useSessaoStore();
  const { characters } = useCharacterStore();

  const entidadeAtiva = iniciativa[turnoAtualIndex];

  if (!entidadeAtiva) {
    return (
      <div className="absolute inset-y-0 left-[400px] right-[350px] flex flex-col pointer-events-none">
        <div className="pt-20 pb-2 flex flex-col items-center gap-2 text-gray-500 opacity-50 shrink-0">
          <Sparkles size={32} />
          <p className="uppercase tracking-widest text-xs">O combate ainda não começou</p>
        </div>
        <div className="relative flex-1 pointer-events-auto">
          <PlayerGallery />
        </div>
      </div>
    );
  }

  const char = characters.find(c => c.id === entidadeAtiva.id || c.nome === entidadeAtiva.nome);
  
  const nome = char?.nome || entidadeAtiva.nome;
  const nivel = char?.nivel || '?';
  const classe = char?.classes?.[0]?.id || char?.classeId || entidadeAtiva.tipo;
  const foto = char?.foto || null;
  const hpMax = char?.derivados?.vida || entidadeAtiva.hpTotal || 0;
  const hpAtual = entidadeAtiva.hpAtual ?? hpMax;
  const mana = char?.derivados?.mana || 0;
  const defesa = char?.derivados?.defesaNatural || 10;
  const forca = Number(char?.ficha?.atributos?.forca || char?.ficha?.atributos?.str || 0);

  return (
    <div className="absolute inset-y-0 left-[400px] right-[350px] flex items-center justify-center pointer-events-none">
        <motion.div
          key={entidadeAtiva.id}
          initial={{ opacity: 0, scale: 0.9, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          className="pointer-events-auto bg-[#0f0e15]/90 backdrop-blur-2xl border border-[#c7a44c]/30 rounded-2xl p-8 w-[500px] shadow-[0_0_50px_rgba(199,164,76,0.15)] flex flex-col gap-8"
        >
          {/* Header do Card */}
          <div className="flex items-center gap-6">
            <div className="w-24 h-24 rounded-xl border border-[#c7a44c]/50 bg-black/60 overflow-hidden flex items-center justify-center shadow-inner shrink-0">
              {foto ? (
                <img src={foto} alt={nome} className="w-full h-full object-cover" />
              ) : (
                <User size={48} className="text-[#c7a44c]/50" />
              )}
            </div>
            <div className="flex-1 overflow-hidden">
              <h2 className="text-3xl font-bold text-white tracking-wider uppercase truncate" style={{ fontFamily: 'Cinzel, serif' }} title={nome}>
                {nome}
              </h2>
              <p className="text-sm text-[#c7a44c] uppercase tracking-widest mt-2 truncate">
                {entidadeAtiva.tipo === 'jogador'
                  ? `Nível ${nivel} • ${classe}`
                  : `${entidadeAtiva.tipo === 'aliado' ? 'Aliado' : 'Inimigo'} • Iniciativa ${entidadeAtiva.iniciativa}`}
              </p>
            </div>
          </div>

          {/* Status Bars */}
          <div className="grid grid-cols-3 gap-4">
            <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4 flex flex-col items-center shadow-inner">
              <Heart size={20} className="text-red-400 mb-2" />
              <span className="text-[10px] uppercase tracking-widest text-gray-400 mb-1">HP</span>
              <span className="text-xl font-bold text-white">{hpAtual} / {hpMax || '?'}</span>
            </div>
            <div className="bg-blue-500/10 border border-blue-500/30 rounded-xl p-4 flex flex-col items-center shadow-inner">
              <Zap size={20} className="text-blue-400 mb-2" />
              <span className="text-[10px] uppercase tracking-widest text-gray-400 mb-1">Mana</span>
              <span className="text-xl font-bold text-white">{mana}</span>
            </div>
            <div className="bg-gray-500/10 border border-gray-500/30 rounded-xl p-4 flex flex-col items-center shadow-inner">
              <Shield size={20} className="text-gray-400 mb-2" />
              <span className="text-[10px] uppercase tracking-widest text-gray-400 mb-1">Defesa</span>
              <span className="text-xl font-bold text-white">{defesa}</span>
            </div>
          </div>

          {/* Ações Rápidas */}
          <div className="flex flex-col gap-4 pt-6 border-t border-white/10">
            <span className="text-xs text-gray-500 uppercase tracking-widest text-center">Ações Rápidas</span>
            <div className="grid grid-cols-2 gap-4">
              <button
                onClick={() => {
                  const bonus = forca > 0 ? `+${forca}` : '';
                  onRequestRoll(`1d20${bonus}`, `Ataque Básico (${nome})`);
                }}
                className="py-4 bg-red-900/40 hover:bg-red-800/60 border border-red-500/50 rounded-xl text-red-200 font-bold transition-all shadow-[0_0_15px_rgba(239,68,68,0.1)] hover:shadow-[0_0_25px_rgba(239,68,68,0.3)] flex items-center justify-center gap-2"
              >
                <Sword size={18} /> Ataque {forca > 0 ? `(+${forca})` : ''}
              </button>
              <button
                onClick={() => onRequestRoll(`1d20`, `Teste Neutro (${nome})`)}
                className="py-4 bg-[#c7a44c]/20 hover:bg-[#c7a44c]/30 border border-[#c7a44c]/50 rounded-xl text-[#c7a44c] font-bold transition-all shadow-[0_0_15px_rgba(199,164,76,0.1)] hover:shadow-[0_0_25px_rgba(199,164,76,0.3)] flex items-center justify-center gap-2"
              >
                <Sparkles size={18} /> Teste de D20
              </button>
            </div>
          </div>
        </motion.div>
    </div>
  );
};
