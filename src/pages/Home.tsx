import InteractiveModuleCard from '../InteractiveModuleCard';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';

export default function Home() {
  const navigate = useNavigate();

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
    },
    {
      title: 'Mundo',
      description: 'Deidades, fluxos, reinos e cronologias da lore.',
      iconUrl: '/assets/img/icons/menu/mundo.webp',
      path: '/mundo',
    },
    {
      title: 'Livro',
      description: 'Mecânicas, atributos, testes e rituais.',
      iconUrl: '/assets/img/icons/menu/regras.webp',
      path: '/regras',
    },
    {
      title: 'Loja',
      description: 'Armas, equipamentos, poções e mercadores.',
      iconUrl: '/assets/img/icons/menu/loja.webp',
      path: '/loja',
    },
    {
      title: 'Sessão ao Vivo',
      description: 'Iniciativa, combate e vida em tempo real.',
      iconUrl: '/assets/img/icons/menu/sessao-ao-vivo.png',
      path: '/sessao',
    },
  ];

  return (
    <main className="relative z-10 p-8 flex flex-col items-center justify-center min-h-screen w-full pl-32 max-w-[1600px] mx-auto">

      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, ease: 'easeOut' }}
        className="text-center mb-20"
      >
        <span className="uppercase tracking-[0.3em] text-primary/70 text-sm font-semibold mb-4 block">
          Plataforma de visualização de
        </span>
        <h1
          className="text-6xl md:text-8xl font-bold mb-6 text-white drop-shadow-[0_0_30px_rgba(196,160,82,0.15)] tracking-wide"
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
        className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-5 gap-6 w-full"
      >
        {modulos.map((mod) => (
          <motion.div
            key={mod.path}
            variants={itemVariants}
            onClick={() => navigate(mod.path)}
            className="h-full"
          >
            <InteractiveModuleCard
              title={mod.title}
              description={mod.description}
              iconUrl={mod.iconUrl}
            />
          </motion.div>
        ))}
      </motion.div>
    </main>
  );
}
