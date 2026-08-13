import { motion } from 'framer-motion';
import { EyeOff, Lock } from 'lucide-react';
import type { IRaca } from '../../types/catalogo';
import { PremiumCard } from '../components/premium/PremiumCard';
import { obterGruposEscolhaRacial, obterTracosOpcaoRacial, descreverOpcaoRacial } from '../../services/racaService';
import { obterTemaPorId } from '../themeMap';

export const Entidade = ({ raca }: { raca: IRaca }) => {
  const tema = obterTemaPorId(raca.id);
  return (
    <div className="min-h-screen text-gray-50 p-8 selection:bg-gray-500/30 overflow-hidden relative">
      {/* Mysterious Background */}
      <div 
        className="fixed inset-0 z-0 bg-cover bg-center bg-no-repeat bg-black"
        style={{ backgroundImage: "url('/assets/img/entidade_bg.webp')" }}
      >
        <div className="absolute inset-0 bg-gray-950/80 mix-blend-multiply" />
        <div className="absolute inset-0 bg-gradient-to-b from-[#050505]/40 via-transparent to-[#050505]/90" />
      </div>

      {/* Foreground Overlays */}
      <div className="fixed inset-0 pointer-events-none z-0">
        {/* Shadow Noise */}
        <div className="absolute inset-0 opacity-[0.03] bg-[url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI0IiBoZWlnaHQ9IjQiPgo8cmVjdCB3aWR0aD0iNCIgaGVpZ2h0PSI0IiBmaWxsPSIjZmZmIiBmaWxsLW9wYWNpdHk9IjAuMDUiLz4KPC9zdmc+')] bg-repeat" />
        
        {/* Scanning lines */}
        <motion.div 
          className="absolute inset-x-0 h-[2px] bg-gray-500/20 shadow-[0_0_10px_rgba(156,163,175,0.8)]"
          animate={{ top: ["0%", "100%", "0%"] }}
          transition={{ duration: 12, repeat: Infinity, ease: "linear" }}
        />
      </div>

      <div className="max-w-5xl mx-auto relative z-10 pt-16">
        {/* Header */}
        <motion.header
          initial={{ opacity: 0, filter: 'blur(10px)' }}
          animate={{ opacity: 1, filter: 'blur(0px)' }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          className="text-center mb-24"
        >
          <motion.div
            className={`w-28 h-28 mx-auto border-2 border-dashed ${tema.border} ${tema.bg} rounded-full flex items-center justify-center mb-8 backdrop-blur-md relative`}
          >
            <EyeOff size={48} className={`${tema.icon} z-10`} strokeWidth={1} />
          </motion.div>

          <motion.div className="overflow-hidden">
             <motion.h1
                initial={{ y: "100%" }}
                animate={{ y: 0 }}
                transition={{ duration: 0.8, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
                className={`text-7xl font-light tracking-widest ${tema.text} mb-6 uppercase`}
                style={{ fontFamily: 'Cinzel, serif' }}
             >
               Entidade
             </motion.h1>
          </motion.div>
          <motion.p
             initial={{ opacity: 0 }}
             animate={{ opacity: 1 }}
             transition={{ duration: 1, delay: 0.6 }}
             className="text-lg text-gray-400 max-w-2xl mx-auto font-light leading-relaxed"
          >
            Uma raça esquecida, ainda selada nos arquivos do Jardim. Ela existe apenas como um nome reservado, à espera de ser liberada.
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
            className={`col-span-1 md:col-span-2 flex gap-6 p-8 ${tema.bg} border ${tema.border} rounded-lg backdrop-blur-md`}
          >
            <Lock size={32} className={`${tema.icon} shrink-0`} strokeWidth={1.5} />
            <div>
              <h3 className={`text-2xl font-light ${tema.text} mb-3`} style={{ fontFamily: 'Cinzel, serif' }}>Raça Indisponível</h3>
              <p className="text-gray-400 leading-relaxed text-sm font-light">
                Raça deliberadamente adiada por exigir um pacote próprio mais complexo antes de poder ser escolhida. Ainda não há fisiologia nem características publicadas: nenhum bônus, imunidade ou mecânica desta raça foi definido no catálogo atual. Quando esse pacote for concluído, a Entidade poderá finalmente ser escolhida.
              </p>
            </div>
          </PremiumCard>
        </div>

        {/* Custom Lineages for Entidade */}
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
                <p className="text-gray-400 text-lg">{grupo.descricao}</p>
              </motion.div>
              
              <div className="overflow-x-auto rounded-none border border-gray-800/40 bg-gray-950/20 backdrop-blur-md shadow-lg shadow-gray-900/10">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-gray-800/40 bg-gray-950/60">
                      <th className="p-6 font-bold text-gray-100 uppercase tracking-widest text-sm" style={{ fontFamily: 'Cinzel, serif' }}>Forma Selada</th>
                      {grupo.campo !== 'linhagemId' && <th className="p-6 font-bold text-gray-100 uppercase tracking-widest text-sm" style={{ fontFamily: 'Cinzel, serif' }}>Manifestação</th>}
                      <th className="p-6 font-bold text-gray-100 uppercase tracking-widest text-sm" style={{ fontFamily: 'Cinzel, serif' }}>Poderes Obscuros</th>
                    </tr>
                  </thead>
                  <tbody>
                    {grupo.opcoes.map((opcao) => {
                      const tracos = obterTracosOpcaoRacial(opcao);
                      const titleLower = opcao.titulo.toLowerCase();
                      
                      // Custom colors for different entidade lineages
                      let lineageStyle = { glow: tema.glow, text: tema.text, border: tema.border, bg: 'hover:bg-gray-900/20' };
                      if (titleLower.includes('vazio') || titleLower.includes('abismo') || titleLower.includes('trevas')) {
                        lineageStyle = { glow: 'rgba(0,0,0,0.5)', text: 'text-stone-400', border: 'border-stone-500/50', bg: 'hover:bg-black/30' };
                      } else if (titleLower.includes('caos') || titleLower.includes('destruição')) {
                        lineageStyle = { glow: 'rgba(220,38,38,0.25)', text: 'text-red-500', border: 'border-red-600/50', bg: 'hover:bg-red-950/30' };
                      } else if (titleLower.includes('cósmico') || titleLower.includes('astral')) {
                        lineageStyle = { glow: 'rgba(99,102,241,0.25)', text: 'text-indigo-400', border: 'border-indigo-500/50', bg: 'hover:bg-indigo-950/30' };
                      }

                      return (
                        <tr 
                          key={opcao.id} 
                          className={`border-b border-gray-800/20 transition-colors ${lineageStyle.bg}`}
                        >
                          <td className={`p-6 align-top border-l-2 ${lineageStyle.border} ${lineageStyle.text} w-1/4`}>
                            <span className="font-bold text-lg block" style={{ fontFamily: 'Cinzel, serif' }}>{opcao.titulo}</span>
                          </td>
                          {grupo.campo !== 'linhagemId' && (
                            <td className="p-6 align-top text-gray-300 text-sm leading-relaxed w-1/3">
                              {descreverOpcaoRacial(opcao)}
                            </td>
                          )}
                          <td className="p-6 align-top">
                            {tracos.length > 0 ? (
                              <div className="space-y-4">
                                {tracos.map(traco => (
                                  <div key={traco.id} className="bg-black/20 p-3 rounded-none border border-gray-800/30">
                                    <h4 className="text-sm font-bold text-gray-200 mb-1">{traco.titulo}</h4>
                                    {traco.descricao && <p className="text-xs text-gray-400 leading-relaxed">{traco.descricao}</p>}
                                  </div>
                                ))}
                              </div>
                            ) : (
                              <span className="text-gray-500/30 italic text-sm">Nenhum poder revelado.</span>
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

export default Entidade;
