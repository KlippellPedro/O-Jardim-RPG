import { motion } from 'framer-motion';
import { Terminal, Braces, Blocks } from 'lucide-react';
import type { IClasse } from '../../types/catalogo';
import { PremiumCard } from '../components/premium/PremiumCard';
import { DetalhesClasse } from '../../pages/Regras/components/DetalhesClasse';
import { obterTemaPorId } from '../themeMap';

export const Codificador = ({ classe }: { classe: IClasse }) => {
  const tema = obterTemaPorId(classe.id);

  return (
    <div className={`min-h-screen ${tema.text} p-8 selection:bg-green-500/30 overflow-hidden relative`}>
      {/* 3D WebGL Background */}
      <div className="fixed inset-0 z-0 bg-cover bg-center bg-no-repeat opacity-20 pointer-events-none" style={{ backgroundImage: "url('/assets/img/codificador_bg.webp')" }} />

      {/* Sandbox / Building Code Background Effects */}
      <div className="fixed inset-0 pointer-events-none z-0">
        <div className="absolute top-[30%] left-[20%] w-[50%] h-[50%] bg-green-900/20 blur-[150px] mix-blend-screen" />
        
        {/* Floating brackets */}
        {[...Array(6)].map((_, i) => (
          <motion.div
            key={i}
            className="absolute font-mono text-4xl text-green-500/10 font-bold"
            style={{
              left: `${Math.random() * 80 + 10}%`,
              top: `${Math.random() * 80 + 10}%`,
            }}
            animate={{
              scale: [1, 1.2, 1],
              opacity: [0.1, 0.3, 0.1],
            }}
            transition={{
              duration: Math.random() * 3 + 3,
              repeat: Infinity,
              ease: "easeInOut",
            }}
          >
            {i % 2 === 0 ? "{ }" : "< />"}
          </motion.div>
        ))}
      </div>

      <div className="max-w-5xl mx-auto relative z-10 pt-16">
        {/* Header */}
        <motion.header 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5 }}
          className="text-center mb-24"
        >
          <motion.div 
            className={`w-28 h-28 mx-auto ${tema.bg} border-2 ${tema.border} rounded-xl flex items-center justify-center mb-8 relative backdrop-blur-md`}
            style={{ boxShadow: `0 0 40px ${tema.glow}` }}
          >
            <Terminal size={48} className={`${tema.icon} z-10`} strokeWidth={1.5} />
          </motion.div>

          <motion.div className="overflow-hidden">
             <motion.h1 
                initial={{ y: "100%" }}
                animate={{ y: 0 }}
                transition={{ duration: 0.8, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
                className={`text-7xl font-mono font-bold tracking-tight ${tema.text} mb-6 uppercase`}
                style={{ fontFamily: 'Cinzel, serif' }}
             >
               Codificador
             </motion.h1>
          </motion.div>
          <motion.p 
             initial={{ opacity: 0 }}
             animate={{ opacity: 1 }}
             transition={{ duration: 1, delay: 0.6 }}
             className={`text-lg ${tema.tag} opacity-80 max-w-2xl mx-auto font-mono leading-relaxed`}
          >
            Manipuladores do ambiente. Eles programam a realidade instalando "Rotinas" no campo de batalha, criando bolhas onde feitiços falham e aliados se regeneram através do fluxo reescrito.
          </motion.p>
        </motion.header>

        {/* Traits Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-24 font-mono">
          <PremiumCard
            glowColor={tema.glow}
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.4 }}
            className={`flex flex-col p-8 rounded-lg ${tema.bg} border ${tema.border} backdrop-blur-md`}
          >
            <Braces size={36} className={`${tema.icon} mb-4`} strokeWidth={1.5} />
            <h3 className={`text-2xl font-bold ${tema.text} mb-2 uppercase`} style={{ fontFamily: 'Cinzel, serif' }}>Rotinas Ambientais</h3>
            <p className="text-green-100/60 leading-relaxed text-sm">
              Aprenda uma rotina por estágio, executada por uma ação e 3 de Mana: reparar um construto em 2d8, criar uma plataforma sólida, iluminar uma área ou registrar uma cena inteira, como um script gravado na realidade.
            </p>
          </PremiumCard>

          <PremiumCard
            glowColor={tema.glow}
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.4, delay: 0.2 }}
            className={`flex flex-col p-8 rounded-lg ${tema.bg} border ${tema.border} backdrop-blur-md`}
          >
            <Blocks size={36} className={`${tema.icon} mb-4`} strokeWidth={1.5} />
            <h3 className={`text-2xl font-bold ${tema.text} mb-2 uppercase`} style={{ fontFamily: 'Cinzel, serif' }}>Sandbox de Restrição</h3>
            <p className="text-green-100/60 leading-relaxed text-sm">
              Uma vez por descanso longo, compile uma zona de 6 metros por três rodadas. Dentro dela, teleportes e invocações hostis não falham automaticamente: exigem que o efeito vença um teste resistido de Misticismo contra a sua DT.
            </p>
          </PremiumCard>
        </div>

        <DetalhesClasse classe={classe} />
      </div>
    </div>
  );
};

export default Codificador;

