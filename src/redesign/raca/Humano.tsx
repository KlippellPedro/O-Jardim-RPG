import { motion } from 'framer-motion';
import { User, Brain, Activity } from 'lucide-react';
import type { IRaca } from '../../types/catalogo';

import { PremiumCard } from '../components/premium/PremiumCard';
import { EscolhaRacialCards } from '../components/premium/EscolhaRacialCards';
import { EstagiosRaciais } from '../components/premium/EstagiosRaciais';
import { obterTemaPorId } from '../themeMap';

interface HumanoProps {
  raca: IRaca;
}

export const Humano = ({ raca }: HumanoProps) => {
  const tema = obterTemaPorId(raca.id);

  return (
    <div className="min-h-screen text-blue-50 p-8 selection:bg-blue-500/30 overflow-hidden relative">
      {/* Background Image */}
      <div 
        className="fixed inset-0 z-0 bg-cover bg-center bg-no-repeat bg-black"
        style={{ backgroundImage: "url('/assets/img/humano_bg.webp')" }}
      >
        <div className="absolute inset-0 bg-slate-950/80 mix-blend-multiply" />
        <div className="absolute inset-0 bg-gradient-to-b from-[#070b19]/40 via-transparent to-[#070b19]/90" />
      </div>

      {/* Background Overlays */}
      <div className="fixed inset-0 pointer-events-none z-0">
        {/* Subtle geometric overlay for "Adaptability" */}
        <div className="absolute inset-0 opacity-5 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PHBhdGggZD0iTTAgMjAgTDIwIDAgTDQwIDIwIEwyMCA0MCBaIiBmaWxsPSJub25lIiBzdHJva2U9IiMzYjgyZjYiIHN0cm9rZS13aWR0aD0iMSIvPjwvc3ZnPg==')] bg-[length:40px_40px]" />
      </div>

      <div className="max-w-5xl mx-auto relative z-10 pt-16">
        {/* Header */}
        <motion.header 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          className="text-center mb-24"
        >
          <motion.div 
            className={`w-28 h-28 mx-auto ${tema.bg} border ${tema.border} rounded-2xl flex items-center justify-center mb-8 backdrop-blur-sm relative overflow-hidden`}
            style={{ boxShadow: `0 0 30px ${tema.glow}` }}
          >
            <User size={48} className={`${tema.icon} z-10`} strokeWidth={1.5} />
            <motion.div 
              animate={{ rotate: 360 }}
              transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
              className={`absolute inset-[-50%] border-[1px] ${tema.border} rounded-lg`}
            />
          </motion.div>

          {/* Masked Animated Text */}
          <motion.div className="overflow-hidden">
            <motion.h1 
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              transition={{ duration: 0.8, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
              className={`text-7xl font-bold tracking-tight ${tema.text} mb-6`}
              style={{ fontFamily: 'Cinzel, serif' }}
            >
              Humano
            </motion.h1>
          </motion.div>

          <motion.p 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 1, delay: 0.5 }}
            className="text-lg text-blue-200/60 max-w-2xl mx-auto font-medium leading-relaxed"
          >
            Nasce sem dom nenhum, e é exatamente esse o ponto. Aprende uma coisa a mais que todo mundo na largada e cabe em qualquer Árvore, qualquer classe, qualquer mesa.
          </motion.p>
        </motion.header>

        {/* Traits Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-24">
          <PremiumCard
            glowColor={tema.glow}
            initial={{ opacity: 0, x: -20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className={`flex flex-col p-8 ${tema.bg} border ${tema.border} backdrop-blur-md`}
          >
            <Activity size={32} className={`${tema.icon} mb-6`} strokeWidth={1.5} />
            <h3 className={`text-2xl font-bold ${tema.text} mb-3`} style={{ fontFamily: 'Cinzel, serif' }}>Fisiologia Normal</h3>
            <p className="text-blue-200/60 leading-relaxed text-sm">
              Tamanho Normal e biologia padrão do sistema: precisa comer, descansar e respirar como todo mundo.
            </p>
          </PremiumCard>

          <PremiumCard
            glowColor={tema.glow}
            initial={{ opacity: 0, x: 20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className={`flex flex-col p-8 ${tema.bg} border ${tema.border} backdrop-blur-md`}
          >
            <Brain size={32} className={`${tema.icon} mb-6`} strokeWidth={1.5} />
            <h3 className={`text-2xl font-bold ${tema.text} mb-3`} style={{ fontFamily: 'Cinzel, serif' }}>Adaptabilidade</h3>
            <p className="text-indigo-200/60 leading-relaxed text-sm">
              Na criação, escolha uma perícia a mais para começar em Aprendiz. Na prática, você abre a ficha com sete perícias em Aprendiz, em vez das seis de todo mundo.
            </p>
          </PremiumCard>
        </div>

        <EstagiosRaciais raca={raca} tema={tema} />

        <EscolhaRacialCards raca={raca} tema={tema} />
      </div>
    </div>
  );
};

export default Humano;
