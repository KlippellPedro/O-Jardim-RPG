import { useEffect, useRef, useState } from 'react';
import InteractiveModuleCard from '../InteractiveModuleCard';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Compass, Crown, FlaskConical, ScrollText } from 'lucide-react';
import { sfx } from '../utils/audioSynth';
import { useAuthStore } from '../store/useAuthStore';
import NovidadesMural from './NovidadesMural';
import { SeletorDeCampanha } from './Campanha/SeletorDeCampanha';
import CalendarioSessoes from './Quadro/CalendarioSessoes';
import { ContinuarDeOndeParou } from './ContinuarDeOndeParou';

import { SimboloOculto } from '../components/descobertas/SimboloOculto';
import { GuidedTour } from '../components/ui/GuidedTour';
import { guiasAutomaticosLigados } from '../utils/guias';
import { INICIO_TOUR_STEPS, inicioTourJaVisto, serializarInicioTourVisto } from './inicioTourConfig';

const ATALHOS_SECUNDARIOS = [
  { titulo: 'Campanha', path: '/campanha', icone: Crown },
  { titulo: 'Quadro', path: '/quadro', icone: ScrollText },
  { titulo: 'Materiais', path: '/materiais', icone: FlaskConical },
];
/** Cinco cartões não dividem bem nenhuma grade: em vez de sobrar um sozinho na última fileira, o último ocupa a fileira
 * inteira (duas colunas), e em seis colunas os dois de baixo dividem a fileira ao meio. A partir de 1240 px cabem os cinco. */
const classeDoCartao = (indice: number, total: number) => [
  'h-full w-full text-left',
  indice === total - 1 && total % 2 === 1 ? 'min-[520px]:max-lg:col-span-2' : '',
  indice < 3 ? 'lg:max-[1239px]:col-span-2' : 'lg:max-[1239px]:col-span-3',
].filter(Boolean).join(' ');

