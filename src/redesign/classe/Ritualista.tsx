import { motion } from 'framer-motion';
import { CircleDot, Hourglass, Star } from 'lucide-react';
import type { IClasse } from '../../types/catalogo';
import { PremiumCard } from '../components/premium/PremiumCard';
import { DetalhesClasse } from '../../pages/Regras/components/DetalhesClasse';
import { obterTemaPorId } from '../themeMap';

export const Ritualista = ({ classe }: { classe: IClasse }) => {
  const tema = obterTemaPorId(classe.id);

  return (
    <div className="min-h-screen text-purple-50 p-8 selection:bg-purple-500/30 overflow-hidden relative">
      {/* 3D WebGL Background */}
      <div className="fixed inset-0 z-0 bg-cover bg-center bg-no-repeat opacity-20 pointer-events-none" style={{ backgroundImage: "url('/assets/img/ritualista_bg.jpg')" }} />

      {/* Ritual Background Effects */}
      <div className="fixed inset-0 pointer-events-none z-0">
        <div className="absolute top-[20%] left-[20%] w-[60%] h-[60%] bg-purple-900/20 blur-[150px] rounded-full mix-blend-screen" />
        
        {/* Drawing Ritual Lines */}
        <svg className="absolute inset-0 w-full h-full opacity-10">
          <motion.polygon 
            points="200,100 800,100 900,500 500,900 100,500" 
            fill="none" 
            stroke="purple" 
            strokeWidth="2"
            animate={{ rotate: 360, transformOrigin: '50% 50%' }}
            transition={{ duration: 60, repeat: Infinity, ease: "linear" }}
          />
        </svg>
      </div>

      <div className="max-w-5xl mx-auto relative z-10 pt-16">
        {/* Header */}
        <motion.header 
          initial={{ opacity: 0, filter: 'blur(10px)' }}
          animate={{ opacity: 1, filter: 'blur(0px)' }}
          transition={{ duration: 0.8 }}
          className="text-center mb-24"
        >
          <motion.div 
            className={`w-28 h-28 mx-auto ${tema.bg} ${tema.border} rounded-full flex items-center justify-center mb-8 relative backdrop-blur-md`}
            style={{ boxShadow: `0 0 50px ${tema.glow}` }}
          >
            <CircleDot size={48} className={`${tema.icon} z-10`} strokeWidth={1.5} />
            <motion.div 
              className="absolute inset-0 border-2 border-dashed border-purple-500/50 rounded-full"
              animate={{ rotate: -360 }}
              transition={{ duration: 10, repeat: Infinity, ease: "linear" }}
            />
          </motion.div>

          <motion.div className="overflow-hidden">
             <motion.h1 
                initial={{ y: "100%" }}
                animate={{ y: 0 }}
                transition={{ duration: 0.8, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
                className={`text-7xl font-serif tracking-tight ${tema.text} mb-6 uppercase`}
                style={{ fontFamily: 'Cinzel, serif' }}
             >
               Ritualista
             </motion.h1>
          </motion.div>
          <motion.p 
             initial={{ opacity: 0 }}
             animate={{ opacity: 1 }}
             transition={{ duration: 1, delay: 0.6 }}
             className="text-lg text-purple-200/60 max-w-2xl mx-auto font-serif leading-relaxed"
          >
            Eles não temem o tempo, eles o dedicam por inteiro. Um Ritualista negocia pactos e conduz preparações longas fora do combate. Seus rituais não pertencem aos círculos de conjuração nem se resolvem em rodadas de batalha: moldam o mundo antes que a ação comece.
          </motion.p>
        </motion.header>

        {/* Traits Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-24 font-serif">
          <PremiumCard
            glowColor={tema.glow}
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.4 }}
            className={`flex flex-col p-8 ${tema.bg} ${tema.border} rounded-lg backdrop-blur-md`}
          >
            <Hourglass size={36} className={`${tema.icon} mb-4`} strokeWidth={1.5} />
            <h3 className={`text-2xl font-bold ${tema.text} mb-2 uppercase`} style={{ fontFamily: 'Cinzel, serif' }}>Círculo Preparado</h3>
            <p className="text-purple-200/60 leading-relaxed text-sm">
              Antes de um ritual começar, escolha por estágio um modificador para prepará-lo: proteção, precisão, duração ou ocultação. É uma decisão tomada na calma da preparação, fora de combate, nunca uma técnica de rodadas ou ação de batalha.
            </p>
          </PremiumCard>

          <PremiumCard
            glowColor={tema.glow}
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.4, delay: 0.2 }}
            className={`flex flex-col p-8 ${tema.bg} ${tema.border} rounded-lg backdrop-blur-md`}
          >
            <Star size={36} className={`${tema.icon} mb-4`} strokeWidth={1.5} />
            <h3 className={`text-2xl font-bold ${tema.text} mb-2 uppercase`} style={{ fontFamily: 'Cinzel, serif' }}>Grande Oficiante</h3>
            <p className="text-purple-200/60 leading-relaxed text-sm">
              Enquanto você mantém concentração no Círculo Preparado, seus aliados podem doar sua própria Mana ou até Vida para alimentar o sacrifício do ritual, ignorando o limite normal de gasto de Mana que você possua.
            </p>
          </PremiumCard>
        </div>

        <DetalhesClasse classe={classe} />
      </div>
    </div>
  );
};

export default Ritualista;

