import { ArrowLeft, ArrowRight, BookOpen, Rows3 } from 'lucide-react';
import type { ParteDoTopico } from '../partesDoTopico';

const numeroDaParte = (indice: number) => String(indice + 1).padStart(2, '0');

interface IndiceDoTopicoProps {
  /** As partes do tópico, sem a visão geral. */
  partes: ParteDoTopico[];
  onAbrirParte: (idDaParte: string) => void;
  /** Troca para o tópico inteiro numa página só. */
  onLerInteiro: () => void;
}

/** Fim da visão geral: o mapa do tópico, uma linha por parte, com a primeira frase de cada uma. */
export const IndiceDoTopico = ({ partes, onAbrirParte, onLerInteiro }: IndiceDoTopicoProps) => (
  <nav aria-labelledby="indice-do-topico" className="mt-12">
    <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 border-b border-[rgb(var(--acento)/0.25)] pb-3">
      <h2 id="indice-do-topico" className="text-[11px] font-bold uppercase tracking-[0.2em] text-[rgb(var(--acento-forte))]">
        Neste tópico
      </h2>
      <span className="text-xs text-gray-500">{partes.length} partes, cada uma se lê sozinha</span>
    </div>
    <ol className="mt-4 grid gap-2.5 md:grid-cols-2">
      {partes.map((parte, indice) => (
        <li key={parte.id} className="min-w-0">
          <button
            type="button"
            onClick={() => onAbrirParte(parte.id)}
            className="group flex h-full w-full min-w-0 items-start gap-3.5 rounded-2xl border border-white/[0.08] bg-white/[0.02] px-4 py-3.5 text-left transition hover:border-[rgb(var(--acento)/0.45)] hover:bg-[rgb(var(--acento)/0.06)]"
          >
            <span className="mt-0.5 shrink-0 font-mono text-xs font-bold text-[rgb(var(--acento-forte))] opacity-80">{numeroDaParte(indice)}</span>
            <span className="min-w-0 flex-1">
              <strong className="block text-[15px] font-semibold leading-6 text-[#f2ead7]">{parte.titulo}</strong>
              {parte.resumo ? <span className="mt-1 line-clamp-2 text-[13px] leading-5 text-gray-400">{parte.resumo}</span> : null}
            </span>
            <ArrowRight size={16} aria-hidden="true" className="mt-1 shrink-0 text-gray-600 transition group-hover:translate-x-0.5 group-hover:text-[rgb(var(--acento-forte))]" />
          </button>
        </li>
      ))}
    </ol>
    <div className="mt-7 flex flex-wrap items-center gap-x-5 gap-y-3">
      <button
        type="button"
        onClick={() => onAbrirParte(partes[0].id)}
        className="inline-flex items-center gap-2 rounded-xl bg-[rgb(var(--acento-forte))] px-5 py-2.5 text-sm font-bold text-[#17130b] transition hover:brightness-110"
      >
        <BookOpen size={16} aria-hidden="true" /> Começar pela parte 1
      </button>
      <button
        type="button"
        onClick={onLerInteiro}
        className="inline-flex items-center gap-2 text-xs text-gray-500 underline decoration-dotted underline-offset-4 transition hover:text-[rgb(var(--acento-forte))]"
      >
        <Rows3 size={14} aria-hidden="true" /> Ler o tópico inteiro numa página só
      </button>
    </div>
  </nav>
);

interface CabecalhoDaParteProps {
  /** "3.1" */
  numeroDoTopico: string;
  tituloDoTopico: string;
  /** Posição da parte entre as partes do tópico, a partir de 0 (a visão geral não conta). */
  indice: number;
  total: number;
  onVoltarAVisaoGeral: () => void;
}

