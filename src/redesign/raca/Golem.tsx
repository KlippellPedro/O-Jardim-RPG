import { motion } from 'framer-motion';
import { Pickaxe, Wrench, PackageSearch } from 'lucide-react';
import type { IRaca } from '../../types/catalogo';
import { PremiumCard } from '../components/premium/PremiumCard';
import { obterGruposEscolhaRacial, obterTracosOpcaoRacial, descreverOpcaoRacial } from '../../services/racaService';
import { obterTemaPorId } from '../themeMap';

export const Golem = ({ raca }: { raca: IRaca }) => {
  const tema = obterTemaPorId(raca.id);

  return (
    <div className="min-h-screen text-stone-50 p-8 selection:bg-stone-500/30 overflow-hidden relative">
      {/* Golem Background */}
      <div 
        className="fixed inset-0 z-0 bg-cover bg-center bg-no-repeat bg-black"
        style={{ backgroundImage: "url('/assets/img/golem_bg.jpg')" }}
      >
        <div className="absolute inset-0 bg-stone-950/80 mix-blend-multiply" />
        <div className="absolute inset-0 bg-gradient-to-b from-[#0c0a08]/40 via-transparent to-[#0c0a08]/90" />
      </div>

      {/* Stone / Clay / Magic Core Background Effects */}
      <div className="fixed inset-0 pointer-events-none z-0">
        <div className="absolute top-[30%] left-[30%] w-[40%] h-[40%] bg-amber-900/10 blur-[150px] rounded-full mix-blend-screen" />
        
        {/* Magic Core Pulse */}
        <motion.div 
          className="absolute top-[50%] left-[50%] -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-amber-500/5 blur-[80px] rounded-full mix-blend-screen"
          animate={{ scale: [1, 1.2, 1], opacity: [0.5, 0.8, 0.5] }}
          transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
        />
      </div>

      <div className="max-w-5xl mx-auto relative z-10 pt-16">
        {/* Header */}
        <motion.header 
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          className="text-center mb-24"
        >
          <motion.div 
            className={`w-32 h-32 mx-auto ${tema.bg} border-[4px] ${tema.border} rounded-lg flex items-center justify-center mb-8 relative backdrop-blur-md`}
            style={{ boxShadow: `0 0 30px ${tema.glow}` }}
          >
            {/* Glowing runes on the golem's head/chest */}
            <div className="absolute inset-x-0 top-1/3 flex justify-center gap-2">
              <motion.div className="w-2 h-2 bg-amber-500 rounded-full blur-[2px]" animate={{ opacity: [0.4, 1, 0.4] }} transition={{ duration: 2, repeat: Infinity }} />
              <motion.div className="w-2 h-2 bg-amber-500 rounded-full blur-[2px]" animate={{ opacity: [0.4, 1, 0.4] }} transition={{ duration: 2, repeat: Infinity, delay: 0.5 }} />
            </div>
            <Pickaxe size={48} className={`${tema.icon} z-10 mt-4`} strokeWidth={1.5} />
          </motion.div>

          <motion.div className="overflow-hidden">
             <motion.h1 
                initial={{ y: "100%" }}
                animate={{ y: 0 }}
                transition={{ duration: 0.8, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
                className={`text-8xl font-black tracking-tighter ${tema.text} mb-6 uppercase`}
                style={{ fontFamily: 'Cinzel, serif' }}
             >
               Golem
             </motion.h1>
          </motion.div>
          <motion.p 
             initial={{ opacity: 0 }}
             animate={{ opacity: 1 }}
             transition={{ duration: 1, delay: 0.6 }}
             className="text-xl text-stone-400 max-w-2xl mx-auto font-medium leading-relaxed"
          >
            Uma força da natureza amarrada por selos antigos ou construtos rudimentares de pura matéria. Um corpo pesado, silencioso e virtualmente indestrutível pela passagem do tempo.
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
            className={`flex flex-col p-8 ${tema.bg} border-2 ${tema.border} rounded-sm backdrop-blur-md`}
          >
            <PackageSearch size={36} className={`${tema.icon} mb-4`} strokeWidth={1.5} />
            <h3 className={`text-2xl font-bold ${tema.text} mb-3`} style={{ fontFamily: 'Cinzel, serif' }}>Tamanho e Fisiologia</h3>
            <p className="text-stone-400 leading-relaxed text-sm">
              Tamanho Grande ou Enorme, definido na criação. Não precisa respirar, comer ou beber e não contrai doenças comuns. É puramente matéria inanimada ganhando movimento.
            </p>
          </PremiumCard>

          <PremiumCard
            glowColor={tema.glow}
            initial={{ opacity: 0, scale: 0.95 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className={`flex flex-col p-8 ${tema.bg} border-2 ${tema.border} rounded-sm backdrop-blur-md`}
          >
            <Wrench size={36} className={`${tema.icon} mb-4`} strokeWidth={1.5} />
            <h3 className={`text-2xl font-bold ${tema.text} mb-3`} style={{ fontFamily: 'Cinzel, serif' }}>Corpo Construído</h3>
            <p className="text-stone-400 leading-relaxed text-sm">
              A perícia de Ofício substitui Medicina para tratar os ferimentos de um Golem, usando a mesma DT. Tratamentos dependentes exclusivamente de biologia viva não funcionam, afinal, ele precisa de reparos físicos pesados. Armaduras comuns exigem adaptação.
            </p>
          </PremiumCard>
        </div>

        {/* Custom Lineages for Golem */}
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
                      
                      let lineageStyle = { glow: 'rgba(217,119,6,0.25)', text: 'text-amber-500', border: 'border-amber-600/50', bg: 'hover:bg-amber-950/30' };
                      if (titleLower.includes('barro') || titleLower.includes('argila') || titleLower.includes('terra')) {
                        lineageStyle = { glow: 'rgba(120,113,108,0.25)', text: 'text-stone-500', border: 'border-stone-600/50', bg: 'hover:bg-stone-900/40' };
                      } else if (titleLower.includes('ferro') || titleLower.includes('aço') || titleLower.includes('metal')) {
                        lineageStyle = { glow: 'rgba(161,161,170,0.25)', text: 'text-zinc-400', border: 'border-zinc-500/50', bg: 'hover:bg-zinc-950/30' };
                      } else if (titleLower.includes('cristal') || titleLower.includes('vidro') || titleLower.includes('prisma')) {
                        lineageStyle = { glow: 'rgba(45,212,191,0.25)', text: 'text-teal-400', border: 'border-teal-500/50', bg: 'hover:bg-teal-950/30' };
                      } else if (titleLower.includes('carne') || titleLower.includes('sangue')) {
                        lineageStyle = { glow: 'rgba(225,29,72,0.25)', text: 'text-rose-500', border: 'border-rose-600/50', bg: 'hover:bg-rose-950/30' };
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

export default Golem;
