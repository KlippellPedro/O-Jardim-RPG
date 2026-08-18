import { motion } from 'framer-motion';
import { Skull, ShieldX, Gem, Activity } from 'lucide-react';
import type { IRaca } from '../../types/catalogo';
import { PremiumCard } from '../components/premium/PremiumCard';
import { obterGruposEscolhaRacial, obterTracosOpcaoRacial, descreverOpcaoRacial } from '../../services/racaService';
import { obterTemaPorId } from '../themeMap';

export const Desperto = ({ raca }: { raca: IRaca }) => {
  const tema = obterTemaPorId(raca.id);
  return (
    <div className="min-h-screen text-red-50 p-8 selection:bg-red-500/30 overflow-hidden relative">
      {/* Calm Ethereal Background */}
      <div 
        className="fixed inset-0 z-0 bg-cover bg-center bg-no-repeat bg-[#060b10]"
        style={{ backgroundImage: "url('/assets/img/desperto_gate_bg.webp')" }}
      >
        <div className="absolute inset-0 bg-slate-950/60 mix-blend-multiply" />
        <div className="absolute inset-0 bg-gradient-to-b from-[#060b10]/40 via-transparent to-[#060b10]/90" />
      </div>

      {/* Soul Stream / Arkarin Fragment Background Effects */}
      <div className="fixed inset-0 pointer-events-none z-0">
        <div className="absolute top-[20%] right-[20%] w-[50%] h-[50%] bg-red-900/20 blur-[150px] rounded-full mix-blend-screen" />
        <div className="absolute bottom-[10%] left-[20%] w-[40%] h-[40%] bg-rose-900/10 blur-[120px] rounded-full mix-blend-screen" />
        
        {/* Flow of souls / energy */}
        {[...Array(15)].map((_, i) => (
          <motion.div
            key={i}
            className="absolute w-2 h-[100px] rounded-full bg-gradient-to-t from-transparent via-red-500/20 to-transparent"
            style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
              rotate: 15,
            }}
            animate={{
              y: - (typeof window !== 'undefined' ? window.innerHeight + 200 : 1000),
              opacity: [0, 1, 0],
            }}
            transition={{
              duration: Math.random() * 4 + 3,
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
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          className="text-center mb-24"
        >
          <motion.div 
            className={`w-28 h-28 mx-auto ${tema.bg} border-2 ${tema.border} rounded-lg flex items-center justify-center mb-8 backdrop-blur-md relative overflow-hidden`}
          >
            <motion.div 
              className="absolute inset-0 bg-red-500/10"
              animate={{ opacity: [0.2, 0.5, 0.2] }}
              transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
            />
            <Skull size={48} className={`${tema.icon} z-10`} strokeWidth={1.5} />
          </motion.div>

          <motion.div className="overflow-hidden">
             <motion.h1 
                initial={{ y: "100%" }}
                animate={{ y: 0 }}
                transition={{ duration: 0.8, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
                className={`text-7xl font-bold tracking-tight ${tema.text} mb-6 uppercase`}
                style={{ fontFamily: 'Cinzel, serif' }}
             >
               Desperto
             </motion.h1>
          </motion.div>
          <motion.p 
             initial={{ opacity: 0 }}
             animate={{ opacity: 1 }}
             transition={{ duration: 1, delay: 0.6 }}
             className="text-lg text-red-200/60 max-w-3xl mx-auto font-medium leading-relaxed"
          >
            Morreu, foi parar em Arkarin e voltou. Carrega um Fragmento de Arkarin preso à alma, que vibra perto de espírito preso e de qualquer coisa mexida pela morte. Quanto mais tempo passou do outro lado, mais ele trouxe de volta, e a Condição Ancestral escolhida explica por que a Mulher Carmesim deixou ele sair.
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
            className={`flex gap-6 p-6 rounded-xl ${tema.bg} border-l-4 ${tema.border} backdrop-blur-md`}
          >
            <Gem size={32} className={`${tema.icon} shrink-0`} strokeWidth={1.5} />
            <div>
              <h3 className={`text-xl font-bold ${tema.text} mb-2`} style={{ fontFamily: 'Cinzel, serif' }}>Fragmento de Arkarin</h3>
              <p className="text-red-200/60 leading-relaxed text-sm">
                O fragmento em sua alma vibra ao detectar espíritos, efeitos de morte ou almas aprisionadas a até 15m. Revela presença e direção, mas não quantidade ou identidade exata.
              </p>
            </div>
          </PremiumCard>

          <PremiumCard
            glowColor={tema.glow}
            initial={{ opacity: 0, x: 20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className={`flex gap-6 p-6 rounded-xl ${tema.bg} border-l-4 ${tema.border} backdrop-blur-md`}
          >
            <ShieldX size={32} className={`${tema.icon} shrink-0`} strokeWidth={1.5} />
            <div>
              <h3 className={`text-xl font-bold ${tema.text} mb-2`} style={{ fontFamily: 'Cinzel, serif' }}>Renegado da Morte</h3>
              <p className="text-rose-200/60 leading-relaxed text-sm">
                Receba +4 em Vontade e vantagem contra morte instantânea, drenagem de Vida/Mana ou captura de alma. Você tem direito a um teste contra efeitos absolutos que tentem lhe roubar a alma.
              </p>
            </div>
          </PremiumCard>

          <PremiumCard
             glowColor={tema.glow}
            initial={{ opacity: 0, x: -20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className={`flex gap-6 p-6 rounded-xl ${tema.bg} border-l-4 ${tema.border} backdrop-blur-md`}
          >
            <Activity size={32} className={`${tema.icon} shrink-0`} strokeWidth={1.5} />
            <div>
              <h3 className={`text-xl font-bold ${tema.text} mb-2`} style={{ fontFamily: 'Cinzel, serif' }}>Recusar o Fim</h3>
              <p className="text-red-200/60 leading-relaxed text-sm">
                Uma vez por cena, ao morrer, gaste uma reação e 6 Mana: sua Vida torna-se 1, a morte imediata é cancelada e 'Morrendo' é removido. Seu nível de 'Ferido' aumenta em 1.
              </p>
            </div>
          </PremiumCard>

          <PremiumCard
             glowColor={tema.glow}
            initial={{ opacity: 0, x: 20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.3 }}
            className={`flex gap-6 p-6 rounded-xl ${tema.bg} border-l-4 ${tema.border} backdrop-blur-md`}
          >
            <Skull size={32} className={`${tema.icon} shrink-0`} strokeWidth={1.5} />
            <div>
              <h3 className={`text-xl font-bold ${tema.text} mb-2`} style={{ fontFamily: 'Cinzel, serif' }}>Ecos de Séculos</h3>
              <p className="text-rose-200/60 leading-relaxed text-sm">
                Para cada século que permaneceu morto, receba uma rerrolagem por sessão (máximo 5) aplicável a qualquer teste, devendo aceitar o novo resultado.
              </p>
            </div>
          </PremiumCard>
        </div>

        {/* Custom Lineages for Desperto */}
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
                <p className="text-red-200/60 font-serif text-lg">{grupo.descricao}</p>
              </motion.div>
              
              <div className="grid grid-cols-1 gap-6">
                {grupo.opcoes.map((opcao, opcaoIdx) => {
                  const tracos = obterTracosOpcaoRacial(opcao);
                  const titleLower = opcao.titulo.toLowerCase();
                  
                  // Custom colors for different desperto lineages
                  let lineageStyle = { glow: tema.glow, text: tema.text, border: tema.border, bg: tema.bg };
                  if (titleLower.includes('julgado') || titleLower.includes('rejeitado') || titleLower.includes('tribunal')) {
                    lineageStyle = { glow: 'rgba(129,140,248,0.25)', text: 'text-indigo-400', border: 'border-indigo-700/40', bg: 'bg-indigo-950/20' };
                  } else if (titleLower.includes('chamado') || titleLower.includes('vivos') || titleLower.includes('âncora')) {
                    lineageStyle = { glow: 'rgba(45,212,191,0.25)', text: 'text-teal-400', border: 'border-teal-700/40', bg: 'bg-teal-950/20' };
                  } else if (titleLower.includes('corpo') || titleLower.includes('reconstruído') || titleLower.includes('carne')) {
                    lineageStyle = { glow: 'rgba(161,161,170,0.25)', text: 'text-zinc-400', border: 'border-zinc-700/40', bg: 'bg-zinc-950/30' };
                  } else if (titleLower.includes('pacto') || titleLower.includes('sacrifício') || titleLower.includes('sangue') || titleLower.includes('profano')) {
                    // Retorno Profano -> Rose/Red
                    lineageStyle = { glow: 'rgba(244,63,94,0.25)', text: 'text-rose-400', border: 'border-rose-700/40', bg: 'bg-rose-950/20' };
                  } else if (titleLower.includes('fuga') || titleLower.includes('escondido') || titleLower.includes('sombra') || titleLower.includes('alma') || titleLower.includes('fragmentada')) {
                    // Alma Fragmentada -> Purple
                    lineageStyle = { glow: 'rgba(168,85,247,0.25)', text: 'text-purple-400', border: 'border-purple-700/40', bg: 'bg-purple-950/20' };
                  } else if (titleLower.includes('vingança') || titleLower.includes('ódio') || titleLower.includes('chama')) {
                    lineageStyle = { glow: 'rgba(239,68,68,0.25)', text: 'text-red-400', border: 'border-red-700/40', bg: 'bg-red-950/20' };
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
                        <p className="text-red-100/60 leading-relaxed font-serif text-sm mb-4">
                          {descreverOpcaoRacial(opcao)}
                        </p>
                      )}
                      {tracos.length > 0 && (
                        <div className="space-y-6 flex-1 mt-2">
                          {tracos.map(traco => (
                            <div key={traco.id}>
                              <h4 className="text-sm font-bold text-red-50 mb-1 font-serif tracking-wide">{traco.titulo}</h4>
                              {traco.descricao && <p className="text-sm text-red-200/50 leading-relaxed font-serif">{traco.descricao}</p>}
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

export default Desperto;
