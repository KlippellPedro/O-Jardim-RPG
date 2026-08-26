import { motion } from 'framer-motion';
import { Skull, Layers, HeartPulse, Gauge } from 'lucide-react';
import type { IClasse } from '../../types/catalogo';
import { PremiumCard } from '../components/premium/PremiumCard';
import { DetalhesClasse } from '../../pages/Regras/components/DetalhesClasse';
import { obterTemaPorId } from '../themeMap';

// Sem arte propria ainda: fundo em gradiente puro (sem imagem), pra nao
// referenciar um asset _bg.webp que nao existe. Trocar por arte real quando
// tiver.
export const Devorador = ({ classe }: { classe: IClasse }) => {
  const tema = obterTemaPorId(classe.id);

  return (
    <div className="min-h-screen text-red-50 p-8 selection:bg-red-500/30 overflow-hidden relative">
      <div className="fixed inset-0 z-0 bg-[#0a0303]" />
      <div className="fixed inset-0 pointer-events-none z-0">
        <div className="absolute top-[20%] right-[15%] w-[55%] h-[55%] bg-red-900/20 blur-[160px] mix-blend-screen" />
        <motion.div
          className="absolute inset-x-0 top-1/2 h-px bg-red-600/10"
          animate={{ opacity: [0.1, 0.4, 0.1] }}
          transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
        />
      </div>

      <div className="max-w-5xl mx-auto relative z-10 pt-16">
        <motion.header
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.6 }}
          className="text-center mb-24"
        >
          <motion.div
            className={`w-28 h-28 mx-auto ${tema.bg} ${tema.border} rounded-full flex items-center justify-center mb-8 shadow-2xl relative backdrop-blur-md`}
          >
            <Skull size={48} className={`${tema.icon} z-10`} strokeWidth={1.5} />
          </motion.div>

          <motion.div className="overflow-hidden">
            <motion.h1
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              transition={{ duration: 0.8, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
              className={`text-7xl font-bold tracking-tight ${tema.text} mb-6 uppercase`}
              style={{ fontFamily: 'Cinzel, serif' }}
            >
              Devorador
            </motion.h1>
          </motion.div>
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 1, delay: 0.6 }}
            className="text-lg text-red-100/60 max-w-2xl mx-auto font-medium leading-relaxed"
          >
            Não nasce com poder nenhum. O que carrega vem de quem já morreu: mate ou chegue perto o bastante de um corpo ainda quente, devore o que sobrou dele, e uma parte real da força da vítima grava um espaço vazio dentro de você.
          </motion.p>
        </motion.header>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 mb-24">
          <PremiumCard
            glowColor={tema.glow}
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className={`flex flex-col p-8 rounded-lg ${tema.bg} ${tema.border} backdrop-blur-md`}
          >
            <Layers size={36} className={`${tema.icon} mb-4`} strokeWidth={1.5} />
            <h3 className={`text-2xl font-bold ${tema.text} mb-2 uppercase tracking-wide`} style={{ fontFamily: 'Cinzel, serif' }}>Banquete de Poder</h3>
            <p className="text-red-100/60 leading-relaxed text-sm">
              Quando um humanoide morre perto de você, pode devorá-lo até o fim daquela cena. Escolha uma habilidade ou um poder que a classe dele tinha - travado ao que um personagem do seu próprio nível já teria acesso - e grave num slot vazio, com o nome e a aparência do que devorou. Você mantém mais um slot ativo a cada estágio, até cinco no fim, quando o teto de nível pra devorar desaparece de vez.
            </p>
          </PremiumCard>

          <PremiumCard
            glowColor={tema.glow}
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className={`flex flex-col p-8 rounded-lg ${tema.bg} ${tema.border} backdrop-blur-md`}
          >
            <HeartPulse size={36} className={`${tema.icon} mb-4`} strokeWidth={1.5} />
            <h3 className={`text-2xl font-bold ${tema.text} mb-2 uppercase tracking-wide`} style={{ fontFamily: 'Cinzel, serif' }}>Instintos do Devorador</h3>
            <p className="text-red-100/60 leading-relaxed text-sm">
              Devorar tanto muda o próprio corpo. Aprenda um instinto predatório por estágio - faro de sangue, mandíbula reforçada, fome voraz e mais - escolhendo quatro entre oito possíveis, sempre ativos depois de aprendidos.
            </p>
          </PremiumCard>

          <PremiumCard
            glowColor={tema.glow}
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.4 }}
            className={`flex flex-col p-8 rounded-lg ${tema.bg} ${tema.border} backdrop-blur-md`}
          >
            <Skull size={36} className={`${tema.icon} mb-4`} strokeWidth={1.5} />
            <h3 className={`text-2xl font-bold ${tema.text} mb-2 uppercase tracking-wide`} style={{ fontFamily: 'Cinzel, serif' }}>Banquete Final</h3>
            <p className="text-red-100/60 leading-relaxed text-sm">
              Uma vez por sessão, ao devorar um humanoide derrotado nesta cena, grave de uma vez todos os poderes e a habilidade que ele carregava, ignorando por essa devoração o teto de slots. Eles ficam ativos até o fim da cena atual; depois, os excedentes se apagam.
            </p>
          </PremiumCard>

          <PremiumCard
            glowColor={tema.glow}
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.6 }}
            className={`flex flex-col p-8 rounded-lg ${tema.bg} ${tema.border} backdrop-blur-md`}
          >
            <Gauge size={36} className={`${tema.icon} mb-4`} strokeWidth={1.5} />
            <h3 className={`text-2xl font-bold ${tema.text} mb-2 uppercase tracking-wide`} style={{ fontFamily: 'Cinzel, serif' }}>Sobre a DT</h3>
            <p className="text-red-100/60 leading-relaxed text-sm">
              Todo efeito seu que obriga um alvo a resistir rola Luta no momento em que aciona: o resultado vira a DT que ele precisa alcançar.
            </p>
          </PremiumCard>
        </div>

        <DetalhesClasse classe={classe} />
      </div>
    </div>
  );
};

export default Devorador;
