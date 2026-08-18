import { motion } from 'framer-motion';
import { Mountain, ShieldAlert, Weight, Expand } from 'lucide-react';
import type { IRaca } from '../../types/catalogo';
import { PremiumCard } from '../components/premium/PremiumCard';
import { EscolhaRacialCards } from '../components/premium/EscolhaRacialCards';
import { EstagiosRaciais } from '../components/premium/EstagiosRaciais';
import { obterTemaPorId } from '../themeMap';

export const Gigante = ({ raca }: { raca: IRaca }) => {
  const tema = obterTemaPorId(raca.id);

  return (
    <div className="min-h-screen text-stone-50 p-8 selection:bg-stone-500/30 overflow-hidden relative">
      {/* Giant Background */}
      <div 
        className="fixed inset-0 z-0 bg-cover bg-center bg-no-repeat bg-black"
        style={{ backgroundImage: "url('/assets/img/gigante_bg.webp')" }}
      >
        <div className="absolute inset-0 bg-stone-950/80 mix-blend-multiply" />
        <div className="absolute inset-0 bg-gradient-to-b from-[#0f0e0c]/40 via-transparent to-[#0f0e0c]/90" />
      </div>

      {/* Heavy/Earth Background Effects */}
      <div className="fixed inset-0 pointer-events-none z-0">
        <div className="absolute top-[50%] left-[50%] -translate-x-1/2 -translate-y-1/2 w-[70%] h-[70%] bg-stone-800/10 blur-[150px] rounded-full mix-blend-screen" />
        
        {/* Tremor effect on mount (CSS animation injected later, or using framer) */}
        <motion.div 
          className="absolute inset-0 bg-stone-900/5 mix-blend-overlay"
          animate={{ x: [-2, 2, -1, 1, 0] }}
          transition={{ duration: 0.5, repeat: Infinity, repeatDelay: 4 }}
        />
      </div>

      <div className="max-w-5xl mx-auto relative z-10 pt-16">
        {/* Header */}
        <motion.header 
          initial={{ opacity: 0, y: 50 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1, type: "spring", bounce: 0.2 }}
          className="text-center mb-24"
        >
          <motion.div 
            className={`w-32 h-32 mx-auto ${tema.bg} border-4 ${tema.border} rounded-sm flex items-center justify-center mb-8 relative backdrop-blur-md`}
            style={{ boxShadow: `0 0 30px ${tema.glow}` }}
          >
            <Mountain size={56} className={tema.icon} strokeWidth={1.5} />
          </motion.div>

          <motion.div className="overflow-hidden">
             <motion.h1 
                initial={{ y: "100%" }}
                animate={{ y: 0 }}
                transition={{ duration: 0.8, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
                className={`text-8xl font-black tracking-tighter ${tema.text} mb-6 uppercase`}
                style={{ fontFamily: 'Cinzel, serif' }}
             >
               Gigante
             </motion.h1>
          </motion.div>
          <motion.p 
             initial={{ opacity: 0 }}
             animate={{ opacity: 1 }}
             transition={{ duration: 1, delay: 0.6 }}
             className="text-xl text-stone-400 max-w-2xl mx-auto font-bold leading-relaxed"
          >
            Grande a ponto de nada feito pros outros servir nele. Carrega o dobro, não sai do lugar quando tentam empurrar, e o grupo inteiro usa ele como parede quando a coisa aperta.
          </motion.p>
        </motion.header>

        {/* Traits Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-24">
          <PremiumCard
            glowColor={tema.glow}
            initial={{ opacity: 0, scale: 0.95 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className={`flex flex-col items-center text-center p-8 ${tema.bg} border ${tema.border} backdrop-blur-md`}
          >
            <Expand size={40} className={`${tema.icon} mb-6`} strokeWidth={1.5} />
            <h3 className={`text-3xl font-black ${tema.text} mb-4 uppercase`} style={{ fontFamily: 'Cinzel, serif' }}>Tamanho Grande</h3>
            <p className="text-stone-400 leading-relaxed">
              Nada de prateleira serve em você. Armas, armaduras e equipamentos precisam ser feitos no seu tamanho para funcionarem, e isso vale de novo a cada vez que o porte sobe.
            </p>
          </PremiumCard>

          <PremiumCard
            glowColor={tema.glow}
            initial={{ opacity: 0, scale: 0.95 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className={`flex flex-col items-center text-center p-8 ${tema.bg} border ${tema.border} backdrop-blur-md`}
          >
            <div className={`flex gap-4 mb-6 ${tema.icon}`}>
              <ShieldAlert size={40} strokeWidth={1.5} />
              <Weight size={40} strokeWidth={1.5} />
            </div>
            <h3 className={`text-3xl font-black ${tema.text} mb-4 uppercase`} style={{ fontFamily: 'Cinzel, serif' }}>Porte Colossal</h3>
            <p className="text-stone-400 leading-relaxed">
              Tirar você do lugar dá trabalho: você tem vantagem para resistir a empurrões e quedas causados por outra criatura. E sua capacidade de carga é o dobro da normal.
            </p>
          </PremiumCard>
        </div>

        <EstagiosRaciais
          raca={raca}
          tema={tema}
          titulo="Porte"
          descricao="Gigante nunca para de crescer, só cresce mais devagar. O porte sobe por nível total: Grande no começo, Enorme no nível 9 e Colossal no 18. Cada degrau traz mais Vida e o que vem junto do tamanho novo."
        />

        <EscolhaRacialCards raca={raca} tema={tema} />
      </div>
    </div>
  );
};

export default Gigante;
