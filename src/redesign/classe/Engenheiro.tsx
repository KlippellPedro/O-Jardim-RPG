import { motion } from 'framer-motion';
import { Cog, Wrench, Pickaxe, Gauge } from 'lucide-react';
import type { IClasse } from '../../types/catalogo';
import { PremiumCard } from '../components/premium/PremiumCard';
import { DetalhesClasse } from '../../pages/Regras/components/DetalhesClasse';
import { obterTemaPorId } from '../themeMap';

export const Engenheiro = ({ classe }: { classe: IClasse }) => {
  const tema = obterTemaPorId(classe.id);

  return (
    <div className={`min-h-screen ${tema.text} p-8 selection:bg-slate-500/30 overflow-hidden relative`}>
      {/* 3D WebGL Background */}
      <div className="fixed inset-0 z-0 bg-cover bg-center bg-no-repeat opacity-20 pointer-events-none" style={{ backgroundImage: "url('/assets/img/engenheiro_bg.webp')" }} />

      {/* Workshop / Blueprints Background Effects */}
      <div className="fixed inset-0 pointer-events-none z-0">
        <div className="absolute top-[30%] left-[30%] w-[40%] h-[40%] bg-slate-900/10 blur-[150px] mix-blend-screen" />
        
        {/* Rotating gears */}
        {[...Array(4)].map((_, i) => (
          <motion.div
            key={i}
            className="absolute opacity-10 text-slate-500"
            style={{
              left: `${Math.random() * 80 + 10}%`,
              top: `${Math.random() * 80 + 10}%`,
            }}
            animate={{ rotate: i % 2 === 0 ? 360 : -360 }}
            transition={{ duration: Math.random() * 10 + 10, repeat: Infinity, ease: "linear" }}
          >
            <Cog size={150} />
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
            className={`w-28 h-28 mx-auto ${tema.bg} border-[3px] ${tema.border} rounded-lg flex items-center justify-center mb-8 relative backdrop-blur-md`}
            style={{ boxShadow: `0 0 30px ${tema.glow}` }}
          >
            <motion.div 
              animate={{ rotate: 360 }}
              transition={{ duration: 15, repeat: Infinity, ease: "linear" }}
              className="absolute inset-0 border-[2px] border-dashed border-slate-500/30 rounded-lg"
            />
            <Wrench size={48} className={`${tema.icon} z-10`} strokeWidth={1.5} />
          </motion.div>

          <motion.div className="overflow-hidden">
             <motion.h1 
                initial={{ y: "100%" }}
                animate={{ y: 0 }}
                transition={{ duration: 0.8, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
                className={`text-7xl font-bold tracking-tight ${tema.text} mb-6 uppercase`}
                style={{ fontFamily: 'Cinzel, serif' }}
             >
               Engenheiro
             </motion.h1>
          </motion.div>
          <motion.p 
             initial={{ opacity: 0 }}
             animate={{ opacity: 1 }}
             transition={{ duration: 1, delay: 0.6 }}
             className={`text-lg ${tema.tag} opacity-80 max-w-2xl mx-auto font-medium leading-relaxed`}
          >
            O Engenheiro usa sucata e ferramentas para montar engenhocas, abrir caminhos, proteger aliados e controlar o campo de batalha.
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
            className={`flex flex-col p-8 rounded-lg ${tema.bg} border ${tema.border} backdrop-blur-md shadow-inner`}
          >
            <Cog size={36} className={`${tema.icon} mb-4`} strokeWidth={1.5} />
            <h3 className={`text-2xl font-bold ${tema.text} mb-2 uppercase tracking-wide`} style={{ fontFamily: 'Cinzel, serif' }}>Engenhocas</h3>
            <p className="text-slate-300 leading-relaxed text-sm">
              No descanso, um único lote de Sucata monta todas as engenhocas preparadas. Seus projetos sobem do nível 1 ao 5 com a classe, exigindo Sucata de Comum a Lendária e melhorando automaticamente alcance, dano, resistência ou utilidade.
            </p>
            <a href="#habilidade-engenhocas" className="mt-5 inline-flex w-fit rounded-xl border border-sky-300/25 bg-sky-400/10 px-4 py-2 text-xs font-black uppercase tracking-wider text-sky-100 transition hover:bg-sky-400/20">
              Ver projetos e sucata
            </a>
          </PremiumCard>

          <PremiumCard
            glowColor={tema.glow}
            initial={{ opacity: 0, scale: 0.95 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.4, delay: 0.2 }}
            className={`flex flex-col p-8 rounded-lg ${tema.bg} border ${tema.border} backdrop-blur-md shadow-inner`}
          >
            <Pickaxe size={36} className={`${tema.icon} mb-4`} strokeWidth={1.5} />
            <h3 className={`text-2xl font-bold ${tema.text} mb-2 uppercase tracking-wide`} style={{ fontFamily: 'Cinzel, serif' }}>Arquitetura de Campo</h3>
            <p className="text-slate-300 leading-relaxed text-sm">
              No nível 18 a improvisação vira obra. Você ergue no meio da luta paredes com teto que dão cobertura superior, passarelas e cabos que levam o grupo aonde não havia caminho, ou uma bancada de campo onde todo mundo trabalha melhor. Cinco rodadas, 8 de Mana, uma vez por descanso longo.
            </p>
          </PremiumCard>
          <PremiumCard
            glowColor={tema.glow}
            initial={{ opacity: 0, scale: 0.95 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.4, delay: 0.4 }}
            className={`flex flex-col p-8 rounded-lg ${tema.bg} border ${tema.border} backdrop-blur-md shadow-inner`}
          >
            <Gauge size={36} className={`${tema.icon} mb-4`} strokeWidth={1.5} />
            <h3 className={`text-2xl font-bold ${tema.text} mb-2 uppercase tracking-wide`} style={{ fontFamily: 'Cinzel, serif' }}>Sobre a DT</h3>
            <p className="text-slate-300 leading-relaxed text-sm">
              Nenhum aparelho seu usa número fixo. Ao acionar contra alguém, você rola Ofício (Engenharia), o ofício que vem junto da classe, e o resultado é o número que a vítima precisa alcançar para escapar. Bancada calibrada rende mais que sorte, e uma falha crítica queima o aparelho na sua mão.
            </p>
          </PremiumCard>
        </div>

        <DetalhesClasse classe={classe} />
      </div>
    </div>
  );
};

export default Engenheiro;
