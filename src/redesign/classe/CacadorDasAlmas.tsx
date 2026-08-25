import { motion } from 'framer-motion';
import { Ghost, ShieldX, Eye, Gauge } from 'lucide-react';
import type { IClasse } from '../../types/catalogo';
import { PremiumCard } from '../components/premium/PremiumCard';
import { DetalhesClasse } from '../../pages/Regras/components/DetalhesClasse';
import { obterTemaPorId } from '../themeMap';

export const CacadorDasAlmas = ({ classe }: { classe: IClasse }) => {
  const tema = obterTemaPorId(classe.id);

  return (
    <div className={`min-h-screen ${tema.text} p-8 selection:bg-rose-500/30 overflow-hidden relative`}>
      {/* 3D WebGL Background */}
      <div className="fixed inset-0 z-0 bg-cover bg-center bg-no-repeat opacity-20 pointer-events-none" style={{ backgroundImage: "url('/assets/img/cacadordeentidades_bg.webp')" }} />

      {/* Exorcism / Banishing Background Effects */}
      <div className="fixed inset-0 pointer-events-none z-0">
        <div className="absolute top-[20%] left-[20%] w-[50%] h-[50%] bg-red-900/20 blur-[150px] mix-blend-screen" />
        
        {/* Banishing chains/seals */}
        {[...Array(3)].map((_, i) => (
          <motion.div
            key={i}
            className="absolute border border-red-500/10 rounded-full"
            style={{
              width: 400 + i * 100,
              height: 400 + i * 100,
              left: '50%',
              top: '50%',
              x: '-50%',
              y: '-50%',
            }}
            animate={{ rotate: i % 2 === 0 ? 360 : -360 }}
            transition={{ duration: 20 + i * 5, repeat: Infinity, ease: "linear" }}
          />
        ))}
      </div>

      <div className="max-w-5xl mx-auto relative z-10 pt-16">
        {/* Header */}
        <motion.header 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="text-center mb-24"
        >
          <motion.div 
            className={`w-28 h-28 mx-auto ${tema.bg} border-2 ${tema.border} rounded-lg flex items-center justify-center mb-8 relative backdrop-blur-md`}
            style={{ boxShadow: `0 0 40px ${tema.glow}` }}
          >
            <ShieldX size={48} className={`${tema.icon} z-10`} strokeWidth={1.5} />
          </motion.div>

          <motion.div className="overflow-hidden">
             <motion.h1 
                initial={{ y: "100%" }}
                animate={{ y: 0 }}
                transition={{ duration: 0.8, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
                className={`text-7xl font-bold tracking-tight ${tema.text} mb-6 uppercase`}
                style={{ fontFamily: 'Cinzel, serif' }}
             >
               Caçador das Almas
             </motion.h1>
          </motion.div>
          <motion.p
             initial={{ opacity: 0 }}
             animate={{ opacity: 1 }}
             transition={{ duration: 1, delay: 0.6 }}
             className={`text-lg ${tema.tag} opacity-80 max-w-2xl mx-auto font-medium leading-relaxed`}
          >
            Inquisidores implacáveis do oculto. Eles se especializam em caçar e suprimir o que ataca por dentro, barrando fuga incorpórea e expurgando possessões da alma alheia.
          </motion.p>
        </motion.header>

        {/* Traits Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 mb-24">
          <PremiumCard
            glowColor={tema.glow}
            initial={{ opacity: 0, scale: 0.95 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className={`flex flex-col p-8 rounded-none ${tema.bg} ${tema.border} backdrop-blur-md`}
          >
            <Eye size={36} className={`${tema.icon} mb-4`} strokeWidth={1.5} />
            <h3 className={`text-2xl font-bold ${tema.text} mb-2 uppercase tracking-wide`} style={{ fontFamily: 'Cinzel, serif' }}>Leitura da Alma</h3>
            <p className="text-slate-300 leading-relaxed text-sm">
              O conceito central da classe: perceba presença espiritual à distância e identifique possessão ou corrupção de cara. Com o tempo, causa mais dano contra possuidores, descobre a fraqueza deles ao estudar, e no auge marca um alvo pra queda de toda Resistência espiritual do grupo.
            </p>
          </PremiumCard>

          <PremiumCard
            glowColor={tema.glow}
            initial={{ opacity: 0, scale: 0.95 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className={`flex flex-col p-8 rounded-none ${tema.bg} ${tema.border} backdrop-blur-md`}
          >
            <ShieldX size={36} className={`${tema.icon} mb-4`} strokeWidth={1.5} />
            <h3 className={`text-2xl font-bold ${tema.text} mb-2 uppercase tracking-wide`} style={{ fontFamily: 'Cinzel, serif' }}>Selos de Contenção</h3>
            <p className="text-slate-300 leading-relaxed text-sm">
              Prepare um selo após cada descanso (mais um por estágio), e aprenda um Tipo de Selo por estágio: Silêncio cala o preso, Exaustão desgasta ele, Vigília avisa você a distância e Amplificado dobra a área. Aplicado em 3 m, o selo impede teleporte ou incorporeidade por uma rodada contra a sua DT.
            </p>
          </PremiumCard>

          <PremiumCard
            glowColor={tema.glow}
            initial={{ opacity: 0, scale: 0.95 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.4 }}
            className={`flex flex-col p-8 rounded-none ${tema.bg} ${tema.border} backdrop-blur-md`}
          >
            <Ghost size={36} className={`${tema.icon} mb-4`} strokeWidth={1.5} />
            <h3 className={`text-2xl font-bold ${tema.text} mb-2 uppercase tracking-wide`} style={{ fontFamily: 'Cinzel, serif' }}>Exorcismo</h3>
            <p className="text-slate-300 leading-relaxed text-sm">
              Uma vez por descanso longo, conduza um ritual de três rodadas e faça Misticismo contra a Vontade do possuidor para expulsar a possessão. Em caso de falha, ao menos a suprima por uma rodada.
            </p>
          </PremiumCard>

          <PremiumCard
            glowColor={tema.glow}
            initial={{ opacity: 0, scale: 0.95 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.6 }}
            className={`flex flex-col p-8 rounded-none ${tema.bg} ${tema.border} backdrop-blur-md`}
          >
            <Gauge size={36} className={`${tema.icon} mb-4`} strokeWidth={1.5} />
            <h3 className={`text-2xl font-bold ${tema.text} mb-2 uppercase tracking-wide`} style={{ fontFamily: 'Cinzel, serif' }}>Sobre a DT</h3>
            <p className="text-slate-300 leading-relaxed text-sm">
              Todo efeito seu que obriga um possuidor a resistir rola Misticismo no momento em que aciona: o resultado vira a DT que ele precisa alcançar.
            </p>
          </PremiumCard>
        </div>

        <DetalhesClasse classe={classe} />
      </div>
    </div>
  );
};

export default CacadorDasAlmas;

