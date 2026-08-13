import { motion } from 'framer-motion';
import { Map, Route, Compass } from 'lucide-react';
import type { IClasse } from '../../types/catalogo';
import { PremiumCard } from '../components/premium/PremiumCard';
import { DetalhesClasse } from '../../pages/Regras/components/DetalhesClasse';
import { obterTemaPorId } from '../themeMap';

export const GuiaDimensional = ({ classe }: { classe: IClasse }) => {
  const tema = obterTemaPorId(classe.id);

  return (
    <div className="min-h-screen text-cyan-50 p-8 selection:bg-cyan-500/30 overflow-hidden relative">
      {/* 3D WebGL Background */}
      <div className="fixed inset-0 z-0 bg-cover bg-center bg-no-repeat opacity-20 pointer-events-none" style={{ backgroundImage: "url('/assets/img/guiadimensional_bg.webp')" }} />

      {/* Teleportation / Spatial Matrix Background Effects */}
      <div className="fixed inset-0 pointer-events-none z-0">
        <div className="absolute top-[20%] left-[20%] w-[50%] h-[50%] bg-blue-900/20 blur-[150px] mix-blend-screen" />
        
        {/* Constellation / Matrix connections */}
        <svg className="absolute inset-0 w-full h-full opacity-20">
          <motion.path 
            d="M 100 100 Q 300 50 500 200 T 900 300"
            fill="transparent"
            stroke="cyan"
            strokeWidth="1"
            strokeDasharray="5,5"
            animate={{ strokeDashoffset: [0, -100] }}
            transition={{ duration: 5, repeat: Infinity, ease: "linear" }}
          />
        </svg>

        {/* Portal ripples */}
        <motion.div 
          className="absolute top-[50%] right-[20%] -translate-y-1/2 w-48 h-48 border border-cyan-500/30 rounded-full"
          animate={{ scale: [1, 2, 3], opacity: [0.5, 0.2, 0] }}
          transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
        />
      </div>

      <div className="max-w-5xl mx-auto relative z-10 pt-16">
        {/* Header */}
        <motion.header 
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.6 }}
          className="text-center mb-24"
        >
          <motion.div 
            className={`w-28 h-28 mx-auto ${tema.bg} ${tema.border} rounded-full flex items-center justify-center mb-8 shadow-2xl relative backdrop-blur-md`}
          >
            <Compass size={48} className={`${tema.icon} z-10`} strokeWidth={1.5} />
            <motion.div 
              className="absolute inset-0 border border-blue-400/50 rounded-full"
              animate={{ rotate: 360 }}
              transition={{ duration: 8, repeat: Infinity, ease: "linear" }}
            />
          </motion.div>

          <motion.div className="overflow-hidden">
             <motion.h1 
                initial={{ y: "100%" }}
                animate={{ y: 0 }}
                transition={{ duration: 0.8, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
                className={`text-7xl font-bold tracking-tight ${tema.text} mb-6 uppercase`}
                style={{ fontFamily: 'Cinzel, serif' }}
             >
               Guia Dimensional
             </motion.h1>
          </motion.div>
          <motion.p 
             initial={{ opacity: 0 }}
             animate={{ opacity: 1 }}
             transition={{ duration: 1, delay: 0.6 }}
             className="text-lg text-cyan-100/60 max-w-2xl mx-auto font-medium leading-relaxed"
          >
            Os arquitetos do espaço. Eles desenham atalhos onde há paredes, marcam a própria realidade com âncoras místicas e transportam seus aliados através das fissuras do mundo.
          </motion.p>
        </motion.header>

        {/* Traits Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-24">
          <PremiumCard
            glowColor={tema.glow}
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.4 }}
            className={`flex flex-col p-8 rounded-lg ${tema.bg} ${tema.border} backdrop-blur-md`}
          >
            <Map size={36} className={`${tema.icon} mb-4`} strokeWidth={1.5} />
            <h3 className={`text-2xl font-bold ${tema.text} mb-2 uppercase`} style={{ fontFamily: 'Cinzel, serif' }}>Mapa Vivo & Cartografia</h3>
            <p className="text-cyan-100/60 leading-relaxed text-sm">
              Você sempre sabe onde é o Norte e a hora do dia, e nunca se perde em ambientes naturais ou masmorras que já mapeou; ler uma planta baixa ou sentir os fluxos de mana do ambiente revela um detalhe oculto do local. No auge da carreira, pergunte ao Mestre por uma rota segura, rápida ou discreta até um objetivo conhecido uma vez por sessão.
            </p>
          </PremiumCard>

          <PremiumCard
            glowColor={tema.glow}
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.4, delay: 0.2 }}
            className={`flex flex-col p-8 rounded-lg ${tema.bg} ${tema.border} backdrop-blur-md`}
          >
            <Route size={36} className={`${tema.icon} mb-4`} strokeWidth={1.5} />
            <h3 className={`text-2xl font-bold ${tema.text} mb-2 uppercase`} style={{ fontFamily: 'Cinzel, serif' }}>Âncoras Espaciais</h3>
            <p className="text-cyan-100/60 leading-relaxed text-sm">
              Marque âncoras dimensionais fixas: uma a mais por estágio, até quatro. Fixar uma âncora exige um minuto no local, e ela desaparece após sete dias ou ao exceder seu limite. O teleporte em si vem da sua Cartografia da Matriz, em alcances limitados: passagens curtas de 6 m entre pontos visíveis uma vez por cena, trazer até dois aliados nos estágios avançados e, só no auge da carreira, uma rota de até 1 km uma vez por sessão.
            </p>
          </PremiumCard>
        </div>

        <DetalhesClasse classe={classe} />
      </div>
    </div>
  );
};

export default GuiaDimensional;

