import { motion } from 'framer-motion';
import { Cpu, Zap, Settings, ShieldAlert, Layers } from 'lucide-react';
import type { IRaca } from '../../types/catalogo';
import { PremiumCard } from '../components/premium/PremiumCard';
import { obterGruposEscolhaRacial, obterTracosOpcaoRacial, descreverOpcaoRacial } from '../../services/racaService';
import { obterTemaPorId } from '../themeMap';

export const Automato = ({ raca }: { raca: IRaca }) => {
  const tema = obterTemaPorId(raca.id);
  return (
    <div className="min-h-screen text-cyan-50 p-8 selection:bg-cyan-500/30 overflow-hidden relative font-mono">
      {/* Cybernetic Tech Background */}
      <div 
        className="fixed inset-0 z-0 bg-cover bg-center bg-no-repeat bg-black"
        style={{ backgroundImage: "url('/assets/img/automato_tech_bg.webp')" }}
      >
        <div className="absolute inset-0 bg-slate-950/80 mix-blend-multiply" />
        <div className="absolute inset-0 bg-gradient-to-b from-[#000508]/40 via-transparent to-[#000508]/90" />
      </div>

      {/* Sci-Fi/Tech Foreground Overlays */}
      <div className="fixed inset-0 pointer-events-none z-0">
        {/* Hexagonal Tech Grid */}
        <div className="absolute inset-0 opacity-[0.03] bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iMTAzLjkyIiB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciPjxwYXRoIGQ9Ik0zMCAwTDIwIDE3LjMyTDAgMTcuMzJMMTAgMzQuNjRMMCA1MS45NkwyMCA1MS45NkwzMCA2OS4yOEw0MCA1MS45Nkw2MCA1MS45Nkw1MCAzNC42NEw2MCAxNy4zMkw0MCAxNy4zMkwzMCAweiIgZmlsbD0ibm9uZSIgc3Ryb2tlPSIjMjJkM2VlIiBzdHJva2Utd2lkdGg9IjIiLz48L3N2Zz4=')] bg-[length:60px_103px]" />

        {/* Scanning lines */}
        <motion.div 
          className="absolute inset-x-0 h-[2px] bg-cyan-500/20 shadow-[0_0_10px_rgba(6,182,212,0.8)]"
          animate={{ top: ["0%", "100%", "0%"] }}
          transition={{ duration: 10, repeat: Infinity, ease: "linear" }}
        />
      </div>

      <div className="max-w-5xl mx-auto relative z-10 pt-16">
        {/* Header */}
        <motion.header 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          className="text-center mb-24"
        >
          <motion.div 
            className={`w-32 h-32 mx-auto ${tema.bg} border-2 ${tema.border} rounded-none flex items-center justify-center mb-8 backdrop-blur-md relative overflow-hidden`}
          >
            {/* Tech scanner effect inside the square */}
            <motion.div 
              className="absolute inset-0 bg-gradient-to-b from-transparent via-cyan-400/20 to-transparent"
              animate={{ y: ["-100%", "100%"] }}
              transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
            />
            <Cpu size={56} className={`${tema.icon} z-10`} strokeWidth={1} />
          </motion.div>

          {/* Masked Animated Text */}
          <motion.div className="overflow-hidden">
            <motion.h1 
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              transition={{ duration: 0.8, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
              className={`text-7xl font-mono font-bold tracking-tight ${tema.text} mb-6 uppercase`}
              style={{ fontFamily: 'Cinzel, serif' }}
            >
              Autômato
            </motion.h1>
          </motion.div>

          <motion.p 
             initial={{ opacity: 0 }}
             animate={{ opacity: 1 }}
             transition={{ duration: 1, delay: 0.6 }}
             className="text-lg text-cyan-200/60 max-w-2xl mx-auto font-mono leading-relaxed"
          >
            Construtos conscientes da A.X.I.S. Máquinas modulares alimentadas por núcleos autônomos de energia, substituindo ossos e carne por engrenagens e protocolos lógicos absolutos.
          </motion.p>
        </motion.header>

        {/* Traits Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-24 font-mono">
          <PremiumCard
            glowColor={tema.glow}
            initial={{ opacity: 0, x: -20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className={`flex flex-col p-6 rounded-none ${tema.bg} border ${tema.border} backdrop-blur-md`}
          >
            <ShieldAlert size={32} className={`${tema.icon} mb-4`} strokeWidth={1.5} />
            <h3 className={`text-xl font-bold ${tema.text} mb-3`} style={{ fontFamily: 'Cinzel, serif' }}>Corpo Artificial</h3>
            <p className="text-cyan-200/60 leading-relaxed text-sm">
              Imune a atordoamento, doenças, encantamentos, enjoo, fadiga, sono e venenos (salvo modificação Máquina Viva). Não respira, não come e não dorme.
            </p>
          </PremiumCard>

          <PremiumCard
            glowColor={tema.glow}
            initial={{ opacity: 0, x: 20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className={`flex flex-col p-6 rounded-none ${tema.bg} border ${tema.border} backdrop-blur-md`}
          >
            <Zap size={32} className={`${tema.icon} mb-4`} strokeWidth={1.5} />
            <h3 className={`text-xl font-bold ${tema.text} mb-3`} style={{ fontFamily: 'Cinzel, serif' }}>Núcleo Autônomo</h3>
            <p className="text-cyan-200/60 leading-relaxed text-sm">
              Você possui vontade própria independente de criador. Sua Mana é na verdade a Energia do Núcleo. Seu Nível Total é o nível do núcleo. Se a Vida zerar, você só morre de vez se a morte for concluída e o núcleo, destruído.
            </p>
          </PremiumCard>

          <PremiumCard
            glowColor={tema.glow}
            initial={{ opacity: 0, x: -20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className={`flex flex-col p-6 rounded-none ${tema.bg} border ${tema.border} backdrop-blur-md`}
          >
            <Settings size={32} className={`${tema.icon} mb-4`} strokeWidth={1.5} />
            <h3 className={`text-xl font-bold ${tema.text} mb-3`} style={{ fontFamily: 'Cinzel, serif' }}>Reparo Mecânico</h3>
            <p className="text-cyan-200/60 leading-relaxed text-sm">
              Descansos e curas biológicas/mágicas não recuperam Vida. Requer 1 hora e um teste de Ofício(Engenharia) (DT 15 + metade do Nível Total) para curar meros 5 de Vida. 
            </p>
          </PremiumCard>

          <PremiumCard
            glowColor={tema.glow}
            initial={{ opacity: 0, x: 20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.3 }}
            className={`flex flex-col p-6 rounded-none ${tema.bg} border ${tema.border} backdrop-blur-md`}
          >
            <Layers size={32} className={`${tema.icon} mb-4`} strokeWidth={1.5} />
            <h3 className={`text-xl font-bold ${tema.text} mb-3`} style={{ fontFamily: 'Cinzel, serif' }}>Arquitetura Modular</h3>
            <p className="text-cyan-200/60 leading-relaxed text-sm">
              Limite de modificações é 1 + (Nível/2). Modificações ativas exigem passivas. Instalar exige um dia de trabalho e teste de Engenharia. Seu corpo é customizável como uma máquina.
            </p>
          </PremiumCard>
        </div>

        {/* Custom Lineages for Automato */}
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
                <p className="text-cyan-200/60 text-lg">{grupo.descricao}</p>
              </motion.div>
              
              <div className="overflow-x-auto rounded-none border border-cyan-800/40 bg-cyan-950/20 backdrop-blur-md shadow-lg shadow-cyan-900/10">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-cyan-800/40 bg-cyan-950/60">
                      <th className="p-6 font-bold text-cyan-100 uppercase tracking-widest text-sm" style={{ fontFamily: 'Cinzel, serif' }}>Modelo</th>
                      {grupo.campo !== 'linhagemId' && <th className="p-6 font-bold text-cyan-100 uppercase tracking-widest text-sm" style={{ fontFamily: 'Cinzel, serif' }}>Função Primária</th>}
                      <th className="p-6 font-bold text-cyan-100 uppercase tracking-widest text-sm" style={{ fontFamily: 'Cinzel, serif' }}>Módulos de Fábrica (Traços)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {grupo.opcoes.map((opcao) => {
                      const tracos = obterTracosOpcaoRacial(opcao);
                      const titleLower = opcao.titulo.toLowerCase();
                      
                      // Custom colors for different automato lineages
                      let lineageStyle = { glow: tema.glow, text: tema.text, border: tema.border, bg: 'hover:bg-cyan-900/20' };
                      if (titleLower.includes('combate') || titleLower.includes('guerra') || titleLower.includes('artilharia') || titleLower.includes('assalto') || titleLower.includes('destruição')) {
                        lineageStyle = { glow: 'rgba(239,68,68,0.25)', text: 'text-red-400', border: 'border-red-500/50', bg: 'hover:bg-red-950/30' };
                      } else if (titleLower.includes('médico') || titleLower.includes('suporte') || titleLower.includes('reparo') || titleLower.includes('cura')) {
                        lineageStyle = { glow: 'rgba(16,185,129,0.25)', text: 'text-emerald-400', border: 'border-emerald-500/50', bg: 'hover:bg-emerald-950/30' };
                      } else if (titleLower.includes('infiltração') || titleLower.includes('batedor') || titleLower.includes('sombra') || titleLower.includes('reconhecimento') || titleLower.includes('furtivo')) {
                        lineageStyle = { glow: 'rgba(168,85,247,0.25)', text: 'text-purple-400', border: 'border-purple-500/50', bg: 'hover:bg-purple-950/30' };
                      } else if (titleLower.includes('lógica') || titleLower.includes('processamento') || titleLower.includes('análise') || titleLower.includes('mente') || titleLower.includes('conhecimento')) {
                        lineageStyle = { glow: 'rgba(245,158,11,0.25)', text: 'text-amber-400', border: 'border-amber-500/50', bg: 'hover:bg-amber-950/30' };
                      } else if (titleLower.includes('pesado') || titleLower.includes('forja') || titleLower.includes('titã') || titleLower.includes('blindado') || titleLower.includes('defesa')) {
                        lineageStyle = { glow: 'rgba(120,113,108,0.25)', text: 'text-stone-400', border: 'border-stone-500/50', bg: 'hover:bg-stone-950/30' };
                      }

                      return (
                        <tr 
                          key={opcao.id} 
                          className={`border-b border-cyan-800/20 transition-colors ${lineageStyle.bg}`}
                        >
                          <td className={`p-6 align-top border-l-2 ${lineageStyle.border} ${lineageStyle.text} w-1/4`}>
                            <span className="font-bold text-lg block" style={{ fontFamily: 'Cinzel, serif' }}>{opcao.titulo}</span>
                          </td>
                          {grupo.campo !== 'linhagemId' && (
                            <td className="p-6 align-top text-cyan-100/70 text-sm leading-relaxed w-1/3">
                              {descreverOpcaoRacial(opcao)}
                            </td>
                          )}
                          <td className="p-6 align-top">
                            {tracos.length > 0 ? (
                              <div className="space-y-4">
                                {tracos.map(traco => (
                                  <div key={traco.id} className="bg-black/20 p-3 rounded-none border border-cyan-900/30">
                                    <h4 className="text-sm font-bold text-cyan-100 mb-1">{traco.titulo}</h4>
                                    {traco.descricao && <p className="text-xs text-cyan-200/50 leading-relaxed">{traco.descricao}</p>}
                                  </div>
                                ))}
                              </div>
                            ) : (
                              <span className="text-cyan-500/30 italic text-sm">Sem módulos adicionais.</span>
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

export default Automato;
