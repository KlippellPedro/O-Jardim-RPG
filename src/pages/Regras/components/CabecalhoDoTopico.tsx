import { Link } from 'react-router-dom';
import { BookOpen, Clock, LockKeyhole, Pencil, Puzzle, Sparkles } from 'lucide-react';
import type { RegraTopic } from '../../../../data/regras/tipos';
import { SELOS_DO_LIVRO, rotuloDoSelo, seloDoTopico, tempoDeLeituraEmMinutos } from '../../../../data/regras/livro';

export interface TopicoDeAtalho {
  id: string;
  titulo: string;
}

interface CabecalhoDoTopicoProps {
  /** Id do tópico, para o selo de Núcleo ou Módulo. */
  idDoTopico: string;
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
  /** Quantas partes o tópico tem quando é lido em partes; 0 quando aparece inteiro. */
  totalDePartes?: number;
}

export const CabecalhoDoTopico = ({
  idDoTopico,
  titulo,
  numero,
  capitulo,
  topico,
  antesDeLer,
  onAbrirTopico,
  linkDoPdf,
  linkDeEdicao,
  totalDePartes = 0,
}: CabecalhoDoTopicoProps) => {
  const minutos = tempoDeLeituraEmMinutos(topico.corpo);
  // Quando o texto já abre com a frase de abertura, o resumo diria a mesma coisa duas vezes seguidas.
  // Ele continua nas listas, no "próximo tópico" e na busca.
  const mostrarResumo = !/^\s*<p class="[^"]*\bregras-lead\b/.test(topico.corpo);
  const soMestre = topico.categoria === 'Guia do Mestre';
  const rotulo = rotuloDoSelo(idDoTopico, topico.status);
  const selo = seloDoTopico(idDoTopico);
  const eModulo = rotulo === SELOS_DO_LIVRO.modulo.rotulo;

  return (
    <header className="mb-9 border-b border-[rgb(var(--acento)/0.24)] pb-7">
      <div className="mb-4 flex flex-wrap items-center gap-x-3 gap-y-2 text-[10px] font-bold uppercase tracking-[0.22em]">
        <span className="text-[rgb(var(--acento-forte))]">
          <span className="hidden sm:inline">Capítulo {capitulo.numero} · {capitulo.titulo}</span>
          <span className="sm:hidden">{capitulo.titulo}</span>
        </span>
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
          <span
            title={selo && rotulo === SELOS_DO_LIVRO[selo].rotulo ? SELOS_DO_LIVRO[selo].explicacao : undefined}
            className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 ${eModulo
              ? 'border-white/15 bg-white/[0.04] text-gray-300'
              : 'border-[rgb(var(--acento)/0.3)] bg-[rgb(var(--acento)/0.12)] text-[rgb(var(--acento-forte))]'}`}
          >
            {soMestre ? <LockKeyhole size={11} /> : eModulo ? <Puzzle size={11} /> : <Sparkles size={11} />} {rotulo}
          </span>
        </span>
      </div>

      <h1 className="text-[2rem] font-bold leading-tight text-[#f2ead7] sm:text-4xl lg:text-5xl" style={{ fontFamily: 'Cinzel, serif' }}>
        {titulo}
      </h1>
      {mostrarResumo ? <p className="mt-4 max-w-[62ch] text-base leading-7 text-gray-300/85 sm:text-lg sm:leading-8">{topico.resumo}</p> : null}

      <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-gray-500">
        <span className="inline-flex items-center gap-1.5">
          <Clock size={13} aria-hidden="true" /> {minutos} {minutos === 1 ? 'minuto' : 'minutos'} de leitura
          {totalDePartes > 0 ? <span className="text-gray-600">· {totalDePartes} partes</span> : null}
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

      {antesDeLer.length ? (
        <nav aria-label="Antes de ler" className="mt-4 flex flex-wrap items-center gap-2 text-xs">
          <span className="mr-0.5 text-[10px] font-bold uppercase tracking-[0.16em] text-gray-500">Antes de ler</span>
          {antesDeLer.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => onAbrirTopico(item.id)}
              className="min-h-0 min-w-0 rounded-full border border-white/12 px-2.5 py-1 leading-4 text-gray-300 transition hover:border-[rgb(var(--acento)/0.5)] hover:text-[rgb(var(--acento-forte))]"
            >
              {item.titulo}
            </button>
          ))}
        </nav>
      ) : null}
    </header>
  );
};
