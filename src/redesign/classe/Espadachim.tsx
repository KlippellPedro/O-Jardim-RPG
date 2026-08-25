import { motion } from 'framer-motion';
import { Crosshair, Wind, Sword, Gauge } from 'lucide-react';
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
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 mb-24">
          <PremiumCard
            glowColor={tema.glow}
            initial={{ opacity: 0, x: -30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.4 }}
            className={`flex flex-col p-8 rounded-none ${tema.bg} ${tema.border} backdrop-blur-md`}
          >
            <Sword size={36} className={`${tema.icon} mb-4`} strokeWidth={1.5} />
            <h3 className={`text-2xl font-bold ${tema.text} mb-3`} style={{ fontFamily: 'Cinzel, serif' }}>Arte da Espada</h3>
            <p className="text-slate-400 leading-relaxed text-sm">
              Vincule-se a uma espada: ela ganha bônus de ataque e dano que só crescem com sua carreira. Uma vez por combate, use uma Reação para reduzir o dano de um golpe em seu nível, e depois de um crítico, encadeie um ataque adicional.
            </p>
          </PremiumCard>

          <PremiumCard
            glowColor={tema.glow}
            initial={{ opacity: 0, x: 30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.4, delay: 0.2 }}
            className={`flex flex-col p-8 rounded-none ${tema.bg} ${tema.border} backdrop-blur-md`}
          >
            <Crosshair size={36} className={`${tema.icon} mb-4`} strokeWidth={1.5} />
            <h3 className={`text-2xl font-bold ${tema.text} mb-3`} style={{ fontFamily: 'Cinzel, serif' }}>Posturas de Combate</h3>
            <p className="text-slate-400 leading-relaxed text-sm">
              Aprenda uma postura de combate por estágio, entre oito possíveis: <span className="text-blue-300">Precisão</span>, <span className="text-red-300">Devastação</span>, <span className="text-green-300">Defesa Ágil</span> e mais. Toda postura aprendida fica ativa o combate inteiro, ao mesmo tempo que as outras.
            </p>
          </PremiumCard>

          <PremiumCard
            glowColor={tema.glow}
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.4, delay: 0.4 }}
            className={`flex flex-col p-8 rounded-none ${tema.bg} ${tema.border} backdrop-blur-md`}
          >
            <Wind size={36} className={`${tema.icon} mb-4`} strokeWidth={1.5} />
            <h3 className={`text-2xl font-bold ${tema.text} mb-3`} style={{ fontFamily: 'Cinzel, serif' }}>Espírito da Espada</h3>
            <p className="text-slate-400 leading-relaxed text-sm">
              Uma vez por sessão, sem gastar ação: por três rodadas seus golpes com a espada vinculada ignoram metade da Resistência, causam +2 dados de dano e permitem avançar 3 m após cada acerto sem provocar reações. Um erro pode ser repetido uma vez por rodada.
            </p>
          </PremiumCard>
          <PremiumCard
            glowColor={tema.glow}
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.4, delay: 0.6 }}
            className={`flex flex-col p-8 rounded-none ${tema.bg} ${tema.border} backdrop-blur-md`}
          >
            <Gauge size={36} className={`${tema.icon} mb-4`} strokeWidth={1.5} />
            <h3 className={`text-2xl font-bold ${tema.text} mb-3`} style={{ fontFamily: 'Cinzel, serif' }}>Sobre a DT</h3>
            <p className="text-slate-400 leading-relaxed text-sm">
              Toda técnica sua que obriga o alvo a resistir rola Luta no momento do golpe: o resultado vira a DT que ele precisa alcançar, valendo para todos os atingidos naquele uso.
            </p>
          </PremiumCard>
        </div>

        <DetalhesClasse classe={classe} />
      </div>
    </div>
  );
};

export default Espadachim;

