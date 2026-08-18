import { motion } from 'framer-motion';
import { Coins, FastForward, Activity } from 'lucide-react';
import type { IRaca } from '../../types/catalogo';
import { PremiumCard } from '../components/premium/PremiumCard';
import { EscolhaRacialCards } from '../components/premium/EscolhaRacialCards';
import { EstagiosRaciais } from '../components/premium/EstagiosRaciais';
import { obterTemaPorId } from '../themeMap';

interface GoblimProps {
  raca: IRaca;
}

export const Goblim = ({ raca }: GoblimProps) => {
  const tema = obterTemaPorId(raca.id);

  return (
    <div className="min-h-screen text-lime-50 p-8 selection:bg-lime-500/30 overflow-hidden relative">
      {/* Goblim Background */}
      <div 
        className="fixed inset-0 z-0 bg-cover bg-center bg-no-repeat bg-black"
        style={{ backgroundImage: "url('/assets/img/goblim_bg.webp')" }}
      >
        <div className="absolute inset-0 bg-lime-950/80 mix-blend-multiply" />
        <div className="absolute inset-0 bg-gradient-to-b from-[#080d08]/40 via-transparent to-[#080d08]/90" />
      </div>

      {/* Chaotic/Trade Background Effects */}
      <div className="fixed inset-0 pointer-events-none z-0">
        <div className="absolute top-[10%] right-[10%] w-[60%] h-[60%] bg-lime-900/10 blur-[150px] rounded-full mix-blend-screen" />
        
        {/* Fast moving lines */}
        {[...Array(10)].map((_, i) => (
          <motion.div
            key={i}
            className="absolute h-[1px] bg-lime-500/20"
            style={{
              width: Math.random() * 100 + 50,
              top: `${Math.random() * 100}%`,
              left: '-20%',
            }}
            animate={{ x: (typeof window !== 'undefined' ? window.innerWidth : 1000) + 200 }}
            transition={{
              duration: Math.random() * 1 + 0.5,
              repeat: Infinity,
              ease: "linear",
              delay: Math.random() * 2
            }}
          />
        ))}
      </div>

      <div className="max-w-5xl mx-auto relative z-10 pt-16">
        {/* Header */}
        <motion.header 
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5, type: "spring", stiffness: 200 }}
          className="text-center mb-24"
        >
          <motion.div 
            whileHover={{ scale: 1.1, rotate: 10 }}
            className={`w-28 h-28 mx-auto ${tema.bg} border ${tema.border} rounded-3xl flex items-center justify-center mb-8 backdrop-blur-md cursor-pointer`}
            style={{ boxShadow: `0 0 20px ${tema.glow}` }}
          >
            <Coins size={48} className={tema.icon} strokeWidth={1.5} />
          </motion.div>

          <motion.div className="overflow-hidden">
             <motion.h1 
                initial={{ y: "100%" }}
                animate={{ y: 0 }}
                transition={{ duration: 0.8, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
                className={`text-7xl font-bold tracking-tight ${tema.text} mb-6 uppercase`}
                style={{ fontFamily: 'Cinzel, serif' }}
             >
               Goblim
             </motion.h1>
          </motion.div>
          <motion.p 
             initial={{ opacity: 0 }}
             animate={{ opacity: 1 }}
             transition={{ duration: 1, delay: 0.6 }}
             className="text-xl text-lime-100/60 max-w-2xl mx-auto font-medium leading-relaxed"
          >
            Pequeno, rápido e com um talento incômodo pra vender qualquer coisa por mais do que ela vale, de preferência coisa que já era dele. Fala Alemão entre os seus.
          </motion.p>
        </motion.header>

        {/* Traits Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-24">
          <PremiumCard
            glowColor={tema.glow}
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.4 }}
            className={`flex flex-col p-8 rounded-xl ${tema.bg} border ${tema.border} backdrop-blur-md`}
          >
            <Activity size={32} className={`${tema.icon} mb-6`} />
            <h3 className={`text-2xl font-bold ${tema.text} mb-3`} style={{ fontFamily: 'Cinzel, serif' }}>Tamanho Pequeno</h3>
            <p className="text-lime-200/60 leading-relaxed text-sm">
              O tamanho abre passagem em lugar apertado onde os outros não entram. Em troca, arma e equipamento precisam ser feitos na sua estatura.
            </p>
          </PremiumCard>

          <PremiumCard
            glowColor={tema.glow}
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.4, delay: 0.1 }}
            className={`flex flex-col p-8 rounded-xl ${tema.bg} border ${tema.border} backdrop-blur-md`}
          >
            <FastForward size={32} className={`${tema.icon} mb-6`} />
            <h3 className={`text-2xl font-bold ${tema.text} mb-3`} style={{ fontFamily: 'Cinzel, serif' }}>Passos Ligeiros</h3>
            <p className="text-lime-200/60 leading-relaxed text-sm">
              Você cobre terreno mais rápido que os outros: +1,5 m no seu Movimento básico, o tempo todo.
            </p>
          </PremiumCard>

          <PremiumCard
            glowColor={tema.glow}
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.4, delay: 0.2 }}
            className={`col-span-1 md:col-span-2 flex flex-col p-8 rounded-xl ${tema.bg} border ${tema.border} backdrop-blur-md`}
          >
            <Coins size={32} className={`${tema.icon} mb-6`} />
            <h3 className={`text-2xl font-bold ${tema.text} mb-3`} style={{ fontFamily: 'Cinzel, serif' }}>Mercador Improvisador</h3>
            <p className="text-lime-200/60 leading-relaxed text-sm">
              Na hora de negociar a venda de um item que seja seu, receba vantagem no teste. Vale para vender o que é seu; pechinchar na compra não conta.
            </p>
          </PremiumCard>
        </div>

        <EstagiosRaciais raca={raca} tema={tema} />

        <EscolhaRacialCards raca={raca} tema={tema} />
      </div>
    </div>
  );
};

export default Goblim;
