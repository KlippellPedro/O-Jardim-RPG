import { motion } from 'framer-motion';
import { ShieldAlert, Fingerprint, RefreshCcw } from 'lucide-react';
import type { IClasse } from '../../types/catalogo';
import { PremiumCard } from '../components/premium/PremiumCard';
import { DetalhesClasse } from '../../pages/Regras/components/DetalhesClasse';
import { obterTemaPorId } from '../themeMap';

export const Interceptador = ({ classe }: { classe: IClasse }) => {
  const tema = obterTemaPorId(classe.id);

  return (
    <div className="min-h-screen text-red-50 p-8 selection:bg-red-500/30 overflow-hidden relative">
      {/* 3D WebGL Background */}
      <div className="fixed inset-0 z-0 bg-cover bg-center bg-no-repeat opacity-20 pointer-events-none" style={{ backgroundImage: "url('/assets/img/interceptador_bg.jpg')" }} />

      {/* Firewall / Counter Background Effects */}
      <div className="fixed inset-0 pointer-events-none z-0">
        <div className="absolute top-[20%] left-[20%] w-[60%] h-[60%] bg-red-900/20 blur-[150px] mix-blend-screen" />
        
        {/* Hex Shield stopping things */}
        <motion.div 
          className="absolute right-0 top-0 bottom-0 w-[200px] border-l-4 border-red-500/30 bg-red-900/10"
          animate={{ opacity: [0.1, 0.4, 0.1] }}
          transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
        />
        
        {/* Incoming attacks intercepted */}
        {[...Array(5)].map((_, i) => (
          <motion.div
            key={i}
            className="absolute h-1 w-20 bg-orange-500"
            style={{
              top: `${Math.random() * 80 + 10}%`,
              right: '-10%',
            }}
            animate={{
              x: [-1000, -200],
              opacity: [0, 1, 0],
            }}
            transition={{
              duration: 1,
              repeat: Infinity,
              repeatDelay: Math.random() * 3 + 1
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
            className={`w-28 h-28 mx-auto ${tema.bg} ${tema.border} rounded-md flex items-center justify-center mb-8 shadow-2xl relative backdrop-blur-md`}
          >
            <ShieldAlert size={48} className={`${tema.icon} z-10`} strokeWidth={1.5} />
          </motion.div>

          <motion.div className="overflow-hidden">
             <motion.h1 
                initial={{ y: "100%" }}
                animate={{ y: 0 }}
                transition={{ duration: 0.8, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
                className={`text-7xl font-mono font-bold tracking-tight ${tema.text} mb-6 uppercase`}
                style={{ fontFamily: 'Cinzel, serif' }}
             >
               Interceptador
             </motion.h1>
          </motion.div>
          <motion.p 
             initial={{ opacity: 0 }}
             animate={{ opacity: 1 }}
             transition={{ duration: 1, delay: 0.6 }}
             className="text-lg text-red-200/60 max-w-2xl mx-auto font-mono leading-relaxed"
          >
            A dor de cabeça de qualquer mago. Especialistas em contra-medidas que hackeiam feitiços enquanto estão sendo formados, desviando sua trajetória ou roubando os privilégios da magia inimiga.
          </motion.p>
        </motion.header>

        {/* Traits Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-24 font-mono">
          <PremiumCard
            glowColor={tema.glow}
            initial={{ opacity: 0, scale: 0.95 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.4 }}
            className={`flex flex-col p-8 ${tema.bg} ${tema.border} backdrop-blur-md`}
          >
            <RefreshCcw size={36} className={`${tema.icon} mb-4`} strokeWidth={1.5} />
            <h3 className={`text-2xl font-bold ${tema.text} mb-2 uppercase`} style={{ fontFamily: 'Cinzel, serif' }}>Hackear Fluxo</h3>
            <p className="text-red-200/60 leading-relaxed text-sm">
              Use sua Reação e gaste 4 Mana quando um inimigo lançar um feitiço visível. Role um teste de contramágica; se passar, você cancela completamente o efeito do feitiço e o inimigo perde a Mana gasta.
            </p>
          </PremiumCard>

          <PremiumCard
            glowColor={tema.glow}
            initial={{ opacity: 0, scale: 0.95 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.4, delay: 0.2 }}
            className={`flex flex-col p-8 ${tema.bg} ${tema.border} backdrop-blur-md`}
          >
            <Fingerprint size={36} className={`${tema.icon} mb-4`} strokeWidth={1.5} />
            <h3 className={`text-2xl font-bold ${tema.text} mb-2 uppercase`} style={{ fontFamily: 'Cinzel, serif' }}>Acesso Administrador</h3>
            <p className="text-red-200/60 leading-relaxed text-sm">
              Uma vez por sessão, por três rodadas, você obtém privilégios totais sobre a Malha: recebe +4 em suas interceptações e reduz o custo delas em 2 Mana, até o mínimo de 1.
            </p>
          </PremiumCard>
        </div>

        <DetalhesClasse classe={classe} />
      </div>
    </div>
  );
};

export default Interceptador;

