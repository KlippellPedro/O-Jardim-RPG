import { motion } from 'framer-motion';
import { Hexagon, PawPrint, Link2, Gauge, BookMarked } from 'lucide-react';
import type { IClasse } from '../../types/catalogo';
import { PremiumCard } from '../components/premium/PremiumCard';
import { DetalhesClasse } from '../../pages/Regras/components/DetalhesClasse';
import { obterTemaPorId } from '../themeMap';

const agruparCatalogoPorLinha = (itens: { tarefa: string; dt: string; nota?: string }[]) => {
  const grupos = new Map<string, { tarefa: string; dt: string; nota?: string }[]>();
  for (const item of itens) {
    const linha = item.tarefa.replace(/ (I|II|III|IV|V)$/, '');
    if (!grupos.has(linha)) grupos.set(linha, []);
    grupos.get(linha)!.push(item);
  }
  return [...grupos.entries()];
};

export const Invocador = ({ classe }: { classe: IClasse }) => {
  const tema = obterTemaPorId(classe.id);
  const linhasDoCatalogo = agruparCatalogoPorLinha(classe.tarefas_bancada?.itens || []);

  return (
    <div className="min-h-screen text-indigo-50 p-8 selection:bg-indigo-500/30 overflow-hidden relative">
      {/* 3D WebGL Background */}
      <div className="fixed inset-0 z-0 bg-cover bg-center bg-no-repeat opacity-20 pointer-events-none" style={{ backgroundImage: "url('/assets/img/invocador_bg.webp')" }} />

      {/* Summoning Circles Background Effects */}
      <div className="fixed inset-0 pointer-events-none z-0">
        <div className="absolute top-[30%] left-[30%] w-[40%] h-[40%] bg-indigo-900/20 blur-[150px] mix-blend-screen" />
        
        {/* Giant rotating summoning circle */}
        <motion.div 
          className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAwIiBoZWlnaHQ9IjYwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48Y2lyY2xlIGN4PSIzMDAiIGN5PSIzMDAiIHI9IjI1MCIgZmlsbD0ibm9uZSIgc3Ryb2tlPSJyZ2JhKDk5LCAxMDIsIDI0MSwgMC4xKSIgc3Ryb2tlLXdpZHRoPSIyIi8+PHBvbHlnb24gcG9pbnRzPSIzMDAsNTAgNTUwLDQ1MCA1MCw0NTAiIGZpbGw9Im5vbmUiIHN0cm9rZT0icmdiYSg5OSwgMTAyLCAyNDEsIDAuMSkiIHN0cm9rZS13aWR0aD0iMSIvPjwvc3ZnPg==')] bg-center bg-no-repeat opacity-30"
          animate={{ rotate: 360 }}
          transition={{ duration: 60, repeat: Infinity, ease: "linear" }}
        />
      </div>

      <div className="max-w-5xl mx-auto relative z-10 pt-16">
        {/* Header */}
        <motion.header 
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.6 }}
          className="text-center mb-24"
        >
          <motion.div 
            className={`w-28 h-28 mx-auto ${tema.bg} ${tema.border} rounded-full flex items-center justify-center mb-8 shadow-2xl relative backdrop-blur-md`}
          >
            <Hexagon size={48} className={`${tema.icon} z-10`} strokeWidth={1.5} />
            <motion.div 
              className="absolute inset-0 border border-indigo-400/50 rounded-full"
              animate={{ scale: [1, 1.2, 1], opacity: [1, 0, 1] }}
              transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
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
               Invocador
             </motion.h1>
          </motion.div>
          <motion.p 
             initial={{ opacity: 0 }}
             animate={{ opacity: 1 }}
             transition={{ duration: 1, delay: 0.6 }}
             className="text-lg text-indigo-200/60 max-w-2xl mx-auto font-medium leading-relaxed"
          >
            A força não está no que eles podem fazer, mas no que eles trazem. Ligados por pactos absolutos de mana, os Invocadores chamam feras, guardiões e espíritos reais do mundo para lutar ao seu lado, um pacto de cada vez.
          </motion.p>
        </motion.header>

        {/* Traits Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 mb-24">
          <PremiumCard
            glowColor={tema.glow}
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className={`flex flex-col p-8 rounded-lg ${tema.bg} ${tema.border} backdrop-blur-md`}
          >
            <Link2 size={36} className={`${tema.icon} mb-4`} strokeWidth={1.5} />
            <h3 className={`text-2xl font-bold ${tema.text} mb-2 uppercase tracking-wide`} style={{ fontFamily: 'Cinzel, serif' }}>Pacto de Fluxo Nativo</h3>
            <p className="text-indigo-200/60 leading-relaxed text-sm">
              O conceito central da classe: invoque suas duas primeiras criaturas direto do Catálogo de Invocações, com ficha pronta, exclusiva da classe. A cada estágio seguinte, você escolhe: invocar mais duas criaturas ao seu lado, ou levar duas que já tem pro próximo nível do Catálogo. É a decisão que define seu Invocador, um exército pequeno ou poucos aliados imbatíveis.
            </p>
          </PremiumCard>

          <PremiumCard
            glowColor={tema.glow}
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className={`flex flex-col p-8 rounded-lg ${tema.bg} ${tema.border} backdrop-blur-md`}
          >
            <PawPrint size={36} className={`${tema.icon} mb-4`} strokeWidth={1.5} />
            <h3 className={`text-2xl font-bold ${tema.text} mb-2 uppercase tracking-wide`} style={{ fontFamily: 'Cinzel, serif' }}>Formas Vinculadas</h3>
            <p className="text-indigo-200/60 leading-relaxed text-sm">
              Aprenda um treinamento por estágio, que vira buff permanente pra todas as suas invocações, presentes e futuras: são seis possíveis (Fera, Guardião, Espírito, Broto Curador, Sombra, Núcleo Firme) e você aprende quatro. Cada treinamento continua crescendo nos estágios seguintes.
            </p>
          </PremiumCard>

          <PremiumCard
            glowColor={tema.glow}
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.4 }}
            className={`flex flex-col p-8 rounded-lg ${tema.bg} ${tema.border} backdrop-blur-md`}
          >
            <Hexagon size={36} className={`${tema.icon} mb-4`} strokeWidth={1.5} />
            <h3 className={`text-2xl font-bold ${tema.text} mb-2 uppercase tracking-wide`} style={{ fontFamily: 'Cinzel, serif' }}>Círculo de Convocação</h3>
            <p className="text-indigo-200/60 leading-relaxed text-sm">
              Uma vez por cena, crie uma área de 9 m por três rodadas: você e todas as suas invocações dentro dela recebem +2 em testes e ataques, e 15 de Vida temporária ao entrar.
            </p>
          </PremiumCard>

          <PremiumCard
            glowColor={tema.glow}
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.6 }}
            className={`flex flex-col p-8 rounded-lg ${tema.bg} ${tema.border} backdrop-blur-md`}
          >
            <Gauge size={36} className={`${tema.icon} mb-4`} strokeWidth={1.5} />
            <h3 className={`text-2xl font-bold ${tema.text} mb-2 uppercase tracking-wide`} style={{ fontFamily: 'Cinzel, serif' }}>Sobre a DT</h3>
            <p className="text-indigo-200/60 leading-relaxed text-sm">
              Todo efeito seu que obriga um alvo a resistir rola Misticismo no momento em que aciona: o resultado vira a DT que ele precisa alcançar.
            </p>
          </PremiumCard>
        </div>

        <DetalhesClasse classe={classe} />

        {/* Catálogo de Invocações */}
        {linhasDoCatalogo.length > 0 && (
          <section className="mt-24">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5 }}
              className="text-center mb-10"
            >
              <BookMarked size={32} className={`${tema.icon} mx-auto mb-3`} strokeWidth={1.5} />
              <h2 className={`text-3xl font-bold ${tema.text} uppercase tracking-wide mb-3`} style={{ fontFamily: 'Cinzel, serif' }}>
                {classe.tarefas_bancada?.rotulo || 'Catálogo de Invocações'}
              </h2>
              <p className="text-indigo-200/60 max-w-2xl mx-auto text-sm leading-relaxed">
                {classe.tarefas_bancada?.descricao}
              </p>
            </motion.div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {linhasDoCatalogo.map(([linha, tiers], indice) => (
                <PremiumCard
                  key={linha}
                  glowColor={tema.glow}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.5, delay: indice * 0.1 }}
                  className={`flex flex-col p-6 rounded-lg ${tema.bg} ${tema.border} backdrop-blur-md`}
                >
                  <h3 className={`text-lg font-bold ${tema.text} mb-4 uppercase tracking-wide`} style={{ fontFamily: 'Cinzel, serif' }}>
                    {linha}
                  </h3>
                  <ul className="space-y-3 text-sm text-indigo-200/70">
                    {tiers.map(tier => (
                      <li key={tier.tarefa} className="border-b border-white/5 pb-3 last:border-0 last:pb-0">
                        <div className="flex items-baseline justify-between gap-2 mb-1">
                          <span className="font-bold text-indigo-100">{tier.tarefa}</span>
                          <span className="text-xs text-indigo-300/50 whitespace-nowrap">{tier.dt}</span>
                        </div>
                        <p className="text-xs text-indigo-300/60 leading-relaxed">{tier.nota}</p>
                      </li>
                    ))}
                  </ul>
                </PremiumCard>
              ))}
            </div>
          </section>
        )}
      </div>
    </div>
  );
};

export default Invocador;

