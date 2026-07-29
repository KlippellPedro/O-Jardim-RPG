import React, { useState, useEffect } from 'react';
import { FichaModal } from './FichaModal';

interface ModalVantagensPericiaProps {
  isOpen: boolean;
  onClose: () => void;
  periciaNome: string;
  initialVantagens: number;
  initialDesvantagens: number;
  onApply: (vantagens: number, desvantagens: number) => void;
  onClear: () => void;
}

export const ModalVantagensPericia: React.FC<ModalVantagensPericiaProps> = ({
  isOpen,
  onClose,
  periciaNome,
  initialVantagens,
  initialDesvantagens,
  onApply,
  onClear
}) => {
  const [vantagens, setVantagens] = useState(0);
  const [desvantagens, setDesvantagens] = useState(0);

  useEffect(() => {
    if (isOpen) {
      setVantagens(initialVantagens);
      setDesvantagens(initialDesvantagens);
    }
  }, [isOpen, initialVantagens, initialDesvantagens]);

  const saldo = vantagens - desvantagens;
  
  let resumoTitulo = 'Rolagem normal';
  let resumoDescricao = 'Role 1d20 e some o seu bônus.';
  let bgColor = 'bg-white/5 border-white/10';
  let titleColor = 'text-white';

  if (saldo > 0) {
    resumoTitulo = `Vantagem +${saldo}`;
    resumoDescricao = `Fontes: ${vantagens}V − ${desvantagens}D = V +${saldo}. Role 2d20, use o MAIOR resultado.`;
    bgColor = 'bg-green-900/20 border-green-500/30';
    titleColor = 'text-green-400';
  } else if (saldo < 0) {
    resumoTitulo = `Desvantagem +${Math.abs(saldo)}`;
    resumoDescricao = `Fontes: ${vantagens}V − ${desvantagens}D = D +${Math.abs(saldo)}. Role 2d20, use o MENOR resultado.`;
    bgColor = 'bg-red-900/20 border-red-500/30';
    titleColor = 'text-red-400';
  } else if (vantagens > 0 || desvantagens > 0) {
    resumoTitulo = 'Fontes neutralizadas';
    resumoDescricao = `Fontes: ${vantagens}V − ${desvantagens}D: as fontes se anulam. Role 1d20.`;
  }

  const handleApply = () => {
    onApply(vantagens, desvantagens);
    onClose();
  };

  const handleClear = () => {
    onClear();
    onClose();
  };

  return (
    <FichaModal
      isOpen={isOpen}
      onClose={onClose}
      title={`VANTAGENS E DESVANTAGENS: ${periciaNome.toUpperCase()}`}
    >
      <div className="space-y-6">
        <p className="text-gray-400 text-sm">
          As fontes se anulam uma a uma. O saldo define se a rolagem tem vantagem, desvantagem ou fica neutra.
        </p>

        <div className="flex gap-4">
          <div className="flex-1 bg-[#121118] border border-green-500/20 rounded-xl p-4">
            <h4 className="text-white font-bold mb-4">Vantagens</h4>
            <div className="flex items-center justify-between">
              <button 
                onClick={() => setVantagens(Math.max(0, vantagens - 1))}
                className="w-10 h-10 rounded bg-[#1a1924] border border-white/10 text-yellow-600 hover:text-white flex items-center justify-center text-xl"
              >
                -
              </button>
              <span className="text-2xl font-bold text-white font-mono">{vantagens}</span>
              <button 
                onClick={() => setVantagens(Math.min(20, vantagens + 1))}
                className="w-10 h-10 rounded bg-[#1a1924] border border-white/10 text-yellow-600 hover:text-white flex items-center justify-center text-xl"
              >
                +
              </button>
            </div>
          </div>

          <div className="flex-1 bg-[#121118] border border-red-500/20 rounded-xl p-4">
            <h4 className="text-white font-bold mb-4">Desvantagens</h4>
            <div className="flex items-center justify-between">
              <button 
                onClick={() => setDesvantagens(Math.max(0, desvantagens - 1))}
                className="w-10 h-10 rounded bg-[#1a1924] border border-white/10 text-yellow-600 hover:text-white flex items-center justify-center text-xl"
              >
                -
              </button>
              <span className="text-2xl font-bold text-white font-mono">{desvantagens}</span>
              <button 
                onClick={() => setDesvantagens(Math.min(20, desvantagens + 1))}
                className="w-10 h-10 rounded bg-[#1a1924] border border-white/10 text-yellow-600 hover:text-white flex items-center justify-center text-xl"
              >
                +
              </button>
            </div>
          </div>
        </div>

        <div className={`border rounded-xl p-4 ${bgColor}`}>
          <h4 className={`text-lg font-bold mb-2 ${titleColor}`}>{resumoTitulo}</h4>
          <p className="text-gray-400 text-sm">{resumoDescricao}</p>
        </div>

        <div className="flex justify-end gap-3 pt-4 border-t border-white/5">
          <button 
            onClick={handleClear}
            className="px-6 py-3 rounded-md bg-[#1a1924] border border-white/5 text-gray-400 hover:text-white text-sm font-bold uppercase tracking-wider transition-colors"
          >
            Zerar
          </button>
          <button 
            onClick={onClose}
            className="px-6 py-3 rounded-md bg-[#1a1924] border border-white/5 text-gray-400 hover:text-white text-sm font-bold uppercase tracking-wider transition-colors"
          >
            Cancelar
          </button>
          <button 
            onClick={handleApply}
            className="px-6 py-3 rounded-md bg-[#c7a44c]/10 border border-[#c7a44c]/30 text-[#c7a44c] hover:bg-[#c7a44c]/20 text-sm font-bold uppercase tracking-wider transition-colors"
          >
            Aplicar Saldo
          </button>
        </div>
      </div>
    </FichaModal>
  );
};
