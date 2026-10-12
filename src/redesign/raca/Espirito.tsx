import { motion } from 'framer-motion';
import { Ghost, MoveRight, Eye, Flame, Sun } from 'lucide-react';
import type { IOpcaoRacial, IRaca } from '../../types/catalogo';
import { nivelMinimoTraco, obterTracosOpcaoRacial } from '../../services/racaService';
import { PremiumCard } from '../components/premium/PremiumCard';
import { EscolhaRacialCards, type EstiloOpcaoRacial } from '../components/premium/EscolhaRacialCards';
import { EstagiosRaciais } from '../components/premium/EstagiosRaciais';
import { obterTemaPorId } from '../themeMap';

/** Uma paleta por Fluxo do Espírito, indexada pelo id da variante em
 * `data/ficha/racas.json`. `tinta` e a cor crua, usada no filete e no ponto que
 * identificam o cartao.
 *
 * Os valores sao os mesmos `destaque` de FLUXO_TEMAS em
 * `src/services/magiaService.ts`, que ja carrega a paleta canonica das Arvores.
 * Cada paleta tem que bater com o Fluxo que ela representa: se a paleta de um
 * Fluxo mudar la, ela muda aqui tambem. Ficam repetidos como literal porque o
 * Tailwind so enxerga classe arbitraria escrita no proprio arquivo. */
const ESTILO_POR_COR: Record<string, EstiloOpcaoRacial> = {
  // origem / Genese
  rosa: { tinta: 'rgb(239,159,190)', text: 'text-[#ef9fbe]', border: 'border-[#ef9fbe]/40' },
  // essencia / Aletheia
  amarelo: { tinta: 'rgb(240,220,120)', text: 'text-[#f0dc78]', border: 'border-[#f0dc78]/40' },
  // comunicacao / Parley
  prata: { tinta: 'rgb(220,225,231)', text: 'text-[#dce1e7]', border: 'border-[#dce1e7]/40' },
  // vitalidade / Anima
  verde: { tinta: 'rgb(121,209,127)', text: 'text-[#79d17f]', border: 'border-[#79d17f]/40' },
  // inconstancia / Vortice
  laranja: { tinta: 'rgb(243,149,85)', text: 'text-[#f39555]', border: 'border-[#f39555]/40' },
  // fisico / Baluarte
  marrom: { tinta: 'rgb(180,130,88)', text: 'text-[#b48258]', border: 'border-[#b48258]/40' },
  // espaco / Matriz
  roxo: { tinta: 'rgb(173,125,225)', text: 'text-[#ad7de1]', border: 'border-[#ad7de1]/40' },
  // tempo / Eon
  dourado: { tinta: 'rgb(207,173,99)', text: 'text-[#cfad63]', border: 'border-[#cfad63]/40' },
  // vazio / Abismo
  preto: { tinta: 'rgb(119,112,127)', text: 'text-[#77707f]', border: 'border-[#77707f]/40' },
  // fim / Limiar
  'vermelho-vinho': { tinta: 'rgb(210,75,102)', text: 'text-[#d24b66]', border: 'border-[#d24b66]/40' },
  // tecnologia / A.X.I.S
  'azul-neon': { tinta: 'rgb(112,237,250)', text: 'text-[#70edfa]', border: 'border-[#70edfa]/40' },
  // universal / Blanc (TEMA_UNIVERSAL em magiaService)
  branco: { tinta: 'rgb(231,226,242)', text: 'text-[#e7e2f2]', border: 'border-[#e7e2f2]/40' },
  // Pecados do Espírito Demoníaco
  'demonio-soberba': { tinta: 'rgb(167,139,250)', text: 'text-[#a78bfa]', border: 'border-[#a78bfa]/40' },
  'demonio-ganancia': { tinta: 'rgb(224,184,74)', text: 'text-[#e0b84a]', border: 'border-[#e0b84a]/40' },
  'demonio-luxuria': { tinta: 'rgb(224,82,156)', text: 'text-[#e0529c]', border: 'border-[#e0529c]/40' },
  'demonio-inveja': { tinta: 'rgb(143,191,63)', text: 'text-[#8fbf3f]', border: 'border-[#8fbf3f]/40' },
  'demonio-gula': { tinta: 'rgb(217,130,43)', text: 'text-[#d9822b]', border: 'border-[#d9822b]/40' },
  'demonio-ira': { tinta: 'rgb(224,68,68)', text: 'text-[#e04444]', border: 'border-[#e04444]/40' },
  'demonio-preguica': { tinta: 'rgb(127,143,176)', text: 'text-[#7f8fb0]', border: 'border-[#7f8fb0]/40' },
  // Virtudes do Espírito Angelical
  'anjo-humildade': { tinta: 'rgb(142,202,230)', text: 'text-[#8ecae6]', border: 'border-[#8ecae6]/40' },
  'anjo-caridade': { tinta: 'rgb(244,213,141)', text: 'text-[#f4d58d]', border: 'border-[#f4d58d]/40' },
  'anjo-castidade': { tinta: 'rgb(242,184,208)', text: 'text-[#f2b8d0]', border: 'border-[#f2b8d0]/40' },
  'anjo-gratidao': { tinta: 'rgb(163,217,165)', text: 'text-[#a3d9a5]', border: 'border-[#a3d9a5]/40' },
  'anjo-moderacao': { tinta: 'rgb(240,185,122)', text: 'text-[#f0b97a]', border: 'border-[#f0b97a]/40' },
  'anjo-paciencia': { tinta: 'rgb(201,184,240)', text: 'text-[#c9b8f0]', border: 'border-[#c9b8f0]/40' },
  'anjo-diligencia': { tinta: 'rgb(159,184,217)', text: 'text-[#9fb8d9]', border: 'border-[#9fb8d9]/40' },
};

