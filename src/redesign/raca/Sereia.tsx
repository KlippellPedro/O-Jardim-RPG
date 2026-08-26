import { motion } from 'framer-motion';
import { Waves, Music, Shell } from 'lucide-react';
import type { IRaca } from '../../types/catalogo';

import { PremiumCard } from '../components/premium/PremiumCard';
import { EscolhaRacialCards } from '../components/premium/EscolhaRacialCards';
import { EstagiosRaciais } from '../components/premium/EstagiosRaciais';
import { obterTemaPorId } from '../themeMap';

interface SereiaProps {
  raca: IRaca;
}

export const Sereia = ({ raca }: SereiaProps) => {
  const tema = obterTemaPorId(raca.id);
  return (
    <div className="min-h-screen text-cyan-50 p-8 selection:bg-cyan-500/30 overflow-hidden relative">
      {/* Background Image */}
      <div 
        className="fixed inset-0 z-0 bg-cover bg-center bg-no-repeat bg-black"
        style={{ backgroundImage: "url('/assets/img/sereia_bg.webp')" }}
      >
        <div className="absolute inset-0 bg-slate-950/80 mix-blend-multiply" />
        <div className="absolute inset-0 bg-gradient-to-b from-[#051119]/40 via-transparent to-[#051119]/90" />
      </div>

      {/* Underwater Background Effects */}
      <div className="fixed inset-0 pointer-events-none z-0">
        <div className="absolute top-[30%] left-[20%] w-[60%] h-[60%] bg-cyan-900/20 blur-[150px] rounded-full mix-blend-screen" />
        <div className="absolute top-0 right-0 w-[40%] h-[100%] bg-blue-900/10 blur-[150px] mix-blend-screen" />
        
        {/* Light rays reflecting in water */}
        <motion.div 
          className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAwIiBoZWlnaHQ9IjYwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSJub25lIi8+PGNpcmNsZSBjeD0iMzAwIiBjeT0iMzAwIiByPSIyMDAiIGZpbGw9Im5vbmUiIHN0cm9rZT0icmdiYSgxMDMsIDIzMiwgMjQ5LCAwLjAxKSIgc3Ryb2tlLXdpZHRoPSI4MCIvPjwvc3ZnPg==')] bg-cover opacity-30"
          animate={{ scale: [1, 1.1, 1], rotate: [0, 5, 0] }}
          transition={{ duration: 15, repeat: Infinity, ease: "easeInOut" }}
        />
        
        {/* Bubbles */}
        {[...Array(15)].map((_, i) => (
          <motion.div
            key={i}
            className="absolute border border-cyan-400/30 rounded-full"
            style={{
              width: Math.random() * 20 + 5,
              height: Math.random() * 20 + 5,
              left: `${Math.random() * 100}%`,
              bottom: '-5%'
            }}
            animate={{
              y: - (typeof window !== 'undefined' ? window.innerHeight + 100 : 1000),
              x: `+=${Math.random() * 50 - 25}`,
            }}
            transition={{
              duration: Math.random() * 8 + 5,
              repeat: Infinity,
              ease: "easeIn",
              delay: Math.random() * 5
            }}
          />
        ))}
      </div>

      <div className="max-w-5xl mx-auto relative z-10 pt-16">
        {/* Header */}
        <motion.header 
          initial={{ opacity: 0, filter: 'blur(10px)' }}
          animate={{ opacity: 1, filter: 'blur(0px)' }}
          transition={{ duration: 1, ease: "easeOut" }}
          className="text-center mb-24"
        >
          <motion.div 
            className={`w-28 h-28 mx-auto ${tema.bg} ${tema.border} rounded-[40%] flex items-center justify-center mb-8 backdrop-blur-sm relative overflow-hidden`}
          >
            <Shell size={48} className={`${tema.icon} z-10`} strokeWidth={1.5} />
            <motion.div 
              className={`absolute inset-x-0 bottom-0 ${tema.bg}`}
              animate={{ height: ["30%", "60%", "30%"] }}
              transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
            />
          </motion.div>

          <motion.div className="overflow-hidden">
             <motion.h1 
                initial={{ y: "100%" }}
                animate={{ y: 0 }}
                transition={{ duration: 0.8, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
                className={`text-7xl font-bold tracking-tight ${tema.text} mb-6`}
                style={{ fontFamily: 'Cinzel, serif' }}
             >
               Sereia / Tritão
             </motion.h1>
          </motion.div>
          <motion.p 
             initial={{ opacity: 0 }}
             animate={{ opacity: 1 }}
             transition={{ duration: 1, delay: 0.6 }}
             className="text-lg text-cyan-100/60 max-w-2xl mx-auto font-medium leading-relaxed"
          >
            Respira dentro e fora d'água, e nada tão rápido quanto anda em terra. O canto segura quem escuta pelo tempo exato de mudar uma cena, ou de sair dela viva. Fala Latim.
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
            className={`flex flex-col p-8 rounded-2xl ${tema.bg} ${tema.border} backdrop-blur-md`}
          >
            <div className={`w-14 h-14 ${tema.bg} rounded-full flex items-center justify-center mb-6`}>
              <Waves size={28} className={tema.icon} strokeWidth={1.5} />
            </div>
            <h3 className={`text-2xl font-bold ${tema.text} mb-3`} style={{ fontFamily: 'Cinzel, serif' }}>Fisiologia Anfíbia</h3>
            <p className="text-cyan-100/60 leading-relaxed text-sm">
              Você respira no ar e na água do mesmo jeito, sem precisar subir para tomar fôlego. E nada tão rápido quanto anda: seu deslocamento de natação é igual ao seu Movimento terrestre.
            </p>
          </PremiumCard>

          <PremiumCard
            glowColor={tema.glow}
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className={`flex flex-col p-8 rounded-2xl ${tema.bg} ${tema.border} backdrop-blur-md`}
          >
            <div className={`w-14 h-14 ${tema.bg} rounded-full flex items-center justify-center mb-6 relative`}>
              <Music size={28} className={`${tema.icon} z-10`} strokeWidth={1.5} />
              <motion.div 
                className={`absolute inset-0 rounded-full border ${tema.border}`}
                animate={{ scale: [1, 1.5], opacity: [1, 0] }}
                transition={{ duration: 2, repeat: Infinity }}
              />
            </div>
            <h3 className={`text-2xl font-bold ${tema.text} mb-3`} style={{ fontFamily: 'Cinzel, serif' }}>Canto Fascinante</h3>
            <p className="text-cyan-100/60 leading-relaxed text-sm">
              Uma vez por cena, gaste uma ação e 2 Mana para fazer um teste de Carisma contra a Vontade de uma criatura a até 9 m que possa ouvir. Em sucesso, ela fica fascinada até o início do seu próximo turno. O efeito quebra se ela sofrer dano.
            </p>
          </PremiumCard>
        </div>

        <EstagiosRaciais
          raca={raca}
          tema={tema}
          titulo="Profundidade"
          descricao="Quanto mais fundo a voz aprende a descer, mais longe ela chega. A profundidade sobe por nível total: Águas Costeiras no começo, Águas Profundas no nível 12 e Águas Abissais no 32."
        />

        <EscolhaRacialCards raca={raca} tema={tema} />
      </div>
    </div>
  );
};

export default Sereia;
