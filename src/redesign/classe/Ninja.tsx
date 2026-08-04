import { motion } from 'framer-motion';
import { Star, CircleArrowUp } from 'lucide-react';
import type { IClasse } from '../../types/catalogo';
import { PremiumCard } from '../components/premium/PremiumCard';
import { DetalhesClasse } from '../../pages/Regras/components/DetalhesClasse';
import { obterTemaPorId } from '../themeMap';

export const Ninja = ({ classe }: { classe: IClasse }) => {
  const tema = obterTemaPorId(classe.id);

  return (
    <div className="min-h-screen text-gray-50 p-8 selection:bg-gray-500/30 overflow-hidden relative">
      {/* 3D WebGL Background */}
      <div className="fixed inset-0 z-0 bg-cover bg-center bg-no-repeat opacity-20 pointer-events-none" style={{ backgroundImage: "url('/assets/img/ninja_bg.jpg')" }} />

      {/* Stealth / Ninja Background Effects */}
      <div className="fixed inset-0 pointer-events-none z-0">
        <div className="absolute top-[30%] left-[30%] w-[40%] h-[40%] bg-zinc-900/10 blur-[150px] rounded-full mix-blend-screen" />
        
        {/* Shurikens flying randomly */}
        {[...Array(5)].map((_, i) => (
          <motion.div
            key={i}
            className="absolute text-zinc-800"
            style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
            }}
            animate={{
              x: [0, Math.random() * 400 - 200],
              y: [0, Math.random() * 400 - 200],
              rotate: 1080,
              opacity: [0, 0.4, 0],
            }}
            transition={{
              duration: 1.5,
              repeat: Infinity,
              ease: "linear",
              delay: Math.random() * 4
            }}
          >
            <Star size={40} />
          </motion.div>
        ))}
      </div>

      <div className="max-w-5xl mx-auto relative z-10 pt-16">
        {/* Header */}
        <motion.header 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: "easeOut" }}
          className="text-center mb-24"
        >
          <motion.div 
            className={`w-28 h-28 mx-auto ${tema.bg} ${tema.border} rounded-full flex items-center justify-center mb-8 relative backdrop-blur-md`}
            style={{ boxShadow: `0 0 50px ${tema.glow}` }}
          >
            <Star size={48} className={tema.icon} strokeWidth={1} />
          </motion.div>

          <motion.div className="overflow-hidden">
             <motion.h1 
                initial={{ y: "100%" }}
                animate={{ y: 0 }}
                transition={{ duration: 0.8, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
                className={`text-7xl font-bold tracking-tight ${tema.text} mb-6 uppercase`}
                style={{ fontFamily: 'Cinzel, serif' }}
             >
               Ninja
             </motion.h1>
          </motion.div>
          <motion.p 
             initial={{ opacity: 0 }}
             animate={{ opacity: 1 }}
             transition={{ duration: 1, delay: 0.6 }}
             className="text-lg text-zinc-400 max-w-2xl mx-auto font-medium leading-relaxed"
          >
            Silenciosos, letais e regidos por uma hierarquia estrita. A verdadeira extensão de seus corpos é a sua Arma Ninja, aprimorada até o limite da letalidade física.
          </motion.p>
        </motion.header>

        {/* Traits Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-24">
          <PremiumCard
            glowColor={tema.glow}
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className={`flex flex-col p-8 rounded-lg ${tema.bg} ${tema.border} backdrop-blur-md`}
          >
            <CircleArrowUp size={32} className={`${tema.icon} mb-6`} strokeWidth={1.5} />
            <h3 className={`text-2xl font-bold ${tema.text} mb-3`} style={{ fontFamily: 'Cinzel, serif' }}>Hierarquia</h3>
            <p className="text-zinc-400 leading-relaxed text-sm">
              Um sistema de graduação rígido. A cada nível evoluído em sua Hierarquia, você obtém mais reconhecimento, habilidades, e permissões para melhorar a sua Arma Ninja letal.
            </p>
          </PremiumCard>

          <PremiumCard
            glowColor={tema.glow}
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className={`flex flex-col p-8 rounded-lg ${tema.bg} ${tema.border} backdrop-blur-md`}
          >
            <Star size={36} className={`${tema.icon} mb-4`} strokeWidth={1.5} />
            <h3 className={`text-2xl font-bold ${tema.text} mb-3`} style={{ fontFamily: 'Cinzel, serif' }}>Arma Ninja</h3>
            <p className="text-zinc-400 leading-relaxed text-sm">
              Escolha uma arma para ser sua assinatura. Ela ganha imediatamente +1 dado de dano, +1 no crítico ou -1 na margem de ameaça. Você escolhe novas melhorias ou novas armas a cada nível.
            </p>
          </PremiumCard>
        </div>

        <DetalhesClasse classe={classe} />
      </div>
    </div>
  );
};

export default Ninja;

