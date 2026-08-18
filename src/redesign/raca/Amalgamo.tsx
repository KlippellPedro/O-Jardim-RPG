import { motion } from 'framer-motion';
import { Dna, ShieldAlert, Zap, Layers } from 'lucide-react';
import type { IRaca } from '../../types/catalogo';
import { PremiumCard } from '../components/premium/PremiumCard';
import { CatalogoRacial } from '../components/premium/CatalogoRacial';
import { EscolhaRacialCards } from '../components/premium/EscolhaRacialCards';
import { EstagiosRaciais } from '../components/premium/EstagiosRaciais';
import { obterTemaPorId } from '../themeMap';

export const Amalgamo = ({ raca }: { raca: IRaca }) => {
  const tema = obterTemaPorId(raca.id);

  return (
    <div className="min-h-screen text-pink-50 p-8 selection:bg-pink-500/30 overflow-hidden relative">
      {/* Chimera Background */}
      <div 
        className="fixed inset-0 z-0 bg-cover bg-center bg-no-repeat bg-black"
        style={{ backgroundImage: "url('/assets/img/amalgamo_bg.webp')" }}
      >
        <div className="absolute inset-0 bg-pink-950/80 mix-blend-multiply" />
        <div className="absolute inset-0 bg-gradient-to-b from-[#0a0206]/40 via-transparent to-[#0a0206]/90" />
      </div>

      {/* Chimera / Mixed Soul Background Effects */}
      <div className="fixed inset-0 pointer-events-none z-0">
        <div className="absolute top-[20%] left-[20%] w-[30%] h-[30%] bg-pink-900/20 blur-[150px] mix-blend-screen" />
        <div className="absolute bottom-[20%] right-[20%] w-[30%] h-[30%] bg-blue-900/20 blur-[150px] mix-blend-screen" />
        <div className="absolute top-[50%] left-[50%] w-[30%] h-[30%] bg-emerald-900/20 blur-[150px] mix-blend-screen" />
        
        {/* Stitching / Fragmented background */}
        <motion.div 
          className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAiIGhlaWdodD0iMjAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PHBhdGggZD0iTTAgMjAgTDEwIDEwIEwyMCAyMCIgZmlsbD0ibm9uZSIgc3Ryb2tlPSJyZ2JhKDIzNiwgNzIsIDE1MywgMC4xKSIgc3Ryb2tlLXdpZHRoPSIxIi8+PC9zdmc+')] opacity-20"
          animate={{ backgroundPosition: ["0px 0px", "20px 20px"] }}
          transition={{ duration: 10, repeat: Infinity, ease: "linear" }}
        />
      </div>

      <div className="max-w-5xl mx-auto relative z-10 pt-16">
        {/* Header */}
        <motion.header 
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          className="text-center mb-24"
        >
          <motion.div 
            className={`w-28 h-28 mx-auto ${tema.bg} ${tema.border} rounded-2xl flex items-center justify-center mb-8 backdrop-blur-md relative overflow-hidden`}
            style={{ boxShadow: `0 0 50px ${tema.glow}` }}
          >
            {/* Split colors representing chimera */}
            <div className="absolute inset-y-0 left-0 w-1/2 bg-blue-500/20" />
            <div className="absolute inset-y-0 right-0 w-1/2 bg-emerald-500/20" />
            
            <Dna size={48} className={`${tema.icon} z-10`} strokeWidth={1.5} />
          </motion.div>

          <motion.div className="overflow-hidden">
             <motion.h1 
                initial={{ y: "100%" }}
                animate={{ y: 0 }}
                transition={{ duration: 0.8, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
                className={`text-7xl font-black tracking-tight ${tema.text} mb-6 uppercase`}
                style={{ fontFamily: 'Cinzel, serif' }}
             >
               Amálgamo
             </motion.h1>
          </motion.div>
          <motion.p 
             initial={{ opacity: 0 }}
             animate={{ opacity: 1 }}
             transition={{ duration: 1, delay: 0.6 }}
             className="text-lg text-pink-200/60 max-w-2xl mx-auto font-medium leading-relaxed"
          >
            Um corpo só, montado com mais de uma criatura. O que ele herda é a mistura, e não o pacote racial das partes: aguenta melhor o que ataca a carne, aguenta melhor o que ataca a cabeça, e conhece Fragmentos que consegue expressar por algumas rodadas antes de o corpo cobrar a conta.
          </motion.p>
        </motion.header>

        {/* Traits Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-24">
          <PremiumCard
            glowColor={tema.glow}
            initial={{ opacity: 0, x: -20, y: 20 }}
            whileInView={{ opacity: 1, x: 0, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className={`flex gap-6 p-6 rounded-2xl ${tema.bg} ${tema.border} backdrop-blur-md`}
          >
            <ShieldAlert size={32} className={`${tema.icon} shrink-0`} strokeWidth={1.5} />
            <div>
              <h3 className={`text-xl font-bold ${tema.text} mb-2`} style={{ fontFamily: 'Cinzel, serif' }}>Anatomia Plural</h3>
              <p className="text-pink-200/60 leading-relaxed text-sm">
                Sua biologia é variada demais pra ceder toda de uma vez. Uma vez por cena, rerrole uma falha em Fortitude contra doença, veneno ou alteração corporal.
              </p>
            </div>
          </PremiumCard>

          <PremiumCard
            glowColor={tema.glow}
            initial={{ opacity: 0, x: 20, y: 20 }}
            whileInView={{ opacity: 1, x: 0, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className={`flex gap-6 p-6 rounded-2xl ${tema.bg} ${tema.border} backdrop-blur-md`}
          >
            <Layers size={32} className={`${tema.icon} shrink-0`} strokeWidth={1.5} />
            <div>
              <h3 className={`text-xl font-bold ${tema.text} mb-2`} style={{ fontFamily: 'Cinzel, serif' }}>Alma Coral</h3>
              <p className="text-pink-200/60 leading-relaxed text-sm">
                Tem mais de uma cabeça ali dentro segurando a linha. Uma vez por sessão, rerrole uma falha em um teste de Vontade. Isso não devolve as memórias completas dos seres originais.
              </p>
            </div>
          </PremiumCard>

          <PremiumCard
            glowColor={tema.glow}
            initial={{ opacity: 0, x: -20, y: 20 }}
            whileInView={{ opacity: 1, x: 0, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className={`flex gap-6 p-6 rounded-2xl ${tema.bg} ${tema.border} backdrop-blur-md`}
          >
            <Dna size={32} className={`${tema.icon} shrink-0`} strokeWidth={1.5} />
            <div>
              <h3 className={`text-xl font-bold ${tema.text} mb-2`} style={{ fontFamily: 'Cinzel, serif' }}>Reconfiguração Visceral</h3>
              <p className="text-pink-200/60 leading-relaxed text-sm">
                Uma vez por cena, após sofrer dano, gaste 4 Mana e a reação para criar Resistência 5 àquele exato tipo de dano (incluindo o que ativou o efeito) até seu próximo turno.
              </p>
            </div>
          </PremiumCard>

          <PremiumCard
            glowColor={tema.glow}
            initial={{ opacity: 0, x: 20, y: 20 }}
            whileInView={{ opacity: 1, x: 0, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.3 }}
            className={`flex gap-6 p-6 rounded-2xl ${tema.bg} ${tema.border} backdrop-blur-md`}
          >
            <Zap size={32} className={`${tema.icon} shrink-0`} strokeWidth={1.5} />
            <div>
              <h3 className={`text-xl font-bold ${tema.text} mb-2`} style={{ fontFamily: 'Cinzel, serif' }}>Assimilação & Convergência</h3>
              <p className="text-pink-200/60 leading-relaxed text-sm">
                Inicie com 3 Fragmentos assimilados. Use 6 Mana e ação para entrar em Surto de Convergência (expressa um terceiro Fragmento por 3 rodadas) antes de sofrer Cansaço.
              </p>
            </div>
          </PremiumCard>
        </div>

        <EstagiosRaciais raca={raca} tema={tema} />

        <EscolhaRacialCards raca={raca} tema={tema} />

        <CatalogoRacial
          raca={raca}
          tema={tema}
          campo="fragmentos"
          titulo="Fragmentos"
          descricao="Traços que o Amálgamo pode conhecer. Assimilação Controlada e Surto de Convergência definem quantos ficam ativos e por quanto tempo."
        />
      </div>
    </div>
  );
};

export default Amalgamo;
