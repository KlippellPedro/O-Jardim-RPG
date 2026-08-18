import { motion } from 'framer-motion';
import { PawPrint, Volume2, TreePine } from 'lucide-react';
import type { IRaca } from '../../types/catalogo';
import { PremiumCard } from '../components/premium/PremiumCard';
import { EscolhaRacialCards } from '../components/premium/EscolhaRacialCards';
import { EstagiosRaciais } from '../components/premium/EstagiosRaciais';
import { obterTemaPorId } from '../themeMap';

export const Animalia = ({ raca }: { raca: IRaca }) => {
  const tema = obterTemaPorId(raca.id);
  return (
    <div className="min-h-screen text-green-50 p-8 selection:bg-green-500/30 overflow-hidden relative">
      {/* Wilderness Background */}
      <div 
        className="fixed inset-0 z-0 bg-cover bg-center bg-no-repeat bg-black"
        style={{ backgroundImage: "url('/assets/img/animalia_bg.webp')" }}
      >
        <div className="absolute inset-0 bg-green-950/80 mix-blend-multiply" />
        <div className="absolute inset-0 bg-gradient-to-b from-[#0d120a]/40 via-transparent to-[#0d120a]/90" />
      </div>

      {/* Wilderness Background Effects */}
      <div className="fixed inset-0 pointer-events-none z-0">
        <div className="absolute top-[20%] right-[20%] w-[40%] h-[40%] bg-emerald-900/10 blur-[150px] rounded-full mix-blend-screen" />
        <div className="absolute bottom-[10%] left-[10%] w-[50%] h-[50%] bg-green-900/10 blur-[150px] rounded-full mix-blend-screen" />
        
        {/* Falling leaves / pollen */}
        {[...Array(25)].map((_, i) => (
          <motion.div
            key={i}
            className="absolute w-2 h-2 rounded-full"
            style={{
              backgroundColor: Math.random() > 0.5 ? 'rgba(52, 211, 153, 0.4)' : 'rgba(217, 119, 6, 0.3)',
            }}
            initial={{ 
              x: Math.random() * (typeof window !== 'undefined' ? window.innerWidth : 1000), 
              y: -50,
              rotate: 0
            }}
            animate={{
              y: (typeof window !== 'undefined' ? window.innerHeight : 1000) + 50,
              x: `+=${Math.random() * 200 - 100}`,
              rotate: 360,
              opacity: [0, 1, 0],
            }}
            transition={{
              duration: Math.random() * 10 + 10,
              repeat: Infinity,
              delay: Math.random() * 10,
              ease: "linear"
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
            className={`w-28 h-28 mx-auto ${tema.bg} ${tema.border} rounded-full flex items-center justify-center mb-8 backdrop-blur-md relative`}
          >
            <PawPrint size={48} className={`${tema.icon} z-10`} strokeWidth={1.5} />
            <motion.div
              animate={{ scale: [1, 1.2, 1], opacity: [0.3, 0.1, 0.3] }}
              transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
              className={`absolute inset-0 ${tema.bg} rounded-full blur-[10px]`}
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
               Animália
             </motion.h1>
          </motion.div>
          <motion.p 
             initial={{ opacity: 0 }}
             animate={{ opacity: 1 }}
             transition={{ duration: 1, delay: 0.6 }}
             className="text-lg text-green-100/60 max-w-2xl mx-auto font-medium leading-relaxed"
          >
            Gente com corpo de bicho. Qual bicho é escolha sua, e a morfologia decide se ele sai ágil, robusto ou místico. Troca ideia simples com animais, o que está longe de significar que eles obedeçam. Fala Sumeriano.
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
            className={`flex gap-6 p-8 rounded-2xl ${tema.bg} ${tema.border} backdrop-blur-md`}
          >
            <TreePine size={40} className={`${tema.icon} shrink-0`} strokeWidth={1.5} />
            <div>
              <h3 className={`text-2xl font-bold ${tema.text} mb-3`} style={{ fontFamily: 'Cinzel, serif' }}>Morfologia Animal</h3>
              <p className="text-green-100/60 leading-relaxed text-sm">
                O tamanho e a aparência vêm de duas escolhas suas: qual bicho você é e qual morfologia veio mais forte (Ágil, Robusta ou Mística).
              </p>
            </div>
          </PremiumCard>

          <PremiumCard
            glowColor={tema.glow}
            initial={{ opacity: 0, x: 30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className={`flex gap-6 p-8 rounded-2xl ${tema.bg} ${tema.border} backdrop-blur-md`}
          >
            <Volume2 size={40} className={`${tema.icon} shrink-0`} strokeWidth={1.5} />
            <div>
              <h3 className={`text-2xl font-bold ${tema.text} mb-3`} style={{ fontFamily: 'Cinzel, serif' }}>Voz da Fauna</h3>
              <p className="text-green-100/60 leading-relaxed text-sm">
                Você passa ideias simples para animais e entende o que eles respondem. Isso não te dá controle sobre eles: o bicho ouve, entende e decide sozinho o que vai fazer.
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

export default Animalia;
