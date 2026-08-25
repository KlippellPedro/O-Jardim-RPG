import { motion } from 'framer-motion';
import { HandMetal, Trophy, Flame, Gauge } from 'lucide-react';
import type { IClasse } from '../../types/catalogo';
import { PremiumCard } from '../components/premium/PremiumCard';
import { DetalhesClasse } from '../../pages/Regras/components/DetalhesClasse';
import { obterTemaPorId } from '../themeMap';

export const Lutador = ({ classe }: { classe: IClasse }) => {
  const tema = obterTemaPorId(classe.id);

  return (
    <div className="min-h-screen text-red-50 p-8 selection:bg-red-500/30 overflow-hidden relative">
      {/* 3D WebGL Background */}
      <div className="fixed inset-0 z-0 bg-cover bg-center bg-no-repeat opacity-20 pointer-events-none" style={{ backgroundImage: "url('/assets/img/lutador_bg.webp')" }} />

      {/* Brutal Combat Background Effects */}
      <div className="fixed inset-0 pointer-events-none z-0">
        <div className="absolute top-[20%] left-[20%] w-[60%] h-[60%] bg-red-900/20 blur-[150px] rounded-full mix-blend-screen" />
        
        {/* Shockwaves */}
        {[...Array(3)].map((_, i) => (
          <motion.div
            key={i}
            className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-red-500/20"
            style={{
              width: 100,
              height: 100,
            }}
            animate={{
              width: [100, 1000],
              height: [100, 1000],
              opacity: [0.5, 0],
            }}
            transition={{
              duration: 2,
              repeat: Infinity,
              delay: i * 0.8,
              ease: "easeOut"
            }}
          />
        ))}
      </div>

      <div className="max-w-5xl mx-auto relative z-10 pt-16">
        {/* Header */}
        <motion.header 
          initial={{ opacity: 0, scale: 1.1 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5, type: "spring", stiffness: 200, damping: 15 }}
          className="text-center mb-24"
        >
          <motion.div 
            className={`w-28 h-28 mx-auto ${tema.bg} border-4 ${tema.border} rounded-lg flex items-center justify-center mb-8 backdrop-blur-md`}
            style={{ boxShadow: `0 0 50px ${tema.glow}` }}
            whileHover={{ scale: 1.1, rotate: 5 }}
          >
            <HandMetal size={48} className={tema.icon} strokeWidth={2} />
          </motion.div>

          <motion.div className="overflow-hidden">
             <motion.h1 
                initial={{ y: "100%" }}
                animate={{ y: 0 }}
                transition={{ duration: 0.8, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
                className={`text-7xl font-black tracking-tighter ${tema.text} mb-6 uppercase`}
                style={{ fontFamily: 'Cinzel, serif' }}
             >
               Lutador
             </motion.h1>
          </motion.div>
          <motion.p 
             initial={{ opacity: 0 }}
             animate={{ opacity: 1 }}
             transition={{ duration: 1, delay: 0.6 }}
             className="text-lg text-red-200/60 max-w-2xl mx-auto font-bold leading-relaxed"
          >
            Seu corpo é a arma definitiva. Ignorando o aço e a pólvora, eles esmagam armaduras e ossos através de artes marciais aperfeiçoadas pela dor e disciplina.
          </motion.p>
        </motion.header>

        {/* Traits Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 mb-24">
          <PremiumCard
            glowColor={tema.glow}
            initial={{ opacity: 0, x: -50 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.4 }}
            className={`flex flex-col p-8 rounded-2xl ${tema.bg} ${tema.border} backdrop-blur-md`}
          >
            <HandMetal size={36} className={`${tema.icon} mb-4`} strokeWidth={1.5} />
            <h3 className={`text-2xl font-bold ${tema.text} mb-2 uppercase`} style={{ fontFamily: 'Cinzel, serif' }}>Punhos de Ferro</h3>
            <p className="text-slate-300 leading-relaxed text-sm">
              Sua mão fechada conta como arma marcial: rola Luta, soma o seu Mod. Força no dano e critica em 20 com x2. O dado sobe pela carreira, de 1d6 no nível 3 até 2d6 no 20, e no 14 a margem de crítico abre para 19 ou 20. Luva, encantamento e modificação somam no máximo uma categoria além disso.
            </p>
          </PremiumCard>

          <PremiumCard
            glowColor={tema.glow}
            initial={{ opacity: 0, x: 50 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.4, delay: 0.1 }}
            className={`flex flex-col p-8 rounded-2xl ${tema.bg} ${tema.border} backdrop-blur-md`}
          >
            <Trophy size={36} className={`${tema.icon} mb-4`} strokeWidth={1.5} />
            <h3 className={`text-2xl font-bold ${tema.text} mb-2 uppercase`} style={{ fontFamily: 'Cinzel, serif' }}>Estilo de Combate</h3>
            <p className="text-slate-300 leading-relaxed text-sm">
              No nível 18 o seu jeito de brigar vira escola. São oito estilos prontos, cada um com uma vantagem que só vale em certa situação e uma limitação do mesmo tamanho: <span className="text-orange-400">Boxe, Agarrão, Chute Baixo, Guarda Alta</span>, <span className="text-yellow-400">Contragolpe, Briga de Rua, Capoeira e Quebra-Ossos</span>. Dá para montar o seu com o Mestre, dentro dessa mesma medida.
            </p>
          </PremiumCard>

          <PremiumCard
            glowColor={tema.glow}
            initial={{ opacity: 0, y: 50 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.4, delay: 0.2 }}
            className={`flex flex-col p-8 rounded-2xl ${tema.bg} ${tema.border} backdrop-blur-md`}
          >
            <Flame size={36} className={`${tema.icon} mb-4`} strokeWidth={1.5} />
            <h3 className={`text-2xl font-bold ${tema.text} mb-2 uppercase`} style={{ fontFamily: 'Cinzel, serif' }}>Marcas de Guerra</h3>
            <p className="text-slate-300 leading-relaxed text-sm">
              Do nível 10 em diante, cada acerto seu deixa uma marca no corpo do sujeito, uma por turno, e elas ficam lá até o fim do combate. Com 2, acertar ele rende um golpe a mais por rodada. Com 3, a Defesa dele cai 2. Com 4, ele para de usar reação. Com 5, o seu próximo golpe entra com +5 de dano e limpa a conta. É a briga inteira virando desconto no mesmo alvo.
            </p>
          </PremiumCard>
          <PremiumCard
            glowColor={tema.glow}
            initial={{ opacity: 0, y: 50 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.4, delay: 0.3 }}
            className={`flex flex-col p-8 rounded-2xl ${tema.bg} ${tema.border} backdrop-blur-md`}
          >
            <Gauge size={36} className={`${tema.icon} mb-4`} strokeWidth={1.5} />
            <h3 className={`text-2xl font-bold ${tema.text} mb-2 uppercase`} style={{ fontFamily: 'Cinzel, serif' }}>Sobre a DT</h3>
            <p className="text-slate-300 leading-relaxed text-sm">
              Agarrar, derrubar, empurrar, desarmar e imobilizar são manobras, e agora estão no capítulo de Combate: você rola Luta contra 10 mais o Reflexos ou o Fortitude do alvo. Desde o nível 1 você rola com vantagem nas três primeiras. Marca de Guerra é outra história e não pede teste nenhum: ela gruda quando o golpe entra.
            </p>
          </PremiumCard>
        </div>

        <DetalhesClasse classe={classe} />
      </div>
    </div>
  );
};

export default Lutador;

