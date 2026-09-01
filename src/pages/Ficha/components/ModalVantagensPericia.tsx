import React, { useState, useEffect } from 'react';
import { FichaModal } from './FichaModal';

interface ModalVantagensPericiaProps {
  isOpen: boolean;
  onClose: () => void;
  periciaNome: string;
  initialVantagens: number;
  initialDesvantagens: number;
  vantagensAutomaticas?: number;
  desvantagensAutomaticas?: number;
  onApply: (vantagens: number, desvantagens: number) => void;
  onClear: () => void;
}

export const ModalVantagensPericia: React.FC<ModalVantagensPericiaProps> = ({
  isOpen,
  onClose,
  periciaNome,
  initialVantagens,
  initialDesvantagens,
  vantagensAutomaticas = 0,
  desvantagensAutomaticas = 0,
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

  const vantagensTotais = vantagens + vantagensAutomaticas;
  const desvantagensTotais = desvantagens + desvantagensAutomaticas;
  const saldo = vantagensTotais - desvantagensTotais;
  
  let resumoTitulo = 'Rolagem normal';
  let resumoDescricao = 'Role 1d20 e some o seu bônus.';
  let bgColor = 'bg-white/5 border-white/10';
  let titleColor = 'text-white';

  if (saldo > 0) {
    resumoTitulo = `Vantagem +${saldo}`;
    resumoDescricao = `Fontes: ${vantagensTotais}V − ${desvantagensTotais}D = V +${saldo}. Role 2d20, use o MAIOR resultado.`;
    bgColor = 'bg-green-900/20 border-green-500/30';
    titleColor = 'text-green-400';
  } else if (saldo < 0) {
    resumoTitulo = `Desvantagem +${Math.abs(saldo)}`;
    resumoDescricao = `Fontes: ${vantagensTotais}V − ${desvantagensTotais}D = D +${Math.abs(saldo)}. Role 2d20, use o MENOR resultado.`;
    bgColor = 'bg-red-900/20 border-red-500/30';
    titleColor = 'text-red-400';
  } else if (vantagensTotais > 0 || desvantagensTotais > 0) {
    resumoTitulo = 'Fontes neutralizadas';
    resumoDescricao = `Fontes: ${vantagensTotais}V − ${desvantagensTotais}D: as fontes se anulam. Role 1d20.`;
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

        {(vantagensAutomaticas > 0 || desvantagensAutomaticas > 0) && (
          <div className="rounded-xl border border-[#c7a44c]/20 bg-[#c7a44c]/5 p-4">
            <div className="flex items-center justify-between gap-3">
              <span className="text-sm font-bold text-[#c7a44c]">Fontes automáticas</span>
              <span className="font-mono text-sm font-bold text-white">
                {vantagensAutomaticas}V / {desvantagensAutomaticas}D
              </span>
            </div>
            <p className="mt-1 text-xs text-gray-500">
              Vêm de itens, poderes, habilidades ou condições da ficha e já entram na rolagem. Para removê-las, altere a fonte que concede o efeito.
            </p>
          </div>
        )}

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="min-w-0 bg-[#121118] border border-green-500/20 rounded-xl p-4">
            <h4 className="text-white font-bold mb-4">Vantagens manuais</h4>
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

          <div className="min-w-0 bg-[#121118] border border-red-500/20 rounded-xl p-4">
            <h4 className="text-white font-bold mb-4">Desvantagens manuais</h4>
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

        <div className="grid grid-cols-2 gap-3 border-t border-white/5 pt-4 sm:grid-cols-[1fr_auto_auto]">
          <button 
            onClick={handleClear}
            className="min-h-12 whitespace-nowrap rounded-md border border-white/5 bg-[#1a1924] px-4 py-3 text-xs font-bold uppercase tracking-wider text-gray-400 transition-colors hover:border-white/15 hover:text-white sm:px-5 sm:text-sm"
          >
            Zerar manuais
          </button>
          <button 
            onClick={onClose}
            className="min-h-12 whitespace-nowrap rounded-md border border-white/5 bg-[#1a1924] px-4 py-3 text-xs font-bold uppercase tracking-wider text-gray-400 transition-colors hover:border-white/15 hover:text-white sm:px-5 sm:text-sm"
          >
            Cancelar
          </button>
          <button 
            onClick={handleApply}
            className="col-span-2 min-h-12 whitespace-nowrap rounded-md border border-[#c7a44c]/30 bg-[#c7a44c]/10 px-5 py-3 text-sm font-bold uppercase tracking-wider text-[#c7a44c] transition-all hover:bg-[#c7a44c]/20 hover:shadow-[0_0_18px_rgba(199,164,76,0.14)] sm:col-auto"
          >
            Aplicar Saldo
          </button>
        </div>
      </div>
    </FichaModal>
  );
};
