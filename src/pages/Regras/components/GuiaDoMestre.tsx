import { useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  ArrowLeft,
  ArrowRight,
  BookMarked,
  ChevronDown,
  ChevronsDownUp,
  ChevronsUpDown,
  Compass,
  Feather,
  Library,
  Map as MapIcon,
  Search,
  Swords,
  Table2,
  X,
  type LucideIcon,
} from 'lucide-react';
import { RegrasContent } from './RegrasContent';
import { FerramentasMestre } from './FerramentasMestre';
import { NotasInternasMestre } from './NotasInternasMestre';
import {
  ESTANTE_BIBLIOTECA,
  buscarNoGuia,
  estruturarGuiaMestre,
  type SecaoDoGuia,
} from '../guiaMestre';

interface VisualEstante {
  icone: LucideIcon;
  texto: string;
  borda: string;
  fundo: string;
  ponto: string;
}

/* Classes escritas por extenso: o Tailwind só gera o que encontra literal. */
const VISUAIS: Record<string, VisualEstante> = {
  conduzir: { icone: Compass, texto: 'text-[#e1c77e]', borda: 'border-[#c7a44c]/50', fundo: 'bg-[#c7a44c]/10', ponto: 'bg-[#c7a44c]' },
  cena: { icone: Feather, texto: 'text-rose-200', borda: 'border-rose-300/45', fundo: 'bg-rose-400/10', ponto: 'bg-rose-300' },
  mundo: { icone: MapIcon, texto: 'text-emerald-200', borda: 'border-emerald-300/45', fundo: 'bg-emerald-400/10', ponto: 'bg-emerald-300' },
  ameaca: { icone: Swords, texto: 'text-orange-200', borda: 'border-orange-300/45', fundo: 'bg-orange-400/10', ponto: 'bg-orange-300' },
  biblioteca: { icone: Library, texto: 'text-sky-200', borda: 'border-sky-300/45', fundo: 'bg-sky-400/10', ponto: 'bg-sky-300' },
};
const VISUAL_PADRAO: VisualEstante = { icone: BookMarked, texto: 'text-gray-200', borda: 'border-white/25', fundo: 'bg-white/5', ponto: 'bg-gray-300' };
const visualDe = (id: string) => VISUAIS[id] ?? VISUAL_PADRAO;

interface EstanteNaTela {
  id: string;
  titulo: string;
  quando: string;
  html: string | null;
  secoes: SecaoDoGuia[];
  totalTabelas: number;
}

interface Alvo {
  secaoId?: string;
  tabelaTitulo?: string | null;
}

const LEITOR_ID = 'regra-leitor';

/** Espera o RegrasContent terminar de montar o HTML e então rola até a seção
 *  ou abre a tabela pedida. O conteúdo entra por innerHTML num efeito do
 *  filho, então a tentativa é repetida por alguns quadros antes de desistir. */
function levarAte(container: HTMLElement | null, alvo: Alvo) {
  let tentativas = 0;
  const procurar = () => {
    if (!container) return;
    let elemento: HTMLElement | null = null;
    if (alvo.tabelaTitulo) {
      const detalhe = Array.from(container.querySelectorAll<HTMLDetailsElement>('details.regras-details'))
        .find((item) => (item.querySelector('summary')?.childNodes[0]?.textContent || '').trim() === alvo.tabelaTitulo);
      if (detalhe) {
        detalhe.open = true;
        elemento = detalhe;
      }
    } else if (alvo.secaoId) {
      elemento = container.querySelector<HTMLElement>(`#${CSS.escape(alvo.secaoId)}`);
    }
    if (elemento) {
      elemento.scrollIntoView({ behavior: 'smooth', block: 'start' });
      return;
    }
    if (tentativas++ < 30) window.requestAnimationFrame(procurar);
  };
  window.requestAnimationFrame(procurar);
}

