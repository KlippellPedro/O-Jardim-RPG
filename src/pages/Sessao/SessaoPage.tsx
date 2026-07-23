import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { DiceRoller3D } from './DiceRoller3D';
import { InitiativeTracker } from './InitiativeTracker';
import { useSessaoStore } from '../../store/useSessaoStore';
import { useAuthStore } from '../../store/useAuthStore';

export const SessaoPage: React.FC = () => {
  const [isRolling, setIsRolling] = useState(false);
  const { adicionarRolagem } = useSessaoStore();
  const { usuario } = useAuthStore();

  const handleRequestRoll = () => {
    // Ativa a trigger para o Canvas disparar um dado
    setIsRolling(true);
    // Volta pra false rápido pra permitir próximos cliques
    setTimeout(() => setIsRolling(false), 50);
  };

  const handleRollComplete = (resultado: number) => {
    // Registra no histórico do tracker
    adicionarRolagem({
      ator: usuario?.nome_exibicao || 'Jogador',
      formula: '1d20',
      resultado_total: resultado,
      dados: [resultado],
      isCritico: resultado === 20,
      isDesastre: resultado === 1
    });
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="absolute inset-0 z-10 overflow-hidden"
    >
      {/* 
        A área inteira pode ser clicada para rolar se o usuário quiser, 
        mas vamos deixar isso focado no botão do Tracker para não ser acidental.
        Porém, a área renderiza o Canvas 3D por trás de tudo.
      */}
      <DiceRoller3D isRolling={isRolling} onRollComplete={handleRollComplete} />

      <InitiativeTracker onRequestRoll={handleRequestRoll} />
      
      {/* HUD central inferior (opcional para o futuro: atalhos rápidos) */}
      <div className="absolute bottom-10 left-1/2 -translate-x-1/2 flex gap-4 pointer-events-none">
        <div className="bg-black/50 backdrop-blur-md px-6 py-2 rounded-full border border-white/10 text-white/50 text-sm">
          Painel de Combate Ativo
        </div>
      </div>
    </motion.div>
  );
};
