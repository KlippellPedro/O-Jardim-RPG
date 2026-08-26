import { motion } from 'framer-motion';
import { Tent, Backpack, Compass, Map, Sparkles, Gauge } from 'lucide-react';
import type { IClasse } from '../../types/catalogo';
import { PremiumCard } from '../components/premium/PremiumCard';
import { DetalhesClasse } from '../../pages/Regras/components/DetalhesClasse';
import { obterTemaPorId } from '../themeMap';

export const ViajanteClasse = ({ classe }: { classe: IClasse }) => {
  const tema = obterTemaPorId(classe.id);

  return (
    <div className="min-h-screen text-green-50 p-8 selection:bg-green-500/30 overflow-hidden relative">
      {/* 3D WebGL Background */}
      <div className="fixed inset-0 z-0 bg-cover bg-center bg-no-repeat opacity-20 pointer-events-none" style={{ backgroundImage: "url('/assets/img/viajanteclasse_bg.webp')" }} />

      {/* Nature / Travel Background Effects */}
      <div className="fixed inset-0 pointer-events-none z-0">
        <div className="absolute top-[30%] left-[20%] w-[50%] h-[50%] bg-emerald-900/10 blur-[150px] mix-blend-screen" />
        
        {/* Falling leaves / dust motes of the road */}
        {[...Array(15)].map((_, i) => (
          <motion.div
            key={i}
            className="absolute w-2 h-2 rounded-full"
            style={{
              backgroundColor: Math.random() > 0.5 ? 'rgba(52, 211, 153, 0.4)' : 'rgba(217, 119, 6, 0.4)',
              left: `${Math.random() * 100}%`,
              top: '-10%',
            }}
            animate={{
              y: (typeof window !== 'undefined' ? window.innerHeight : 1000) + 100,
              x: `+=${Math.random() * 100 - 50}`,
              rotate: 360,
            }}
            transition={{
              duration: Math.random() * 8 + 8,
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
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.6 }}
          className="text-center mb-24"
        >
          <motion.div 
            className={`w-28 h-28 mx-auto ${tema.bg} border-2 ${tema.border} rounded-full flex items-center justify-center mb-8 relative backdrop-blur-md`}
            style={{ boxShadow: `0 0 30px ${tema.glow}` }}
          >
            <Compass size={48} className={`${tema.icon} z-10`} strokeWidth={1.5} />
            <motion.div 
              className="absolute inset-0 border border-emerald-500/30 rounded-full"
              animate={{ rotate: 360 }}
              transition={{ duration: 15, repeat: Infinity, ease: "linear" }}
            />
          </motion.div>

          <motion.div className="overflow-hidden">
             <motion.h1 
                initial={{ y: "100%" }}
                animate={{ y: 0 }}
                transition={{ duration: 0.8, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
                className={`text-7xl font-bold tracking-tight ${tema.text} mb-6 uppercase`}
                style={{ fontFamily: 'Cinzel, serif' }}
             >
               Viajante
             </motion.h1>
          </motion.div>
          <motion.p 
             initial={{ opacity: 0 }}
             animate={{ opacity: 1 }}
             transition={{ duration: 1, delay: 0.6 }}
             className="text-lg text-emerald-100/60 max-w-2xl mx-auto font-medium leading-relaxed"
          >
            Eles não pertencem a lugar nenhum, e por isso, sobrevivem em todos. Mestres da exploração, mitigam o cansaço do grupo e utilizam as lições práticas aprendidas nas estradas de inúmeros mundos.
          </motion.p>
        </motion.header>

        {/* Traits Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 mb-24">
          <PremiumCard
            glowColor={tema.glow}
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.4 }}
            className={`flex flex-col p-8 rounded-xl ${tema.bg} ${tema.border} backdrop-blur-md`}
          >
            <Backpack size={36} className={`${tema.icon} mb-4`} strokeWidth={1.5} />
            <h3 className={`text-2xl font-bold ${tema.text} mb-2 uppercase`} style={{ fontFamily: 'Cinzel, serif' }}>Passaporte Entre Mundos</h3>
            <p className="text-emerald-100/60 leading-relaxed text-sm">
              O que você carrega de toda estrada já andada: bônus permanentes em Sobrevivência e contra o ambiente, um jeito de achar abrigo quando precisa, e no fim da carreira, atravessar uma fronteira conhecida com o grupo inteiro sem nem precisar rolar dado.
            </p>
          </PremiumCard>

          <PremiumCard
            glowColor={tema.glow}
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.4, delay: 0.15 }}
            className={`flex flex-col p-8 rounded-xl ${tema.bg} ${tema.border} backdrop-blur-md`}
          >
            <Map size={36} className={`${tema.icon} mb-4`} strokeWidth={1.5} />
            <h3 className={`text-2xl font-bold ${tema.text} mb-2 uppercase`} style={{ fontFamily: 'Cinzel, serif' }}>Lições da Estrada</h3>
            <p className="text-emerald-100/60 leading-relaxed text-sm">
              Aprenda um truque por estágio, tirado de encarar estrada de verdade: são oito possíveis, ligados a perícias fora de combate como Sobrevivência, Diplomacia, Investigação e Adestramento, e você aprende quatro. Cada lição aprendida continua valendo pra sempre.
            </p>
          </PremiumCard>

          <PremiumCard
            glowColor={tema.glow}
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.4, delay: 0.3 }}
            className={`flex flex-col p-8 rounded-xl ${tema.bg} ${tema.border} backdrop-blur-md`}
          >
            <Tent size={36} className={`${tema.icon} mb-4`} strokeWidth={1.5} />
            <h3 className={`text-2xl font-bold ${tema.text} mb-2 uppercase`} style={{ fontFamily: 'Cinzel, serif' }}>Companheiros de Jornada</h3>
            <p className="text-emerald-100/60 leading-relaxed text-sm">
              Uma vez por sessão, até três aliados ignoram os efeitos de Cansaço e as penalidades de viagem por uma cena, sustentados por suas histórias, preparos e rotinas de estrada. Os pontos de Cansaço continuam registrados, só deixam de pesar por um tempo.
            </p>
          </PremiumCard>

          <PremiumCard
            glowColor={tema.glow}
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.4, delay: 0.45 }}
            className={`flex flex-col p-8 rounded-xl ${tema.bg} ${tema.border} backdrop-blur-md`}
          >
            <Sparkles size={36} className={`${tema.icon} mb-4`} strokeWidth={1.5} />
            <h3 className={`text-2xl font-bold ${tema.text} mb-2 uppercase`} style={{ fontFamily: 'Cinzel, serif' }}>Sem Fronteiras</h3>
            <p className="text-emerald-100/60 leading-relaxed text-sm">
              Uma vez por sessão, você e até cinco aliados ignoram terreno difícil, ganham +6 m de Movimento e ficam imunes a dano e condições puramente ambientais por uma cena inteira - e cada um pode gastar a própria Ação de Movimento pra se teleportar até 12 m uma vez durante o efeito.
            </p>
          </PremiumCard>

          <PremiumCard
            glowColor={tema.glow}
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.4, delay: 0.6 }}
            className={`flex flex-col p-8 rounded-xl ${tema.bg} ${tema.border} backdrop-blur-md`}
          >
            <Gauge size={36} className={`${tema.icon} mb-4`} strokeWidth={1.5} />
            <h3 className={`text-2xl font-bold ${tema.text} mb-2 uppercase`} style={{ fontFamily: 'Cinzel, serif' }}>Sobre a DT</h3>
            <p className="text-emerald-100/60 leading-relaxed text-sm">
              Todo efeito seu que obriga um alvo a resistir rola Sobrevivência no momento em que aciona: o resultado vira a DT que ele precisa alcançar.
            </p>
          </PremiumCard>
        </div>

        <DetalhesClasse classe={classe} />
      </div>
    </div>
  );
};

export default ViajanteClasse;

