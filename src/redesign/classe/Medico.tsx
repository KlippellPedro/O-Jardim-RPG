import { motion } from 'framer-motion';
import { HeartPulse, Syringe, Sparkles, Activity } from 'lucide-react';
import type { IClasse } from '../../types/catalogo';
import { PremiumCard } from '../components/premium/PremiumCard';
import { DetalhesClasse } from '../../pages/Regras/components/DetalhesClasse';
import { obterTemaPorId } from '../themeMap';

export const Medico = ({ classe }: { classe: IClasse }) => {
  const tema = obterTemaPorId(classe.id);

  return (
    <div className="min-h-screen text-teal-50 p-8 selection:bg-teal-500/30 overflow-hidden relative">
      {/* 3D WebGL Background */}
      <div className="fixed inset-0 z-0 bg-cover bg-center bg-no-repeat opacity-20 pointer-events-none" style={{ backgroundImage: "url('/assets/img/medico_bg.jpg')" }} />

      {/* Medical / Biology Background Effects */}
      <div className="fixed inset-0 pointer-events-none z-0">
        <div className="absolute top-[30%] left-[20%] w-[40%] h-[40%] bg-teal-900/20 blur-[150px] rounded-full mix-blend-screen" />
        
        {/* Heartbeat EKG line */}
        <motion.div 
          className="absolute inset-x-0 h-[2px] top-[80%] bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTAwIiBoZWlnaHQ9IjIwIiB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciPjxwYXRoIGQ9Ik0wIDEwIEwyMCAxMCBMMjUgMCBMMzUgMjAgTDQwIDEwIEwxMDAgMTAiIGZpbGw9Im5vbmUiIHN0cm9rZT0icmdiYSgyMCwgMTgzLCAxNjYsIDAuMykiIHN0cm9rZS13aWR0aD0iMSIvPjwvc3ZnPg==')] bg-repeat-x"
          animate={{ backgroundPositionX: ["0px", "-1000px"] }}
          transition={{ duration: 10, repeat: Infinity, ease: "linear" }}
        />
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
            className={`w-28 h-28 mx-auto ${tema.bg} border-[4px] ${tema.border} rounded-[2rem] flex items-center justify-center mb-8 relative overflow-hidden backdrop-blur-md`}
            style={{ boxShadow: `0 0 40px ${tema.glow}` }}
          >
            <div className="absolute inset-0 bg-teal-100/10" />
            <HeartPulse size={48} className={`${tema.icon} z-10`} strokeWidth={2} />
          </motion.div>

          <motion.div className="overflow-hidden">
             <motion.h1 
                initial={{ y: "100%" }}
                animate={{ y: 0 }}
                transition={{ duration: 0.8, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
                className={`text-7xl font-black tracking-tight ${tema.text} mb-6 uppercase`}
                style={{ fontFamily: 'Cinzel, serif' }}
             >
               Médico
             </motion.h1>
          </motion.div>
          <motion.p 
             initial={{ opacity: 0 }}
             animate={{ opacity: 1 }}
             transition={{ duration: 1, delay: 0.6 }}
             className="text-lg text-teal-200/60 max-w-2xl mx-auto font-medium leading-relaxed"
          >
            Cirurgiões de campo implacáveis. Eles não apenas fecham feridas com rapidez assustadora, mas desafiam a própria biologia ao restaurar membros e estabilizar aliados à beira da morte.
          </motion.p>
        </motion.header>

        {/* Traits Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-24">
          <PremiumCard
            glowColor={tema.glow}
            initial={{ opacity: 0, x: -30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className={`flex flex-col p-8 rounded-2xl ${tema.bg} border-t-4 ${tema.border} backdrop-blur-md`}
          >
            <Activity size={40} className={`${tema.icon} mb-6`} strokeWidth={1.5} />
            <h3 className={`text-2xl font-bold ${tema.text} mb-3`} style={{ fontFamily: 'Cinzel, serif' }}>Medicina</h3>
            <p className="text-teal-200/60 leading-relaxed text-sm">
              Ao curar uma criatura após avaliá-la com uma ação de movimento, some +1d6 à cura. Com a experiência, você passa a identificar Vida, Mana e condições visíveis, e sua cura remove condições leves do alvo por cena.
            </p>
          </PremiumCard>

          <PremiumCard
            glowColor={tema.glow}
            initial={{ opacity: 0, x: 30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className={`flex flex-col p-8 rounded-2xl ${tema.bg} border-t-4 ${tema.border} backdrop-blur-md`}
          >
            <Syringe size={40} className={`${tema.icon} mb-6`} strokeWidth={1.5} />
            <h3 className={`text-2xl font-bold ${tema.text} mb-3`} style={{ fontFamily: 'Cinzel, serif' }}>Socorro de Emergência</h3>
            <p className="text-teal-200/60 leading-relaxed text-sm">
              Até três vezes por combate, use uma reação e gaste 5 de Mana quando um aliado a 4m cair a 0 Vida: ele recupera 1d6 de Vida. Com a experiência, o alcance cresce para 8m e depois 12m, e a cura final se torna 1d12 + Mod.Inteligência.
            </p>
          </PremiumCard>

          <PremiumCard
            glowColor={tema.glow}
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.4 }}
            className={`col-span-1 md:col-span-2 flex flex-col p-8 rounded-2xl ${tema.bg} border-t-4 ${tema.border} backdrop-blur-md`}
          >
            <Sparkles size={40} className={`${tema.icon} mb-6`} strokeWidth={1.5} />
            <h3 className={`text-2xl font-bold ${tema.text} mb-3`} style={{ fontFamily: 'Cinzel, serif' }}>Milagre</h3>
            <p className="text-teal-200/60 leading-relaxed text-sm">
              Um ápice médico. Uma vez a cada cinco sessões, durante um descanso longo e com 12 de Mana, restaure um membro perdido de um aliado ou remova uma condição gravíssima. Não ressuscita mortos nem remove consequências narrativas sem aprovação do mestre.
            </p>
          </PremiumCard>
        </div>

        <DetalhesClasse classe={classe} />
      </div>
    </div>
  );
};

export default Medico;

