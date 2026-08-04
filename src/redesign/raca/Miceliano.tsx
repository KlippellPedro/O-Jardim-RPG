import { motion } from 'framer-motion';
import { Sprout, Wifi, Footprints } from 'lucide-react';
import type { IRaca } from '../../types/catalogo';

import { PremiumCard } from '../components/premium/PremiumCard';
import { obterGruposEscolhaRacial, obterTracosOpcaoRacial, descreverOpcaoRacial } from '../../services/racaService';
import { obterTemaPorId } from '../themeMap';

interface MicelianoProps {
  raca: IRaca;
}

export const Miceliano = ({ raca }: MicelianoProps) => {
  const tema = obterTemaPorId(raca.id);
  return (
    <div className="min-h-screen text-purple-50 p-8 selection:bg-purple-500/30 overflow-hidden relative">
      {/* Background Image */}
      <div 
        className="fixed inset-0 z-0 bg-cover bg-center bg-no-repeat bg-black"
        style={{ backgroundImage: "url('/assets/img/miceliano_bg.jpg')" }}
      >
        <div className="absolute inset-0 bg-slate-950/80 mix-blend-multiply" />
        <div className="absolute inset-0 bg-gradient-to-b from-[#0d0914]/40 via-transparent to-[#0d0914]/90" />
      </div>

      {/* Fungal Bioluminescence Effects */}
      <div className="fixed inset-0 pointer-events-none z-0">
        <div className="absolute top-[20%] left-[20%] w-[50%] h-[50%] bg-purple-900/20 blur-[150px] rounded-full mix-blend-screen" />
        <div className="absolute bottom-[10%] right-[10%] w-[40%] h-[40%] bg-fuchsia-900/10 blur-[120px] rounded-full mix-blend-screen" />
        
        {/* Floating Spores */}
        {[...Array(40)].map((_, i) => (
          <motion.div
            key={i}
            className="absolute rounded-full"
            style={{
              width: Math.random() * 4 + 2,
              height: Math.random() * 4 + 2,
              backgroundColor: Math.random() > 0.5 ? 'rgba(192, 132, 252, 0.6)' : 'rgba(232, 121, 249, 0.4)',
              boxShadow: '0 0 10px rgba(192, 132, 252, 0.5)',
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
            }}
            animate={{
              y: `+=${Math.random() * 40 - 20}`,
              x: `+=${Math.random() * 40 - 20}`,
              opacity: [0, 1, 0],
            }}
            transition={{
              duration: Math.random() * 5 + 3,
              repeat: Infinity,
              ease: "easeInOut",
              delay: Math.random() * 3
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
            className={`w-28 h-28 mx-auto ${tema.bg} border-2 ${tema.border} rounded-full flex items-center justify-center mb-8 backdrop-blur-md relative`}
          >
            <Sprout size={48} className={`${tema.icon} z-10`} strokeWidth={1.5} />
          </motion.div>

          <motion.div className="overflow-hidden">
             <motion.h1 
                initial={{ y: "100%" }}
                animate={{ y: 0 }}
                transition={{ duration: 0.8, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
                className={`text-7xl font-bold tracking-tight ${tema.text} mb-6 uppercase`}
                style={{ fontFamily: 'Cinzel, serif' }}
             >
               Miceliano
             </motion.h1>
          </motion.div>
          <motion.p 
             initial={{ opacity: 0 }}
             animate={{ opacity: 1 }}
             transition={{ duration: 1, delay: 0.6 }}
             className="text-lg text-purple-200/60 max-w-2xl mx-auto font-medium leading-relaxed"
          >
            Parte criatura, parte fungo. Eles se conectam à terra e aos seus aliados de formas que os seres de carne e osso mal conseguem compreender, formando redes invisíveis de informação.
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
            className={`flex gap-6 p-8 rounded-xl ${tema.bg} ${tema.border} backdrop-blur-md`}
          >
            <Wifi size={40} className={`${tema.icon} shrink-0`} strokeWidth={1.5} />
            <div>
              <h3 className={`text-2xl font-bold ${tema.text} mb-3`} style={{ fontFamily: 'Cinzel, serif' }}>Rede Micelial</h3>
              <p className="text-purple-200/60 leading-relaxed text-sm">
                Deixe esporos em um aliado voluntário. Até o próximo descanso, vocês podem trocar silenciosamente ideias simples enquanto estiverem a até 30 m um do outro. 
              </p>
            </div>
          </PremiumCard>

          <PremiumCard
            glowColor={tema.glow}
            initial={{ opacity: 0, x: 30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className={`flex gap-6 p-8 rounded-xl ${tema.bg} ${tema.border} backdrop-blur-md`}
          >
            <Footprints size={40} className={`${tema.icon} shrink-0`} strokeWidth={1.5} />
            <div>
              <h3 className={`text-2xl font-bold ${tema.text} mb-3`} style={{ fontFamily: 'Cinzel, serif' }}>Memória do Solo</h3>
              <p className="text-purple-200/60 leading-relaxed text-sm">
                Após 1 minuto em contato com terra ou madeira, faça um teste de Sobrevivência para perceber através dos fungos e raízes se criaturas passaram pelo local recentemente. Revela presença e direção.
              </p>
            </div>
          </PremiumCard>

          <PremiumCard
            glowColor={tema.glow}
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.4 }}
            className={`col-span-1 md:col-span-2 flex gap-6 p-8 rounded-xl ${tema.bg} ${tema.border} backdrop-blur-md`}
          >
            <Sprout size={40} className={`${tema.icon} shrink-0`} strokeWidth={1.5} />
            <div>
              <h3 className={`text-2xl font-bold ${tema.text} mb-3`} style={{ fontFamily: 'Cinzel, serif' }}>Organismo Fúngico</h3>
              <p className="text-purple-200/60 leading-relaxed text-sm">
                Alimenta-se como um ser vivo comum, mas também consegue absorver nutrientes ao permanecer em contato com solo fértil durante um descanso.
              </p>
            </div>
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
                <p className="text-purple-200/60 text-lg">{grupo.descricao}</p>
              </motion.div>
              
              <div className="overflow-x-auto rounded-xl border border-purple-800/40 bg-purple-950/20 backdrop-blur-md shadow-lg shadow-purple-900/10">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-purple-800/40 bg-purple-950/60">
                      <th className="p-6 font-bold text-purple-100 uppercase tracking-widest text-sm" style={{ fontFamily: 'Cinzel, serif' }}>Opção</th>
                      {grupo.campo !== 'linhagemId' && <th className="p-6 font-bold text-purple-100 uppercase tracking-widest text-sm" style={{ fontFamily: 'Cinzel, serif' }}>Descrição</th>}
                      <th className="p-6 font-bold text-purple-100 uppercase tracking-widest text-sm" style={{ fontFamily: 'Cinzel, serif' }}>Traços</th>
                    </tr>
                  </thead>
                  <tbody>
                    {grupo.opcoes.map((opcao) => {
                      const tracos = obterTracosOpcaoRacial(opcao);
                      const titleLower = opcao.titulo.toLowerCase();
                      
                      let lineageStyle = { glow: 'rgba(168,85,247,0.25)', text: 'text-purple-400', border: 'border-purple-500/50', bg: 'hover:bg-purple-900/20' };
                      if (titleLower.includes('veneno') || titleLower.includes('tóxico')) {
                        lineageStyle = { glow: 'rgba(34,197,94,0.25)', text: 'text-green-400', border: 'border-green-500/50', bg: 'hover:bg-green-900/20' };
                      } else if (titleLower.includes('cura') || titleLower.includes('vida')) {
                        lineageStyle = { glow: 'rgba(236,72,153,0.25)', text: 'text-pink-400', border: 'border-pink-500/50', bg: 'hover:bg-pink-900/20' };
                      } else if (titleLower.includes('brilho') || titleLower.includes('luz')) {
                        lineageStyle = { glow: 'rgba(96,165,250,0.25)', text: 'text-blue-400', border: 'border-blue-500/50', bg: 'hover:bg-blue-900/20' };
                      }

                      return (
                        <tr 
                          key={opcao.id} 
                          className={`border-b border-purple-800/20 transition-colors ${lineageStyle.bg}`}
                        >
                          <td className={`p-6 align-top border-l-2 ${lineageStyle.border} ${lineageStyle.text} w-1/4`}>
                            <span className="font-bold text-lg block" style={{ fontFamily: 'Cinzel, serif' }}>{opcao.titulo}</span>
                          </td>
                          {grupo.campo !== 'linhagemId' && (
                            <td className="p-6 align-top text-purple-100/70 text-sm leading-relaxed w-1/3">
                              {descreverOpcaoRacial(opcao)}
                            </td>
                          )}
                          <td className="p-6 align-top">
                            {tracos.length > 0 ? (
                              <div className="space-y-4">
                                {tracos.map(traco => (
                                  <div key={traco.id} className="bg-black/20 p-3 rounded-lg border border-purple-900/30">
                                    <h4 className="text-sm font-bold text-purple-100 mb-1">{traco.titulo}</h4>
                                    {traco.descricao && <p className="text-xs text-purple-200/50 leading-relaxed">{traco.descricao}</p>}
                                  </div>
                                ))}
                              </div>
                            ) : (
                              <span className="text-purple-500/30 italic text-sm">Sem traços adicionais.</span>
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

export default Miceliano;
