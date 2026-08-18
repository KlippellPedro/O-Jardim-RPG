import { motion } from 'framer-motion';
import { Eye, Flame, TriangleAlert } from 'lucide-react';
import type { IRaca } from '../../types/catalogo';
import { PremiumCard } from '../components/premium/PremiumCard';
import { obterGruposEscolhaRacial, obterTracosOpcaoRacial, descreverOpcaoRacial, temDescricaoPropria } from '../../services/racaService';
import { obterTemaPorId } from '../themeMap';

export const Bruxa = ({ raca }: { raca: IRaca }) => {
  const tema = obterTemaPorId(raca.id);

  return (
    <div className="min-h-screen text-rose-50 p-8 selection:bg-rose-500/30 overflow-hidden relative">
      {/* Witchcraft Background */}
      <div 
        className="fixed inset-0 z-0 bg-cover bg-center bg-no-repeat bg-black"
        style={{ backgroundImage: "url('/assets/img/bruxa_bg.webp')" }}
      >
        <div className="absolute inset-0 bg-purple-950/80 mix-blend-multiply" />
        <div className="absolute inset-0 bg-gradient-to-b from-[#0a0206]/40 via-transparent to-[#0a0206]/90" />
      </div>

      {/* Witchcraft/Curse Background Effects */}
      <div className="fixed inset-0 pointer-events-none z-0">
        <div className="absolute top-[30%] left-[20%] w-[50%] h-[50%] bg-purple-900/20 blur-[150px] rounded-full mix-blend-screen" />
        <div className="absolute bottom-[10%] right-[20%] w-[40%] h-[40%] bg-rose-900/10 blur-[120px] rounded-full mix-blend-screen" />
        
        {/* Dark threads / Hexes */}
        {[...Array(10)].map((_, i) => (
          <motion.div
            key={i}
            className="absolute border-t border-purple-500/10 rounded-[100%]"
            style={{
              width: Math.random() * 400 + 200,
              height: Math.random() * 200 + 100,
              left: `${Math.random() * 100 - 20}%`,
              top: `${Math.random() * 100 - 20}%`,
              rotate: Math.random() * 180,
            }}
            animate={{
              opacity: [0.1, 0.4, 0.1],
              scale: [1, 1.1, 1],
            }}
            transition={{
              duration: Math.random() * 5 + 5,
              repeat: Infinity,
              ease: "easeInOut"
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
            className={`w-28 h-28 mx-auto ${tema.bg} ${tema.border} rounded-full flex items-center justify-center mb-8 backdrop-blur-md relative overflow-hidden`}
            style={{ boxShadow: `0 0 50px ${tema.glow}` }}
          >
            <motion.div 
              className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAiIGhlaWdodD0iMjAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PHBhdGggZD0iTTEwIDBMMjAgMjBMMCAyMFoiIGZpbGw9Im5vbmUiIHN0cm9rZT0icmdiYSgxNDcsIDUxLCAyMzQsIDAuMikiIHN0cm9rZS13aWR0aD0iMSIvPjwvc3ZnPg==')] bg-center opacity-30"
              animate={{ rotate: 360 }}
              transition={{ duration: 30, repeat: Infinity, ease: "linear" }}
            />
            <Eye size={48} className={`${tema.icon} z-10`} strokeWidth={1} />
          </motion.div>

          <motion.div className="overflow-hidden">
             <motion.h1 
                initial={{ y: "100%" }}
                animate={{ y: 0 }}
                transition={{ duration: 0.8, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
                className={`text-7xl font-serif tracking-tight ${tema.text} mb-6 uppercase`}
                style={{ fontFamily: 'Cinzel, serif' }}
             >
               Bruxa
             </motion.h1>
          </motion.div>
          <motion.p 
             initial={{ opacity: 0 }}
             animate={{ opacity: 1 }}
             transition={{ duration: 1, delay: 0.6 }}
             className="text-lg text-rose-200/60 max-w-2xl mx-auto font-serif leading-relaxed"
          >
            Não é profissão nem gênero: é uma natureza mágica que se adquire e não se devolve. Enxerga maldição, pacto e possessão a distância, tece maldição própria, e quando falta Mana paga com Vida. Fala Celta, e ninguém domina as artes do Fluxo como as de Salém.
          </motion.p>
        </motion.header>

        {/* Traits Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-24">
          <PremiumCard
            glowColor={tema.glow}
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className={`flex flex-col p-8 rounded-none ${tema.bg} ${tema.border} backdrop-blur-md`}
          >
            <Eye size={32} className={`${tema.icon} mb-6`} strokeWidth={1.5} />
            <h3 className={`text-2xl font-serif ${tema.text} mb-3`} style={{ fontFamily: 'Cinzel, serif' }}>Olhar Bruxo</h3>
            <p className="text-rose-200/60 leading-relaxed text-sm font-serif">
              Você percebe a presença e direção aproximada de maldições, pactos e possessões ativas a até 15m. Receba vantagem natural para resistir a maldições e tentativas de controlar sua alma.
            </p>
          </PremiumCard>

          <PremiumCard
            glowColor={tema.glow}
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className={`flex flex-col p-8 rounded-none ${tema.bg} ${tema.border} backdrop-blur-md`}
          >
            <Flame size={32} className={`${tema.icon} mb-6`} strokeWidth={1.5} />
            <h3 className={`text-2xl font-serif ${tema.text} mb-3`} style={{ fontFamily: 'Cinzel, serif' }}>Preço da Bruxaria</h3>
            <p className="text-rose-200/60 leading-relaxed text-sm font-serif">
              Uma vez por cena, se não tiver Mana suficiente para uma característica racial, substitua até 3 pontos de Mana por 2 de Vida para cada um. Esse dano direto ignora resistências e custa seu sangue.
            </p>
          </PremiumCard>

          <PremiumCard
            glowColor={tema.glow}
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.4 }}
            className={`col-span-1 md:col-span-2 flex flex-col p-8 rounded-none ${tema.bg} ${tema.border} backdrop-blur-md`}
          >
            <TriangleAlert size={32} className={`${tema.icon} mb-6`} strokeWidth={1.5} />
            <h3 className={`text-2xl font-serif ${tema.text} mb-3`} style={{ fontFamily: 'Cinzel, serif' }}>Maldição Tecida & Grande Sabá</h3>
            <p className="text-rose-200/60 leading-relaxed text-sm font-serif">
              Gaste ações e Mana para afligir alvos com maldições severas e tecidas com misticismo. No nível avançado do Grande Sabá, quem domina essa magia adquirida afeta múltiplos inimigos simultaneamente de forma aterradora.
            </p>
          </PremiumCard>
        </div>

        {/* Custom Lineages for Bruxa */}
        {(() => {
          const grupos = obterGruposEscolhaRacial(raca);
          return grupos.map((grupo) => {
            const mostraDescricao = grupo.opcoes.some(temDescricaoPropria);
            return (
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
                <p className="text-rose-200/60 text-lg font-serif">{grupo.descricao}</p>
              </motion.div>

              <div className="grid grid-cols-1 gap-6 font-serif">
                {grupo.opcoes.map((opcao, opcaoIdx) => {
                  const tracos = obterTracosOpcaoRacial(opcao);
                  const titleLower = opcao.titulo.toLowerCase();

                  let lineageStyle = { glow: 'rgba(147,51,234,0.25)', text: 'text-purple-400', border: 'border-purple-500/50', bg: 'bg-purple-900/20' };
                  if (titleLower.includes('sangue') || titleLower.includes('dor') || titleLower.includes('sacrifício') || titleLower.includes('escarlate') || titleLower.includes('rubro')) {
                    lineageStyle = { glow: 'rgba(225,29,72,0.25)', text: 'text-rose-500', border: 'border-rose-600/50', bg: 'bg-rose-950/20' };
                  } else if (titleLower.includes('sombra') || titleLower.includes('noite') || titleLower.includes('pesadelo') || titleLower.includes('escuridão')) {
                    lineageStyle = { glow: 'rgba(31,41,55,0.25)', text: 'text-gray-400', border: 'border-gray-500/50', bg: 'bg-gray-900/30' };
                  } else if (titleLower.includes('fogo') || titleLower.includes('cinzas') || titleLower.includes('inferno') || titleLower.includes('brasa')) {
                    lineageStyle = { glow: 'rgba(239,68,68,0.25)', text: 'text-red-500', border: 'border-red-600/50', bg: 'bg-red-950/20' };
                  } else if (titleLower.includes('espírito') || titleLower.includes('alma') || titleLower.includes('fantasma') || titleLower.includes('frio') || titleLower.includes('gelo')) {
                    lineageStyle = { glow: 'rgba(56,189,248,0.25)', text: 'text-sky-400', border: 'border-sky-500/50', bg: 'bg-sky-950/20' };
                  }

                  return (
                    <PremiumCard
                      key={opcao.id}
                      glowColor={lineageStyle.glow}
                      initial={{ opacity: 0, y: 20 }}
                      whileInView={{ opacity: 1, y: 0 }}
                      viewport={{ once: true }}
                      transition={{ delay: 0.06 * opcaoIdx }}
                      className={`flex flex-col p-8 rounded-none ${lineageStyle.bg} border-l-2 ${lineageStyle.border} backdrop-blur-md transition-colors`}
                    >
                      <h3 className={`text-2xl font-bold mb-4 ${lineageStyle.text}`} style={{ fontFamily: 'Cinzel, serif' }}>
                        {opcao.titulo}
                      </h3>
                      {mostraDescricao && (
                        <p className="text-rose-200/70 leading-relaxed text-sm mb-4">
                          {descreverOpcaoRacial(opcao)}
                        </p>
                      )}
                      {tracos.length > 0 ? (
                        <div className="space-y-4 flex-1 mt-2">
                          {tracos.map(traco => (
                            <div key={traco.id} className="bg-black/20 p-3 rounded-none border border-purple-900/30 font-sans">
                              <h4 className="text-sm font-bold text-rose-200 mb-1">{traco.titulo}</h4>
                              {traco.descricao && <p className="text-xs text-rose-200/50 leading-relaxed">{traco.descricao}</p>}
                            </div>
                          ))}
                        </div>
                      ) : (
                        <span className="text-purple-500/30 italic text-sm font-sans">Sem traços adicionais.</span>
                      )}
                    </PremiumCard>
                  );
                })}
              </div>
            </section>
            );
          });
        })()}

        {/* Maldições: catálogo que Maldição Tecida e Grande Sabá aplicam,
            ausente do resto da página. */}
        {Array.isArray(raca.maldicoes) && raca.maldicoes.length > 0 && (
          <section className="pt-4 mb-16">
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.4 }}
              className="mb-8"
            >
              <h2 className={`text-4xl font-bold ${tema.text} mb-3 uppercase tracking-wider`} style={{ fontFamily: 'Cinzel, serif' }}>
                Maldições Conhecidas
              </h2>
              <p className="text-rose-200/60 text-lg font-serif">
                Maldição Tecida e Grande Sabá aplicam uma destas. Grimório aumenta o total conhecido de três para cinco.
              </p>
            </motion.div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {raca.maldicoes.map((maldicao: any, idx: number) => (
                <PremiumCard
                  key={maldicao.id}
                  glowColor={tema.glow}
                  initial={{ opacity: 0, y: 15 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: Math.min(idx * 0.03, 0.3) }}
                  className="flex flex-col p-6 rounded-none border border-purple-800/40 bg-purple-950/20 backdrop-blur-md font-serif"
                >
                  <h3 className="text-lg font-bold text-rose-200 mb-3" style={{ fontFamily: 'Cinzel, serif' }}>{maldicao.titulo}</h3>
                  <p className="text-rose-100/70 text-sm leading-relaxed">{maldicao.descricao}</p>
                </PremiumCard>
              ))}
            </div>
          </section>
        )}
      </div>
    </div>
  );
};

export default Bruxa;
