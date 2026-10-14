import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { Link, useLocation, useSearchParams } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { ArrowRight, LockKeyhole } from 'lucide-react';
import { ANTES_DE_LER, CONTINUE_EM, localizarTopico, numerarLivro } from '../../../data/regras/livro';
import { ordenarTopicosPorNavegacao } from '../../../data/regras/navegacao';
import { tituloTopico } from '../../../data/regras/titulos';
import { useResolvedRules } from '../../hooks/useResolvedRules';
import { useLivroPdf } from '../../hooks/useLivroPdf';
import { useAuthStore } from '../../store/useAuthStore';
import { usePermissoes } from '../../hooks/usePermissoes';
import { GuidedTour } from '../../components/ui/GuidedTour';
import { guiasAutomaticosLigados } from '../../utils/guias';
import { classesVisiveis, liberacoesDoMembro, racasVisiveis } from '../../services/visibilidadeRegras';
import { paginaDoTopico, urlDoPdf } from '../../services/livroApi';
import { REGRAS_TOUR_STEPS, regrasTourJaVisto, serializarRegrasTourVisto } from './regrasTourConfig';
import { CatalogoLegados } from './components/CatalogoLegados';
import { CatalogoMagico } from './components/CatalogoMagico';
import { CatalogoCondicoes } from './components/CatalogoCondicoes';
import { CatalogoPericias } from './components/CatalogoPericias';
import { CatalogoAflicoes } from './components/CatalogoAflicoes';
import { GridClasses } from './components/GridClasses';
import { GridRacas } from './components/GridRacas';
import { RegrasContent } from './components/RegrasContent';
import { GuiaDoMestre } from './components/GuiaDoMestre';
import { BarraDoLeitor } from './components/BarraDoLeitor';
import { CabecalhoDoTopico } from './components/CabecalhoDoTopico';
import { CartaoDoPdf } from './components/CartaoDoPdf';
import { ControlesDeLeitura } from './components/ControlesDeLeitura';
import { LandingDoLivro, type LeituraParaContinuar, type SubtopicoNavegacao } from './components/LandingDoLivro';
import { NavegacaoDoLivro } from './components/NavegacaoDoLivro';
import { RodapeDoTopico } from './components/RodapeDoTopico';
import { estantesParaNavegacao, estruturarGuiaMestre } from './guiaMestre';
import { estiloDoAcento } from './acento';
import { casaComBusca, normalizar, textoSemMarcas } from './regrasBusca';
import {
  CHAVE_DA_LEITURA,
  CHAVE_DAS_PREFERENCIAS,
  PREFERENCIAS_PADRAO,
  chaveDaConta,
  lerLeituraSalva,
  lerPreferencias,
  leituraPedeContinuar,
  progressoDeRolagem,
  serializarLeitura,
  serializarPreferencias,
  PROGRESSO_MINIMO_PARA_CONTINUAR,
  type PreferenciasDeLeitura,
} from './regrasLeitura';
import { useDialogAccessibility } from '../../hooks/useDialogAccessibility';
import { limparPosicaoRetornoRegras, obterPosicaoRetornoRegras } from './regrasScrollRestoration';

import { SimboloOculto } from '../../components/descobertas/SimboloOculto';

const TOPICOS_DE_CONTEUDO_AMPLO = new Set([
  'classes',
  'racas',
  'legados',
  'transporte',
  'marcas-cicatrizes',
  'catalogo-magico',
  'modificacoes-equipamentos',
  'veiculos-cenas',
  'aflicoes',
  'mestre',
]);

