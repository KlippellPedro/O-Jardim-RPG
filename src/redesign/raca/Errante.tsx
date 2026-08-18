import { motion } from 'framer-motion';
import { Sparkles, Brain, ScrollText, UserCheck } from 'lucide-react';
import type { IRaca } from '../../types/catalogo';
import { PremiumCard } from '../components/premium/PremiumCard';
import { EscolhaRacialCards } from '../components/premium/EscolhaRacialCards';
import { EstagiosRaciais } from '../components/premium/EstagiosRaciais';
import { obterTemaPorId } from '../themeMap';

export const Errante = ({ raca }: { raca: IRaca }) => {
  const tema = obterTemaPorId(raca.id);

  return (
    <div className="min-h-screen text-gray-50 p-8 selection:bg-gray-500/30 overflow-hidden relative">
      {/* Multiverse Background */}
      <div 
        className="fixed inset-0 z-0 bg-cover bg-center bg-no-repeat bg-black"
        style={{ backgroundImage: "url('/assets/img/errante_bg.webp')" }}
      >
        <div className="absolute inset-0 bg-gray-950/80 mix-blend-multiply" />
        <div className="absolute inset-0 bg-gradient-to-b from-[#050505]/40 via-transparent to-[#050505]/90" />
      </div>

      {/* Multiverse Foreground Overlays */}
      <div className="fixed inset-0 pointer-events-none z-0">
        {/* VHS / CRT scanline overlay */}
        <div className="absolute inset-0 opacity-[0.05] bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMSIgaGVpZ2h0PSI0IiB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciPjxwb2x5Z29uIHBvaW50cz0iMCAwLCAxIDAsIDEgMiwgMCAyIiBmaWxsPSIjZmZmIi8+PC9zdmc+')] bg-repeat" />
        
        {/* Glitching lines */}
        <motion.div 
          className="absolute inset-x-0 h-[2px] bg-red-500/20 shadow-[0_0_10px_rgba(239,68,68,0.8)]"
          animate={{ top: ["0%", "100%", "0%"], opacity: [1, 0, 1] }}
          transition={{ duration: 5, repeat: Infinity, ease: "linear" }}
        />
      </div>

      <div className="max-w-5xl mx-auto relative z-10 pt-16">
        {/* Header */}
        <motion.header 
          initial={{ opacity: 0, filter: 'blur(20px)' }}
          animate={{ opacity: 1, filter: 'blur(0px)' }}
          transition={{ duration: 0.5 }}
          className="text-center mb-24"
        >
          <motion.div 
            className={`w-28 h-28 mx-auto ${tema.bg} ${tema.border} rounded-lg flex items-center justify-center mb-8 shadow-2xl relative backdrop-blur-md`}
            style={{ boxShadow: `0 0 50px ${tema.glow}` }}
          >
            {/* Glitch effect on the icon */}
            <motion.div 
              className={`absolute inset-0 flex items-center justify-center ${tema.icon}`}
              animate={{ x: [-2, 2, -1, 0] }}
              transition={{ duration: 0.2, repeat: Infinity, repeatDelay: 3 }}
            >
              <UserCheck size={48} strokeWidth={1.5} />
            </motion.div>
            <motion.div 
              className={`absolute inset-0 flex items-center justify-center ${tema.icon}`}
              animate={{ x: [2, -2, 1, 0] }}
              transition={{ duration: 0.2, repeat: Infinity, repeatDelay: 3 }}
            >
              <UserCheck size={48} strokeWidth={1.5} />
            </motion.div>
            
            <UserCheck size={48} className={`${tema.icon} z-10`} strokeWidth={1.5} />
          </motion.div>

          <motion.div className="overflow-hidden">
             <motion.h1 
                initial={{ y: "100%" }}
                animate={{ y: 0 }}
                transition={{ duration: 0.8, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
                className={`text-7xl font-bold tracking-tight ${tema.text} mb-6 uppercase`}
                style={{ textShadow: "2px 0 red, -2px 0 cyan", fontFamily: 'Cinzel, serif' }}
             >
               Errante
             </motion.h1>
          </motion.div>
          <motion.p 
             initial={{ opacity: 0 }}
             animate={{ opacity: 1 }}
             transition={{ duration: 1, delay: 0.6 }}
             className="text-lg text-gray-400 max-w-2xl mx-auto font-medium leading-relaxed"
          >
            É um personagem de outra campanha que atravessou pra esta. Mantém nome, cara, memória e reputação; perde nível e ficha. O que sobrou de lá volta como uma Assinatura (uma técnica marcante, renomeada e convertida) e um Legado a mais.
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
            className={`flex flex-col p-6 rounded-none ${tema.bg} ${tema.border} backdrop-blur-md`}
          >
            <UserCheck size={32} className={`${tema.icon} mb-4`} strokeWidth={1.5} />
            <h3 className={`text-xl font-bold ${tema.text} mb-2`} style={{ fontFamily: 'Cinzel, serif' }}>Identidade Preservada</h3>
            <p className="text-gray-400 leading-relaxed text-sm">
              Conserve nome, aparência, cicatrizes e reputação do personagem original. Os números são refeitos pelas regras do novo mundo, mas o personagem continua sendo o mesmo.
            </p>
          </PremiumCard>

          <PremiumCard
            glowColor={tema.glow}
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className={`flex flex-col p-6 rounded-none ${tema.bg} ${tema.border} backdrop-blur-md`}
          >
            <Brain size={32} className={`${tema.icon} mb-4`} strokeWidth={1.5} />
            <h3 className={`text-xl font-bold ${tema.text} mb-2`} style={{ fontFamily: 'Cinzel, serif' }}>Memórias de Outra Campanha</h3>
            <p className="text-gray-400 leading-relaxed text-sm">
              Escolha 3 perícias relacionadas ao que você fazia na campanha anterior. Você recebe três rerrolagens por sessão compartilhadas exclusivamente entre elas.
            </p>
          </PremiumCard>

          <PremiumCard
            glowColor={tema.glow}
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className={`flex flex-col p-6 rounded-none ${tema.bg} ${tema.border} backdrop-blur-md`}
          >
            <Sparkles size={32} className={`${tema.icon} mb-4`} strokeWidth={1.5} />
            <h3 className={`text-xl font-bold ${tema.text} mb-2`} style={{ fontFamily: 'Cinzel, serif' }}>Assinatura Remanescente</h3>
            <p className="text-gray-400 leading-relaxed text-sm">
              Traga um poder, magia ou técnica marcante da sua campanha de origem, mantenha o nome e o flavor visual, mas converta-o 100% para a mecânica deste sistema.
            </p>
          </PremiumCard>

          <PremiumCard
            glowColor={tema.glow}
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.3 }}
            className={`flex flex-col p-6 rounded-none ${tema.bg} ${tema.border} backdrop-blur-md`}
          >
            <ScrollText size={32} className={`${tema.icon} mb-4`} strokeWidth={1.5} />
            <h3 className={`text-xl font-bold ${tema.text} mb-2`} style={{ fontFamily: 'Cinzel, serif' }}>Legado & Sobrevivência</h3>
            <p className="text-gray-400 leading-relaxed text-sm">
              Receba um Legado adicional representando um artefato trazido com você. Uma vez por sessão, escape de uma morte certa e fique com 1 de Vida em vez de 0: protagonista de campanha antiga custa a cair.
            </p>
          </PremiumCard>
        </div>

        <EstagiosRaciais raca={raca} tema={tema} />

        <EscolhaRacialCards raca={raca} tema={tema} />
      </div>
    </div>
  );
};

export default Errante;
