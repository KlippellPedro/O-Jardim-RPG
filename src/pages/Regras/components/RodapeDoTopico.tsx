import { ArrowLeft, ArrowRight } from 'lucide-react';

export interface TopicoVizinho {
  id: string;
  titulo: string;
  numero: string;
  resumo: string;
}

interface RodapeDoTopicoProps {
  anterior: TopicoVizinho | null;
  proximo: TopicoVizinho | null;
  /** Tópicos relacionados, além do anterior e do próximo. */
  vejaTambem?: TopicoVizinho[];
  onAbrirTopico: (idDoTopico: string) => void;
  onVoltarAoInicio: () => void;
}

/** O fim do tópico aponta para onde seguir, com o resumo do próximo para a pessoa saber o que vem. */
export const RodapeDoTopico = ({ anterior, proximo, vejaTambem = [], onAbrirTopico, onVoltarAoInicio }: RodapeDoTopicoProps) => (
  <footer className="mt-16 border-t border-[rgb(var(--acento)/0.28)] pt-8">
    <div className="flex items-center justify-between gap-4">
      <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-gray-500">
        {proximo ? 'Continue lendo' : 'Fim do livro'}
      </p>
      <button
        type="button"
        onClick={onVoltarAoInicio}
        className="text-xs text-gray-500 underline decoration-dotted underline-offset-4 transition hover:text-[rgb(var(--acento-forte))]"
      >
        Ver todos os tópicos
      </button>
    </div>
    <div className="mt-4 grid gap-3 sm:grid-cols-2">
      {anterior ? (
        <button
          type="button"
          onClick={() => onAbrirTopico(anterior.id)}
          className="group flex min-w-0 items-start gap-3 rounded-2xl border border-white/10 bg-black/20 p-4 text-left transition hover:border-[rgb(var(--acento)/0.45)] hover:bg-[rgb(var(--acento)/0.05)]"
        >
          <ArrowLeft size={18} className="mt-0.5 shrink-0 text-gray-600 transition group-hover:text-[rgb(var(--acento-forte))]" />
          <span className="min-w-0">
            <small className="block text-[9px] font-bold uppercase tracking-[0.18em] text-gray-500">Anterior · {anterior.numero}</small>
            <strong className="mt-1 block truncate text-sm text-gray-200">{anterior.titulo}</strong>
          </span>
        </button>
      ) : <span className="hidden sm:block" />}
      {proximo ? (
        <button
          type="button"
          onClick={() => onAbrirTopico(proximo.id)}
          className="group flex min-w-0 items-start justify-between gap-3 rounded-2xl border border-[rgb(var(--acento)/0.3)] bg-[rgb(var(--acento)/0.07)] p-4 text-left transition hover:border-[rgb(var(--acento)/0.6)] hover:bg-[rgb(var(--acento)/0.12)] sm:col-start-2"
        >
          <span className="min-w-0">
            <small className="block text-[9px] font-bold uppercase tracking-[0.18em] text-[rgb(var(--acento-forte))]">Próximo · {proximo.numero}</small>
            <strong className="mt-1 block text-base text-[#f2ead7]" style={{ fontFamily: 'Cinzel, serif' }}>{proximo.titulo}</strong>
            <span className="mt-1.5 line-clamp-2 block text-xs leading-5 text-gray-400">{proximo.resumo}</span>
          </span>
          <ArrowRight size={18} className="mt-0.5 shrink-0 text-[rgb(var(--acento-forte))] transition group-hover:translate-x-0.5" />
        </button>
      ) : null}
    </div>
    {vejaTambem.length > 0 ? (
      <div className="mt-6 flex flex-wrap items-center gap-2">
        <span className="mr-1 text-[10px] font-bold uppercase tracking-[0.22em] text-gray-500">Veja também</span>
        {vejaTambem.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => onAbrirTopico(item.id)}
            className="rounded-full border border-white/10 bg-black/20 px-3 py-1.5 text-xs text-gray-300 transition hover:border-[rgb(var(--acento)/0.5)] hover:text-[rgb(var(--acento-forte))]"
          >
            <span className="mr-1.5 text-gray-600">{item.numero}</span>
            {item.titulo}
          </button>
        ))}
      </div>
    ) : null}
  </footer>
);
