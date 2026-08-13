import { motion } from 'framer-motion';
import { Sparkles, Brain, ScrollText, UserCheck } from 'lucide-react';
import type { IRaca } from '../../types/catalogo';
import { PremiumCard } from '../components/premium/PremiumCard';
import { obterGruposEscolhaRacial, obterTracosOpcaoRacial, descreverOpcaoRacial } from '../../services/racaService';
import { obterTemaPorId } from '../themeMap';

export const Errante = ({ raca }: { raca: IRaca }) => {
  const tema = obterTemaPorId(raca.id);

  return (
    <div className="min-h-screen text-gray-50 p-8 selection:bg-gray-500/30 overflow-hidden relative">
      {/* Multiverse Background */}
      <div 
        className="fixed inset-0 z-0 bg-cover bg-center bg-no-repeat bg-black"
        style={{ backgroundImage: "url('/assets/img/errante_bg.webp')" }}
      >
        <div className="absolute inset-0 bg-gray-950/80 mix-blend-multiply" />
        <div className="absolute inset-0 bg-gradient-to-b from-[#050505]/40 via-transparent to-[#050505]/90" />
      </div>

      {/* Multiverse Foreground Overlays */}
      <div className="fixed inset-0 pointer-events-none z-0">
        {/* VHS / CRT scanline overlay */}
        <div className="absolute inset-0 opacity-[0.05] bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMSIgaGVpZ2h0PSI0IiB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciPjxwb2x5Z29uIHBvaW50cz0iMCAwLCAxIDAsIDEgMiwgMCAyIiBmaWxsPSIjZmZmIi8+PC9zdmc+')] bg-repeat" />
        
        {/* Glitching lines */}
        <motion.div 
          className="absolute inset-x-0 h-[2px] bg-red-500/20 shadow-[0_0_10px_rgba(239,68,68,0.8)]"
          animate={{ top: ["0%", "100%", "0%"], opacity: [1, 0, 1] }}
          transition={{ duration: 5, repeat: Infinity, ease: "linear" }}
        />
      </div>

      <div className="max-w-5xl mx-auto relative z-10 pt-16">
        {/* Header */}
        <motion.header 
          initial={{ opacity: 0, filter: 'blur(20px)' }}
          animate={{ opacity: 1, filter: 'blur(0px)' }}
          transition={{ duration: 0.5 }}
          className="text-center mb-24"
        >
          <motion.div 
            className={`w-28 h-28 mx-auto ${tema.bg} ${tema.border} rounded-lg flex items-center justify-center mb-8 shadow-2xl relative backdrop-blur-md`}
            style={{ boxShadow: `0 0 50px ${tema.glow}` }}
          >
            {/* Glitch effect on the icon */}
            <motion.div 
              className={`absolute inset-0 flex items-center justify-center ${tema.icon}`}
              animate={{ x: [-2, 2, -1, 0] }}
              transition={{ duration: 0.2, repeat: Infinity, repeatDelay: 3 }}
            >
              <UserCheck size={48} strokeWidth={1.5} />
            </motion.div>
            <motion.div 
              className={`absolute inset-0 flex items-center justify-center ${tema.icon}`}
              animate={{ x: [2, -2, 1, 0] }}
              transition={{ duration: 0.2, repeat: Infinity, repeatDelay: 3 }}
            >
              <UserCheck size={48} strokeWidth={1.5} />
            </motion.div>
            
            <UserCheck size={48} className={`${tema.icon} z-10`} strokeWidth={1.5} />
          </motion.div>

          <motion.div className="overflow-hidden">
             <motion.h1 
                initial={{ y: "100%" }}
                animate={{ y: 0 }}
                transition={{ duration: 0.8, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
                className={`text-7xl font-bold tracking-tight ${tema.text} mb-6 uppercase`}
                style={{ textShadow: "2px 0 red, -2px 0 cyan", fontFamily: 'Cinzel, serif' }}
             >
               Errante
             </motion.h1>
          </motion.div>
          <motion.p 
             initial={{ opacity: 0 }}
             animate={{ opacity: 1 }}
             transition={{ duration: 1, delay: 0.6 }}
             className="text-lg text-gray-400 max-w-2xl mx-auto font-medium leading-relaxed"
          >
            Uma anomalia narrativa. Um herói importado de outra campanha, outro sistema ou outro mundo, mantendo suas memórias passadas e adaptando sua assinatura mágica às regras dessa nova realidade.
          </motion.p>
        </motion.header>

        {/* Traits Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-24">
          <PremiumCard
            glowColor={tema.glow}
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className={`flex flex-col p-6 rounded-none ${tema.bg} ${tema.border} backdrop-blur-md`}
          >
            <UserCheck size={32} className={`${tema.icon} mb-4`} strokeWidth={1.5} />
            <h3 className={`text-xl font-bold ${tema.text} mb-2`} style={{ fontFamily: 'Cinzel, serif' }}>Identidade Preservada</h3>
            <p className="text-gray-400 leading-relaxed text-sm">
              Conserve nome, aparência, cicatrizes e reputação do personagem original. Os números mecânicos são reconstruídos pelas regras do novo mundo, mas sua essência persiste.
            </p>
          </PremiumCard>

          <PremiumCard
            glowColor={tema.glow}
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className={`flex flex-col p-6 rounded-none ${tema.bg} ${tema.border} backdrop-blur-md`}
          >
            <Brain size={32} className={`${tema.icon} mb-4`} strokeWidth={1.5} />
            <h3 className={`text-xl font-bold ${tema.text} mb-2`} style={{ fontFamily: 'Cinzel, serif' }}>Memórias de Outra Campanha</h3>
            <p className="text-gray-400 leading-relaxed text-sm">
              Escolha 3 perícias relacionadas ao que você fazia na campanha anterior. Você recebe três rerrolagens por sessão compartilhadas exclusivamente entre elas.
            </p>
          </PremiumCard>

          <PremiumCard
            glowColor={tema.glow}
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className={`flex flex-col p-6 rounded-none ${tema.bg} ${tema.border} backdrop-blur-md`}
          >
            <Sparkles size={32} className={`${tema.icon} mb-4`} strokeWidth={1.5} />
            <h3 className={`text-xl font-bold ${tema.text} mb-2`} style={{ fontFamily: 'Cinzel, serif' }}>Assinatura Remanescente</h3>
            <p className="text-gray-400 leading-relaxed text-sm">
              Traga um poder, magia ou técnica marcante da sua campanha de origem, mantenha o nome e o flavor visual, mas converta-o 100% para a mecânica deste sistema.
            </p>
          </PremiumCard>

          <PremiumCard
            glowColor={tema.glow}
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.3 }}
            className={`flex flex-col p-6 rounded-none ${tema.bg} ${tema.border} backdrop-blur-md`}
          >
            <ScrollText size={32} className={`${tema.icon} mb-4`} strokeWidth={1.5} />
            <h3 className={`text-xl font-bold ${tema.text} mb-2`} style={{ fontFamily: 'Cinzel, serif' }}>Legado & Sobrevivência</h3>
            <p className="text-gray-400 leading-relaxed text-sm">
              Receba um Legado adicional representando um artefato trazido com você. Uma vez por sessão, sobreviva de forma impossível (fique com 1 de Vida em vez de 0) usando sua resiliência de protagonista.
            </p>
          </PremiumCard>
        </div>

        {/* Custom Lineages for Errante */}
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
                <h2 className={`text-4xl font-bold ${tema.text} mb-3 uppercase tracking-wider`} style={{ textShadow: "1px 0 red, -1px 0 cyan", fontFamily: 'Cinzel, serif' }}>
                  {grupo.rotulo}
                </h2>
                <p className="text-gray-400 text-lg">{grupo.descricao}</p>
              </motion.div>
              
              <div className="overflow-x-auto rounded-none border border-gray-800/40 bg-gray-950/20 backdrop-blur-md shadow-lg shadow-gray-900/10">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-gray-800/40 bg-gray-950/60">
                      <th className="p-6 font-bold text-gray-200 uppercase tracking-widest text-sm" style={{ fontFamily: 'Cinzel, serif' }}>Paradigma</th>
                      {grupo.campo !== 'linhagemId' && <th className="p-6 font-bold text-gray-200 uppercase tracking-widest text-sm" style={{ fontFamily: 'Cinzel, serif' }}>Conceito</th>}
                      <th className="p-6 font-bold text-gray-200 uppercase tracking-widest text-sm" style={{ fontFamily: 'Cinzel, serif' }}>Adaptações Sistemáticas</th>
                    </tr>
                  </thead>
                  <tbody>
                    {grupo.opcoes.map((opcao) => {
                      const tracos = obterTracosOpcaoRacial(opcao);
                      const titleLower = opcao.titulo.toLowerCase();
                      
                      // Custom colors for different errante lineages
                      let lineageStyle = { glow: 'rgba(255,255,255,0.25)', text: 'text-white', border: 'border-gray-500/50', bg: 'hover:bg-gray-800/20' };
                      if (titleLower.includes('herói') || titleLower.includes('campeão') || titleLower.includes('protagonista')) {
                        lineageStyle = { glow: 'rgba(234,179,8,0.25)', text: 'text-yellow-400', border: 'border-yellow-500/50', bg: 'hover:bg-yellow-950/30' };
                      } else if (titleLower.includes('isakai') || titleLower.includes('outro mundo') || titleLower.includes('viajante')) {
                        lineageStyle = { glow: 'rgba(6,182,212,0.25)', text: 'text-cyan-400', border: 'border-cyan-500/50', bg: 'hover:bg-cyan-950/30' };
                      } else if (titleLower.includes('caído') || titleLower.includes('vilão') || titleLower.includes('antagonista')) {
                        lineageStyle = { glow: 'rgba(239,68,68,0.25)', text: 'text-red-500', border: 'border-red-600/50', bg: 'hover:bg-red-950/30' };
                      } else if (titleLower.includes('suporte') || titleLower.includes('npc') || titleLower.includes('figurante')) {
                        lineageStyle = { glow: 'rgba(168,85,247,0.25)', text: 'text-purple-400', border: 'border-purple-500/50', bg: 'hover:bg-purple-950/30' };
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
                              <span className="text-gray-500/30 italic text-sm">Nenhuma adaptação revelada.</span>
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

export default Errante;
