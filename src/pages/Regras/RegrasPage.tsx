import { useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import {
  ArrowLeft,
  ArrowRight,
  ChevronDown,
  ChevronRight,
  Library,
  Menu,
  Search,
  ShieldAlert,
  Sparkles,
  X,
} from 'lucide-react';
import { REGRAS_OFICIAIS } from '../../../data/regras/regras';
import { CLASSES_CATALOGO, RACAS_CATALOGO } from '../../services/catalogoService';
import { useAuthStore } from '../../store/useAuthStore';
import { CatalogoLegados } from './components/CatalogoLegados';
import { CatalogoMagico } from './components/CatalogoMagico';
import { GridClasses } from './components/GridClasses';
import { GridRacas } from './components/GridRacas';
import { RegrasContent } from './components/RegrasContent';
import { NotasInternasMestre } from './components/NotasInternasMestre';

const TITULOS_TOPICOS: Record<string, string> = {
  'sistema-base': 'Sistema Base',
  pericias: 'Perícias',
  combate: 'Combate',
  distancias: 'Distâncias',
  ferimentos: 'Ferimentos',
  coreografia: 'Coreografia',
  descanso: 'Descanso',
  treinar: 'Treinamento',
  xp: 'Experiência e Níveis',
  legados: 'Legados',
  equipamentos: 'Equipamentos',
  'magia-fluxo': 'Magia e Fluxo',
  condicoes: 'Condições',
  classes: 'Classes',
  racas: 'Raças',
  mestre: 'Guia do Mestre',
};

const tituloTopico = (key: string) => TITULOS_TOPICOS[key] || key
  .split('-')
  .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
  .join(' ');

interface ChapterNavigationProps {
  activeTopic: string;
  busca: string;
  groupedKeys: Record<string, string[]>;
  onBuscaChange: (value: string) => void;
  onSelectTopic: (topic: string) => void;
  onClose?: () => void;
}

const ChapterNavigation = ({
  activeTopic,
  busca,
  groupedKeys,
  onBuscaChange,
  onSelectTopic,
  onClose,
}: ChapterNavigationProps) => {
  const [categoriasAbertas, setCategoriasAbertas] = useState<Set<string>>(
    () => new Set(Object.keys(groupedKeys)),
  );

  const alternarCategoria = (categoria: string) => {
    setCategoriasAbertas((atuais) => {
      const proximas = new Set(atuais);
      if (proximas.has(categoria)) proximas.delete(categoria);
      else proximas.add(categoria);
      return proximas;
    });
  };

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="flex items-start justify-between border-b border-white/10 px-5 pb-5 pt-1">
        <div>
          <span className="mb-2 flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.28em] text-[#c7a44c]">
            <Library size={14} /> Biblioteca
          </span>
          <h2 className="text-2xl font-bold text-white" style={{ fontFamily: 'Cinzel, serif' }}>Livro de Regras</h2>
          <p className="mt-1 text-xs text-gray-500">Capítulos oficiais de O Jardim</p>
        </div>
        {onClose ? (
          <button type="button" onClick={onClose} aria-label="Fechar capítulos" className="rounded-lg border border-white/10 p-2 text-gray-400 hover:text-white">
            <X size={18} />
          </button>
        ) : null}
      </div>

      <label className="relative mx-5 my-4 block">
        <span className="sr-only">Buscar capítulo</span>
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-600" size={16} />
        <input
          type="search"
          value={busca}
          onChange={(event) => onBuscaChange(event.target.value)}
          placeholder="Buscar capítulo..."
          className="w-full rounded-xl border border-white/10 bg-black/25 py-2.5 pl-9 pr-3 text-sm text-white outline-none transition-colors placeholder:text-gray-600 focus:border-[#c7a44c]/50"
        />
      </label>

      <nav className="custom-scrollbar min-h-0 flex-1 overflow-y-auto px-3 pb-6" aria-label="Capítulos do livro de regras">
        {Object.keys(groupedKeys).length ? Object.entries(groupedKeys).map(([categoria, keys]) => {
          const aberta = busca.trim().length > 0 || categoriasAbertas.has(categoria);
          return (
            <section key={categoria} className="mb-3">
              <button
                type="button"
                onClick={() => alternarCategoria(categoria)}
                aria-expanded={aberta}
                className="flex w-full items-center justify-between rounded-lg px-2 py-2 text-left text-[10px] font-bold uppercase tracking-[0.2em] text-gray-500 hover:text-gray-300"
              >
                {categoria}
                <ChevronDown size={14} className={`transition-transform ${aberta ? '' : '-rotate-90'}`} />
              </button>
              {aberta ? (
                <div className="mt-1 space-y-1 border-l border-white/10 pl-2">
                  {keys.map((key) => (
                    <button
                      key={key}
                      type="button"
                      onClick={() => {
                        onSelectTopic(key);
                        onClose?.();
                      }}
                      aria-current={activeTopic === key ? 'page' : undefined}
                      className={`group flex w-full items-center justify-between rounded-lg px-3 py-2.5 text-left text-sm transition-colors ${activeTopic === key
                        ? 'bg-[#c7a44c]/10 text-[#e1c77e]'
                        : 'text-gray-400 hover:bg-white/5 hover:text-white'}`}
                    >
                      <span>{tituloTopico(key)}</span>
                      {activeTopic === key ? <ChevronRight size={15} className="text-[#c7a44c]" /> : null}
                    </button>
                  ))}
                </div>
              ) : null}
            </section>
          );
        }) : (
          <p className="px-3 py-8 text-center text-sm text-gray-600">Nenhum capítulo encontrado.</p>
        )}
      </nav>
    </div>
  );
};

