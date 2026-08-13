import { motion } from 'framer-motion';
import { BookOpen, Brain, Infinity as InfinityIcon, BookKey, TreeDeciduous } from 'lucide-react';
import type { IRaca } from '../../types/catalogo';
import { PremiumCard } from '../components/premium/PremiumCard';
import { obterGruposEscolhaRacial, obterTracosOpcaoRacial, descreverOpcaoRacial } from '../../services/racaService';
import { obterTemaPorId } from '../themeMap';

export const Elfo = ({ raca }: { raca: IRaca }) => {
  const tema = obterTemaPorId(raca.id);
  return (
    <div className="min-h-screen text-emerald-50 p-8 selection:bg-emerald-500/30 overflow-hidden relative">
      {/* Calm Forest Background */}
      <div 
        className="fixed inset-0 z-0 bg-cover bg-center bg-no-repeat bg-[#070c06]"
        style={{ backgroundImage: "url('/assets/img/elfo_bg.webp')" }}
      >
        {/* Dark/Green overlay for readability and subtle fantasy vibe */}
        <div className="absolute inset-0 bg-[#070c06]/80 mix-blend-multiply" />
        <div className="absolute inset-0 bg-gradient-to-b from-[#070c06]/50 via-emerald-950/40 to-[#070c06]/95" />
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
            className={`w-28 h-28 mx-auto border-2 ${tema.border} ${tema.bg} rounded-full flex items-center justify-center mb-8 backdrop-blur-md relative`}
          >
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 60, repeat: Infinity, ease: "linear" }}
              className={`absolute inset-0 border border-dashed ${tema.border} rounded-full`}
            />
            <BookOpen size={48} className={`${tema.icon} z-10`} strokeWidth={1} />
          </motion.div>

          <motion.div className="overflow-hidden">
             <motion.h1 
                initial={{ y: "100%" }}
                animate={{ y: 0 }}
                transition={{ duration: 0.8, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
                className={`text-7xl font-serif font-light tracking-widest ${tema.text} mb-6 uppercase`}
                style={{ fontFamily: 'Cinzel, serif' }}
             >
               Elfo
             </motion.h1>
          </motion.div>
          <motion.p 
             initial={{ opacity: 0 }}
             animate={{ opacity: 1 }}
             transition={{ duration: 1, delay: 0.6 }}
             className="text-lg text-emerald-100/50 max-w-2xl mx-auto font-medium leading-relaxed font-serif"
          >
            Eles não envelhecem. O que para os outros é uma vida inteira, para eles é apenas uma estação para acumular conhecimento infinito e aprimorar seus intelectos até o ápice.
          </motion.p>
        </motion.header>

        {/* Traits Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-24">
          {[
            { icon: InfinityIcon, title: "Fisiologia Imortal", desc: "Não envelhece e é imune a envelhecimento sobrenatural.", delay: 0 },
            { icon: Brain, title: "Intelecto Élfico", desc: "Receba +4 em Inteligência. Somente esse bônus racial pode levar Inteligência acima do limite natural 20, até o máximo 24.", delay: 0.2 },
            { icon: BookKey, title: "Memória Milenar", desc: "Quatro rerrolagens por sessão, utilizáveis somente em testes de Inteligência. Ao gastar, rerrole e use o novo resultado.", delay: 0.4 },
            { icon: TreeDeciduous, title: "Herança Ancestral", desc: "Ao adquirir esta raça, receba um Legado adicional e escolha uma das seis Linhagens Élficas, recebendo suas características exclusivas.", delay: 0.6 },
          ].map((trait, index) => (
            <PremiumCard
              key={index}
              glowColor={tema.glow}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: trait.delay, duration: 0.5 }}
              className={`flex items-start gap-6 p-8 rounded-none ${tema.bg} border-l-2 ${tema.border} backdrop-blur-md group`}
            >
              <div className={`w-16 h-16 shrink-0 rounded-full ${tema.bg} flex items-center justify-center border ${tema.border} transition-colors`}>
                <trait.icon size={28} className={tema.icon} strokeWidth={1} />
              </div>
              <div>
                <h3 className={`text-2xl font-serif font-medium ${tema.text} mb-2`} style={{ fontFamily: 'Cinzel, serif' }}>{trait.title}</h3>
                <p className="text-emerald-200/50 leading-relaxed text-sm font-serif">
                  {trait.desc}
                </p>
              </div>
            </PremiumCard>
          ))}
        </div>

        {/* Custom Lineages for Elfo */}
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
                <p className="text-emerald-200/60 font-serif text-lg">{grupo.descricao}</p>
              </motion.div>
              
              <div className="grid grid-cols-1 gap-6">
                {[...grupo.opcoes].sort((a, b) => {
                  const titleA = a.titulo.toLowerCase();
                  const titleB = b.titulo.toLowerCase();
                  const isNoiteA = titleA.includes('noite');
                  const isNoiteB = titleB.includes('noite');
                  const isTempestadeA = titleA.includes('tempestade');
                  const isTempestadeB = titleB.includes('tempestade');
                  
                  if (isNoiteA && !isNoiteB) return 1;
                  if (!isNoiteA && isNoiteB) return -1;
                  
                  if (isTempestadeA && !isTempestadeB) return 1;
                  if (!isTempestadeA && isTempestadeB) return -1;
                  
                  return 0;
                }).map((opcao, opcaoIdx) => {
                  const tracos = obterTracosOpcaoRacial(opcao);
                  const titleLower = opcao.titulo.toLowerCase();
                  
                  // Custom colors for different elven lineages
                  let lineageStyle = { glow: tema.glow, text: tema.text, border: tema.border, bg: tema.bg };
                  if (titleLower.includes('natureza') || titleLower.includes('silvestre') || titleLower.includes('verde')) {
                    lineageStyle = { glow: 'rgba(34,197,94,0.25)', text: 'text-green-400', border: 'border-green-700/40', bg: 'bg-green-950/20' };
                  } else if (titleLower.includes('noite') || titleLower.includes('abismo') || titleLower.includes('escuro')) {
                    lineageStyle = { glow: 'rgba(161,161,170,0.25)', text: 'text-zinc-400', border: 'border-zinc-700/40', bg: 'bg-zinc-950/40' };
                  } else if (titleLower.includes('sombra') || titleLower.includes('noturno') || titleLower.includes('drow') || titleLower.includes('lua')) {
                    lineageStyle = { glow: 'rgba(168,85,247,0.25)', text: 'text-purple-400', border: 'border-purple-700/40', bg: 'bg-purple-950/20' };
                  } else if (titleLower.includes('alto') || titleLower.includes('sol') || titleLower.includes('celeste') || titleLower.includes('ouro') || titleLower.includes('luz')) {
                    lineageStyle = { glow: 'rgba(234,179,8,0.25)', text: 'text-yellow-400', border: 'border-yellow-700/40', bg: 'bg-yellow-950/20' };
                  } else if (titleLower.includes('mar') || titleLower.includes('oceano') || titleLower.includes('água') || titleLower.includes('agua')) {
                    lineageStyle = { glow: 'rgba(56,189,248,0.25)', text: 'text-sky-400', border: 'border-sky-700/40', bg: 'bg-sky-950/20' };
                  } else if (titleLower.includes('neve') || titleLower.includes('gelo') || titleLower.includes('inverno') || titleLower.includes('prata')) {
                    lineageStyle = { glow: 'rgba(147,197,253,0.25)', text: 'text-blue-300', border: 'border-blue-700/40', bg: 'bg-blue-950/20' };
                  } else if (titleLower.includes('fogo') || titleLower.includes('chama') || titleLower.includes('cinza') || titleLower.includes('sangue')) {
                    lineageStyle = { glow: 'rgba(239,68,68,0.25)', text: 'text-red-400', border: 'border-red-700/40', bg: 'bg-red-950/20' };
                  } else if (titleLower.includes('tempestade') || titleLower.includes('trovão') || titleLower.includes('raio') || titleLower.includes('vento')) {
                    lineageStyle = { glow: 'rgba(129,140,248,0.25)', text: 'text-indigo-400', border: 'border-indigo-700/40', bg: 'bg-indigo-950/20' };
                  }

                  return (
                    <PremiumCard
                      key={opcao.id}
                      glowColor={lineageStyle.glow}
                      initial={{ opacity: 0, y: 20 }}
                      whileInView={{ opacity: 1, y: 0 }}
                      viewport={{ once: true }}
                      transition={{ delay: 0.1 * opcaoIdx }}
                      className={`flex flex-col p-8 rounded-none ${lineageStyle.bg} border-l-2 ${lineageStyle.border} backdrop-blur-md transition-colors`}
                    >
                      <h3 className={`text-2xl font-serif font-medium mb-4 ${lineageStyle.text}`} style={{ fontFamily: 'Cinzel, serif' }}>
                        {opcao.titulo}
                      </h3>
                      {grupo.campo !== 'linhagemId' && (
                        <p className="text-emerald-100/60 leading-relaxed font-serif text-sm mb-4">
                          {descreverOpcaoRacial(opcao)}
                        </p>
                      )}
                      {tracos.length > 0 && (
                        <div className="space-y-6 flex-1 mt-2">
                          {tracos.map(traco => (
                            <div key={traco.id}>
                              <h4 className="text-sm font-bold text-emerald-50 mb-1 font-serif tracking-wide">{traco.titulo}</h4>
                              {traco.descricao && <p className="text-sm text-emerald-200/50 leading-relaxed font-serif">{traco.descricao}</p>}
                            </div>
                          ))}
                        </div>
                      )}
                    </PremiumCard>
                  );
                })}
              </div>
            </section>
          ));
        })()}
      </div>
    </div>
  );
};

export default Elfo;
