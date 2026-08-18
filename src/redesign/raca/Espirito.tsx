import { motion } from 'framer-motion';
import { Ghost, MoveRight, Eye } from 'lucide-react';
import type { IRaca } from '../../types/catalogo';
import { PremiumCard } from '../components/premium/PremiumCard';
import { EscolhaRacialCards, type EstiloOpcaoRacial } from '../components/premium/EscolhaRacialCards';
import { EstagiosRaciais } from '../components/premium/EstagiosRaciais';
import { obterTemaPorId } from '../themeMap';

/** Uma paleta por Cor da Alma, indexada pelo id da variante em
 * `data/ficha/racas.json`. `tinta` e a cor crua, usada no filete e no ponto que
 * identificam o cartao.
 *
 * Os valores sao os mesmos `destaque` de FLUXO_TEMAS em
 * `src/services/magiaService.ts`, que ja carrega a paleta canonica das Arvores.
 * Cada Cor tem que bater com o Fluxo que ela representa: se a paleta de um
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
};

export const Espirito = ({ raca }: { raca: IRaca }) => {
  const tema = obterTemaPorId(raca.id);

  return (
    <div className="min-h-screen text-cyan-50 p-8 selection:bg-cyan-500/30 overflow-hidden relative">
      {/* Ethereal Background */}
      <div 
        className="fixed inset-0 z-0 bg-cover bg-center bg-no-repeat bg-black"
        style={{ backgroundImage: "url('/assets/img/espirito_bg.webp')" }}
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
            Não tem corpo pra alimentar nem pulmão pra encher. Enxerga no escuro, atravessa parede quando tem Mana pra gastar, e não veste armadura comum porque não há o que vestir. Fala Enoquiano.
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
                Não precisa respirar, comer nem beber, e enxerga normalmente na escuridão natural. Como não há corpo para vestir, armadura comum não serve em você.
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

        <EstagiosRaciais
          raca={raca}
          tema={tema}
          titulo="Estágios da Alma"
          descricao="Um espírito amadurece em estágios. Cada um abre por nível total e traz Mana, uma Passagem Etérea melhor e a característica seguinte da sua Cor."
        />

        <EscolhaRacialCards raca={raca} tema={tema} paleta={ESTILO_POR_COR} />

      </div>
    </div>
  );
};

export default Espirito;