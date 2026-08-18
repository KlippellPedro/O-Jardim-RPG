import { motion } from 'framer-motion';
import { Sparkles, EyeOff } from 'lucide-react';
import type { IRaca } from '../../types/catalogo';
import { PremiumCard } from '../components/premium/PremiumCard';
import { EscolhaRacialCards } from '../components/premium/EscolhaRacialCards';
import { EstagiosRaciais } from '../components/premium/EstagiosRaciais';
import { obterTemaPorId } from '../themeMap';

interface FeericoProps {
  raca: IRaca;
}

export const Feerico = ({ raca }: FeericoProps) => {
  const tema = obterTemaPorId(raca.id);
  return (
    <div className="min-h-screen text-pink-50 p-8 selection:bg-pink-500/30 overflow-hidden relative">
      {/* Fey Background */}
      <div 
        className="fixed inset-0 z-0 bg-cover bg-center bg-no-repeat bg-black"
        style={{ backgroundImage: "url('/assets/img/feerico_bg.webp')" }}
      >
        <div className="absolute inset-0 bg-pink-950/80 mix-blend-multiply" />
        <div className="absolute inset-0 bg-gradient-to-b from-[#110514]/40 via-transparent to-[#110514]/90" />
      </div>

      {/* Glamour Background Effects */}
      <div className="fixed inset-0 pointer-events-none z-0">
        <div className="absolute top-[20%] left-[30%] w-[50%] h-[50%] bg-pink-900/20 blur-[150px] rounded-full mix-blend-screen" />
        <div className="absolute bottom-[20%] right-[20%] w-[40%] h-[40%] bg-fuchsia-900/20 blur-[120px] rounded-full mix-blend-screen" />
        
        {/* Fairy dust */}
        {[...Array(50)].map((_, i) => (
          <motion.div
            key={i}
            className="absolute rounded-full bg-white"
            style={{
              width: Math.random() * 3 + 1,
              height: Math.random() * 3 + 1,
              boxShadow: '0 0 8px rgba(236, 72, 153, 0.8)',
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
            }}
            animate={{
              opacity: [0, 1, 0],
              scale: [0, 1.5, 0],
            }}
            transition={{
              duration: Math.random() * 2 + 1,
              repeat: Infinity,
              ease: "easeInOut",
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
          transition={{ duration: 1, ease: "easeOut" }}
          className="text-center mb-24"
        >
          <motion.div 
            className={`w-28 h-28 mx-auto ${tema.bg} ${tema.border} rounded-2xl flex items-center justify-center mb-8 backdrop-blur-md rotate-45`}
          >
            <div className="-rotate-45">
              <Sparkles size={48} className={tema.icon} strokeWidth={1.5} />
            </div>
          </motion.div>

          <motion.div className="overflow-hidden">
             <motion.h1 
                initial={{ y: "100%" }}
                animate={{ y: 0 }}
                transition={{ duration: 0.8, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
                className={`text-7xl font-bold tracking-tight ${tema.text} mb-6 uppercase`}
                style={{ fontFamily: 'Cinzel, serif' }}
             >
               Feérico
             </motion.h1>
          </motion.div>
          <motion.p 
             initial={{ opacity: 0 }}
             animate={{ opacity: 1 }}
             transition={{ duration: 1, delay: 0.6 }}
             className="text-lg text-pink-200/60 max-w-2xl mx-auto font-medium leading-relaxed"
          >
            Pequeno ou normal, e com Mana muito acima do que o tamanho sugere. Faz truque sensorial o tempo todo, de graça, e ilusão grande quando resolve levar a sério. Nada disso machuca: o estrago é sempre o que a vítima faz com a informação errada.
          </motion.p>
        </motion.header>

        {/* Traits Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-24">
          <PremiumCard
            glowColor={tema.glow}
            initial={{ opacity: 0, y: 40 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className={`flex gap-6 p-8 rounded-2xl ${tema.bg} ${tema.border} backdrop-blur-md`}
          >
            <Sparkles size={40} className={`${tema.icon} shrink-0`} strokeWidth={1.5} />
            <div>
              <h3 className={`text-2xl font-bold ${tema.text} mb-3`} style={{ fontFamily: 'Cinzel, serif' }}>Truque Feérico</h3>
              <p className="text-pink-200/60 leading-relaxed text-sm">
                Você cria à vontade um efeito sensorial pequeno e inofensivo: faíscas, um cheiro, um sussurro, uma imagem do tamanho da sua mão. O truque não causa dano, não concede bônus em nada e não imita uma criatura de forma convincente.
              </p>
            </div>
          </PremiumCard>

          <PremiumCard
            glowColor={tema.glow}
            initial={{ opacity: 0, y: 40 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className={`flex gap-6 p-8 rounded-2xl ${tema.bg} ${tema.border} backdrop-blur-md`}
          >
            <EyeOff size={40} className={`${tema.icon} shrink-0`} strokeWidth={1.5} />
            <div>
              <h3 className={`text-2xl font-bold ${tema.text} mb-3`} style={{ fontFamily: 'Cinzel, serif' }}>Glamour</h3>
              <p className="text-pink-200/60 leading-relaxed text-sm">
                Uma vez por cena, gaste uma ação e 2 Mana para montar uma ilusão de imagem e som, de até 3 m, em um ponto a até 15 m de você. Ela fica de pé enquanto você mantiver concentração, por no máximo 1 minuto. Quem interagir diretamente com ela pode fazer um teste de Percepção contra o seu Misticismo para reconhecer que é ilusão.
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

export default Feerico;
