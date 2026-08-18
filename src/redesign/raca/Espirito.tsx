import { motion } from 'framer-motion';
import { Ghost, MoveRight, Eye } from 'lucide-react';
import type { IRaca } from '../../types/catalogo';
import { PremiumCard } from '../components/premium/PremiumCard';
import { obterGruposEscolhaRacial, obterTracosOpcaoRacial, descreverOpcaoRacial } from '../../services/racaService';
import { obterTemaPorId } from '../themeMap';

export const Espirito = ({ raca }: { raca: IRaca }) => {
  const tema = obterTemaPorId(raca.id);

  return (
    <div className="min-h-screen text-cyan-50 p-8 selection:bg-cyan-500/30 overflow-hidden relative">
      {/* Ethereal Background */}
      <div 
        className="fixed inset-0 z-0 bg-cover bg-center bg-no-repeat bg-black"
        style={{ backgroundImage: "url('/assets/img/espirito_bg.webp')" }}
      >
        <div className="absolute inset-0 bg-cyan-950/80 mix-blend-multiply" />
        <div className="absolute inset-0 bg-gradient-to-b from-[#020617]/40 via-transparent to-[#020617]/90" />
      </div>

      {/* Ethereal Foreground Overlays */}
      <div className="fixed inset-0 pointer-events-none z-0">
        {/* Ethereal Static */}
        <div className="absolute inset-0 opacity-[0.02] bg-[url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI0IiBoZWlnaHQ9IjQiPgo8cmVjdCB3aWR0aD0iNCIgaGVpZ2h0PSI0IiBmaWxsPSIjMjJkM2VlIiBmaWxsLW9wYWNpdHk9IjAuMDUiLz4KPC9zdmc+')] bg-repeat" />
        

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
            className={`w-28 h-28 mx-auto ${tema.bg} border ${tema.border} rounded-full flex items-center justify-center mb-8 backdrop-blur-md relative`}
            style={{ boxShadow: `0 0 30px ${tema.glow}` }}
          >
            <Ghost size={48} className={`${tema.icon} z-10 opacity-70`} strokeWidth={1} />
            <motion.div 
              className={`absolute inset-0 rounded-full border ${tema.border}`}
              animate={{ scale: [1, 1.2, 1], opacity: [0.5, 0, 0.5] }}
              transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
            />
          </motion.div>

          <motion.div className="overflow-hidden">
             <motion.h1 
                initial={{ y: "100%" }}
                animate={{ y: 0 }}
                transition={{ duration: 0.8, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
                className={`text-7xl font-light tracking-widest ${tema.text} mb-6 uppercase`}
                style={{ fontFamily: 'Cinzel, serif' }}
             >
               Espírito
             </motion.h1>
          </motion.div>
          <motion.p 
             initial={{ opacity: 0 }}
             animate={{ opacity: 1 }}
             transition={{ duration: 1, delay: 0.6 }}
             className="text-lg text-cyan-200/50 max-w-2xl mx-auto font-light leading-relaxed"
          >
            Não tem corpo pra alimentar nem pulmão pra encher. Enxerga no escuro, atravessa parede quando tem Mana pra gastar, e não veste armadura comum porque não há o que vestir. Fala Enoquiano.
          </motion.p>
        </motion.header>

        {/* Traits Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-24">
          <PremiumCard
            glowColor={tema.glow}
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className={`flex gap-6 p-8 rounded-lg ${tema.bg} border-t ${tema.border} backdrop-blur-md`}
          >
            <Eye size={36} className={`${tema.icon} shrink-0`} strokeWidth={1} />
            <div>
              <h3 className={`text-2xl font-light ${tema.text} mb-3`} style={{ fontFamily: 'Cinzel, serif' }}>Fisiologia Incorpórea</h3>
              <p className="text-cyan-200/50 leading-relaxed text-sm font-light">
                Não precisa respirar, comer ou beber. Enxerga normalmente na escuridão natural. Por sua natureza etérea, não pode vestir armaduras comuns.
              </p>
            </div>
          </PremiumCard>

          <PremiumCard
            glowColor={tema.glow}
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className={`flex gap-6 p-8 rounded-lg ${tema.bg} border-t ${tema.border} backdrop-blur-md`}
          >
            <MoveRight size={36} className={`${tema.icon} shrink-0`} strokeWidth={1} />
            <div>
              <h3 className={`text-2xl font-light ${tema.text} mb-3`} style={{ fontFamily: 'Cinzel, serif' }}>Passagem Etérea</h3>
              <p className="text-cyan-200/50 leading-relaxed text-sm font-light">
                Uma vez por cena, gaste 2 Mana durante seu movimento para atravessar até 1,5m de material sólido. Você precisa enxergar ou conhecer um espaço livre do outro lado e não pode carregar outra criatura.
              </p>
            </div>
          </PremiumCard>
        </div>

        {/* Custom Lineages for Espirito */}
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
                <p className="text-cyan-200/60 text-lg">{grupo.descricao}</p>
              </motion.div>
              
              <div className="overflow-x-auto rounded-none border border-cyan-800/40 bg-cyan-950/20 backdrop-blur-md shadow-lg shadow-cyan-900/10">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-cyan-800/40 bg-cyan-950/60">
                      <th className="p-6 font-bold text-cyan-100 uppercase tracking-widest text-sm" style={{ fontFamily: 'Cinzel, serif' }}>Natureza Etérea</th>
                      {grupo.campo !== 'linhagemId' && <th className="p-6 font-bold text-cyan-100 uppercase tracking-widest text-sm" style={{ fontFamily: 'Cinzel, serif' }}>Manifestação</th>}
                      <th className="p-6 font-bold text-cyan-100 uppercase tracking-widest text-sm" style={{ fontFamily: 'Cinzel, serif' }}>Traços Sobrenaturais</th>
                    </tr>
                  </thead>
                  <tbody>
                    {grupo.opcoes.map((opcao) => {
                      const tracos = obterTracosOpcaoRacial(opcao);
                      const titleLower = opcao.titulo.toLowerCase();
                      
                      // Custom colors for different espirito lineages
                      let lineageStyle = { glow: 'rgba(34,211,238,0.25)', text: 'text-cyan-400', border: 'border-cyan-500/50', bg: 'hover:bg-cyan-900/20' };
                      if (titleLower.includes('espectro') || titleLower.includes('sombra') || titleLower.includes('assombração') || titleLower.includes('pesadelo')) {
                        lineageStyle = { glow: 'rgba(168,85,247,0.25)', text: 'text-purple-400', border: 'border-purple-500/50', bg: 'hover:bg-purple-950/30' };
                      } else if (titleLower.includes('poltergeist') || titleLower.includes('ira') || titleLower.includes('vingativo')) {
                        lineageStyle = { glow: 'rgba(239,68,68,0.25)', text: 'text-red-400', border: 'border-red-500/50', bg: 'hover:bg-red-950/30' };
                      } else if (titleLower.includes('guardião') || titleLower.includes('ancestral') || titleLower.includes('protetor')) {
                        lineageStyle = { glow: 'rgba(245,158,11,0.25)', text: 'text-amber-400', border: 'border-amber-500/50', bg: 'hover:bg-amber-950/30' };
                      } else if (titleLower.includes('natureza') || titleLower.includes('fada') || titleLower.includes('elemental')) {
                        lineageStyle = { glow: 'rgba(16,185,129,0.25)', text: 'text-emerald-400', border: 'border-emerald-500/50', bg: 'hover:bg-emerald-950/30' };
                      }

                      return (
                        <tr 
                          key={opcao.id} 
                          className={`border-b border-cyan-800/20 transition-colors ${lineageStyle.bg}`}
                        >
                          <td className={`p-6 align-top border-l-2 ${lineageStyle.border} ${lineageStyle.text} w-1/4`}>
                            <span className="font-bold text-lg block" style={{ fontFamily: 'Cinzel, serif' }}>{opcao.titulo}</span>
                          </td>
                          {grupo.campo !== 'linhagemId' && (
                            <td className="p-6 align-top text-cyan-100/70 text-sm leading-relaxed w-1/3">
                              {descreverOpcaoRacial(opcao)}
                            </td>
                          )}
                          <td className="p-6 align-top">
                            {tracos.length > 0 ? (
                              <div className="space-y-4">
                                {tracos.map(traco => (
                                  <div key={traco.id} className="bg-black/20 p-3 rounded-none border border-cyan-900/30">
                                    <h4 className="text-sm font-bold text-cyan-100 mb-1">{traco.titulo}</h4>
                                    {traco.descricao && <p className="text-xs text-cyan-200/50 leading-relaxed">{traco.descricao}</p>}
                                  </div>
                                ))}
                              </div>
                            ) : (
                              <span className="text-cyan-500/30 italic text-sm">Sem traços adicionais.</span>
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

export default Espirito;
