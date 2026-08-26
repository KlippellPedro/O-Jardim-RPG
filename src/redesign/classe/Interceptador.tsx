import { motion } from 'framer-motion';
import { ShieldAlert, Fingerprint, RefreshCcw, Radar, Gauge } from 'lucide-react';
import type { IClasse } from '../../types/catalogo';
import { PremiumCard } from '../components/premium/PremiumCard';
import { DetalhesClasse } from '../../pages/Regras/components/DetalhesClasse';
import { obterTemaPorId } from '../themeMap';

export const Interceptador = ({ classe }: { classe: IClasse }) => {
  const tema = obterTemaPorId(classe.id);

  return (
    <div className="min-h-screen text-red-50 p-8 selection:bg-red-500/30 overflow-hidden relative">
      {/* 3D WebGL Background */}
      <div className="fixed inset-0 z-0 bg-cover bg-center bg-no-repeat opacity-20 pointer-events-none" style={{ backgroundImage: "url('/assets/img/interceptador_bg.webp')" }} />

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
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 mb-24 font-mono">
          <PremiumCard
            glowColor={tema.glow}
            initial={{ opacity: 0, scale: 0.95 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.4 }}
            className={`flex flex-col p-8 ${tema.bg} ${tema.border} backdrop-blur-md`}
          >
            <Radar size={36} className={`${tema.icon} mb-4`} strokeWidth={1.5} />
            <h3 className={`text-2xl font-bold ${tema.text} mb-2 uppercase`} style={{ fontFamily: 'Cinzel, serif' }}>Acesso à Malha</h3>
            <p className="text-red-200/60 leading-relaxed text-sm">
              O radar do Interceptador: detecta conjurações naturais a 12 m, depois lê círculo, Fluxo e alvo sem esforço, ganha bônus fixo pra interceptar, dobra o alcance de detecção e, no fim da carreira, arranca a DT e o efeito completo de qualquer magia que perceber antes dela nem terminar de ser lançada.
            </p>
          </PremiumCard>

          <PremiumCard
            glowColor={tema.glow}
            initial={{ opacity: 0, scale: 0.95 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.4, delay: 0.15 }}
            className={`flex flex-col p-8 ${tema.bg} ${tema.border} backdrop-blur-md`}
          >
            <RefreshCcw size={36} className={`${tema.icon} mb-4`} strokeWidth={1.5} />
            <h3 className={`text-2xl font-bold ${tema.text} mb-2 uppercase`} style={{ fontFamily: 'Cinzel, serif' }}>Hackear Fluxo</h3>
            <p className="text-red-200/60 leading-relaxed text-sm">
              Interceptar com sucesso já cancela o efeito, de graça. Aprenda uma técnica por estágio pra fazer mais que isso: são seis possíveis (Atrasar, Redirecionar, Isolar, Assinatura Falsa, Eco Hostil, Núcleo Exposto) e você aprende quatro, escolhendo qual aplicar a cada interceptação bem-sucedida.
            </p>
          </PremiumCard>

          <PremiumCard
            glowColor={tema.glow}
            initial={{ opacity: 0, scale: 0.95 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.4, delay: 0.3 }}
            className={`flex flex-col p-8 ${tema.bg} ${tema.border} backdrop-blur-md`}
          >
            <Fingerprint size={36} className={`${tema.icon} mb-4`} strokeWidth={1.5} />
            <h3 className={`text-2xl font-bold ${tema.text} mb-2 uppercase`} style={{ fontFamily: 'Cinzel, serif' }}>Acesso Administrador</h3>
            <p className="text-red-200/60 leading-relaxed text-sm">
              Uma vez por sessão, por três rodadas, você obtém privilégios totais sobre a Malha: +5 em interceptações, custo reduzido em 3 de Mana, uma interceptação por turno sem gastar Reação, e dá pra aplicar duas técnicas de Hackear Fluxo na mesma interceptação em vez de uma só.
            </p>
          </PremiumCard>

          <PremiumCard
            glowColor={tema.glow}
            initial={{ opacity: 0, scale: 0.95 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.4, delay: 0.45 }}
            className={`flex flex-col p-8 ${tema.bg} ${tema.border} backdrop-blur-md`}
          >
            <Gauge size={36} className={`${tema.icon} mb-4`} strokeWidth={1.5} />
            <h3 className={`text-2xl font-bold ${tema.text} mb-2 uppercase`} style={{ fontFamily: 'Cinzel, serif' }}>Sobre a DT</h3>
            <p className="text-red-200/60 leading-relaxed text-sm">
              Todo efeito seu que obriga um alvo a resistir rola Misticismo no momento em que aciona: o resultado vira a DT que ele precisa alcançar. Interceptar é diferente - você rola contra a DT de conjuração que a própria magia já tem.
            </p>
          </PremiumCard>
        </div>

        <DetalhesClasse classe={classe} />
      </div>
    </div>
  );
};

export default Interceptador;

