import React from 'react';
import { motion } from 'framer-motion';
import { ShoppingCart, Heart, Eye, Wrench, CircleGauge } from 'lucide-react';
import { LojaItem, NOMES_LOCAIS_LOJA, classeTextoRaridade, getCurrencySymbol, itemPermiteEscolherRaridade } from '../../../services/lojaCatalogService';
import { itemLojaContaComoEspecial } from '../../../services/itensEspeciaisService';
import { obterRegraRaridade } from '../../../../data/regras/raridadesEquipamentos';

interface ItemCardProps {
  item: LojaItem;
  onBuy: (item: LojaItem) => void;
  onView: (item: LojaItem) => void;
  podeComprar: boolean;
  isWishlisted?: boolean;
  onToggleWishlist?: (item: LojaItem) => void;
}

export const ItemCard: React.FC<ItemCardProps> = React.memo(function ItemCard({ item, onBuy, onView, podeComprar, isWishlisted, onToggleWishlist }) {
  const isModificacao = item.categoria === 'Modificações';
  // Mercenário tem dois preços (contratar/comprar); a escolha acontece no
  // modal de detalhes, não direto no card - mesmo padrão que Modificações já
  // usa pra escolher o alvo antes de ir pro carrinho.
  const isMercenario = item.categoria === 'Mercenários';
  const escolheRaridade = itemPermiteEscolherRaridade(item);
  const exigeEscolhaNoModal = isModificacao || isMercenario || escolheRaridade;
  const grupoEspecial = itemLojaContaComoEspecial(item);
  // 'Desconhecida' fica no patamar mais alto da loja (mapNivelLoja), então usa
  // o orçamento de Relíquia da Criação em vez do fallback padrão (Comum).
  const regraRaridade = obterRegraRaridade(item.raridade === 'Desconhecida' ? 'reliquia da criacao' : item.raridade);
  const localMinimo = NOMES_LOCAIS_LOJA[Math.max(0, Math.min(3, item.nivelLoja - 1))];
  // Configura a cor de acordo com a raridade para o glow e as bordas
  const getRarityColor = () => {
    switch (item.raridade) {
      case 'Comum': return 'border-gray-500 shadow-[0_0_15px_rgba(107,114,128,0.2)] text-gray-300';
      case 'Incomum': return 'border-emerald-500/50 shadow-[0_0_15px_rgba(16,185,129,0.25)] text-emerald-300';
      case 'Raro': return 'border-blue-500/50 shadow-[0_0_15px_rgba(59,130,246,0.3)] text-blue-300';
      case 'Épico': return 'border-purple-500/50 shadow-[0_0_15px_rgba(168,85,247,0.35)] text-purple-300';
      case 'Lendário': return 'shadow-[0_0_20px_rgba(245,158,11,0.25)] border-amber-500/50 hover:border-amber-400 text-amber-300';
      case 'Mítico': return 'shadow-[0_0_20px_rgba(239,68,68,0.3)] border-red-500/60 hover:border-red-400 text-red-300';
      case 'Relíquia da Criação': return 'shadow-[0_0_30px_rgba(255,255,255,0.3)] border-white/70 hover:shadow-[0_0_50px_rgba(165,243,252,0.4)] hover:border-cyan-100 text-white';
      case 'Desconhecida': return 'border-rose-500/60 shadow-[0_0_20px_rgba(244,63,94,0.25)] text-rose-300';
      default: return 'border-white/10 hover:border-white/20';
    }
  };

  const rarityColor = getRarityColor();
  const rarityBadgeColor = (() => {
    switch (item.raridade) {
      case 'Incomum': return 'border-emerald-500/50 bg-emerald-500/10';
      case 'Raro': return 'border-blue-500/50 bg-blue-500/10';
      case 'Épico': return 'border-purple-500/50 bg-purple-500/10';
      case 'Lendário': return 'border-amber-500/50 bg-amber-500/10';
      case 'Mítico': return 'border-red-500/60 bg-red-500/10';
      case 'Relíquia da Criação': return 'border-white/70 bg-white/5';
      case 'Desconhecida': return 'border-rose-500/60 bg-rose-500/10';
      case 'Comum':
      default: return 'border-slate-500/40 bg-slate-500/10';
    }
  })();
  const isSpecial = ['Raro', 'Épico', 'Lendário', 'Mítico'].includes(item.raridade);

  return (
    <motion.div
      layout
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9 }}
      transition={{ duration: 0.3 }}
      data-tour="loja-item"
      className={`content-auto-list-item performance-expensive-effects relative group flex h-full flex-col overflow-hidden rounded-2xl border bg-[#0b0a12]/88 backdrop-blur-md transition-all hover:-translate-y-1 ${rarityColor}`}
    >
      {item.raridade === 'Relíquia da Criação' && (
        <div className="absolute inset-0 bg-gradient-to-br from-cyan-300/10 via-white/10 to-fuchsia-300/10 pointer-events-none rounded-3xl mix-blend-screen animate-pulse" />
      )}
      {item.promocao ? (
        <div className="relative z-[1] flex items-center justify-between gap-3 border-b border-rose-400/30 bg-gradient-to-r from-rose-600/30 to-orange-500/10 px-4 py-2 text-[9px] font-black uppercase tracking-[0.2em] text-rose-200">
          <span>{item.promocao.rotulo}</span>
          <span className="rounded-full bg-rose-500 px-2 py-1 text-white">-{item.promocao.descontoPercentual}%</span>
        </div>
      ) : null}
      {/* HEADER DO CARD */}
      <div className="relative border-b border-white/5 p-4 pb-3 sm:p-5 sm:pb-4">
        {/* WISHLIST BTN */}
        {onToggleWishlist && (
          <button 
            type="button"
            onClick={(e) => { e.stopPropagation(); onToggleWishlist(item); }}
            aria-label={isWishlisted ? `Remover ${item.nome} da lista de desejos` : `Adicionar ${item.nome} à lista de desejos`}
            className={`absolute right-4 top-4 z-10 rounded-full border p-2 shadow-lg backdrop-blur-md transition-all hover:scale-105 ${
              isWishlisted 
                ? 'bg-red-500/20 text-red-500 border-red-500/50 shadow-[0_0_15px_rgba(239,68,68,0.4)]' 
                : 'bg-black/50 text-gray-500 border-white/10 hover:text-red-400 hover:border-red-400/50'
            }`}
          >
            <Heart size={16} fill={isWishlisted ? 'currentColor' : 'none'} />
          </button>
        )}

        <div className="mb-3 flex flex-col pr-10">
          <span className="mb-1 text-[9px] font-black uppercase tracking-[0.18em] text-gray-600">Disponível em {localMinimo}</span>
          <h3 className="text-lg font-bold tracking-wide text-white" style={{ fontFamily: 'Cinzel, serif' }}>
            {item.nome}
          </h3>
        </div>
        <div className="mb-3 flex flex-wrap items-center gap-1.5">
          <span className={`shrink-0 whitespace-nowrap text-[10px] uppercase tracking-widest font-bold px-2 py-1 rounded-md border ${rarityBadgeColor} ${classeTextoRaridade(item.raridade)}`}>
            {escolheRaridade ? `${item.raridade} · escolha na compra` : item.raridade}
          </span>
          <span className="shrink-0 whitespace-nowrap text-[10px] uppercase tracking-widest font-bold px-2 py-1 bg-white/5 border border-white/10 rounded-md text-gray-400">
            {item.categoria}
          </span>
          {item.dadosBrutos?.subtipo && (
            <span className={`shrink-0 whitespace-nowrap text-[10px] uppercase tracking-widest font-bold px-2 py-1 rounded-md border ${
              isSpecial
                ? 'bg-yellow-500/10 border-yellow-500/50 text-yellow-300'
                : 'bg-white/5 border-white/10 text-gray-400'
            }`}>
              {item.dadosBrutos.subtipo}
            </span>
          )}
        </div>
        
        <p className="line-clamp-2 flex-1 text-sm leading-6 text-gray-400">
          {item.descricao}
        </p>
        <div className="mt-3 flex flex-wrap gap-1.5">
          {grupoEspecial ? <span className="inline-flex items-center gap-1 rounded-md border border-cyan-400/15 bg-cyan-400/[0.06] px-2 py-1 text-[9px] font-bold text-cyan-200/70"><CircleGauge size={11} /> usa 1 vaga ao equipar</span> : null}
          {['Armas', 'Armaduras', 'Escudos'].includes(item.categoria) ? <span className="inline-flex items-center gap-1 rounded-md border border-amber-400/15 bg-amber-400/[0.05] px-2 py-1 text-[9px] font-bold text-amber-200/65"><Wrench size={11} /> até {regraRaridade.modificacoesMaximas} mod(s)</span> : null}
          {isModificacao ? <span className="inline-flex items-center gap-1 rounded-md border border-violet-400/15 bg-violet-400/[0.05] px-2 py-1 text-[9px] font-bold text-violet-200/65"><Wrench size={11} /> exige item compatível</span> : null}
        </div>
      </div>

      <div className="mt-auto flex items-end justify-between gap-4 p-4 sm:p-5">
        <div>
          <span className="mb-1 block text-[9px] font-bold uppercase tracking-widest text-gray-600">
            {isMercenario ? 'Contratar a partir de' : escolheRaridade ? 'A partir de' : 'Preço'}
          </span>
          {item.precoAnterior ? (
            <span className="mb-0.5 block text-xs font-bold text-gray-500 line-through">
              {item.precoAnterior.toLocaleString('pt-BR')} {getCurrencySymbol(item.moedaPreco)}
            </span>
          ) : null}
          {(() => {
            const precoExibido = isMercenario && item.contratacao ? item.contratacao : { valorOriginal: item.valorOriginal, moedaPreco: item.moedaPreco };
            return (
              <span className={`flex items-center gap-1 text-xl font-bold ${precoExibido.moedaPreco === 'Solares' ? 'text-yellow-400' : precoExibido.moedaPreco === 'Lunaris' ? 'text-gray-200' : precoExibido.moedaPreco === 'Fragmentos de Estrela' ? 'text-fuchsia-400' : 'text-indigo-400'}`}>
                {precoExibido.valorOriginal.toLocaleString('pt-BR')}
                <span className="text-xs">{getCurrencySymbol(precoExibido.moedaPreco)}</span>
              </span>
            );
          })()}
          {isMercenario && item.mensalidade ? (
            <span className="mt-0.5 block text-[11px] font-bold text-gray-500">
              + {item.mensalidade.valorOriginal.toLocaleString('pt-BR')} {getCurrencySymbol(item.mensalidade.moedaPreco)}/mês
            </span>
          ) : null}
        </div>

        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => onView(item)}
            aria-label={`Ver detalhes de ${item.nome}`}
            data-sfx="off"
            className="flex items-center justify-center rounded-xl border border-white/10 bg-white/5 p-2.5 text-gray-300 transition-all hover:border-white/30 hover:bg-white/10 hover:text-white"
          >
            <Eye size={20} />
          </button>
          <button
            type="button"
            onClick={() => (exigeEscolhaNoModal ? onView(item) : onBuy(item))}
            disabled={!podeComprar}
            title={isModificacao ? 'Escolher item para instalar a modificação' : isMercenario ? 'Escolher contratar ou comprar' : escolheRaridade ? 'Escolher a raridade' : 'Adicionar ao carrinho'}
            aria-label={isModificacao ? `Escolher item para instalar ${item.nome}` : isMercenario ? `Escolher contratar ou comprar ${item.nome}` : escolheRaridade ? `Escolher a raridade de ${item.nome}` : `Adicionar ${item.nome} ao carrinho`}
            className={`relative flex items-center justify-center rounded-xl p-2.5 shadow-lg transition-all ${
              podeComprar
                ? 'bg-[#c7a44c] hover:bg-yellow-400 text-black hover:scale-110'
                : 'bg-gray-800 text-gray-500 cursor-not-allowed'
            }`}
          >
            <ShoppingCart size={20} />
          </button>
        </div>
      </div>
    </motion.div>
  );
});
