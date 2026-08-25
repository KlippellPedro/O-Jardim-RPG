import { motion } from 'framer-motion';
import { Dices, Spade, Diamond, Layers, Gauge } from 'lucide-react';
import type { IClasse } from '../../types/catalogo';
import { PremiumCard } from '../components/premium/PremiumCard';
import { DetalhesClasse } from '../../pages/Regras/components/DetalhesClasse';
import { obterTemaPorId } from '../themeMap';

export const CartistaArcano = ({ classe }: { classe: IClasse }) => {
  const tema = obterTemaPorId(classe.id);

  return (
    <div className={`min-h-screen ${tema.text} p-8 selection:bg-amber-500/30 overflow-hidden relative`}>
      {/* 3D WebGL Background */}
      <div className="fixed inset-0 z-0 bg-cover bg-center bg-no-repeat opacity-20 pointer-events-none" style={{ backgroundImage: "url('/assets/img/cartistaarcano_bg.webp')" }} />

      {/* Magic Cards / Casino Background Effects */}
      <div className="fixed inset-0 pointer-events-none z-0">
        <div className="absolute top-[20%] right-[30%] w-[40%] h-[40%] bg-amber-900/20 blur-[150px] mix-blend-screen" />
        
        {/* Floating cards */}
        {[...Array(6)].map((_, i) => (
          <motion.div
            key={i}
            className="absolute bg-white/5 border border-amber-500/20 rounded-md backdrop-blur-sm"
            style={{
              width: 60,
              height: 90,
              left: `${Math.random() * 80 + 10}%`,
              top: `${Math.random() * 80 + 10}%`,
            }}
            animate={{
              y: [0, -30, 0],
              rotateY: [0, 180, 360],
              rotateZ: [i * 10, i * 10 + 20, i * 10],
            }}
            transition={{
              duration: Math.random() * 4 + 4,
              repeat: Infinity,
              ease: "linear",
            }}
          >
            {i % 2 === 0 ? <Spade size={20} className={`${tema.icon} m-2`} /> : <Diamond size={20} className={`${tema.icon} m-2`} />}
          </motion.div>
        ))}
      </div>

      <div className="max-w-5xl mx-auto relative z-10 pt-16">
        {/* Header */}
        <motion.header 
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="text-center mb-24"
        >
          <motion.div 
            className={`w-28 h-28 mx-auto ${tema.bg} border-2 ${tema.border} rounded-lg flex items-center justify-center mb-8 relative overflow-hidden backdrop-blur-md`}
            style={{ boxShadow: `0 0 40px ${tema.glow}` }}
          >
            <motion.div 
              className="absolute inset-0 bg-gradient-to-br from-amber-500/20 to-transparent"
              animate={{ rotate: 360 }}
              transition={{ duration: 10, repeat: Infinity, ease: "linear" }}
            />
            <Dices size={48} className={`${tema.icon} z-10`} strokeWidth={1.5} />
          </motion.div>

          <motion.div className="overflow-hidden">
             <motion.h1 
                initial={{ y: "100%" }}
                animate={{ y: 0 }}
                transition={{ duration: 0.8, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
                className={`text-7xl font-bold tracking-tight ${tema.text} mb-6 uppercase`}
                style={{ fontFamily: 'Cinzel, serif' }}
             >
               Cartista Arcano
             </motion.h1>
          </motion.div>
          <motion.p 
             initial={{ opacity: 0 }}
             animate={{ opacity: 1 }}
             transition={{ duration: 1, delay: 0.6 }}
             className={`text-lg ${tema.tag} opacity-80 max-w-2xl mx-auto font-medium leading-relaxed`}
          >
            Eles não jogam com o destino, eles o subornam. Suas magias estão presas em baralhos afiados e eles distorcem a própria probabilidade do mundo para garantir que a casa sempre ganhe.
          </motion.p>
        </motion.header>

        {/* Traits Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 mb-24">
          <PremiumCard
            glowColor={tema.glow}
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className={`flex flex-col p-8 rounded-xl ${tema.bg} border ${tema.border} backdrop-blur-md`}
          >
            <Layers size={36} className={`${tema.icon} mb-4`} strokeWidth={1.5} />
            <h3 className={`text-2xl font-bold ${tema.text} mb-2 uppercase tracking-wide`} style={{ fontFamily: 'Cinzel, serif' }}>Baralho Arcano</h3>
            <p className="text-amber-200/60 leading-relaxed text-sm">
              O conceito central da classe: você conjura por cartas preparadas de antemão, não por magia solta. Cada estágio ensina mais uma magia do seu Fluxo nativo, e no auge você joga duas cartas por turno, a primeira sem custar Mana.
            </p>
          </PremiumCard>

          <PremiumCard
            glowColor={tema.glow}
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className={`flex flex-col p-8 rounded-xl ${tema.bg} border ${tema.border} backdrop-blur-md`}
          >
            <Spade size={36} className={`${tema.icon} mb-4`} strokeWidth={1.5} />
            <h3 className={`text-2xl font-bold ${tema.text} mb-2 uppercase tracking-wide`} style={{ fontFamily: 'Cinzel, serif' }}>Cartas Afiadas</h3>
            <p className="text-amber-200/60 leading-relaxed text-sm">
              Use as cartas de um baralho comum infundidas com Fluxo como armas de arremesso letais, e aprenda um Naipe Arcano por estágio: Espadas ignora Resistência, Copas cura de raspão, Ouros empurra e Paus queima. Todo naipe aprendido fica disponível pra escolher a cada arremesso.
            </p>
          </PremiumCard>

          <PremiumCard
            glowColor={tema.glow}
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.4 }}
            className={`flex flex-col p-8 rounded-xl ${tema.bg} border ${tema.border} backdrop-blur-md`}
          >
            <Dices size={36} className={`${tema.icon} mb-4`} strokeWidth={1.5} />
            <h3 className={`text-2xl font-bold ${tema.text} mb-2 uppercase tracking-wide`} style={{ fontFamily: 'Cinzel, serif' }}>Dados Viciados</h3>
            <p className="text-amber-200/60 leading-relaxed text-sm">
              O mestre do acaso. Uma vez por sessão, depois de ver uma rolagem de d20, substitua o dado por um 10 natural antes de aplicar os modificadores. Não escolhe crítico, desastre ou qualquer outro resultado arbitrário.
            </p>
          </PremiumCard>

          <PremiumCard
            glowColor={tema.glow}
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.6 }}
            className={`flex flex-col p-8 rounded-xl ${tema.bg} border ${tema.border} backdrop-blur-md`}
          >
            <Gauge size={36} className={`${tema.icon} mb-4`} strokeWidth={1.5} />
            <h3 className={`text-2xl font-bold ${tema.text} mb-2 uppercase tracking-wide`} style={{ fontFamily: 'Cinzel, serif' }}>Sobre a DT</h3>
            <p className="text-amber-200/60 leading-relaxed text-sm">
              Todo efeito seu que obriga um alvo a resistir rola Misticismo no momento em que aciona: o resultado vira a DT que ele precisa alcançar. É diferente da DT de conjuração normal (7 + 3 × o círculo da magia), que já vale sozinha pra toda magia que você lança.
            </p>
          </PremiumCard>
        </div>

        <DetalhesClasse classe={classe} />
      </div>
    </div>
  );
};

export default CartistaArcano;

