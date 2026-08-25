import { motion } from 'framer-motion';
import { CircleDot, Hourglass, Star, Gauge } from 'lucide-react';
import type { IClasse } from '../../types/catalogo';
import { PremiumCard } from '../components/premium/PremiumCard';
import { DetalhesClasse } from '../../pages/Regras/components/DetalhesClasse';
import { obterTemaPorId } from '../themeMap';

export const Ritualista = ({ classe }: { classe: IClasse }) => {
  const tema = obterTemaPorId(classe.id);

  return (
    <div className="min-h-screen text-purple-50 p-8 selection:bg-purple-500/30 overflow-hidden relative">
      {/* 3D WebGL Background */}
      <div className="fixed inset-0 z-0 bg-cover bg-center bg-no-repeat opacity-20 pointer-events-none" style={{ backgroundImage: "url('/assets/img/ritualista_bg.webp')" }} />

      {/* Ritual Background Effects */}
      <div className="fixed inset-0 pointer-events-none z-0">
        <div className="absolute top-[20%] left-[20%] w-[60%] h-[60%] bg-purple-900/20 blur-[150px] rounded-full mix-blend-screen" />
        
        {/* Drawing Ritual Lines */}
        <svg className="absolute inset-0 w-full h-full opacity-10">
          <motion.polygon 
            points="200,100 800,100 900,500 500,900 100,500" 
            fill="none" 
            stroke="purple" 
            strokeWidth="2"
            animate={{ rotate: 360, transformOrigin: '50% 50%' }}
            transition={{ duration: 60, repeat: Infinity, ease: "linear" }}
          />
        </svg>
      </div>

      <div className="max-w-5xl mx-auto relative z-10 pt-16">
        {/* Header */}
        <motion.header 
          initial={{ opacity: 0, filter: 'blur(10px)' }}
          animate={{ opacity: 1, filter: 'blur(0px)' }}
          transition={{ duration: 0.8 }}
          className="text-center mb-24"
        >
          <motion.div 
            className={`w-28 h-28 mx-auto ${tema.bg} ${tema.border} rounded-full flex items-center justify-center mb-8 relative backdrop-blur-md`}
            style={{ boxShadow: `0 0 50px ${tema.glow}` }}
          >
            <CircleDot size={48} className={`${tema.icon} z-10`} strokeWidth={1.5} />
            <motion.div 
              className="absolute inset-0 border-2 border-dashed border-purple-500/50 rounded-full"
              animate={{ rotate: -360 }}
              transition={{ duration: 10, repeat: Infinity, ease: "linear" }}
            />
          </motion.div>

          <motion.div className="overflow-hidden">
             <motion.h1 
                initial={{ y: "100%" }}
                animate={{ y: 0 }}
                transition={{ duration: 0.8, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
                className={`text-7xl font-serif tracking-tight ${tema.text} mb-6 uppercase`}
                style={{ fontFamily: 'Cinzel, serif' }}
             >
               Ritualista
             </motion.h1>
          </motion.div>
          <motion.p 
             initial={{ opacity: 0 }}
             animate={{ opacity: 1 }}
             transition={{ duration: 1, delay: 0.6 }}
             className="text-lg text-purple-200/60 max-w-2xl mx-auto font-serif leading-relaxed"
          >
            O Ritualista prepara pactos, proteções e mudanças que levam tempo. Seus rituais ficam fora dos círculos de magia comum e costumam ser feitos antes do combate, quando o grupo ainda pode traçar o símbolo e pagar o preço com calma.
          </motion.p>
        </motion.header>

        {/* Traits Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-24 font-serif">
          <PremiumCard
            glowColor={tema.glow}
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.4 }}
            className={`flex flex-col p-8 ${tema.bg} ${tema.border} rounded-lg backdrop-blur-md`}
          >
            <Hourglass size={36} className={`${tema.icon} mb-4`} strokeWidth={1.5} />
            <h3 className={`text-2xl font-bold ${tema.text} mb-2 uppercase`} style={{ fontFamily: 'Cinzel, serif' }}>Círculo Preparado</h3>
            <p className="text-purple-200/60 leading-relaxed text-sm">
              O traçado que você desenha antes da primeira palavra. São seis preparos, e você aprende quatro até o nível 20: Proteção, Precisão, Duração, Ocultação, Economia e Amplitude. Um deles entra em cada rito, declarado antes de qualquer rolagem.
            </p>
          </PremiumCard>

          <PremiumCard
            glowColor={tema.glow}
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.4, delay: 0.2 }}
            className={`flex flex-col p-8 ${tema.bg} ${tema.border} rounded-lg backdrop-blur-md`}
          >
            <Star size={36} className={`${tema.icon} mb-4`} strokeWidth={1.5} />
            <h3 className={`text-2xl font-bold ${tema.text} mb-2 uppercase`} style={{ fontFamily: 'Cinzel, serif' }}>Grande Oficiante</h3>
            <p className="text-purple-200/60 leading-relaxed text-sm">
              No nível 20, uma vez por sessão, você conclui um ritual conhecido em três rodadas. Para cumprir requisitos de participantes, você conta como quatro ajudantes. Também recebe +5 contra interrupções e gasta 1 lote a menos de Componentes Ritualísticos. O custo de Mana não muda.
            </p>
          </PremiumCard>
          <PremiumCard
            glowColor={tema.glow}
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.4, delay: 0.4 }}
            className={`flex flex-col p-8 rounded-2xl ${tema.bg} ${tema.border} backdrop-blur-md`}
          >
            <Gauge size={36} className={`${tema.icon} mb-4`} strokeWidth={1.5} />
            <h3 className={`text-2xl font-bold ${tema.text} mb-2 uppercase`} style={{ fontFamily: 'Cinzel, serif' }}>Sobre a DT</h3>
            <p className="text-purple-200/60 leading-relaxed text-sm">
              Cada rito traz a própria DT, de 15 no simples a 30 no monumental, e você rola Misticismo contra ela. Quando alguma coisa ameaça o trabalho, é a mesma rolagem contra a mesma DT que decide se o traçado aguenta. Falhou, o rito quebra ali, e a Mana comprometida no primeiro minuto não volta.
            </p>
          </PremiumCard>
          <PremiumCard
            glowColor={tema.glow}
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.4, delay: 0.6 }}
            className={`flex flex-col p-8 rounded-2xl ${tema.bg} ${tema.border} backdrop-blur-md`}
          >
            <Hourglass size={36} className={`${tema.icon} mb-4`} strokeWidth={1.5} />
            <h3 className={`text-2xl font-bold ${tema.text} mb-2 uppercase`} style={{ fontFamily: 'Cinzel, serif' }}>Rito Guardado</h3>
            <p className="text-purple-200/60 leading-relaxed text-sm">
              A partir do nível 15 você não precisa mais soltar o rito na hora em que ele fica pronto. Faça o trabalho na véspera, pague tudo, e prenda o efeito. Ele espera até o fim da sessão dentro de você, e sai com uma Ação Padrão no momento que importar, inclusive no meio de uma luta que o rito jamais poderia acompanhar.
            </p>
          </PremiumCard>
        </div>

        <DetalhesClasse classe={classe} />
      </div>
    </div>
  );
};

export default Ritualista;
