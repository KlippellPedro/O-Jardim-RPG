import { motion } from 'framer-motion';
import { ChefHat, ClipboardList, Coffee, CookingPot } from 'lucide-react';
import type { IClasse } from '../../types/catalogo';
import { DetalhesClasse } from '../../pages/Regras/components/DetalhesClasse';
import { PremiumCard } from '../components/premium/PremiumCard';
import { obterTemaPorId } from '../themeMap';

export const Cozinheiro = ({ classe }: { classe: IClasse }) => {
  const tema = obterTemaPorId(classe.id);

  return (
    <div className={`min-h-screen ${tema.text} p-8 overflow-hidden relative`}>
      <div className="fixed inset-0 z-0 pointer-events-none bg-[radial-gradient(circle_at_25%_20%,rgba(245,158,11,0.16),transparent_40%),radial-gradient(circle_at_75%_70%,rgba(34,197,94,0.12),transparent_45%)]" />
      <div className="max-w-5xl mx-auto relative z-10 pt-16">
        <motion.header
          initial={{ opacity: 0, y: -24 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-20"
        >
          <div className={`w-28 h-28 mx-auto ${tema.bg} border-2 ${tema.border} rounded-full flex items-center justify-center mb-8 backdrop-blur-md`}>
            <ChefHat size={52} className={tema.icon} strokeWidth={1.5} />
          </div>
          <h1 className={`text-7xl font-black tracking-tight ${tema.text} mb-6 uppercase`} style={{ fontFamily: 'Cinzel, serif' }}>
            {classe.titulo}
          </h1>
          <p className={`text-lg ${tema.tag} opacity-90 max-w-2xl mx-auto font-medium leading-relaxed`}>
            Ingrediente vira preparo; preparo vira fôlego. O Chef organiza antes da jornada o que o grupo vai beber, levar no bolso e dividir no próximo descanso.
          </p>
        </motion.header>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-24">
          <PremiumCard glowColor={tema.glow} className={`p-8 rounded-2xl ${tema.bg} ${tema.border} backdrop-blur-md`}>
            <ClipboardList size={36} className={`${tema.icon} mb-4`} strokeWidth={1.5} />
            <h3 className={`text-2xl font-bold ${tema.text} mb-3 uppercase`} style={{ fontFamily: 'Cinzel, serif' }}>Mise en Place</h3>
            <p className="text-slate-300 leading-relaxed text-sm">
              No descanso, um único lote de Mantimentos prepara todas as porções disponíveis. O lote acompanha o nível atual das receitas e o que não for consumido expira conforme a habilidade.
            </p>
          </PremiumCard>

          <PremiumCard glowColor={tema.glow} className={`p-8 rounded-2xl ${tema.bg} ${tema.border} backdrop-blur-md`}>
            <Coffee size={36} className={`${tema.icon} mb-4`} strokeWidth={1.5} />
            <h3 className={`text-2xl font-bold ${tema.text} mb-3 uppercase`} style={{ fontFamily: 'Cinzel, serif' }}>Três Formatos</h3>
            <p className="text-slate-300 leading-relaxed text-sm">
              Bebidas e lanches cabem no ritmo da cena. Refeições pedem dez minutos ou um descanso e oferecem efeitos mais duradouros.
            </p>
          </PremiumCard>

          <PremiumCard glowColor={tema.glow} className={`p-8 rounded-2xl ${tema.bg} ${tema.border} backdrop-blur-md`}>
            <CookingPot size={36} className={`${tema.icon} mb-4`} strokeWidth={1.5} />
            <h3 className={`text-2xl font-bold ${tema.text} mb-3 uppercase`} style={{ fontFamily: 'Cinzel, serif' }}>Cardápio</h3>
            <p className="text-slate-300 leading-relaxed text-sm">
              Você começa com três pratos e escolhe outros entre vinte receitas reais. Todas as receitas conhecidas melhoram automaticamente com o nível de Chef.
            </p>
          </PremiumCard>
        </div>

        <DetalhesClasse classe={classe} />
      </div>
    </div>
  );
};

export default Cozinheiro;
