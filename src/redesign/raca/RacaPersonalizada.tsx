import { motion } from 'framer-motion';
import { HelpCircle, Pencil } from 'lucide-react';
import type { IRaca } from '../../types/catalogo';
import { PremiumCard } from '../components/premium/PremiumCard';
import { DetalhesRaca } from '../../pages/Regras/components/DetalhesRaca';

export const RacaPersonalizada = ({ raca }: { raca: IRaca }) => {
  return (
    <div className="min-h-screen text-gray-50 p-8 selection:bg-gray-500/30 overflow-hidden relative bg-black">

      {/* Unknown/Blank Background Effects */}
      <div className="fixed inset-0 pointer-events-none z-0">
        <div className="absolute top-[30%] left-[30%] w-[40%] h-[40%] bg-white/5 blur-[150px] rounded-full mix-blend-screen" />

        {/* Abstract particles */}
        {[...Array(20)].map((_, i) => (
          <motion.div
            key={i}
            className="absolute rounded-full bg-white/20 blur-[2px]"
            style={{
              width: Math.random() * 20 + 5,
              height: Math.random() * 20 + 5,
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
            }}
            animate={{
              opacity: [0, 0.5, 0],
              scale: [0.5, 1.5, 0.5],
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
          initial={{ opacity: 0, filter: 'blur(10px)' }}
          animate={{ opacity: 1, filter: 'blur(0px)' }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          className="text-center mb-24"
        >
          <motion.div
            className="w-28 h-28 mx-auto border-2 border-dashed border-gray-600 rounded-full flex items-center justify-center mb-8 backdrop-blur-md relative bg-black/50"
          >
            <HelpCircle size={48} className="text-gray-400 z-10" strokeWidth={1} />
          </motion.div>

          <motion.div className="overflow-hidden">
             <motion.h1
                initial={{ y: "100%" }}
                animate={{ y: 0 }}
                transition={{ duration: 0.8, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
                className="text-7xl font-light tracking-widest text-gray-200 mb-6 uppercase"
                style={{ fontFamily: 'Cinzel, serif' }}
             >
               Outra Coisa
             </motion.h1>
          </motion.div>
          <motion.p
             initial={{ opacity: 0 }}
             animate={{ opacity: 1 }}
             transition={{ duration: 1, delay: 0.6 }}
             className="text-lg text-gray-400 max-w-2xl mx-auto font-light leading-relaxed"
          >
            Nenhuma raça do catálogo serve? Escolha esta e escreva o nome que quiser na ficha.
          </motion.p>
        </motion.header>

        {/* Traits Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-24">
          <PremiumCard
            glowColor="rgba(156,163,175,0.3)"
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="col-span-1 md:col-span-2 flex gap-6 p-8 bg-gray-900/40 border border-gray-800 rounded-lg backdrop-blur-md"
          >
            <Pencil size={32} className="text-gray-400 shrink-0" strokeWidth={1.5} />
            <div>
              <h3 className="text-2xl font-light text-gray-200 mb-3" style={{ fontFamily: 'Cinzel, serif' }}>Livre Arbítrio Narrativo</h3>
              <p className="text-gray-400 leading-relaxed text-sm font-light">
                Mecanicamente, esta é uma raça em branco. Ela não concede nenhum bônus, imunidade ou característica própria. O que ela representa, suas vantagens narrativas e a reação do mundo ficam a critério total do mestre e do jogador.
              </p>
            </div>
          </PremiumCard>
        </div>

        <DetalhesRaca raca={raca} />
      </div>
    </div>
  );
};

export default RacaPersonalizada;
