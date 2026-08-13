import { motion } from 'framer-motion';
import { FlameKindling, Waves, Sparkles } from 'lucide-react';
import type { IClasse } from '../../types/catalogo';
import { PremiumCard } from '../components/premium/PremiumCard';
import { DetalhesClasse } from '../../pages/Regras/components/DetalhesClasse';
import { obterTemaPorId } from '../themeMap';

export const Canalizador = ({ classe }: { classe: IClasse }) => {
  const tema = obterTemaPorId(classe.id);

  return (
    <div className={`min-h-screen ${tema.text} p-8 selection:bg-pink-500/30 overflow-hidden relative`}>
      {/* 3D WebGL Background */}
      <div className="fixed inset-0 z-0 bg-cover bg-center bg-no-repeat opacity-20 pointer-events-none" style={{ backgroundImage: "url('/assets/img/canalizador_bg.webp')" }} />

      {/* Raw Magic Background Effects */}
      <div className="fixed inset-0 pointer-events-none z-0">
        <div className="absolute top-[20%] left-[50%] -translate-x-1/2 w-[60%] h-[60%] bg-fuchsia-900/20 blur-[150px] rounded-full mix-blend-screen" />
        
        {/* Pulsing raw mana */}
        <motion.div 
          className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(217,70,239,0.1)_0%,transparent_50%)]"
          animate={{ scale: [1, 1.5, 1], opacity: [0.3, 0.6, 0.3] }}
          transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
        />
      </div>

      <div className="max-w-5xl mx-auto relative z-10 pt-16">
        {/* Header */}
        <motion.header 
          initial={{ opacity: 0, scale: 1.1 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.6 }}
          className="text-center mb-24"
        >
          <motion.div 
            className={`w-28 h-28 mx-auto ${tema.bg} border-[3px] ${tema.border} rounded-full flex items-center justify-center mb-8 relative overflow-hidden backdrop-blur-md`}
            style={{ boxShadow: `0 0 50px ${tema.glow}` }}
          >
            <motion.div 
              className={`absolute inset-0 ${tema.bg} blur-[10px]`}
              style={{ backgroundColor: tema.primary + '40' }}
              animate={{ rotate: 360, scale: [1, 1.5, 1] }}
              transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
            />
            <Sparkles size={48} className={`${tema.icon} z-10`} strokeWidth={1.5} />
          </motion.div>

          <motion.div className="overflow-hidden">
             <motion.h1 
                initial={{ y: "100%" }}
                animate={{ y: 0 }}
                transition={{ duration: 0.8, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
                className={`text-7xl font-bold tracking-tight ${tema.text} mb-6 uppercase`}
                style={{ fontFamily: 'Cinzel, serif' }}
             >
               Canalizador
             </motion.h1>
          </motion.div>
          <motion.p 
             initial={{ opacity: 0 }}
             animate={{ opacity: 1 }}
             transition={{ duration: 1, delay: 0.6 }}
             className={`text-lg ${tema.tag} opacity-80 max-w-2xl mx-auto font-medium leading-relaxed`}
          >
            Uma ponte para o misticismo puro. Eles abdicam de truques complexos para vomitar a forma crua da magia no mundo, reduzindo os custos dos feitiços e esmagando os oponentes com Força Arcana bruta.
          </motion.p>
        </motion.header>

        {/* Traits Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-24">
          <PremiumCard
            glowColor={tema.glow}
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.4 }}
            className={`flex flex-col p-8 rounded-lg ${tema.bg} ${tema.border} backdrop-blur-md`}
          >
            <FlameKindling size={36} className={`${tema.icon} mb-4`} strokeWidth={1.5} />
            <h3 className={`text-2xl font-bold ${tema.text} mb-2 uppercase`} style={{ fontFamily: 'Cinzel, serif' }}>Forma do Fluxo</h3>
            <p className="text-slate-300 leading-relaxed text-sm">
              Escolha por estágio uma forma para dominar: alvo, área, defesa ou movimento. Uma vez por cena, uma magia lançada dentro dessa forma recebe +2, demonstrando o domínio bruto que você tem sobre aquele aspecto do Fluxo.
            </p>
          </PremiumCard>

          <PremiumCard
            glowColor={tema.glow}
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.4, delay: 0.2 }}
            className={`flex flex-col p-8 rounded-lg ${tema.bg} ${tema.border} backdrop-blur-md`}
          >
            <Waves size={36} className={`${tema.icon} mb-4`} strokeWidth={1.5} />
            <h3 className={`text-2xl font-bold ${tema.text} mb-2 uppercase`} style={{ fontFamily: 'Cinzel, serif' }}>Voz da Deidade</h3>
            <p className="text-slate-300 leading-relaxed text-sm">
              Uma vez por sessão, por três rodadas, sua voz canaliza a fonte diretamente: suas conjurações custam 2 Mana a menos (mínimo 1) e recebem +2, um pico breve de poder que não se sustenta além do momento.
            </p>
          </PremiumCard>
        </div>

        <DetalhesClasse classe={classe} />
      </div>
    </div>
  );
};

export default Canalizador;

