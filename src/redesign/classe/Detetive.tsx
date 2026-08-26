import { motion } from 'framer-motion';
import { Search, Fingerprint, Eye, Gauge } from 'lucide-react';
import type { IClasse } from '../../types/catalogo';
import { PremiumCard } from '../components/premium/PremiumCard';
import { DetalhesClasse } from '../../pages/Regras/components/DetalhesClasse';
import { obterTemaPorId } from '../themeMap';

export const Detetive = ({ classe }: { classe: IClasse }) => {
  const tema = obterTemaPorId(classe.id);

  return (
    <div className="min-h-screen text-amber-50 p-8 selection:bg-amber-500/30 overflow-hidden relative">
      <div
        className="fixed inset-0 z-0 bg-[#0d0904] bg-cover bg-center bg-no-repeat opacity-[0.45]"
        style={{ backgroundImage: "url('/assets/img/detetive_bg.webp')" }}
      />
      <div className="fixed inset-0 z-0 bg-gradient-to-b from-[#0d0904]/35 via-[#0d0904]/55 to-[#0d0904]/95" />
      <div className="fixed inset-0 pointer-events-none z-0">
        <div className="absolute top-[15%] left-[15%] w-[55%] h-[55%] bg-amber-900/15 blur-[160px] mix-blend-screen" />
        <div className="absolute inset-0 opacity-[0.04] bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNCIgaGVpZ2h0PSI0IiB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciPjxjaXJjbGUgY3g9IjEiIGN5PSIxIiByPSIwLjUiIGZpbGw9IiNmZmYiLz48L3N2Zz4=')] bg-repeat" />
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
            <Search size={48} className={`${tema.icon} z-10`} strokeWidth={1.5} />
          </motion.div>

          <motion.div className="overflow-hidden">
            <motion.h1
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              transition={{ duration: 0.8, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
              className={`text-7xl font-bold tracking-tight ${tema.text} mb-6 uppercase`}
              style={{ fontFamily: 'Cinzel, serif' }}
            >
              Detetive
            </motion.h1>
          </motion.div>
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 1, delay: 0.6 }}
            className="text-lg text-amber-100/60 max-w-2xl mx-auto font-medium leading-relaxed"
          >
            Lê uma cena antes de qualquer um: pega o detalhe fora do lugar, a mentira mal contada, o padrão que ninguém mais viu. Não é sobre ter uma resposta pronta, é sobre nunca aceitar a primeira explicação.
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
            <Eye size={36} className={`${tema.icon} mb-4`} strokeWidth={1.5} />
            <h3 className={`text-2xl font-bold ${tema.text} mb-2 uppercase tracking-wide`} style={{ fontFamily: 'Cinzel, serif' }}>Dedução Metódica</h3>
            <p className="text-amber-100/60 leading-relaxed text-sm">
              Examine uma cena, pessoa ou objeto e role Investigação: mesmo numa falha, ainda aparece um detalhe real secundário. Com o tempo isso vira Ação Padrão, passa a valer sobre relatos de segunda mão e culmina numa pergunta verdadeira, uma vez por sessão, limitada ao que as evidências examinadas permitem inferir.
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
            <Fingerprint size={36} className={`${tema.icon} mb-4`} strokeWidth={1.5} />
            <h3 className={`text-2xl font-bold ${tema.text} mb-2 uppercase tracking-wide`} style={{ fontFamily: 'Cinzel, serif' }}>Perfil do Suspeito</h3>
            <p className="text-amber-100/60 leading-relaxed text-sm">
              Aprenda uma especialidade de investigação por estágio - interrogatório, perícia forense, vigilância, perfil psicológico e mais - escolhendo quatro entre oito possíveis. Cada uma aprendida fica disponível pra sempre.
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
            <Search size={36} className={`${tema.icon} mb-4`} strokeWidth={1.5} />
            <h3 className={`text-2xl font-bold ${tema.text} mb-2 uppercase tracking-wide`} style={{ fontFamily: 'Cinzel, serif' }}>Caso Encerrado</h3>
            <p className="text-amber-100/60 leading-relaxed text-sm">
              Uma vez por sessão, aponte publicamente quem ou o que causou o mistério investigado. Acertando, ganhe vantagem contra o alvo apontado pelo resto da cena. Errando, você apenas recebe a confirmação do erro e gasta o uso; a resposta correta não é revelada.
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
            <p className="text-amber-100/60 leading-relaxed text-sm">
              Todo efeito seu que obriga um alvo a resistir rola Investigação no momento em que aciona: o resultado vira a DT que ele precisa alcançar.
            </p>
          </PremiumCard>
        </div>

        <DetalhesClasse classe={classe} />
      </div>
    </div>
  );
};

export default Detetive;
