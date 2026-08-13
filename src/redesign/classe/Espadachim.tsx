import { motion } from 'framer-motion';
import { Crosshair, Wind, Sword } from 'lucide-react';
import type { IClasse } from '../../types/catalogo';
import { PremiumCard } from '../components/premium/PremiumCard';
import { DetalhesClasse } from '../../pages/Regras/components/DetalhesClasse';
import { obterTemaPorId } from '../themeMap';

export const Espadachim = ({ classe }: { classe: IClasse }) => {
  const tema = obterTemaPorId(classe.id);

  return (
    <div className="min-h-screen text-blue-50 p-8 selection:bg-blue-500/30 overflow-hidden relative">
      {/* 3D WebGL Background */}
      <div className="fixed inset-0 z-0 bg-cover bg-center bg-no-repeat opacity-20 pointer-events-none" style={{ backgroundImage: "url('/assets/img/espadachim_bg.webp')" }} />

      {/* Blade Slashes Background */}
      <div className="fixed inset-0 pointer-events-none z-0">
        {/* Animated sword slashes */}
        {[...Array(4)].map((_, i) => (
          <motion.div
            key={i}
            className="absolute bg-white/50 blur-[1px]"
            style={{
              height: 2,
              width: '150%',
              left: '-25%',
              top: `${20 + i * 20}%`,
              rotate: Math.random() * 40 - 20,
            }}
            animate={{ scaleX: [0, 1, 0], opacity: [0, 1, 0] }}
            transition={{
              duration: 0.3,
              repeat: Infinity,
              repeatDelay: Math.random() * 4 + 2,
              ease: "easeOut"
            }}
          />
        ))}
      </div>

      <div className="max-w-5xl mx-auto relative z-10 pt-16">
        {/* Header */}
        <motion.header 
          initial={{ opacity: 0, x: -30 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5 }}
          className="text-center mb-24"
        >
          <motion.div 
            className={`w-28 h-28 mx-auto ${tema.bg} ${tema.border} rounded-sm flex items-center justify-center mb-8 shadow-2xl rotate-45 relative`}
          >
            <Sword size={48} className={`${tema.icon} -rotate-45`} strokeWidth={1} />
          </motion.div>

          <motion.div className="overflow-hidden">
             <motion.h1 
                initial={{ y: "100%" }}
                animate={{ y: 0 }}
                transition={{ duration: 0.6, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
                className={`text-7xl font-bold tracking-tight ${tema.text} mb-6 uppercase`}
                style={{ fontFamily: 'Cinzel, serif' }}
             >
               Espadachim
             </motion.h1>
          </motion.div>
          <motion.p 
             initial={{ opacity: 0 }}
             animate={{ opacity: 1 }}
             transition={{ duration: 1, delay: 0.4 }}
             className="text-lg text-slate-400 max-w-2xl mx-auto font-medium leading-relaxed"
          >
            Perfeição marcial concentrada na lâmina. Eles fluem por posturas ofensivas e defensivas em milissegundos, desferindo combos rápidos onde o primeiro acerto garante a queda do inimigo.
          </motion.p>
        </motion.header>

        {/* Traits Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-24">
          <PremiumCard
            glowColor={tema.glow}
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.4 }}
            className={`col-span-1 md:col-span-2 flex flex-col md:flex-row gap-6 p-8 rounded-none ${tema.bg} ${tema.border} backdrop-blur-md`}
          >
            <Crosshair size={40} className={`${tema.icon} shrink-0`} strokeWidth={1.5} />
            <div>
              <h3 className={`text-2xl font-bold ${tema.text} mb-3`} style={{ fontFamily: 'Cinzel, serif' }}>Talento de Combate</h3>
              <p className="text-slate-400 leading-relaxed text-sm">
                No início do combate, assuma uma postura: <span className="text-blue-300">Precisão</span> (+1 acerto), <span className="text-red-300">Devastação</span> (+2 dano em alvos abaixo de 50% de Vida), ou <span className="text-green-300">Defesa Ágil</span> (+2 Defesa). Você ganha escolhas ativas adicionais conforme avança de estágio.
              </p>
            </div>
          </PremiumCard>

          <PremiumCard
            glowColor={tema.glow}
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.4, delay: 0.2 }}
            className={`col-span-1 md:col-span-2 flex flex-col md:flex-row gap-6 p-8 rounded-none ${tema.bg} ${tema.border} backdrop-blur-md`}
          >
            <Wind size={40} className={`${tema.icon} shrink-0`} strokeWidth={1.5} />
            <div>
              <h3 className={`text-2xl font-bold ${tema.text} mb-3`} style={{ fontFamily: 'Cinzel, serif' }}>Combo Marcial</h3>
              <p className="text-slate-400 leading-relaxed text-sm">
                Uma vez por combate, se seu ataque acertar, faça um segundo ataque imediato. Se este também acertar, faça um terceiro causando metade do dano. O alvo atingido pelo combo sofre -2 na Defesa até o fim da rodada seguinte.
              </p>
            </div>
          </PremiumCard>
        </div>

        <DetalhesClasse classe={classe} />
      </div>
    </div>
  );
};

export default Espadachim;

