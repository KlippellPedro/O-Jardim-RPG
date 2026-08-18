import { motion } from 'framer-motion';
import { Droplet, Moon, Ghost } from 'lucide-react';
import type { IRaca } from '../../types/catalogo';

import { PremiumCard } from '../components/premium/PremiumCard';
import { EscolhaRacialCards } from '../components/premium/EscolhaRacialCards';
import { EstagiosRaciais } from '../components/premium/EstagiosRaciais';
import { obterTemaPorId } from '../themeMap';

interface VampiroProps {
  raca: IRaca;
}

export const Vampiro = ({ raca }: VampiroProps) => {
  const tema = obterTemaPorId(raca.id);
  return (
    <div className="min-h-screen text-red-50 p-8 selection:bg-red-500/30 overflow-hidden relative">
      {/* Background Image */}
      <div 
        className="fixed inset-0 z-0 bg-cover bg-center bg-no-repeat bg-black"
        style={{ backgroundImage: "url('/assets/img/vampiro_bg.webp')" }}
      >
        <div className="absolute inset-0 bg-slate-950/80 mix-blend-multiply" />
        <div className="absolute inset-0 bg-gradient-to-b from-[#070101]/40 via-transparent to-[#070101]/90" />
      </div>

      {/* Blood/Darkness Background Effects */}
      <div className="fixed inset-0 pointer-events-none z-0">
        <div className="absolute top-[10%] right-[30%] w-[40%] h-[60%] bg-red-900/10 blur-[150px] rounded-full mix-blend-screen" />
        <div className="absolute bottom-[0%] left-[20%] w-[50%] h-[40%] bg-rose-950/20 blur-[120px] rounded-full mix-blend-screen" />
        
        {/* Falling blood drops */}
        {[...Array(15)].map((_, i) => (
          <motion.div
            key={i}
            className="absolute bg-red-600 rounded-full blur-[1px]"
            style={{
              width: Math.random() * 3 + 2,
              height: Math.random() * 15 + 5,
              left: `${Math.random() * 100}%`,
              opacity: Math.random() * 0.5 + 0.2,
            }}
            initial={{ y: -100 }}
            animate={{ y: typeof window !== 'undefined' ? window.innerHeight + 100 : 1000 }}
            transition={{
              duration: Math.random() * 2 + 1,
              repeat: Infinity,
              ease: "easeIn",
              delay: Math.random() * 2
            }}
          />
        ))}
      </div>

      <div className="max-w-5xl mx-auto relative z-10 pt-16">
        {/* Header */}
        <motion.header 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          className="text-center mb-24"
        >
          <motion.div 
            className={`w-28 h-28 mx-auto ${tema.bg} ${tema.border} rounded-full flex items-center justify-center mb-8 relative overflow-hidden backdrop-blur-md`}
          >
            <div className={`absolute inset-0 ${tema.bg}`} />
            <Droplet size={48} className={`${tema.icon} z-10`} strokeWidth={1.5} />
          </motion.div>

          <motion.div className="overflow-hidden">
             <motion.h1 
                initial={{ y: "100%" }}
                animate={{ y: 0 }}
                transition={{ duration: 0.8, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
                className={`text-7xl font-serif tracking-tight ${tema.text} mb-6 uppercase`}
                style={{ fontFamily: 'Cinzel, serif' }}
             >
               Vampiro
             </motion.h1>
          </motion.div>
          <motion.p 
             initial={{ opacity: 0 }}
             animate={{ opacity: 1 }}
             transition={{ duration: 1, delay: 0.6 }}
             className="text-lg text-red-200/60 max-w-2xl mx-auto font-medium leading-relaxed font-serif"
          >
            Enxerga no escuro natural, fecha ferida bebendo sangue e paga caro quando fica sem. O povo é de Întuneric e fala Romeno. A dimensão inteira gira em torno de uma cadeia alimentar que termina neles, e da vítima ele tira tanto vida quanto magia.
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
            className={`flex flex-col p-8 rounded-xl ${tema.bg} border-l-4 ${tema.border} backdrop-blur-md`}
          >
            <Moon size={32} className={`${tema.icon} mb-4`} strokeWidth={1.5} />
            <h3 className={`text-2xl font-serif ${tema.text} mb-3`} style={{ fontFamily: 'Cinzel, serif' }}>Visão Noturna</h3>
            <p className="text-red-200/60 leading-relaxed text-sm">
              Você enxerga normalmente na escuridão natural. Escuridão criada por magia ou por Fluxo continua sendo escuridão para você.
            </p>
          </PremiumCard>

          <PremiumCard
            glowColor={tema.glow}
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className={`flex flex-col p-8 rounded-xl ${tema.bg} border-l-4 ${tema.border} backdrop-blur-md`}
          >
            <Droplet size={32} className={`${tema.icon} mb-4`} strokeWidth={1.5} />
            <h3 className={`text-2xl font-serif ${tema.text} mb-3`} style={{ fontFamily: 'Cinzel, serif' }}>Hemofagia</h3>
            <p className="text-red-200/60 leading-relaxed text-sm">
              Beba o sangue de um ser vivo voluntário ou incapacitado e recupere 1d6 de Vida. Custa uma ação e vale uma vez por cena. Construto, Espírito e criatura sem sangue não servem.
            </p>
          </PremiumCard>

          <PremiumCard
            glowColor={tema.glow}
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.4 }}
            className={`col-span-1 md:col-span-2 flex flex-col p-8 rounded-xl ${tema.bg} border-l-4 ${tema.border} backdrop-blur-md`}
          >
            <Ghost size={32} className={`${tema.icon} mb-4`} strokeWidth={1.5} />
            <h3 className={`text-2xl font-serif ${tema.text} mb-3`} style={{ fontFamily: 'Cinzel, serif' }}>Fome de Sangue</h3>
            <p className="text-red-200/60 leading-relaxed text-sm">
              Passadas 24 horas sem consumir sangue, seus descansos passam a devolver apenas metade da Mana normal, com mínimo de 1, até você se alimentar de novo.
            </p>
          </PremiumCard>
        </div>

        <EstagiosRaciais
          raca={raca}
          tema={tema}
          titulo="Idade do Sangue"
          descricao="Quanto mais velho o vampiro, melhor o sangue rende. A idade sobe por nível total, trazendo Vida e a característica seguinte do seu Clã. No topo, a fome também cobra mais caro."
        />

        <EscolhaRacialCards raca={raca} tema={tema} />
      </div>
    </div>
  );
};

export default Vampiro;
