import { motion } from 'framer-motion';
import { Droplet, Minimize2, ArrowDownToLine } from 'lucide-react';
import type { IRaca } from '../../types/catalogo';

import { PremiumCard } from '../components/premium/PremiumCard';
import { obterGruposEscolhaRacial, obterTracosOpcaoRacial, descreverOpcaoRacial } from '../../services/racaService';
import { obterTemaPorId } from '../themeMap';

interface SlimeProps {
  raca: IRaca;
}

export const Slime = ({ raca }: SlimeProps) => {
  const tema = obterTemaPorId(raca.id);
  return (
    <div className="min-h-screen text-green-50 p-8 selection:bg-green-500/30 overflow-hidden relative">
      {/* Background Image */}
      <div 
        className="fixed inset-0 z-0 bg-cover bg-center bg-no-repeat bg-black"
        style={{ backgroundImage: "url('/assets/img/slime_bg.webp')" }}
      >
        <div className="absolute inset-0 bg-slate-950/80 mix-blend-multiply" />
        <div className="absolute inset-0 bg-gradient-to-b from-[#07140c]/40 via-transparent to-[#07140c]/90" />
      </div>

      {/* Acid/Slime Background Effects */}
      <div className="fixed inset-0 pointer-events-none z-0">
        <div className="absolute top-[20%] right-[30%] w-[40%] h-[40%] bg-lime-900/20 blur-[120px] rounded-full mix-blend-screen" />
        <div className="absolute bottom-[20%] left-[20%] w-[50%] h-[50%] bg-emerald-900/20 blur-[150px] rounded-full mix-blend-screen" />
        
        {/* Slime drips */}
        {[...Array(6)].map((_, i) => (
          <motion.div
            key={i}
            className="absolute top-0 bg-lime-400/30 rounded-b-full blur-[2px]"
            style={{
              width: Math.random() * 40 + 20,
              left: `${Math.random() * 100}%`,
            }}
            animate={{ height: [0, Math.random() * 200 + 100, 0] }}
            transition={{
              duration: Math.random() * 4 + 4,
              repeat: Infinity,
              ease: "easeInOut",
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
          transition={{ duration: 0.8, type: "spring", bounce: 0.5 }}
          className="text-center mb-24"
        >
          <motion.div 
            className={`w-28 h-28 mx-auto ${tema.bg} border-[3px] ${tema.border} rounded-[30%_70%_70%_30%/30%_30%_70%_70%] flex items-center justify-center mb-8 backdrop-blur-md relative`}
            animate={{ 
              borderRadius: [
                "30% 70% 70% 30% / 30% 30% 70% 70%", 
                "70% 30% 30% 70% / 70% 70% 30% 30%", 
                "30% 70% 70% 30% / 30% 30% 70% 70%"
              ] 
            }}
            transition={{ duration: 8, repeat: Infinity, ease: "linear" }}
          >
            <Droplet size={48} className={`${tema.icon} z-10`} strokeWidth={1.5} />
          </motion.div>

          <motion.div className="overflow-hidden">
             <motion.h1 
                initial={{ y: "100%" }}
                animate={{ y: 0 }}
                transition={{ duration: 0.8, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
                className={`text-7xl font-bold tracking-tight ${tema.text} mb-6 uppercase`}
                style={{ fontFamily: 'Cinzel, serif' }}
             >
               Slime
             </motion.h1>
          </motion.div>
          <motion.p 
             initial={{ opacity: 0 }}
             animate={{ opacity: 1 }}
             transition={{ duration: 1, delay: 0.6 }}
             className="text-lg text-lime-100/70 max-w-2xl mx-auto font-medium leading-relaxed"
          >
            Sem ossos. Sem amarras corporais. Um organismo semissólido capaz de passar por frestas impossíveis, absorver impactos contundentes e contorcer a própria anatomia.
          </motion.p>
        </motion.header>

        {/* Traits Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-24">
          <PremiumCard
            glowColor={tema.glow}
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className={`flex flex-col items-center text-center p-8 rounded-3xl ${tema.bg} border-2 ${tema.border} backdrop-blur-md`}
          >
            <Minimize2 size={40} className={`${tema.icon} mb-6`} strokeWidth={1.5} />
            <h3 className={`text-2xl font-bold ${tema.text} mb-3`} style={{ fontFamily: 'Cinzel, serif' }}>Corpo Maleável</h3>
            <p className="text-lime-100/60 leading-relaxed text-sm">
              Sem equipamento rígido maior que a passagem, você pode atravessar aberturas de pelo menos 15 cm. O trecho apertado conta como terreno difícil e você não pode terminar o movimento dentro dele.
            </p>
          </PremiumCard>

          <PremiumCard
            glowColor={tema.glow}
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className={`flex flex-col items-center text-center p-8 rounded-3xl ${tema.bg} border-2 ${tema.border} backdrop-blur-md`}
          >
            <ArrowDownToLine size={40} className={`${tema.icon} mb-6`} strokeWidth={1.5} />
            <h3 className={`text-2xl font-bold ${tema.text} mb-3`} style={{ fontFamily: 'Cinzel, serif' }}>Amortecimento Gelatinoso</h3>
            <p className="text-lime-100/60 leading-relaxed text-sm">
              Reduza pela metade o dano sofrido por quedas. Você também recebe vantagem em testes para escapar de agarrões ou amarras que não sejam hermeticamente fechadas.
            </p>
          </PremiumCard>
        </div>

        {/* Custom Lineages */}
        {(() => {
          const grupos = obterGruposEscolhaRacial(raca);
          return grupos.map((grupo) => (
            <section key={grupo.campo} className="pt-4 mb-16">
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.4 }}
                className="mb-8"
              >
                <h2 className={`text-4xl font-bold ${tema.text} mb-3 uppercase tracking-wider`} style={{ fontFamily: 'Cinzel, serif' }}>
                  {grupo.rotulo}
                </h2>
                <p className="text-lime-200/60 text-lg">{grupo.descricao}</p>
              </motion.div>
              
              <div className="overflow-x-auto rounded-xl border border-lime-800/40 bg-lime-950/20 backdrop-blur-md shadow-lg shadow-lime-900/10">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-lime-800/40 bg-lime-950/60">
                      <th className="p-6 font-bold text-lime-100 uppercase tracking-widest text-sm" style={{ fontFamily: 'Cinzel, serif' }}>Opção</th>
                      {grupo.campo !== 'linhagemId' && <th className="p-6 font-bold text-lime-100 uppercase tracking-widest text-sm" style={{ fontFamily: 'Cinzel, serif' }}>Descrição</th>}
                      <th className="p-6 font-bold text-lime-100 uppercase tracking-widest text-sm" style={{ fontFamily: 'Cinzel, serif' }}>Traços</th>
                    </tr>
                  </thead>
                  <tbody>
                    {grupo.opcoes.map((opcao) => {
                      const tracos = obterTracosOpcaoRacial(opcao);
                      const titleLower = opcao.titulo.toLowerCase();
                      
                      let lineageStyle = { glow: 'rgba(132,204,22,0.25)', text: 'text-lime-400', border: 'border-lime-500/50', bg: 'hover:bg-lime-900/20' };
                      if (titleLower.includes('ácido') || titleLower.includes('corrosivo')) {
                        lineageStyle = { glow: 'rgba(234,179,8,0.25)', text: 'text-yellow-400', border: 'border-yellow-500/50', bg: 'hover:bg-yellow-900/20' };
                      } else if (titleLower.includes('sangue') || titleLower.includes('rubro')) {
                        lineageStyle = { glow: 'rgba(239,68,68,0.25)', text: 'text-red-400', border: 'border-red-500/50', bg: 'hover:bg-red-900/20' };
                      } else if (titleLower.includes('gelo') || titleLower.includes('congelante')) {
                        lineageStyle = { glow: 'rgba(56,189,248,0.25)', text: 'text-sky-400', border: 'border-sky-500/50', bg: 'hover:bg-sky-900/20' };
                      }

                      return (
                        <tr 
                          key={opcao.id} 
                          className={`border-b border-lime-800/20 transition-colors ${lineageStyle.bg}`}
                        >
                          <td className={`p-6 align-top border-l-2 ${lineageStyle.border} ${lineageStyle.text} w-1/4`}>
                            <span className="font-bold text-lg block" style={{ fontFamily: 'Cinzel, serif' }}>{opcao.titulo}</span>
                          </td>
                          {grupo.campo !== 'linhagemId' && (
                            <td className="p-6 align-top text-lime-100/70 text-sm leading-relaxed w-1/3">
                              {descreverOpcaoRacial(opcao)}
                            </td>
                          )}
                          <td className="p-6 align-top">
                            {tracos.length > 0 ? (
                              <div className="space-y-4">
                                {tracos.map(traco => (
                                  <div key={traco.id} className="bg-black/20 p-3 rounded-lg border border-lime-900/30">
                                    <h4 className="text-sm font-bold text-lime-100 mb-1">{traco.titulo}</h4>
                                    {traco.descricao && <p className="text-xs text-lime-200/50 leading-relaxed">{traco.descricao}</p>}
                                  </div>
                                ))}
                              </div>
                            ) : (
                              <span className="text-lime-500/30 italic text-sm">Sem traços adicionais.</span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </section>
          ));
        })()}
      </div>
    </div>
  );
};

export default Slime;