export function GuiaDoMestre({ html, campanhaId }: { html: string; campanhaId?: string }) {
  const [searchParams, setSearchParams] = useSearchParams();
  const guia = useMemo(() => estruturarGuiaMestre(html), [html]);
  const estantes: EstanteNaTela[] = useMemo(() => [
    ...guia.estantes,
    { ...ESTANTE_BIBLIOTECA, html: null, secoes: [], totalTabelas: 0 },
  ], [guia]);

  const pedida = searchParams.get('estante');
  const estanteAtiva = estantes.find((estante) => estante.id === pedida) ?? estantes[0];
  const indiceAtivo = estantes.indexOf(estanteAtiva);
  const visualAtivo = visualDe(estanteAtiva.id);
  const IconeAtivo = visualAtivo.icone;

  const [busca, setBusca] = useState('');
  const [secaoVisivel, setSecaoVisivel] = useState('');
  const [indiceMovelAberto, setIndiceMovelAberto] = useState(false);
  const alvoRef = useRef<Alvo | null>(null);
  const conteudoRef = useRef<HTMLDivElement>(null);
  const cabecaEstanteRef = useRef<HTMLElement>(null);

  const resultados = useMemo(() => buscarNoGuia(guia, busca), [guia, busca]);
  const totalSecoes = guia.estantes.reduce((total, estante) => total + estante.secoes.length, 0);
  const totalTabelas = guia.estantes.reduce((total, estante) => total + estante.totalTabelas, 0);

  const abrirEstante = (id: string, alvo?: Alvo) => {
    const proximos = new URLSearchParams(searchParams);
    proximos.set('estante', id);
    setSearchParams(proximos, { replace: false });
    setIndiceMovelAberto(false);
    if (alvo && (alvo.secaoId || alvo.tabelaTitulo)) {
      alvoRef.current = alvo;
      if (id === estanteAtiva.id) {
        levarAte(conteudoRef.current, alvo);
        alvoRef.current = null;
      }
    } else {
      window.requestAnimationFrame(() => cabecaEstanteRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }));
    }
  };

  // Troca de estante com destino marcado: o conteúdo novo ainda vai montar.
  useEffect(() => {
    if (!alvoRef.current) return;
    levarAte(conteudoRef.current, alvoRef.current);
    alvoRef.current = null;
  }, [estanteAtiva.id]);

  // Seção em leitura, para acender o item certo no índice da estante.
  useEffect(() => {
    setSecaoVisivel(estanteAtiva.secoes[0]?.id ?? '');
    const leitor = document.getElementById(LEITOR_ID);
    if (typeof IntersectionObserver === 'undefined' || !conteudoRef.current) return undefined;
    let observador: IntersectionObserver | null = null;
    let quadro = 0;
    let tentativas = 0;
    const observar = () => {
      const titulos = conteudoRef.current?.querySelectorAll('h3[id]');
      if (!titulos?.length) {
        if (tentativas++ < 30) quadro = window.requestAnimationFrame(observar);
        return;
      }
      observador = new IntersectionObserver((entradas) => {
        const visivel = entradas.find((entrada) => entrada.isIntersecting);
        if (visivel?.target.id) setSecaoVisivel(visivel.target.id);
      }, { root: leitor, rootMargin: '-15% 0px -70% 0px', threshold: 0 });
      titulos.forEach((titulo) => observador?.observe(titulo));
    };
    quadro = window.requestAnimationFrame(observar);
    return () => {
      window.cancelAnimationFrame(quadro);
      observador?.disconnect();
    };
  }, [estanteAtiva]);

  const alternarTabelas = (abrir: boolean) => {
    conteudoRef.current?.querySelectorAll<HTMLDetailsElement>('details.regras-details').forEach((detalhe) => {
      detalhe.open = abrir;
    });
  };

  const indiceDaEstante = estanteAtiva.secoes.length ? (
    <ol className="space-y-1">
      {estanteAtiva.secoes.map((secao) => (
        <li key={secao.id}>
          <button
            type="button"
            onClick={() => abrirEstante(estanteAtiva.id, { secaoId: secao.id })}
            aria-current={secaoVisivel === secao.id ? 'location' : undefined}
            className={`w-full rounded-lg border-l-2 px-3 py-2 text-left text-[13px] leading-snug transition-colors ${secaoVisivel === secao.id
              ? `${visualAtivo.borda} ${visualAtivo.fundo} ${visualAtivo.texto}`
              : 'border-transparent text-gray-400 hover:bg-white/5 hover:text-gray-200'}`}
          >
            {secao.titulo}
          </button>
          {secao.tabelas.length ? (
            <ul className="mb-2 ml-3 mt-1 space-y-0.5 border-l border-white/10 pl-2">
              {secao.tabelas.map((tabela) => (
                <li key={tabela.id}>
                  <button
                    type="button"
                    onClick={() => abrirEstante(estanteAtiva.id, { secaoId: secao.id, tabelaTitulo: tabela.titulo })}
                    className="flex w-full items-center justify-between gap-2 rounded-md px-2 py-1 text-left text-xs text-gray-500 transition-colors hover:bg-white/5 hover:text-gray-200"
                  >
                    <span className="truncate">{tabela.titulo}</span>
                    {tabela.dado ? <span className="shrink-0 font-mono text-[10px] text-gray-600">{tabela.dado}</span> : null}
                  </button>
                </li>
              ))}
            </ul>
          ) : null}
        </li>
      ))}
    </ol>
  ) : null;

  return (
    <div className="guia-mestre">
      {guia.introducao ? (
        <div className="mb-8">
          <RegrasContent htmlContent={guia.introducao} semSumario />
        </div>
      ) : null}

      <section aria-labelledby="guia-mapa-titulo" className="mb-6">
        <div className="mb-3 flex flex-wrap items-end justify-between gap-2">
          <h2 id="guia-mapa-titulo" className="text-[10px] font-bold uppercase tracking-[0.22em] text-gray-500">Mapa do guia</h2>
          <span className="text-[10px] font-bold uppercase tracking-[0.14em] text-gray-600">
            {estantes.length} estantes · {totalSecoes} seções · {totalTabelas} tabelas
          </span>
        </div>
        <div className="grid grid-cols-2 gap-2.5 sm:gap-3 xl:grid-cols-5">
          {estantes.map((estante, indice) => {
            const visual = visualDe(estante.id);
            const Icone = visual.icone;
            const ativa = estante.id === estanteAtiva.id;
            return (
              <button
                key={estante.id}
                type="button"
                onClick={() => abrirEstante(estante.id)}
                aria-pressed={ativa}
                className={`group flex h-full flex-col rounded-2xl border p-3 text-left last:col-span-2 sm:p-4 xl:last:col-span-1 transition duration-200 hover:-translate-y-0.5 ${ativa
                  ? `${visual.borda} ${visual.fundo} shadow-[0_12px_30px_rgba(0,0,0,0.25)]`
                  : 'border-white/10 bg-black/20 hover:border-white/25 hover:bg-white/[0.04]'}`}
              >
                <span className="flex items-center gap-2.5">
                  <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border ${visual.borda} ${visual.fundo} ${visual.texto}`}>
                    <Icone size={17} />
                  </span>
                  <span className="text-[10px] font-bold uppercase tracking-[0.18em] text-gray-500">Estante {indice + 1}</span>
                </span>
                <strong className={`mt-2.5 block text-sm leading-snug sm:mt-3 sm:text-[15px] ${ativa ? visual.texto : 'text-gray-100'}`}>{estante.titulo}</strong>
                <span className="mt-1.5 line-clamp-3 hidden text-xs leading-5 text-gray-400 sm:block">{estante.quando}</span>
                <span className="mt-auto pt-3 text-[10px] font-bold uppercase tracking-[0.12em] text-gray-600">
                  {estante.html === null
                    ? 'Calibragem e notas'
                    : `${estante.secoes.length} ${estante.secoes.length === 1 ? 'seção' : 'seções'}${estante.totalTabelas ? ` · ${estante.totalTabelas} tabelas` : ''}`}
                </span>
              </button>
            );
          })}
        </div>
      </section>

      <div className="relative mb-8">
        <label className="relative block">
          <span className="sr-only">Procurar no Guia do Mestre</span>
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-[#d8bd75]/60" size={17} />
          <input
            type="search"
            value={busca}
            onChange={(evento) => setBusca(evento.target.value)}
            placeholder="Procurar no guia: morte, boato, relógio, tesouro, NPC..."
            className="w-full rounded-2xl border border-white/15 bg-black/30 py-3.5 pl-11 pr-10 [&::-webkit-search-cancel-button]:hidden text-sm text-white outline-none transition placeholder:text-gray-500 hover:border-white/25 focus:border-[#c7a44c]/60"
          />
          {busca ? (
            <button type="button" onClick={() => setBusca('')} aria-label="Limpar busca" className="absolute right-3 top-1/2 -translate-y-1/2 rounded-md p-1 text-gray-500 hover:text-white">
              <X size={15} />
            </button>
          ) : null}
        </label>
        {busca.trim().length > 1 ? (
          <div className="mt-2 overflow-hidden rounded-2xl border border-white/10 bg-[#0d0c12]/95 shadow-2xl">
            {resultados.length ? (
              <ul className="custom-scrollbar max-h-80 divide-y divide-white/5 overflow-y-auto">
                {resultados.map((resultado, indice) => {
                  const visual = visualDe(resultado.estanteId);
                  return (
                    <li key={`${resultado.secaoId}-${resultado.tabelaTitulo ?? ''}-${indice}`}>
                      <button
                        type="button"
                        onClick={() => {
                          abrirEstante(resultado.estanteId, { secaoId: resultado.secaoId, tabelaTitulo: resultado.tabelaTitulo });
                          setBusca('');
                        }}
                        className="block w-full px-4 py-3 text-left transition-colors hover:bg-white/5"
                      >
                        <span className="flex flex-wrap items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.12em]">
                          <span className={`h-1.5 w-1.5 rounded-full ${visual.ponto}`} />
                          <span className={visual.texto}>{resultado.estanteTitulo}</span>
                          <span className="text-gray-700">›</span>
                          <span className="text-gray-400">{resultado.secaoTitulo}</span>
                          {resultado.tabelaTitulo ? (
                            <>
                              <span className="text-gray-700">›</span>
                              <span className="inline-flex items-center gap-1 text-gray-300"><Table2 size={11} /> {resultado.tabelaTitulo}</span>
                            </>
                          ) : null}
                        </span>
                        <span className="mt-1 block text-xs leading-5 text-gray-500">{resultado.trecho}</span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            ) : (
              <p className="px-4 py-5 text-sm text-gray-500">Nada no guia com essas palavras.</p>
            )}
          </div>
        ) : null}
      </div>

      <nav aria-label="Estantes do guia" className="sticky top-0 z-30 -mx-5 mb-6 border-b border-white/10 bg-[#111017]/95 px-5 py-2.5 backdrop-blur-xl sm:-mx-8 sm:px-8 lg:-mx-12 lg:px-12">
        <div className="custom-scrollbar flex gap-2 overflow-x-auto">
          {estantes.map((estante) => {
            const visual = visualDe(estante.id);
            const Icone = visual.icone;
            const ativa = estante.id === estanteAtiva.id;
            return (
              <button
                key={estante.id}
                type="button"
                onClick={() => abrirEstante(estante.id)}
                aria-current={ativa ? 'true' : undefined}
                className={`inline-flex shrink-0 items-center gap-2 rounded-full border px-3.5 py-1.5 text-xs font-semibold transition-colors ${ativa
                  ? `${visual.borda} ${visual.fundo} ${visual.texto}`
                  : 'border-white/10 text-gray-400 hover:border-white/25 hover:text-gray-200'}`}
              >
                <Icone size={13} /> {estante.titulo}
              </button>
            );
          })}
        </div>
      </nav>

      <section ref={cabecaEstanteRef} aria-labelledby="guia-estante-titulo" className="scroll-mt-20">
        <header className={`mb-6 flex flex-col gap-4 rounded-2xl border ${visualAtivo.borda} ${visualAtivo.fundo} p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6`}>
          <div className="flex items-start gap-4">
            <span className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border ${visualAtivo.borda} bg-black/25 ${visualAtivo.texto}`}>
              <IconeAtivo size={22} />
            </span>
            <div>
              <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-gray-500">Estante {indiceAtivo + 1} de {estantes.length}</span>
              <h2 id="guia-estante-titulo" className="mt-0.5 font-serif text-2xl font-bold text-[#f2ead7]">{estanteAtiva.titulo}</h2>
              {estanteAtiva.quando ? <p className="mt-1 max-w-[62ch] text-sm leading-6 text-gray-300/80">{estanteAtiva.quando}</p> : null}
            </div>
          </div>
          {estanteAtiva.totalTabelas ? (
            <div className="flex shrink-0 gap-2">
              <button type="button" onClick={() => alternarTabelas(true)} className="inline-flex items-center gap-1.5 rounded-lg border border-white/10 bg-black/20 px-3 py-2 text-xs text-gray-300 transition hover:border-white/25 hover:text-white">
                <ChevronsUpDown size={14} /> Abrir tabelas
              </button>
              <button type="button" onClick={() => alternarTabelas(false)} className="inline-flex items-center gap-1.5 rounded-lg border border-white/10 bg-black/20 px-3 py-2 text-xs text-gray-300 transition hover:border-white/25 hover:text-white">
                <ChevronsDownUp size={14} /> Fechar
              </button>
            </div>
          ) : null}
        </header>

        {estanteAtiva.html === null ? (
          <div className="space-y-2">
            <FerramentasMestre campanhaId={campanhaId} />
            <NotasInternasMestre campanhaId={campanhaId} />
          </div>
        ) : (
          <div className="flex items-start gap-8">
            {indiceDaEstante ? (
              <aside aria-label="Nesta estante" className="custom-scrollbar sticky top-16 hidden max-h-[calc(100vh-10rem)] w-60 shrink-0 overflow-y-auto rounded-2xl border border-white/10 bg-black/20 p-3 lg:block">
                <h3 className="mb-2 px-2 text-[10px] font-bold uppercase tracking-[0.18em] text-gray-500">Nesta estante</h3>
                {indiceDaEstante}
              </aside>
            ) : null}

            <div className="min-w-0 flex-1">
              {indiceDaEstante ? (
                <div className="mb-6 rounded-xl border border-white/10 bg-black/20 lg:hidden">
                  <button
                    type="button"
                    onClick={() => setIndiceMovelAberto((aberto) => !aberto)}
                    aria-expanded={indiceMovelAberto}
                    className="flex w-full items-center justify-between px-4 py-3 text-xs font-bold uppercase tracking-[0.16em] text-gray-400"
                  >
                    Nesta estante
                    <ChevronDown size={15} className={`transition-transform ${indiceMovelAberto ? 'rotate-180' : ''}`} />
                  </button>
                  {indiceMovelAberto ? <div className="max-h-80 overflow-y-auto px-2 pb-3">{indiceDaEstante}</div> : null}
                </div>
              ) : null}
              <div ref={conteudoRef} className="[&_details]:scroll-mt-20 [&_h3]:scroll-mt-20">
                <RegrasContent key={estanteAtiva.id} htmlContent={estanteAtiva.html} semSumario />
              </div>
            </div>
          </div>
        )}

        <div className="mt-12 flex items-stretch justify-between gap-3 border-t border-white/10 pt-6">
          {indiceAtivo > 0 ? (
            <button type="button" onClick={() => abrirEstante(estantes[indiceAtivo - 1].id)} className="group flex min-w-0 flex-1 items-center gap-3 rounded-xl border border-white/10 bg-black/20 p-3 text-left transition-colors hover:border-white/25 sm:max-w-[300px]">
              <ArrowLeft size={17} className="shrink-0 text-gray-600 group-hover:text-gray-300" />
              <span className="min-w-0"><small className="block text-[9px] font-bold uppercase tracking-widest text-gray-600">Estante anterior</small><strong className="mt-1 block truncate text-sm text-gray-300">{estantes[indiceAtivo - 1].titulo}</strong></span>
            </button>
          ) : <div className="flex-1 sm:max-w-[300px]" />}
          {indiceAtivo < estantes.length - 1 ? (
            <button type="button" onClick={() => abrirEstante(estantes[indiceAtivo + 1].id)} className="group flex min-w-0 flex-1 items-center justify-end gap-3 rounded-xl border border-white/10 bg-black/20 p-3 text-right transition-colors hover:border-white/25 sm:max-w-[300px]">
              <span className="min-w-0"><small className="block text-[9px] font-bold uppercase tracking-widest text-gray-600">Próxima estante</small><strong className="mt-1 block truncate text-sm text-gray-300">{estantes[indiceAtivo + 1].titulo}</strong></span>
              <ArrowRight size={17} className="shrink-0 text-gray-600 group-hover:text-gray-300" />
            </button>
          ) : null}
        </div>
      </section>
    </div>
  );
}
