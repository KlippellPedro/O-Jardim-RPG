import { motion } from 'framer-motion';
import { Cog, Wrench, Pickaxe } from 'lucide-react';
import type { IClasse } from '../../types/catalogo';
import { PremiumCard } from '../components/premium/PremiumCard';
import { DetalhesClasse } from '../../pages/Regras/components/DetalhesClasse';
import { obterTemaPorId } from '../themeMap';

export const Engenheiro = ({ classe }: { classe: IClasse }) => {
  const tema = obterTemaPorId(classe.id);

  return (
    <div className={`min-h-screen ${tema.text} p-8 selection:bg-slate-500/30 overflow-hidden relative`}>
      {/* 3D WebGL Background */}
      <div className="fixed inset-0 z-0 bg-cover bg-center bg-no-repeat opacity-20 pointer-events-none" style={{ backgroundImage: "url('/assets/img/engenheiro_bg.webp')" }} />

      {/* Workshop / Blueprints Background Effects */}
      <div className="fixed inset-0 pointer-events-none z-0">
        <div className="absolute top-[30%] left-[30%] w-[40%] h-[40%] bg-slate-900/10 blur-[150px] mix-blend-screen" />
        
        {/* Rotating gears */}
        {[...Array(4)].map((_, i) => (
          <motion.div
            key={i}
            className="absolute opacity-10 text-slate-500"
            style={{
              left: `${Math.random() * 80 + 10}%`,
              top: `${Math.random() * 80 + 10}%`,
            }}
            animate={{ rotate: i % 2 === 0 ? 360 : -360 }}
            transition={{ duration: Math.random() * 10 + 10, repeat: Infinity, ease: "linear" }}
          >
            <Cog size={150} />
          </motion.div>
        ))}
      </div>

      <div className="max-w-5xl mx-auto relative z-10 pt-16">
        {/* Header */}
        <motion.header 
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="text-center mb-24"
        >
          <motion.div 
            className={`w-28 h-28 mx-auto ${tema.bg} border-[3px] ${tema.border} rounded-lg flex items-center justify-center mb-8 relative backdrop-blur-md`}
            style={{ boxShadow: `0 0 30px ${tema.glow}` }}
          >
            <motion.div 
              animate={{ rotate: 360 }}
              transition={{ duration: 15, repeat: Infinity, ease: "linear" }}
              className="absolute inset-0 border-[2px] border-dashed border-slate-500/30 rounded-lg"
            />
            <Wrench size={48} className={`${tema.icon} z-10`} strokeWidth={1.5} />
          </motion.div>

          <motion.div className="overflow-hidden">
             <motion.h1 
                initial={{ y: "100%" }}
                animate={{ y: 0 }}
                transition={{ duration: 0.8, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
                className={`text-7xl font-bold tracking-tight ${tema.text} mb-6 uppercase`}
                style={{ fontFamily: 'Cinzel, serif' }}
             >
               Engenheiro
             </motion.h1>
          </motion.div>
          <motion.p 
             initial={{ opacity: 0 }}
             animate={{ opacity: 1 }}
             transition={{ duration: 1, delay: 0.6 }}
             className={`text-lg ${tema.tag} opacity-80 max-w-2xl mx-auto font-medium leading-relaxed`}
          >
            Construtores e inventores do campo de batalha. Com sucata, ferramentas e puro intelecto criativo, eles fabricam engenhocas temporárias e estruturas tecnológicas para moldar o ambiente ao seu favor.
          </motion.p>
        </motion.header>

        {/* Traits Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-24">
          <PremiumCard
            glowColor={tema.glow}
            initial={{ opacity: 0, scale: 0.95 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.4 }}
            className={`flex flex-col p-8 rounded-lg ${tema.bg} border ${tema.border} backdrop-blur-md shadow-inner`}
          >
            <Cog size={36} className={`${tema.icon} mb-4`} strokeWidth={1.5} />
            <h3 className={`text-2xl font-bold ${tema.text} mb-2 uppercase tracking-wide`} style={{ fontFamily: 'Cinzel, serif' }}>Engenhocas</h3>
            <p className="text-slate-300 leading-relaxed text-sm">
              Use Mana para construir bugigangas mecânicas rápidas (como armadilhas, ganchos de escalada motorizados ou drones batedores básicos) durante descansos ou até no combate com ações completas.
            </p>
          </PremiumCard>

          <PremiumCard
            glowColor={tema.glow}
            initial={{ opacity: 0, scale: 0.95 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.4, delay: 0.2 }}
            className={`flex flex-col p-8 rounded-lg ${tema.bg} border ${tema.border} backdrop-blur-md shadow-inner`}
          >
            <Pickaxe size={36} className={`${tema.icon} mb-4`} strokeWidth={1.5} />
            <h3 className={`text-2xl font-bold ${tema.text} mb-2 uppercase tracking-wide`} style={{ fontFamily: 'Cinzel, serif' }}>Arquitetura Tech</h3>
            <p className="text-slate-300 leading-relaxed text-sm">
              Modifique a arena ativamente. Você pode reforçar uma parede, criar uma ponte pênsil de até 6m, ou construir uma torre de vigia improvisada para oferecer cobertura pesada ao grupo.
            </p>
          </PremiumCard>
        </div>

        <DetalhesClasse classe={classe} />
      </div>
    </div>
  );
};

export default Engenheiro;

