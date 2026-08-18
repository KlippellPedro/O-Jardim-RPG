import { motion } from 'framer-motion';
import { BookOpen, Brain, Infinity as InfinityIcon, BookKey, TreeDeciduous } from 'lucide-react';
import type { IRaca } from '../../types/catalogo';
import { PremiumCard } from '../components/premium/PremiumCard';
import { EscolhaRacialCards } from '../components/premium/EscolhaRacialCards';
import { EstagiosRaciais } from '../components/premium/EstagiosRaciais';
import { obterTemaPorId } from '../themeMap';

export const Elfo = ({ raca }: { raca: IRaca }) => {
  const tema = obterTemaPorId(raca.id);
  return (
    <div className="min-h-screen text-emerald-50 p-8 selection:bg-emerald-500/30 overflow-hidden relative">
      {/* Calm Forest Background */}
      <div 
        className="fixed inset-0 z-0 bg-cover bg-center bg-no-repeat bg-[#070c06]"
        style={{ backgroundImage: "url('/assets/img/elfo_bg.webp')" }}
      >
        {/* Dark/Green overlay for readability and subtle fantasy vibe */}
        <div className="absolute inset-0 bg-[#070c06]/80 mix-blend-multiply" />
        <div className="absolute inset-0 bg-gradient-to-b from-[#070c06]/50 via-emerald-950/40 to-[#070c06]/95" />
      </div>

      <div className="max-w-5xl mx-auto relative z-10 pt-16">
        {/* Header */}
        <motion.header 
          initial={{ opacity: 0, filter: 'blur(10px)' }}
          animate={{ opacity: 1, filter: 'blur(0px)' }}
          transition={{ duration: 1.5, ease: "easeOut" }}
          className="text-center mb-24"
        >
          <motion.div 
            className={`w-28 h-28 mx-auto border-2 ${tema.border} ${tema.bg} rounded-full flex items-center justify-center mb-8 backdrop-blur-md relative`}
          >
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 60, repeat: Infinity, ease: "linear" }}
              className={`absolute inset-0 border border-dashed ${tema.border} rounded-full`}
            />
            <BookOpen size={48} className={`${tema.icon} z-10`} strokeWidth={1} />
          </motion.div>

          <motion.div className="overflow-hidden">
             <motion.h1 
                initial={{ y: "100%" }}
                animate={{ y: 0 }}
                transition={{ duration: 0.8, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
                className={`text-7xl font-serif font-light tracking-widest ${tema.text} mb-6 uppercase`}
                style={{ fontFamily: 'Cinzel, serif' }}
             >
               Elfo
             </motion.h1>
          </motion.div>
          <motion.p 
             initial={{ opacity: 0 }}
             animate={{ opacity: 1 }}
             transition={{ duration: 1, delay: 0.6 }}
             className="text-lg text-emerald-100/50 max-w-2xl mx-auto font-medium leading-relaxed font-serif"
          >
            Não envelhece e não esquece: são séculos de leitura empilhados num Intelecto que passa do teto que vale pra todo mundo. Vem de Nadalon, fala Finlandês, e escolhe uma das seis Linhagens: é isso que separa um Elfo de Sombras de um Elfo de Tempestades.
          </motion.p>
        </motion.header>

        {/* Traits Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-24">
          {[
            { icon: InfinityIcon, title: "Fisiologia Imortal", desc: "Não envelhece e é imune a envelhecimento sobrenatural.", delay: 0 },
            { icon: Brain, title: "Intelecto Élfico", desc: "Receba +4 em Inteligência. Somente esse bônus racial pode levar Inteligência acima do limite natural 20, até o máximo 24.", delay: 0.2 },
            { icon: BookKey, title: "Memória Milenar", desc: "Quatro rerrolagens por sessão, utilizáveis somente em testes de Inteligência. Ao gastar, rerrole e use o novo resultado.", delay: 0.4 },
            { icon: TreeDeciduous, title: "Herança Ancestral", desc: "Ao adquirir esta raça, receba um Legado adicional e escolha uma das seis Linhagens Élficas, recebendo suas características exclusivas.", delay: 0.6 },
          ].map((trait, index) => (
            <PremiumCard
              key={index}
              glowColor={tema.glow}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: trait.delay, duration: 0.5 }}
              className={`flex items-start gap-6 p-8 rounded-none ${tema.bg} border-l-2 ${tema.border} backdrop-blur-md group`}
            >
              <div className={`w-16 h-16 shrink-0 rounded-full ${tema.bg} flex items-center justify-center border ${tema.border} transition-colors`}>
                <trait.icon size={28} className={tema.icon} strokeWidth={1} />
              </div>
              <div>
                <h3 className={`text-2xl font-serif font-medium ${tema.text} mb-2`} style={{ fontFamily: 'Cinzel, serif' }}>{trait.title}</h3>
                <p className="text-emerald-200/50 leading-relaxed text-sm font-serif">
                  {trait.desc}
                </p>
              </div>
            </PremiumCard>
          ))}
        </div>

        <EstagiosRaciais
          raca={raca}
          tema={tema}
          titulo="Idade"
          descricao="Elfo não envelhece, só acumula leitura. Os degraus abrem sozinhos por nível total: a Linhagem se aprofunda no Ancião e se abre por inteiro no Milenar."
        />

        <EscolhaRacialCards raca={raca} tema={tema} />
      </div>
    </div>
  );
};

export default Elfo;
