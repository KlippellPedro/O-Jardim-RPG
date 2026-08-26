import { motion } from 'framer-motion';
import { Merge, Link, Zap, Gauge } from 'lucide-react';
import type { IClasse } from '../../types/catalogo';
import { PremiumCard } from '../components/premium/PremiumCard';
import { DetalhesClasse } from '../../pages/Regras/components/DetalhesClasse';
import { obterTemaPorId } from '../themeMap';

export const Sintonizador = ({ classe }: { classe: IClasse }) => {
  const tema = obterTemaPorId(classe.id);

  return (
    <div className="min-h-screen text-cyan-50 p-8 selection:bg-cyan-500/30 overflow-hidden relative">
      {/* 3D WebGL Background */}
      <div className="fixed inset-0 z-0 bg-cover bg-center bg-no-repeat opacity-20 pointer-events-none" style={{ backgroundImage: "url('/assets/img/sintonizador_bg.webp')" }} />

      {/* Synchronization Background Effects */}
      <div className="fixed inset-0 pointer-events-none z-0">
        <div className="absolute top-[30%] left-[50%] -translate-x-1/2 w-[40%] h-[40%] bg-cyan-900/20 blur-[150px] mix-blend-screen" />
        
        {/* Converging waves */}
        {[...Array(3)].map((_, i) => (
          <motion.div
            key={i}
            className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full border border-cyan-400/20"
            style={{ width: (i + 1) * 200, height: (i + 1) * 200 }}
            animate={{ scale: [1, 0.5, 1], opacity: [0.2, 0.5, 0.2] }}
            transition={{ duration: 4, delay: i * 0.5, repeat: Infinity, ease: "easeInOut" }}
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
            className={`w-28 h-28 mx-auto ${tema.bg} border-2 ${tema.border} rounded-full flex items-center justify-center mb-8 relative overflow-hidden backdrop-blur-md`}
            style={{ boxShadow: `0 0 30px ${tema.glow}` }}
          >
            <Merge size={48} className={`${tema.icon} z-10`} strokeWidth={1.5} />
          </motion.div>

          <motion.div className="overflow-hidden">
             <motion.h1 
                initial={{ y: "100%" }}
                animate={{ y: 0 }}
                transition={{ duration: 0.8, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
                className={`text-7xl font-bold tracking-tight ${tema.text} mb-6 uppercase`}
                style={{ fontFamily: 'Cinzel, serif' }}
             >
               Sintonizador
             </motion.h1>
          </motion.div>
          <motion.p 
             initial={{ opacity: 0 }}
             animate={{ opacity: 1 }}
             transition={{ duration: 1, delay: 0.6 }}
             className="text-lg text-cyan-100/60 max-w-2xl mx-auto font-medium leading-relaxed"
          >
            Mestres em alinhar o próprio Fluxo nativo a catalisadores externos, sem jamais alojar um segundo Fluxo na alma. O Sintonizador não empilha magias; ele funde uma única conjuração através do catalisador, mudando seu tipo, forma ou utilidade.
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
            className={`flex flex-col p-8 ${tema.bg} border-l-4 ${tema.border} backdrop-blur-md`}
          >
            <Link size={36} className={`${tema.icon} mb-4`} strokeWidth={1.5} />
            <h3 className={`text-2xl font-bold ${tema.text} mb-2 uppercase tracking-wide`} style={{ fontFamily: 'Cinzel, serif' }}>Sintonia Catalisada</h3>
            <p className="text-cyan-100/60 leading-relaxed text-sm">
              O conceito central da classe: vincule-se a um catalisador externo após dez minutos fora de combate, sem que ele altere seu Fluxo nativo. Com o tempo, mantenha mais catalisadores preparados ao mesmo tempo, troque qual está ativo como Ação Livre e, no topo da carreira, sustente dois ativos ao mesmo tempo.
            </p>
          </PremiumCard>

          <PremiumCard
            glowColor={tema.glow}
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className={`flex flex-col p-8 ${tema.bg} border-l-4 ${tema.border} backdrop-blur-md`}
          >
            <Merge size={36} className={`${tema.icon} mb-4`} strokeWidth={1.5} />
            <h3 className={`text-2xl font-bold ${tema.text} mb-2 uppercase tracking-wide`} style={{ fontFamily: 'Cinzel, serif' }}>Fusão Controlada</h3>
            <p className="text-cyan-100/60 leading-relaxed text-sm">
              Aprenda uma fusão por estágio entre as onze publicadas no capítulo de Magia, uma para cada Fluxo do jogo (Tecnologia incluída). Cada conjuração aceita uma fusão compatível com o catalisador ativo; depois do uso, ele fica desativado até você refazer os dez minutos de sintonia fora do combate.
            </p>
          </PremiumCard>

          <PremiumCard
            glowColor={tema.glow}
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.4 }}
            className={`flex flex-col p-8 ${tema.bg} border-l-4 ${tema.border} backdrop-blur-md`}
          >
            <Zap size={36} className={`${tema.icon} mb-4`} strokeWidth={1.5} />
            <h3 className={`text-2xl font-bold ${tema.text} mb-2 uppercase tracking-wide`} style={{ fontFamily: 'Cinzel, serif' }}>Religação de Emergência</h3>
            <p className="text-cyan-100/60 leading-relaxed text-sm">
              Uma vez por combate, use uma Reação quando seu catalisador ativo for destruído, roubado ou desativado: vincule-se na hora a outro catalisador preparado, sem esperar os dez minutos normais de sintonia. O empréstimo de poder nunca fica sem reposição por muito tempo.
            </p>
          </PremiumCard>

          <PremiumCard
            glowColor={tema.glow}
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.6 }}
            className={`flex flex-col p-8 ${tema.bg} border-l-4 ${tema.border} backdrop-blur-md`}
          >
            <Gauge size={36} className={`${tema.icon} mb-4`} strokeWidth={1.5} />
            <h3 className={`text-2xl font-bold ${tema.text} mb-2 uppercase tracking-wide`} style={{ fontFamily: 'Cinzel, serif' }}>Sobre a DT</h3>
            <p className="text-cyan-100/60 leading-relaxed text-sm">
              Todo efeito seu que obriga um alvo a resistir rola Misticismo no momento da conjuração: o resultado vira a DT que ele precisa alcançar. É diferente da DT de conjuração normal (7 + 3 × o círculo da magia), que já vale sozinha pra toda magia que você lança.
            </p>
          </PremiumCard>
        </div>

        <DetalhesClasse classe={classe} />
      </div>
    </div>
  );
};

export default Sintonizador;