export default function Home() {
  const navigate = useNavigate();
  const campanha = useAuthStore((estado) => estado.campanhaAtiva);
  const usuario = useAuthStore((estado) => estado.usuario);
  const chaveTour = `jardim:inicio-tour:v1:${usuario?.id || 'local'}`;
  const [tourAberto, setTourAberto] = useState(false);
  const tourTentadoRef = useRef(false);

  // O Guia do Início abre sozinho na primeira visita, como os guias das outras páginas.
  useEffect(() => {
    if (tourAberto || tourTentadoRef.current || !guiasAutomaticosLigados()) return undefined;
    try {
      if (inicioTourJaVisto(localStorage.getItem(chaveTour))) return undefined;
    } catch {
      // Sem armazenamento, o guia ainda abre uma vez nesta montagem.
    }
    const timer = window.setTimeout(() => {
      tourTentadoRef.current = true;
      setTourAberto(true);
    }, 900);
    return () => window.clearTimeout(timer);
  }, [chaveTour, tourAberto]);

  const encerrarTour = () => {
    try {
      localStorage.setItem(chaveTour, serializarInicioTourVisto());
    } catch {
      // Sem armazenamento, o guia só deixa de abrir até a página recarregar.
    }
    setTourAberto(false);
  };

  const containerVariants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: { staggerChildren: 0.08 },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 24 },
    show: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 280, damping: 22 } },
  };

  const modulos = [
    {
      title: 'Ficha',
      description: 'Criar e gerenciar seus personagens e inventário.',
      iconUrl: '/assets/img/icons/menu/ficha.webp',
      path: '/ficha',
      dieSides: 20 as const,
    },
    {
      title: 'Mundo',
      description: 'Deidades, fluxos, reinos e cronologias da lore.',
      iconUrl: '/assets/img/icons/menu/mundo.webp',
      path: '/mundo',
      dieSides: 12 as const,
    },
    {
      title: 'Livro',
      description: 'Mecânicas, atributos, testes e rituais.',
      iconUrl: '/assets/img/icons/menu/regras.webp',
      path: '/regras',
      dieSides: 10 as const,
    },
    {
      title: 'Loja',
      description: 'Armas, equipamentos, poções e mercadores.',
      iconUrl: '/assets/img/icons/menu/loja.webp',
      path: '/loja',
      dieSides: 6 as const,
    },
    {
      title: 'Sessão ao Vivo',
      description: 'Iniciativa, combate e vida em tempo real.',
      iconUrl: '/assets/img/icons/menu/sessao-ao-vivo.png',
      path: '/sessao',
      dieSides: 4 as const,
    },
  ];

  return (
    <main className="app-page mx-auto flex max-w-[100rem] flex-col items-center justify-center">
      <div className="mb-4 flex w-full flex-wrap items-center justify-end gap-2">
        <button
          type="button"
          onClick={() => setTourAberto(true)}
          className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2 text-xs font-bold text-gray-300 transition-colors hover:border-primary/30 hover:text-white"
        >
          <Compass size={15} className="text-primary/80" aria-hidden="true" />
          Guia do Início
        </button>
        {campanha?.id ? <div data-tour="inicio-campanha"><SeletorDeCampanha /></div> : null}
      </div>

      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, ease: 'easeOut' }}
        className="mb-6 text-center sm:mb-16 xl:mb-20"
      >
        <span className="mb-2 block text-[0.7rem] font-semibold uppercase tracking-[0.22em] text-primary/80 sm:mb-4 sm:text-sm sm:tracking-[0.3em]">
          Plataforma de visualização de
        </span>
        <h1
          data-descoberta="jardineiro"
          data-cliques="7"
          className="mb-3 text-[clamp(2.4rem,10vw,6rem)] font-bold sm:mb-6 leading-[1.05] tracking-wide text-white drop-shadow-[0_0_30px_rgba(196,160,82,0.15)]"
          style={{ fontFamily: 'Cinzel, serif' }}
        >
          O <span className="text-primary">Jardim</span> RPG
        </h1>
        <p className="mx-auto max-w-2xl text-sm leading-relaxed text-gray-400 sm:text-lg">
          Fichas, mundo, regras e itens reunidos no mesmo lugar. Cada informação fica visível apenas para
          quem deve vê-la.
        </p>
      </motion.div>

      <ContinuarDeOndeParou />

      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="show"
        className="grid w-full grid-cols-1 gap-4 min-[520px]:grid-cols-2 lg:grid-cols-6 min-[1240px]:grid-cols-5 sm:gap-6"
        data-tour="inicio-modulos"
      >
        {modulos.map((mod, indice) => (
          <motion.button
            type="button"
            key={mod.path}
            variants={itemVariants}
            onClick={() => navigate(mod.path)}
            className={classeDoCartao(indice, modulos.length)}
            aria-label={`Abrir ${mod.title}`}
          >
            <InteractiveModuleCard
              title={mod.title}
              description={mod.description}
              iconUrl={mod.iconUrl}
              dieSides={mod.dieSides}
            />
          </motion.button>
        ))}
      </motion.div>

      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="show"
        className="mt-4 flex w-full flex-wrap justify-center gap-3"
        data-tour="inicio-atalhos"
      >
        {ATALHOS_SECUNDARIOS.map((atalho) => (
          <motion.button
            key={atalho.path}
            type="button"
            variants={itemVariants}
            onClick={() => navigate(atalho.path)}
            onMouseEnter={() => sfx.play('hover')}
            data-sfx="navigate"
            className="group flex items-center gap-2.5 rounded-xl border border-white/10 bg-white/[0.04] px-4 py-2.5 transition-colors hover:border-primary/30 hover:bg-white/[0.08]"
            aria-label={`Abrir ${atalho.titulo}`}
          >
            <atalho.icone size={18} className="text-primary/70 transition-colors group-hover:text-primary" />
            <span className="text-sm font-semibold text-gray-300 group-hover:text-white">{atalho.titulo}</span>
          </motion.button>
        ))}
      </motion.div>

      <div className="mt-10 grid w-full gap-6 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
        <NovidadesMural />
        {campanha?.id ? (
          <CalendarioSessoes campanhaId={campanha.id} />
        ) : (
          <section className="rounded-2xl border border-white/10 bg-[#0f0e15]/90 p-5 text-sm text-gray-500">
            Escolha uma campanha para ver o calendário das sessões.
          </section>
        )}
      </div>
      <div className="mt-8 flex w-full justify-end"><SimboloOculto chave="runa_solitaria" glifo="ᛉ" /></div>

      {tourAberto ? (
        <GuidedTour
          passos={INICIO_TOUR_STEPS}
          accent="#c7a44c"
          nomeGuia="Guia do Início"
          onClose={encerrarTour}
          onFinish={encerrarTour}
        />
      ) : null}
    </main>
  );
}
