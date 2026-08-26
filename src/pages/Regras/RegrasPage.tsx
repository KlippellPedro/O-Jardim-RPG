import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import {
  ArrowLeft,
  ArrowRight,
  ChevronDown,
  ChevronRight,
  Library,
  LockKeyhole,
  Menu,
  Pencil,
  Search,
  Sparkles,
  X,
} from 'lucide-react';
import type { RegrasCatalog } from '../../../data/regras/regras';
import { GRUPOS_NAVEGACAO, grupoDoTopico, ordenarTopicosPorNavegacao } from '../../../data/regras/navegacao';
import { tituloTopico } from '../../../data/regras/titulos';
import { useResolvedRules } from '../../hooks/useResolvedRules';
import { useAuthStore } from '../../store/useAuthStore';
import { CatalogoLegados } from './components/CatalogoLegados';
import { CatalogoMagico } from './components/CatalogoMagico';
import { CatalogoCondicoes } from './components/CatalogoCondicoes';
import { CatalogoPericias } from './components/CatalogoPericias';
import { CatalogoBestiario } from './components/CatalogoBestiario';
import { CatalogoAflicoes } from './components/CatalogoAflicoes';
import { GridClasses } from './components/GridClasses';
import { GridRacas } from './components/GridRacas';
import { RegrasContent } from './components/RegrasContent';
import { FerramentasMestre } from './components/FerramentasMestre';
import { NotasInternasMestre } from './components/NotasInternasMestre';
import { useDialogAccessibility } from '../../hooks/useDialogAccessibility';

function normalizar(valor: string) {
  return valor.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase('pt-BR');
}

