import { motion } from 'framer-motion';
import { Target, Footprints, Scroll, BookOpen } from 'lucide-react';
import type { IClasse } from '../../types/catalogo';
import { PremiumCard } from '../components/premium/PremiumCard';
import { DetalhesClasse } from '../../pages/Regras/components/DetalhesClasse';
import { obterTemaPorId } from '../themeMap';

interface CacadorProps {
  classe: IClasse;
}

export const Cacador = ({ classe }: CacadorProps) => {
  const tema = obterTemaPorId(classe.id);

  return (
    <div className={`min-h-screen ${tema.text} p-8 selection:bg-lime-500/30 overflow-hidden relative`}>
      {/* 3D WebGL Background */}
      <div className="fixed inset-0 z-0 bg-cover bg-center bg-no-repeat opacity-20 pointer-events-none" style={{ backgroundImage: "url('/assets/img/cacador_bg.webp')" }} />

      {/* Wilderness / Tracker Background Effects */}
      <div className="fixed inset-0 pointer-events-none z-0">
        <div className="absolute top-[20%] right-[20%] w-[50%] h-[50%] bg-emerald-900/10 blur-[150px] mix-blend-screen" />
        
        {/* Subtle tracking footprints fading in and out */}
        {[...Array(5)].map((_, i) => (
          <motion.div
            key={i}
            className="absolute text-lime-900/20 rotate-45"
            style={{
              left: `${10 + i * 15}%`,
              bottom: `${10 + i * 15}%`,
            }}
            animate={{ opacity: [0, 0.4, 0] }}
            transition={{ duration: 4, delay: i * 0.8, repeat: Infinity }}
          >
            <Footprints size={40} />
          </motion.div>
        ))}
      </div>

      <div className="max-w-5xl mx-auto relative z-10 pt-16">
        {/* Header */}
        <motion.header 
          initial={{ opacity: 0, filter: 'blur(10px)' }}
          animate={{ opacity: 1, filter: 'blur(0px)' }}
          transition={{ duration: 0.6 }}
          className="text-center mb-24"
        >
          <motion.div 
            className={`w-28 h-28 mx-auto ${tema.bg} border-2 ${tema.border} rounded-full flex items-center justify-center mb-8 relative backdrop-blur-md`}
          >
            <Target size={48} className={`${tema.icon} z-10`} strokeWidth={1.5} />
            <motion.div 
              className={`absolute inset-0 border ${tema.border} rounded-full`}
              animate={{ scale: [1, 1.3], opacity: [1, 0] }}
              transition={{ duration: 2, repeat: Infinity }}
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
               Caçador
             </motion.h1>
          </motion.div>
          <motion.p 
             initial={{ opacity: 0 }}
             animate={{ opacity: 1 }}
             transition={{ duration: 1, delay: 0.6 }}
             className={`text-lg ${tema.tag} opacity-80 max-w-2xl mx-auto font-medium leading-relaxed`}
          >
            Ligados à Guilda e financiados pelo perigo. Caçadores escolhem suas presas, mapeiam fraquezas e não descansam até que o contrato seja executado e a recompensa, coletada.
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
            className={`flex flex-col p-8 rounded-lg ${tema.bg} ${tema.border} backdrop-blur-md`}
          >
            <BookOpen size={36} className={`${tema.icon} mb-4`} strokeWidth={1.5} />
            <h3 className={`text-2xl font-bold ${tema.text} mb-2 uppercase tracking-wide`} style={{ fontFamily: 'Cinzel, serif' }}>Especialização</h3>
            <p className="text-slate-300 leading-relaxed text-sm">
              O conceito central da classe: você estuda categorias amplas de presas e cresce pela informação, não por bônus universais. Escolha uma categoria de criatura e receba vantagem para rastreá-la e +1 no primeiro ataque contra ela por cena. Com o tempo, você acumula mais categorias, causa dano extra contra elas, revela fraquezas conhecidas e, no auge, trata uma criatura já derrotada como especializada por uma cena.
            </p>
          </PremiumCard>

          <PremiumCard
            glowColor={tema.glow}
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className={`flex flex-col p-8 rounded-lg ${tema.bg} ${tema.border} backdrop-blur-md`}
          >
            <Target size={36} className={`${tema.icon} mb-4`} strokeWidth={1.5} />
            <h3 className={`text-2xl font-bold ${tema.text} mb-2 uppercase tracking-wide`} style={{ fontFamily: 'Cinzel, serif' }}>Marca do Caçador</h3>
            <p className="text-slate-300 leading-relaxed text-sm">
              Uma vez por combate, marque uma presa por três rodadas: receba +3 m de Movimento ao persegui-la, Resistência 3 contra o dano dela e +2 em testes físicos contra ela.
            </p>
          </PremiumCard>

          <PremiumCard
            glowColor={tema.glow}
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.4 }}
            className={`flex flex-col p-8 rounded-lg ${tema.bg} ${tema.border} backdrop-blur-md`}
          >
            <Scroll size={36} className={`${tema.icon} mb-4`} strokeWidth={1.5} />
            <h3 className={`text-2xl font-bold ${tema.text} mb-2 uppercase tracking-wide`} style={{ fontFamily: 'Cinzel, serif' }}>Agência dos Caçadores</h3>
            <p className="text-slate-300 leading-relaxed text-sm">
              Você tem um registro na Guilda. A cada estágio, escolha um benefício: contratos exclusivos de monstros procurados, +10% no valor narrativo de troféus, apoio logístico uma vez por sessão, acesso a arquivos de criaturas ou bases seguras da Guilda espalhadas pelas cidades para descanso e reabastecimento sem custo.
            </p>
          </PremiumCard>
        </div>

        <DetalhesClasse classe={classe} />
      </div>
    </div>
  );
};

export default Cacador;

