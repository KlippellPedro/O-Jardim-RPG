import { motion } from 'framer-motion';
import { Pickaxe, Wrench, PackageSearch } from 'lucide-react';
import type { IRaca } from '../../types/catalogo';
import { PremiumCard } from '../components/premium/PremiumCard';
import { EscolhaRacialCards } from '../components/premium/EscolhaRacialCards';
import { EstagiosRaciais } from '../components/premium/EstagiosRaciais';
import { obterTemaPorId } from '../themeMap';

export const Golem = ({ raca }: { raca: IRaca }) => {
  const tema = obterTemaPorId(raca.id);

  return (
    <div className="min-h-screen text-stone-50 p-8 selection:bg-stone-500/30 overflow-hidden relative">
      {/* Golem Background */}
      <div 
        className="fixed inset-0 z-0 bg-cover bg-center bg-no-repeat bg-black"
        style={{ backgroundImage: "url('/assets/img/golem_bg.webp')" }}
      >
        <div className="absolute inset-0 bg-stone-950/80 mix-blend-multiply" />
        <div className="absolute inset-0 bg-gradient-to-b from-[#0c0a08]/40 via-transparent to-[#0c0a08]/90" />
      </div>

      {/* Stone / Clay / Magic Core Background Effects */}
      <div className="fixed inset-0 pointer-events-none z-0">
        <div className="absolute top-[30%] left-[30%] w-[40%] h-[40%] bg-amber-900/10 blur-[150px] rounded-full mix-blend-screen" />
        
        {/* Magic Core Pulse */}
        <motion.div 
          className="absolute top-[50%] left-[50%] -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-amber-500/5 blur-[80px] rounded-full mix-blend-screen"
          animate={{ scale: [1, 1.2, 1], opacity: [0.5, 0.8, 0.5] }}
          transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
        />
      </div>

      <div className="max-w-5xl mx-auto relative z-10 pt-16">
        {/* Header */}
        <motion.header 
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          className="text-center mb-24"
        >
          <motion.div 
            className={`w-32 h-32 mx-auto ${tema.bg} border-[4px] ${tema.border} rounded-lg flex items-center justify-center mb-8 relative backdrop-blur-md`}
            style={{ boxShadow: `0 0 30px ${tema.glow}` }}
          >
            {/* Glowing runes on the golem's head/chest */}
            <div className="absolute inset-x-0 top-1/3 flex justify-center gap-2">
              <motion.div className="w-2 h-2 bg-amber-500 rounded-full blur-[2px]" animate={{ opacity: [0.4, 1, 0.4] }} transition={{ duration: 2, repeat: Infinity }} />
              <motion.div className="w-2 h-2 bg-amber-500 rounded-full blur-[2px]" animate={{ opacity: [0.4, 1, 0.4] }} transition={{ duration: 2, repeat: Infinity, delay: 0.5 }} />
            </div>
            <Pickaxe size={48} className={`${tema.icon} z-10 mt-4`} strokeWidth={1.5} />
          </motion.div>

          <motion.div className="overflow-hidden">
             <motion.h1 
                initial={{ y: "100%" }}
                animate={{ y: 0 }}
                transition={{ duration: 0.8, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
                className={`text-8xl font-black tracking-tighter ${tema.text} mb-6 uppercase`}
                style={{ fontFamily: 'Cinzel, serif' }}
             >
               Golem
             </motion.h1>
          </motion.div>
          <motion.p 
             initial={{ opacity: 0 }}
             animate={{ opacity: 1 }}
             transition={{ duration: 1, delay: 0.6 }}
             className="text-xl text-stone-400 max-w-2xl mx-auto font-medium leading-relaxed"
          >
            Corpo construído, grande ou enorme, que não respira, não come e não adoece. Pesado, calado e difícil de acabar: quem cuida dele é artesão, e nenhuma armadura de prateleira serve sem ajuste antes.
          </motion.p>
        </motion.header>

        {/* Traits Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-24">
          <PremiumCard
            glowColor={tema.glow}
            initial={{ opacity: 0, scale: 0.95 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className={`flex flex-col p-8 ${tema.bg} border-2 ${tema.border} rounded-sm backdrop-blur-md`}
          >
            <PackageSearch size={36} className={`${tema.icon} mb-4`} strokeWidth={1.5} />
            <h3 className={`text-2xl font-bold ${tema.text} mb-3`} style={{ fontFamily: 'Cinzel, serif' }}>Tamanho e Fisiologia</h3>
            <p className="text-stone-400 leading-relaxed text-sm">
              Tamanho Grande ou Enorme, decidido na criação. Não respira, não come, não bebe e não pega doença comum: é matéria bruta que ganhou movimento.
            </p>
          </PremiumCard>

          <PremiumCard
            glowColor={tema.glow}
            initial={{ opacity: 0, scale: 0.95 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className={`flex flex-col p-8 ${tema.bg} border-2 ${tema.border} rounded-sm backdrop-blur-md`}
          >
            <Wrench size={36} className={`${tema.icon} mb-4`} strokeWidth={1.5} />
            <h3 className={`text-2xl font-bold ${tema.text} mb-3`} style={{ fontFamily: 'Cinzel, serif' }}>Corpo Construído</h3>
            <p className="text-stone-400 leading-relaxed text-sm">
              Quem cuida de um Golem usa Ofício no lugar de Medicina, com a mesma DT e o mesmo tempo. Tratamento que só funcione em biologia viva não faz efeito nenhum nele, e armadura comum só serve depois de adaptada ao corpo.
            </p>
          </PremiumCard>
        </div>

        <EstagiosRaciais
          raca={raca}
          tema={tema}
          titulo="Reforços"
          descricao="Cada conserto deixa o Golem mais duro que antes. Os reforços entram por nível total, somando Vida e endurecendo o que já estava construído."
        />

        <EscolhaRacialCards raca={raca} tema={tema} />
      </div>
    </div>
  );
};

export default Golem;
