import { motion } from 'framer-motion';
import { PawPrint, Volume2, TreePine } from 'lucide-react';
import type { IRaca } from '../../types/catalogo';
import { PremiumCard } from '../components/premium/PremiumCard';
import { obterGruposEscolhaRacial, obterTracosOpcaoRacial, descreverOpcaoRacial } from '../../services/racaService';
import { obterTemaPorId } from '../themeMap';

export const Animalia = ({ raca }: { raca: IRaca }) => {
  const tema = obterTemaPorId(raca.id);
  return (
    <div className="min-h-screen text-green-50 p-8 selection:bg-green-500/30 overflow-hidden relative">
      {/* Wilderness Background */}
      <div 
        className="fixed inset-0 z-0 bg-cover bg-center bg-no-repeat bg-black"
        style={{ backgroundImage: "url('/assets/img/animalia_bg.jpg')" }}
      >
        <div className="absolute inset-0 bg-green-950/80 mix-blend-multiply" />
        <div className="absolute inset-0 bg-gradient-to-b from-[#0d120a]/40 via-transparent to-[#0d120a]/90" />
      </div>

      {/* Wilderness Background Effects */}
      <div className="fixed inset-0 pointer-events-none z-0">
        <div className="absolute top-[20%] right-[20%] w-[40%] h-[40%] bg-emerald-900/10 blur-[150px] rounded-full mix-blend-screen" />
        <div className="absolute bottom-[10%] left-[10%] w-[50%] h-[50%] bg-green-900/10 blur-[150px] rounded-full mix-blend-screen" />
        
        {/* Falling leaves / pollen */}
        {[...Array(25)].map((_, i) => (
          <motion.div
            key={i}
            className="absolute w-2 h-2 rounded-full"
            style={{
              backgroundColor: Math.random() > 0.5 ? 'rgba(52, 211, 153, 0.4)' : 'rgba(217, 119, 6, 0.3)',
            }}
            initial={{ 
              x: Math.random() * (typeof window !== 'undefined' ? window.innerWidth : 1000), 
              y: -50,
              rotate: 0
            }}
            animate={{
              y: (typeof window !== 'undefined' ? window.innerHeight : 1000) + 50,
              x: `+=${Math.random() * 200 - 100}`,
              rotate: 360,
              opacity: [0, 1, 0],
            }}
            transition={{
              duration: Math.random() * 10 + 10,
              repeat: Infinity,
              delay: Math.random() * 10,
              ease: "linear"
            }}
          />
        ))}
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
            className={`w-28 h-28 mx-auto ${tema.bg} ${tema.border} rounded-full flex items-center justify-center mb-8 backdrop-blur-md relative`}
          >
            <PawPrint size={48} className={`${tema.icon} z-10`} strokeWidth={1.5} />
            <motion.div
              animate={{ scale: [1, 1.2, 1], opacity: [0.3, 0.1, 0.3] }}
              transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
              className={`absolute inset-0 ${tema.bg} rounded-full blur-[10px]`}
            />
          </motion.div>

          <motion.div className="overflow-hidden">
             <motion.h1 
                initial={{ y: "100%" }}
                animate={{ y: 0 }}
                transition={{ duration: 0.8, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
                className={`text-7xl font-bold tracking-tight ${tema.text} mb-6 uppercase`}
                style={{ fontFamily: 'Cinzel, serif' }}
             >
               Animália
             </motion.h1>
          </motion.div>
          <motion.p 
             initial={{ opacity: 0 }}
             animate={{ opacity: 1 }}
             transition={{ duration: 1, delay: 0.6 }}
             className="text-lg text-green-100/60 max-w-2xl mx-auto font-medium leading-relaxed"
          >
            Ligados à selva por laços de sangue e espírito. Eles carregam a herança selvagem em sua fisiologia, unindo a inteligência humanóide com os instintos de uma fera.
          </motion.p>
        </motion.header>

        {/* Traits Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-24">
          <PremiumCard
            glowColor={tema.glow}
            initial={{ opacity: 0, x: -30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className={`flex gap-6 p-8 rounded-2xl ${tema.bg} ${tema.border} backdrop-blur-md`}
          >
            <TreePine size={40} className={`${tema.icon} shrink-0`} strokeWidth={1.5} />
            <div>
              <h3 className={`text-2xl font-bold ${tema.text} mb-3`} style={{ fontFamily: 'Cinzel, serif' }}>Morfologia Animal</h3>
              <p className="text-green-100/60 leading-relaxed text-sm">
                O tamanho e a aparência são definidos pelo animal representado e pela morfologia escolhida na criação (antropomórfico, traços leves ou animal puro).
              </p>
            </div>
          </PremiumCard>

          <PremiumCard
            glowColor={tema.glow}
            initial={{ opacity: 0, x: 30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className={`flex gap-6 p-8 rounded-2xl ${tema.bg} ${tema.border} backdrop-blur-md`}
          >
            <Volume2 size={40} className={`${tema.icon} shrink-0`} strokeWidth={1.5} />
            <div>
              <h3 className={`text-2xl font-bold ${tema.text} mb-3`} style={{ fontFamily: 'Cinzel, serif' }}>Voz da Fauna</h3>
              <p className="text-green-100/60 leading-relaxed text-sm">
                Você consegue comunicar ideias simples a animais e compreender suas respostas básicas. Isso não concede controle sobre eles, apenas a capacidade de entender a selva.
              </p>
            </div>
          </PremiumCard>
        </div>

        {/* Custom Lineages for Animália */}
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
                <p className="text-green-100/60 text-lg">{grupo.descricao}</p>
              </motion.div>
              
              <div className="overflow-x-auto rounded-none border border-green-800/40 bg-green-950/20 backdrop-blur-md shadow-lg shadow-green-900/10">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-green-800/40 bg-green-950/60">
                      <th className="p-6 font-bold text-green-100 uppercase tracking-widest text-sm" style={{ fontFamily: 'Cinzel, serif' }}>Espécie/Morfologia</th>
                      {grupo.campo !== 'linhagemId' && <th className="p-6 font-bold text-green-100 uppercase tracking-widest text-sm" style={{ fontFamily: 'Cinzel, serif' }}>Descrição</th>}
                      <th className="p-6 font-bold text-green-100 uppercase tracking-widest text-sm" style={{ fontFamily: 'Cinzel, serif' }}>Traços Ferais</th>
                    </tr>
                  </thead>
                  <tbody>
                    {grupo.opcoes.map((opcao) => {
                      const tracos = obterTracosOpcaoRacial(opcao);
                      const titleLower = opcao.titulo.toLowerCase();
                      
                      let lineageStyle = { glow: 'rgba(34,197,94,0.25)', text: 'text-green-400', border: 'border-green-500/50', bg: 'hover:bg-green-900/30' };
                      if (titleLower.includes('predador') || titleLower.includes('caçador') || titleLower.includes('feroz') || titleLower.includes('sangue') || titleLower.includes('carnívoro')) {
                        lineageStyle = { glow: 'rgba(239,68,68,0.25)', text: 'text-red-400', border: 'border-red-500/50', bg: 'hover:bg-red-950/30' };
                      } else if (titleLower.includes('águia') || titleLower.includes('ave') || titleLower.includes('céu') || titleLower.includes('voo')) {
                        lineageStyle = { glow: 'rgba(56,189,248,0.25)', text: 'text-sky-400', border: 'border-sky-500/50', bg: 'hover:bg-sky-950/30' };
                      } else if (titleLower.includes('peixe') || titleLower.includes('mar') || titleLower.includes('aquático') || titleLower.includes('anfíbio')) {
                        lineageStyle = { glow: 'rgba(59,130,246,0.25)', text: 'text-blue-400', border: 'border-blue-500/50', bg: 'hover:bg-blue-950/30' };
                      } else if (titleLower.includes('resistente') || titleLower.includes('casco') || titleLower.includes('urso') || titleLower.includes('forte') || titleLower.includes('bruto')) {
                        lineageStyle = { glow: 'rgba(245,158,11,0.25)', text: 'text-amber-400', border: 'border-amber-500/50', bg: 'hover:bg-amber-950/30' };
                      } else if (titleLower.includes('noturno') || titleLower.includes('sombra') || titleLower.includes('morcego') || titleLower.includes('coruja')) {
                        lineageStyle = { glow: 'rgba(168,85,247,0.25)', text: 'text-purple-400', border: 'border-purple-500/50', bg: 'hover:bg-purple-950/30' };
                      }

                      return (
                        <tr 
                          key={opcao.id} 
                          className={`border-b border-green-800/20 transition-colors ${lineageStyle.bg}`}
                        >
                          <td className={`p-6 align-top border-l-2 ${lineageStyle.border} ${lineageStyle.text} w-1/4`}>
                            <span className="font-bold text-lg block" style={{ fontFamily: 'Cinzel, serif' }}>{opcao.titulo}</span>
                          </td>
                          {grupo.campo !== 'linhagemId' && (
                            <td className="p-6 align-top text-green-100/70 text-sm leading-relaxed w-1/3">
                              {descreverOpcaoRacial(opcao)}
                            </td>
                          )}
                          <td className="p-6 align-top">
                            {tracos.length > 0 ? (
                              <div className="space-y-4">
                                {tracos.map(traco => (
                                  <div key={traco.id} className="bg-black/20 p-3 rounded-none border border-green-900/30">
                                    <h4 className="text-sm font-bold text-green-200 mb-1">{traco.titulo}</h4>
                                    {traco.descricao && <p className="text-xs text-green-100/50 leading-relaxed">{traco.descricao}</p>}
                                  </div>
                                ))}
                              </div>
                            ) : (
                              <span className="text-green-500/30 italic text-sm">Sem traços adicionais.</span>
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

export default Animalia;