function RulesLanding({
  availableTopics,
  regras,
  titulos,
  onSelectTopic,
}: {
  availableTopics: string[];
  regras: RegrasCatalog;
  titulos: Record<string, string>;
  onSelectTopic: (topic: string) => void;
}) {
  const [buscaInicio, setBuscaInicio] = useState('');
  const termo = normalizar(buscaInicio.trim());
  const topicosDisponiveis = new Set(availableTopics);
  const gruposVisiveis = GRUPOS_NAVEGACAO.map((grupo) => ({
    ...grupo,
    topicos: grupo.topicos.filter((topico) => {
      if (!topicosDisponiveis.has(topico)) return false;
      if (!termo) return true;
      const regra = regras[topico];
      const alvo = normalizar(`${tituloTopico(topico, titulos)} ${regra.resumo}`);
      return termo.split(/\s+/).filter(Boolean).every((palavra) => alvo.includes(palavra));
    }),
  })).filter((grupo) => grupo.topicos.length > 0);
  const totalTopicosVisiveis = gruposVisiveis.reduce((total, grupo) => total + grupo.topicos.length, 0);

  return (
    <motion.div key="inicio-regras" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="mx-auto w-full max-w-[82.5rem] px-5 py-8 sm:px-8 lg:px-12 lg:py-12">
      <div className="border-b border-[#c7a44c]/20 pb-8">
        <span className="text-[10px] font-bold uppercase tracking-[0.22em] text-[#c7a44c]">Livro de Regras</span>
        <h1 className="mt-4 font-serif text-3xl font-bold text-[#f2ead7] sm:text-5xl">O que você precisa descobrir?</h1>
        <p className="mt-5 max-w-3xl text-base leading-8 text-gray-300/80">Encontre o assunto pelo grupo ou procure pelo nome e pela descrição. Todos os capítulos disponíveis para você aparecem nesta página.</p>
        <label className="relative mt-6 block max-w-3xl">
          <span className="sr-only">Buscar em todos os capítulos</span>
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-[#d8bd75]/65" size={18} />
          <input
            type="search"
            value={buscaInicio}
            onChange={(event) => setBuscaInicio(event.target.value)}
            placeholder="Buscar classe, combate, viagem, magia..."
            className="w-full rounded-2xl border border-white/15 bg-black/35 py-4 pl-11 pr-4 text-sm text-white shadow-inner outline-none transition placeholder:text-gray-500 hover:border-white/25 focus:border-[#c7a44c]/60 focus:bg-black/45 sm:pr-24"
          />
          <span className="pointer-events-none absolute right-4 top-1/2 hidden -translate-y-1/2 text-[10px] font-bold uppercase tracking-[0.12em] text-gray-500 sm:block">
            {totalTopicosVisiveis} {totalTopicosVisiveis === 1 ? 'capítulo' : 'capítulos'}
          </span>
        </label>
      </div>
      {gruposVisiveis.length ? (
        <div className="mt-8 space-y-5">
          {gruposVisiveis.map((grupo, indiceGrupo) => (
            <section key={grupo.id} className={`relative overflow-hidden rounded-[1.75rem] border bg-gradient-to-br ${grupo.cor} to-black/35 p-5 shadow-[0_18px_50px_rgba(0,0,0,0.18)] sm:p-7`}>
              <div aria-hidden="true" className="pointer-events-none absolute -right-16 -top-20 h-48 w-48 rounded-full border border-white/[0.04] bg-white/[0.025]" />
              <header className="relative flex flex-col gap-4 border-b border-white/10 pb-5 sm:flex-row sm:items-end sm:justify-between">
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-white/35">Seção {String(indiceGrupo + 1).padStart(2, '0')}</span>
                  <h2 className="mt-1 font-serif text-2xl font-bold text-[#f2ead7]">{grupo.titulo}</h2>
                  <p className="mt-1.5 text-sm leading-6 text-gray-300/70">{grupo.descricao}</p>
                </div>
                <span className="w-fit shrink-0 rounded-full border border-white/10 bg-black/25 px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.12em] text-gray-400">
                  {grupo.topicos.length} {grupo.topicos.length === 1 ? 'capítulo' : 'capítulos'}
                </span>
              </header>
              <div className="relative mt-5 grid grid-cols-[repeat(auto-fit,minmax(min(100%,18rem),1fr))] gap-3">
                {grupo.topicos.map((topico) => (
                  <button
                    key={topico}
                    type="button"
                    onClick={() => onSelectTopic(topico)}
                    className="group flex min-h-[8.75rem] items-start justify-between gap-4 rounded-2xl border border-white/[0.12] bg-[#09080d]/70 p-5 text-left shadow-sm transition duration-200 hover:-translate-y-0.5 hover:border-[#c7a44c]/45 hover:bg-[#121017] hover:shadow-[0_12px_30px_rgba(0,0,0,0.28)] focus-visible:border-[#c7a44c]/60"
                  >
                    <span className="min-w-0">
                      <strong className="block text-base leading-6 text-gray-100 transition-colors group-hover:text-[#f2ead7]">{tituloTopico(topico, titulos)}</strong>
                      <span className="mt-2 line-clamp-3 block text-sm leading-6 text-gray-400">{regras[topico].resumo}</span>
                    </span>
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-[#c7a44c]/20 bg-[#c7a44c]/10 text-[#d8bd75] transition group-hover:border-[#c7a44c]/45 group-hover:bg-[#c7a44c]/15">
                      <ChevronRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                    </span>
                  </button>
                ))}
              </div>
            </section>
          ))}
        </div>
      ) : <p className="py-16 text-center text-sm text-gray-500">Nenhum capítulo corresponde à busca.</p>}
    </motion.div>
  );
}

interface ChapterNavigationProps {
  activeTopic: string;
  busca: string;
  groupedKeys: Record<string, string[]>;
  titulos: Record<string, string>;
  onBuscaChange: (value: string) => void;
  onSelectTopic: (topic: string) => void;
  onClose?: () => void;
}

const ChapterNavigation = ({
  activeTopic,
  busca,
  groupedKeys,
  titulos,
  onBuscaChange,
  onSelectTopic,
  onClose,
}: ChapterNavigationProps) => {
  const [categoriasAbertas, setCategoriasAbertas] = useState<Set<string>>(
    () => {
      const grupoAtivo = activeTopic ? grupoDoTopico(activeTopic)?.titulo : null;
      return new Set([grupoAtivo ?? GRUPOS_NAVEGACAO[0].titulo]);
    },
  );

  useEffect(() => {
    const grupoAtivo = activeTopic ? grupoDoTopico(activeTopic)?.titulo : null;
    if (!grupoAtivo) return;
    setCategoriasAbertas((atuais) => new Set([...atuais, grupoAtivo]));
  }, [activeTopic]);

  useEffect(() => {
    if (busca.trim()) setCategoriasAbertas(new Set(Object.keys(groupedKeys)));
  }, [busca, groupedKeys]);

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
                      <span>{tituloTopico(key, titulos)}</span>
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
  const mobileMenuRef = useRef<HTMLElement>(null);
  const { usuario, campanhaAtiva } = useAuthStore();
  const isMestre = usuario?.papel_plataforma === 'admin'
    || usuario?.papel_plataforma === 'criador'
    || campanhaAtiva?.papel === 'mestre'
    || campanhaAtiva?.papel === 'assistente';
  const podeEditarConteudo = usuario?.papel_plataforma === 'criador'
    || campanhaAtiva?.papel === 'mestre';
  const {
    regras: regrasCatalog,
    titulos,
    classes: classesCatalogo,
    racas: racasCatalogo,
    fluxos,
    magias,
    rituais,
    selos,
    encantamentos,
    pericias,
    legados,
    condicoes,
    crises,
  } = useResolvedRules(campanhaAtiva?.id);
  useDialogAccessibility({
    open: menuAberto,
    dialogRef: mobileMenuRef,
    onClose: () => setMenuAberto(false),
  });
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
    () => ordenarTopicosPorNavegacao(Object.keys(regrasCatalog).filter((key) => key !== 'mestre' || isMestre)),
    [isMestre, regrasCatalog],
  );
  const racasVisiveis = useMemo(
    () => isMestre
      ? racasCatalogo
      : racasCatalogo.filter((raca) => raca.id === 'entidade'
        || (!raca.indisponivel && (raca.categoria !== 'esquecida' || racasLiberadas.has(raca.id)))),
    [isMestre, racasCatalogo, racasLiberadas],
  );
  const classesVisiveis = useMemo(
    () => isMestre
      ? classesCatalogo
      : classesCatalogo.filter((classe) => !classe.indisponivel && (classe.categoria !== 'esquecida' || classesLiberadas.has(classe.id))),
    [isMestre, classesCatalogo, classesLiberadas],
  );
  const topicoSolicitado = searchParams.get('topico');
  const activeTopic = topicoSolicitado && catalogKeys.includes(topicoSolicitado)
    ? topicoSolicitado
    : '';

  const setActiveTopic = (topico: string) => {
    const proximosParametros = new URLSearchParams(searchParams);
    proximosParametros.set('topico', topico);
    setSearchParams(proximosParametros);
    document.getElementById('regra-leitor')?.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const filteredKeys = useMemo(() => {
    const termo = normalizar(busca.trim());
    if (!termo) return catalogKeys;
    return catalogKeys.filter((key) => {
      const topic = regrasCatalog[key];
      const corpoVisivel = `${topic.corpo} ${isMestre ? topic.corpoMestre ?? '' : ''}`.replace(/<[^>]+>/g, ' ');
      const alvo = normalizar(`${tituloTopico(key, titulos)} ${topic.resumo} ${corpoVisivel}`);
      return termo.split(/\s+/).filter(Boolean).every((palavra) => alvo.includes(palavra));
    });
  }, [busca, catalogKeys, isMestre, regrasCatalog, titulos]);

  const groupedKeys = useMemo(() => {
    const groups: Record<string, string[]> = {};
    const filtrados = new Set(filteredKeys);
    GRUPOS_NAVEGACAO.forEach((grupo) => {
      const topicos = grupo.topicos.filter((topico) => filtrados.has(topico));
      if (topicos.length) groups[grupo.titulo] = topicos;
    });
    const mapeados = new Set(Object.values(groups).flat());
    const outros = filteredKeys.filter((topico) => !mapeados.has(topico));
    if (outros.length) groups.Outros = outros;
    return groups;
  }, [filteredKeys]);

  const topicData = regrasCatalog[activeTopic];
  const activeIndex = catalogKeys.indexOf(activeTopic);
  const prevTopic = activeIndex > 0 ? catalogKeys[activeIndex - 1] : null;
  const nextTopic = activeIndex >= 0 && activeIndex < catalogKeys.length - 1 ? catalogKeys[activeIndex + 1] : null;
  const conteudoAmplo = [
    'classes',
    'racas',
    'legados',
    'transporte',
    'marcas-cicatrizes',
    'catalogo-magico',
    'modificacoes-equipamentos',
    'veiculos-cenas',
    'aflicoes',
  ].includes(activeTopic);

  return (
    <div className="app-viewport mx-auto flex max-w-[112.5rem] gap-3 overflow-hidden sm:gap-4 lg:gap-6">
      <aside className="hidden h-full min-h-0 w-72 shrink-0 overflow-hidden rounded-[1.6rem] border border-white/10 bg-[#0d0c12]/95 py-5 shadow-2xl backdrop-blur-xl md:block">
        <ChapterNavigation
          activeTopic={activeTopic}
          busca={busca}
          groupedKeys={groupedKeys}
          titulos={titulos}
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
            <span className="block text-[9px] font-bold uppercase tracking-[0.2em] text-gray-500">{activeTopic ? `Capítulo ${activeIndex + 1}` : 'Livro de regras'}</span>
            <strong className="block truncate text-sm text-white">{activeTopic ? tituloTopico(activeTopic, titulos) : 'Por onde começar'}</strong>
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
                className={`regra-book-page mx-auto min-h-full px-5 py-8 sm:px-8 lg:px-12 lg:py-12 ${conteudoAmplo ? 'max-w-[82.5rem]' : 'max-w-[70rem]'}`}
              >
                <header className="mb-10 border-b border-[#c7a44c]/20 pb-8">
                  <div className="mb-5 flex flex-wrap items-center gap-3 text-[10px] font-bold uppercase tracking-[0.22em]">
                    <span className="text-[#c7a44c]">Capítulo {activeIndex + 1} de {catalogKeys.length}</span>
                    <span aria-hidden="true" className="text-gray-700">◆</span>
                    <span className="text-gray-500">{grupoDoTopico(activeTopic)?.titulo || topicData.categoria || 'Regras gerais'}</span>
                    {podeEditarConteudo ? (
                      <Link
                        to={`/mestre?aba=conteudo&secao=regras&item=regra:${encodeURIComponent(activeTopic)}`}
                        className="ml-auto inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-gray-300 transition hover:border-[#c7a44c]/35 hover:text-[#e1c77e]"
                      >
                        <Pencil size={11} /> Editar
                      </Link>
                    ) : null}
                    <span className={`${podeEditarConteudo ? '' : 'ml-auto'} flex items-center gap-1.5 rounded-full border border-[#c7a44c]/20 bg-[#c7a44c]/10 px-3 py-1 text-[#c7a44c]`}>
                      <Sparkles size={11} /> {topicData.status}
                    </span>
                  </div>
                  <h1 className="text-3xl font-bold leading-tight text-[#f2ead7] sm:text-4xl lg:text-5xl" style={{ fontFamily: 'Cinzel, serif' }}>
                    {tituloTopico(activeTopic, titulos)}
                  </h1>
                  <p className="mt-5 max-w-[76ch] text-base leading-8 text-gray-400 sm:text-lg">
                    {topicData.resumo}
                  </p>
                </header>

                {activeTopic === 'materiais' && (
                  <section className="mb-9 flex flex-col gap-4 rounded-2xl border border-emerald-300/20 bg-gradient-to-r from-emerald-400/10 to-transparent p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6">
                    <div>
                      <h2 className="font-serif text-xl font-bold text-emerald-50">Está procurando um material ou preparo?</h2>
                      <p className="mt-1 text-sm leading-6 text-gray-400">Use o compêndio para consultar os materiais e ver quando algo realmente precisa entrar no inventário.</p>
                    </div>
                    <Link to="/materiais" className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl bg-emerald-300 px-4 py-2.5 text-sm font-black text-emerald-950 transition hover:bg-emerald-200">Abrir compêndio <ArrowRight size={16} /></Link>
                  </section>
                )}

                {activeTopic === 'racas' ? (
                  <GridRacas racas={racasVisiveis} />
                ) : activeTopic === 'classes' ? (
                  <GridClasses classes={classesVisiveis} />
                ) : activeTopic === 'catalogo-magico' ? (
                  <>
                    <RegrasContent htmlContent={topicData.corpo} />
                    <CatalogoMagico fluxos={fluxos} magias={magias} rituais={rituais} selos={selos} encantamentos={encantamentos} />
                  </>
                ) : activeTopic === 'legados' ? (
                  <>
                    <RegrasContent htmlContent={topicData.corpo} />
                    <CatalogoLegados catalogo={legados} />
                  </>
                ) : activeTopic === 'pericias' ? (
                  <>
                    <RegrasContent htmlContent={topicData.corpo} ocultarCatalogoPericias />
                    <CatalogoPericias pericias={pericias} />
                  </>
                ) : activeTopic === 'condicoes' ? (
                  <>
                    <RegrasContent htmlContent={topicData.corpo} />
                    <CatalogoCondicoes condicoes={condicoes} crises={crises} />
                  </>
                ) : activeTopic === 'aflicoes' ? (
                  <>
                    <RegrasContent htmlContent={topicData.corpo} ocultarCatalogoAflicoes />
                    <CatalogoAflicoes />
                  </>
                ) : activeTopic === 'bestiario' ? (
                  <>
                    <RegrasContent htmlContent={topicData.corpo} />
                    <CatalogoBestiario />
                  </>
                ) : activeTopic === 'mestre' ? (
                  <>
                    <RegrasContent htmlContent={topicData.corpo} />
                    <FerramentasMestre campanhaId={campanhaAtiva?.id} />
                    <NotasInternasMestre campanhaId={campanhaAtiva?.id} />
                  </>
                ) : (
                  <RegrasContent htmlContent={topicData.corpo} />
                )}

                {/* A mesma regra pelo lado de quem conduz. Fica no fim da própria
                 * página em vez de virar um capítulo separado: assim a orientação
                 * de mesa não se descola da regra que ela orienta. */}
                {isMestre && topicData.corpoMestre && (
                  <section className="mt-14 overflow-hidden rounded-2xl border border-[#c7a44c]/30 bg-[#c7a44c]/[0.04]">
                    <header className="flex items-center gap-2.5 border-b border-[#c7a44c]/20 bg-[#c7a44c]/10 px-5 py-3 sm:px-7">
                      <LockKeyhole size={14} className="text-[#cbb87e]" />
                      <h2 className="text-[11px] font-black uppercase tracking-[0.18em] text-[#cbb87e]" style={{ fontFamily: 'Inter, sans-serif' }}>
                        Para quem conduz a mesa
                      </h2>
                    </header>
                    <div className="px-5 py-2 sm:px-7">
                      <RegrasContent htmlContent={topicData.corpoMestre} />
                    </div>
                  </section>
                )}

                <footer className="mt-16 flex items-stretch justify-between gap-3 border-t border-[#c7a44c]/20 pt-7">
                  {prevTopic ? (
                    <button type="button" onClick={() => setActiveTopic(prevTopic)} className="group flex min-w-0 flex-1 items-center gap-3 rounded-xl border border-white/10 bg-black/20 p-3 text-left transition-colors hover:border-[#c7a44c]/40 hover:bg-[#c7a44c]/5 sm:max-w-[300px]">
                      <ArrowLeft size={18} className="shrink-0 text-gray-600 group-hover:text-[#c7a44c]" />
                      <span className="min-w-0"><small className="block text-[9px] font-bold uppercase tracking-widest text-gray-600">Capítulo anterior</small><strong className="mt-1 block truncate text-xs text-gray-300 sm:text-sm">{tituloTopico(prevTopic, titulos)}</strong></span>
                    </button>
                  ) : <div className="flex-1 sm:max-w-[300px]" />}
                  {nextTopic ? (
                    <button type="button" onClick={() => setActiveTopic(nextTopic)} className="group flex min-w-0 flex-1 items-center justify-end gap-3 rounded-xl border border-white/10 bg-black/20 p-3 text-right transition-colors hover:border-[#c7a44c]/40 hover:bg-[#c7a44c]/5 sm:max-w-[300px]">
                      <span className="min-w-0"><small className="block text-[9px] font-bold uppercase tracking-widest text-gray-600">Próximo capítulo</small><strong className="mt-1 block truncate text-xs text-gray-300 sm:text-sm">{tituloTopico(nextTopic, titulos)}</strong></span>
                      <ArrowRight size={18} className="shrink-0 text-gray-600 group-hover:text-[#c7a44c]" />
                    </button>
                  ) : null}
                </footer>
              </motion.article>
            ) : <RulesLanding availableTopics={catalogKeys} regras={regrasCatalog} titulos={titulos} onSelectTopic={setActiveTopic} />}
          </AnimatePresence>
        </main>
      </section>

      <AnimatePresence>
        {menuAberto ? (
          <motion.div className="modal-viewport fixed inset-0 z-[80] md:hidden" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <button type="button" aria-label="Fechar capítulos" onClick={() => setMenuAberto(false)} className="absolute inset-0 bg-black/75 backdrop-blur-sm" />
            <motion.aside
              ref={mobileMenuRef}
              role="dialog"
              aria-modal="true"
              aria-label="Capítulos do livro de regras"
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ type: 'spring', damping: 28, stiffness: 260 }}
              className="absolute bottom-0 left-0 top-0 w-[min(88vw,340px)] overflow-hidden border-r border-white/10 bg-[#0d0c12] py-5 shadow-2xl"
            >
              <ChapterNavigation
                activeTopic={activeTopic}
                busca={busca}
                groupedKeys={groupedKeys}
                titulos={titulos}
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
