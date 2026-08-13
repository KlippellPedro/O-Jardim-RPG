import { motion } from 'framer-motion';
import { Sword, Users, Shield, ArrowRight } from 'lucide-react';
import type { IClasse } from '../../types/catalogo';
import { PremiumCard } from '../components/premium/PremiumCard';
import { DetalhesClasse } from '../../pages/Regras/components/DetalhesClasse';
import { obterTemaPorId } from '../themeMap';

export const Guerreiro = ({ classe }: { classe: IClasse }) => {
  const tema = obterTemaPorId(classe.id);

  return (
    <div className="min-h-screen text-orange-50 p-8 selection:bg-orange-500/30 overflow-hidden relative">
      {/* 3D WebGL Background */}
      <div className="fixed inset-0 z-0 bg-cover bg-center bg-no-repeat opacity-20 pointer-events-none" style={{ backgroundImage: "url('/assets/img/guerreiro_bg.webp')" }} />

      {/* Tactical / War Background Effects */}
      <div className="fixed inset-0 pointer-events-none z-0">
        {/* Tactical grid on the background */}
        <div className="absolute inset-0 opacity-[0.05] bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PHBhdGggZD0iTSAwIDQwIEwgNDAgNDAgTSA0MCAwIEwgNDAgNDAiIGZpbGw9Im5vbmUiIHN0cm9rZT0icmdiYSgyMzksIDY4LCA2OCwgMSkiIHN0cm9rZS13aWR0aD0iMSIvPjwvc3ZnPg==')] mix-blend-overlay" />

        {/* Embers of war */}
        {[...Array(15)].map((_, i) => (
          <motion.div
            key={i}
            className="absolute w-1 h-1 bg-orange-500 rounded-full"
            style={{
              left: `${Math.random() * 100}%`,
              bottom: 0,
            }}
            animate={{
              y: - (typeof window !== 'undefined' ? window.innerHeight : 1000),
              x: `+=${Math.random() * 100 - 50}`,
              opacity: [0, 1, 0],
            }}
            transition={{
              duration: Math.random() * 5 + 3,
              repeat: Infinity,
              ease: "easeOut",
              delay: Math.random() * 5
            }}
          />
        ))}
      </div>

      <div className="max-w-5xl mx-auto relative z-10 pt-16">
        {/* Header */}
        <motion.header 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          className="text-center mb-24"
        >
          <motion.div 
            className={`w-28 h-28 mx-auto ${tema.bg} ${tema.border} rounded-md flex items-center justify-center mb-8 shadow-2xl relative`}
          >
            <Shield size={48} className={`${tema.icon} z-10`} strokeWidth={1.5} />
            <Sword size={32} className={`${tema.icon} absolute bottom-3 right-3 z-10`} strokeWidth={1.5} />
          </motion.div>

          <motion.div className="overflow-hidden">
            <motion.h1 
               initial={{ y: "100%" }}
               animate={{ y: 0 }}
               transition={{ duration: 0.8, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
               className={`text-7xl font-black tracking-tight ${tema.text} mb-6 uppercase`}
               style={{ fontFamily: 'Cinzel, serif' }}
            >
              Guerreiro
            </motion.h1>
          </motion.div>
          <motion.p 
             initial={{ opacity: 0 }}
             animate={{ opacity: 1 }}
             transition={{ duration: 1, delay: 0.6 }}
             className="text-lg text-red-200/70 max-w-2xl mx-auto font-medium leading-relaxed"
          >
            Mestres táticos e arsenais ambulantes. Eles não lutam sozinhos; comandam batalhões, ditam o ritmo do combate e fornecem armamentos especiais para sua equipe.
          </motion.p>
        </motion.header>

        {/* Traits Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-24">
          <PremiumCard
            glowColor={tema.glow}
            initial={{ opacity: 0, x: -30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className={`flex flex-col p-8 ${tema.bg} ${tema.border} backdrop-blur-md`}
          >
            <Users size={36} className={`${tema.icon} mb-6`} strokeWidth={1.5} />
            <h3 className={`text-2xl font-bold ${tema.text} mb-3 uppercase tracking-wide`} style={{ fontFamily: 'Cinzel, serif' }}>Batalhão</h3>
            <p className="text-red-200/60 leading-relaxed text-sm">
              Escolha um aliado por estágio. Uma vez por rodada, gaste uma ação de movimento para comandar: um escolhido recebe +2 em seu próximo ataque ou teste físico, sem compartilhar poderes.
            </p>
          </PremiumCard>

          <PremiumCard
            glowColor={tema.glow}
            initial={{ opacity: 0, x: 30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className={`flex flex-col p-8 ${tema.bg} ${tema.border} backdrop-blur-md`}
          >
            <Sword size={36} className={`${tema.icon} mb-6`} strokeWidth={1.5} />
            <h3 className={`text-2xl font-bold ${tema.text} mb-3 uppercase tracking-wide`} style={{ fontFamily: 'Cinzel, serif' }}>Arsenal Especial</h3>
            <p className="text-orange-200/60 leading-relaxed text-sm">
              Selecione do seu arsenal armas, escudos e armaduras. Seus aliados do Batalhão podem comprá-los com desconto narrativo de 20% e ganham +1 para utilizá-los.
            </p>
          </PremiumCard>

          <PremiumCard
            glowColor={tema.glow}
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.4 }}
            className={`col-span-1 md:col-span-2 flex flex-col p-8 ${tema.bg} ${tema.border} backdrop-blur-md`}
          >
            <ArrowRight size={36} className={`${tema.icon} mb-6`} strokeWidth={1.5} />
            <h3 className={`text-2xl font-bold ${tema.text} mb-3 uppercase tracking-wide`} style={{ fontFamily: 'Cinzel, serif' }}>Implacável</h3>
            <p className="text-red-200/60 leading-relaxed text-sm">
              Antes de um ataque corpo a corpo, aceite −2 Defesa até o seu próximo turno para causar +4 de dano se acertar. Com a experiência, o risco compensa mais: contra-ataques contra quem erra ao seu lado, resistência a fogo e frio, vida vampírica ao golpear e, no auge, um ataque adicional que amedronta o alvo.
            </p>
          </PremiumCard>
        </div>

        <DetalhesClasse classe={classe} />
      </div>
    </div>
  );
};

export default Guerreiro;

