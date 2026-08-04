import { motion } from 'framer-motion';
import { Hexagon, PawPrint } from 'lucide-react';
import type { IClasse } from '../../types/catalogo';
import { PremiumCard } from '../components/premium/PremiumCard';
import { DetalhesClasse } from '../../pages/Regras/components/DetalhesClasse';
import { obterTemaPorId } from '../themeMap';

export const Invocador = ({ classe }: { classe: IClasse }) => {
  const tema = obterTemaPorId(classe.id);

  return (
    <div className="min-h-screen text-indigo-50 p-8 selection:bg-indigo-500/30 overflow-hidden relative">
      {/* 3D WebGL Background */}
      <div className="fixed inset-0 z-0 bg-cover bg-center bg-no-repeat opacity-20 pointer-events-none" style={{ backgroundImage: "url('/assets/img/invocador_bg.jpg')" }} />

      {/* Summoning Circles Background Effects */}
      <div className="fixed inset-0 pointer-events-none z-0">
        <div className="absolute top-[30%] left-[30%] w-[40%] h-[40%] bg-indigo-900/20 blur-[150px] mix-blend-screen" />
        
        {/* Giant rotating summoning circle */}
        <motion.div 
          className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAwIiBoZWlnaHQ9IjYwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48Y2lyY2xlIGN4PSIzMDAiIGN5PSIzMDAiIHI9IjI1MCIgZmlsbD0ibm9uZSIgc3Ryb2tlPSJyZ2JhKDk5LCAxMDIsIDI0MSwgMC4xKSIgc3Ryb2tlLXdpZHRoPSIyIi8+PHBvbHlnb24gcG9pbnRzPSIzMDAsNTAgNTUwLDQ1MCA1MCw0NTAiIGZpbGw9Im5vbmUiIHN0cm9rZT0icmdiYSg5OSwgMTAyLCAyNDEsIDAuMSkiIHN0cm9rZS13aWR0aD0iMSIvPjwvc3ZnPg==')] bg-center bg-no-repeat opacity-30"
          animate={{ rotate: 360 }}
          transition={{ duration: 60, repeat: Infinity, ease: "linear" }}
        />
      </div>

      <div className="max-w-5xl mx-auto relative z-10 pt-16">
        {/* Header */}
        <motion.header 
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.6 }}
          className="text-center mb-24"
        >
          <motion.div 
            className={`w-28 h-28 mx-auto ${tema.bg} ${tema.border} rounded-full flex items-center justify-center mb-8 shadow-2xl relative backdrop-blur-md`}
          >
            <Hexagon size={48} className={`${tema.icon} z-10`} strokeWidth={1.5} />
            <motion.div 
              className="absolute inset-0 border border-indigo-400/50 rounded-full"
              animate={{ scale: [1, 1.2, 1], opacity: [1, 0, 1] }}
              transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
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
               Invocador
             </motion.h1>
          </motion.div>
          <motion.p 
             initial={{ opacity: 0 }}
             animate={{ opacity: 1 }}
             transition={{ duration: 1, delay: 0.6 }}
             className="text-lg text-indigo-200/60 max-w-2xl mx-auto font-medium leading-relaxed"
          >
            A força não está no que eles podem fazer, mas no que eles trazem. Ligados por pactos absolutos de mana, os Invocadores chamam feras, guardiões e construtos para batalhar em seu nome.
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
            className={`flex flex-col p-8 rounded-lg ${tema.bg} ${tema.border} backdrop-blur-md`}
          >
            <PawPrint size={36} className={`${tema.icon} mb-4`} strokeWidth={1.5} />
            <h3 className={`text-2xl font-bold ${tema.text} mb-2 uppercase`} style={{ fontFamily: 'Cinzel, serif' }}>Formas Vinculadas</h3>
            <p className="text-indigo-200/60 leading-relaxed text-sm">
              Através do Pacto de Fluxo, você aprende uma forma vinculada por estágio: fera, guardião, espírito ou broto curador. Mantém apenas uma manifestação ativa por vez, agindo com sua ação de movimento. Em nível avançado, pode manter duas formas preparadas, mas ainda manifesta uma de cada vez; a exceção é uma vez por sessão, quando manifesta as duas ao mesmo tempo por três rodadas.
            </p>
          </PremiumCard>

          <PremiumCard
            glowColor={tema.glow}
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.4, delay: 0.2 }}
            className={`flex flex-col p-8 rounded-lg ${tema.bg} ${tema.border} backdrop-blur-md`}
          >
            <Hexagon size={36} className={`${tema.icon} mb-4`} strokeWidth={1.5} />
            <h3 className={`text-2xl font-bold ${tema.text} mb-2 uppercase`} style={{ fontFamily: 'Cinzel, serif' }}>Círculo de Convocação</h3>
            <p className="text-indigo-200/60 leading-relaxed text-sm">
              Use uma ação para projetar o brilho místico de um círculo no chão sob você. Aliados e Invocadores aliados dentro dessa área recebem pequenas curas mágicas residuais e bônus em defesas mágicas enquanto permanecerem nela.
            </p>
          </PremiumCard>
        </div>

        <DetalhesClasse classe={classe} />
      </div>
    </div>
  );
};

export default Invocador;

