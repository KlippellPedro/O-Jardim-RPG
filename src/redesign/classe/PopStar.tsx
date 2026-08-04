import { motion } from 'framer-motion';
import { Star, Users, Megaphone } from 'lucide-react';
import type { IClasse } from '../../types/catalogo';
import { PremiumCard } from '../components/premium/PremiumCard';
import { DetalhesClasse } from '../../pages/Regras/components/DetalhesClasse';
import { obterTemaPorId } from '../themeMap';

export const PopStar = ({ classe }: { classe: IClasse }) => {
  const tema = obterTemaPorId(classe.id);

  return (
    <div className="min-h-screen text-pink-50 p-8 selection:bg-pink-500/30 overflow-hidden relative">
      {/* 3D WebGL Background */}
      <div className="fixed inset-0 z-0 bg-cover bg-center bg-no-repeat opacity-20 pointer-events-none" style={{ backgroundImage: "url('/assets/img/popstar_bg.jpg')" }} />

      {/* Glamour / Flash Background Effects */}
      <div className="fixed inset-0 pointer-events-none z-0">
        <div className="absolute top-[20%] left-[20%] w-[60%] h-[60%] bg-pink-900/20 blur-[150px] rounded-full mix-blend-screen" />
        
        {/* Camera flashes */}
        {[...Array(6)].map((_, i) => (
          <motion.div
            key={i}
            className="absolute bg-white rounded-full blur-[10px]"
            style={{
              width: Math.random() * 100 + 50,
              height: Math.random() * 100 + 50,
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
            }}
            animate={{ opacity: [0, 1, 0], scale: [0.5, 1, 0.5] }}
            transition={{
              duration: 0.3,
              repeat: Infinity,
              repeatDelay: Math.random() * 5 + 2
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
            className={`w-28 h-28 mx-auto ${tema.bg} ${tema.border} rounded-full flex items-center justify-center mb-8 relative overflow-hidden backdrop-blur-md`}
            style={{ boxShadow: `0 0 50px ${tema.glow}` }}
          >
            <Star size={48} className={`${tema.icon} z-10`} strokeWidth={1.5} />
          </motion.div>

          <motion.div className="overflow-hidden">
             <motion.h1 
                initial={{ y: "100%" }}
                animate={{ y: 0 }}
                transition={{ duration: 0.8, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
                className={`text-7xl font-bold tracking-tight ${tema.text} mb-6 uppercase`}
                style={{ fontFamily: 'Cinzel, serif' }}
             >
               Pop Star
             </motion.h1>
          </motion.div>
          <motion.p 
             initial={{ opacity: 0 }}
             animate={{ opacity: 1 }}
             transition={{ duration: 1, delay: 0.6 }}
             className="text-lg text-pink-200/60 max-w-2xl mx-auto font-medium leading-relaxed"
          >
            A fama é uma arma afiada. Com uma legião de fãs, contatos de agência e patrocínios milionários, o Pop Star domina a narrativa pública e ganha recursos através da publicidade.
          </motion.p>
        </motion.header>

        {/* Traits Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-24">
          <PremiumCard
            glowColor={tema.glow}
            initial={{ opacity: 0, scale: 0.95 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.4 }}
            className={`flex flex-col p-8 rounded-xl ${tema.bg} ${tema.border} backdrop-blur-md`}
          >
            <Megaphone size={36} className={`${tema.icon} mb-6`} strokeWidth={1.5} />
            <h3 className={`text-2xl font-bold ${tema.text} mb-3`} style={{ fontFamily: 'Cinzel, serif' }}>Publi</h3>
            <p className="text-pink-200/60 leading-relaxed text-sm">
              Sua imagem vende. Marcas podem oferecer contratos ou itens temáticos compatíveis com a campanha em troca da sua publicidade. Isso não gera dinheiro infinito, mas sim equipamentos ou suporte tático.
            </p>
          </PremiumCard>

          <PremiumCard
            glowColor={tema.glow}
            initial={{ opacity: 0, scale: 0.95 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.4, delay: 0.2 }}
            className={`flex flex-col p-8 rounded-xl ${tema.bg} ${tema.border} backdrop-blur-md`}
          >
            <Users size={36} className={`${tema.icon} mb-6`} strokeWidth={1.5} />
            <h3 className={`text-2xl font-bold ${tema.text} mb-3`} style={{ fontFamily: 'Cinzel, serif' }}>Agência de Marketing</h3>
            <p className="text-pink-200/60 leading-relaxed text-sm">
              Você possui uma equipe profissional te assessorando. Uma vez por sessão, a agência pode preparar um evento para o grupo, conter uma crise de imagem local ou localizar um contato vital na cidade.
            </p>
          </PremiumCard>
        </div>

        <DetalhesClasse classe={classe} />
      </div>
    </div>
  );
};

export default PopStar;

