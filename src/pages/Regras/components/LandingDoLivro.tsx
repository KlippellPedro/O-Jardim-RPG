import { useMemo, useState, type ReactNode } from 'react';
import { motion } from 'framer-motion';
import { BookOpen, ChevronRight, Clock, LayoutGrid, LockKeyhole, Pencil, Search, Sparkles } from 'lucide-react';
import type { RegrasCatalog } from '../../../../data/regras/tipos';
import { numerarLivro, romano, tempoDeLeituraEmMinutos, TRILHAS_DE_LEITURA } from '../../../../data/regras/livro';
import { estiloDoAcento } from '../acento';
import { casaComBusca, normalizar } from '../regrasBusca';

export interface SubtopicoNavegacao {
  id: string;
  titulo: string;
}

export interface LeituraParaContinuar {
  topico: string;
  titulo: string;
  numero: string;
  progresso: number;
}

interface LandingDoLivroProps {
  disponiveis: string[];
  regras: RegrasCatalog;
  titulos: Record<string, string>;
  onAbrirTopico: (idDoTopico: string) => void;
  /** Abre o tópico no ponto em que a leitura parou. */
  onContinuar: (idDoTopico: string) => void;
  isMestre: boolean;
  podeEditarConteudo: boolean;
  /** Estantes do Guia do Mestre, mostradas como etiquetas no tópico dele. */
  subtopicos: Record<string, SubtopicoNavegacao[]>;
  /** O cartão do PDF, quando há PDF publicado. */
  cartaoDoPdf: ReactNode;
  continuar: LeituraParaContinuar | null;
}

const NOTAS_DA_LEGENDA = [
  { rotulo: 'Exemplo', cor: '104 196 214', texto: 'Uma situação resolvida passo a passo.' },
  { rotulo: 'Atenção', cor: '238 146 82', texto: 'O erro que mais aparece na mesa.' },
  { rotulo: 'Dica de mesa', cor: '124 204 152', texto: 'Um jeito de usar a regra sem travar o jogo.' },
  { rotulo: 'Regra', cor: '216 189 117', texto: 'O que vale como está escrito.' },
];

