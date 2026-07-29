import React from 'react';
import { FichaModal } from './FichaModal';

interface ModalInfoFichaProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  description: string;
  items: { label: string; value: string | number; color?: string }[];
  total?: { label: string; value: string | number; color?: string };
}

export const ModalInfoFicha: React.FC<ModalInfoFichaProps> = ({
  isOpen,
  onClose,
  title,
  description,
  items,
  total
}) => {
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

        {items.length > 0 && (
          <div className="space-y-2">
            {items.map((item, idx) => {
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
      </div>
    </FichaModal>
  );
};
