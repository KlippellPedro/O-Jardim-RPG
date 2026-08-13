import { motion } from 'framer-motion';
import { Mountain, ShieldAlert, Weight, Expand } from 'lucide-react';
import type { IRaca } from '../../types/catalogo';
import { PremiumCard } from '../components/premium/PremiumCard';
import { obterGruposEscolhaRacial, obterTracosOpcaoRacial, descreverOpcaoRacial } from '../../services/racaService';
import { obterTemaPorId } from '../themeMap';

export const Gigante = ({ raca }: { raca: IRaca }) => {
  const tema = obterTemaPorId(raca.id);

  return (
    <div className="min-h-screen text-stone-50 p-8 selection:bg-stone-500/30 overflow-hidden relative">
      {/* Giant Background */}
      <div 
        className="fixed inset-0 z-0 bg-cover bg-center bg-no-repeat bg-black"
        style={{ backgroundImage: "url('/assets/img/gigante_bg.webp')" }}
      >
        <div className="absolute inset-0 bg-stone-950/80 mix-blend-multiply" />
        <div className="absolute inset-0 bg-gradient-to-b from-[#0f0e0c]/40 via-transparent to-[#0f0e0c]/90" />
      </div>

      {/* Heavy/Earth Background Effects */}
      <div className="fixed inset-0 pointer-events-none z-0">
        <div className="absolute top-[50%] left-[50%] -translate-x-1/2 -translate-y-1/2 w-[70%] h-[70%] bg-stone-800/10 blur-[150px] rounded-full mix-blend-screen" />
        
        {/* Tremor effect on mount (CSS animation injected later, or using framer) */}
        <motion.div 
          className="absolute inset-0 bg-stone-900/5 mix-blend-overlay"
          animate={{ x: [-2, 2, -1, 1, 0] }}
          transition={{ duration: 0.5, repeat: Infinity, repeatDelay: 4 }}
        />
      </div>

      <div className="max-w-5xl mx-auto relative z-10 pt-16">
        {/* Header */}
        <motion.header 
          initial={{ opacity: 0, y: 50 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1, type: "spring", bounce: 0.2 }}
          className="text-center mb-24"
        >
          <motion.div 
            className={`w-32 h-32 mx-auto ${tema.bg} border-4 ${tema.border} rounded-sm flex items-center justify-center mb-8 relative backdrop-blur-md`}
            style={{ boxShadow: `0 0 30px ${tema.glow}` }}
          >
            <Mountain size={56} className={tema.icon} strokeWidth={1.5} />
          </motion.div>

          <motion.div className="overflow-hidden">
             <motion.h1 
                initial={{ y: "100%" }}
                animate={{ y: 0 }}
                transition={{ duration: 0.8, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
                className={`text-8xl font-black tracking-tighter ${tema.text} mb-6 uppercase`}
                style={{ fontFamily: 'Cinzel, serif' }}
             >
               Gigante
             </motion.h1>
          </motion.div>
          <motion.p 
             initial={{ opacity: 0 }}
             animate={{ opacity: 1 }}
             transition={{ duration: 1, delay: 0.6 }}
             className="text-xl text-stone-400 max-w-2xl mx-auto font-bold leading-relaxed"
          >
            Uma montanha viva. O campo de batalha estremece a cada passo e a sua mera presença física é um escudo intransponível para os aliados.
          </motion.p>
        </motion.header>

        {/* Traits Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-24">
          <PremiumCard
            glowColor={tema.glow}
            initial={{ opacity: 0, scale: 0.95 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className={`flex flex-col items-center text-center p-8 ${tema.bg} border ${tema.border} backdrop-blur-md`}
          >
            <Expand size={40} className={`${tema.icon} mb-6`} strokeWidth={1.5} />
            <h3 className={`text-3xl font-black ${tema.text} mb-4 uppercase`} style={{ fontFamily: 'Cinzel, serif' }}>Tamanho Grande</h3>
            <p className="text-stone-400 leading-relaxed">
              Sua estatura intimida. Você exige que armas, armaduras e equipamentos comuns tenham tamanho compatível e sejam fabricados especificamente para a sua estrutura.
            </p>
          </PremiumCard>

          <PremiumCard
            glowColor={tema.glow}
            initial={{ opacity: 0, scale: 0.95 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className={`flex flex-col items-center text-center p-8 ${tema.bg} border ${tema.border} backdrop-blur-md`}
          >
            <div className={`flex gap-4 mb-6 ${tema.icon}`}>
              <ShieldAlert size={40} strokeWidth={1.5} />
              <Weight size={40} strokeWidth={1.5} />
            </div>
            <h3 className={`text-3xl font-black ${tema.text} mb-4 uppercase`} style={{ fontFamily: 'Cinzel, serif' }}>Porte Colossal</h3>
            <p className="text-stone-400 leading-relaxed">
              Receba vantagem absoluta para resistir a empurrões e quedas causados por outras criaturas. Sua enorme musculatura também dobra sua capacidade de carga.
            </p>
          </PremiumCard>
        </div>

        {/* Custom Lineages for Gigante */}
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
                <p className="text-stone-400 text-lg">{grupo.descricao}</p>
              </motion.div>
              
              <div className="overflow-x-auto rounded-none border border-stone-800/40 bg-stone-900/40 backdrop-blur-md shadow-lg shadow-stone-900/10">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-stone-800/40 bg-stone-950/60">
                      <th className="p-6 font-bold text-stone-300 uppercase tracking-widest text-sm" style={{ fontFamily: 'Cinzel, serif' }}>Opção</th>
                      {grupo.campo !== 'linhagemId' && <th className="p-6 font-bold text-stone-300 uppercase tracking-widest text-sm" style={{ fontFamily: 'Cinzel, serif' }}>Descrição</th>}
                      <th className="p-6 font-bold text-stone-300 uppercase tracking-widest text-sm" style={{ fontFamily: 'Cinzel, serif' }}>Traços</th>
                    </tr>
                  </thead>
                  <tbody>
                    {grupo.opcoes.map((opcao) => {
                      const tracos = obterTracosOpcaoRacial(opcao);
                      const titleLower = opcao.titulo.toLowerCase();
                      
                      let lineageStyle = { glow: 'rgba(168,162,158,0.25)', text: 'text-stone-400', border: 'border-stone-500/50', bg: 'hover:bg-stone-900/30' };
                      if (titleLower.includes('fogo') || titleLower.includes('vulcão') || titleLower.includes('infernal')) {
                        lineageStyle = { glow: 'rgba(239,68,68,0.25)', text: 'text-red-400', border: 'border-red-500/50', bg: 'hover:bg-red-950/30' };
                      } else if (titleLower.includes('gelo') || titleLower.includes('frio') || titleLower.includes('neve')) {
                        lineageStyle = { glow: 'rgba(96,165,250,0.25)', text: 'text-blue-400', border: 'border-blue-500/50', bg: 'hover:bg-blue-950/30' };
                      } else if (titleLower.includes('tempestade') || titleLower.includes('trovão') || titleLower.includes('nuvem')) {
                        lineageStyle = { glow: 'rgba(192,132,252,0.25)', text: 'text-purple-400', border: 'border-purple-500/50', bg: 'hover:bg-purple-950/30' };
                      } else if (titleLower.includes('pedra') || titleLower.includes('terra') || titleLower.includes('montanha')) {
                        lineageStyle = { glow: 'rgba(120,113,108,0.25)', text: 'text-stone-500', border: 'border-stone-600/50', bg: 'hover:bg-stone-900/40' };
                      } else if (titleLower.includes('colina') || titleLower.includes('pântano')) {
                        lineageStyle = { glow: 'rgba(74,222,128,0.25)', text: 'text-green-500', border: 'border-green-600/50', bg: 'hover:bg-green-950/30' };
                      }

                      return (
                        <tr 
                          key={opcao.id} 
                          className={`border-b border-stone-800/20 transition-colors ${lineageStyle.bg}`}
                        >
                          <td className={`p-6 align-top border-l-2 ${lineageStyle.border} ${lineageStyle.text} w-1/4`}>
                            <span className="font-bold text-lg block" style={{ fontFamily: 'Cinzel, serif' }}>{opcao.titulo}</span>
                          </td>
                          {grupo.campo !== 'linhagemId' && (
                            <td className="p-6 align-top text-stone-300/70 text-sm leading-relaxed w-1/3">
                              {descreverOpcaoRacial(opcao)}
                            </td>
                          )}
                          <td className="p-6 align-top">
                            {tracos.length > 0 ? (
                              <div className="space-y-4">
                                {tracos.map(traco => (
                                  <div key={traco.id} className="bg-black/20 p-3 rounded-none border border-stone-800/30">
                                    <h4 className="text-sm font-bold text-stone-200 mb-1">{traco.titulo}</h4>
                                    {traco.descricao && <p className="text-xs text-stone-400/70 leading-relaxed">{traco.descricao}</p>}
                                  </div>
                                ))}
                              </div>
                            ) : (
                              <span className="text-stone-500/30 italic text-sm">Sem traços adicionais.</span>
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

export default Gigante;