/** Texto da escada de cada Natureza. */
const DESCRICAO_ESCADA: Record<string, string> = {
  natural: 'Um espírito amadurece em estágios. Cada um abre por nível total e traz Mana, uma Passagem Etérea melhor e a característica seguinte do seu Fluxo.',
  demoniaca: 'Um demônio amadurece em estágios. Cada um abre por nível total e traz Mana, um poder a mais da Natureza e a característica seguinte do seu Pecado.',
  angelical: 'Um anjo amadurece em estágios. Cada um abre por nível total e traz Mana, um poder a mais da Natureza e a característica seguinte da sua Virtude.',
};

export const Espirito = ({ raca }: { raca: IRaca }) => {
  const tema = obterTemaPorId(raca.id);
  // O Demoníaco usa a paleta de sangue do Vampiro como acento, e o Angelical o dourado do Divino.
  const temaDemoniaco = obterTemaPorId('vampiro');
  const temaAngelical = obterTemaPorId('divino');
  const temaDaNatureza = (natureza: IOpcaoRacial) => (
    natureza.id === 'demoniaca' ? temaDemoniaco : natureza.id === 'angelical' ? temaAngelical : tema
  );
  const naturezas = (raca.naturezas || []) as IOpcaoRacial[];

  return (
    <div className="min-h-screen text-cyan-50 p-8 selection:bg-cyan-500/30 overflow-hidden relative">
      {/* Ethereal Background */}
      <div 
        className="fixed inset-0 z-0 bg-cover bg-center bg-no-repeat bg-black"
        style={{ backgroundImage: "url('/assets/img/espirito_fantasy_bg.webp')" }}
      >
        <div className="absolute inset-0 bg-cyan-950/80 mix-blend-multiply" />
        <div className="absolute inset-0 bg-gradient-to-b from-[#020617]/40 via-transparent to-[#020617]/90" />
      </div>

      {/* Ethereal Foreground Overlays */}
      <div className="fixed inset-0 pointer-events-none z-0">
        {/* Ethereal Static */}
        <div className="absolute inset-0 opacity-[0.02] bg-[url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI0IiBoZWlnaHQ9IjQiPgo8cmVjdCB3aWR0aD0iNCIgaGVpZ2h0PSI0IiBmaWxsPSIjMjJkM2VlIiBmaWxsLW9wYWNpdHk9IjAuMDUiLz4KPC9zdmc+')] bg-repeat" />
        

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
            className={`w-28 h-28 mx-auto ${tema.bg} border ${tema.border} rounded-full flex items-center justify-center mb-8 backdrop-blur-md relative`}
            style={{ boxShadow: `0 0 30px ${tema.glow}` }}
          >
            <Ghost size={48} className={`${tema.icon} z-10 opacity-70`} strokeWidth={1} />
            <motion.div 
              className={`absolute inset-0 rounded-full border ${tema.border}`}
              animate={{ scale: [1, 1.2, 1], opacity: [0.5, 0, 0.5] }}
              transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
            />
          </motion.div>

          <motion.div className="overflow-hidden">
             <motion.h1 
                initial={{ y: "100%" }}
                animate={{ y: 0 }}
                transition={{ duration: 0.8, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
                className={`text-7xl font-light tracking-widest ${tema.text} mb-6 uppercase`}
                style={{ fontFamily: 'Cinzel, serif' }}
             >
               Espírito
             </motion.h1>
          </motion.div>
          <motion.p 
             initial={{ opacity: 0 }}
             animate={{ opacity: 1 }}
             transition={{ duration: 1, delay: 0.6 }}
             className="text-lg text-cyan-200/50 max-w-2xl mx-auto font-light leading-relaxed"
          >
            Não tem corpo pra alimentar nem pulmão pra encher. Enxerga no escuro, atravessa parede quando tem Mana pra gastar, e não veste armadura comum porque não há o que vestir. Quem morre fica assim, e a Natureza diz o que o espírito vira. Fala Enoquiano.
          </motion.p>
        </motion.header>

        {/* Traits Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-24">
          <PremiumCard
            glowColor={tema.glow}
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className={`flex gap-6 p-8 rounded-lg ${tema.bg} border-t ${tema.border} backdrop-blur-md`}
          >
            <Eye size={36} className={`${tema.icon} shrink-0`} strokeWidth={1} />
            <div>
              <h3 className={`text-2xl font-light ${tema.text} mb-3`} style={{ fontFamily: 'Cinzel, serif' }}>Fisiologia Incorpórea</h3>
              <p className="text-cyan-200/50 leading-relaxed text-sm font-light">
                Sem corpo, não precisa respirar, comer nem beber, e enxerga normalmente na escuridão natural. Como não há corpo para vestir, armadura comum não serve em você.
              </p>
            </div>
          </PremiumCard>

          <PremiumCard
            glowColor={tema.glow}
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className={`flex gap-6 p-8 rounded-lg ${tema.bg} border-t ${tema.border} backdrop-blur-md`}
          >
            <MoveRight size={36} className={`${tema.icon} shrink-0`} strokeWidth={1} />
            <div>
              <h3 className={`text-2xl font-light ${tema.text} mb-3`} style={{ fontFamily: 'Cinzel, serif' }}>Passagem Etérea</h3>
              <p className="text-cyan-200/50 leading-relaxed text-sm font-light">
                Durante o seu movimento, atravesse até 1,5 m de material sólido. Você precisa enxergar ou já conhecer um espaço livre do outro lado, e não pode parar dentro do material nem levar outra criatura junto. Custa 2 Mana, uma vez por cena.
              </p>
            </div>
          </PremiumCard>
        </div>

        {naturezas.length > 0 && (
          <section className="pt-4 mb-20">
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.4 }}
              className="mb-8"
            >
              <h2 className={`text-4xl font-bold ${tema.text} mb-3 uppercase tracking-wider`} style={{ fontFamily: 'Cinzel, serif' }}>
                Naturezas
              </h2>
              <p className="text-lg text-gray-400">{raca.descricao_naturezas}</p>
            </motion.div>

            <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
              {naturezas.map((natureza, indice) => {
                const temaNatureza = temaDaNatureza(natureza);
                const Icone = natureza.id === 'demoniaca' ? Flame : natureza.id === 'angelical' ? Sun : Ghost;
                const tracos = obterTracosOpcaoRacial(natureza);
                const fisiologia = Array.isArray(natureza.fisiologia) ? (natureza.fisiologia as string[]) : [];
                return (
                  <PremiumCard
                    key={natureza.id}
                    glowColor={temaNatureza.glow}
                    initial={{ opacity: 0, y: 30 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.6, delay: indice * 0.15 }}
                    className={`flex flex-col gap-4 p-8 rounded-lg ${temaNatureza.bg} border-t ${temaNatureza.border} backdrop-blur-md`}
                  >
                    <div className="flex items-center gap-4">
                      <Icone size={32} className={`${temaNatureza.icon} shrink-0`} strokeWidth={1} />
                      <h3 className={`text-2xl font-light ${temaNatureza.text}`} style={{ fontFamily: 'Cinzel, serif' }}>
                        {natureza.titulo}
                      </h3>
                    </div>
                    <p className="text-sm font-light leading-relaxed text-gray-300/70">{natureza.descricao}</p>
                    {fisiologia.length > 0 && (
                      <ul className="list-disc space-y-1 pl-5 text-xs leading-relaxed text-gray-400">
                        {fisiologia.map(linha => <li key={linha}>{linha}</li>)}
                      </ul>
                    )}
                    {tracos.map(traco => (
                      <div key={traco.id} className="border-t border-white/10 pt-4">
                        <h4 className="text-sm font-bold text-gray-200">
                          {traco.titulo}
                          <span className="ml-2 text-[10px] font-bold uppercase tracking-[0.14em] text-gray-500">
                            nv {nivelMinimoTraco(traco)}
                          </span>
                        </h4>
                        <p className="mt-1 text-xs leading-relaxed text-gray-400">{traco.descricao}</p>
                      </div>
                    ))}
                  </PremiumCard>
                );
              })}
            </div>
          </section>
        )}

        {naturezas.map(natureza => (
          <EstagiosRaciais
            key={natureza.id}
            raca={raca}
            tema={temaDaNatureza(natureza)}
            natureza={natureza.id}
            titulo={`Estágios: ${natureza.titulo}`}
            descricao={DESCRICAO_ESCADA[natureza.id]}
          />
        ))}

        <EscolhaRacialCards raca={raca} tema={tema} paleta={ESTILO_POR_COR} />

      </div>
    </div>
  );
};

export default Espirito;
