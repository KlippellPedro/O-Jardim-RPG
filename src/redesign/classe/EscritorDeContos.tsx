import { motion } from 'framer-motion';
import { BookOpen, UserPlus, BookX } from 'lucide-react';
import type { IClasse } from '../../types/catalogo';
import { PremiumCard } from '../components/premium/PremiumCard';
import { DetalhesClasse } from '../../pages/Regras/components/DetalhesClasse';
import { obterTemaPorId } from '../themeMap';

export const EscritorDeContos = ({ classe }: { classe: IClasse }) => {
  const tema = obterTemaPorId(classe.id);

  return (
    <div className={`min-h-screen ${tema.text} p-8 selection:bg-fuchsia-500/30 overflow-hidden relative`}>
      {/* 3D WebGL Background */}
      <div className="fixed inset-0 z-0 bg-cover bg-center bg-no-repeat opacity-20 pointer-events-none" style={{ backgroundImage: "url('/assets/img/escritordecontos_bg.webp')" }} />

      {/* Pages / Books Background Effects */}
      <div className="fixed inset-0 pointer-events-none z-0">
        <div className="absolute top-[30%] left-[30%] w-[40%] h-[40%] bg-fuchsia-900/10 blur-[150px] mix-blend-screen" />
        
        {/* Floating pages */}
        {[...Array(5)].map((_, i) => (
          <motion.div
            key={i}
            className="absolute bg-stone-200/5 rounded-sm"
            style={{
              width: 60,
              height: 80,
              left: `${Math.random() * 80 + 10}%`,
              top: `${110}%`,
            }}
            animate={{
              y: - (typeof window !== 'undefined' ? window.innerHeight + 200 : 1000),
              rotateZ: [0, 45, -45, 0],
              rotateX: [0, 180, 360],
            }}
            transition={{
              duration: Math.random() * 5 + 10,
              repeat: Infinity,
              ease: "linear",
              delay: Math.random() * 5
            }}
          />
        ))}
      </div>

      <div className="max-w-5xl mx-auto relative z-10 pt-16">
        {/* Header */}
        <motion.header 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="text-center mb-24"
        >
          <motion.div 
            className={`w-28 h-28 mx-auto ${tema.bg} border ${tema.border} rounded-lg flex items-center justify-center mb-8 relative backdrop-blur-md`}
            style={{ boxShadow: `0 0 30px ${tema.glow}` }}
          >
            <BookOpen size={48} className={`${tema.icon} z-10`} strokeWidth={1.5} />
          </motion.div>

          <motion.div className="overflow-hidden">
             <motion.h1 
                initial={{ y: "100%" }}
                animate={{ y: 0 }}
                transition={{ duration: 0.8, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
                className={`text-7xl font-serif font-bold tracking-tight ${tema.text} mb-6 uppercase`}
                style={{ fontFamily: 'Cinzel, serif' }}
             >
               Escritor de Contos
             </motion.h1>
          </motion.div>
          <motion.p 
             initial={{ opacity: 0 }}
             animate={{ opacity: 1 }}
             transition={{ duration: 1, delay: 0.6 }}
             className={`text-lg ${tema.tag} opacity-80 max-w-2xl mx-auto font-serif leading-relaxed`}
          >
            A realidade é apenas um rascunho. Com uma pena banhada em fluxo, eles reescrevem o destino, forçando o universo a refazer eventos desfavoráveis ou materializando os vilões e heróis de seus livros no campo de batalha.
          </motion.p>
        </motion.header>

        {/* Traits Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-24 font-serif">
          <PremiumCard
            glowColor={tema.glow}
            initial={{ opacity: 0, x: -30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.4 }}
            className={`flex flex-col p-8 rounded-sm ${tema.bg} border ${tema.border} backdrop-blur-md`}
          >
            <BookX size={36} className={`${tema.icon} mb-4`} strokeWidth={1.5} />
            <h3 className={`text-2xl font-bold ${tema.text} mb-2`} style={{ fontFamily: 'Cinzel, serif' }}>Página Rasgada</h3>
            <p className="text-fuchsia-100/60 leading-relaxed text-sm">
              Reescreva o destino. Uma vez por cena, assim que um teste for rolado (por você, aliado ou inimigo) e o resultado anunciado, você rasga a página da realidade, gastando Mana pesada para anular o dado e forçar uma nova rolagem obrigatória que deve ser aceita.
            </p>
          </PremiumCard>

          <PremiumCard
            glowColor={tema.glow}
            initial={{ opacity: 0, x: 30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.4, delay: 0.2 }}
            className={`flex flex-col p-8 rounded-sm ${tema.bg} border ${tema.border} backdrop-blur-md`}
          >
            <UserPlus size={36} className={`${tema.icon} mb-4`} strokeWidth={1.5} />
            <h3 className={`text-2xl font-bold ${tema.text} mb-2`} style={{ fontFamily: 'Cinzel, serif' }}>Personagens Recorrentes</h3>
            <p className="text-fuchsia-100/60 leading-relaxed text-sm">
              A cada estágio, registre um contato real em sua história: um NPC de sua própria autoria que passa a existir no mundo. Uma vez por sessão, se puder ser contatado, um desses personagens pode oferecer informação ou ajuda plausível dentro da narrativa, não uma criatura que luta ao seu lado.
            </p>
          </PremiumCard>
        </div>

        <DetalhesClasse classe={classe} />
      </div>
    </div>
  );
};

export default EscritorDeContos;

