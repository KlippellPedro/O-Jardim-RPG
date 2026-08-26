import { motion } from 'framer-motion';
import { Moon, Sparkles, Footprints, CloudMoon } from 'lucide-react';
import type { IRaca } from '../../types/catalogo';

import { PremiumCard } from '../components/premium/PremiumCard';
import { EscolhaRacialCards } from '../components/premium/EscolhaRacialCards';
import { EstagiosRaciais } from '../components/premium/EstagiosRaciais';
import { obterTemaPorId } from '../themeMap';

interface OniricoProps {
  raca: IRaca;
}

export const Onirico = ({ raca }: OniricoProps) => {
  const tema = obterTemaPorId(raca.id);
  return (
    <div className="min-h-screen text-indigo-50 p-8 selection:bg-indigo-500/30 overflow-hidden relative">
      {/* Dream Veil Background */}
      <div
        className="fixed inset-0 z-0 bg-black bg-cover bg-center bg-no-repeat"
        style={{ backgroundImage: "url('/assets/img/onirico_bg.webp')" }}
      >
        <div
          className="absolute inset-0"
          style={{
            background: 'radial-gradient(circle at 20% 30%, rgba(129,140,248,0.20), transparent 55%), radial-gradient(circle at 80% 70%, rgba(49,46,129,0.30), transparent 55%)',
          }}
        />
        <div className="absolute inset-0 bg-gradient-to-b from-[#05040d]/55 via-[#05040d]/25 to-[#05040d]/90" />
      </div>

      {/* Floating Dream Motes */}
      <div className="fixed inset-0 pointer-events-none z-0">
        <div className="absolute top-[25%] left-[20%] w-[45%] h-[45%] bg-indigo-800/20 blur-[150px] rounded-full mix-blend-screen" />
        <div className="absolute bottom-[15%] right-[15%] w-[35%] h-[35%] bg-violet-900/15 blur-[130px] rounded-full mix-blend-screen" />

        {[...Array(30)].map((_, i) => (
          <motion.div
            key={i}
            className="absolute rounded-full"
            style={{
              width: Math.random() * 3 + 1,
              height: Math.random() * 3 + 1,
              backgroundColor: 'rgba(199,210,254,0.7)',
              boxShadow: '0 0 8px rgba(165,180,252,0.6)',
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
            }}
            animate={{ opacity: [0, 1, 0], y: `+=${Math.random() * 60 - 30}` }}
            transition={{
              duration: Math.random() * 6 + 4,
              repeat: Infinity,
              ease: 'easeInOut',
              delay: Math.random() * 4,
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
            <Moon size={48} className={`${tema.icon} z-10`} strokeWidth={1.5} />
          </motion.div>

          <motion.div className="overflow-hidden">
             <motion.h1
                initial={{ y: '100%' }}
                animate={{ y: 0 }}
                transition={{ duration: 0.8, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
                className={`text-7xl font-bold tracking-tight ${tema.text} mb-6 uppercase`}
                style={{ fontFamily: 'Cinzel, serif' }}
             >
               Onírico
             </motion.h1>
          </motion.div>
          <motion.p
             initial={{ opacity: 0 }}
             animate={{ opacity: 1 }}
             transition={{ duration: 1, delay: 0.6 }}
             className="text-lg text-indigo-200/60 max-w-2xl mx-auto font-medium leading-relaxed"
          >
            Nasceu em Sonhar, o mundo dos sonhos. Não é uma pessoa dormindo: tem corpo, nome e vontade próprios, e leva consigo as regras estranhas do lugar onde foi criado.
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
            <Footprints size={40} className={`${tema.icon} shrink-0`} strokeWidth={1.5} />
            <div>
              <h3 className={`text-2xl font-bold ${tema.text} mb-3`} style={{ fontFamily: 'Cinzel, serif' }}>Passo Entre-Sonhos</h3>
              <p className="text-indigo-200/60 leading-relaxed text-sm">
                Uma vez por cena, gaste seu Movimento e 3 Mana para sumir de onde está e aparecer num espaço desocupado que você enxergue a até 9 m. Isso não provoca reações.
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
            <CloudMoon size={40} className={`${tema.icon} shrink-0`} strokeWidth={1.5} />
            <div>
              <h3 className={`text-2xl font-bold ${tema.text} mb-3`} style={{ fontFamily: 'Cinzel, serif' }}>Véu do Sonhar</h3>
              <p className="text-indigo-200/60 leading-relaxed text-sm">
                Vantagem para resistir a medo, a perda de Sanidade e a ilusões. Ninguém consegue te achar ou te rastrear pelo sonho de outra criatura.
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
            <Sparkles size={40} className={`${tema.icon} shrink-0`} strokeWidth={1.5} />
            <div>
              <h3 className={`text-2xl font-bold ${tema.text} mb-3`} style={{ fontFamily: 'Cinzel, serif' }}>Leitura de Sonhos</h3>
              <p className="text-indigo-200/60 leading-relaxed text-sm">
                Uma vez por descanso, enquanto uma criatura dorme e permite, toque nela e veja pedaços soltos do sonho que ela está tendo: uma imagem, uma emoção, um medo que volta sempre.
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
            <Moon size={40} className={`${tema.icon} shrink-0`} strokeWidth={1.5} />
            <div>
              <h3 className={`text-2xl font-bold ${tema.text} mb-3`} style={{ fontFamily: 'Cinzel, serif' }}>Pesadelo Manifesto</h3>
              <p className="text-indigo-200/60 leading-relaxed text-sm">
                Uma vez por cena, gaste uma ação e 5 Mana para fazer uma criatura a até 15 m ver por um instante o pior pesadelo que ela carrega. Misticismo contra a Vontade dela; falhando, ela fica Amedrontada por duas rodadas e sem reações nesse tempo. Passando, perde só a reação até o começo do seu próximo turno.
              </p>
            </div>
          </PremiumCard>
        </div>

        <EstagiosRaciais
          raca={raca}
          tema={tema}
          titulo="Vigília"
          descricao="O Onírico nasce em Sonhar e aprende a manter sua forma no mundo desperto. A cada degrau da Vigília, ele consegue trazer uma parte maior de sua terra natal para perto de si."
        />

        <EscolhaRacialCards raca={raca} tema={tema} />

        {/* Limitation note */}
        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="rounded-xl border border-indigo-800/30 bg-black/20 p-6 mb-16"
        >
          <h4 className="text-sm font-bold text-indigo-200 uppercase tracking-widest mb-2">Ancoragem Frágil</h4>
          <p className="text-indigo-200/50 text-sm leading-relaxed">
            Passadas 24 horas sem um descanso completo ligado a Sonhar, seu corpo começa a perder a forma. Até fazer esse descanso, sua Mana máxima cai pela metade, arredondada para baixo.
          </p>
        </motion.div>
      </div>
    </div>
  );
};

export default Onirico;
