import { motion } from 'framer-motion';
import { User, Brain, Activity } from 'lucide-react';
import type { IRaca } from '../../types/catalogo';

import { PremiumCard } from '../components/premium/PremiumCard';
import { obterGruposEscolhaRacial, obterTracosOpcaoRacial, descreverOpcaoRacial } from '../../services/racaService';
import { obterTemaPorId } from '../themeMap';

interface HumanoProps {
  raca: IRaca;
}

export const Humano = ({ raca }: HumanoProps) => {
  const tema = obterTemaPorId(raca.id);

  return (
    <div className="min-h-screen text-blue-50 p-8 selection:bg-blue-500/30 overflow-hidden relative">
      {/* Background Image */}
      <div 
        className="fixed inset-0 z-0 bg-cover bg-center bg-no-repeat bg-black"
        style={{ backgroundImage: "url('/assets/img/humano_bg.jpg')" }}
      >
        <div className="absolute inset-0 bg-slate-950/80 mix-blend-multiply" />
        <div className="absolute inset-0 bg-gradient-to-b from-[#070b19]/40 via-transparent to-[#070b19]/90" />
      </div>

      {/* Background Overlays */}
      <div className="fixed inset-0 pointer-events-none z-0">
        {/* Subtle geometric overlay for "Adaptability" */}
        <div className="absolute inset-0 opacity-5 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PHBhdGggZD0iTTAgMjAgTDIwIDAgTDQwIDIwIEwyMCA0MCBaIiBmaWxsPSJub25lIiBzdHJva2U9IiMzYjgyZjYiIHN0cm9rZS13aWR0aD0iMSIvPjwvc3ZnPg==')] bg-[length:40px_40px]" />
      </div>

      <div className="max-w-5xl mx-auto relative z-10 pt-16">
        {/* Header */}
        <motion.header 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          className="text-center mb-24"
        >
          <motion.div 
            className={`w-28 h-28 mx-auto ${tema.bg} border ${tema.border} rounded-2xl flex items-center justify-center mb-8 backdrop-blur-sm relative overflow-hidden`}
            style={{ boxShadow: `0 0 30px ${tema.glow}` }}
          >
            <User size={48} className={`${tema.icon} z-10`} strokeWidth={1.5} />
            <motion.div 
              animate={{ rotate: 360 }}
              transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
              className={`absolute inset-[-50%] border-[1px] ${tema.border} rounded-lg`}
            />
          </motion.div>

          {/* Masked Animated Text */}
          <motion.div className="overflow-hidden">
            <motion.h1 
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              transition={{ duration: 0.8, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
              className={`text-7xl font-bold tracking-tight ${tema.text} mb-6`}
              style={{ fontFamily: 'Cinzel, serif' }}
            >
              Humano
            </motion.h1>
          </motion.div>

          <motion.p 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 1, delay: 0.5 }}
            className="text-lg text-blue-200/60 max-w-2xl mx-auto font-medium leading-relaxed"
          >
            Nascidos sem amarras, os humanos moldam seu próprio destino. Sua verdadeira força não está na magia inata ou em garras, mas na capacidade infinita de se adaptar e aprender.
          </motion.p>
        </motion.header>

        {/* Traits Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-24">
          <PremiumCard
            glowColor={tema.glow}
            initial={{ opacity: 0, x: -20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className={`flex flex-col p-8 ${tema.bg} border ${tema.border} backdrop-blur-md`}
          >
            <Activity size={32} className={`${tema.icon} mb-6`} strokeWidth={1.5} />
            <h3 className={`text-2xl font-bold ${tema.text} mb-3`} style={{ fontFamily: 'Cinzel, serif' }}>Fisiologia Normal</h3>
            <p className="text-blue-200/60 leading-relaxed text-sm">
              Criaturas de Tamanho Normal. Biologia padrão do sistema, precisando de alimento, descanso e ar para sobreviver.
            </p>
          </PremiumCard>

          <PremiumCard
            glowColor={tema.glow}
            initial={{ opacity: 0, x: 20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className={`flex flex-col p-8 ${tema.bg} border ${tema.border} backdrop-blur-md`}
          >
            <Brain size={32} className={`${tema.icon} mb-6`} strokeWidth={1.5} />
            <h3 className={`text-2xl font-bold ${tema.text} mb-3`} style={{ fontFamily: 'Cinzel, serif' }}>Adaptabilidade</h3>
            <p className="text-indigo-200/60 leading-relaxed text-sm">
              Na criação, escolha uma perícia adicional para começar em Aprendiz. Assim, um Humano começa com sete perícias em Aprendiz, em vez de seis.
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
                <p className="text-blue-200/60 text-lg">{grupo.descricao}</p>
              </motion.div>
              
              <div className="overflow-x-auto rounded-xl border border-blue-800/40 bg-blue-950/20 backdrop-blur-md shadow-lg shadow-blue-900/10">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-blue-800/40 bg-blue-950/60">
                      <th className="p-6 font-bold text-blue-100 uppercase tracking-widest text-sm" style={{ fontFamily: 'Cinzel, serif' }}>Opção</th>
                      {grupo.campo !== 'linhagemId' && <th className="p-6 font-bold text-blue-100 uppercase tracking-widest text-sm" style={{ fontFamily: 'Cinzel, serif' }}>Descrição</th>}
                      <th className="p-6 font-bold text-blue-100 uppercase tracking-widest text-sm" style={{ fontFamily: 'Cinzel, serif' }}>Traços</th>
                    </tr>
                  </thead>
                  <tbody>
                    {grupo.opcoes.map((opcao) => {
                      const tracos = obterTracosOpcaoRacial(opcao);
                      const titleLower = opcao.titulo.toLowerCase();
                      
                      let lineageStyle = { glow: 'rgba(59,130,246,0.25)', text: 'text-blue-400', border: 'border-blue-500/50', bg: 'hover:bg-blue-900/20' };
                      if (titleLower.includes('mar') || titleLower.includes('oceano') || titleLower.includes('ilha')) {
                        lineageStyle = { glow: 'rgba(6,182,212,0.25)', text: 'text-cyan-400', border: 'border-cyan-500/50', bg: 'hover:bg-cyan-900/20' };
                      } else if (titleLower.includes('floresta') || titleLower.includes('selva') || titleLower.includes('natureza')) {
                        lineageStyle = { glow: 'rgba(34,197,94,0.25)', text: 'text-green-400', border: 'border-green-500/50', bg: 'hover:bg-green-900/20' };
                      } else if (titleLower.includes('deserto') || titleLower.includes('fogo') || titleLower.includes('sol')) {
                        lineageStyle = { glow: 'rgba(245,158,11,0.25)', text: 'text-amber-400', border: 'border-amber-500/50', bg: 'hover:bg-amber-900/20' };
                      } else if (titleLower.includes('montanha') || titleLower.includes('pedra') || titleLower.includes('terra')) {
                        lineageStyle = { glow: 'rgba(168,162,158,0.25)', text: 'text-stone-400', border: 'border-stone-500/50', bg: 'hover:bg-stone-900/20' };
                      }

                      return (
                        <tr 
                          key={opcao.id} 
                          className={`border-b border-blue-800/20 transition-colors ${lineageStyle.bg}`}
                        >
                          <td className={`p-6 align-top border-l-2 ${lineageStyle.border} ${lineageStyle.text} w-1/4`}>
                            <span className="font-bold text-lg block" style={{ fontFamily: 'Cinzel, serif' }}>{opcao.titulo}</span>
                          </td>
                          {grupo.campo !== 'linhagemId' && (
                            <td className="p-6 align-top text-blue-100/70 text-sm leading-relaxed w-1/3">
                              {descreverOpcaoRacial(opcao)}
                            </td>
                          )}
                          <td className="p-6 align-top">
                            {tracos.length > 0 ? (
                              <div className="space-y-4">
                                {tracos.map(traco => (
                                  <div key={traco.id} className="bg-black/20 p-3 rounded-lg border border-blue-900/30">
                                    <h4 className="text-sm font-bold text-blue-100 mb-1">{traco.titulo}</h4>
                                    {traco.descricao && <p className="text-xs text-blue-200/50 leading-relaxed">{traco.descricao}</p>}
                                  </div>
                                ))}
                              </div>
                            ) : (
                              <span className="text-blue-500/30 italic text-sm">Sem traços adicionais.</span>
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

export default Humano;