/** Topo de uma parte: de onde ela vem e em que ponto do tópico a pessoa está. O título é o da seção. */
export const CabecalhoDaParte = ({ numeroDoTopico, tituloDoTopico, indice, total, onVoltarAVisaoGeral }: CabecalhoDaParteProps) => (
  <header className="mb-7 flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
    <button
      type="button"
      onClick={onVoltarAVisaoGeral}
      title="Voltar à visão geral do tópico"
      className="group inline-flex min-w-0 items-center gap-2 text-[11px] font-bold uppercase tracking-[0.18em] text-[rgb(var(--acento-forte))]"
    >
      <ArrowLeft size={14} aria-hidden="true" className="shrink-0 transition group-hover:-translate-x-0.5" />
      <span className="truncate">{numeroDoTopico} {tituloDoTopico}</span>
    </button>
    <span className="flex items-center gap-2 text-[11px] font-semibold text-gray-500">
      <span className="hidden gap-1 sm:flex" aria-hidden="true">
        {Array.from({ length: total }, (_, posicao) => (
          <span
            key={posicao}
            className={`h-1 rounded-full ${posicao === indice ? 'w-4 bg-[rgb(var(--acento-forte))]' : posicao < indice ? 'w-1.5 bg-[rgb(var(--acento)/0.55)]' : 'w-1.5 bg-white/15'}`}
          />
        ))}
      </span>
      Parte {indice + 1} de {total}
    </span>
  </header>
);

interface PaginadorDoTopicoProps {
  partes: ParteDoTopico[];
  /** Posição da parte aberta, a partir de 0 (a visão geral não conta). */
  indice: number;
  onAbrirParte: (idDaParte: string) => void;
  onVoltarAVisaoGeral: () => void;
}

/** Pé de uma parte: a próxima parte em destaque, com a primeira frase dela, e a anterior ao lado. */
export const PaginadorDoTopico = ({ partes, indice, onAbrirParte, onVoltarAVisaoGeral }: PaginadorDoTopicoProps) => {
  const anterior = indice > 0 ? partes[indice - 1] : null;
  const proxima = indice < partes.length - 1 ? partes[indice + 1] : null;
  return (
    <nav aria-label="Partes deste tópico" className="mt-14 grid gap-3 border-t border-white/10 pt-6 sm:grid-cols-2">
      <button
        type="button"
        onClick={() => (anterior ? onAbrirParte(anterior.id) : onVoltarAVisaoGeral())}
        className="group flex min-w-0 items-center gap-3 rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-left transition hover:border-[rgb(var(--acento)/0.45)]"
      >
        <ArrowLeft size={16} aria-hidden="true" className="shrink-0 text-gray-600 transition group-hover:text-[rgb(var(--acento-forte))]" />
        <span className="min-w-0">
          <small className="block text-[9px] font-bold uppercase tracking-[0.18em] text-gray-500">
            {anterior ? `Anterior · ${numeroDaParte(indice - 1)}` : 'Voltar'}
          </small>
          <strong className="mt-0.5 block truncate text-sm font-semibold text-gray-200">{anterior ? anterior.titulo : 'Visão geral do tópico'}</strong>
        </span>
      </button>
      {proxima ? (
        <button
          type="button"
          onClick={() => onAbrirParte(proxima.id)}
          className="group flex min-w-0 items-start justify-between gap-3 rounded-2xl border border-[rgb(var(--acento)/0.32)] bg-[rgb(var(--acento)/0.08)] px-4 py-3 text-left transition order-first hover:border-[rgb(var(--acento)/0.6)] hover:bg-[rgb(var(--acento)/0.13)] sm:order-none"
        >
          <span className="min-w-0">
            <small className="block text-[9px] font-bold uppercase tracking-[0.18em] text-[rgb(var(--acento-forte))]">Próxima · {numeroDaParte(indice + 1)}</small>
            <strong className="mt-0.5 block text-[15px] font-semibold text-[#f2ead7]">{proxima.titulo}</strong>
            {proxima.resumo ? <span className="mt-1 line-clamp-2 text-xs leading-5 text-gray-400">{proxima.resumo}</span> : null}
          </span>
          <ArrowRight size={16} aria-hidden="true" className="mt-0.5 shrink-0 text-[rgb(var(--acento-forte))] transition group-hover:translate-x-0.5" />
        </button>
      ) : (
        <p className="order-first flex items-center rounded-2xl border border-dashed border-white/10 px-4 py-3 text-xs leading-5 text-gray-500 sm:order-none">
          Esta é a última parte do tópico.
        </p>
      )}
    </nav>
  );
};