export const RegrasPage = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const location = useLocation();
  const [busca, setBusca] = useState('');
  const [menuAberto, setMenuAberto] = useState(false);
  const mobileMenuRef = useRef<HTMLElement>(null);
  const { usuario, campanhaAtiva } = useAuthStore();
  const { podeEditarConteudo } = usePermissoes();
  const isMestre = usuario?.papel_plataforma === 'admin'
    || usuario?.papel_plataforma === 'criador'
    || campanhaAtiva?.papel === 'mestre'
    || campanhaAtiva?.papel === 'assistente';
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
  const { jogador: pdfDoJogador, mestre: pdfDoMestre } = useLivroPdf(campanhaAtiva?.id);
  useDialogAccessibility({
    open: menuAberto,
    dialogRef: mobileMenuRef,
    onClose: () => setMenuAberto(false),
  });
  const config = campanhaAtiva?.configuracoes ?? {};
  const liberacoes = useMemo(
    () => liberacoesDoMembro(config, usuario?.id),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [config.racas_liberadas, config.racas_liberadas_membros, config.classes_liberadas, config.classes_liberadas_membros, usuario?.id],
  );

  const catalogKeys = useMemo(
    () => ordenarTopicosPorNavegacao(Object.keys(regrasCatalog).filter((key) => key !== 'mestre' || isMestre)),
    [isMestre, regrasCatalog],
  );
  const racasVisiveisNoLivro = useMemo(
    () => racasVisiveis(racasCatalogo, isMestre, liberacoes.racas),
    [isMestre, racasCatalogo, liberacoes.racas],
  );
  const classesVisiveisNoLivro = useMemo(
    () => classesVisiveis(classesCatalogo, isMestre, liberacoes.classes),
    [isMestre, classesCatalogo, liberacoes.classes],
  );
  const topicoSolicitado = searchParams.get('topico');
  const activeTopic = topicoSolicitado && catalogKeys.includes(topicoSolicitado)
    ? topicoSolicitado
    : '';
  const retornoAplicadoRef = useRef(false);

  useLayoutEffect(() => {
    if (retornoAplicadoRef.current) return;
    const posicao = obterPosicaoRetornoRegras(location.state, activeTopic);
    if (!posicao) return;

    let quadro = 0;
    let tentativas = 0;
    const restaurar = () => {
      const leitor = document.getElementById('regra-leitor');
      if (!leitor) {
        if (tentativas++ < 30) quadro = window.requestAnimationFrame(restaurar);
        return;
      }

      const limiteAtual = Math.max(0, leitor.scrollHeight - leitor.clientHeight);
      if (limiteAtual + 1 < posicao.scrollTop && tentativas++ < 30) {
        quadro = window.requestAnimationFrame(restaurar);
        return;
      }

      retornoAplicadoRef.current = true;
      leitor.scrollTo({ top: Math.min(posicao.scrollTop, limiteAtual), behavior: 'auto' });
      limparPosicaoRetornoRegras();
    };

    quadro = window.requestAnimationFrame(restaurar);
    return () => window.cancelAnimationFrame(quadro);
  }, [activeTopic, location.state]);

  const estantesMestre = useMemo(
    () => (isMestre && regrasCatalog.mestre
      ? estantesParaNavegacao(estruturarGuiaMestre(regrasCatalog.mestre.corpo))
      : []),
    [isMestre, regrasCatalog],
  );
  const subtopicos = useMemo<Record<string, SubtopicoNavegacao[]>>(
    () => {
      const mapa: Record<string, SubtopicoNavegacao[]> = {};
      if (estantesMestre.length) mapa.mestre = estantesMestre;
      return mapa;
    },
    [estantesMestre],
  );
  const subtopicoAtivo = searchParams.get('estante');

  // Onde a pessoa estava (para "continuar") e como ela gosta de ler (tamanho e tipo da letra).
  const chaveDaLeitura = chaveDaConta(CHAVE_DA_LEITURA, usuario?.id);
  const chaveDasPreferencias = chaveDaConta(CHAVE_DAS_PREFERENCIAS, usuario?.id);
  const [preferencias, setPreferencias] = useState<PreferenciasDeLeitura>(() => {
    try {
      return lerPreferencias(localStorage.getItem(chaveDasPreferencias));
    } catch {
      return PREFERENCIAS_PADRAO;
    }
  });
  const mudarPreferencias = (proximas: PreferenciasDeLeitura) => {
    setPreferencias(proximas);
    try {
      localStorage.setItem(chaveDasPreferencias, serializarPreferencias(proximas));
    } catch {
      // Sem armazenamento a escolha vale só nesta visita.
    }
  };

  const topicosValidos = useMemo(() => new Set(catalogKeys), [catalogKeys]);
  const capitulos = useMemo(
    () => numerarLivro(catalogKeys, { titulos, comMestre: isMestre }),
    [catalogKeys, titulos, isMestre],
  );
  const titulosDosTopicos = useMemo(
    () => Object.fromEntries(catalogKeys.map((id) => [id, tituloTopico(id, titulos)])),
    [catalogKeys, titulos],
  );
  // Quando a pessoa pede para continuar, o ponto onde ela parou espera aqui até o texto do tópico existir.
  const restaurarProgressoRef = useRef<{ topico: string; progresso: number } | null>(null);
  const abrirTopico = useCallback((topico: string, aoAbrir?: { progresso: number }) => {
    const proximosParametros = new URLSearchParams(searchParams);
    proximosParametros.set('topico', topico);
    proximosParametros.delete('estante');
    if (aoAbrir) restaurarProgressoRef.current = { topico, progresso: aoAbrir.progresso };
    setSearchParams(proximosParametros);
  }, [searchParams, setSearchParams]);

  // Tópico novo começa no alto. Fica depois da troca (e não no clique) para o progresso do tópico que a
  // pessoa estava lendo ser gravado antes de a rolagem voltar a zero.
  useLayoutEffect(() => {
    document.getElementById('regra-leitor')?.scrollTo({ top: 0, behavior: 'auto' });
  }, [activeTopic]);

  const voltarAoInicio = () => {
    const proximosParametros = new URLSearchParams(searchParams);
    proximosParametros.delete('topico');
    proximosParametros.delete('estante');
    setSearchParams(proximosParametros);
  };

  const abrirSubtopico = (topico: string, subtopico: string) => {
    const proximosParametros = new URLSearchParams(searchParams);
    proximosParametros.set('topico', topico);
    proximosParametros.set('estante', subtopico);
    setSearchParams(proximosParametros);
  };

  const [tourAberto, setTourAberto] = useState(false);
  const tourTentadoRef = useRef(false);
  const chaveTour = `jardim:regras-tour:v1:${usuario?.id || 'local'}`;

  const abrirTourRegras = () => {
    if (activeTopic) voltarAoInicio();
    setTourAberto(true);
  };

  const encerrarTourRegras = () => {
    try {
      localStorage.setItem(chaveTour, serializarRegrasTourVisto());
    } catch {
      // O botão manual continua disponível mesmo se o navegador bloquear o armazenamento.
    }
    setTourAberto(false);
  };

  useEffect(() => {
    if (activeTopic || tourAberto || tourTentadoRef.current || !guiasAutomaticosLigados()) return;
    try {
      if (regrasTourJaVisto(localStorage.getItem(chaveTour))) return;
    } catch {
      // Sem armazenamento, o guia ainda abre uma vez nesta montagem.
    }
    const timer = window.setTimeout(() => {
      tourTentadoRef.current = true;
      setTourAberto(true);
    }, 750);
    return () => window.clearTimeout(timer);
  }, [activeTopic, chaveTour, tourAberto]);

  const topicosFiltrados = useMemo(() => {
    const termo = normalizar(busca.trim());
    if (!termo) return new Set(catalogKeys);
    return new Set(catalogKeys.filter((key) => {
      const topic = regrasCatalog[key];
      const corpoVisivel = textoSemMarcas(`${topic.corpo} ${isMestre ? topic.corpoMestre ?? '' : ''}`);
      return casaComBusca(`${tituloTopico(key, titulos)} ${topic.resumo} ${corpoVisivel}`, termo);
    }));
  }, [busca, catalogKeys, isMestre, regrasCatalog, titulos]);

  const capitulosFiltrados = useMemo(
    () => capitulos
      .map((capitulo) => ({ ...capitulo, topicos: capitulo.topicos.filter((topico) => topicosFiltrados.has(topico.id)) }))
      .filter((capitulo) => capitulo.topicos.length > 0),
    [capitulos, topicosFiltrados],
  );

  const topicData = regrasCatalog[activeTopic];
  const localizacao = activeTopic ? localizarTopico(capitulos, activeTopic) : null;
  const activeIndex = catalogKeys.indexOf(activeTopic);
  const vizinho = (id: string | null) => {
    const achado = id ? localizarTopico(capitulos, id) : null;
    return id && achado
      ? { id, titulo: achado.topico.titulo, numero: achado.topico.numero, resumo: regrasCatalog[id]?.resumo ?? '' }
      : null;
  };
  const prevTopic = vizinho(activeIndex > 0 ? catalogKeys[activeIndex - 1] : null);
  const nextTopic = vizinho(activeIndex >= 0 && activeIndex < catalogKeys.length - 1 ? catalogKeys[activeIndex + 1] : null);
  const vejaTambem = (CONTINUE_EM[activeTopic] ?? [])
    .filter((id) => topicosValidos.has(id))
    .map((id) => vizinho(id))
    .filter((item): item is NonNullable<typeof item> => item !== null);
  const conteudoAmplo = TOPICOS_DE_CONTEUDO_AMPLO.has(activeTopic);

  // PDF: o leitor é levado à página do tópico. Quem conduz a mesa prefere a edição dele, que traz as notas.
  const edicaoPreferida = isMestre && pdfDoMestre ? pdfDoMestre : pdfDoJogador;
  const edicaoDoTopico = [edicaoPreferida, pdfDoJogador, pdfDoMestre]
    .find((edicao) => edicao && paginaDoTopico(edicao, activeTopic));
  const paginaNoPdf = edicaoDoTopico ? paginaDoTopico(edicaoDoTopico, activeTopic) : null;
  const linkDoPdf = edicaoDoTopico && paginaNoPdf
    ? { href: urlDoPdf(edicaoDoTopico.edicao, { campanhaId: campanhaAtiva?.id, pagina: paginaNoPdf }), pagina: paginaNoPdf }
    : null;
  const linkParaBaixar = pdfDoJogador ? urlDoPdf('jogador', { baixar: true }) : null;

  // Progresso de leitura: acompanha a rolagem do leitor, e é lembrado para "continuar de onde parou".
  const [progresso, setProgresso] = useState(0);
  const progressoRef = useRef(0);
  const ultimaGravacaoRef = useRef(0);

  const gravarLeitura = useCallback((topico: string, valor: number) => {
    try {
      const salva = lerLeituraSalva(localStorage.getItem(chaveDaLeitura), topicosValidos);
      // Abrir um tópico e sair logo não apaga o "continuar" do que a pessoa estava lendo de verdade.
      if (valor < PROGRESSO_MINIMO_PARA_CONTINUAR && salva && salva.topico !== topico) return;
      localStorage.setItem(chaveDaLeitura, serializarLeitura({ topico, progresso: valor, em: Date.now() }));
    } catch {
      // O "continuar" é um conforto: sem armazenamento, a leitura segue igual.
    }
  }, [chaveDaLeitura, topicosValidos]);

  useEffect(() => {
    progressoRef.current = 0;
    setProgresso(0);
    if (!activeTopic) return undefined;
    const leitor = document.getElementById('regra-leitor');
    if (!leitor) return undefined;

    let quadro = 0;
    const medir = () => {
      quadro = 0;
      const valor = progressoDeRolagem(leitor.scrollTop, leitor.scrollHeight, leitor.clientHeight);
      progressoRef.current = valor;
      setProgresso(valor);
      const agora = Date.now();
      if (agora - ultimaGravacaoRef.current > 800) {
        ultimaGravacaoRef.current = agora;
        gravarLeitura(activeTopic, valor);
      }
    };
    const aoRolar = () => {
      if (!quadro) quadro = window.requestAnimationFrame(medir);
    };
    leitor.addEventListener('scroll', aoRolar, { passive: true });
    return () => {
      leitor.removeEventListener('scroll', aoRolar);
      if (quadro) window.cancelAnimationFrame(quadro);
      gravarLeitura(activeTopic, progressoRef.current);
    };
  }, [activeTopic, gravarLeitura]);

  // "Continuar" abre o tópico e leva a leitura de volta ao ponto em que parou. O texto entra na página
  // um instante depois do primeiro desenho, então a rolagem espera a altura existir.
  useEffect(() => {
    const pedido = restaurarProgressoRef.current;
    if (!pedido || pedido.topico !== activeTopic) return undefined;
    restaurarProgressoRef.current = null;
    let quadro = 0;
    let tentativas = 0;
    const aplicar = () => {
      const leitor = document.getElementById('regra-leitor');
      if (!leitor) return;
      const maximo = leitor.scrollHeight - leitor.clientHeight;
      const alvo = maximo * pedido.progresso;
      if (maximo < alvo + 1 && tentativas++ < 40) {
        quadro = window.requestAnimationFrame(aplicar);
        return;
      }
      leitor.scrollTo({ top: alvo, behavior: 'auto' });
    };
    quadro = window.requestAnimationFrame(aplicar);
    return () => window.cancelAnimationFrame(quadro);
  }, [activeTopic]);

  const leituraSalva = useMemo(() => {
    // `activeTopic` está na lista de propósito: ao voltar do tópico para a página inicial, a leitura é relida.
    void activeTopic;
    try {
      return lerLeituraSalva(localStorage.getItem(chaveDaLeitura), topicosValidos);
    } catch {
      return null;
    }
  }, [activeTopic, chaveDaLeitura, topicosValidos]);
  const continuar: LeituraParaContinuar | null = useMemo(() => {
    if (!leituraPedeContinuar(leituraSalva)) return null;
    const achado = localizarTopico(capitulos, leituraSalva.topico);
    return achado
      ? { topico: leituraSalva.topico, titulo: achado.topico.titulo, numero: achado.topico.numero, progresso: leituraSalva.progresso }
      : null;
  }, [capitulos, leituraSalva]);

  const continuarLeitura = (topico: string) => {
    const progressoSalvo = leituraSalva?.topico === topico ? leituraSalva.progresso : 0;
    abrirTopico(topico, progressoSalvo > 0 ? { progresso: progressoSalvo } : undefined);
  };

  const navegacao = (aoFechar?: () => void) => (
    <NavegacaoDoLivro
      topicoAtivo={activeTopic}
      capitulos={capitulosFiltrados}
      subtopicos={subtopicos}
      subtopicoAtivo={subtopicoAtivo}
      onAbrirSubtopico={abrirSubtopico}
      busca={busca}
      onBuscaChange={setBusca}
      onAbrirTopico={(topico) => abrirTopico(topico)}
      onVoltarAoInicio={voltarAoInicio}
      onAbrirGuia={() => {
        aoFechar?.();
        abrirTourRegras();
      }}
      linkDoPdf={linkParaBaixar}
      onClose={aoFechar}
    />
  );

  const conteudo = (html: string, extras: { ocultarCatalogoAflicoes?: boolean; ocultarCatalogoPericias?: boolean; semSumario?: boolean } = {}) => (
    <RegrasContent
      htmlContent={html}
      onAbrirTopico={(topico) => abrirTopico(topico)}
      titulosDosTopicos={titulosDosTopicos}
      {...extras}
    />
  );

  return (
    <div className="regras-shell app-viewport mx-auto flex max-w-[112.5rem] gap-3 overflow-hidden sm:gap-4 lg:gap-6">
      <aside data-tour="regras-sidebar" className="hidden h-full min-h-0 w-72 shrink-0 overflow-hidden rounded-[1.6rem] border border-white/10 bg-[#0d0c12]/95 py-5 shadow-2xl backdrop-blur-xl md:block">
        {navegacao()}
      </aside>

      <section className="regra-reader-shell flex h-full min-h-0 min-w-0 flex-1 flex-col overflow-hidden rounded-[1.6rem] border border-white/10 bg-[#111017]/95 shadow-2xl">
        <div className="regras-leitor" style={estiloDoAcento(localizacao?.capitulo.id)}>
          <BarraDoLeitor
            progresso={topicData ? progresso : null}
            onAbrirMenu={() => setMenuAberto(true)}
            caminho={localizacao ? (
              <>
                <span>Capítulo {localizacao.capitulo.numero} · {localizacao.capitulo.titulo}</span>
                <span aria-hidden="true" className="mx-2 text-gray-600">›</span>
                <strong className="font-semibold text-gray-200">{localizacao.topico.numero} {localizacao.topico.titulo}</strong>
              </>
            ) : <strong className="font-semibold text-gray-200">Livro de Regras</strong>}
            controles={topicData ? <ControlesDeLeitura preferencias={preferencias} onMudar={mudarPreferencias} /> : null}
          />
        </div>

        <main id="regra-leitor" className="custom-scrollbar min-h-0 flex-1 overflow-y-auto scroll-smooth">
          <AnimatePresence mode="wait">
            {topicData && localizacao ? (
              <motion.article
                key={activeTopic}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.22 }}
                style={estiloDoAcento(localizacao.capitulo.id)}
                data-tamanho={preferencias.tamanho}
                data-fonte={preferencias.fonte}
                className={`regra-book-page regras-leitor mx-auto min-h-full px-5 py-8 sm:px-8 lg:px-12 lg:py-12 ${conteudoAmplo ? 'max-w-[82.5rem]' : 'max-w-[70rem]'}`}
              >
                <CabecalhoDoTopico
                  titulo={tituloTopico(activeTopic, titulos)}
                  numero={localizacao.topico.numero}
                  capitulo={localizacao.capitulo}
                  topico={topicData}
                  antesDeLer={(ANTES_DE_LER[activeTopic] ?? [])
                    .filter((id) => topicosValidos.has(id))
                    .map((id) => ({ id, titulo: titulosDosTopicos[id] }))}
                  onAbrirTopico={(topico) => abrirTopico(topico)}
                  linkDoPdf={linkDoPdf}
                  linkDeEdicao={podeEditarConteudo
                    ? `/criador?aba=conteudo&secao=regras&item=regra:${encodeURIComponent(activeTopic)}${campanhaAtiva ? `&campanha_id=${encodeURIComponent(campanhaAtiva.id)}` : ''}`
                    : null}
                />

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
                  <GridRacas racas={racasVisiveisNoLivro} />
                ) : activeTopic === 'classes' ? (
                  <GridClasses classes={classesVisiveisNoLivro} />
                ) : activeTopic === 'catalogo-magico' ? (
                  <>
                    {conteudo(topicData.corpo)}
                    <CatalogoMagico fluxos={fluxos} magias={magias} rituais={rituais} selos={selos} encantamentos={encantamentos} />
                  </>
                ) : activeTopic === 'legados' ? (
                  <>
                    {conteudo(topicData.corpo)}
                    <CatalogoLegados catalogo={legados} />
                  </>
                ) : activeTopic === 'pericias' ? (
                  <>
                    {conteudo(topicData.corpo, { ocultarCatalogoPericias: true })}
                    <CatalogoPericias pericias={pericias} />
                  </>
                ) : activeTopic === 'condicoes' ? (
                  <>
                    {conteudo(topicData.corpo)}
                    <CatalogoCondicoes condicoes={condicoes} crises={crises} />
                  </>
                ) : activeTopic === 'aflicoes' ? (
                  <>
                    {conteudo(topicData.corpo, { ocultarCatalogoAflicoes: true })}
                    <CatalogoAflicoes />
                  </>
                ) : activeTopic === 'bestiario' ? (
                  <>
                    {conteudo(topicData.corpo)}
                    <Link to="/mundo/universal" className="mt-8 flex items-center gap-3 rounded-2xl border border-cyan-400/25 bg-cyan-400/[0.06] p-5 text-cyan-100 transition hover:bg-cyan-400/10">
                      <span className="flex-1"><strong className="block text-sm">Procurando a lista de criaturas?</strong><span className="text-xs text-cyan-100/70">O Bestiário completo, com números e habilidades de cada uma, fica nos Registros Universais do Mundo.</span></span>
                      <span aria-hidden="true">→</span>
                    </Link>
                  </>
                ) : activeTopic === 'mestre' ? (
                  <GuiaDoMestre html={topicData.corpo} campanhaId={campanhaAtiva?.id} />
                ) : (
                  conteudo(topicData.corpo)
                )}

                {/* A mesma regra pelo lado de quem conduz. Fica no fim da própria
                 * página em vez de virar um tópico separado: assim a orientação
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
                      {conteudo(topicData.corpoMestre, { semSumario: true })}
                    </div>
                  </section>
                )}

                <RodapeDoTopico
                  anterior={prevTopic}
                  proximo={nextTopic}
                  vejaTambem={vejaTambem}
                  onAbrirTopico={(topico) => abrirTopico(topico)}
                  onVoltarAoInicio={voltarAoInicio}
                />
              </motion.article>
            ) : (
              <LandingDoLivro
                disponiveis={catalogKeys}
                regras={regrasCatalog}
                titulos={titulos}
                onAbrirTopico={(topico) => abrirTopico(topico)}
                onContinuar={continuarLeitura}
                isMestre={isMestre}
                podeEditarConteudo={podeEditarConteudo}
                subtopicos={subtopicos}
                cartaoDoPdf={<CartaoDoPdf jogador={pdfDoJogador} mestre={pdfDoMestre} campanhaId={campanhaAtiva?.id} />}
                continuar={continuar}
              />
            )}
          </AnimatePresence>
        </main>
      </section>

      <AnimatePresence>
        {menuAberto ? (
          <motion.div className="modal-viewport fixed inset-0 z-[80] md:hidden" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <button type="button" aria-label="Fechar tópicos" onClick={() => setMenuAberto(false)} className="absolute inset-0 bg-black/75 backdrop-blur-sm" />
            <motion.aside
              ref={mobileMenuRef}
              role="dialog"
              aria-modal="true"
              aria-label="Tópicos do livro de regras"
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ type: 'spring', damping: 28, stiffness: 260 }}
              className="absolute bottom-0 left-0 top-0 w-[min(88vw,340px)] overflow-hidden border-r border-white/10 bg-[#0d0c12] py-5 shadow-2xl"
            >
              {navegacao(() => setMenuAberto(false))}
            </motion.aside>
          </motion.div>
        ) : null}
      </AnimatePresence>

      {tourAberto ? (
        <GuidedTour
          passos={REGRAS_TOUR_STEPS}
          accent="#c7a44c"
          nomeGuia="Guia do Livro"
          rootSelector=".regras-shell"
          onClose={encerrarTourRegras}
          onFinish={encerrarTourRegras}
        />
      ) : null}
      <div className="mt-10 flex justify-end"><SimboloOculto chave="nota_de_rodape" glifo="†" /></div>
    </div>
  );
};
