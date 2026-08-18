import { motion } from 'framer-motion';
import { Sprout, Wifi, Footprints } from 'lucide-react';
import type { IRaca } from '../../types/catalogo';

import { PremiumCard } from '../components/premium/PremiumCard';
import { EscolhaRacialCards } from '../components/premium/EscolhaRacialCards';
import { EstagiosRaciais } from '../components/premium/EstagiosRaciais';
import { obterTemaPorId } from '../themeMap';

interface MicelianoProps {
  raca: IRaca;
}

export const Miceliano = ({ raca }: MicelianoProps) => {
  const tema = obterTemaPorId(raca.id);
  return (
    <div className="min-h-screen text-purple-50 p-8 selection:bg-purple-500/30 overflow-hidden relative">
      {/* Background Image */}
      <div 
        className="fixed inset-0 z-0 bg-cover bg-center bg-no-repeat bg-black"
        style={{ backgroundImage: "url('/assets/img/miceliano_bg.webp')" }}
      >
        <div className="absolute inset-0 bg-slate-950/80 mix-blend-multiply" />
        <div className="absolute inset-0 bg-gradient-to-b from-[#0d0914]/40 via-transparent to-[#0d0914]/90" />
      </div>

      {/* Fungal Bioluminescence Effects */}
      <div className="fixed inset-0 pointer-events-none z-0">
        <div className="absolute top-[20%] left-[20%] w-[50%] h-[50%] bg-purple-900/20 blur-[150px] rounded-full mix-blend-screen" />
        <div className="absolute bottom-[10%] right-[10%] w-[40%] h-[40%] bg-fuchsia-900/10 blur-[120px] rounded-full mix-blend-screen" />
        
        {/* Floating Spores */}
        {[...Array(40)].map((_, i) => (
          <motion.div
            key={i}
            className="absolute rounded-full"
            style={{
              width: Math.random() * 4 + 2,
              height: Math.random() * 4 + 2,
              backgroundColor: Math.random() > 0.5 ? 'rgba(192, 132, 252, 0.6)' : 'rgba(232, 121, 249, 0.4)',
              boxShadow: '0 0 10px rgba(192, 132, 252, 0.5)',
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
            }}
            animate={{
              y: `+=${Math.random() * 40 - 20}`,
              x: `+=${Math.random() * 40 - 20}`,
              opacity: [0, 1, 0],
            }}
            transition={{
              duration: Math.random() * 5 + 3,
              repeat: Infinity,
              ease: "easeInOut",
              delay: Math.random() * 3
            }}
          />
        ))}
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
            className={`w-28 h-28 mx-auto ${tema.bg} border-2 ${tema.border} rounded-full flex items-center justify-center mb-8 backdrop-blur-md relative`}
          >
            <Sprout size={48} className={`${tema.icon} z-10`} strokeWidth={1.5} />
          </motion.div>

          <motion.div className="overflow-hidden">
             <motion.h1 
                initial={{ y: "100%" }}
                animate={{ y: 0 }}
                transition={{ duration: 0.8, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
                className={`text-7xl font-bold tracking-tight ${tema.text} mb-6 uppercase`}
                style={{ fontFamily: 'Cinzel, serif' }}
             >
               Miceliano
             </motion.h1>
          </motion.div>
          <motion.p 
             initial={{ opacity: 0 }}
             animate={{ opacity: 1 }}
             transition={{ duration: 1, delay: 0.6 }}
             className="text-lg text-purple-200/60 max-w-2xl mx-auto font-medium leading-relaxed"
          >
            Parte criatura, parte fungo. Deixa esporo em quem confia pra conversar sem falar, e lê o chão pra saber quem passou por ali antes de vocês.
          </motion.p>
        </motion.header>

        {/* Traits Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-24">
          <PremiumCard
            glowColor={tema.glow}
            initial={{ opacity: 0, x: -30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className={`flex gap-6 p-8 rounded-xl ${tema.bg} ${tema.border} backdrop-blur-md`}
          >
            <Wifi size={40} className={`${tema.icon} shrink-0`} strokeWidth={1.5} />
            <div>
              <h3 className={`text-2xl font-bold ${tema.text} mb-3`} style={{ fontFamily: 'Cinzel, serif' }}>Rede Micelial</h3>
              <p className="text-purple-200/60 leading-relaxed text-sm">
                Gaste uma ação e toque um aliado voluntário para deixar esporos nele. Até o próximo descanso, vocês trocam ideias simples sem falar nada, desde que estejam a até 30 m um do outro.
</p>
            </div>
          </PremiumCard>

          <PremiumCard
            glowColor={tema.glow}
            initial={{ opacity: 0, x: 30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className={`flex gap-6 p-8 rounded-xl ${tema.bg} ${tema.border} backdrop-blur-md`}
          >
            <Footprints size={40} className={`${tema.icon} shrink-0`} strokeWidth={1.5} />
            <div>
              <h3 className={`text-2xl font-bold ${tema.text} mb-3`} style={{ fontFamily: 'Cinzel, serif' }}>Memória do Solo</h3>
              <p className="text-purple-200/60 leading-relaxed text-sm">
                Fique 1 minuto em contato com a terra, a madeira ou os fungos do lugar e faça um teste de Sobrevivência: os cogumelos e as raízes contam se alguma criatura passou por ali recentemente. Você fica sabendo da presença e da direção aproximada, nunca de quem era.
              </p>
            </div>
          </PremiumCard>

          <PremiumCard
            glowColor={tema.glow}
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.4 }}
            className={`col-span-1 md:col-span-2 flex gap-6 p-8 rounded-xl ${tema.bg} ${tema.border} backdrop-blur-md`}
          >
            <Sprout size={40} className={`${tema.icon} shrink-0`} strokeWidth={1.5} />
            <div>
              <h3 className={`text-2xl font-bold ${tema.text} mb-3`} style={{ fontFamily: 'Cinzel, serif' }}>Organismo Fúngico</h3>
              <p className="text-purple-200/60 leading-relaxed text-sm">
                Come como qualquer criatura viva e, além disso, puxa nutrientes do chão se passar um descanso em contato com solo fértil.
              </p>
            </div>
          </PremiumCard>
        </div>

        <EstagiosRaciais raca={raca} tema={tema} />

        <EscolhaRacialCards raca={raca} tema={tema} />
      </div>
    </div>
  );
};

export default Miceliano;
