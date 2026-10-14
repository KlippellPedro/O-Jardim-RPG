import { useEffect, useState } from 'react';
import { ChevronDown, ChevronRight, Compass, FileDown, Library, Search, X } from 'lucide-react';
import type { CapituloNumerado } from '../../../../data/regras/livro';
import { estiloDoAcento } from '../acento';
import type { SubtopicoNavegacao } from './LandingDoLivro';

interface NavegacaoDoLivroProps {
  topicoAtivo: string;
  /** Capítulos e tópicos que passaram pela busca. */
  capitulos: CapituloNumerado[];
  subtopicos: Record<string, SubtopicoNavegacao[]>;
  subtopicoAtivo: string | null;
  onAbrirSubtopico: (topico: string, subtopico: string) => void;
  busca: string;
  onBuscaChange: (valor: string) => void;
  onAbrirTopico: (topico: string) => void;
  onVoltarAoInicio: () => void;
  onAbrirGuia: () => void;
  /** Endereço para baixar o PDF; ausente quando não há PDF publicado. */
  linkDoPdf: string | null;
  onClose?: () => void;
}

/** A lista de tópicos do livro, em capítulos que abrem e fecham. */
export const NavegacaoDoLivro = ({
  topicoAtivo,
  capitulos,
  subtopicos,
  subtopicoAtivo,
  onAbrirSubtopico,
  busca,
  onBuscaChange,
  onAbrirTopico,
  onVoltarAoInicio,
  onAbrirGuia,
  linkDoPdf,
  onClose,
}: NavegacaoDoLivroProps) => {
  const capituloDoAtivo = capitulos.find((capitulo) => capitulo.topicos.some((topico) => topico.id === topicoAtivo))?.id;
  const [abertos, setAbertos] = useState<Set<string>>(
    () => new Set([capituloDoAtivo ?? capitulos[0]?.id].filter(Boolean) as string[]),
  );

  useEffect(() => {
    if (!capituloDoAtivo) return;
    setAbertos((atuais) => (atuais.has(capituloDoAtivo) ? atuais : new Set([...atuais, capituloDoAtivo])));
  }, [capituloDoAtivo]);

  const buscando = busca.trim().length > 0;

  const alternar = (id: string) => {
    setAbertos((atuais) => {
      const proximos = new Set(atuais);
      if (proximos.has(id)) proximos.delete(id);
      else proximos.add(id);
      return proximos;
    });
  };

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="flex items-start justify-between border-b border-white/10 px-5 pb-5 pt-1">
        <div>
          <span className="mb-2 flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.28em] text-[#c7a44c]">
            <Library size={14} /> Biblioteca
          </span>
          <button
            type="button"
            onClick={() => {
              onVoltarAoInicio();
              onClose?.();
            }}
            className="text-left"
            title="Voltar à página inicial do livro"
          >
            <h2 className="text-xl font-bold text-white" style={{ fontFamily: 'Cinzel, serif' }}>Livro de Regras</h2>
          </button>
          <p className="mt-1 text-xs text-gray-500">O livro em tópicos, capítulo por capítulo</p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          {linkDoPdf ? (
            <a
              href={linkDoPdf}
              aria-label="Baixar o livro em PDF"
              title="Baixar o livro em PDF"
              className="rounded-lg border border-white/10 p-2 text-[#d8bd75] hover:border-[#c7a44c]/40 hover:text-[#e1c77e]"
            >
              <FileDown size={17} />
            </a>
          ) : null}
          <button type="button" onClick={onAbrirGuia} aria-label="Abrir guia do livro" title="Guia do livro" className="rounded-lg border border-white/10 p-2 text-[#d8bd75] hover:border-[#c7a44c]/40 hover:text-[#e1c77e]">
            <Compass size={17} />
          </button>
          {onClose ? (
            <button type="button" onClick={onClose} aria-label="Fechar tópicos" className="rounded-lg border border-white/10 p-2 text-gray-400 hover:text-white">
              <X size={18} />
            </button>
          ) : null}
        </div>
      </div>

      <label className="relative mx-5 my-4 block">
        <span className="sr-only">Buscar tópico</span>
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-600" size={16} />
        <input
          type="search"
          value={busca}
          onChange={(event) => onBuscaChange(event.target.value)}
          placeholder="Buscar no livro..."
          className="w-full rounded-xl border border-white/10 bg-black/25 py-2.5 pl-9 pr-3 text-sm text-white outline-none transition-colors placeholder:text-gray-600 focus:border-[#c7a44c]/50"
        />
      </label>

      <nav className="custom-scrollbar min-h-0 flex-1 overflow-y-auto px-3 pb-6" aria-label="Tópicos do livro de regras">
        {capitulos.length ? capitulos.map((capitulo) => {
          const aberto = buscando || abertos.has(capitulo.id);
          return (
            <section key={capitulo.id} className="mb-3" style={estiloDoAcento(capitulo.id)}>
              <button
                type="button"
                onClick={() => alternar(capitulo.id)}
                aria-expanded={aberto}
                className="flex w-full items-center justify-between gap-2 rounded-lg px-2 py-2 text-left text-[10px] font-bold uppercase tracking-[0.18em] text-gray-500 hover:text-gray-300"
              >
                <span className="flex min-w-0 items-center gap-2">
                  <span aria-hidden="true" className="h-2 w-2 shrink-0 rotate-45 bg-[rgb(var(--acento))]" />
                  <span className="truncate">{capitulo.numero}. {capitulo.titulo}</span>
                </span>
                <ChevronDown size={14} className={`shrink-0 transition-transform ${aberto ? '' : '-rotate-90'}`} />
              </button>
              {aberto ? (
                <div className="mt-1 space-y-1 border-l border-[rgb(var(--acento)/0.3)] pl-2">
                  {capitulo.topicos.map((topico) => (
                    <div key={topico.id}>
                      <button
                        type="button"
                        onClick={() => {
                          onAbrirTopico(topico.id);
                          onClose?.();
                        }}
                        aria-current={topicoAtivo === topico.id ? 'page' : undefined}
                        className={`group flex w-full items-center justify-between gap-2 rounded-lg px-3 py-2.5 text-left text-sm transition-colors ${topicoAtivo === topico.id
                          ? 'bg-[rgb(var(--acento)/0.14)] text-[rgb(var(--acento-forte))]'
                          : 'text-gray-400 hover:bg-white/5 hover:text-white'}`}
                      >
                        <span className="flex min-w-0 items-baseline gap-2.5">
                          <span className="w-6 shrink-0 font-mono text-[10px] text-gray-600">{topico.numero}</span>
                          <span className="truncate">{topico.titulo}</span>
                        </span>
                        {topicoAtivo === topico.id ? <ChevronRight size={15} className="shrink-0 text-[rgb(var(--acento))]" /> : null}
                      </button>
                      {subtopicos[topico.id]?.length ? (
                        <ul className="mb-1 ml-3 mt-1 space-y-0.5 border-l border-[rgb(var(--acento)/0.2)] pl-2" aria-label={`Partes de ${topico.titulo}`}>
                          {subtopicos[topico.id].map((subtopico, indice) => {
                            const ativo = topicoAtivo === topico.id && (subtopicoAtivo ?? subtopicos[topico.id][0].id) === subtopico.id;
                            return (
                              <li key={subtopico.id}>
                                <button
                                  type="button"
                                  onClick={() => {
                                    onAbrirSubtopico(topico.id, subtopico.id);
                                    onClose?.();
                                  }}
                                  aria-current={ativo ? 'location' : undefined}
                                  className={`flex w-full items-center gap-2 rounded-md px-2.5 py-1.5 text-left text-[13px] transition-colors ${ativo
                                    ? 'bg-[rgb(var(--acento)/0.14)] text-[rgb(var(--acento-forte))]'
                                    : 'text-gray-500 hover:bg-white/5 hover:text-gray-200'}`}
                                >
                                  <span className="w-4 shrink-0 text-right font-mono text-[10px] text-gray-600">{indice + 1}</span>
                                  <span className="truncate">{subtopico.titulo}</span>
                                </button>
                              </li>
                            );
                          })}
                        </ul>
                      ) : null}
                    </div>
                  ))}
                </div>
              ) : null}
            </section>
          );
        }) : (
          <p className="px-3 py-8 text-center text-sm text-gray-600">Nenhum tópico encontrado.</p>
        )}
      </nav>
    </div>
  );
};
