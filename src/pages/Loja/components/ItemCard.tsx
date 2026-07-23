import React from 'react';
import { motion } from 'framer-motion';
import { LojaItem } from '../../../data/lojaCatalog';
import { ShoppingCart } from 'lucide-react';

interface ItemCardProps {
  item: LojaItem;
  onBuy: (item: LojaItem) => void;
  podeComprar: boolean;
}

export const ItemCard: React.FC<ItemCardProps> = ({ item, onBuy, podeComprar }) => {
  // Configura a cor de acordo com a raridade para o glow e as bordas
  const getRarityColor = () => {
    switch (item.raridade) {
      case 'Comum': return 'border-gray-500 shadow-gray-500/20';
      case 'Incomum': return 'border-blue-400 shadow-blue-400/30';
      case 'Raro': return 'border-purple-500 shadow-purple-500/40';
      case 'Épico': return 'border-yellow-400 shadow-yellow-400/50';
      default: return 'border-white/20';
    }
  };

  const rarityColor = getRarityColor();

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.9 }}
      whileHover={{ scale: 1.02 }}
      className={`relative flex flex-col justify-between bg-[#0b0a12]/80 backdrop-blur-md border ${rarityColor} rounded-2xl p-6 transition-all hover:shadow-[0_0_25px_rgba(255,255,255,0.1)]`}
    >
      <div>
        <div className="flex justify-between items-start mb-3">
          <h3 className="text-xl font-bold text-white tracking-wide" style={{ fontFamily: 'Cinzel, serif' }}>
            {item.nome}
          </h3>
          <span className="text-xs uppercase tracking-widest font-bold text-gray-400 bg-white/10 px-2 py-1 rounded-md">
            {item.raridade}
          </span>
        </div>
        
        <p className="text-sm text-gray-400 mb-4 h-16 overflow-hidden">
          {item.descricao}
        </p>

        {item.propriedades && (
          <div className="mb-6 p-3 bg-black/40 rounded-lg border border-white/5">
            <span className="text-xs text-primary block uppercase tracking-widest mb-1">
              Propriedades
            </span>
            <span className="text-sm text-gray-300 font-mono">
              {item.propriedades}
            </span>
          </div>
        )}
      </div>

      <div className="flex items-center justify-between pt-4 border-t border-white/10 mt-auto">
        <div className="flex items-baseline gap-1">
          <span className="text-2xl font-bold text-yellow-400">{item.precoPO}</span>
          <span className="text-xs text-yellow-400/70 font-bold tracking-widest">PO</span>
        </div>

        <button
          onClick={() => onBuy(item)}
          disabled={!podeComprar}
          className={`flex items-center gap-2 px-5 py-2 rounded-xl font-bold transition-all ${
            podeComprar 
              ? 'bg-primary text-black hover:bg-primary/80 shadow-[0_0_15px_rgba(var(--color-primary),0.4)] hover:shadow-[0_0_25px_rgba(var(--color-primary),0.6)]' 
              : 'bg-red-500/20 text-red-400 border border-red-500/50 cursor-not-allowed'
          }`}
        >
          <ShoppingCart size={18} />
          {podeComprar ? 'Comprar' : 'Sem Saldo'}
        </button>
      </div>
    </motion.div>
  );
};
