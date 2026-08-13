import { motion } from 'framer-motion';
import { Eye, Code, SearchCode } from 'lucide-react';
import type { IClasse } from '../../types/catalogo';
import { PremiumCard } from '../components/premium/PremiumCard';
import { DetalhesClasse } from '../../pages/Regras/components/DetalhesClasse';
import { obterTemaPorId } from '../themeMap';

export const Decodificador = ({ classe }: { classe: IClasse }) => {
  const tema = obterTemaPorId(classe.id);

  return (
    <div className={`min-h-screen ${tema.text} p-8 selection:bg-orange-500/30 overflow-hidden relative`}>
      {/* 3D WebGL Background */}
      <div className="fixed inset-0 z-0 bg-cover bg-center bg-no-repeat opacity-20 pointer-events-none" style={{ backgroundImage: "url('/assets/img/decodificador_bg.webp')" }} />

      {/* Matrix / Data Analysis Background Effects */}
      <div className="fixed inset-0 pointer-events-none z-0">
        <div className="absolute top-[20%] right-[20%] w-[50%] h-[50%] bg-orange-900/10 blur-[150px] mix-blend-screen" />
        
        {/* Falling code snippets */}
        {[...Array(10)].map((_, i) => (
          <motion.div
            key={i}
            className="absolute font-mono text-xs text-orange-500/20 whitespace-pre"
            style={{
              left: `${Math.random() * 100}%`,
              top: '-10%',
            }}
            animate={{
              y: (typeof window !== 'undefined' ? window.innerHeight : 1000) + 100,
            }}
            transition={{
              duration: Math.random() * 10 + 10,
              repeat: Infinity,
              ease: "linear",
              delay: Math.random() * 10
            }}
          >
            {`01${Math.floor(Math.random()*10)}0\n${Math.floor(Math.random()*10)}110\n10${Math.floor(Math.random()*10)}1`}
          </motion.div>
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
            className={`w-28 h-28 mx-auto ${tema.bg} border-2 ${tema.border} rounded-lg flex items-center justify-center mb-8 relative backdrop-blur-md`}
            style={{ boxShadow: `0 0 30px ${tema.glow}` }}
          >
            <SearchCode size={48} className={`${tema.icon} z-10`} strokeWidth={1.5} />
            <motion.div 
              className="absolute inset-x-0 h-px bg-orange-400/50"
              animate={{ top: ["0%", "100%", "0%"] }}
              transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
            />
          </motion.div>

          <motion.div className="overflow-hidden">
             <motion.h1 
                initial={{ y: "100%" }}
                animate={{ y: 0 }}
                transition={{ duration: 0.8, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
                className={`text-7xl font-mono font-bold tracking-tight ${tema.text} mb-6 uppercase`}
                style={{ fontFamily: 'Cinzel, serif' }}
             >
               Decodificador
             </motion.h1>
          </motion.div>
          <motion.p 
             initial={{ opacity: 0 }}
             animate={{ opacity: 1 }}
             transition={{ duration: 1, delay: 0.6 }}
             className={`text-lg ${tema.tag} opacity-80 max-w-2xl mx-auto font-mono leading-relaxed`}
          >
            Nada é indecifrável. Eles analisam padrões, quebram criptografias místicas e tecnológicas, e encontram a falha exposta na armadura ou na linguagem do adversário.
          </motion.p>
        </motion.header>

        {/* Traits Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-24 font-mono">
          <PremiumCard
            glowColor={tema.glow}
            initial={{ opacity: 0, x: -30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.4 }}
            className={`flex flex-col p-8 ${tema.bg} border ${tema.border} backdrop-blur-md`}
          >
            <Code size={36} className={`${tema.icon} mb-4`} strokeWidth={1.5} />
            <h3 className={`text-2xl font-bold ${tema.text} mb-2 uppercase`} style={{ fontFamily: 'Cinzel, serif' }}>Cifras da Criação</h3>
            <p className="text-orange-100/60 leading-relaxed text-sm">
              Você pode ler, mesmo que parcialmente, qualquer idioma antigo ou código criptografado, seja mágico ou digital. Se não decifrar completamente, o mestre deve fornecer a essência central da mensagem.
            </p>
          </PremiumCard>

          <PremiumCard
            glowColor={tema.glow}
            initial={{ opacity: 0, x: 30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.4, delay: 0.2 }}
            className={`flex flex-col p-8 ${tema.bg} border ${tema.border} backdrop-blur-md`}
          >
            <Eye size={36} className={`${tema.icon} mb-4`} strokeWidth={1.5} />
            <h3 className={`text-2xl font-bold ${tema.text} mb-2 uppercase`} style={{ fontFamily: 'Cinzel, serif' }}>Falha Exposta</h3>
            <p className="text-orange-100/60 leading-relaxed text-sm">
              Gaste uma Ação de Movimento para escanear um inimigo. Você revela uma vulnerabilidade na rotina de combate dele, concedendo a si mesmo e aos aliados +1d6 no acerto do próximo ataque realizado contra aquele alvo.
            </p>
          </PremiumCard>
        </div>

        <DetalhesClasse classe={classe} />
      </div>
    </div>
  );
};

export default Decodificador;

