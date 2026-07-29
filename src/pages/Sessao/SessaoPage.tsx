import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { ActiveTurnCard } from './components/ActiveTurnCard';
import { InitiativeTracker } from './InitiativeTracker';
import { SessionLogPanel } from './components/SessionLogPanel';
import { useSessaoStore } from '../../store/useSessaoStore';
import { useAuthStore } from '../../store/useAuthStore';

export const SessaoPage: React.FC = () => {
  const [isRollDisabled, setIsRollDisabled] = useState(false);
  const { rolarDados, conectarSSE, desconectarSSE, turnoAtualIndex, emCombate, rodada, iniciativa } = useSessaoStore();
  const { campanhaAtiva } = useAuthStore();
  
  const activeCampaignId = campanhaAtiva?.id;

  useEffect(() => {
    if (activeCampaignId) {
      conectarSSE(activeCampaignId);
      return () => desconectarSSE();
    }
  }, [activeCampaignId, conectarSSE, desconectarSSE]);

  if (!activeCampaignId) {
    return (
      <div className="absolute inset-0 flex items-center justify-center bg-[#050508] text-white">
        <h2>Por favor, selecione uma campanha ativa para acessar a sessão.</h2>
      </div>
    );
  }

  const handleRequestRoll = async (formula: string = '1d20', titulo: string = 'Rolagem manual') => {
    if (isRollDisabled) return;
    setIsRollDisabled(true);
    try {
      // Faz a request real pro backend
      await rolarDados({
        titulo: titulo,
        formula: formula
      });
    } catch {
      // Erro já é tratado internamente pelo useSessaoStore; aqui apenas garantimos
      // que o botão seja reabilitado independentemente do resultado.
    } finally {
      setTimeout(() => setIsRollDisabled(false), 500);
    }
  };

  const nomeAtivo = iniciativa[turnoAtualIndex]?.nome;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="absolute inset-0 z-10 overflow-hidden bg-[#050508]"
    >
      {/* Background de Mesa Virtual (Sem Grid, Iluminação Suave no Centro) */}
      <div className="absolute inset-0 z-0 bg-[#050508]" />
      <div className="absolute inset-0 z-0 bg-[radial-gradient(circle_at_center,_rgba(199,164,76,0.15)_0%,_transparent_60%)] pointer-events-none" />

      {/* Topo Central: Indicador de Cena */}
      <div className="absolute top-8 left-1/2 -translate-x-1/2 z-20 pointer-events-none">
        <div className="bg-[#0f0e15]/90 backdrop-blur-md border border-[#c7a44c]/30 px-8 py-3 rounded-full shadow-[0_0_30px_rgba(199,164,76,0.15)]">
          <span className="text-[#c7a44c] font-bold uppercase tracking-widest text-sm">
            {emCombate
              ? `Rodada ${rodada}${nomeAtivo ? ` • Turno de ${nomeAtivo}` : ''}`
              : 'Fora de Combate'}
          </span>
        </div>
      </div>
      
      {/* Painel Esquerdo: Histórico de Rolagens */}
      <SessionLogPanel />

      {/* Centro: Foco no Turno Ativo */}
      <ActiveTurnCard onRequestRoll={handleRequestRoll} />

      {/* Painel Direito: Tracker de Iniciativa */}
      <InitiativeTracker onRequestRoll={handleRequestRoll} isRollDisabled={isRollDisabled} />
    </motion.div>
  );
};
