import React from 'react';
import { Dices } from 'lucide-react';
import { FichaModal } from './FichaModal';

interface ModalInfoFichaProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  description: string;
  items: { label: string; value: string | number; color?: string }[];
  total?: { label: string; value: string | number; color?: string };
  /** Quando presente, mostra um botão "Rolar" no rodapé - usado pelo teste
   * de atributo (AbaFicha), pra não precisar de um card fixo só pra isso. */
  onRolar?: () => void;
  rolando?: boolean;
  resultado?: number | null;
}

export const ModalInfoFicha: React.FC<ModalInfoFichaProps> = ({
  isOpen,
  onClose,
  title,
  description,
  items,
  total,
  onRolar,
  rolando,
  resultado,
}) => {
  const visibleItems = items.filter((item) => {
    if (typeof item.value === 'number') return Number.isFinite(item.value) && item.value !== 0;
    const value = String(item.value ?? '').trim().toLocaleLowerCase('pt-BR');
    return Boolean(value)
      && !['0', '+0', '-0'].includes(value)
      && !value.startsWith('sem ');
  });

  return (
    <FichaModal
      isOpen={isOpen}
      onClose={onClose}
      title={title}
    >
      <div className="space-y-6">
        <p className="text-gray-400 text-sm italic">
          {description}
        </p>

        {visibleItems.length > 0 && (
          <div className="space-y-2">
            {visibleItems.map((item, idx) => {
              const isLongText = typeof item.value === 'string' && item.value.length > 15;
              return (
                <div key={idx} className={`flex ${isLongText ? 'flex-col gap-1 items-start' : 'justify-between items-center'} bg-[#121118] border border-white/5 rounded-lg p-3`}>
                  <span className="text-[#c7a44c] font-bold text-xs uppercase tracking-wider">{item.label}</span>
                  <span className={`${isLongText ? 'text-gray-300 text-sm mt-1 leading-relaxed' : 'font-mono font-bold text-right'} ${item.color || (isLongText ? '' : 'text-white')}`}>
                    {item.value}
                  </span>
                </div>
              );
            })}
          </div>
        )}

        {total && (
          <div className="flex justify-between items-center pt-4 border-t border-white/10">
            <span className="text-white font-bold tracking-widest uppercase">{total.label}</span>
            <span className={`text-2xl font-bold ${total.color || 'text-[#c7a44c]'}`}>
              {total.value}
            </span>
          </div>
        )}

        {onRolar && (
          <div className="pt-4 border-t border-white/10 space-y-3">
            <button
              onClick={onRolar}
              disabled={rolando}
              className="w-full px-6 py-3 rounded-md border border-[#c7a44c]/30 text-[#c7a44c] hover:bg-[#c7a44c]/10 font-bold text-sm flex items-center justify-center gap-2 disabled:opacity-50 transition-colors"
            >
              <Dices size={16} /> {rolando ? 'Rolando...' : 'Rolar Teste'}
            </button>
            {resultado != null && (
              <div className="bg-black/30 border border-[#c7a44c]/20 rounded-lg p-4 flex items-center justify-between">
                <span className="text-sm text-gray-400">Resultado</span>
                <span className="text-2xl font-bold text-[#c7a44c]">{resultado}</span>
              </div>
            )}
          </div>
        )}
      </div>
    </FichaModal>
  );
};
