import { motion } from 'framer-motion';
import { Hammer, Pickaxe, Mountain } from 'lucide-react';
import type { IRaca } from '../../types/catalogo';
import { PremiumCard } from '../components/premium/PremiumCard';
import { EscolhaRacialCards } from '../components/premium/EscolhaRacialCards';
import { EstagiosRaciais } from '../components/premium/EstagiosRaciais';
import { obterTemaPorId } from '../themeMap';

export const Anao = ({ raca }: { raca: IRaca }) => {
  const tema = obterTemaPorId(raca.id);

  return (
    <div className="min-h-screen text-orange-50 p-8 selection:bg-orange-500/30 overflow-hidden relative">
      {/* Mountain Background */}
      <div 
        className="fixed inset-0 z-0 bg-cover bg-center bg-no-repeat bg-black"
        style={{ backgroundImage: "url('/assets/img/anao_bg.webp')" }}
      >
        <div className="absolute inset-0 bg-stone-950/80 mix-blend-multiply" />
        <div className="absolute inset-0 bg-gradient-to-b from-[#120a06]/40 via-transparent to-[#120a06]/90" />
      </div>

      {/* Forge/Mountain Background Effects */}
      <div className="fixed inset-0 pointer-events-none z-0">
        <div className="absolute top-[30%] left-[20%] w-[50%] h-[50%] bg-orange-900/10 blur-[150px] rounded-full mix-blend-screen" />
        <div className="absolute bottom-[0%] right-[10%] w-[60%] h-[40%] bg-red-900/10 blur-[120px] rounded-full mix-blend-screen" />
        
        {/* Sparks */}
        {[...Array(15)].map((_, i) => (
          <motion.div
            key={i}
            className="absolute w-1 h-1 bg-orange-400 rounded-full"
            initial={{ 
              x: Math.random() * (typeof window !== 'undefined' ? window.innerWidth : 1000), 
              y: (typeof window !== 'undefined' ? window.innerHeight : 1000) 
            }}
            animate={{
              y: -50,
              x: `+=${Math.random() * 50 - 25}`,
              opacity: [0, 1, 0],
            }}
            transition={{
              duration: Math.random() * 3 + 2,
              repeat: Infinity,
              delay: Math.random() * 5,
              ease: "easeOut"
            }}
          />
        ))}
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
            className={`w-28 h-28 mx-auto ${tema.bg} border-2 ${tema.border} rounded-lg flex items-center justify-center mb-8 relative overflow-hidden backdrop-blur-md`}
            style={{ boxShadow: `0 10px 30px ${tema.glow}` }}
          >
            <div className="absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-t from-orange-600/30 to-transparent" />
            <Hammer size={48} className={`${tema.icon} z-10`} strokeWidth={1.5} />
          </motion.div>

          <motion.div className="overflow-hidden">
             <motion.h1 
                initial={{ y: "100%" }}
                animate={{ y: 0 }}
                transition={{ duration: 0.8, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
                className={`text-7xl font-bold tracking-tight ${tema.text} mb-6 uppercase`}
                style={{ fontFamily: 'Cinzel, serif' }}
             >
               Anão
             </motion.h1>
          </motion.div>
          <motion.p 
             initial={{ opacity: 0 }}
             animate={{ opacity: 1 }}
             transition={{ duration: 1, delay: 0.6 }}
             className="text-lg text-stone-400 max-w-2xl mx-auto font-medium leading-relaxed"
          >
            Baixo, duro de derrubar e melhor que qualquer um com uma ferramenta na mão. Constrói, conserta e erra menos na segunda tentativa. Fala Nórdico Antigo, e o Reino dos Anões forja o que os outros reinos apenas fabricam.
          </motion.p>
        </motion.header>

        {/* Traits Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-24">
          <PremiumCard
            glowColor={tema.glow}
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className={`flex items-start gap-6 p-8 rounded-xl ${tema.bg} border ${tema.border} backdrop-blur-md`}
          >
            <div className={`w-16 h-16 shrink-0 rounded-lg ${tema.bg} flex items-center justify-center border ${tema.border}`}>
              <Mountain size={28} className={tema.icon} strokeWidth={1.5} />
            </div>
            <div>
              <h3 className={`text-2xl font-bold ${tema.text} mb-2`} style={{ fontFamily: 'Cinzel, serif' }}>Fisiologia Robusta</h3>
              <p className="text-stone-400 leading-relaxed text-sm">
                Tamanho Pequeno. A altura engana: osso e músculo de anão são bem mais densos que os de qualquer outro povo, e é por isso que um deles aguenta tanto quanto gente do dobro do tamanho.
              </p>
            </div>
          </PremiumCard>

          <PremiumCard
            glowColor={tema.glow}
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className={`flex items-start gap-6 p-8 rounded-xl ${tema.bg} border ${tema.border} backdrop-blur-md`}
          >
            <div className={`w-16 h-16 shrink-0 rounded-lg ${tema.bg} flex items-center justify-center border ${tema.border}`}>
              <Pickaxe size={28} className={tema.icon} strokeWidth={1.5} />
            </div>
            <div>
              <h3 className={`text-2xl font-bold ${tema.text} mb-2`} style={{ fontFamily: 'Cinzel, serif' }}>Mãos de Ofício</h3>
              <p className="text-orange-200/60 leading-relaxed text-sm">
                Receba vantagem em testes de Ofício para construir ou reparar. Uma vez por descanso, depois de falhar em um desses testes, você pode rerrolá-lo e deve usar o novo resultado.
              </p>
            </div>
          </PremiumCard>
        </div>

        <EstagiosRaciais
          raca={raca}
          tema={tema}
          titulo="Maestria"
          descricao="Ofício de anão se mede em anos de bancada. Você sobe de degrau só de ganhar nível total, sem precisar pedir nada ao mestre, e cada um libera a característica seguinte do seu Ofício de Forja."
        />

        <EscolhaRacialCards raca={raca} tema={tema} />
      </div>
    </div>
  );
};

export default Anao;
