import InteractiveModuleCard from '../InteractiveModuleCard';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useAuthStore } from '../store/useAuthStore';
import NovidadesMural from './NovidadesMural';
import { SeletorDeCampanha } from './Campanha/SeletorDeCampanha';
import CalendarioSessoes from './Quadro/CalendarioSessoes';

import { SimboloOculto } from '../components/descobertas/SimboloOculto';
export default function Home() {
  const navigate = useNavigate();
  const campanha = useAuthStore((estado) => estado.campanhaAtiva);

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
      {campanha?.id ? <div className="mb-4 flex w-full justify-end"><SeletorDeCampanha /></div> : null}

      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, ease: 'easeOut' }}
        className="mb-10 text-center sm:mb-16 xl:mb-20"
      >
        <span className="uppercase tracking-[0.3em] text-primary/80 text-sm font-semibold mb-4 block">
          Plataforma de visualização de
        </span>
        <h1
          data-descoberta="jardineiro"
          data-cliques="7"
          className="mb-6 text-[clamp(2.5rem,10vw,6rem)] font-bold leading-[1.05] tracking-wide text-white drop-shadow-[0_0_30px_rgba(196,160,82,0.15)]"
          style={{ fontFamily: 'Cinzel, serif' }}
        >
          O <span className="text-primary">Jardim</span> RPG
        </h1>
        <p className="text-gray-400 max-w-2xl mx-auto text-lg leading-relaxed">
          Fichas, mundo, regras e itens reunidos no mesmo lugar. Cada informação fica visível apenas para
          quem deve vê-la.
        </p>
      </motion.div>

      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="show"
        className="grid w-full grid-cols-[repeat(auto-fit,minmax(min(100%,13rem),1fr))] gap-4 sm:gap-6"
      >
        {modulos.map((mod) => (
          <motion.button
            type="button"
            key={mod.path}
            variants={itemVariants}
            onClick={() => navigate(mod.path)}
            className="h-full w-full text-left"
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
    </main>
  );
}
