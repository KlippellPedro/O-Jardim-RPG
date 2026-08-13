import { motion } from 'framer-motion';
import { Dna, ShieldAlert, Zap, Layers } from 'lucide-react';
import type { IRaca } from '../../types/catalogo';
import { PremiumCard } from '../components/premium/PremiumCard';
import { obterGruposEscolhaRacial, obterTracosOpcaoRacial, descreverOpcaoRacial } from '../../services/racaService';
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
            Corpos e almas costurados em um ser só. Uma quimera biológica e espiritual, capaz de assimilar propriedades daqueles que os compõem e reconfigurar a própria anatomia quando atacados.
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
                Sua biologia é diversa. Uma vez por cena, rerrole uma falha em Fortitude contra doença, veneno ou alteração corporal. A pluralidade interna rejeita ameaças singulares.
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
                O coro de mentes te protege. Uma vez por sessão, rerrole uma falha em um teste de Vontade. Não concede memórias perfeitas dos seres originais.
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

        {/* Custom Lineages for Amálgamo */}
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
                      <th className="p-6 font-bold text-pink-100 uppercase tracking-widest text-sm" style={{ fontFamily: 'Cinzel, serif' }}>Fragmento/Linhagem</th>
                      {grupo.campo !== 'linhagemId' && <th className="p-6 font-bold text-pink-100 uppercase tracking-widest text-sm" style={{ fontFamily: 'Cinzel, serif' }}>Descrição</th>}
                      <th className="p-6 font-bold text-pink-100 uppercase tracking-widest text-sm" style={{ fontFamily: 'Cinzel, serif' }}>Traços Assimilados</th>
                    </tr>
                  </thead>
                  <tbody>
                    {grupo.opcoes.map((opcao) => {
                      const tracos = obterTracosOpcaoRacial(opcao);
                      const titleLower = opcao.titulo.toLowerCase();
                      
                      let lineageStyle = { glow: 'rgba(236,72,153,0.25)', text: 'text-pink-400', border: 'border-pink-500/50', bg: 'hover:bg-pink-900/20' };
                      if (titleLower.includes('mar') || titleLower.includes('água') || titleLower.includes('oceano') || titleLower.includes('profundeza')) {
                        lineageStyle = { glow: 'rgba(59,130,246,0.25)', text: 'text-blue-400', border: 'border-blue-500/50', bg: 'hover:bg-blue-950/30' };
                      } else if (titleLower.includes('fera') || titleLower.includes('selva') || titleLower.includes('besta') || titleLower.includes('animal')) {
                        lineageStyle = { glow: 'rgba(16,185,129,0.25)', text: 'text-emerald-400', border: 'border-emerald-500/50', bg: 'hover:bg-emerald-950/30' };
                      } else if (titleLower.includes('dragão') || titleLower.includes('fogo') || titleLower.includes('infernal')) {
                        lineageStyle = { glow: 'rgba(239,68,68,0.25)', text: 'text-red-400', border: 'border-red-500/50', bg: 'hover:bg-red-950/30' };
                      } else if (titleLower.includes('celestial') || titleLower.includes('luz') || titleLower.includes('divino')) {
                        lineageStyle = { glow: 'rgba(250,204,21,0.25)', text: 'text-yellow-400', border: 'border-yellow-500/50', bg: 'hover:bg-yellow-950/30' };
                      } else if (titleLower.includes('sombra') || titleLower.includes('abismo') || titleLower.includes('trevas')) {
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

export default Amalgamo;
