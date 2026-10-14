import { Link } from 'react-router-dom';
import { BookOpen, Clock, LockKeyhole, Pencil, Sparkles } from 'lucide-react';
import type { RegraTopic } from '../../../../data/regras/tipos';
import { tempoDeLeituraEmMinutos } from '../../../../data/regras/livro';

export interface TopicoDeAtalho {
  id: string;
  titulo: string;
}

interface CabecalhoDoTopicoProps {
  titulo: string;
  /** "3.4" */
  numero: string;
  capitulo: { numero: number; titulo: string };
  topico: RegraTopic;
  /** Tópicos que convém ler antes deste, já filtrados pelo que o leitor pode abrir. */
  antesDeLer: TopicoDeAtalho[];
  onAbrirTopico: (idDoTopico: string) => void;
  /** Link do PDF já na página deste tópico, quando existe PDF publicado. */
  linkDoPdf: { href: string; pagina: number } | null;
  /** Para onde o botão Editar leva; ausente quando a pessoa não edita conteúdo. */
  linkDeEdicao: string | null;
}

export const CabecalhoDoTopico = ({
  titulo,
  numero,
  capitulo,
  topico,
  antesDeLer,
  onAbrirTopico,
  linkDoPdf,
  linkDeEdicao,
}: CabecalhoDoTopicoProps) => {
  const minutos = tempoDeLeituraEmMinutos(topico.corpo);
  const soMestre = topico.categoria === 'Guia do Mestre';

  return (
    <header className="mb-10 border-b border-[rgb(var(--acento)/0.28)] pb-8">
      <div className="mb-5 flex flex-wrap items-center gap-x-3 gap-y-2 text-[10px] font-bold uppercase tracking-[0.22em]">
        <span className="text-[rgb(var(--acento-forte))]">Capítulo {capitulo.numero} · {capitulo.titulo}</span>
        <span aria-hidden="true" className="text-gray-700">◆</span>
        <span className="text-gray-500">Tópico {numero}</span>
        <span className="ml-auto flex flex-wrap items-center gap-2">
          {linkDeEdicao ? (
            <Link
              to={linkDeEdicao}
              className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-gray-300 transition hover:border-[rgb(var(--acento)/0.45)] hover:text-[rgb(var(--acento-forte))]"
            >
              <Pencil size={11} /> Editar
            </Link>
          ) : null}
          <span className="inline-flex items-center gap-1.5 rounded-full border border-[rgb(var(--acento)/0.3)] bg-[rgb(var(--acento)/0.12)] px-3 py-1 text-[rgb(var(--acento-forte))]">
            {soMestre ? <LockKeyhole size={11} /> : <Sparkles size={11} />} {topico.status}
          </span>
        </span>
      </div>

      <h1 className="text-3xl font-bold leading-tight text-[#f2ead7] sm:text-4xl lg:text-5xl" style={{ fontFamily: 'Cinzel, serif' }}>
        {titulo}
      </h1>
      <p className="mt-5 max-w-[68ch] text-base leading-8 text-gray-300/85 sm:text-lg">{topico.resumo}</p>

      <div className="mt-5 flex flex-wrap items-center gap-x-5 gap-y-2 text-xs text-gray-500">
        <span className="inline-flex items-center gap-1.5">
          <Clock size={13} aria-hidden="true" /> {minutos} {minutos === 1 ? 'minuto' : 'minutos'} de leitura
        </span>
        {linkDoPdf ? (
          <a
            href={linkDoPdf.href}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 text-[rgb(var(--acento-forte))] underline decoration-dotted underline-offset-4 hover:decoration-solid"
          >
            <BookOpen size={13} aria-hidden="true" /> Ler no PDF, página {linkDoPdf.pagina}
          </a>
        ) : null}
      </div>

      {topico.destaques?.length ? (
        <dl
          aria-label="O essencial deste tópico"
          className="mt-6 grid grid-cols-[repeat(auto-fit,minmax(min(100%,12.5rem),1fr))] gap-2.5"
        >
          {topico.destaques.map(([rotulo, valor]) => (
            <div
              key={`${rotulo}-${valor}`}
              className="rounded-xl border border-[rgb(var(--acento)/0.25)] bg-[rgb(var(--acento)/0.07)] px-3.5 py-2.5"
            >
              <dt className="text-[9px] font-bold uppercase tracking-[0.18em] text-[rgb(var(--acento-forte))]">{rotulo}</dt>
              <dd className="mt-1 text-sm font-semibold leading-5 text-gray-100">{valor}</dd>
            </div>
          ))}
        </dl>
      ) : null}

      {antesDeLer.length ? (
        <nav aria-label="Antes de ler" className="mt-6 flex flex-wrap items-center gap-2 text-xs">
          <span className="font-bold uppercase tracking-[0.16em] text-gray-500">Antes de ler</span>
          {antesDeLer.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => onAbrirTopico(item.id)}
              className="rounded-full border border-white/12 px-3 py-1 text-gray-300 transition hover:border-[rgb(var(--acento)/0.5)] hover:text-[rgb(var(--acento-forte))]"
            >
              {item.titulo}
            </button>
          ))}
        </nav>
      ) : null}
    </header>
  );
};
