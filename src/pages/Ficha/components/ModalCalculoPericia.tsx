import React from 'react';
import { FichaModal } from './FichaModal';

interface ModalCalculoPericiaProps {
  isOpen: boolean;
  onClose: () => void;
  periciaNome: string;
  atributoNome: string;
  atributoValor: number;
  modificador: number;
  nivel: number;
  metadeNivel: number;
  grauNome: string;
  bonusGrau: number;
  bonusRacial?: number;
  bonusOutros?: number;
  penalidadeEquipamento?: number;
  penalidadeCansaco?: number;
  desvantagensAutomaticas?: number;
  total: number;
  descricao?: string;
}

export const ModalCalculoPericia: React.FC<ModalCalculoPericiaProps> = ({
  isOpen,
  onClose,
  periciaNome,
  atributoNome,
  atributoValor,
  modificador,
  nivel,
  metadeNivel,
  grauNome,
  bonusGrau,
  bonusRacial = 0,
  bonusOutros = 0,
  penalidadeEquipamento = 0,
  penalidadeCansaco = 0,
  desvantagensAutomaticas = 0,
  total,
  descricao
}) => {
  return (
    <FichaModal
      isOpen={isOpen}
      onClose={onClose}
      title={`CÁLCULO DE PERÍCIA: ${periciaNome.toUpperCase()}`}
    >
      <div className="space-y-6">
        <p className="text-gray-400 text-sm italic">
          {descricao || `Teste baseado em ${atributoNome}.`}
        </p>

        <div className="space-y-2">
          <div className="flex justify-between items-center bg-[#121118] border border-white/5 rounded-lg p-3">
            <span className="text-gray-400 text-sm">{atributoNome} {atributoValor} · modificador</span>
            <span className="text-white font-mono">{modificador >= 0 ? `+${modificador}` : modificador}</span>
          </div>

          {desvantagensAutomaticas > 0 && (
            <div className="flex justify-between items-center bg-red-500/5 border border-red-500/15 rounded-lg p-3">
              <span className="text-gray-400 text-sm">Cansaço e sobrecarga</span>
              <span className="text-red-300 font-mono">{desvantagensAutomaticas} desvantagem(ns)</span>
            </div>
          )}

          {bonusRacial !== 0 && (
            <div className="flex justify-between items-center bg-[#121118] border border-emerald-500/10 rounded-lg p-3">
              <span className="text-gray-400 text-sm">Ajuste racial</span>
              <span className="text-emerald-300 font-mono">{bonusRacial >= 0 ? '+' : ''}{bonusRacial}</span>
            </div>
          )}

          {bonusOutros !== 0 && (
            <div className="flex justify-between items-center bg-[#121118] border border-sky-500/10 rounded-lg p-3">
              <span className="text-gray-400 text-sm">Origem e outros ajustes</span>
              <span className={bonusOutros > 0 ? 'text-sky-300 font-mono' : 'text-red-300 font-mono'}>{bonusOutros >= 0 ? '+' : ''}{bonusOutros}</span>
            </div>
          )}

          {penalidadeEquipamento !== 0 && (
            <div className="flex justify-between items-center bg-red-500/5 border border-red-500/15 rounded-lg p-3">
              <span className="text-gray-400 text-sm">Penalidade de armadura</span>
              <span className="text-red-300 font-mono">-{Math.abs(penalidadeEquipamento)}</span>
            </div>
          )}

          {penalidadeCansaco !== 0 && (
            <div className="flex justify-between items-center bg-red-500/5 border border-red-500/15 rounded-lg p-3">
              <span className="text-gray-400 text-sm">Cansaço</span>
              <span className="text-red-300 font-mono">{penalidadeCansaco}</span>
            </div>
          )}

          <div className="flex justify-between items-center bg-[#121118] border border-white/5 rounded-lg p-3">
            <span className="text-gray-400 text-sm">Metade do nível {nivel}</span>
            <span className="text-white font-mono">+{metadeNivel}</span>
          </div>

          <div className="flex justify-between items-center bg-[#121118] border border-white/5 rounded-lg p-3">
            <span className="text-gray-400 text-sm">Grau {grauNome}</span>
            <span className="text-white font-mono">+{bonusGrau}</span>
          </div>
        </div>

        <div className="flex justify-between items-center pt-4 border-t border-white/10">
          <span className="text-white font-bold tracking-widest uppercase">Total</span>
          <span className="text-2xl font-bold text-[#c7a44c]">{total >= 0 ? `+${total}` : total}</span>
        </div>
      </div>
    </FichaModal>
  );
};
