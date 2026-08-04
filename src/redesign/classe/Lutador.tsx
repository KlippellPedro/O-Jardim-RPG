import { motion } from 'framer-motion';
import { HandMetal, Trophy, Flame } from 'lucide-react';
import type { IClasse } from '../../types/catalogo';
import { PremiumCard } from '../components/premium/PremiumCard';
import { DetalhesClasse } from '../../pages/Regras/components/DetalhesClasse';
import { obterTemaPorId } from '../themeMap';

export const Lutador = ({ classe }: { classe: IClasse }) => {
  const tema = obterTemaPorId(classe.id);

  return (
    <div className="min-h-screen text-red-50 p-8 selection:bg-red-500/30 overflow-hidden relative">
      {/* 3D WebGL Background */}
      <div className="fixed inset-0 z-0 bg-cover bg-center bg-no-repeat opacity-20 pointer-events-none" style={{ backgroundImage: "url('/assets/img/lutador_bg.jpg')" }} />

      {/* Brutal Combat Background Effects */}
      <div className="fixed inset-0 pointer-events-none z-0">
        <div className="absolute top-[20%] left-[20%] w-[60%] h-[60%] bg-red-900/20 blur-[150px] rounded-full mix-blend-screen" />
        
        {/* Shockwaves */}
        {[...Array(3)].map((_, i) => (
          <motion.div
            key={i}
            className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-red-500/20"
            style={{
              width: 100,
              height: 100,
            }}
            animate={{
              width: [100, 1000],
              height: [100, 1000],
              opacity: [0.5, 0],
            }}
            transition={{
              duration: 2,
              repeat: Infinity,
              delay: i * 0.8,
              ease: "easeOut"
            }}
          />
        ))}
      </div>

      <div className="max-w-5xl mx-auto relative z-10 pt-16">
        {/* Header */}
        <motion.header 
          initial={{ opacity: 0, scale: 1.1 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5, type: "spring", stiffness: 200, damping: 15 }}
          className="text-center mb-24"
        >
          <motion.div 
            className={`w-28 h-28 mx-auto ${tema.bg} border-4 ${tema.border} rounded-lg flex items-center justify-center mb-8 backdrop-blur-md`}
            style={{ boxShadow: `0 0 50px ${tema.glow}` }}
            whileHover={{ scale: 1.1, rotate: 5 }}
          >
            <HandMetal size={48} className={tema.icon} strokeWidth={2} />
          </motion.div>

          <motion.div className="overflow-hidden">
             <motion.h1 
                initial={{ y: "100%" }}
                animate={{ y: 0 }}
                transition={{ duration: 0.8, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
                className={`text-7xl font-black tracking-tighter ${tema.text} mb-6 uppercase`}
                style={{ fontFamily: 'Cinzel, serif' }}
             >
               Lutador
             </motion.h1>
          </motion.div>
          <motion.p 
             initial={{ opacity: 0 }}
             animate={{ opacity: 1 }}
             transition={{ duration: 1, delay: 0.6 }}
             className="text-lg text-red-200/60 max-w-2xl mx-auto font-bold leading-relaxed"
          >
            Seu corpo é a arma definitiva. Ignorando o aço e a pólvora, eles esmagam armaduras e ossos através de artes marciais aperfeiçoadas pela dor e disciplina.
          </motion.p>
        </motion.header>

        {/* Traits Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-24">
          <PremiumCard
            glowColor={tema.glow}
            initial={{ opacity: 0, x: -50 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.4 }}
            className={`flex gap-6 p-8 rounded-none ${tema.bg} border-l-8 ${tema.border} backdrop-blur-md`}
          >
            <HandMetal size={40} className={`${tema.icon} shrink-0`} strokeWidth={2} />
            <div>
              <h3 className={`text-2xl font-black ${tema.text} mb-3 uppercase`} style={{ fontFamily: 'Cinzel, serif' }}>Punhos de Ferro</h3>
              <p className="text-red-200/70 leading-relaxed text-sm font-medium">
                Seus ataques desarmados deixam de ser Dano Brando e passam a ser Letais. Seu dano desarmado base aumenta em +1 categoria de dado permanente, escalando com seu estágio.
              </p>
            </div>
          </PremiumCard>

          <PremiumCard
            glowColor={tema.glow}
            initial={{ opacity: 0, x: 50 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.4, delay: 0.1 }}
            className={`flex gap-6 p-8 rounded-none ${tema.bg} border-l-8 ${tema.border} backdrop-blur-md`}
          >
            <Trophy size={40} className={`${tema.icon} shrink-0`} strokeWidth={2} />
            <div>
              <h3 className={`text-2xl font-black ${tema.text} mb-3 uppercase`} style={{ fontFamily: 'Cinzel, serif' }}>Estilo de Combate</h3>
              <p className="text-red-200/70 leading-relaxed text-sm font-medium">
                Crie com o mestre um estilo de luta próprio, com uma vantagem situacional e uma limitação de peso equivalente, como <span className="text-orange-400">golpes que ignoram esquiva ao custo de menor precisão</span> ou <span className="text-yellow-400">maior mobilidade desarmado em troca de dano reduzido</span>. O estilo não pode conceder ações extras permanentes nem copiar uma habilidade final.
              </p>
            </div>
          </PremiumCard>

          <PremiumCard
            glowColor={tema.glow}
            initial={{ opacity: 0, y: 50 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.4, delay: 0.2 }}
            className={`col-span-1 md:col-span-2 flex gap-6 p-8 rounded-none ${tema.bg} border-l-8 ${tema.border} backdrop-blur-md`}
          >
            <Flame size={40} className={`${tema.icon} shrink-0`} strokeWidth={2} />
            <div>
              <h3 className={`text-2xl font-black ${tema.text} mb-3 uppercase`} style={{ fontFamily: 'Cinzel, serif' }}>Impacto Brutal</h3>
              <p className="text-red-200/70 leading-relaxed text-sm font-medium">
                Gaste 5 de Mana para causar +1d10 em um ataque desarmado, mas sofra −2 Defesa até o seu próximo turno.
              </p>
            </div>
          </PremiumCard>
        </div>

        <DetalhesClasse classe={classe} />
      </div>
    </div>
  );
};

export default Lutador;

