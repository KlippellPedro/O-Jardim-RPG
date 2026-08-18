import { motion } from 'framer-motion';
import { Droplet, Minimize2, ArrowDownToLine } from 'lucide-react';
import type { IRaca } from '../../types/catalogo';

import { PremiumCard } from '../components/premium/PremiumCard';
import { EscolhaRacialCards } from '../components/premium/EscolhaRacialCards';
import { EstagiosRaciais } from '../components/premium/EstagiosRaciais';
import { obterTemaPorId } from '../themeMap';

interface SlimeProps {
  raca: IRaca;
}

export const Slime = ({ raca }: SlimeProps) => {
  const tema = obterTemaPorId(raca.id);
  return (
    <div className="min-h-screen text-green-50 p-8 selection:bg-green-500/30 overflow-hidden relative">
      {/* Background Image */}
      <div 
        className="fixed inset-0 z-0 bg-cover bg-center bg-no-repeat bg-black"
        style={{ backgroundImage: "url('/assets/img/slime_bg.webp')" }}
      >
        <div className="absolute inset-0 bg-slate-950/80 mix-blend-multiply" />
        <div className="absolute inset-0 bg-gradient-to-b from-[#07140c]/40 via-transparent to-[#07140c]/90" />
      </div>

      {/* Acid/Slime Background Effects */}
      <div className="fixed inset-0 pointer-events-none z-0">
        <div className="absolute top-[20%] right-[30%] w-[40%] h-[40%] bg-lime-900/20 blur-[120px] rounded-full mix-blend-screen" />
        <div className="absolute bottom-[20%] left-[20%] w-[50%] h-[50%] bg-emerald-900/20 blur-[150px] rounded-full mix-blend-screen" />
        
        {/* Slime drips */}
        {[...Array(6)].map((_, i) => (
          <motion.div
            key={i}
            className="absolute top-0 bg-lime-400/30 rounded-b-full blur-[2px]"
            style={{
              width: Math.random() * 40 + 20,
              left: `${Math.random() * 100}%`,
            }}
            animate={{ height: [0, Math.random() * 200 + 100, 0] }}
            transition={{
              duration: Math.random() * 4 + 4,
              repeat: Infinity,
              ease: "easeInOut",
              delay: Math.random() * 5
            }}
          />
        ))}
      </div>

      <div className="max-w-5xl mx-auto relative z-10 pt-16">
        {/* Header */}
        <motion.header 
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.8, type: "spring", bounce: 0.5 }}
          className="text-center mb-24"
        >
          <motion.div 
            className={`w-28 h-28 mx-auto ${tema.bg} border-[3px] ${tema.border} rounded-[30%_70%_70%_30%/30%_30%_70%_70%] flex items-center justify-center mb-8 backdrop-blur-md relative`}
            animate={{ 
              borderRadius: [
                "30% 70% 70% 30% / 30% 30% 70% 70%", 
                "70% 30% 30% 70% / 70% 70% 30% 30%", 
                "30% 70% 70% 30% / 30% 30% 70% 70%"
              ] 
            }}
            transition={{ duration: 8, repeat: Infinity, ease: "linear" }}
          >
            <Droplet size={48} className={`${tema.icon} z-10`} strokeWidth={1.5} />
          </motion.div>

          <motion.div className="overflow-hidden">
             <motion.h1 
                initial={{ y: "100%" }}
                animate={{ y: 0 }}
                transition={{ duration: 0.8, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
                className={`text-7xl font-bold tracking-tight ${tema.text} mb-6 uppercase`}
                style={{ fontFamily: 'Cinzel, serif' }}
             >
               Slime
             </motion.h1>
          </motion.div>
          <motion.p 
             initial={{ opacity: 0 }}
             animate={{ opacity: 1 }}
             transition={{ duration: 1, delay: 0.6 }}
             className="text-lg text-lime-100/70 max-w-2xl mx-auto font-medium leading-relaxed"
          >
            Corpo semissólido, sem osso e sem órgão em lugar fixo. Passa por qualquer fresta de 15 cm, amassa queda que quebraria outro e escorrega de agarrão, mas nada rígido veste ele sem adaptação.
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
            className={`flex flex-col items-center text-center p-8 rounded-3xl ${tema.bg} border-2 ${tema.border} backdrop-blur-md`}
          >
            <Minimize2 size={40} className={`${tema.icon} mb-6`} strokeWidth={1.5} />
            <h3 className={`text-2xl font-bold ${tema.text} mb-3`} style={{ fontFamily: 'Cinzel, serif' }}>Corpo Maleável</h3>
            <p className="text-lime-100/60 leading-relaxed text-sm">
              Você atravessa qualquer abertura de pelo menos 15 cm, contanto que não esteja carregando equipamento rígido maior que a passagem. O trecho apertado conta como terreno difícil, e você não pode terminar o movimento dentro dele.
            </p>
          </PremiumCard>

          <PremiumCard
            glowColor={tema.glow}
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className={`flex flex-col items-center text-center p-8 rounded-3xl ${tema.bg} border-2 ${tema.border} backdrop-blur-md`}
          >
            <ArrowDownToLine size={40} className={`${tema.icon} mb-6`} strokeWidth={1.5} />
            <h3 className={`text-2xl font-bold ${tema.text} mb-3`} style={{ fontFamily: 'Cinzel, serif' }}>Amortecimento Gelatinoso</h3>
            <p className="text-lime-100/60 leading-relaxed text-sm">
              Toda queda causa metade do dano em você. Você também tem vantagem nos testes para escapar de agarrões e de amarras, desde que a amarra não seja hermeticamente fechada.
            </p>
          </PremiumCard>
        </div>

        <EstagiosRaciais
          raca={raca}
          tema={tema}
          titulo="Massa"
          descricao="Slime cresce comendo. A massa sobe por nível total, trazendo Vida, um corpo maior e a característica seguinte da sua Composição."
        />

        <EscolhaRacialCards raca={raca} tema={tema} />
      </div>
    </div>
  );
};

export default Slime;
