import { motion } from 'framer-motion';
import { Box, ScanLine, BrainCog } from 'lucide-react';
import type { IRaca } from '../../types/catalogo';
import { PremiumCard } from '../components/premium/PremiumCard';
import { EscolhaRacialCards } from '../components/premium/EscolhaRacialCards';
import { EstagiosRaciais } from '../components/premium/EstagiosRaciais';
import { obterTemaPorId } from '../themeMap';

export const Auleth = ({ raca }: { raca: IRaca }) => {
  const tema = obterTemaPorId(raca.id);
  return (
    <div className="min-h-screen text-indigo-50 p-8 selection:bg-indigo-500/30 overflow-hidden relative">
      {/* Cosmic Ethereal Background */}
      <div 
        className="fixed inset-0 z-0 bg-cover bg-center bg-no-repeat bg-[#020512]"
        style={{ backgroundImage: "url('/assets/img/auleth_bg.webp')" }}
      >
        <div className="absolute inset-0 bg-slate-950/70 mix-blend-multiply" />
        <div className="absolute inset-0 bg-gradient-to-b from-[#020512]/40 via-transparent to-[#020512]/90" />
      </div>

      {/* Alien / Geometric Background Effects */}
      <div className="fixed inset-0 pointer-events-none z-0">
        <div className="absolute top-[20%] left-[30%] w-[40%] h-[40%] bg-indigo-900/20 blur-[150px] rounded-full mix-blend-screen" />
        
        {/* Shifting Geometry */}
        <motion.div 
          className="absolute border border-indigo-500/20"
          style={{ top: '40%', left: '50%', x: '-50%', y: '-50%' }}
          animate={{ 
            width: [100, 300, 50, 100], 
            height: [100, 50, 300, 100],
            rotate: [0, 90, 180, 360],
            borderRadius: ["0%", "50%", "20%", "0%"]
          }}
          transition={{ duration: 20, repeat: Infinity, ease: "easeInOut" }}
        />
        <motion.div 
          className="absolute border border-indigo-400/10"
          style={{ top: '40%', left: '50%', x: '-50%', y: '-50%' }}
          animate={{ 
            width: [300, 100, 200, 300], 
            height: [50, 200, 50, 50],
            rotate: [360, 180, 90, 0],
            borderRadius: ["50%", "0%", "30%", "50%"]
          }}
          transition={{ duration: 15, repeat: Infinity, ease: "easeInOut" }}
        />
      </div>

      <div className="max-w-5xl mx-auto relative z-10 pt-16">
        {/* Header */}
        <motion.header 
          initial={{ opacity: 0, scale: 1.1 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 1, ease: "easeOut" }}
          className="text-center mb-24"
        >
          <motion.div 
            className={`w-28 h-28 mx-auto ${tema.bg} border-2 ${tema.border} flex items-center justify-center mb-8 backdrop-blur-md relative overflow-hidden`}
            animate={{ 
              borderRadius: ["0%", "50%", "0%"],
              rotate: [0, 90, 180]
            }}
            transition={{ duration: 8, repeat: Infinity, ease: "linear" }}
          >
            <motion.div animate={{ rotate: [-0, -90, -180] }} transition={{ duration: 8, repeat: Infinity, ease: "linear" }}>
              <Box size={40} className={`${tema.icon} z-10`} strokeWidth={1} />
            </motion.div>
          </motion.div>

          <motion.div className="overflow-hidden">
             <motion.h1 
                initial={{ y: "100%" }}
                animate={{ y: 0 }}
                transition={{ duration: 0.8, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
                className={`text-7xl font-light tracking-widest ${tema.text} mb-6 uppercase`}
                style={{ fontFamily: 'Cinzel, serif' }}
             >
               Auleth
             </motion.h1>
          </motion.div>
          <motion.p 
             initial={{ opacity: 0 }}
             animate={{ opacity: 1 }}
             transition={{ duration: 1, delay: 0.6 }}
             className="text-lg text-indigo-200/60 max-w-2xl mx-auto font-light leading-relaxed"
          >
            Consciência vinda do espaço ou de outra dimensão, presa numa forma física que ela mesma escolhe manter fluida. Muda de tamanho e de rosto quando quer, sabe mais que qualquer especialista sobre as duas áreas que escolheu estudar, e simplesmente não entende por que os outros se importam tanto com sentimento.
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
            className={`flex gap-6 p-8 ${tema.bg} border ${tema.border} backdrop-blur-md`}
          >
            <Box size={32} className={`${tema.icon} shrink-0`} strokeWidth={1.5} />
            <div>
              <h3 className={`text-2xl font-light ${tema.text} mb-3`} style={{ fontFamily: 'Cinzel, serif' }}>Forma Sem Molde</h3>
              <p className="text-indigo-200/60 leading-relaxed text-sm font-light">
                Altere livremente sua aparência, voz e tamanho entre Minúsculo, Pequeno, Normal, Grande ou Enorme gastando ação e Movimento. A massa se condensa e se rarefaz, mantendo os mesmos atributos e a mesma Vida da forma original.
              </p>
            </div>
          </PremiumCard>

          <PremiumCard
            glowColor={tema.glow}
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className={`flex gap-6 p-8 ${tema.bg} border ${tema.border} backdrop-blur-md`}
          >
            <BrainCog size={32} className={`${tema.icon} shrink-0`} strokeWidth={1.5} />
            <div>
              <h3 className={`text-2xl font-light ${tema.text} mb-3`} style={{ fontFamily: 'Cinzel, serif' }}>Conhecimentos Extremos</h3>
              <p className="text-indigo-200/60 leading-relaxed text-sm font-light">
                Escolha duas áreas de estudo ultra-específicas. Receba vantagem sempre que testar Conhecimento/Investigação sobre elas e uma rerrolagem por sessão para cada área em caso de falha.
              </p>
            </div>
          </PremiumCard>

          <PremiumCard
            glowColor={tema.glow}
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.4 }}
            className={`col-span-1 md:col-span-2 flex gap-6 p-8 ${tema.bg} border ${tema.border} backdrop-blur-md`}
          >
            <ScanLine size={32} className={`${tema.icon} shrink-0`} strokeWidth={1.5} />
            <div>
              <h3 className={`text-2xl font-light ${tema.text} mb-3`} style={{ fontFamily: 'Cinzel, serif' }}>Emoção Distante</h3>
              <p className="text-indigo-200/60 leading-relaxed text-sm font-light">
                Fisiologia imune a doenças (porém suscetível a venenos que simulem sintomas). Além de sofrer -3 em Carisma, sofre desvantagem em Intuição e Diplomacia para consolar alguém ou entender o que a pessoa está sentindo. Sentimento continua sendo o problema que ele não consegue resolver.
              </p>
            </div>
          </PremiumCard>
        </div>

        <EstagiosRaciais
          raca={raca}
          tema={tema}
          titulo="Reconstituição"
          descricao="O Auleth chega aqui incompleto e vai se remontando com o tempo. Os degraus abrem por nível total, sem custo nenhum, e cada um devolve um pedaço do que tinha ficado do outro lado."
        />

        <EscolhaRacialCards raca={raca} tema={tema} />
      </div>
    </div>
  );
};

export default Auleth;
