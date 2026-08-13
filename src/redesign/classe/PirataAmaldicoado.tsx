import { motion } from 'framer-motion';
import { Anchor, Skull, Ghost } from 'lucide-react';
import type { IClasse } from '../../types/catalogo';
import { PremiumCard } from '../components/premium/PremiumCard';
import { DetalhesClasse } from '../../pages/Regras/components/DetalhesClasse';
import { obterTemaPorId } from '../themeMap';

export const PirataAmaldicoado = ({ classe }: { classe: IClasse }) => {
  const tema = obterTemaPorId(classe.id);

  return (
    <div className="min-h-screen text-teal-50 p-8 selection:bg-teal-500/30 overflow-hidden relative">
      {/* 3D WebGL Background */}
      <div className="fixed inset-0 z-0 bg-cover bg-center bg-no-repeat opacity-20 pointer-events-none" style={{ backgroundImage: "url('/assets/img/pirataamaldicoado_bg.webp')" }} />

      {/* Abyssal Sea / Specter Background Effects */}
      <div className="fixed inset-0 pointer-events-none z-0">
        <div className="absolute top-[30%] left-[20%] w-[60%] h-[60%] bg-teal-900/20 blur-[150px] rounded-full mix-blend-screen" />
        <div className="absolute bottom-[0%] right-[0%] w-[40%] h-[40%] bg-blue-900/20 blur-[150px] rounded-full mix-blend-screen" />
        
        {/* Floating ghostly anchors/barnacles */}
        <motion.div 
          className="absolute text-teal-900/30"
          style={{ top: '60%', left: '10%' }}
          animate={{ y: [0, -30, 0], rotate: [10, -10, 10] }}
          transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
        >
          <Anchor size={120} />
        </motion.div>

        {/* Mist on the ground */}
        <motion.div 
          className="absolute inset-x-0 bottom-0 h-48 bg-gradient-to-t from-teal-950/40 to-transparent"
          animate={{ opacity: [0.5, 0.8, 0.5] }}
          transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
        />
      </div>

      <div className="max-w-5xl mx-auto relative z-10 pt-16">
        {/* Header */}
        <motion.header 
          initial={{ opacity: 0, filter: 'blur(10px)' }}
          animate={{ opacity: 1, filter: 'blur(0px)' }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          className="text-center mb-24"
        >
          <motion.div 
            className={`w-28 h-28 mx-auto ${tema.bg} border-2 ${tema.border} rounded-full flex items-center justify-center mb-8 relative overflow-hidden backdrop-blur-md`}
            style={{ boxShadow: `0 0 30px ${tema.glow}` }}
          >
            <motion.div 
              className="absolute inset-0 bg-teal-500/10"
              animate={{ y: ["-10%", "10%", "-10%"] }}
              transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
            />
            <Skull size={48} className={`${tema.icon} z-10`} strokeWidth={1.5} />
          </motion.div>

          <motion.div className="overflow-hidden">
             <motion.h1 
                initial={{ y: "100%" }}
                animate={{ y: 0 }}
                transition={{ duration: 0.8, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
                className={`text-7xl font-serif tracking-tight ${tema.text} mb-6 uppercase`}
                style={{ fontFamily: 'Cinzel, serif' }}
             >
               Pirata Amaldiçoado
             </motion.h1>
          </motion.div>
          <motion.p 
             initial={{ opacity: 0 }}
             animate={{ opacity: 1 }}
             transition={{ duration: 1, delay: 0.6 }}
             className="text-lg text-teal-100/60 max-w-2xl mx-auto font-serif leading-relaxed"
          >
            Ligados ao abismo por um preço alto. O oceano clama por eles, e em troca, eles comandam os espectros afogados e sofrem mutações abissais que os tornam monstros dos mares.
          </motion.p>
        </motion.header>

        {/* Traits Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-24">
          <PremiumCard
            glowColor={tema.glow}
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className={`flex flex-col p-8 rounded-xl ${tema.bg} border-t ${tema.border} backdrop-blur-md`}
          >
            <Anchor size={40} className={`${tema.icon} mb-6`} strokeWidth={1.5} />
            <h3 className={`text-2xl font-serif ${tema.text} mb-3 uppercase`} style={{ fontFamily: 'Cinzel, serif' }}>Evolução Abissal</h3>
            <p className="text-teal-200/60 leading-relaxed text-sm font-serif">
              A maldição respira por você debaixo d'água e ignora terreno aquático difícil, com +2 em Navegação e Percepção marítima. A cada estágio de Evolução Abissal, escolha ainda mais um benefício: visão no escuro, imunidade à pressão oceânica, Resistência 10 a frio ou vantagem em testes ligados ao mar.
            </p>
          </PremiumCard>

          <PremiumCard
            glowColor={tema.glow}
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className={`flex flex-col p-8 rounded-xl ${tema.bg} border-t ${tema.border} backdrop-blur-md`}
          >
            <Ghost size={40} className={`${tema.icon} mb-6`} strokeWidth={1.5} />
            <h3 className={`text-2xl font-serif ${tema.text} mb-3 uppercase`} style={{ fontFamily: 'Cinzel, serif' }}>Tripulação dos Condenados</h3>
            <p className="text-teal-200/60 leading-relaxed text-sm font-serif">
              Uma vez por combate, invoque três espectros por três rodadas. Cada um pode absorver um ataque em seu lugar; ao desaparecer, causa 1d6 de dano de Água a um inimigo adjacente.
            </p>
          </PremiumCard>
        </div>

        <DetalhesClasse classe={classe} />
      </div>
    </div>
  );
};

export default PirataAmaldicoado;

