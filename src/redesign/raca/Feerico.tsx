import { motion } from 'framer-motion';
import { Sparkles, EyeOff } from 'lucide-react';
import type { IRaca } from '../../types/catalogo';
import { PremiumCard } from '../components/premium/PremiumCard';
import { obterGruposEscolhaRacial, obterTracosOpcaoRacial, descreverOpcaoRacial } from '../../services/racaService';
import { obterTemaPorId } from '../themeMap';

interface FeericoProps {
  raca: IRaca;
}

export const Feerico = ({ raca }: FeericoProps) => {
  const tema = obterTemaPorId(raca.id);
  return (
    <div className="min-h-screen text-pink-50 p-8 selection:bg-pink-500/30 overflow-hidden relative">
      {/* Fey Background */}
      <div 
        className="fixed inset-0 z-0 bg-cover bg-center bg-no-repeat bg-black"
        style={{ backgroundImage: "url('/assets/img/feerico_bg.webp')" }}
      >
        <div className="absolute inset-0 bg-pink-950/80 mix-blend-multiply" />
        <div className="absolute inset-0 bg-gradient-to-b from-[#110514]/40 via-transparent to-[#110514]/90" />
      </div>

      {/* Glamour Background Effects */}
      <div className="fixed inset-0 pointer-events-none z-0">
        <div className="absolute top-[20%] left-[30%] w-[50%] h-[50%] bg-pink-900/20 blur-[150px] rounded-full mix-blend-screen" />
        <div className="absolute bottom-[20%] right-[20%] w-[40%] h-[40%] bg-fuchsia-900/20 blur-[120px] rounded-full mix-blend-screen" />
        
        {/* Fairy dust */}
        {[...Array(50)].map((_, i) => (
          <motion.div
            key={i}
            className="absolute rounded-full bg-white"
            style={{
              width: Math.random() * 3 + 1,
              height: Math.random() * 3 + 1,
              boxShadow: '0 0 8px rgba(236, 72, 153, 0.8)',
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
            }}
            animate={{
              opacity: [0, 1, 0],
              scale: [0, 1.5, 0],
            }}
            transition={{
              duration: Math.random() * 2 + 1,
              repeat: Infinity,
              ease: "easeInOut",
              delay: Math.random() * 2
            }}
          />
        ))}
      </div>

      <div className="max-w-5xl mx-auto relative z-10 pt-16">
        {/* Header */}
        <motion.header 
          initial={{ opacity: 0, scale: 1.1 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 1, ease: "easeOut" }}
          className="text-center mb-24"
        >
          <motion.div 
            className={`w-28 h-28 mx-auto ${tema.bg} ${tema.border} rounded-2xl flex items-center justify-center mb-8 backdrop-blur-md rotate-45`}
          >
            <div className="-rotate-45">
              <Sparkles size={48} className={tema.icon} strokeWidth={1.5} />
            </div>
          </motion.div>

          <motion.div className="overflow-hidden">
             <motion.h1 
                initial={{ y: "100%" }}
                animate={{ y: 0 }}
                transition={{ duration: 0.8, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
                className={`text-7xl font-bold tracking-tight ${tema.text} mb-6 uppercase`}
                style={{ fontFamily: 'Cinzel, serif' }}
             >
               Feérico
             </motion.h1>
          </motion.div>
          <motion.p 
             initial={{ opacity: 0 }}
             animate={{ opacity: 1 }}
             transition={{ duration: 1, delay: 0.6 }}
             className="text-lg text-pink-200/60 max-w-2xl mx-auto font-medium leading-relaxed"
          >
            Pequeno ou normal, e com Mana muito acima do que o tamanho sugere. Faz truque sensorial o tempo todo, de graça, e ilusão grande quando resolve levar a sério. Nada disso machuca: o estrago é sempre o que a vítima faz com a informação errada.
          </motion.p>
        </motion.header>

        {/* Traits Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-24">
          <PremiumCard
            glowColor={tema.glow}
            initial={{ opacity: 0, y: 40 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className={`flex gap-6 p-8 rounded-2xl ${tema.bg} ${tema.border} backdrop-blur-md`}
          >
            <Sparkles size={40} className={`${tema.icon} shrink-0`} strokeWidth={1.5} />
            <div>
              <h3 className={`text-2xl font-bold ${tema.text} mb-3`} style={{ fontFamily: 'Cinzel, serif' }}>Truque Feérico</h3>
              <p className="text-pink-200/60 leading-relaxed text-sm">
                Crie à vontade um efeito sensorial pequeno e inofensivo: faíscas, um perfume, um sussurro ou uma imagem do tamanho da sua mão. Não causa dano nem reproduz criaturas de forma convincente.
              </p>
            </div>
          </PremiumCard>

          <PremiumCard
            glowColor={tema.glow}
            initial={{ opacity: 0, y: 40 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className={`flex gap-6 p-8 rounded-2xl ${tema.bg} ${tema.border} backdrop-blur-md`}
          >
            <EyeOff size={40} className={`${tema.icon} shrink-0`} strokeWidth={1.5} />
            <div>
              <h3 className={`text-2xl font-bold ${tema.text} mb-3`} style={{ fontFamily: 'Cinzel, serif' }}>Glamour</h3>
              <p className="text-pink-200/60 leading-relaxed text-sm">
                Uma vez por cena, gaste 1 ação e 2 Mana para criar uma ilusão visual e sonora de até 3m em um ponto a até 15m. Dura enquanto mantiver concentração (máx. 1 minuto). Quem interagir testa Percepção vs Misticismo.
              </p>
            </div>
          </PremiumCard>
        </div>

        {/* Custom Lineages for Feerico */}
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
                <p className="text-pink-200/60 text-lg">{grupo.descricao}</p>
              </motion.div>
              
              <div className="overflow-x-auto rounded-none border border-pink-800/40 bg-pink-950/20 backdrop-blur-md shadow-lg shadow-pink-900/10">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-pink-800/40 bg-pink-950/60">
                      <th className="p-6 font-bold text-pink-100 uppercase tracking-widest text-sm" style={{ fontFamily: 'Cinzel, serif' }}>Opção</th>
                      {grupo.campo !== 'linhagemId' && <th className="p-6 font-bold text-pink-100 uppercase tracking-widest text-sm" style={{ fontFamily: 'Cinzel, serif' }}>Descrição</th>}
                      <th className="p-6 font-bold text-pink-100 uppercase tracking-widest text-sm" style={{ fontFamily: 'Cinzel, serif' }}>Traços</th>
                    </tr>
                  </thead>
                  <tbody>
                    {grupo.opcoes.map((opcao) => {
                      const tracos = obterTracosOpcaoRacial(opcao);
                      const titleLower = opcao.titulo.toLowerCase();
                      
                      let lineageStyle = { glow: 'rgba(244,114,182,0.25)', text: 'text-pink-400', border: 'border-pink-500/50', bg: 'hover:bg-pink-900/20' };
                      if (titleLower.includes('inverno') || titleLower.includes('gelo') || titleLower.includes('neve')) {
                        lineageStyle = { glow: 'rgba(147,197,253,0.25)', text: 'text-blue-400', border: 'border-blue-500/50', bg: 'hover:bg-blue-950/30' };
                      } else if (titleLower.includes('verão') || titleLower.includes('fogo') || titleLower.includes('sol')) {
                        lineageStyle = { glow: 'rgba(251,146,60,0.25)', text: 'text-orange-400', border: 'border-orange-500/50', bg: 'hover:bg-orange-950/30' };
                      } else if (titleLower.includes('primavera') || titleLower.includes('flora')) {
                        lineageStyle = { glow: 'rgba(74,222,128,0.25)', text: 'text-green-400', border: 'border-green-500/50', bg: 'hover:bg-green-950/30' };
                      } else if (titleLower.includes('outono') || titleLower.includes('sombra') || titleLower.includes('trevas')) {
                        lineageStyle = { glow: 'rgba(168,85,247,0.25)', text: 'text-purple-400', border: 'border-purple-500/50', bg: 'hover:bg-purple-950/30' };
                      }

                      return (
                        <tr 
                          key={opcao.id} 
                          className={`border-b border-pink-800/20 transition-colors ${lineageStyle.bg}`}
                        >
                          <td className={`p-6 align-top border-l-2 ${lineageStyle.border} ${lineageStyle.text} w-1/4`}>
                            <span className="font-bold text-lg block" style={{ fontFamily: 'Cinzel, serif' }}>{opcao.titulo}</span>
                          </td>
                          {grupo.campo !== 'linhagemId' && (
                            <td className="p-6 align-top text-pink-100/70 text-sm leading-relaxed w-1/3">
                              {descreverOpcaoRacial(opcao)}
                            </td>
                          )}
                          <td className="p-6 align-top">
                            {tracos.length > 0 ? (
                              <div className="space-y-4">
                                {tracos.map(traco => (
                                  <div key={traco.id} className="bg-black/20 p-3 rounded-none border border-pink-900/30">
                                    <h4 className="text-sm font-bold text-pink-100 mb-1">{traco.titulo}</h4>
                                    {traco.descricao && <p className="text-xs text-pink-200/50 leading-relaxed">{traco.descricao}</p>}
                                  </div>
                                ))}
                              </div>
                            ) : (
                              <span className="text-pink-500/30 italic text-sm">Sem traços adicionais.</span>
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

export default Feerico;
