import { motion } from 'framer-motion';
import { Focus, Wind, Target, Zap, Gauge } from 'lucide-react';
import type { IClasse } from '../../types/catalogo';
import { PremiumCard } from '../components/premium/PremiumCard';
import { DetalhesClasse } from '../../pages/Regras/components/DetalhesClasse';
import { obterTemaPorId } from '../themeMap';

export const Atirador = ({ classe }: { classe: IClasse }) => {
  const tema = obterTemaPorId(classe.id);

  return (
    <div className={`min-h-screen ${tema.text} p-8 selection:bg-green-500/30 overflow-hidden relative`}>
      {/* 3D WebGL Background */}
      <div className="fixed inset-0 z-0 bg-cover bg-center bg-no-repeat opacity-20 pointer-events-none" style={{ backgroundImage: "url('/assets/img/atirador_bg.webp')" }} />

      {/* Sniper / Laser Background Effects */}
      <div className="fixed inset-0 pointer-events-none z-0">
        {/* Laser Sight Effect */}
        <motion.div 
          className="absolute h-[1px] w-[200%] origin-left"
          style={{ top: '30%', left: '0%', backgroundColor: tema.primary, boxShadow: `0 0 8px ${tema.primary}` }}
          animate={{ rotate: [-5, 5, -5], top: ['30%', '40%', '30%'] }}
          transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
        />
        <motion.div 
          className="absolute h-[1px] w-[200%] origin-right opacity-50"
          style={{ bottom: '20%', right: '0%', backgroundColor: tema.primary, boxShadow: `0 0 8px ${tema.primary}` }}
          animate={{ rotate: [5, -5, 5], bottom: ['20%', '30%', '20%'] }}
          transition={{ duration: 6, repeat: Infinity, ease: "easeInOut", delay: 1 }}
        />

        <div className="absolute top-[30%] right-[30%] w-[40%] h-[40%] bg-green-900/10 blur-[150px] mix-blend-screen" />
      </div>

      <div className="max-w-5xl mx-auto relative z-10 pt-16">
        {/* Header */}
        <motion.header 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: "easeOut" }}
          className="text-center mb-24"
        >
          <motion.div 
            className={`w-28 h-28 mx-auto ${tema.bg} border-2 ${tema.border} rounded-full flex items-center justify-center mb-8 relative backdrop-blur-md`}
          >
            {/* Scope crosshair inner ring */}
            <div className={`absolute inset-2 border ${tema.border} rounded-full`} />
            <div className="absolute inset-x-0 top-1/2 h-px" style={{ backgroundColor: tema.primary + '50' }} />
            <div className="absolute inset-y-0 left-1/2 w-px" style={{ backgroundColor: tema.primary + '50' }} />
            
            <Target size={48} className={`${tema.icon} z-10`} strokeWidth={1.5} />
          </motion.div>

          <motion.div className="overflow-hidden">
             <motion.h1 
                initial={{ y: "100%" }}
                animate={{ y: 0 }}
                transition={{ duration: 0.8, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
                className={`text-7xl font-bold tracking-tight ${tema.text} mb-6 uppercase`}
                style={{ fontFamily: 'Cinzel, serif' }}
             >
               Atirador
             </motion.h1>
          </motion.div>
          <motion.p 
             initial={{ opacity: 0 }}
             animate={{ opacity: 1 }}
             transition={{ duration: 1, delay: 0.6 }}
             className={`text-lg ${tema.tag} opacity-80 max-w-2xl mx-auto font-medium leading-relaxed`}
          >
            A paciência que antecede o disparo perfeito. Atiradores manipulam ângulos e posições táticas para perfurar defesas à distância antes mesmo que o inimigo entenda de onde veio o acerto.
          </motion.p>
        </motion.header>

        {/* Traits Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 mb-24">
          <PremiumCard
            glowColor={tema.glow}
            initial={{ opacity: 0, x: -30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.4 }}
            className={`flex flex-col p-8 ${tema.bg} ${tema.border} backdrop-blur-md`}
          >
            <Focus size={36} className={`${tema.icon} mb-4`} strokeWidth={1.5} />
            <h3 className={`text-2xl font-bold ${tema.text} mb-2 uppercase tracking-wide`} style={{ fontFamily: 'Cinzel, serif' }}>Disparo Calculado</h3>
            <p className="text-slate-300 leading-relaxed text-sm">
              Uma vez por combate, gaste uma Ação Completa pra estudar o alvo: vento, distância, movimento. Seu próximo ataque à distância contra ele recebe vantagem e ignora os bônus de cobertura parcial ou superior, mas não atravessa cobertura total.
            </p>
          </PremiumCard>

          <PremiumCard
            glowColor={tema.glow}
            initial={{ opacity: 0, x: 30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.4, delay: 0.1 }}
            className={`flex flex-col p-8 ${tema.bg} ${tema.border} backdrop-blur-md`}
          >
            <Wind size={36} className={`${tema.icon} mb-4`} strokeWidth={1.5} />
            <h3 className={`text-2xl font-bold ${tema.text} mb-2 uppercase tracking-wide`} style={{ fontFamily: 'Cinzel, serif' }}>Tiro de Impulso</h3>
            <p className="text-slate-300 leading-relaxed text-sm">
              Ao atacar, escolha um benefício da lista: alcance estendido, recarga sem custo de ação, um segundo alvo alinhado, um ponto fraco na margem de ameaça e mais. Você aprende um benefício novo por estágio, entre oito possíveis.
            </p>
          </PremiumCard>

          <PremiumCard
            glowColor={tema.glow}
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.4, delay: 0.2 }}
            className={`flex flex-col p-8 ${tema.bg} ${tema.border} backdrop-blur-md`}
          >
            <Zap size={36} className={`${tema.icon} mb-4`} strokeWidth={1.5} />
            <h3 className={`text-2xl font-bold ${tema.text} mb-2 uppercase tracking-wide`} style={{ fontFamily: 'Cinzel, serif' }}>Um Só Disparo</h3>
            <p className="text-slate-300 leading-relaxed text-sm">
              Uma vez por sessão, um disparo com vantagem que ignora cobertura e Resistência e conta como crítico, com o multiplicador da própria arma. Ainda gasta munição, e ainda pode errar.
            </p>
          </PremiumCard>
          <PremiumCard
            glowColor={tema.glow}
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.4, delay: 0.3 }}
            className={`flex flex-col p-8 ${tema.bg} ${tema.border} backdrop-blur-md`}
          >
            <Gauge size={36} className={`${tema.icon} mb-4`} strokeWidth={1.5} />
            <h3 className={`text-2xl font-bold ${tema.text} mb-2 uppercase tracking-wide`} style={{ fontFamily: 'Cinzel, serif' }}>Sobre a DT</h3>
            <p className="text-slate-300 leading-relaxed text-sm">
              Toda técnica sua que obriga o alvo a resistir rola Pontaria no momento do disparo: o resultado vira a DT que ele precisa alcançar, valendo para todos os atingidos naquele tiro.
            </p>
          </PremiumCard>
        </div>

        <DetalhesClasse classe={classe} />
      </div>
    </div>
  );
};

export default Atirador;
