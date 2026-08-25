import { motion } from 'framer-motion';
import { ArrowUp, Crown, Zap, Gauge } from 'lucide-react';
import type { IClasse } from '../../types/catalogo';
import { PremiumCard } from '../components/premium/PremiumCard';
import { DetalhesClasse } from '../../pages/Regras/components/DetalhesClasse';
import { obterTemaPorId } from '../themeMap';

export const CampeaoDimensional = ({ classe }: { classe: IClasse }) => {
  const tema = obterTemaPorId(classe.id);

  return (
    <div className={`min-h-screen ${tema.text} p-8 selection:bg-fuchsia-500/30 overflow-hidden relative`}>
      {/* 3D WebGL Background */}
      <div className="fixed inset-0 z-0 bg-cover bg-center bg-no-repeat opacity-20 pointer-events-none" style={{ backgroundImage: "url('/assets/img/campeaodimensional_bg.webp')" }} />

      {/* OP Brute / Cosmic Energy Background Effects */}
      <div className="fixed inset-0 pointer-events-none z-0">
        <div className="absolute top-[50%] left-[50%] -translate-x-1/2 -translate-y-1/2 w-[60%] h-[60%] bg-fuchsia-900/20 blur-[150px] rounded-full mix-blend-screen" />
        
        {/* Tremor effect mimicking raw power */}
        <motion.div 
          className="absolute inset-0 bg-transparent border-[20px] border-fuchsia-900/5"
          animate={{ x: [-2, 2, -1, 1, 0], y: [-1, 1, -2, 2, 0] }}
          transition={{ duration: 0.2, repeat: Infinity, repeatDelay: 5 }}
        />
        
        {/* Rising power particles */}
        {[...Array(15)].map((_, i) => (
          <motion.div
            key={i}
            className="absolute w-2 h-10 bg-gradient-to-t from-fuchsia-600 to-transparent rounded-full blur-[1px]"
            style={{ left: `${Math.random() * 100}%`, bottom: '-10%' }}
            animate={{ y: -1000, opacity: [0, 1, 0] }}
            transition={{
              duration: Math.random() * 2 + 1,
              repeat: Infinity,
              ease: "easeIn",
              delay: Math.random() * 2
            }}
          />
        ))}
      </div>

      <div className="max-w-5xl mx-auto relative z-10 pt-16">
        {/* Header */}
        <motion.header 
          initial={{ opacity: 0, scale: 1.1 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.6, type: "spring", stiffness: 100 }}
          className="text-center mb-24"
        >
          <motion.div 
            className={`w-32 h-32 mx-auto ${tema.bg} border-4 ${tema.border} rounded-lg flex items-center justify-center mb-8 relative overflow-hidden backdrop-blur-md`}
            style={{ boxShadow: `0 0 50px ${tema.glow}` }}
          >
            <motion.div 
              className={`absolute inset-0 ${tema.bg}`}
              style={{ backgroundColor: tema.primary + '30' }}
              animate={{ opacity: [0.2, 0.6, 0.2] }}
              transition={{ duration: 2, repeat: Infinity }}
            />
            <Crown size={56} className={`${tema.icon} z-10`} strokeWidth={2} />
          </motion.div>

          <motion.div className="overflow-hidden">
             <motion.h1 
                initial={{ y: "100%" }}
                animate={{ y: 0 }}
                transition={{ duration: 0.8, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
                className={`text-7xl font-black tracking-tight ${tema.text} mb-6 uppercase italic`}
                style={{ fontFamily: 'Cinzel, serif' }}
             >
               Campeão Dimensional
             </motion.h1>
          </motion.div>
          <motion.p 
             initial={{ opacity: 0 }}
             animate={{ opacity: 1 }}
             transition={{ duration: 1, delay: 0.6 }}
             className={`text-lg ${tema.tag} opacity-80 max-w-2xl mx-auto font-medium leading-relaxed`}
          >
            Uma força da natureza encarnada em músculos. Ignorando as leis físicas mortais, eles são colossos que estraçalham montanhas, rasgam feitiços com as mãos e redefinem o limite dos atributos de combate.
          </motion.p>
        </motion.header>

        {/* Traits Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-24">
          <PremiumCard
            glowColor={tema.glow}
            initial={{ opacity: 0, y: 40 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.4 }}
            className={`flex flex-col items-center text-center p-8 rounded-xl ${tema.bg} ${tema.border} backdrop-blur-md`}
          >
            <ArrowUp size={40} className={`${tema.icon} mb-4`} strokeWidth={2} />
            <h3 className={`text-xl font-bold ${tema.text} mb-2 uppercase`} style={{ fontFamily: 'Cinzel, serif' }}>Além do Comum</h3>
            <p className="text-slate-300 leading-relaxed text-sm">
              Você ultrapassa os mortais, mas com limites. A cada estágio, escolha Força, Destreza ou Constituição: o atributo escolhido recebe +1, até um máximo de +2 no mesmo atributo, nunca todos ao mesmo tempo.
            </p>
          </PremiumCard>

          <PremiumCard
            glowColor={tema.glow}
            initial={{ opacity: 0, y: 40 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.4, delay: 0.1 }}
            className={`flex flex-col items-center text-center p-8 rounded-xl ${tema.bg} ${tema.border} backdrop-blur-md`}
          >
            <Crown size={40} className={`${tema.icon} mb-4`} strokeWidth={2} />
            <h3 className={`text-xl font-bold ${tema.text} mb-2 uppercase`} style={{ fontFamily: 'Cinzel, serif' }}>Número 1</h3>
            <p className="text-slate-300 leading-relaxed text-sm">
              Você carrega o título. Receba +2 em testes físicos, vantagem contra Cansaço e quedas, e +2 em Diplomacia ou Intimidação diante de quem reconhece seu nome. Em estágios mais altos, você resiste a golpes repetidos do mesmo tipo, arranca um ataque extra ao derrubar um inimigo e, no auge, recusa a morte uma vez por sessão.
            </p>
          </PremiumCard>

          <PremiumCard
            glowColor={tema.glow}
            initial={{ opacity: 0, y: 40 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.4, delay: 0.2 }}
            className={`flex flex-col items-center text-center p-8 rounded-xl ${tema.bg} ${tema.border} backdrop-blur-md`}
          >
            <Zap size={40} className={`${tema.icon} mb-4`} strokeWidth={2} />
            <h3 className={`text-xl font-bold ${tema.text} mb-2 uppercase`} style={{ fontFamily: 'Cinzel, serif' }}>Trono da Dimensão</h3>
            <p className="text-slate-300 leading-relaxed text-sm">
              A pura força bruta rasga defesas, mas não é ilimitada. Uma vez por sessão, por duas rodadas, seus danos físicos ignoram 10 de Resistência e inimigos a 6 m sofrem −2 em testes físicos.
            </p>
          </PremiumCard>

          <PremiumCard
            glowColor={tema.glow}
            initial={{ opacity: 0, y: 40 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.4, delay: 0.3 }}
            className={`flex flex-col items-center text-center p-8 rounded-xl ${tema.bg} ${tema.border} backdrop-blur-md`}
          >
            <Gauge size={40} className={`${tema.icon} mb-4`} strokeWidth={2} />
            <h3 className={`text-xl font-bold ${tema.text} mb-2 uppercase`} style={{ fontFamily: 'Cinzel, serif' }}>Sobre a DT</h3>
            <p className="text-slate-300 leading-relaxed text-sm">
              Todo golpe seu que obriga o alvo a resistir rola Intimidação com Força no lugar de Carisma: o resultado vira a DT que ele precisa alcançar. É o tamanho do estrago que assusta, não a lábia.
            </p>
          </PremiumCard>
        </div>

        <DetalhesClasse classe={classe} />
      </div>
    </div>
  );
};

export default CampeaoDimensional;

