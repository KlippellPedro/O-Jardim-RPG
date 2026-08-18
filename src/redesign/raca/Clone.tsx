import { motion } from 'framer-motion';
import { Dna, Fingerprint, BrainCircuit, ActivitySquare } from 'lucide-react';
import type { IRaca } from '../../types/catalogo';
import { PremiumCard } from '../components/premium/PremiumCard';
import { obterGruposEscolhaRacial, obterTracosOpcaoRacial, descreverOpcaoRacial } from '../../services/racaService';
import { obterTemaPorId } from '../themeMap';

export const Clone = ({ raca }: { raca: IRaca }) => {
  const tema = obterTemaPorId(raca.id);
  return (
    <div className="min-h-screen text-emerald-50 p-8 selection:bg-emerald-500/30 overflow-hidden relative">
      {/* Bio-Tech Background */}
      <div 
        className="fixed inset-0 z-0 bg-cover bg-center bg-no-repeat bg-black"
        style={{ backgroundImage: "url('/assets/img/clone_bg.webp')" }}
      >
        <div className="absolute inset-0 bg-emerald-950/80 mix-blend-multiply" />
        <div className="absolute inset-0 bg-gradient-to-b from-[#010805]/40 via-transparent to-[#010805]/90" />
      </div>

      {/* Bio-Tech Foreground Overlays */}
      <div className="fixed inset-0 pointer-events-none z-0">
        {/* DNA Helix Overlay */}
        <div className="absolute inset-0 opacity-[0.03] bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAiIGhlaWdodD0iMjAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGNpcmNsZSBjeD0iMTAiIGN5PSIxMCIgcj0iMiIgZmlsbD0iIzEwYjk4MSIvPjwvc3ZnPg==')] bg-[length:20px_20px]" />
        
        {/* Scanning lines */}
        <motion.div 
          className="absolute inset-x-0 h-[2px] bg-emerald-500/20 shadow-[0_0_10px_rgba(16,185,129,0.8)]"
          animate={{ top: ["0%", "100%", "0%"] }}
          transition={{ duration: 10, repeat: Infinity, ease: "linear" }}
        />
      </div>

      <div className="max-w-5xl mx-auto relative z-10 pt-16">
        {/* Header */}
        <motion.header 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          className="text-center mb-24"
        >
          <motion.div 
            className={`w-28 h-28 mx-auto ${tema.bg} border ${tema.border} rounded-[2rem] flex items-center justify-center mb-8 backdrop-blur-md relative overflow-hidden`}
          >
            {/* Tube liquid effect */}
            <motion.div 
              className="absolute inset-x-0 bottom-0 bg-emerald-500/20"
              animate={{ height: ["0%", "100%"] }}
              transition={{ duration: 10, repeat: Infinity, ease: "linear" }}
            />
            <Dna size={48} className={`${tema.icon} z-10`} strokeWidth={1.5} />
          </motion.div>

          <motion.div className="overflow-hidden">
             <motion.h1 
                initial={{ y: "100%" }}
                animate={{ y: 0 }}
                transition={{ duration: 0.8, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
                className={`text-7xl font-sans font-black tracking-tight ${tema.text} mb-6 uppercase`}
                style={{ fontFamily: 'Cinzel, serif' }}
             >
               Clone
             </motion.h1>
          </motion.div>
          <motion.p 
             initial={{ opacity: 0 }}
             animate={{ opacity: 1 }}
             transition={{ duration: 1, delay: 0.6 }}
             className="text-lg text-emerald-200/60 max-w-2xl mx-auto font-medium leading-relaxed"
          >
            Foi feito à imagem de outra pessoa, e sabe disso. Copia aparência, voz, digital e retina do Original, e de vez em quando lembra de alguma coisa que nunca viveu. O Projeto que motivou a clonagem decide o resto. Fala Ao Contrário.
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
            className={`flex flex-col p-6 rounded-2xl ${tema.bg} border ${tema.border} backdrop-blur-md`}
          >
            <Dna size={32} className={`${tema.icon} mb-4`} strokeWidth={1.5} />
            <h3 className={`text-xl font-bold ${tema.text} mb-3`} style={{ fontFamily: 'Cinzel, serif' }}>Matriz Aperfeiçoada</h3>
            <p className="text-emerald-200/60 leading-relaxed text-sm">
              Criado em laboratório para superar falhas biológicas. Escolha dois atributos diferentes e receba +2 em cada um deles, respeitando o limite natural 20.
            </p>
          </PremiumCard>

          <PremiumCard
             glowColor={tema.glow}
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className={`flex flex-col p-6 rounded-2xl ${tema.bg} border ${tema.border} backdrop-blur-md`}
          >
            <Fingerprint size={32} className={`${tema.icon} mb-4`} strokeWidth={1.5} />
            <h3 className={`text-xl font-bold ${tema.text} mb-3`} style={{ fontFamily: 'Cinzel, serif' }}>Cópia Biométrica</h3>
            <p className="text-emerald-200/60 leading-relaxed text-sm">
              Reproduz aparência, voz, digitais e retina do Original perfeitamente. Vantagem absurda em Enganação biométrica, mas pessoas muito íntimas podem perceber discrepâncias.
            </p>
          </PremiumCard>

          <PremiumCard
             glowColor={tema.glow}
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className={`flex flex-col p-6 rounded-2xl ${tema.bg} border ${tema.border} backdrop-blur-md`}
          >
            <BrainCircuit size={32} className={`${tema.icon} mb-4`} strokeWidth={1.5} />
            <h3 className={`text-xl font-bold ${tema.text} mb-3`} style={{ fontFamily: 'Cinzel, serif' }}>Memórias Residuais</h3>
            <p className="text-emerald-200/60 leading-relaxed text-sm">
              Uma vez por sessão, consulte uma memória incompleta e curta que o Original possuía até o momento da clonagem (uma imagem, sensação ou rosto). 
            </p>
          </PremiumCard>

          <PremiumCard
             glowColor={tema.glow}
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.3 }}
            className={`flex flex-col p-6 rounded-2xl ${tema.bg} border ${tema.border} backdrop-blur-md`}
          >
            <ActivitySquare size={32} className={`${tema.icon} mb-4`} strokeWidth={1.5} />
            <h3 className={`text-xl font-bold ${tema.text} mb-3`} style={{ fontFamily: 'Cinzel, serif' }}>Regeneração Programada</h3>
            <p className="text-emerald-200/60 leading-relaxed text-sm">
              Quando sofrer dano e ficar com metade da Vida ou menos, gaste uma reação e 4 Mana para regenerar carne rapidamente (2d6 + Mod.Constituição).
            </p>
          </PremiumCard>
        </div>

        {/* Custom Lineages for Clone */}
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
                <p className="text-emerald-200/60 text-lg">{grupo.descricao}</p>
              </motion.div>
              
              <div className="overflow-x-auto rounded-none border border-emerald-800/40 bg-emerald-950/20 backdrop-blur-md shadow-lg shadow-emerald-900/10">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-emerald-800/40 bg-emerald-950/60">
                      <th className="p-6 font-bold text-emerald-100 uppercase tracking-widest text-sm" style={{ fontFamily: 'Cinzel, serif' }}>Cadeia Genética</th>
                      {grupo.campo !== 'linhagemId' && <th className="p-6 font-bold text-emerald-100 uppercase tracking-widest text-sm" style={{ fontFamily: 'Cinzel, serif' }}>Fenótipo</th>}
                      <th className="p-6 font-bold text-emerald-100 uppercase tracking-widest text-sm" style={{ fontFamily: 'Cinzel, serif' }}>Mutações Adicionais</th>
                    </tr>
                  </thead>
                  <tbody>
                    {grupo.opcoes.map((opcao) => {
                      const tracos = obterTracosOpcaoRacial(opcao);
                      const titleLower = opcao.titulo.toLowerCase();
                      
                      // Custom colors for different clone lineages
                      let lineageStyle = { glow: tema.glow, text: tema.text, border: tema.border, bg: 'hover:bg-emerald-900/20' };
                      if (titleLower.includes('soldado') || titleLower.includes('combate') || titleLower.includes('agressivo')) {
                        lineageStyle = { glow: 'rgba(239,68,68,0.25)', text: 'text-red-400', border: 'border-red-500/50', bg: 'hover:bg-red-950/30' };
                      } else if (titleLower.includes('mente') || titleLower.includes('psíquico') || titleLower.includes('neural')) {
                        lineageStyle = { glow: 'rgba(168,85,247,0.25)', text: 'text-purple-400', border: 'border-purple-500/50', bg: 'hover:bg-purple-950/30' };
                      } else if (titleLower.includes('resistente') || titleLower.includes('adaptável') || titleLower.includes('sobrevivente')) {
                        lineageStyle = { glow: 'rgba(245,158,11,0.25)', text: 'text-amber-400', border: 'border-amber-500/50', bg: 'hover:bg-amber-950/30' };
                      } else if (titleLower.includes('infiltrador') || titleLower.includes('camuflagem')) {
                        lineageStyle = { glow: 'rgba(6,182,212,0.25)', text: 'text-cyan-400', border: 'border-cyan-500/50', bg: 'hover:bg-cyan-950/30' };
                      }

                      return (
                        <tr 
                          key={opcao.id} 
                          className={`border-b border-emerald-800/20 transition-colors ${lineageStyle.bg}`}
                        >
                          <td className={`p-6 align-top border-l-2 ${lineageStyle.border} ${lineageStyle.text} w-1/4`}>
                            <span className="font-bold text-lg block" style={{ fontFamily: 'Cinzel, serif' }}>{opcao.titulo}</span>
                          </td>
                          {grupo.campo !== 'linhagemId' && (
                            <td className="p-6 align-top text-emerald-100/70 text-sm leading-relaxed w-1/3">
                              {descreverOpcaoRacial(opcao)}
                            </td>
                          )}
                          <td className="p-6 align-top">
                            {tracos.length > 0 ? (
                              <div className="space-y-4">
                                {tracos.map(traco => (
                                  <div key={traco.id} className="bg-black/20 p-3 rounded-none border border-emerald-900/30">
                                    <h4 className="text-sm font-bold text-emerald-100 mb-1">{traco.titulo}</h4>
                                    {traco.descricao && <p className="text-xs text-emerald-200/50 leading-relaxed">{traco.descricao}</p>}
                                  </div>
                                ))}
                              </div>
                            ) : (
                              <span className="text-emerald-500/30 italic text-sm">Sem mutações adicionais.</span>
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

export default Clone;
