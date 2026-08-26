import { motion } from 'framer-motion';
import { Eye, Flame, TriangleAlert } from 'lucide-react';
import type { IRaca } from '../../types/catalogo';
import { PremiumCard } from '../components/premium/PremiumCard';
import { CatalogoRacial } from '../components/premium/CatalogoRacial';
import { EscolhaRacialCards } from '../components/premium/EscolhaRacialCards';
import { EstagiosRaciais } from '../components/premium/EstagiosRaciais';
import { obterTemaPorId } from '../themeMap';

export const Bruxa = ({ raca }: { raca: IRaca }) => {
  const tema = obterTemaPorId(raca.id);

  return (
    <div className="min-h-screen text-rose-50 p-8 selection:bg-rose-500/30 overflow-hidden relative">
      {/* Witchcraft Background */}
      <div 
        className="fixed inset-0 z-0 bg-cover bg-center bg-no-repeat bg-black"
        style={{ backgroundImage: "url('/assets/img/bruxa_bg.webp')" }}
      >
        <div className="absolute inset-0 bg-purple-950/80 mix-blend-multiply" />
        <div className="absolute inset-0 bg-gradient-to-b from-[#0a0206]/40 via-transparent to-[#0a0206]/90" />
      </div>

      {/* Witchcraft/Curse Background Effects */}
      <div className="fixed inset-0 pointer-events-none z-0">
        <div className="absolute top-[30%] left-[20%] w-[50%] h-[50%] bg-purple-900/20 blur-[150px] rounded-full mix-blend-screen" />
        <div className="absolute bottom-[10%] right-[20%] w-[40%] h-[40%] bg-rose-900/10 blur-[120px] rounded-full mix-blend-screen" />
        
        {/* Dark threads / Hexes */}
        {[...Array(10)].map((_, i) => (
          <motion.div
            key={i}
            className="absolute border-t border-purple-500/10 rounded-[100%]"
            style={{
              width: Math.random() * 400 + 200,
              height: Math.random() * 200 + 100,
              left: `${Math.random() * 100 - 20}%`,
              top: `${Math.random() * 100 - 20}%`,
              rotate: Math.random() * 180,
            }}
            animate={{
              opacity: [0.1, 0.4, 0.1],
              scale: [1, 1.1, 1],
            }}
            transition={{
              duration: Math.random() * 5 + 5,
              repeat: Infinity,
              ease: "easeInOut"
            }}
          />
        ))}
      </div>

      <div className="max-w-5xl mx-auto relative z-10 pt-16">
        {/* Header */}
        <motion.header 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          className="text-center mb-24"
        >
          <motion.div 
            className={`w-28 h-28 mx-auto ${tema.bg} ${tema.border} rounded-full flex items-center justify-center mb-8 backdrop-blur-md relative overflow-hidden`}
            style={{ boxShadow: `0 0 50px ${tema.glow}` }}
          >
            <motion.div 
              className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAiIGhlaWdodD0iMjAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PHBhdGggZD0iTTEwIDBMMjAgMjBMMCAyMFoiIGZpbGw9Im5vbmUiIHN0cm9rZT0icmdiYSgxNDcsIDUxLCAyMzQsIDAuMikiIHN0cm9rZS13aWR0aD0iMSIvPjwvc3ZnPg==')] bg-center opacity-30"
              animate={{ rotate: 360 }}
              transition={{ duration: 30, repeat: Infinity, ease: "linear" }}
            />
            <Eye size={48} className={`${tema.icon} z-10`} strokeWidth={1} />
          </motion.div>

          <motion.div className="overflow-hidden">
             <motion.h1 
                initial={{ y: "100%" }}
                animate={{ y: 0 }}
                transition={{ duration: 0.8, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
                className={`text-7xl font-serif tracking-tight ${tema.text} mb-6 uppercase`}
                style={{ fontFamily: 'Cinzel, serif' }}
             >
               Bruxa
             </motion.h1>
          </motion.div>
          <motion.p 
             initial={{ opacity: 0 }}
             animate={{ opacity: 1 }}
             transition={{ duration: 1, delay: 0.6 }}
             className="text-lg text-rose-200/60 max-w-2xl mx-auto font-serif leading-relaxed"
          >
            Bruxa é uma natureza mágica que se adquire e não se perde depois. Enxerga maldição, pacto e possessão a distância, cria as próprias maldições e, quando falta Mana, paga o preço com a própria Vida. Fala Celta.
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
            className={`flex flex-col p-8 rounded-none ${tema.bg} ${tema.border} backdrop-blur-md`}
          >
            <Eye size={32} className={`${tema.icon} mb-6`} strokeWidth={1.5} />
            <h3 className={`text-2xl font-serif ${tema.text} mb-3`} style={{ fontFamily: 'Cinzel, serif' }}>Olhar Bruxo</h3>
            <p className="text-rose-200/60 leading-relaxed text-sm font-serif">
              Você percebe a presença e direção aproximada de maldições, pactos e possessões ativas a até 15m. Receba vantagem natural para resistir a maldições e tentativas de controlar sua alma.
            </p>
          </PremiumCard>

          <PremiumCard
            glowColor={tema.glow}
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className={`flex flex-col p-8 rounded-none ${tema.bg} ${tema.border} backdrop-blur-md`}
          >
            <Flame size={32} className={`${tema.icon} mb-6`} strokeWidth={1.5} />
            <h3 className={`text-2xl font-serif ${tema.text} mb-3`} style={{ fontFamily: 'Cinzel, serif' }}>Preço da Bruxaria</h3>
            <p className="text-rose-200/60 leading-relaxed text-sm font-serif">
              Uma vez por cena, se não tiver Mana suficiente para uma característica racial, substitua até 3 pontos de Mana por 2 de Vida para cada um. Esse dano direto ignora resistências e custa seu sangue.
            </p>
          </PremiumCard>

          <PremiumCard
            glowColor={tema.glow}
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.4 }}
            className={`col-span-1 md:col-span-2 flex flex-col p-8 rounded-none ${tema.bg} ${tema.border} backdrop-blur-md`}
          >
            <TriangleAlert size={32} className={`${tema.icon} mb-6`} strokeWidth={1.5} />
            <h3 className={`text-2xl font-serif ${tema.text} mb-3`} style={{ fontFamily: 'Cinzel, serif' }}>Maldição Tecida & Grande Sabá</h3>
            <p className="text-rose-200/60 leading-relaxed text-sm font-serif">
              Gaste ação e Mana para jogar maldições pesadas em um alvo. No estágio avançado do Grande Sabá, a mesma maldição passa a pegar vários inimigos de uma vez.
            </p>
          </PremiumCard>
        </div>

        <EstagiosRaciais raca={raca} tema={tema} />

        <EscolhaRacialCards raca={raca} tema={tema} />

        <CatalogoRacial
          raca={raca}
          tema={tema}
          campo="maldicoes"
          titulo="Maldições Conhecidas"
          descricao="Maldição Tecida e Grande Sabá aplicam uma destas. Grimório aumenta o total conhecido de três para cinco."
        />
      </div>
    </div>
  );
};

export default Bruxa;
