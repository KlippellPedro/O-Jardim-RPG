import { motion } from 'framer-motion';
import { GitMerge, Sprout } from 'lucide-react';
import type { IRaca } from '../../types/catalogo';

import { PremiumCard } from '../components/premium/PremiumCard';
import { EscolhaRacialCards } from '../components/premium/EscolhaRacialCards';
import { obterTemaPorId } from '../themeMap';

interface SimbionteProps {
  raca: IRaca;
}

export const Simbionte = ({ raca }: SimbionteProps) => {
  const tema = obterTemaPorId(raca.id);
  return (
    <div className="min-h-screen text-orange-50 p-8 selection:bg-orange-500/30 overflow-hidden relative">
      {/* Organic Gradient Background */}
      <div className="fixed inset-0 z-0 bg-black">
        <div
          className="absolute inset-0"
          style={{
            background: 'radial-gradient(circle at 25% 25%, rgba(224,122,95,0.18), transparent 55%), radial-gradient(circle at 75% 75%, rgba(124,45,18,0.22), transparent 55%), #0d0805',
          }}
        />
        <div className="absolute inset-0 bg-gradient-to-b from-[#0d0805]/40 via-transparent to-[#0d0805]/90" />
      </div>

      {/* Spore / Symbiote Bioluminescence Effects */}
      <div className="fixed inset-0 pointer-events-none z-0">
        <div className="absolute top-[20%] left-[20%] w-[50%] h-[50%] bg-orange-900/20 blur-[150px] rounded-full mix-blend-screen" />
        <div className="absolute bottom-[10%] right-[10%] w-[40%] h-[40%] bg-amber-900/10 blur-[120px] rounded-full mix-blend-screen" />

        {[...Array(36)].map((_, i) => (
          <motion.div
            key={i}
            className="absolute rounded-full"
            style={{
              width: Math.random() * 4 + 2,
              height: Math.random() * 4 + 2,
              backgroundColor: Math.random() > 0.5 ? 'rgba(224,122,95,0.6)' : 'rgba(217,119,6,0.4)',
              boxShadow: '0 0 10px rgba(224,122,95,0.5)',
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
            }}
            animate={{
              y: `+=${Math.random() * 40 - 20}`,
              x: `+=${Math.random() * 40 - 20}`,
              opacity: [0, 1, 0],
            }}
            transition={{
              duration: Math.random() * 5 + 3,
              repeat: Infinity,
              ease: 'easeInOut',
              delay: Math.random() * 3,
            }}
          />
        ))}
      </div>

      <div className="max-w-5xl mx-auto relative z-10 pt-16">
        {/* Header */}
        <motion.header
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: 'easeOut' }}
          className="text-center mb-24"
        >
          <motion.div
            className={`w-28 h-28 mx-auto ${tema.bg} border-2 ${tema.border} rounded-full flex items-center justify-center mb-8 backdrop-blur-md relative`}
          >
            <GitMerge size={48} className={`${tema.icon} z-10`} strokeWidth={1.5} />
          </motion.div>

          <motion.div className="overflow-hidden">
             <motion.h1
                initial={{ y: '100%' }}
                animate={{ y: 0 }}
                transition={{ duration: 0.8, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
                className={`text-7xl font-bold tracking-tight ${tema.text} mb-6 uppercase`}
                style={{ fontFamily: 'Cinzel, serif' }}
             >
               Simbionte
             </motion.h1>
          </motion.div>
          <motion.p
             initial={{ opacity: 0 }}
             animate={{ opacity: 1 }}
             transition={{ duration: 1, delay: 0.6 }}
             className="text-lg text-orange-200/60 max-w-2xl mx-auto font-medium leading-relaxed"
          >
            Não nasceu um: nasceu uma parceria. Um corpo só, com mais de um organismo trabalhando por baixo da mesma pele, e ninguém de fora consegue dizer com certeza onde um termina e o outro começa.
          </motion.p>
        </motion.header>

        {/* Base Trait */}
        <div className="grid grid-cols-1 mb-24">
          <PremiumCard
            glowColor={tema.glow}
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className={`flex gap-6 p-8 rounded-xl ${tema.bg} ${tema.border} backdrop-blur-md`}
          >
            <Sprout size={40} className={`${tema.icon} shrink-0`} strokeWidth={1.5} />
            <div>
              <h3 className={`text-2xl font-bold ${tema.text} mb-3`} style={{ fontFamily: 'Cinzel, serif' }}>Metabolismo Composto</h3>
              <p className="text-orange-200/60 leading-relaxed text-sm">
                Seu corpo reparte recursos entre os organismos que o compõem. Você pode passar o dobro do tempo normal sem comer, beber ou descansar antes de sofrer as consequências disso, e recebe vantagem em Fortitude para resistir a fome, sede ou exaustão.
              </p>
            </div>
          </PremiumCard>
        </div>

        {/* Tipos de Simbionte */}
        <EscolhaRacialCards raca={raca} tema={tema} />
      </div>
    </div>
  );
};

export default Simbionte;
