import { motion } from 'framer-motion';
import { Shield, ShieldAlert, HeartHandshake, Gauge } from 'lucide-react';
import type { IClasse } from '../../types/catalogo';
import { PremiumCard } from '../components/premium/PremiumCard';
import { DetalhesClasse } from '../../pages/Regras/components/DetalhesClasse';
import { obterTemaPorId } from '../themeMap';

export const Guardiao = ({ classe }: { classe: IClasse }) => {
  const tema = obterTemaPorId(classe.id);

  return (
    <div className="min-h-screen text-stone-50 p-8 selection:bg-stone-500/30 overflow-hidden relative">
      {/* 3D WebGL Background */}
      <div className="fixed inset-0 z-0 bg-cover bg-center bg-no-repeat opacity-20 pointer-events-none" style={{ backgroundImage: "url('/assets/img/guardiao_bg.webp')" }} />

      {/* Heavy Armor / Bulwark Background Effects */}
      <div className="fixed inset-0 pointer-events-none z-0">
        <div className="absolute bottom-[0%] left-[20%] w-[60%] h-[40%] bg-stone-900/30 blur-[150px] rounded-full mix-blend-screen" />
        
        {/* Hex Shield Patterns appearing */}
        {[...Array(4)].map((_, i) => (
          <motion.div
            key={i}
            className="absolute border-[4px] border-stone-800/30 rounded-lg"
            style={{
              width: 300,
              height: 300,
              left: `${20 + i * 20}%`,
              top: '50%',
              y: '-50%',
              x: '-50%',
              rotate: 45
            }}
            animate={{
              opacity: [0, 0.5, 0],
              scale: [0.8, 1, 0.8],
            }}
            transition={{
              duration: 4,
              repeat: Infinity,
              delay: i * 1,
              ease: "easeInOut"
            }}
          />
        ))}
      </div>

      <div className="max-w-5xl mx-auto relative z-10 pt-16">
        {/* Header */}
        <motion.header 
          initial={{ opacity: 0, y: 50 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, type: "spring", stiffness: 100 }}
          className="text-center mb-24"
        >
          <motion.div 
            className={`w-32 h-32 mx-auto ${tema.bg} ${tema.border} rounded-none flex items-center justify-center mb-8 shadow-2xl relative overflow-hidden backdrop-blur-md`}
          >
            <div className="absolute inset-x-0 bottom-0 h-1/2 bg-stone-800/50" />
            <Shield size={56} className={`${tema.icon} z-10`} strokeWidth={1.5} />
          </motion.div>

          <motion.div className="overflow-hidden">
             <motion.h1 
                initial={{ y: "100%" }}
                animate={{ y: 0 }}
                transition={{ duration: 0.8, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
                className={`text-7xl font-black tracking-tight ${tema.text} mb-6 uppercase`}
                style={{ fontFamily: 'Cinzel, serif' }}
             >
               Guardião
             </motion.h1>
          </motion.div>
          <motion.p 
             initial={{ opacity: 0 }}
             animate={{ opacity: 1 }}
             transition={{ duration: 1, delay: 0.6 }}
             className="text-lg text-stone-400 max-w-2xl mx-auto font-medium leading-relaxed"
          >
            Muralhas de carne e metal. Enquanto os outros desviam, eles recebem. Um Guardião controla a linha de frente provocando inimigos e erguendo barreiras intransponíveis.
          </motion.p>
        </motion.header>

        {/* Traits Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 mb-24">
          <PremiumCard
            glowColor={tema.glow}
            initial={{ opacity: 0, scale: 0.95 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.4 }}
            className={`flex flex-col p-8 rounded-sm ${tema.bg} ${tema.border} backdrop-blur-md`}
          >
            <HeartHandshake size={40} className={`${tema.icon} mb-6`} strokeWidth={1.5} />
            <h3 className={`text-2xl font-bold ${tema.text} mb-3 uppercase`} style={{ fontFamily: 'Cinzel, serif' }}>Protegido</h3>
            <p className="text-stone-400 leading-relaxed text-sm">
              Sele um juramento com um aliado e absorva o que vier no lugar dele. A cada estágio você também aprende um Juramento de Guarda, entre oito possíveis, que reforça o vínculo de um jeito diferente.
            </p>
          </PremiumCard>

          <PremiumCard
            glowColor={tema.glow}
            initial={{ opacity: 0, scale: 0.95 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.4, delay: 0.1 }}
            className={`flex flex-col p-8 rounded-sm ${tema.bg} ${tema.border} backdrop-blur-md`}
          >
            <ShieldAlert size={40} className={`${tema.icon} mb-6`} strokeWidth={1.5} />
            <h3 className={`text-2xl font-bold ${tema.text} mb-3 uppercase`} style={{ fontFamily: 'Cinzel, serif' }}>Provocar</h3>
            <p className="text-stone-400 leading-relaxed text-sm">
              Uma vez por combate, gaste Mana para bradar um desafio: todos os inimigos a até 6m testam Vontade contra a sua DT. Quem falhar sofre −2 para atacar qualquer alvo que não seja você por uma rodada. Com a experiência, você também reduz o dano que sofre dos primeiros golpes recebidos.
            </p>
          </PremiumCard>

          <PremiumCard
            glowColor={tema.glow}
            initial={{ opacity: 0, scale: 0.95 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.4, delay: 0.2 }}
            className={`flex flex-col p-8 rounded-sm ${tema.bg} ${tema.border} backdrop-blur-md`}
          >
            <Shield size={40} className={`${tema.icon} mb-6`} strokeWidth={1.5} />
            <h3 className={`text-2xl font-bold ${tema.text} mb-3 uppercase`} style={{ fontFamily: 'Cinzel, serif' }}>Coração Unificado</h3>
            <p className="text-stone-400 leading-relaxed text-sm">
              Uma vez por sessão, você e até cinco aliados a 12 m recebem Resistência 10 contra todo dano por três rodadas. Uma vez por rodada, use uma Reação para receber no lugar de um deles todo o dano de um ataque.
            </p>
          </PremiumCard>
          <PremiumCard
            glowColor={tema.glow}
            initial={{ opacity: 0, scale: 0.95 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.4, delay: 0.3 }}
            className={`flex flex-col p-8 rounded-sm ${tema.bg} ${tema.border} backdrop-blur-md`}
          >
            <Gauge size={40} className={`${tema.icon} mb-6`} strokeWidth={1.5} />
            <h3 className={`text-2xl font-bold ${tema.text} mb-3 uppercase`} style={{ fontFamily: 'Cinzel, serif' }}>Sobre a DT</h3>
            <p className="text-stone-400 leading-relaxed text-sm">
              O Guardião rola Intimidação com Constituição no lugar de Carisma: o que impõe respeito é o tanto de pancada que você mostra aguentar, não o discurso. É esse número que o alvo precisa alcançar quando Provocar manda testar Vontade.
            </p>
          </PremiumCard>
        </div>

        <DetalhesClasse classe={classe} />
      </div>
    </div>
  );
};

export default Guardiao;

