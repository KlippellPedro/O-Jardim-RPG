import { motion } from 'framer-motion';
import { Crown, Sparkles, Eye, HandHeart, Landmark } from 'lucide-react';
import type { IRaca } from '../../types/catalogo';

import { PremiumCard } from '../components/premium/PremiumCard';
import { EscolhaRacialCards } from '../components/premium/EscolhaRacialCards';
import { EstagiosRaciais } from '../components/premium/EstagiosRaciais';
import { obterTemaPorId } from '../themeMap';

interface DivinoProps {
  raca: IRaca;
}

export const Divino = ({ raca }: DivinoProps) => {
  const tema = obterTemaPorId(raca.id);
  return (
    <div className="min-h-screen text-yellow-50 p-8 selection:bg-yellow-500/30 overflow-hidden relative">
      {/* Radiant Gradient Background */}
      <div className="fixed inset-0 z-0 bg-black">
        <div
          className="absolute inset-0"
          style={{
            background: 'radial-gradient(circle at 50% 15%, rgba(250,204,21,0.16), transparent 55%), radial-gradient(circle at 20% 85%, rgba(120,53,15,0.30), transparent 55%), #0c0904',
          }}
        />
        <div className="absolute inset-0 bg-gradient-to-b from-[#0c0904]/40 via-transparent to-[#0c0904]/90" />
      </div>

      {/* Divine Radiance Effects */}
      <div className="fixed inset-0 pointer-events-none z-0">
        <div className="absolute top-[10%] left-[35%] w-[40%] h-[40%] bg-yellow-700/20 blur-[160px] rounded-full mix-blend-screen" />
        <motion.div
          className="absolute top-[45%] left-[50%] -translate-x-1/2 -translate-y-1/2 w-72 h-72 bg-amber-400/10 blur-[100px] rounded-full mix-blend-screen"
          animate={{ scale: [1, 1.15, 1], opacity: [0.5, 0.9, 0.5] }}
          transition={{ duration: 5, repeat: Infinity, ease: 'easeInOut' }}
        />
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
            style={{ boxShadow: `0 0 30px ${tema.glow}` }}
          >
            <Crown size={48} className={`${tema.icon} z-10`} strokeWidth={1.5} />
          </motion.div>

          <motion.div className="overflow-hidden">
             <motion.h1
                initial={{ y: '100%' }}
                animate={{ y: 0 }}
                transition={{ duration: 0.8, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
                className={`text-7xl font-bold tracking-tight ${tema.text} mb-6 uppercase`}
                style={{ fontFamily: 'Cinzel, serif' }}
             >
               Divino
             </motion.h1>
          </motion.div>
          <motion.p
             initial={{ opacity: 0 }}
             animate={{ opacity: 1 }}
             transition={{ duration: 1, delay: 0.6 }}
             className="text-lg text-yellow-200/60 max-w-2xl mx-auto font-medium leading-relaxed"
          >
            Carrega sangue de um deus, grande ou pequeno, cultuado ou esquecido faz séculos. Divindade inteira está fora de alcance, e o que sobrou já basta para ser adorado, temido ou caçado por gente que nunca perguntou a opinião dele.
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
            <Sparkles size={40} className={`${tema.icon} shrink-0`} strokeWidth={1.5} />
            <div>
              <h3 className={`text-2xl font-bold ${tema.text} mb-3`} style={{ fontFamily: 'Cinzel, serif' }}>Sangue Divino</h3>
              <p className="text-yellow-200/60 leading-relaxed text-sm">
                Receba +4 em Vontade e vantagem para resistir a qualquer coisa que tente controlar, subjugar ou apagar quem você é.
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
              <h3 className={`text-2xl font-bold ${tema.text} mb-3`} style={{ fontFamily: 'Cinzel, serif' }}>Presença que Pesa</h3>
              <p className="text-yellow-200/60 leading-relaxed text-sm">
                Criatura sensível ao sagrado ou ao profano sente que tem algo errado com você mesmo disfarçado: desvantagem em Furtividade e em Enganação para se disfarçar diante de quem tenha devoção ou vínculo religioso ativo. Seguidor e inimigo da sua linhagem costumam te notar antes do resto do grupo.
              </p>
            </div>
          </PremiumCard>

          <PremiumCard
            glowColor={tema.glow}
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.3 }}
            className={`flex gap-6 p-8 rounded-xl ${tema.bg} ${tema.border} backdrop-blur-md`}
          >
            <HandHeart size={40} className={`${tema.icon} shrink-0`} strokeWidth={1.5} />
            <div>
              <h3 className={`text-2xl font-bold ${tema.text} mb-3`} style={{ fontFamily: 'Cinzel, serif' }}>Bênção Concedida</h3>
              <p className="text-yellow-200/60 leading-relaxed text-sm">
                Uma vez por sessão, quando você ou um aliado a até 9 m falhar num teste, gaste uma reação e 4 Mana para transformar aquela falha comum em sucesso comum. Isso não transforma o impossível em possível e não funciona sobre falha crítica.
              </p>
            </div>
          </PremiumCard>

          <PremiumCard
            glowColor={tema.glow}
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.4 }}
            className={`flex gap-6 p-8 rounded-xl ${tema.bg} ${tema.border} backdrop-blur-md`}
          >
            <Landmark size={40} className={`${tema.icon} shrink-0`} strokeWidth={1.5} />
            <div>
              <h3 className={`text-2xl font-bold ${tema.text} mb-3`} style={{ fontFamily: 'Cinzel, serif' }}>Nome que se Invoca</h3>
              <p className="text-yellow-200/60 leading-relaxed text-sm">
                Uma vez por sessão, num lugar onde exista culto, templo ou lembrança do seu deus, você consegue abrigo, uma informação ou um favor pequeno sem precisar de teste. Quem te reconhece costuma cobrar do jeito de sempre: devoção, pedido ou culpa.
              </p>
            </div>
          </PremiumCard>
        </div>

        <EstagiosRaciais
          raca={raca}
          tema={tema}
          titulo="Ascendência"
          descricao="O sangue leva a campanha inteira para acordar por completo. Cada degrau da Ascendência entra por nível total, até o corpo aguentar vestir por três rodadas a forma que o deus teria."
        />

        <EscolhaRacialCards raca={raca} tema={tema} />
      </div>
    </div>
  );
};

export default Divino;
