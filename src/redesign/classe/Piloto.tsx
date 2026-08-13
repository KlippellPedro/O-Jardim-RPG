import { motion } from 'framer-motion';
import { Wrench, CarFront, Hammer } from 'lucide-react';
import type { IClasse } from '../../types/catalogo';
import { PremiumCard } from '../components/premium/PremiumCard';
import { DetalhesClasse } from '../../pages/Regras/components/DetalhesClasse';
import { obterTemaPorId } from '../themeMap';

export const Piloto = ({ classe }: { classe: IClasse }) => {
  const tema = obterTemaPorId(classe.id);

  return (
    <div className="min-h-screen text-cyan-50 p-8 selection:bg-cyan-500/30 overflow-hidden relative">
      {/* 3D WebGL Background */}
      <div className="fixed inset-0 z-0 bg-cover bg-center bg-no-repeat opacity-20 pointer-events-none" style={{ backgroundImage: "url('/assets/img/piloto_bg.webp')" }} />

      {/* Garage / Mechanics Background Effects */}
      <div className="fixed inset-0 pointer-events-none z-0">
        <div className="absolute top-[20%] left-[20%] w-[50%] h-[50%] bg-blue-900/10 blur-[150px] mix-blend-screen" />
        
        {/* Speed lines for racing feel */}
        {[...Array(10)].map((_, i) => (
          <motion.div
            key={i}
            className="absolute h-[2px] bg-cyan-400/20"
            style={{
              width: Math.random() * 200 + 50,
              top: `${Math.random() * 100}%`,
              left: '-20%',
            }}
            animate={{ x: (typeof window !== 'undefined' ? window.innerWidth : 1000) + 300 }}
            transition={{
              duration: Math.random() * 0.5 + 0.2,
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
          initial={{ opacity: 0, x: -50 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.6, type: "spring", stiffness: 100 }}
          className="text-center mb-24"
        >
          <motion.div 
            className={`w-28 h-28 mx-auto ${tema.bg} border-2 ${tema.border} rounded-lg flex items-center justify-center mb-8 skew-x-[-10deg] backdrop-blur-md`}
            style={{ boxShadow: `0 0 30px ${tema.glow}` }}
          >
            <CarFront size={48} className={`${tema.icon} skew-x-[10deg]`} strokeWidth={1.5} />
          </motion.div>

          <motion.div className="overflow-hidden">
             <motion.h1 
                initial={{ y: "100%" }}
                animate={{ y: 0 }}
                transition={{ duration: 0.8, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
                className={`text-7xl font-black tracking-tight ${tema.text} mb-6 uppercase italic`}
                style={{ fontFamily: 'Cinzel, serif' }}
             >
               Piloto
             </motion.h1>
          </motion.div>
          <motion.p 
             initial={{ opacity: 0 }}
             animate={{ opacity: 1 }}
             transition={{ duration: 1, delay: 0.6 }}
             className="text-lg text-cyan-100/60 max-w-2xl mx-auto font-medium leading-relaxed"
          >
            Ligados às máquinas de uma forma quase espiritual. Se tem motor, rodas, hélices ou propulsores, eles conseguem dirigir, consertar e fazer correr mais do que o projetado.
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
            className={`flex gap-6 p-8 rounded-xl ${tema.bg} border-l-4 ${tema.border} backdrop-blur-md`}
          >
            <CarFront size={36} className={`${tema.icon} shrink-0`} strokeWidth={1.5} />
            <div>
              <h3 className={`text-2xl font-bold ${tema.text} mb-2 uppercase`} style={{ fontFamily: 'Cinzel, serif' }}>Meu Xodó</h3>
              <p className="text-cyan-100/60 leading-relaxed text-sm">
                Uma afinidade mecânica inigualável com seu veículo pessoal, permitindo extrair o máximo de desempenho em qualquer terreno ou combate.
              </p>
            </div>
          </PremiumCard>

          <PremiumCard
            glowColor={tema.glow}
            initial={{ opacity: 0, scale: 0.95 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.4, delay: 0.1 }}
            className={`flex gap-6 p-8 rounded-xl ${tema.bg} border-l-4 ${tema.border} backdrop-blur-md`}
          >
            <Wrench size={36} className={`${tema.icon} shrink-0`} strokeWidth={1.5} />
            <div>
              <h3 className={`text-2xl font-bold ${tema.text} mb-2 uppercase`} style={{ fontFamily: 'Cinzel, serif' }}>Tuning</h3>
              <p className="text-cyan-100/60 leading-relaxed text-sm">
                Se tiver um mecânico de confiança, você recebe uma modificação gratuita no local dele. Caso não tenha, recebe o contato de um mecânico bom e de confiança onde estiver.
              </p>
            </div>
          </PremiumCard>

          <PremiumCard
            glowColor={tema.glow}
            initial={{ opacity: 0, scale: 0.95 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.4, delay: 0.2 }}
            className={`col-span-1 md:col-span-2 flex gap-6 p-8 rounded-xl ${tema.bg} border-l-4 ${tema.border} backdrop-blur-md`}
          >
            <Hammer size={36} className={`${tema.icon} shrink-0`} strokeWidth={1.5} />
            <div>
              <h3 className={`text-2xl font-bold ${tema.text} mb-2 uppercase`} style={{ fontFamily: 'Cinzel, serif' }}>0 Km</h3>
              <p className="text-cyan-100/60 leading-relaxed text-sm">
                Caso tenha um veículo quebrado ou com defeitos graves, você pode levá-lo ao seu mecânico de confiança e recebe um "martelinho de ouro" que restaura o veículo como se fosse totalmente novo.
              </p>
            </div>
          </PremiumCard>
        </div>

        <DetalhesClasse classe={classe} />
      </div>
    </div>
  );
};

export default Piloto;

