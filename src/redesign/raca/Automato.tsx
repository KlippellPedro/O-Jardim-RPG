import { motion } from 'framer-motion';
import { Cpu, Zap, Settings, ShieldAlert, Layers } from 'lucide-react';
import type { IRaca } from '../../types/catalogo';
import { PremiumCard } from '../components/premium/PremiumCard';
import { CatalogoRacial } from '../components/premium/CatalogoRacial';
import { EscolhaRacialCards } from '../components/premium/EscolhaRacialCards';
import { EstagiosRaciais } from '../components/premium/EstagiosRaciais';
import { obterTemaPorId } from '../themeMap';

export const Automato = ({ raca }: { raca: IRaca }) => {
  const tema = obterTemaPorId(raca.id);
  return (
    <div className="min-h-screen text-cyan-50 p-8 selection:bg-cyan-500/30 overflow-hidden relative font-mono">
      {/* Cybernetic Tech Background */}
      <div 
        className="fixed inset-0 z-0 bg-cover bg-center bg-no-repeat bg-black"
        style={{ backgroundImage: "url('/assets/img/automato_tech_bg.webp')" }}
      >
        <div className="absolute inset-0 bg-slate-950/80 mix-blend-multiply" />
        <div className="absolute inset-0 bg-gradient-to-b from-[#000508]/40 via-transparent to-[#000508]/90" />
      </div>

      {/* Sci-Fi/Tech Foreground Overlays */}
      <div className="fixed inset-0 pointer-events-none z-0">
        {/* Hexagonal Tech Grid */}
        <div className="absolute inset-0 opacity-[0.03] bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iMTAzLjkyIiB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciPjxwYXRoIGQ9Ik0zMCAwTDIwIDE3LjMyTDAgMTcuMzJMMTAgMzQuNjRMMCA1MS45NkwyMCA1MS45NkwzMCA2OS4yOEw0MCA1MS45Nkw2MCA1MS45Nkw1MCAzNC42NEw2MCAxNy4zMkw0MCAxNy4zMkwzMCAweiIgZmlsbD0ibm9uZSIgc3Ryb2tlPSIjMjJkM2VlIiBzdHJva2Utd2lkdGg9IjIiLz48L3N2Zz4=')] bg-[length:60px_103px]" />

        {/* Scanning lines */}
        <motion.div 
          className="absolute inset-x-0 h-[2px] bg-cyan-500/20 shadow-[0_0_10px_rgba(6,182,212,0.8)]"
          animate={{ top: ["0%", "100%", "0%"] }}
          transition={{ duration: 10, repeat: Infinity, ease: "linear" }}
        />
      </div>

      <div className="max-w-5xl mx-auto relative z-10 pt-16">
        {/* Header */}
        <motion.header 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          className="text-center mb-24"
        >
          <motion.div 
            className={`w-32 h-32 mx-auto ${tema.bg} border-2 ${tema.border} rounded-none flex items-center justify-center mb-8 backdrop-blur-md relative overflow-hidden`}
          >
            {/* Tech scanner effect inside the square */}
            <motion.div 
              className="absolute inset-0 bg-gradient-to-b from-transparent via-cyan-400/20 to-transparent"
              animate={{ y: ["-100%", "100%"] }}
              transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
            />
            <Cpu size={56} className={`${tema.icon} z-10`} strokeWidth={1} />
          </motion.div>

          {/* Masked Animated Text */}
          <motion.div className="overflow-hidden">
            <motion.h1 
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              transition={{ duration: 0.8, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
              className={`text-7xl font-mono font-bold tracking-tight ${tema.text} mb-6 uppercase`}
              style={{ fontFamily: 'Cinzel, serif' }}
            >
              Autômato
            </motion.h1>
          </motion.div>

          <motion.p 
             initial={{ opacity: 0 }}
             animate={{ opacity: 1 }}
             transition={{ duration: 1, delay: 0.6 }}
             className="text-lg text-cyan-200/60 max-w-2xl mx-auto font-mono leading-relaxed"
          >
            Construto consciente saído da A.X.I.S, com núcleo próprio e vontade própria: não deve obediência a criador nenhum. Cura não funciona nele: quem conserta é engenheiro. O chassi, bípede ou quadrúpede, é decisão de criação. Fala Inglês.
          </motion.p>
        </motion.header>

        {/* Traits Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-24 font-mono">
          <PremiumCard
            glowColor={tema.glow}
            initial={{ opacity: 0, x: -20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className={`flex flex-col p-6 rounded-none ${tema.bg} border ${tema.border} backdrop-blur-md`}
          >
            <ShieldAlert size={32} className={`${tema.icon} mb-4`} strokeWidth={1.5} />
            <h3 className={`text-xl font-bold ${tema.text} mb-3`} style={{ fontFamily: 'Cinzel, serif' }}>Corpo Artificial</h3>
            <p className="text-cyan-200/60 leading-relaxed text-sm">
              Imune a atordoamento, doenças, encantamentos, enjoo, fadiga, sono e venenos (salvo modificação Máquina Viva). Não respira, não come e não dorme.
            </p>
          </PremiumCard>

          <PremiumCard
            glowColor={tema.glow}
            initial={{ opacity: 0, x: 20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className={`flex flex-col p-6 rounded-none ${tema.bg} border ${tema.border} backdrop-blur-md`}
          >
            <Zap size={32} className={`${tema.icon} mb-4`} strokeWidth={1.5} />
            <h3 className={`text-xl font-bold ${tema.text} mb-3`} style={{ fontFamily: 'Cinzel, serif' }}>Núcleo Autônomo</h3>
            <p className="text-cyan-200/60 leading-relaxed text-sm">
              Você possui vontade própria independente de criador. Sua Mana é na verdade a Energia do Núcleo. Seu Nível Total é o nível do núcleo. Se a Vida zerar, você só morre de vez se a morte for concluída e o núcleo, destruído.
            </p>
          </PremiumCard>

          <PremiumCard
            glowColor={tema.glow}
            initial={{ opacity: 0, x: -20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className={`flex flex-col p-6 rounded-none ${tema.bg} border ${tema.border} backdrop-blur-md`}
          >
            <Settings size={32} className={`${tema.icon} mb-4`} strokeWidth={1.5} />
            <h3 className={`text-xl font-bold ${tema.text} mb-3`} style={{ fontFamily: 'Cinzel, serif' }}>Reparo Mecânico</h3>
            <p className="text-cyan-200/60 leading-relaxed text-sm">
              Descansos e curas biológicas/mágicas não recuperam Vida. Requer 1 hora e um teste de Ofício(Engenharia) (DT 15 + metade do Nível Total) para curar meros 5 de Vida. 
            </p>
          </PremiumCard>

          <PremiumCard
            glowColor={tema.glow}
            initial={{ opacity: 0, x: 20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.3 }}
            className={`flex flex-col p-6 rounded-none ${tema.bg} border ${tema.border} backdrop-blur-md`}
          >
            <Layers size={32} className={`${tema.icon} mb-4`} strokeWidth={1.5} />
            <h3 className={`text-xl font-bold ${tema.text} mb-3`} style={{ fontFamily: 'Cinzel, serif' }}>Arquitetura Modular</h3>
            <p className="text-cyan-200/60 leading-relaxed text-sm">
              Limite de modificações é 1 + (Nível/2). Modificações ativas exigem passivas. Instalar leva um dia de trabalho e um teste de Engenharia. O corpo é peça trocável, como o de qualquer máquina.
            </p>
          </PremiumCard>
        </div>

        <EstagiosRaciais raca={raca} tema={tema} />

        <EscolhaRacialCards raca={raca} tema={tema} />

        <CatalogoRacial
          raca={raca}
          tema={tema}
          campo="modificacoes"
          titulo="Modificações"
          descricao="Módulos instaláveis no chassi. O limite de modificações e os pré-requisitos ficam em Arquitetura Modular."
        />
      </div>
    </div>
  );
};

export default Automato;
