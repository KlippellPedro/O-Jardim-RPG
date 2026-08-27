import React from 'react';
import { ChevronRight, Lock, Orbit } from 'lucide-react';
import { COSMIC_TREES } from '../cosmicTrees';

interface SimpleTreeListProps {
  lockedDeidades: Set<string>;
  onSelectTree: (id: string) => void;
  onBack: () => void;
}

/**
 * Alternativa em texto à projeção 3D, para quem não consegue ou não quer
 * navegar a cena com mouse/toque - mesmas Árvores, mesmo destino
 * (`/mundo/arvores/:id`), só que listadas por tópico em vez de orbitando.
 */
export const SimpleTreeList: React.FC<SimpleTreeListProps> = ({ lockedDeidades, onSelectTree, onBack }) => (
  <div className="flex h-full w-full flex-col overflow-y-auto bg-[#050508] p-4 custom-scrollbar sm:p-6">
    <div className="mb-4 flex shrink-0 items-center justify-between gap-3">
      <h2 className="text-sm font-bold uppercase tracking-widest text-gray-400">Árvores do Jardim</h2>
      <button
        type="button"
        onClick={onBack}
        className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-black/50 px-4 py-2 text-xs uppercase tracking-widest text-gray-300 transition-colors hover:border-white/30 hover:text-white"
      >
        <Orbit size={13} /> Ver em 3D
      </button>
    </div>

    <div className="flex flex-col gap-2">
      {COSMIC_TREES.map((tree) => {
        const isLocked = lockedDeidades.has(tree.deidadeId);
        return (
          <button
            key={tree.id}
            type="button"
            disabled={isLocked}
            onClick={() => !isLocked && onSelectTree(tree.deidadeId)}
            className="group flex w-full items-center gap-4 rounded-2xl border border-white/5 bg-black/30 p-4 text-left transition-colors enabled:hover:border-white/20 enabled:hover:bg-black/50 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <span
              className="h-3 w-3 shrink-0 rounded-full"
              style={{ backgroundColor: isLocked ? '#444444' : tree.color, boxShadow: isLocked ? 'none' : `0 0 10px ${tree.color}` }}
            />
            <span className="flex-1">
              <span className="block text-base font-bold text-white">{isLocked ? 'Desconhecida' : tree.name}</span>
              {isLocked && <span className="block text-xs italic text-gray-600">O Mestre ainda não revelou esta Árvore.</span>}
            </span>
            {isLocked
              ? <Lock size={16} className="shrink-0 text-gray-600" />
              : <ChevronRight size={16} className="shrink-0 text-gray-600 transition-colors group-hover:text-white" />}
          </button>
        );
      })}
    </div>
  </div>
);

export default SimpleTreeList;
