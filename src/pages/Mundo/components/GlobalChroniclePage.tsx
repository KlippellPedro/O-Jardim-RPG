import React, { useCallback, useMemo } from 'react';
import { ArrowLeft, BookOpen, GitBranch, History } from 'lucide-react';
import { ARVORES } from '../../../../data/mundo/arvoresCatalog';
import { ChronicleEvent, type WorldChronicleCatalog } from '../worldChronicles';
import { ChronicleTimeline } from './ChronicleTimeline';

interface GlobalChroniclePageProps {
  visibleTreeIds: string[];
  chronicles: WorldChronicleCatalog;
  onBack: () => void;
  onOpenTree: (treeId: string) => void;
}

export const GlobalChroniclePage: React.FC<GlobalChroniclePageProps> = ({ visibleTreeIds, chronicles, onBack, onOpenTree }) => {
  const visible = useMemo(() => new Set(visibleTreeIds), [visibleTreeIds]);
  const events = useMemo(() => chronicles.linha_tempo_geral.filter((event) => (
    !event.arvores?.length || event.arvores.every((treeId) => visible.has(treeId))
  )), [chronicles, visible]);

  const labelForTrees = useCallback((event: ChronicleEvent) => (event.arvores || [])
    .filter((id) => visible.has(id))
    .map((id) => ARVORES.find((tree) => tree.id === id)?.nome)
    .filter(Boolean)
    .join(' · '), [visible]);

  return (
    <main className="app-detail-page relative z-10 min-h-screen overflow-x-hidden">
      <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(circle_at_70%_0%,rgba(202,138,4,0.16),transparent_34%),linear-gradient(180deg,#08070b_0%,#050508_100%)]" />
      <header className="relative mx-auto max-w-6xl px-5 pb-14 pt-8 md:px-10 md:pb-20 md:pt-12">
        <button type="button" onClick={onBack} className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-black/30 px-4 py-2 text-sm text-gray-300 transition hover:border-white/30 hover:text-white">
          <ArrowLeft size={16} /> Voltar às órbitas
        </button>
        <div className="mt-14 max-w-4xl">
          <div className="mb-5 flex items-center gap-3 text-xs font-bold uppercase tracking-[0.32em] text-yellow-500">
            <History size={18} /> Crônica compartilhada
          </div>
          <h1 className="text-4xl font-bold leading-tight text-white sm:text-6xl md:text-7xl" style={{ fontFamily: 'Cinzel, serif' }}>
            Linha do Tempo do Jardim
          </h1>
          <p className="mt-6 text-lg leading-8 text-gray-400 md:text-xl">
            Quase nada aqui aconteceu dentro de uma Árvore só. Esta linha junta os marcos que mexeram com o Jardim inteiro, na ordem em que os registros dizem que aconteceram.
          </p>
        </div>
      </header>

      <div className="relative mx-auto grid max-w-6xl gap-8 px-5 md:px-10 lg:grid-cols-[minmax(0,1fr)_280px]">
        <section className="performance-expensive-effects rounded-3xl border border-white/10 bg-[#0d0c12]/80 p-6 shadow-2xl backdrop-blur-xl md:p-9">
          <ChronicleTimeline events={events} color="#d6ae43" eventMeta={labelForTrees} />
        </section>

        <aside className="performance-expensive-effects h-fit rounded-3xl border border-white/10 bg-[#0d0c12]/80 p-5 backdrop-blur-xl lg:sticky lg:top-6">
          <div className="mb-5 flex items-center gap-2 text-yellow-500">
            <GitBranch size={18} />
            <h2 className="font-bold text-white">Crônicas individuais</h2>
          </div>
          <div className="space-y-2">
            {ARVORES.filter((tree) => visible.has(tree.id)).map((tree) => (
              <button key={tree.id} type="button" onClick={() => onOpenTree(tree.id)} className="flex w-full items-center justify-between rounded-xl border border-transparent px-3 py-3 text-left text-sm text-gray-400 transition hover:border-white/10 hover:bg-white/[0.03] hover:text-white">
                <span>{tree.nome}</span>
                <BookOpen size={14} style={{ color: `rgb(${tree.rgb})` }} />
              </button>
            ))}
          </div>
        </aside>
      </div>
    </main>
  );
};
