import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useCharacterStore } from '../../store/useCharacterStore';
import { HelpCircle } from 'lucide-react';
import { AbaFicha } from './abas/AbaFicha';
import { AbaPericias } from './abas/AbaPericias';
import { AbaInventario } from './abas/AbaInventario';
import { AbaPoderes } from './abas/AbaPoderes';
import { AbaHabilidades } from './abas/AbaHabilidades';
import { AbaAtaques } from './abas/AbaAtaques';
import { AbaMagias } from './abas/AbaMagias';
import { AbaAliados } from './abas/AbaAliados';
import { AbaNotas } from './abas/AbaNotas';


const TABS = ['Ficha', 'Perícias', 'Inventário', 'Poderes', 'Habilidades', 'Ataques', 'Magias', 'Aliados', 'Notas'];

export const PersonagemSheet: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { characters, isLoading, fetchCharacters, updateCharacter } = useCharacterStore();

  const [activeTab, setActiveTab] = useState('Ficha');

  useEffect(() => {
    fetchCharacters();
  }, [fetchCharacters]);

  const character = characters.find((c) => c.id === id);

  if (isLoading && !character) {
    return (
      <div className="pl-32 pr-12 pt-12 pb-24 relative z-10 w-full min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-yellow-600/20 border-t-yellow-600 rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-400">Carregando Grimório...</p>
        </div>
      </div>
    );
  }

  if (!character) {
    return (
      <div className="pl-32 pr-12 pt-12 pb-24 relative z-10 w-full min-h-screen flex items-center justify-center">
        <div className="text-center space-y-4">
          <p className="text-red-400 text-lg">Personagem não encontrado.</p>
          <p className="text-gray-500 text-sm">O ID solicitado não existe ou foi arquivado.</p>
          <button
            onClick={() => navigate('/ficha')}
            className="mt-4 px-6 py-2 rounded-full bg-white/5 hover:bg-white/10 border border-white/10 text-white transition-colors"
          >
            ← Voltar para Fichas
          </button>
        </div>
      </div>
    );
  }

  const handleUpdate = async (path: string[], value: any) => {
    const updatedCharacter = { ...character };
    
    if (path.length === 1) {
      (updatedCharacter as any)[path[0]] = value;
    } else if (path[0] === 'ficha') {
      const root = { ...(character.ficha || {}) };
      let current: any = root;
      for (let i = 1; i < path.length - 1; i++) {
        current[path[i]] = { ...(current[path[i]] || {}) };
        current = current[path[i]];
      }
      current[path[path.length - 1]] = value;
      updatedCharacter.ficha = root;
    }
    
    await updateCharacter(character.id, updatedCharacter);
  };

  const renderHeader = () => (
    <div className="bg-[#0f0e15] border border-white/5 rounded-2xl p-6 mb-8 shadow-2xl relative flex justify-between items-start">
      <div>
        <h4 className="text-yellow-600 text-xs font-bold tracking-widest uppercase mb-2">
          Personagem da Campanha Atual
        </h4>
        <h1 className="text-4xl text-white mb-2" style={{ fontFamily: 'Cinzel, serif' }}>
          {character.nome?.toUpperCase() || 'DESCONHECIDO'}
        </h1>
        <p className="text-gray-400 text-sm">
          Nível {character.nivel} • {character.ficha?.racaId || 'Sem Raça'} • {character.ficha?.classeId || 'Sem Classe'}
        </p>
      </div>
      <button className="w-10 h-10 rounded-full border border-yellow-600/30 flex items-center justify-center text-yellow-600 hover:bg-yellow-600/10 transition-colors">
        <HelpCircle size={18} />
      </button>
    </div>
  );

  const renderTabs = () => (
    <div className="flex flex-wrap items-center gap-3 mb-8 border-b border-white/5 pb-8">
      {TABS.map(tab => (
        <button
          key={tab}
          onClick={() => setActiveTab(tab)}
          className={`px-5 py-2.5 rounded-full text-sm font-bold transition-all duration-300 ${
            activeTab === tab 
              ? 'bg-[#D4AF37] text-black shadow-[0_0_15px_rgba(212,175,55,0.4)]' 
              : 'bg-[#15141b] text-gray-400 border border-white/5 hover:border-white/20'
          }`}
        >
          {tab}
        </button>
      ))}
    </div>
  );

  const renderActiveTab = () => {
    const props = { character, onUpdate: handleUpdate };
    
    switch (activeTab) {
      case 'Ficha': return <AbaFicha {...props} />;
      case 'Perícias': return <AbaPericias {...props} />;
      case 'Inventário': return <AbaInventario {...props} />;
      case 'Poderes': return <AbaPoderes {...props} />;
      case 'Habilidades': return <AbaHabilidades {...props} />;
      case 'Ataques': return <AbaAtaques {...props} />;
      case 'Magias': return <AbaMagias {...props} />;
      case 'Aliados': return <AbaAliados {...props} />;
      case 'Notas': return <AbaNotas {...props} />;
      default: return null;
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="pl-24 md:pl-32 pr-4 md:pr-12 pt-8 md:pt-12 pb-24 relative w-full min-h-screen bg-[#07060a] overflow-x-hidden"
    >
      <div className="max-w-6xl mx-auto">
        <button onClick={() => navigate('/ficha')} className="text-gray-500 hover:text-white mb-6 text-sm font-bold uppercase tracking-wider flex items-center gap-2">
          &larr; Voltar
        </button>
        
        {renderHeader()}
        {renderTabs()}

        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
          >
            {renderActiveTab()}
          </motion.div>
        </AnimatePresence>
      </div>
    </motion.div>
  );
};

