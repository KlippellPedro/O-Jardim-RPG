import { motion } from 'framer-motion';
import { Shuffle, Fingerprint, Eye } from 'lucide-react';
import type { IRaca } from '../../types/catalogo';

import { PremiumCard } from '../components/premium/PremiumCard';
import { EscolhaRacialCards } from '../components/premium/EscolhaRacialCards';
import { obterTemaPorId } from '../themeMap';

interface MimicoProps {
  raca: IRaca;
}

export const Mimico = ({ raca }: MimicoProps) => {
  const tema = obterTemaPorId(raca.id);
  return (
    <div className="min-h-screen text-fuchsia-50 p-8 selection:bg-fuchsia-500/30 overflow-hidden relative">
      {/* Shifting Gradient Background */}
      <div className="fixed inset-0 z-0 bg-black">
        <motion.div
          className="absolute inset-0"
          style={{
            background: 'radial-gradient(circle at 30% 20%, rgba(192,132,252,0.16), transparent 55%), radial-gradient(circle at 70% 80%, rgba(232,121,249,0.14), transparent 55%), #0b0713',
          }}
          animate={{ opacity: [0.7, 1, 0.7] }}
          transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut' }}
        />
        <div className="absolute inset-0 bg-gradient-to-b from-[#0b0713]/40 via-transparent to-[#0b0713]/90" />
      </div>

      {/* Unstable Silhouette Effects */}
      <div className="fixed inset-0 pointer-events-none z-0">
        <div className="absolute top-[15%] left-[15%] w-[45%] h-[45%] bg-fuchsia-900/20 blur-[150px] rounded-full mix-blend-screen" />
        <div className="absolute bottom-[10%] right-[15%] w-[40%] h-[40%] bg-purple-800/15 blur-[130px] rounded-full mix-blend-screen" />

        {/* Flickering copies */}
        {[...Array(18)].map((_, i) => (
          <motion.div
            key={i}
            className="absolute rounded-full border border-fuchsia-400/20"
            style={{
              width: Math.random() * 60 + 20,
              height: Math.random() * 60 + 20,
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
            }}
            animate={{ opacity: [0, 0.5, 0], scale: [0.8, 1.1, 0.8] }}
            transition={{
              duration: Math.random() * 4 + 3,
              repeat: Infinity,
              ease: 'easeInOut',
              delay: Math.random() * 3,
            }}
          />
        ))}
      </div>

      <div className="max-w-5xl mx-auto relative z-10 pt-16">
        {/* Header */}
        <motion.header
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: 'easeOut' }}
          className="text-center mb-24"
        >
          <motion.div
            className={`w-28 h-28 mx-auto ${tema.bg} border-2 ${tema.border} rounded-full flex items-center justify-center mb-8 backdrop-blur-md relative`}
          >
            <Shuffle size={48} className={`${tema.icon} z-10`} strokeWidth={1.5} />
          </motion.div>

          <motion.div className="overflow-hidden">
             <motion.h1
                initial={{ y: '100%' }}
                animate={{ y: 0 }}
                transition={{ duration: 0.8, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
                className={`text-7xl font-bold tracking-tight ${tema.text} mb-6 uppercase`}
                style={{ fontFamily: 'Cinzel, serif' }}
             >
               Mímico
             </motion.h1>
          </motion.div>
          <motion.p
             initial={{ opacity: 0 }}
             animate={{ opacity: 1 }}
             transition={{ duration: 1, delay: 0.6 }}
             className="text-lg text-fuchsia-200/60 max-w-2xl mx-auto font-medium leading-relaxed"
          >
            Corpo sem forma verdadeira, só um jeito de ser que ele decide usar hoje. Copia rosto, roupa e trejeito de quem já observou de perto, mas por baixo da imitação continua sendo a mesma criatura de sempre.
          </motion.p>
        </motion.header>

        {/* Traits Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-24">
          <PremiumCard
            glowColor={tema.glow}
            initial={{ opacity: 0, x: -30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className={`flex gap-6 p-8 rounded-xl ${tema.bg} ${tema.border} backdrop-blur-md`}
          >
            <Fingerprint size={40} className={`${tema.icon} shrink-0`} strokeWidth={1.5} />
            <div>
              <h3 className={`text-2xl font-bold ${tema.text} mb-3`} style={{ fontFamily: 'Cinzel, serif' }}>Forma Emprestada</h3>
              <p className="text-fuchsia-200/60 leading-relaxed text-sm">
                Uma vez por cena, gaste uma ação para copiar a aparência de uma criatura de tamanho próximo que você tenha tocado ou observado de perto. A cópia é só aparência: nenhum atributo, sentido, ataque ou imunidade vem junto.
              </p>
            </div>
          </PremiumCard>

          <PremiumCard
            glowColor={tema.glow}
            initial={{ opacity: 0, x: 30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className={`flex gap-6 p-8 rounded-xl ${tema.bg} ${tema.border} backdrop-blur-md`}
          >
            <Eye size={40} className={`${tema.icon} shrink-0`} strokeWidth={1.5} />
            <div>
              <h3 className={`text-2xl font-bold ${tema.text} mb-3`} style={{ fontFamily: 'Cinzel, serif' }}>Instinto de Camuflagem</h3>
              <p className="text-fuchsia-200/60 leading-relaxed text-sm">
                Enquanto permanece imóvel, sua textura e coloração se fundem ao ambiente ao redor. Receba vantagem em testes de Furtividade nesses momentos.
              </p>
            </div>
          </PremiumCard>
        </div>

        {/* Custom Choices */}
        <EscolhaRacialCards raca={raca} tema={tema} />
      </div>
    </div>
  );
};

export default Mimico;
