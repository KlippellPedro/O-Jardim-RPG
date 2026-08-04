import { motion } from 'framer-motion';
import { Coins, FastForward, Activity } from 'lucide-react';
import type { IRaca } from '../../types/catalogo';
import { PremiumCard } from '../components/premium/PremiumCard';
import { obterGruposEscolhaRacial, obterTracosOpcaoRacial, descreverOpcaoRacial } from '../../services/racaService';
import { obterTemaPorId } from '../themeMap';

interface GoblimProps {
  raca: IRaca;
}

export const Goblim = ({ raca }: GoblimProps) => {
  const tema = obterTemaPorId(raca.id);

  return (
    <div className="min-h-screen text-lime-50 p-8 selection:bg-lime-500/30 overflow-hidden relative">
      {/* Goblim Background */}
      <div 
        className="fixed inset-0 z-0 bg-cover bg-center bg-no-repeat bg-black"
        style={{ backgroundImage: "url('/assets/img/goblim_bg.jpg')" }}
      >
        <div className="absolute inset-0 bg-lime-950/80 mix-blend-multiply" />
        <div className="absolute inset-0 bg-gradient-to-b from-[#080d08]/40 via-transparent to-[#080d08]/90" />
      </div>

      {/* Chaotic/Trade Background Effects */}
      <div className="fixed inset-0 pointer-events-none z-0">
        <div className="absolute top-[10%] right-[10%] w-[60%] h-[60%] bg-lime-900/10 blur-[150px] rounded-full mix-blend-screen" />
        
        {/* Fast moving lines */}
        {[...Array(10)].map((_, i) => (
          <motion.div
            key={i}
            className="absolute h-[1px] bg-lime-500/20"
            style={{
              width: Math.random() * 100 + 50,
              top: `${Math.random() * 100}%`,
              left: '-20%',
            }}
            animate={{ x: (typeof window !== 'undefined' ? window.innerWidth : 1000) + 200 }}
            transition={{
              duration: Math.random() * 1 + 0.5,
              repeat: Infinity,
              ease: "linear",
              delay: Math.random() * 2
            }}
          />
        ))}
      </div>

      <div className="max-w-5xl mx-auto relative z-10 pt-16">
        {/* Header */}
        <motion.header 
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5, type: "spring", stiffness: 200 }}
          className="text-center mb-24"
        >
          <motion.div 
            whileHover={{ scale: 1.1, rotate: 10 }}
            className={`w-28 h-28 mx-auto ${tema.bg} border ${tema.border} rounded-3xl flex items-center justify-center mb-8 backdrop-blur-md cursor-pointer`}
            style={{ boxShadow: `0 0 20px ${tema.glow}` }}
          >
            <Coins size={48} className={tema.icon} strokeWidth={1.5} />
          </motion.div>

          <motion.div className="overflow-hidden">
             <motion.h1 
                initial={{ y: "100%" }}
                animate={{ y: 0 }}
                transition={{ duration: 0.8, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
                className={`text-7xl font-bold tracking-tight ${tema.text} mb-6 uppercase`}
                style={{ fontFamily: 'Cinzel, serif' }}
             >
               Goblim
             </motion.h1>
          </motion.div>
          <motion.p 
             initial={{ opacity: 0 }}
             animate={{ opacity: 1 }}
             transition={{ duration: 1, delay: 0.6 }}
             className="text-xl text-lime-100/60 max-w-2xl mx-auto font-medium leading-relaxed"
          >
            Pequenos, caóticos, rápidos e sempre com um plano. Se há uma vantagem a ser levada ou uma barganha a ser feita, eles chegarão lá antes de todo mundo.
          </motion.p>
        </motion.header>

        {/* Traits Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-24">
          <PremiumCard
            glowColor={tema.glow}
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.4 }}
            className={`flex flex-col p-8 rounded-xl ${tema.bg} border ${tema.border} backdrop-blur-md`}
          >
            <Activity size={32} className={`${tema.icon} mb-6`} />
            <h3 className={`text-2xl font-bold ${tema.text} mb-3`} style={{ fontFamily: 'Cinzel, serif' }}>Tamanho Pequeno</h3>
            <p className="text-lime-200/60 leading-relaxed text-sm">
              Sua estrutura compacta permite acessar lugares estreitos, mas suas armas e equipamentos devem ser apropriados para sua estatura.
            </p>
          </PremiumCard>

          <PremiumCard
            glowColor={tema.glow}
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.4, delay: 0.1 }}
            className={`flex flex-col p-8 rounded-xl ${tema.bg} border ${tema.border} backdrop-blur-md`}
          >
            <FastForward size={32} className={`${tema.icon} mb-6`} />
            <h3 className={`text-2xl font-bold ${tema.text} mb-3`} style={{ fontFamily: 'Cinzel, serif' }}>Passos Ligeiros</h3>
            <p className="text-lime-200/60 leading-relaxed text-sm">
              Sua agilidade natural permite cobrir terrenos rapidamente. Receba um bônus permanente de +1,5 m no seu Movimento básico.
            </p>
          </PremiumCard>

          <PremiumCard
            glowColor={tema.glow}
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.4, delay: 0.2 }}
            className={`col-span-1 md:col-span-2 flex flex-col p-8 rounded-xl ${tema.bg} border ${tema.border} backdrop-blur-md`}
          >
            <Coins size={32} className={`${tema.icon} mb-6`} />
            <h3 className={`text-2xl font-bold ${tema.text} mb-3`} style={{ fontFamily: 'Cinzel, serif' }}>Mercador Improvisador</h3>
            <p className="text-lime-200/60 leading-relaxed text-sm">
              Receba vantagem em testes feitos para negociar a venda de um item que pertence ao Goblim. Onde os outros veem lixo, você vê oportunidade e lucro imediato.
            </p>
          </PremiumCard>
        </div>

        {/* Custom Lineages for Goblim */}
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
                <p className="text-lime-200/60 text-lg">{grupo.descricao}</p>
              </motion.div>
              
              <div className="overflow-x-auto rounded-none border border-lime-800/40 bg-lime-950/20 backdrop-blur-md shadow-lg shadow-lime-900/10">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-lime-800/40 bg-lime-950/60">
                      <th className="p-6 font-bold text-lime-100 uppercase tracking-widest text-sm" style={{ fontFamily: 'Cinzel, serif' }}>Opção</th>
                      {grupo.campo !== 'linhagemId' && <th className="p-6 font-bold text-lime-100 uppercase tracking-widest text-sm" style={{ fontFamily: 'Cinzel, serif' }}>Descrição</th>}
                      <th className="p-6 font-bold text-lime-100 uppercase tracking-widest text-sm" style={{ fontFamily: 'Cinzel, serif' }}>Traços</th>
                    </tr>
                  </thead>
                  <tbody>
                    {grupo.opcoes.map((opcao) => {
                      const tracos = obterTracosOpcaoRacial(opcao);
                      const titleLower = opcao.titulo.toLowerCase();
                      
                      let lineageStyle = { glow: 'rgba(132,204,22,0.25)', text: 'text-lime-400', border: 'border-lime-500/50', bg: 'hover:bg-lime-900/20' };
                      if (titleLower.includes('sucata') || titleLower.includes('invenção') || titleLower.includes('mecânica')) {
                        lineageStyle = { glow: 'rgba(161,161,170,0.25)', text: 'text-zinc-400', border: 'border-zinc-500/50', bg: 'hover:bg-zinc-950/30' };
                      } else if (titleLower.includes('mercado') || titleLower.includes('ouro') || titleLower.includes('moeda')) {
                        lineageStyle = { glow: 'rgba(234,179,8,0.25)', text: 'text-yellow-400', border: 'border-yellow-500/50', bg: 'hover:bg-yellow-950/30' };
                      } else if (titleLower.includes('esgoto') || titleLower.includes('rato') || titleLower.includes('subterrâneo')) {
                        lineageStyle = { glow: 'rgba(120,113,108,0.25)', text: 'text-stone-400', border: 'border-stone-500/50', bg: 'hover:bg-stone-950/30' };
                      }

                      return (
                        <tr 
                          key={opcao.id} 
                          className={`border-b border-lime-800/20 transition-colors ${lineageStyle.bg}`}
                        >
                          <td className={`p-6 align-top border-l-2 ${lineageStyle.border} ${lineageStyle.text} w-1/4`}>
                            <span className="font-bold text-lg block" style={{ fontFamily: 'Cinzel, serif' }}>{opcao.titulo}</span>
                          </td>
                          {grupo.campo !== 'linhagemId' && (
                            <td className="p-6 align-top text-lime-100/70 text-sm leading-relaxed w-1/3">
                              {descreverOpcaoRacial(opcao)}
                            </td>
                          )}
                          <td className="p-6 align-top">
                            {tracos.length > 0 ? (
                              <div className="space-y-4">
                                {tracos.map(traco => (
                                  <div key={traco.id} className="bg-black/20 p-3 rounded-none border border-lime-900/30">
                                    <h4 className="text-sm font-bold text-lime-100 mb-1">{traco.titulo}</h4>
                                    {traco.descricao && <p className="text-xs text-lime-200/50 leading-relaxed">{traco.descricao}</p>}
                                  </div>
                                ))}
                              </div>
                            ) : (
                              <span className="text-lime-500/30 italic text-sm">Sem traços adicionais.</span>
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

export default Goblim;
