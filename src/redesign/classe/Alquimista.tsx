import { motion } from 'framer-motion';
import { FlaskConical, TestTube2, Combine, Gauge } from 'lucide-react';
import type { IClasse } from '../../types/catalogo';
import { PremiumCard } from '../components/premium/PremiumCard';
import { DetalhesClasse } from '../../pages/Regras/components/DetalhesClasse';
import { obterTemaPorId } from '../themeMap';

export const Alquimista = ({ classe }: { classe: IClasse }) => {
  const tema = obterTemaPorId(classe.id);

  return (
    <div className={`min-h-screen ${tema.text} p-8 selection:bg-emerald-500/30 overflow-hidden relative`}>
      {/* 3D WebGL Background */}
      <div className="fixed inset-0 z-0 bg-cover bg-center bg-no-repeat opacity-20 pointer-events-none" style={{ backgroundImage: "url('/assets/img/alquimista_bg.webp')" }} />

      {/* Potions / Chemistry Background Effects */}
      <div className="fixed inset-0 pointer-events-none z-0">
        <div className="absolute top-[20%] left-[20%] w-[50%] h-[50%] bg-emerald-900/20 blur-[150px] mix-blend-screen" />
        <div className="absolute bottom-[20%] right-[20%] w-[30%] h-[30%] bg-purple-900/20 blur-[150px] mix-blend-screen" />
        
        {/* Bubbles rising */}
        {[...Array(15)].map((_, i) => (
          <motion.div
            key={i}
            className="absolute rounded-full border border-emerald-500/20"
            style={{
              width: Math.random() * 20 + 5,
              height: Math.random() * 20 + 5,
              left: `${Math.random() * 100}%`,
              bottom: '-10%',
            }}
            animate={{
              y: - (typeof window !== 'undefined' ? window.innerHeight + 100 : 1000),
              x: `+=${Math.random() * 50 - 25}`,
            }}
            transition={{
              duration: Math.random() * 5 + 5,
              repeat: Infinity,
              ease: "linear",
              delay: Math.random() * 5
            }}
          />
        ))}
      </div>

      <div className="max-w-5xl mx-auto relative z-10 pt-16">
        {/* Header */}
        <motion.header 
          initial={{ opacity: 0, y: -30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="text-center mb-24"
        >
          <motion.div 
            className={`w-28 h-28 mx-auto ${tema.bg} border-2 ${tema.border} rounded-[3rem_3rem_1rem_1rem] flex items-center justify-center mb-8 relative overflow-hidden backdrop-blur-md`}
          >
            {/* Liquid filling animation inside the flask-like container */}
            <motion.div 
              className={`absolute inset-x-0 bottom-0 ${tema.bg}`}
              style={{ backgroundColor: tema.primary + '30' }}
              animate={{ height: ["20%", "70%", "20%"] }}
              transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
            />
            <FlaskConical size={48} className={`${tema.icon} z-10`} strokeWidth={1.5} />
          </motion.div>

          <motion.div className="overflow-hidden">
             <motion.h1 
                initial={{ y: "100%" }}
                animate={{ y: 0 }}
                transition={{ duration: 0.8, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
                className={`text-7xl font-black tracking-tight ${tema.text} mb-6 uppercase`}
                style={{ fontFamily: 'Cinzel, serif' }}
             >
               Alquimista
             </motion.h1>
          </motion.div>
          <motion.p 
             initial={{ opacity: 0 }}
             animate={{ opacity: 1 }}
             transition={{ duration: 1, delay: 0.6 }}
             className={`text-lg ${tema.tag} opacity-80 max-w-2xl mx-auto font-medium leading-relaxed`}
          >
            O Alquimista mistura reagentes para preparar curas, bombas, ácidos, antídotos e outras fórmulas. Cada dose é escolhida antes da aventura e resolve um problema bem definido quando chega a hora.
          </motion.p>
        </motion.header>

        {/* Traits Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 mb-24">
          <PremiumCard
            glowColor={tema.glow}
            initial={{ opacity: 0, x: -30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.4 }}
            className={`flex flex-col p-8 rounded-2xl ${tema.bg} ${tema.border} backdrop-blur-md`}
          >
            <TestTube2 size={36} className={`${tema.icon} mb-4`} strokeWidth={1.5} />
            <h3 className={`text-2xl font-bold ${tema.text} mb-2 uppercase`} style={{ fontFamily: 'Cinzel, serif' }}>Fórmulas Essenciais</h3>
            <p className="text-slate-300 leading-relaxed text-sm">
              Durante o descanso, você prepara as doses das fórmulas que conhece. Pode levar cura, Mana, fogo, ácido, névoa, veneno de lâmina ou mutagênico. Cada frasco é usado uma vez, e as doses que sobrarem expiram no descanso seguinte.
            </p>
            <a href="#habilidade-formulas" className="mt-5 inline-flex w-fit rounded-xl border border-emerald-300/25 bg-emerald-400/10 px-4 py-2 text-xs font-black uppercase tracking-wider text-emerald-100 transition hover:bg-emerald-400/20">
              Ver fórmulas e reagentes
            </a>
          </PremiumCard>

          <PremiumCard
            glowColor={tema.glow}
            initial={{ opacity: 0, x: 30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.4, delay: 0.2 }}
            className={`flex flex-col p-8 rounded-2xl ${tema.bg} ${tema.border} backdrop-blur-md`}
          >
            <Combine size={36} className={`${tema.icon} mb-4`} strokeWidth={1.5} />
            <h3 className={`text-2xl font-bold ${tema.text} mb-2 uppercase`} style={{ fontFamily: 'Cinzel, serif' }}>Transmutação Mestra</h3>
            <p className="text-slate-300 leading-relaxed text-sm">
              No nível 18, uma vez por descanso longo, 8 de Mana trocam o material de um objeto mundano de até 2 m³ nas suas mãos por uma cena inteira. Pedra vira madeira, ferro vira vidro, corda vira corrente. Moeda, artefato e ser vivo ficam fora do alcance.
            </p>
          </PremiumCard>
          <PremiumCard
            glowColor={tema.glow}
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.4, delay: 0.4 }}
            className={`flex flex-col p-8 rounded-2xl ${tema.bg} ${tema.border} backdrop-blur-md`}
          >
            <Gauge size={36} className={`${tema.icon} mb-4`} strokeWidth={1.5} />
            <h3 className={`text-2xl font-bold ${tema.text} mb-2 uppercase`} style={{ fontFamily: 'Cinzel, serif' }}>Sobre a DT</h3>
            <p className="text-slate-300 leading-relaxed text-sm">
              Nenhuma dose sua usa número fixo. Ao usar o frasco, você rola Ofício (Alquimia), o ofício que vem junto da classe, e o resultado é o número que a vítima precisa alcançar para escapar. Dosagem boa rende mais que sorte, e uma falha crítica quebra o frasco errado.
            </p>
          </PremiumCard>
        </div>

        <DetalhesClasse classe={classe} />
      </div>
    </div>
  );
};

export default Alquimista;
