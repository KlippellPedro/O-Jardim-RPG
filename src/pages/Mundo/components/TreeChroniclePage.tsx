import React from 'react';
import { ArrowLeft, BookOpen, Compass, History, MapPin, Sparkles } from 'lucide-react';
import { ChronicleTimeline } from './ChronicleTimeline';
import { getTreeChronicle } from '../worldChronicles';

interface TreeChroniclePageProps {
  treeId: string;
  color: string;
  onBack: () => void;
  onOpenGlobalTimeline: () => void;
}

const sectionClass = 'content-auto-section performance-expensive-effects scroll-mt-28 rounded-3xl border border-white/10 bg-[#0d0c12]/80 p-6 shadow-2xl backdrop-blur-xl md:p-9';

export const TreeChroniclePage: React.FC<TreeChroniclePageProps> = ({
  treeId,
  color,
  onBack,
  onOpenGlobalTimeline,
}) => {
  const chronicle = getTreeChronicle(treeId);
  const rgbGlow = `${color}33`;

  if (!chronicle) {
    return (
      <main className="app-detail-page relative z-10 flex min-h-screen items-center justify-center px-5 text-center">
        <div>
          <h1 className="text-2xl font-bold text-white">Crônica não encontrada</h1>
          <button type="button" onClick={onBack} className="mt-5 rounded-full border border-white/10 px-4 py-2 text-sm text-gray-300 hover:text-white">
            Voltar às órbitas
          </button>
        </div>
      </main>
    );
  }

  return (
    <main className="app-detail-page relative z-10 min-h-screen overflow-x-hidden">
      <div
        className="pointer-events-none fixed inset-0 opacity-80"
        style={{ background: `radial-gradient(circle at 72% 8%, ${rgbGlow}, transparent 36%), linear-gradient(180deg, #08070b 0%, #050508 100%)` }}
      />

      <header className="relative mx-auto max-w-7xl px-5 pb-14 pt-8 md:px-10 md:pb-20 md:pt-12">
        <div className="mb-12 flex flex-wrap items-center justify-between gap-3">
          <button
            type="button"
            onClick={onBack}
            className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-black/30 px-4 py-2 text-sm text-gray-300 transition hover:border-white/30 hover:text-white"
          >
            <ArrowLeft size={16} /> Voltar às órbitas
          </button>
          <button
            type="button"
            onClick={onOpenGlobalTimeline}
            className="inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-semibold transition hover:bg-white/5"
            style={{ borderColor: `${color}66`, color }}
          >
            <History size={16} /> Linha do tempo geral
          </button>
        </div>

        <div className="grid items-end gap-10 lg:grid-cols-[1fr_320px]">
          <div>
            <div className="mb-5 flex items-center gap-3 text-xs font-bold uppercase tracking-[0.32em]" style={{ color }}>
              <BookOpen size={17} /> Crônica da Árvore
            </div>
            <h1 className="text-5xl font-bold tracking-wide text-white sm:text-7xl lg:text-8xl" style={{ fontFamily: 'Cinzel, serif' }}>
              {chronicle.nome}
            </h1>
            <p className="mt-5 max-w-3xl text-xl italic leading-relaxed text-gray-300 md:text-2xl">
              “{chronicle.epiteto}”
            </p>
          </div>

          <aside className="performance-expensive-effects rounded-3xl border border-white/10 bg-black/35 p-6 backdrop-blur-xl">
            <dl className="space-y-5 text-sm">
              <div>
                <dt className="text-[10px] font-bold uppercase tracking-[0.22em] text-gray-600">Deidade</dt>
                <dd className="mt-1 text-lg font-semibold text-white">{chronicle.deidade}</dd>
              </div>
              <div>
                <dt className="text-[10px] font-bold uppercase tracking-[0.22em] text-gray-600">Fluxo</dt>
                <dd className="mt-1 text-gray-300">{chronicle.fluxo}</dd>
              </div>
              <div>
                <dt className="text-[10px] font-bold uppercase tracking-[0.22em] text-gray-600">Estado atual</dt>
                <dd className="mt-1 font-semibold" style={{ color }}>{chronicle.estado}</dd>
              </div>
            </dl>
          </aside>
        </div>

        <nav className="performance-expensive-effects sticky top-3 z-30 mt-12 flex gap-2 overflow-x-auto rounded-2xl border border-white/10 bg-[#09080d]/90 p-2 shadow-2xl backdrop-blur-xl" aria-label="Capítulos desta crônica">
          {[
            ['essencia', 'Essência'],
            ['historia', 'História'],
            ['lugares', 'Lugares'],
            ['cronologia', 'Cronologia'],
          ].map(([id, label]) => (
            <a key={id} href={`#${id}`} className="shrink-0 rounded-xl px-4 py-2 text-xs font-bold uppercase tracking-widest text-gray-400 transition hover:bg-white/5 hover:text-white">
              {label}
            </a>
          ))}
        </nav>
      </header>

      <div className="relative mx-auto grid max-w-7xl gap-7 px-5 md:px-10">
        <section id="essencia" className={sectionClass}>
          <div className="mb-7 flex items-center gap-3" style={{ color }}>
            <Sparkles size={22} />
            <h2 className="text-2xl font-bold text-white md:text-3xl" style={{ fontFamily: 'Cinzel, serif' }}>Essência</h2>
          </div>
          <p className="max-w-4xl text-xl leading-9 text-gray-200 md:text-2xl">{chronicle.tese}</p>
          <div className="mt-8 rounded-2xl border-l-2 bg-black/30 p-5" style={{ borderColor: color }}>
            <p className="text-[10px] font-bold uppercase tracking-[0.24em] text-gray-600">Atmosfera</p>
            <p className="mt-2 leading-7 text-gray-400">{chronicle.atmosfera}</p>
          </div>
          <div className="mt-7 flex flex-wrap gap-2">
            {chronicle.temas.map((theme) => (
              <span key={theme} className="rounded-full border border-white/10 bg-white/[0.03] px-3 py-1.5 text-xs uppercase tracking-wider text-gray-400">
                {theme}
              </span>
            ))}
          </div>
        </section>

        <section id="historia" className={sectionClass}>
          <div className="mb-8 flex items-center gap-3" style={{ color }}>
            <BookOpen size={22} />
            <h2 className="text-2xl font-bold text-white md:text-3xl" style={{ fontFamily: 'Cinzel, serif' }}>História</h2>
          </div>
          <div className="max-w-4xl space-y-6 text-base leading-8 text-gray-300 md:text-lg md:leading-9">
            {chronicle.historia.map((paragraph) => <p key={paragraph}>{paragraph}</p>)}
          </div>
        </section>

        <section id="lugares" className={sectionClass}>
          <div className="mb-8 flex items-center gap-3" style={{ color }}>
            <Compass size={22} />
            <h2 className="text-2xl font-bold text-white md:text-3xl" style={{ fontFamily: 'Cinzel, serif' }}>Lugares do Galho</h2>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            {chronicle.lugares.map((place) => (
              <article key={place.nome} className="group rounded-2xl border border-white/10 bg-black/30 p-5 transition hover:-translate-y-0.5 hover:border-white/20">
                <div className="mb-3 flex items-center justify-between gap-4">
                  <h3 className="text-lg font-bold text-white">{place.nome}</h3>
                  <span className="rounded-full px-2.5 py-1 text-[9px] font-bold uppercase tracking-widest" style={{ backgroundColor: `${color}18`, color }}>
                    {place.tipo}
                  </span>
                </div>
                <p className="text-sm leading-7 text-gray-400">{place.resumo}</p>
                <MapPin className="mt-4 opacity-35" size={16} style={{ color }} />
              </article>
            ))}
          </div>
        </section>

        <section id="cronologia" className={sectionClass}>
          <div className="mb-10 flex flex-wrap items-end justify-between gap-4">
            <div className="flex items-center gap-3" style={{ color }}>
              <History size={22} />
              <h2 className="text-2xl font-bold text-white md:text-3xl" style={{ fontFamily: 'Cinzel, serif' }}>Linha do tempo</h2>
            </div>
            <p className="max-w-md text-sm leading-6 text-gray-500">O que se sabe desta Árvore, em ordem. Onde a data exata não sobreviveu, ficou a era.</p>
          </div>
          <ChronicleTimeline events={chronicle.cronologia} color={color} />
        </section>
      </div>
    </main>
  );
};
