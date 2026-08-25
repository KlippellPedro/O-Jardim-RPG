import { AlertTriangle, Brain, HeartPulse } from 'lucide-react';
import type { ReactNode } from 'react';
import type { ICondicaoRegra } from '../../../../data/regras/condicoes';

interface CatalogoCondicoesProps {
  condicoes: ICondicaoRegra[];
  crises: ICondicaoRegra[];
}

const Lista = ({ titulo, itens, icon }: { titulo: string; itens: ICondicaoRegra[]; icon: ReactNode }) => (
  <section>
    <h3 className="mb-4 flex items-center gap-2 text-xl font-bold text-[#f2ead7]" style={{ fontFamily: 'Cinzel, serif' }}>{icon}{titulo}</h3>
    <div className="grid gap-4 lg:grid-cols-2">
      {itens.map((item) => (
        <article key={item.id} className="rounded-2xl border border-white/10 bg-black/25 p-5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h4 className="font-bold text-[#e1c77e]">{item.titulo}</h4>
            <span className="rounded-full border border-white/10 px-2.5 py-1 text-[9px] font-bold uppercase tracking-wider text-gray-500">{item.categoria}</span>
          </div>
          <p className="mt-3 text-xs leading-5 text-gray-500"><strong className="text-gray-300">Duração:</strong> {item.duracao}</p>
          <ul className="mt-3 list-disc space-y-1.5 pl-5 text-sm leading-6 text-gray-400">{item.efeitos.map((efeito, index) => <li key={`${item.id}-${index}`}>{efeito}</li>)}</ul>
          <p className="mt-4 border-t border-white/5 pt-3 text-xs leading-5 text-gray-500"><strong className="text-gray-300">Remoção:</strong> {item.remocao}</p>
        </article>
      ))}
    </div>
  </section>
);

export function CatalogoCondicoes({ condicoes, crises }: CatalogoCondicoesProps) {
  return (
    <section className="mt-16 space-y-10 border-t border-[#c7a44c]/20 pt-10" aria-labelledby="catalogo-condicoes-titulo">
      <header>
        <span className="mb-3 flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.24em] text-[#c7a44c]"><AlertTriangle size={15} /> Referência de mesa</span>
        <h2 id="catalogo-condicoes-titulo" className="text-3xl font-bold text-[#f2ead7] sm:text-4xl" style={{ fontFamily: 'Cinzel, serif' }}>Condições e crises</h2>
        <p className="mt-3 max-w-[76ch] text-sm leading-7 text-gray-500">A automação da ficha continua seguindo as regras oficiais. Quando um mestre publicar textos personalizados aqui, eles orientam aplicações manuais na mesa.</p>
      </header>
      <Lista titulo="Condições" itens={condicoes} icon={<HeartPulse size={20} className="text-rose-300" />} />
      <Lista titulo="Crises de sanidade" itens={crises} icon={<Brain size={20} className="text-violet-300" />} />
    </section>
  );
}