export const RegrasPage = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [busca, setBusca] = useState('');
  const [menuAberto, setMenuAberto] = useState(false);
  const { usuario, campanhaAtiva } = useAuthStore();
  const isMestre = usuario?.papel_plataforma === 'admin'
    || usuario?.papel_plataforma === 'criador'
    || campanhaAtiva?.papel === 'mestre'
    || campanhaAtiva?.papel === 'assistente';
  const config = campanhaAtiva?.configuracoes ?? {};
  const racasLiberadas = useMemo(() => new Set([
    ...(config.racas_liberadas ?? []),
    ...((usuario?.id && config.racas_liberadas_membros?.[usuario.id]) ?? []),
  ]), [config.racas_liberadas, config.racas_liberadas_membros, usuario?.id]);
  const classesLiberadas = useMemo(() => new Set([
    ...(config.classes_liberadas ?? []),
    ...((usuario?.id && config.classes_liberadas_membros?.[usuario.id]) ?? []),
  ]), [config.classes_liberadas, config.classes_liberadas_membros, usuario?.id]);

  const catalogKeys = useMemo(
    () => Object.keys(REGRAS_OFICIAIS).filter((key) => key !== 'mestre' || isMestre),
    [isMestre],
  );
  const racasVisiveis = useMemo(
    () => isMestre
      ? RACAS_CATALOGO
      : RACAS_CATALOGO.filter((raca) => !raca.indisponivel && (raca.categoria !== 'esquecida' || racasLiberadas.has(raca.id))),
    [isMestre, racasLiberadas],
  );
  const classesVisiveis = useMemo(
    () => isMestre
      ? CLASSES_CATALOGO
      : CLASSES_CATALOGO.filter((classe) => !classe.indisponivel && (classe.categoria !== 'esquecida' || classesLiberadas.has(classe.id))),
    [isMestre, classesLiberadas],
  );
  const topicoSolicitado = searchParams.get('topico');
  const activeTopic = topicoSolicitado && catalogKeys.includes(topicoSolicitado)
    ? topicoSolicitado
    : 'sistema-base';

  const setActiveTopic = (topico: string) => {
    const proximosParametros = new URLSearchParams(searchParams);
    proximosParametros.set('topico', topico);
    setSearchParams(proximosParametros, { replace: true });
    document.getElementById('regra-leitor')?.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const filteredKeys = useMemo(() => {
    const termo = busca.trim().toLocaleLowerCase('pt-BR');
    if (!termo) return catalogKeys;
    return catalogKeys.filter((key) => {
      const topic = REGRAS_OFICIAIS[key];
      return tituloTopico(key).toLocaleLowerCase('pt-BR').includes(termo)
        || topic.resumo.toLocaleLowerCase('pt-BR').includes(termo);
    });
  }, [busca, catalogKeys]);

  const groupedKeys = useMemo(() => {
    const groups: Record<string, string[]> = {};
    filteredKeys.forEach((key) => {
      const categoria = REGRAS_OFICIAIS[key].categoria || 'Gerais';
      if (!groups[categoria]) groups[categoria] = [];
      groups[categoria].push(key);
    });
    return groups;
  }, [filteredKeys]);

  const topicData = REGRAS_OFICIAIS[activeTopic];
  const activeIndex = catalogKeys.indexOf(activeTopic);
  const prevTopic = activeIndex > 0 ? catalogKeys[activeIndex - 1] : null;
  const nextTopic = activeIndex >= 0 && activeIndex < catalogKeys.length - 1 ? catalogKeys[activeIndex + 1] : null;
  const conteudoAmplo = ['classes', 'racas', 'magia-fluxo', 'legados'].includes(activeTopic);

  return (
    <div className="relative z-10 mx-auto flex h-[100dvh] w-full max-w-[1800px] gap-4 overflow-hidden p-4 pl-24 lg:gap-6 lg:p-6 lg:pl-32">
      <aside className="hidden h-full min-h-0 w-72 shrink-0 overflow-hidden rounded-[1.6rem] border border-white/10 bg-[#0d0c12]/95 py-5 shadow-2xl backdrop-blur-xl md:block">
        <ChapterNavigation
          activeTopic={activeTopic}
          busca={busca}
          groupedKeys={groupedKeys}
          onBuscaChange={setBusca}
          onSelectTopic={setActiveTopic}
        />
      </aside>

      <section className="regra-reader-shell flex h-full min-h-0 min-w-0 flex-1 flex-col overflow-hidden rounded-[1.6rem] border border-white/10 bg-[#111017]/95 shadow-2xl">
        <div className="flex shrink-0 items-center gap-3 border-b border-white/10 bg-[#0d0c12]/95 px-4 py-3 md:hidden">
          <button
            type="button"
            onClick={() => setMenuAberto(true)}
            aria-label="Abrir capítulos"
            className="rounded-lg border border-white/10 p-2 text-[#d8bd75]"
          >
            <Menu size={19} />
          </button>
          <div className="min-w-0">
            <span className="block text-[9px] font-bold uppercase tracking-[0.2em] text-gray-500">Capítulo {activeIndex + 1}</span>
            <strong className="block truncate text-sm text-white">{tituloTopico(activeTopic)}</strong>
          </div>
        </div>

        <main id="regra-leitor" className="custom-scrollbar min-h-0 flex-1 overflow-y-auto scroll-smooth">
          <AnimatePresence mode="wait">
            {topicData ? (
              <motion.article
                key={activeTopic}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.22 }}
                className={`regra-book-page mx-auto min-h-full px-5 py-8 sm:px-8 lg:px-12 lg:py-12 ${conteudoAmplo ? 'max-w-[1320px]' : 'max-w-[1120px]'}`}
              >
                <header className="mb-10 border-b border-[#c7a44c]/20 pb-8">
                  <div className="mb-5 flex flex-wrap items-center gap-3 text-[10px] font-bold uppercase tracking-[0.22em]">
                    <span className="text-[#c7a44c]">Capítulo {activeIndex + 1} de {catalogKeys.length}</span>
                    <span className="text-gray-700">◆</span>
                    <span className="text-gray-500">{topicData.categoria || 'Regras gerais'}</span>
                    <span className="ml-auto flex items-center gap-1.5 rounded-full border border-[#c7a44c]/20 bg-[#c7a44c]/10 px-3 py-1 text-[#c7a44c]">
                      <Sparkles size={11} /> {topicData.status}
                    </span>
                  </div>
                  <h1 className="text-3xl font-bold leading-tight text-[#f2ead7] sm:text-4xl lg:text-5xl" style={{ fontFamily: 'Cinzel, serif' }}>
                    {tituloTopico(activeTopic)}
                  </h1>
                  <p className="mt-5 max-w-[76ch] text-base leading-8 text-gray-400 sm:text-lg">
                    {topicData.resumo}
                  </p>
                </header>

                {activeTopic === 'racas' ? (
                  <GridRacas racas={racasVisiveis} />
                ) : activeTopic === 'classes' ? (
                  <GridClasses classes={classesVisiveis} />
                ) : activeTopic === 'magia-fluxo' ? (
                  <>
                    <RegrasContent htmlContent={topicData.corpo} />
                    <CatalogoMagico />
                  </>
                ) : activeTopic === 'legados' ? (
                  <>
                    <RegrasContent htmlContent={topicData.corpo} />
                    <CatalogoLegados />
                  </>
                ) : activeTopic === 'mestre' ? (
                  <>
                    <RegrasContent htmlContent={topicData.corpo} />
                    <NotasInternasMestre campanhaId={campanhaAtiva?.id} />
                  </>
                ) : (
                  <RegrasContent htmlContent={topicData.corpo} />
                )}

                <footer className="mt-16 flex items-stretch justify-between gap-3 border-t border-[#c7a44c]/20 pt-7">
                  {prevTopic ? (
                    <button type="button" onClick={() => setActiveTopic(prevTopic)} className="group flex min-w-0 flex-1 items-center gap-3 rounded-xl border border-white/10 bg-black/20 p-3 text-left transition-colors hover:border-[#c7a44c]/40 hover:bg-[#c7a44c]/5 sm:max-w-[300px]">
                      <ArrowLeft size={18} className="shrink-0 text-gray-600 group-hover:text-[#c7a44c]" />
                      <span className="min-w-0"><small className="block text-[9px] font-bold uppercase tracking-widest text-gray-600">Capítulo anterior</small><strong className="mt-1 block truncate text-xs text-gray-300 sm:text-sm">{tituloTopico(prevTopic)}</strong></span>
                    </button>
                  ) : <div className="flex-1 sm:max-w-[300px]" />}
                  {nextTopic ? (
                    <button type="button" onClick={() => setActiveTopic(nextTopic)} className="group flex min-w-0 flex-1 items-center justify-end gap-3 rounded-xl border border-white/10 bg-black/20 p-3 text-right transition-colors hover:border-[#c7a44c]/40 hover:bg-[#c7a44c]/5 sm:max-w-[300px]">
                      <span className="min-w-0"><small className="block text-[9px] font-bold uppercase tracking-widest text-gray-600">Próximo capítulo</small><strong className="mt-1 block truncate text-xs text-gray-300 sm:text-sm">{tituloTopico(nextTopic)}</strong></span>
                      <ArrowRight size={18} className="shrink-0 text-gray-600 group-hover:text-[#c7a44c]" />
                    </button>
                  ) : null}
                </footer>
              </motion.article>
            ) : (
              <div className="flex min-h-[420px] flex-col items-center justify-center text-gray-600">
                <ShieldAlert size={54} className="mb-4" />
                <p>Selecione um capítulo para ler.</p>
              </div>
            )}
          </AnimatePresence>
        </main>
      </section>

      <AnimatePresence>
        {menuAberto ? (
          <motion.div className="fixed inset-0 z-[80] md:hidden" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <button type="button" aria-label="Fechar capítulos" onClick={() => setMenuAberto(false)} className="absolute inset-0 bg-black/75 backdrop-blur-sm" />
            <motion.aside
              role="dialog"
              aria-modal="true"
              aria-label="Capítulos do livro de regras"
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ type: 'spring', damping: 28, stiffness: 260 }}
              className="absolute inset-y-0 left-0 w-[min(88vw,340px)] border-r border-white/10 bg-[#0d0c12] py-5 shadow-2xl"
            >
              <ChapterNavigation
                activeTopic={activeTopic}
                busca={busca}
                groupedKeys={groupedKeys}
                onBuscaChange={setBusca}
                onSelectTopic={setActiveTopic}
                onClose={() => setMenuAberto(false)}
              />
            </motion.aside>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
};
