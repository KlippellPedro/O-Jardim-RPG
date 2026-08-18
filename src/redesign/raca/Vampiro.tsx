import { motion } from 'framer-motion';
import { Droplet, Moon, Ghost } from 'lucide-react';
import type { IRaca } from '../../types/catalogo';

import { PremiumCard } from '../components/premium/PremiumCard';
import { obterGruposEscolhaRacial, obterTracosOpcaoRacial, descreverOpcaoRacial } from '../../services/racaService';
import { obterTemaPorId } from '../themeMap';

interface VampiroProps {
  raca: IRaca;
}

export const Vampiro = ({ raca }: VampiroProps) => {
  const tema = obterTemaPorId(raca.id);
  return (
    <div className="min-h-screen text-red-50 p-8 selection:bg-red-500/30 overflow-hidden relative">
      {/* Background Image */}
      <div 
        className="fixed inset-0 z-0 bg-cover bg-center bg-no-repeat bg-black"
        style={{ backgroundImage: "url('/assets/img/vampiro_bg.webp')" }}
      >
        <div className="absolute inset-0 bg-slate-950/80 mix-blend-multiply" />
        <div className="absolute inset-0 bg-gradient-to-b from-[#070101]/40 via-transparent to-[#070101]/90" />
      </div>

      {/* Blood/Darkness Background Effects */}
      <div className="fixed inset-0 pointer-events-none z-0">
        <div className="absolute top-[10%] right-[30%] w-[40%] h-[60%] bg-red-900/10 blur-[150px] rounded-full mix-blend-screen" />
        <div className="absolute bottom-[0%] left-[20%] w-[50%] h-[40%] bg-rose-950/20 blur-[120px] rounded-full mix-blend-screen" />
        
        {/* Falling blood drops */}
        {[...Array(15)].map((_, i) => (
          <motion.div
            key={i}
            className="absolute bg-red-600 rounded-full blur-[1px]"
            style={{
              width: Math.random() * 3 + 2,
              height: Math.random() * 15 + 5,
              left: `${Math.random() * 100}%`,
              opacity: Math.random() * 0.5 + 0.2,
            }}
            initial={{ y: -100 }}
            animate={{ y: typeof window !== 'undefined' ? window.innerHeight + 100 : 1000 }}
            transition={{
              duration: Math.random() * 2 + 1,
              repeat: Infinity,
              ease: "easeIn",
              delay: Math.random() * 2
            }}
          />
        ))}
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
            className={`w-28 h-28 mx-auto ${tema.bg} ${tema.border} rounded-full flex items-center justify-center mb-8 relative overflow-hidden backdrop-blur-md`}
          >
            <div className={`absolute inset-0 ${tema.bg}`} />
            <Droplet size={48} className={`${tema.icon} z-10`} strokeWidth={1.5} />
          </motion.div>

          <motion.div className="overflow-hidden">
             <motion.h1 
                initial={{ y: "100%" }}
                animate={{ y: 0 }}
                transition={{ duration: 0.8, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
                className={`text-7xl font-serif tracking-tight ${tema.text} mb-6 uppercase`}
                style={{ fontFamily: 'Cinzel, serif' }}
             >
               Vampiro
             </motion.h1>
          </motion.div>
          <motion.p 
             initial={{ opacity: 0 }}
             animate={{ opacity: 1 }}
             transition={{ duration: 1, delay: 0.6 }}
             className="text-lg text-red-200/60 max-w-2xl mx-auto font-medium leading-relaxed font-serif"
          >
            Enxerga no escuro natural, fecha ferida bebendo sangue e paga caro quando fica sem. O povo é de Întuneric e fala Romeno. A dimensão inteira gira em torno de uma cadeia alimentar que termina neles.
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
            className={`flex flex-col p-8 rounded-xl ${tema.bg} border-l-4 ${tema.border} backdrop-blur-md`}
          >
            <Moon size={32} className={`${tema.icon} mb-4`} strokeWidth={1.5} />
            <h3 className={`text-2xl font-serif ${tema.text} mb-3`} style={{ fontFamily: 'Cinzel, serif' }}>Visão Noturna</h3>
            <p className="text-red-200/60 leading-relaxed text-sm">
              Sua fisiologia permite enxergar normalmente em escuridão natural, embora não funcione através de escuridão criada por magia ou Fluxo.
            </p>
          </PremiumCard>

          <PremiumCard
            glowColor={tema.glow}
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className={`flex flex-col p-8 rounded-xl ${tema.bg} border-l-4 ${tema.border} backdrop-blur-md`}
          >
            <Droplet size={32} className={`${tema.icon} mb-4`} strokeWidth={1.5} />
            <h3 className={`text-2xl font-serif ${tema.text} mb-3`} style={{ fontFamily: 'Cinzel, serif' }}>Hemofagia</h3>
            <p className="text-red-200/60 leading-relaxed text-sm">
              Uma vez por cena, gaste 1 ação para beber o sangue de um ser vivo voluntário ou incapacitado e recuperar 1d6 de Vida. Não afeta construtos, espíritos ou criaturas sem sangue.
            </p>
          </PremiumCard>

          <PremiumCard
            glowColor={tema.glow}
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.4 }}
            className={`col-span-1 md:col-span-2 flex flex-col p-8 rounded-xl ${tema.bg} border-l-4 ${tema.border} backdrop-blur-md`}
          >
            <Ghost size={32} className={`${tema.icon} mb-4`} strokeWidth={1.5} />
            <h3 className={`text-2xl font-serif ${tema.text} mb-3`} style={{ fontFamily: 'Cinzel, serif' }}>Fome de Sangue</h3>
            <p className="text-red-200/60 leading-relaxed text-sm">
              Depois de 24 horas sem consumir sangue, os descansos recuperam apenas metade da Mana normal (mínimo 1) até que o Vampiro se alimente. A sede sempre cobra seu preço.
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
                <p className="text-red-200/60 text-lg">{grupo.descricao}</p>
              </motion.div>
              
              <div className="overflow-x-auto rounded-xl border border-red-800/40 bg-red-950/20 backdrop-blur-md shadow-lg shadow-red-900/10">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-red-800/40 bg-red-950/60">
                      <th className="p-6 font-bold text-red-100 uppercase tracking-widest text-sm" style={{ fontFamily: 'Cinzel, serif' }}>Opção</th>
                      {grupo.campo !== 'linhagemId' && <th className="p-6 font-bold text-red-100 uppercase tracking-widest text-sm" style={{ fontFamily: 'Cinzel, serif' }}>Descrição</th>}
                      <th className="p-6 font-bold text-red-100 uppercase tracking-widest text-sm" style={{ fontFamily: 'Cinzel, serif' }}>Traços</th>
                    </tr>
                  </thead>
                  <tbody>
                    {grupo.opcoes.map((opcao) => {
                      const tracos = obterTracosOpcaoRacial(opcao);
                      const titleLower = opcao.titulo.toLowerCase();
                      
                      let lineageStyle = { glow: 'rgba(239,68,68,0.25)', text: 'text-red-400', border: 'border-red-500/50', bg: 'hover:bg-red-900/20' };
                      if (titleLower.includes('nobre') || titleLower.includes('aristocrata')) {
                        lineageStyle = { glow: 'rgba(234,179,8,0.25)', text: 'text-yellow-400', border: 'border-yellow-500/50', bg: 'hover:bg-yellow-900/20' };
                      } else if (titleLower.includes('bestial') || titleLower.includes('selvagem')) {
                        lineageStyle = { glow: 'rgba(249,115,22,0.25)', text: 'text-orange-400', border: 'border-orange-500/50', bg: 'hover:bg-orange-900/20' };
                      } else if (titleLower.includes('sombra') || titleLower.includes('oculto')) {
                        lineageStyle = { glow: 'rgba(168,85,247,0.25)', text: 'text-purple-400', border: 'border-purple-500/50', bg: 'hover:bg-purple-900/20' };
                      }

                      return (
                        <tr 
                          key={opcao.id} 
                          className={`border-b border-red-800/20 transition-colors ${lineageStyle.bg}`}
                        >
                          <td className={`p-6 align-top border-l-2 ${lineageStyle.border} ${lineageStyle.text} w-1/4`}>
                            <span className="font-bold text-lg block" style={{ fontFamily: 'Cinzel, serif' }}>{opcao.titulo}</span>
                          </td>
                          {grupo.campo !== 'linhagemId' && (
                            <td className="p-6 align-top text-red-100/70 text-sm leading-relaxed w-1/3">
                              {descreverOpcaoRacial(opcao)}
                            </td>
                          )}
                          <td className="p-6 align-top">
                            {tracos.length > 0 ? (
                              <div className="space-y-4">
                                {tracos.map(traco => (
                                  <div key={traco.id} className="bg-black/20 p-3 rounded-lg border border-red-900/30">
                                    <h4 className="text-sm font-bold text-red-100 mb-1">{traco.titulo}</h4>
                                    {traco.descricao && <p className="text-xs text-red-200/50 leading-relaxed">{traco.descricao}</p>}
                                  </div>
                                ))}
                              </div>
                            ) : (
                              <span className="text-red-500/30 italic text-sm">Sem traços adicionais.</span>
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

export default Vampiro;
