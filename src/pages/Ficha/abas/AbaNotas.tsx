import { useState } from 'react';
import { BookOpen } from 'lucide-react';

export const AbaNotas = ({ character, onUpdate }: { character: any, onUpdate: any }) => {
  const f = character.ficha || {};
  const [historia, setHistoria] = useState(f.historia || character.historia || '');
  const [anotacoes, setAnotacoes] = useState(f.notas || character.notas || '');

  const handleSaveHistoria = () => {
    onUpdate(['ficha', 'historia'], historia);
  };

  const handleSaveAnotacoes = () => {
    onUpdate(['ficha', 'notas'], anotacoes);
  };

  return (
    <div className="space-y-6">
      
      {/* HEADER */}
      <div className="bg-[#0f0e15] border border-white/5 rounded-2xl p-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-white mb-1" style={{ fontFamily: 'Cinzel, serif' }}>Anotações</h2>
          <p className="text-gray-400 text-sm">História do personagem, logs de campanha e informações extras.</p>
        </div>
        <div className="w-12 h-12 rounded-full border border-white/10 flex items-center justify-center text-gray-500">
          <BookOpen size={24} />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* HISTÓRIA */}
        <div className="bg-[#0f0e15] border border-white/5 rounded-2xl p-6 flex flex-col">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-white font-bold uppercase tracking-widest text-sm">Background / História</h3>
            <button 
              onClick={handleSaveHistoria}
              className="px-3 py-1 rounded bg-black/40 border border-white/10 text-gray-400 hover:text-white text-xs font-bold transition-all"
            >
              Salvar
            </button>
          </div>
          <textarea 
            value={historia}
            onChange={e => setHistoria(e.target.value)}
            onBlur={handleSaveHistoria}
            placeholder="Escreva a história do seu personagem..."
            className="flex-1 min-h-[300px] w-full bg-[#121118] border border-white/5 rounded-xl p-4 text-sm text-gray-300 resize-y focus:border-[#c7a44c]/50 outline-none leading-relaxed custom-scrollbar"
          />
        </div>

        {/* NOTAS DE SESSÃO */}
        <div className="bg-[#0f0e15] border border-white/5 rounded-2xl p-6 flex flex-col">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-white font-bold uppercase tracking-widest text-sm">Notas de Sessão</h3>
            <button 
              onClick={handleSaveAnotacoes}
              className="px-3 py-1 rounded bg-black/40 border border-white/10 text-gray-400 hover:text-white text-xs font-bold transition-all"
            >
              Salvar
            </button>
          </div>
          <textarea 
            value={anotacoes}
            onChange={e => setAnotacoes(e.target.value)}
            onBlur={handleSaveAnotacoes}
            placeholder="Loot, missões, nomes de NPCs..."
            className="flex-1 min-h-[300px] w-full bg-[#121118] border border-white/5 rounded-xl p-4 text-sm text-gray-300 resize-y focus:border-[#c7a44c]/50 outline-none leading-relaxed custom-scrollbar"
          />
        </div>

      </div>
    </div>
  );
};
