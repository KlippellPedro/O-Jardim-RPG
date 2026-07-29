import React from 'react';
import { motion } from 'framer-motion';
import { ShoppingCart, Zap, Heart, Eye } from 'lucide-react';
import { LojaItem, getCurrencySymbol } from '../../../data/lojaCatalog';

interface ItemCardProps {
  item: LojaItem;
  onBuy: (item: LojaItem) => void;
  onView: (item: LojaItem) => void;
  podeComprar: boolean;
  isWishlisted?: boolean;
  onToggleWishlist?: (item: LojaItem) => void;
}

export const ItemCard: React.FC<ItemCardProps> = ({ item, onBuy, onView, podeComprar, isWishlisted, onToggleWishlist }) => {
  // Configura a cor de acordo com a raridade para o glow e as bordas
  const getRarityColor = () => {
    switch (item.raridade) {
      case 'Comum': return 'border-gray-500 shadow-[0_0_15px_rgba(107,114,128,0.2)] text-gray-300';
      case 'Incomum': return 'border-blue-400 shadow-[0_0_15px_rgba(59,130,246,0.3)] text-blue-300';
      case 'Raro': return 'border-purple-500 shadow-[0_0_15px_rgba(168,85,247,0.4)] text-purple-300';
      case 'Épico': return 'border-yellow-400 shadow-[0_0_15px_rgba(234,179,8,0.5)] text-yellow-300';
      case 'Lendário': return 'shadow-[0_0_20px_rgba(249,115,22,0.2)] border-orange-500/40 hover:border-orange-500/60';
      case 'Relíquia': return 'shadow-[0_0_20px_rgba(239,68,68,0.25)] border-red-500/50 hover:border-red-500/70';
      case 'Relíquia da Criação': return 'shadow-[0_0_30px_rgba(232,121,249,0.4)] border-fuchsia-500/60 hover:shadow-[0_0_50px_rgba(232,121,249,0.6)] hover:border-fuchsia-400';
      default: return 'border-white/10 hover:border-white/20';
    }
  };

  const rarityColor = getRarityColor();
  const isSpecial = ['Raro', 'Épico', 'Lendário', 'Relíquia'].includes(item.raridade);

  return (
    <motion.div
      layout
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9 }}
      transition={{ duration: 0.3 }}
      className={`relative group bg-[#0b0a12]/80 backdrop-blur-md rounded-3xl border flex flex-col h-full overflow-hidden transition-all hover:scale-[1.02] ${rarityColor}`}
    >
      {item.raridade === 'Relíquia da Criação' && (
        <div className="absolute inset-0 bg-gradient-to-br from-fuchsia-500/10 via-red-500/5 to-transparent pointer-events-none rounded-3xl mix-blend-screen animate-pulse" />
      )}
      {/* HEADER DO CARD */}
      <div className="p-6 pb-4 border-b border-white/5 relative">
        {/* WISHLIST BTN */}
        {onToggleWishlist && (
          <button 
            type="button"
            onClick={(e) => { e.stopPropagation(); onToggleWishlist(item); }}
            className={`absolute top-4 right-4 z-10 p-2 rounded-full transition-all hover:scale-110 shadow-lg backdrop-blur-md border ${
              isWishlisted 
                ? 'bg-red-500/20 text-red-500 border-red-500/50 shadow-[0_0_15px_rgba(239,68,68,0.4)]' 
                : 'bg-black/50 text-gray-500 border-white/10 hover:text-red-400 hover:border-red-400/50'
            }`}
          >
            <Heart size={16} fill={isWishlisted ? 'currentColor' : 'none'} />
          </button>
        )}

        <div className="flex flex-col mb-3 pr-10">
          <h3 className="text-xl font-bold text-white tracking-wide" style={{ fontFamily: 'Cinzel, serif' }}>
            {item.nome}
          </h3>
        </div>
        <div className="flex gap-2 items-center mb-4">
          <span className={`text-[10px] uppercase tracking-widest font-bold bg-white/5 px-2 py-1 rounded-md border ${rarityColor.split(' ')[0]}`}>
            {item.raridade}
          </span>
          <span className="text-[10px] uppercase tracking-widest font-bold px-2 py-1 bg-white/5 border border-white/10 rounded-md text-gray-400">
            {item.categoria}
          </span>
          {item.dadosBrutos?.subtipo && (
            <span className={`text-[10px] uppercase tracking-widest font-bold px-2 py-1 rounded-md border ${
              isSpecial 
                ? 'bg-yellow-500/10 border-yellow-500/50 text-yellow-300' 
                : 'bg-white/5 border-white/10 text-gray-400'
            }`}>
              {item.dadosBrutos.subtipo}
            </span>
          )}
        </div>
        
        <p className="text-gray-400 text-sm flex-1 leading-relaxed line-clamp-3">
          {item.descricao}
        </p>
      </div>

      <div className="p-6 pt-0 mt-auto flex justify-between items-end gap-4">
        <div>
          <span className="text-[10px] uppercase tracking-widest text-gray-500 font-bold mb-1 block">Preço</span>
          <span className={`text-2xl font-bold flex items-center gap-1 ${item.moedaPreco === 'Solares' ? 'text-yellow-400' : item.moedaPreco === 'Lunaris' ? 'text-gray-200' : item.moedaPreco === 'Fragmentos de Estrela' ? 'text-fuchsia-400' : 'text-indigo-400'}`}>
            {item.valorOriginal.toLocaleString('pt-BR')} <span className="text-xs">{getCurrencySymbol(item.moedaPreco)}</span>
          </span>
        </div>

        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => onView(item)}
            aria-label={`Ver detalhes de ${item.nome}`}
            className="flex items-center justify-center rounded-xl border border-white/10 bg-white/5 p-3 text-gray-300 transition-all hover:border-white/30 hover:bg-white/10 hover:text-white"
          >
            <Eye size={20} />
          </button>
          <button
            type="button"
            onClick={() => onBuy(item)}
            disabled={!podeComprar}
            title="Adicionar ao carrinho"
            aria-label={`Adicionar ${item.nome} ao carrinho`}
            className={`relative flex items-center justify-center p-3 rounded-xl transition-all shadow-lg ${
              podeComprar
                ? 'bg-[#c7a44c] hover:bg-yellow-400 text-black hover:scale-110'
                : 'bg-gray-800 text-gray-500 cursor-not-allowed'
            }`}
          >
            <ShoppingCart size={20} />
            <Zap size={12} className="absolute top-2 right-2 text-white/50" />
          </button>
        </div>
      </div>
    </motion.div>
  );
};
