import { motion } from 'framer-motion';
import { Coins, Package, Scale, Gauge } from 'lucide-react';
import type { IClasse } from '../../types/catalogo';
import { PremiumCard } from '../components/premium/PremiumCard';
import { DetalhesClasse } from '../../pages/Regras/components/DetalhesClasse';
import { obterTemaPorId } from '../themeMap';

export const Comerciante = ({ classe }: { classe: IClasse }) => {
  const tema = obterTemaPorId(classe.id);

  return (
    <div className={`min-h-screen ${tema.text} p-8 selection:bg-yellow-500/30 overflow-hidden relative`}>
      {/* 3D WebGL Background */}
      <div className="fixed inset-0 z-0 bg-cover bg-center bg-no-repeat opacity-20 pointer-events-none" style={{ backgroundImage: "url('/assets/img/comerciante_bg.webp')" }} />

      {/* Wealth / Vault Background Effects */}
      <div className="fixed inset-0 pointer-events-none z-0">
        <div className="absolute top-[20%] left-[30%] w-[40%] h-[40%] bg-yellow-900/10 blur-[150px] mix-blend-screen" />
        
        {/* Floating coins */}
        {[...Array(8)].map((_, i) => (
          <motion.div
            key={i}
            className="absolute rounded-full border border-yellow-500/30 bg-yellow-600/10"
            style={{
              width: Math.random() * 30 + 10,
              height: Math.random() * 30 + 10,
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
            }}
            animate={{
              rotateY: [0, 180, 360],
              y: [0, -20, 0],
            }}
            transition={{
              duration: Math.random() * 2 + 2,
              repeat: Infinity,
              ease: "linear",
            }}
          />
        ))}
      </div>

      <div className="max-w-5xl mx-auto relative z-10 pt-16">
        {/* Header */}
        <motion.header 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5 }}
          className="text-center mb-24"
        >
          <motion.div 
            className={`w-28 h-28 mx-auto ${tema.bg} border-2 ${tema.border} rounded-sm flex items-center justify-center mb-8 rotate-45 relative backdrop-blur-md`}
            style={{ boxShadow: `0 0 30px ${tema.glow}` }}
          >
            <Coins size={48} className={`${tema.icon} -rotate-45 z-10`} strokeWidth={1.5} />
          </motion.div>

          <motion.div className="overflow-hidden">
             <motion.h1 
                initial={{ y: "100%" }}
                animate={{ y: 0 }}
                transition={{ duration: 0.8, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
                className={`text-7xl font-bold tracking-tight ${tema.text} mb-6 uppercase`}
                style={{ fontFamily: 'Cinzel, serif' }}
             >
               Comerciante
             </motion.h1>
          </motion.div>
          <motion.p 
             initial={{ opacity: 0 }}
             animate={{ opacity: 1 }}
             transition={{ duration: 1, delay: 0.6 }}
             className={`text-lg ${tema.tag} opacity-80 max-w-2xl mx-auto font-medium leading-relaxed`}
          >
            Para eles, informação vale mais que ouro e um bom contato abre mais portas que uma espada. Tecem redes de negócios, sabem onde conseguir quase tudo e transformam estoque consignado, logística e contratos bem redigidos em vantagem, sem nunca fabricar moeda do nada.
          </motion.p>
        </motion.header>

        {/* Traits Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 mb-24">
          <PremiumCard
            glowColor={tema.glow}
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.4 }}
            className={`flex flex-col p-8 rounded-sm ${tema.bg} border ${tema.border} backdrop-blur-md`}
          >
            <Package size={36} className={`${tema.icon} mb-4`} strokeWidth={1.5} />
            <h3 className={`text-2xl font-bold ${tema.text} mb-2 uppercase`} style={{ fontFamily: 'Cinzel, serif' }}>Estoque Consignado</h3>
            <p className="text-yellow-100/60 leading-relaxed text-sm">
              Você escolhe as prateleiras que trabalha, e depois de cada descanso longo tira delas um item consignado por vaga, dentro do teto de preço do seu nível de Estoque. Poção, munição, explosivo, kit, papelada, contrabando. Usou, você paga ou repõe antes do próximo descanso, e enquanto a conta estiver aberta aquela vaga não recarrega.
            </p>
          </PremiumCard>

          <PremiumCard
            glowColor={tema.glow}
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.4, delay: 0.2 }}
            className={`flex flex-col p-8 rounded-sm ${tema.bg} border ${tema.border} backdrop-blur-md`}
          >
            <Scale size={36} className={`${tema.icon} mb-4`} strokeWidth={1.5} />
            <h3 className={`text-2xl font-bold ${tema.text} mb-2 uppercase`} style={{ fontFamily: 'Cinzel, serif' }}>Contrato Irrecusável</h3>
            <p className="text-yellow-100/60 leading-relaxed text-sm">
              No nível 18, um acordo escrito entre até quatro partes que aceitaram assinar. Enquanto ele vale, cada uma recebe +2 nos testes para cumprir o que prometeu. Quem quebra perde 1 de Prestígio com a facção envolvida e vira assunto nas suas praças. Nada aqui obriga ninguém: a força do contrato é a palavra dada e o preço de voltar atrás.
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
            <p className="text-yellow-100/60 leading-relaxed text-sm">
              Quando alguém disputa o seu preço ou recusa a sua proposta, você rola Ofício (Comércio), o ofício que vem junto da classe, e o resultado é o número que a outra parte precisa alcançar para segurar a posição dela. Passar no teste não obriga ninguém a nada, e uma falha crítica sua encarece aquela praça até o fim da sessão.
            </p>
          </PremiumCard>
        </div>

        <DetalhesClasse classe={classe} />
      </div>
    </div>
  );
};

export default Comerciante;

