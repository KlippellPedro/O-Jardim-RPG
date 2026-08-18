import { motion } from 'framer-motion';
import { EyeOff, Lock } from 'lucide-react';
import type { IRaca } from '../../types/catalogo';
import { PremiumCard } from '../components/premium/PremiumCard';
import { EscolhaRacialCards } from '../components/premium/EscolhaRacialCards';
import { EstagiosRaciais } from '../components/premium/EstagiosRaciais';
import { obterTemaPorId } from '../themeMap';

export const Entidade = ({ raca }: { raca: IRaca }) => {
  const tema = obterTemaPorId(raca.id);
  return (
    <div className="min-h-screen text-gray-50 p-8 selection:bg-gray-500/30 overflow-hidden relative">
      {/* Mysterious Background */}
      <div 
        className="fixed inset-0 z-0 bg-cover bg-center bg-no-repeat bg-black"
        style={{ backgroundImage: "url('/assets/img/entidade_bg.webp')" }}
      >
        <div className="absolute inset-0 bg-gray-950/80 mix-blend-multiply" />
        <div className="absolute inset-0 bg-gradient-to-b from-[#050505]/40 via-transparent to-[#050505]/90" />
      </div>

      {/* Foreground Overlays */}
      <div className="fixed inset-0 pointer-events-none z-0">
        {/* Shadow Noise */}
        <div className="absolute inset-0 opacity-[0.03] bg-[url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI0IiBoZWlnaHQ9IjQiPgo8cmVjdCB3aWR0aD0iNCIgaGVpZ2h0PSI0IiBmaWxsPSIjZmZmIiBmaWxsLW9wYWNpdHk9IjAuMDUiLz4KPC9zdmc+')] bg-repeat" />
        
        {/* Scanning lines */}
        <motion.div 
          className="absolute inset-x-0 h-[2px] bg-gray-500/20 shadow-[0_0_10px_rgba(156,163,175,0.8)]"
          animate={{ top: ["0%", "100%", "0%"] }}
          transition={{ duration: 12, repeat: Infinity, ease: "linear" }}
        />
      </div>

      <div className="max-w-5xl mx-auto relative z-10 pt-16">
        {/* Header */}
        <motion.header
          initial={{ opacity: 0, filter: 'blur(10px)' }}
          animate={{ opacity: 1, filter: 'blur(0px)' }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          className="text-center mb-24"
        >
          <motion.div
            className={`w-28 h-28 mx-auto border-2 border-dashed ${tema.border} ${tema.bg} rounded-full flex items-center justify-center mb-8 backdrop-blur-md relative`}
          >
            <EyeOff size={48} className={`${tema.icon} z-10`} strokeWidth={1} />
          </motion.div>

          <motion.div className="overflow-hidden">
             <motion.h1
                initial={{ y: "100%" }}
                animate={{ y: 0 }}
                transition={{ duration: 0.8, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
                className={`text-7xl font-light tracking-widest ${tema.text} mb-6 uppercase`}
                style={{ fontFamily: 'Cinzel, serif' }}
             >
               Entidade
             </motion.h1>
          </motion.div>
          <motion.p
             initial={{ opacity: 0 }}
             animate={{ opacity: 1 }}
             transition={{ duration: 1, delay: 0.6 }}
             className="text-lg text-gray-400 max-w-2xl mx-auto font-light leading-relaxed"
          >
            Uma raça ainda trancada nos arquivos do Jardim. Por enquanto ela existe só como nome reservado, esperando o pacote de regras que falta.
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
            className={`col-span-1 md:col-span-2 flex gap-6 p-8 ${tema.bg} border ${tema.border} rounded-lg backdrop-blur-md`}
          >
            <Lock size={32} className={`${tema.icon} shrink-0`} strokeWidth={1.5} />
            <div>
              <h3 className={`text-2xl font-light ${tema.text} mb-3`} style={{ fontFamily: 'Cinzel, serif' }}>Raça Indisponível</h3>
              <p className="text-gray-400 leading-relaxed text-sm font-light">
                Ela foi adiada de propósito: o pacote de regras dela é mais complexo que o das outras e ainda não ficou pronto. Por enquanto não existe fisiologia nem característica publicada, nenhum bônus e nenhuma imunidade no catálogo. Quando o pacote sair, a Entidade entra pra lista.
              </p>
            </div>
          </PremiumCard>
        </div>

        <EstagiosRaciais raca={raca} tema={tema} />

        <EscolhaRacialCards raca={raca} tema={tema} />
      </div>
    </div>
  );
};

export default Entidade;
