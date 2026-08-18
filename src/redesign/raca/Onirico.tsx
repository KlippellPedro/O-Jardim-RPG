import { motion } from 'framer-motion';
import { Moon, Sparkles, Footprints, CloudMoon } from 'lucide-react';
import type { IRaca } from '../../types/catalogo';

import { PremiumCard } from '../components/premium/PremiumCard';
import { obterGruposEscolhaRacial, obterTracosOpcaoRacial, descreverOpcaoRacial } from '../../services/racaService';
import { obterTemaPorId } from '../themeMap';

interface OniricoProps {
  raca: IRaca;
}

export const Onirico = ({ raca }: OniricoProps) => {
  const tema = obterTemaPorId(raca.id);
  return (
    <div className="min-h-screen text-indigo-50 p-8 selection:bg-indigo-500/30 overflow-hidden relative">
      {/* Dream Veil Background */}
      <div className="fixed inset-0 z-0 bg-black">
        <div
          className="absolute inset-0"
          style={{
            background: 'radial-gradient(circle at 20% 30%, rgba(129,140,248,0.20), transparent 55%), radial-gradient(circle at 80% 70%, rgba(49,46,129,0.30), transparent 55%), #05040d',
          }}
        />
        <div className="absolute inset-0 bg-gradient-to-b from-[#05040d]/40 via-transparent to-[#05040d]/90" />
      </div>

      {/* Floating Dream Motes */}
      <div className="fixed inset-0 pointer-events-none z-0">
        <div className="absolute top-[25%] left-[20%] w-[45%] h-[45%] bg-indigo-800/20 blur-[150px] rounded-full mix-blend-screen" />
        <div className="absolute bottom-[15%] right-[15%] w-[35%] h-[35%] bg-violet-900/15 blur-[130px] rounded-full mix-blend-screen" />

        {[...Array(30)].map((_, i) => (
          <motion.div
            key={i}
            className="absolute rounded-full"
            style={{
              width: Math.random() * 3 + 1,
              height: Math.random() * 3 + 1,
              backgroundColor: 'rgba(199,210,254,0.7)',
              boxShadow: '0 0 8px rgba(165,180,252,0.6)',
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
            }}
            animate={{ opacity: [0, 1, 0], y: `+=${Math.random() * 60 - 30}` }}
            transition={{
              duration: Math.random() * 6 + 4,
              repeat: Infinity,
              ease: 'easeInOut',
              delay: Math.random() * 4,
            }}
          />
        ))}
      </div>

      <div className="max-w-5xl mx-auto relative z-10 pt-16">
        {/* Header */}
        <motion.header
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: 'easeOut' }}
          className="text-center mb-24"
        >
          <motion.div
            className={`w-28 h-28 mx-auto ${tema.bg} border-2 ${tema.border} rounded-full flex items-center justify-center mb-8 backdrop-blur-md relative`}
          >
            <Moon size={48} className={`${tema.icon} z-10`} strokeWidth={1.5} />
          </motion.div>

          <motion.div className="overflow-hidden">
             <motion.h1
                initial={{ y: '100%' }}
                animate={{ y: 0 }}
                transition={{ duration: 0.8, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
                className={`text-7xl font-bold tracking-tight ${tema.text} mb-6 uppercase`}
                style={{ fontFamily: 'Cinzel, serif' }}
             >
               Onírico
             </motion.h1>
          </motion.div>
          <motion.p
             initial={{ opacity: 0 }}
             animate={{ opacity: 1 }}
             transition={{ duration: 1, delay: 0.6 }}
             className="text-lg text-indigo-200/60 max-w-2xl mx-auto font-medium leading-relaxed"
          >
            Não veio de nenhum ventre: veio de um sonho que se recusou a terminar quando o sonhador acordou. Anda entre o mundo real e a lógica solta de um pesadelo, e as duas coisas parecem sempre um pouco mais verdadeiras perto dele.
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
            <Footprints size={40} className={`${tema.icon} shrink-0`} strokeWidth={1.5} />
            <div>
              <h3 className={`text-2xl font-bold ${tema.text} mb-3`} style={{ fontFamily: 'Cinzel, serif' }}>Passo Entre-Sonhos</h3>
              <p className="text-indigo-200/60 leading-relaxed text-sm">
                Uma vez por cena, gaste uma ação e 3 Mana para se teleportar até 6 m para um espaço desocupado que consiga ver, escorregando por um instante para dentro da própria lógica dos sonhos.
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
            <CloudMoon size={40} className={`${tema.icon} shrink-0`} strokeWidth={1.5} />
            <div>
              <h3 className={`text-2xl font-bold ${tema.text} mb-3`} style={{ fontFamily: 'Cinzel, serif' }}>Véu do Sonhador</h3>
              <p className="text-indigo-200/60 leading-relaxed text-sm">
                Vantagem para resistir a Medo, perda de Sanidade e ilusões. Você também não pode ser localizado ou rastreado através dos sonhos de outra criatura.
              </p>
            </div>
          </PremiumCard>

          <PremiumCard
            glowColor={tema.glow}
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.3 }}
            className={`flex gap-6 p-8 rounded-xl ${tema.bg} ${tema.border} backdrop-blur-md`}
          >
            <Sparkles size={40} className={`${tema.icon} shrink-0`} strokeWidth={1.5} />
            <div>
              <h3 className={`text-2xl font-bold ${tema.text} mb-3`} style={{ fontFamily: 'Cinzel, serif' }}>Leitura de Sonhos</h3>
              <p className="text-indigo-200/60 leading-relaxed text-sm">
                Uma vez por descanso, enquanto uma criatura dorme e permite, você pode tocá-la e vislumbrar fragmentos soltos do sonho atual dela: uma imagem, uma emoção ou um medo recorrente.
              </p>
            </div>
          </PremiumCard>

          <PremiumCard
            glowColor={tema.glow}
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.4 }}
            className={`flex gap-6 p-8 rounded-xl ${tema.bg} ${tema.border} backdrop-blur-md`}
          >
            <Moon size={40} className={`${tema.icon} shrink-0`} strokeWidth={1.5} />
            <div>
              <h3 className={`text-2xl font-bold ${tema.text} mb-3`} style={{ fontFamily: 'Cinzel, serif' }}>Pesadelo Manifesto</h3>
              <p className="text-indigo-200/60 leading-relaxed text-sm">
                Uma vez por cena, gaste uma ação e 5 Mana para fazer uma criatura a até 15 m enxergar o pior pesadelo que carrega. Misticismo contra a Vontade dela; em falha, ela sofre desvantagem no próximo teste e perde reações até seu próximo turno.
              </p>
            </div>
          </PremiumCard>
        </div>

        {/* Custom Choices */}
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
                <p className="text-indigo-200/60 text-lg">{grupo.descricao}</p>
              </motion.div>

              <div className="overflow-x-auto rounded-xl border border-indigo-800/40 bg-indigo-950/20 backdrop-blur-md shadow-lg shadow-indigo-900/10">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-indigo-800/40 bg-indigo-950/60">
                      <th className="p-6 font-bold text-indigo-100 uppercase tracking-widest text-sm" style={{ fontFamily: 'Cinzel, serif' }}>Opção</th>
                      {grupo.campo !== 'linhagemId' && <th className="p-6 font-bold text-indigo-100 uppercase tracking-widest text-sm" style={{ fontFamily: 'Cinzel, serif' }}>Descrição</th>}
                      <th className="p-6 font-bold text-indigo-100 uppercase tracking-widest text-sm" style={{ fontFamily: 'Cinzel, serif' }}>Traços</th>
                    </tr>
                  </thead>
                  <tbody>
                    {grupo.opcoes.map((opcao) => {
                      const tracos = obterTracosOpcaoRacial(opcao);
                      return (
                        <tr key={opcao.id} className="border-b border-indigo-800/20 transition-colors hover:bg-indigo-900/20">
                          <td className="p-6 align-top border-l-2 border-indigo-400/50 text-indigo-300 w-1/4">
                            <span className="font-bold text-lg block" style={{ fontFamily: 'Cinzel, serif' }}>{opcao.titulo}</span>
                          </td>
                          {grupo.campo !== 'linhagemId' && (
                            <td className="p-6 align-top text-indigo-100/70 text-sm leading-relaxed w-1/3">
                              {descreverOpcaoRacial(opcao)}
                            </td>
                          )}
                          <td className="p-6 align-top">
                            {tracos.length > 0 ? (
                              <div className="space-y-4">
                                {tracos.map(traco => (
                                  <div key={traco.id} className="bg-black/20 p-3 rounded-lg border border-indigo-900/30">
                                    <h4 className="text-sm font-bold text-indigo-100 mb-1">{traco.titulo}</h4>
                                    {traco.descricao && <p className="text-xs text-indigo-200/50 leading-relaxed">{traco.descricao}</p>}
                                  </div>
                                ))}
                              </div>
                            ) : (
                              <span className="text-indigo-500/30 italic text-sm">Sem traços adicionais.</span>
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

        {/* Limitation note */}
        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="rounded-xl border border-indigo-800/30 bg-black/20 p-6 mb-16"
        >
          <h4 className="text-sm font-bold text-indigo-200 uppercase tracking-widest mb-2">Ancoragem Frágil</h4>
          <p className="text-indigo-200/50 text-sm leading-relaxed">
            Se passar mais de 24 horas sem completar um descanso sonhando de verdade, seu corpo começa a perder coesão: até voltar a sonhar, sua Mana máxima fica reduzida à metade, arredondada para baixo.
          </p>
        </motion.div>
      </div>
    </div>
  );
};

export default Onirico;