/** A página de entrada do Livro: o PDF, por onde começar, e os tópicos agrupados em capítulos. */
export const LandingDoLivro = ({
  disponiveis,
  regras,
  titulos,
  onAbrirTopico,
  onContinuar,
  isMestre,
  podeEditarConteudo,
  subtopicos,
  cartaoDoPdf,
  continuar,
}: LandingDoLivroProps) => {
  const [busca, setBusca] = useState('');
  const termo = normalizar(busca.trim());

  const capitulos = useMemo(
    () => numerarLivro(disponiveis, { titulos, comMestre: isMestre }),
    [disponiveis, titulos, isMestre],
  );
  const minutosPorTopico = useMemo(() => {
    const mapa: Record<string, number> = {};
    disponiveis.forEach((id) => {
      if (regras[id]) mapa[id] = tempoDeLeituraEmMinutos(regras[id].corpo);
    });
    return mapa;
  }, [disponiveis, regras]);

  const capitulosVisiveis = capitulos
    .map((capitulo) => ({
      ...capitulo,
      topicos: capitulo.topicos.filter((topico) => casaComBusca(`${topico.titulo} ${regras[topico.id]?.resumo ?? ''}`, termo)),
    }))
    .filter((capitulo) => capitulo.topicos.length > 0);
  const totalDeTopicos = capitulosVisiveis.reduce((total, capitulo) => total + capitulo.topicos.length, 0);

  const existentes = new Set(disponiveis);
  const trilhas = TRILHAS_DE_LEITURA
    .filter((trilha) => isMestre || !trilha.soMestre)
    .map((trilha) => ({ ...trilha, passos: trilha.passos.filter((id) => existentes.has(id)) }))
    .filter((trilha) => trilha.passos.length >= 2);
  const tituloDe = (id: string) => titulos[id] ?? id;

  return (
    <motion.div key="inicio-regras" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="mx-auto w-full max-w-[82.5rem] px-5 py-8 sm:px-8 lg:px-12 lg:py-12">
      <div className="border-b border-[#c7a44c]/20 pb-8">
        <span className="text-[10px] font-bold uppercase tracking-[0.22em] text-[#c7a44c]">Livro de Regras</span>
        <h1 data-descoberta="erudito" data-cliques="5" className="mt-4 font-serif text-3xl font-bold text-[#f2ead7] sm:text-5xl">O que você precisa descobrir?</h1>
        <p className="mt-5 max-w-3xl text-base leading-8 text-gray-300/80">
          Leia em tópicos, um assunto por vez, ou baixe o livro inteiro em PDF. Os tópicos disponíveis para você estão agrupados em
          capítulos logo abaixo, e a busca procura pelo nome e pela descrição.
        </p>
        <label data-tour="regras-busca" className="relative mt-6 block max-w-3xl">
          <span className="sr-only">Buscar em todos os tópicos</span>
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-[#d8bd75]/65" size={18} />
          <input
            type="search"
            value={busca}
            onChange={(event) => setBusca(event.target.value)}
            placeholder="Buscar classe, combate, viagem, magia..."
            className="w-full rounded-2xl border border-white/15 bg-black/35 py-4 pl-11 pr-4 text-sm text-white shadow-inner outline-none transition placeholder:text-gray-500 hover:border-white/25 focus:border-[#c7a44c]/60 focus:bg-black/45 sm:pr-24"
          />
          <span className="pointer-events-none absolute right-4 top-1/2 hidden -translate-y-1/2 text-[10px] font-bold uppercase tracking-[0.12em] text-gray-500 sm:block">
            {totalDeTopicos} {totalDeTopicos === 1 ? 'tópico' : 'tópicos'}
          </span>
        </label>
      </div>

      {!termo ? cartaoDoPdf : null}

      {!termo && continuar ? (
        <button
          type="button"
          onClick={() => onContinuar(continuar.topico)}
          className="group mt-6 flex w-full items-center gap-4 rounded-2xl border border-[#c7a44c]/30 bg-[#c7a44c]/[0.07] p-4 text-left transition hover:border-[#c7a44c]/60 hover:bg-[#c7a44c]/[0.12] sm:p-5"
        >
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-[#c7a44c]/40 bg-[#c7a44c]/15 text-[#e1c77e]">
            <BookOpen size={18} />
          </span>
          <span className="min-w-0 flex-1">
            <small className="block text-[10px] font-bold uppercase tracking-[0.18em] text-[#c7a44c]">Continuar de onde você parou</small>
            <strong className="mt-0.5 block truncate text-base text-[#f2ead7]">{continuar.numero} · {continuar.titulo}</strong>
            <span className="mt-2 block h-1 overflow-hidden rounded-full bg-white/10" aria-hidden="true">
              <span className="block h-full rounded-full bg-[#d8bd75]" style={{ width: `${Math.round(continuar.progresso * 100)}%` }} />
            </span>
          </span>
          <ChevronRight size={18} className="shrink-0 text-[#d8bd75] transition group-hover:translate-x-0.5" />
        </button>
      ) : null}

      {!termo && trilhas.length ? (
        <section data-tour="regras-trilhas" aria-labelledby="regras-trilhas-titulo" className="mt-8">
          <h2 id="regras-trilhas-titulo" className="text-[10px] font-bold uppercase tracking-[0.22em] text-gray-500">Por onde começar</h2>
          <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
            {trilhas.map((trilha) => (
              <article key={trilha.id} className="flex flex-col rounded-2xl border border-white/10 bg-white/[0.02] p-5">
                <h3 className="font-serif text-lg font-bold text-[#f2ead7]">{trilha.titulo}</h3>
                <p className="mt-1.5 text-xs leading-5 text-gray-400">{trilha.para}</p>
                <ol className="mt-4 space-y-1.5">
                  {trilha.passos.map((id, indice) => (
                    <li key={id}>
                      <button
                        type="button"
                        onClick={() => onAbrirTopico(id)}
                        className="group flex w-full items-start gap-2.5 rounded-lg px-2 py-1.5 text-left text-sm text-gray-300 transition hover:bg-[#c7a44c]/10 hover:text-[#f2ead7]"
                      >
                        <span className="mt-px flex h-5 w-5 shrink-0 items-center justify-center rounded-full border border-[#c7a44c]/40 text-[10px] font-bold text-[#d8bd75]">{indice + 1}</span>
                        <span className="leading-5">{tituloDe(id)}</span>
                      </button>
                    </li>
                  ))}
                </ol>
              </article>
            ))}
          </div>
        </section>
      ) : null}

      <section data-tour="regras-legenda" className="mt-8 rounded-2xl border border-white/10 bg-white/[0.02] p-5 sm:p-6">
        <h2 className="text-[10px] font-bold uppercase tracking-[0.22em] text-gray-500">Como ler este livro</h2>
        <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="flex items-start gap-3">
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-emerald-300/25 bg-emerald-400/10 text-emerald-200"><BookOpen size={15} /></span>
            <div>
              <strong className="block text-sm text-gray-200">Comece por aqui</strong>
              <p className="mt-0.5 text-xs leading-5 text-gray-500">O ponto de partida antes de qualquer outro tópico.</p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-[#c7a44c]/25 bg-[#c7a44c]/10 text-[#d8bd75]"><Sparkles size={15} /></span>
            <div>
              <strong className="block text-sm text-gray-200">Regra oficial</strong>
              <p className="mt-0.5 text-xs leading-5 text-gray-500">Explica como um sistema do jogo funciona, valendo para qualquer mesa.</p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-sky-300/25 bg-sky-400/10 text-sky-200"><LayoutGrid size={15} /></span>
            <div>
              <strong className="block text-sm text-gray-200">Catálogo oficial</strong>
              <p className="mt-0.5 text-xs leading-5 text-gray-500">Listas para consultar (raças, classes, magias, itens), não para ler de uma vez.</p>
            </div>
          </div>
          {isMestre ? (
            <div className="flex items-start gap-3">
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-[#c7a44c]/25 bg-[#c7a44c]/10 text-[#cbb87e]"><LockKeyhole size={15} /></span>
              <div>
                <strong className="block text-sm text-gray-200">Somente Mestre</strong>
                <p className="mt-0.5 text-xs leading-5 text-gray-500">Só aparece para quem conduz a mesa: orientações de preparo e condução.</p>
              </div>
            </div>
          ) : null}
        </div>
        <ul className="mt-5 grid grid-cols-1 gap-x-6 gap-y-2.5 border-t border-white/10 pt-4 sm:grid-cols-2 lg:grid-cols-4" aria-label="Caixas que aparecem nos tópicos">
          {NOTAS_DA_LEGENDA.map((nota) => (
            <li key={nota.rotulo} className="flex items-start gap-2.5 text-xs leading-5 text-gray-500">
              <span
                aria-hidden="true"
                className="mt-1 inline-block h-2.5 w-2.5 shrink-0 rounded-sm"
                style={{ backgroundColor: `rgb(${nota.cor})` }}
              />
              <span><strong className="text-gray-300">{nota.rotulo}.</strong> {nota.texto}</span>
            </li>
          ))}
        </ul>
        {isMestre ? (
          <p className="mt-5 flex items-start gap-2 border-t border-white/10 pt-4 text-xs leading-5 text-gray-500">
            <LockKeyhole size={13} className="mt-0.5 shrink-0 text-[#cbb87e]" />
            Os tópicos públicos também podem trazer, no final, um bloco dourado <strong className="mx-1 text-gray-300">Para quem conduz a mesa</strong> visível só para você.
          </p>
        ) : null}
        {podeEditarConteudo ? (
          <p className="mt-3 flex items-start gap-2 text-xs leading-5 text-gray-500">
            <Pencil size={12} className="mt-0.5 shrink-0 text-gray-400" />
            O botão <strong className="mx-1 text-gray-300">Editar</strong> no alto de um tópico leva direto para a edição daquele conteúdo na campanha ativa.
          </p>
        ) : null}
      </section>

      {capitulosVisiveis.length ? (
        <div data-tour="regras-secoes" className="mt-8 space-y-5">
          {capitulosVisiveis.map((capitulo) => (
            <section
              key={capitulo.id}
              style={estiloDoAcento(capitulo.id)}
              className="relative overflow-hidden rounded-[1.75rem] border border-[rgb(var(--acento)/0.28)] bg-gradient-to-br from-[rgb(var(--acento)/0.10)] to-black/35 p-5 shadow-[0_18px_50px_rgba(0,0,0,0.18)] sm:p-7"
            >
              <span
                aria-hidden="true"
                className="pointer-events-none absolute -right-2 -top-6 select-none font-serif text-[8rem] font-bold leading-none text-[rgb(var(--acento)/0.07)] sm:text-[11rem]"
              >
                {romano(capitulo.numero)}
              </span>
              <header className="relative border-b border-white/10 pb-5">
                <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-[rgb(var(--acento-forte))]">Capítulo {capitulo.numero}</span>
                <h2 className="mt-1 font-serif text-2xl font-bold text-[#f2ead7]">{capitulo.titulo}</h2>
                <p className="mt-2 max-w-3xl text-sm leading-7 text-gray-300/75">{capitulo.apresentacao}</p>
              </header>
              <ol className="relative mt-5 grid grid-cols-1 gap-2.5 lg:grid-cols-2">
                {capitulo.topicos.map((topico) => (
                  <li key={topico.id}>
                    <button
                      type="button"
                      onClick={() => onAbrirTopico(topico.id)}
                      className="group flex h-full w-full items-start gap-4 rounded-2xl border border-white/[0.1] bg-[#09080d]/70 p-4 text-left shadow-sm transition duration-200 hover:-translate-y-0.5 hover:border-[rgb(var(--acento)/0.55)] hover:bg-[#121017] hover:shadow-[0_12px_30px_rgba(0,0,0,0.28)] focus-visible:border-[rgb(var(--acento)/0.7)]"
                    >
                      <span className="w-9 shrink-0 pt-0.5 font-mono text-xs font-bold text-[rgb(var(--acento-forte))]">{topico.numero}</span>
                      <span className="min-w-0 flex-1">
                        <strong className="block text-base leading-6 text-gray-100 transition-colors group-hover:text-[#f2ead7]">{topico.titulo}</strong>
                        <span className="mt-1 line-clamp-2 block text-[13px] leading-5 text-gray-400">{regras[topico.id]?.resumo}</span>
                        {subtopicos[topico.id]?.length ? (
                          <span className="mt-2.5 flex flex-wrap gap-1.5">
                            {subtopicos[topico.id].map((subtopico) => (
                              <span key={subtopico.id} className="rounded-full border border-[rgb(var(--acento)/0.3)] bg-[rgb(var(--acento)/0.08)] px-2.5 py-1 text-[11px] font-semibold text-[rgb(var(--acento-forte))]">
                                {subtopico.titulo}
                              </span>
                            ))}
                          </span>
                        ) : null}
                        <span className="mt-2 inline-flex items-center gap-1.5 text-[11px] text-gray-500">
                          <Clock size={11} aria-hidden="true" /> {minutosPorTopico[topico.id] ?? 1} min
                        </span>
                      </span>
                      <ChevronRight size={16} className="mt-1 shrink-0 text-gray-600 transition group-hover:translate-x-0.5 group-hover:text-[rgb(var(--acento-forte))]" />
                    </button>
                  </li>
                ))}
              </ol>
            </section>
          ))}
        </div>
      ) : <p className="py-16 text-center text-sm text-gray-500">Nenhum tópico corresponde à busca.</p>}
    </motion.div>
  );
};
