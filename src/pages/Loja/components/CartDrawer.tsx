import React, { useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ShoppingCart, X, Plus, Minus, Trash2 } from 'lucide-react';
import { LojaItem, getCurrencySymbol, rotuloCategoriaItem, somarPrecosNativos } from '../../../services/lojaCatalogService';
import { COR_MOEDA } from './ItemCard';
import { MAX_SHOP_UNITS } from '../../../services/lojaApi';
import { useModalSfx } from '../../../hooks/useSfx';
import { useDialogAccessibility } from '../../../hooks/useDialogAccessibility';

export interface CartItem {
  item: LojaItem;
  quantidade: number;
  alvoItemId?: string;
  alvoItemNome?: string;
  /** Só em Mercenários: 'contratar' gera mensalidade, 'comprar'/ausente é o
   * servo/escravo permanente. `item.valorOriginal` já reflete o preço certo
   * pro modo escolhido - ver handleAddToCart em LojaPage. */
  modo?: 'comprar' | 'contratar';
}

/** Chave estável de agrupamento/identificação de uma linha do carrinho.
 * Contratar e comprar o mesmo item não se agrupam: são vínculos diferentes. */
export const cartItemKey = ({ item, alvoItemId, modo }: Pick<CartItem, 'item' | 'alvoItemId' | 'modo'>): string => (
  [item.id, alvoItemId, modo === 'contratar' ? 'contratar' : undefined, item.raridadeCompra].filter(Boolean).join('::')
);

interface CartDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  cart: CartItem[];
  onRemoveItem: (cartKey: string) => void;
  onUpdateQuantity: (cartKey: string, delta: number) => void;
  onCheckout: () => void;
  isVenda?: boolean;
  isProcessing?: boolean;
}

export const CartDrawer: React.FC<CartDrawerProps> = ({ 
  isOpen, onClose, cart, onUpdateQuantity, onRemoveItem, onCheckout, isVenda = false, isProcessing = false
}) => {
  const totais = somarPrecosNativos(cart);
  const dialogRef = useRef<HTMLDivElement>(null);
  const backdropRef = useRef<HTMLDivElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);

  useModalSfx(isOpen);
  useDialogAccessibility({ open: isOpen, dialogRef, backdropRef, initialFocusRef: closeButtonRef, onClose });

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            ref={backdropRef}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[90]"
          />
          <motion.div
            ref={dialogRef}
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="cart-drawer loja-gaveta settings-panel fixed bottom-0 right-0 top-0 z-[100] flex w-full max-w-md flex-col shadow-2xl"
            role="dialog"
            aria-modal="true"
            aria-labelledby="loja-cart-title"
          >
            {/* Header */}
            <div className="flex items-center justify-between border-b border-white/10 p-4 sm:p-6">
              <h2 id="loja-cart-title" className="loja-gaveta__titulo">
                <ShoppingCart size={20} />
                {isVenda ? 'Lote de venda' : 'Lote de compra'}
              </h2>
              <button ref={closeButtonRef} onClick={onClose} aria-label="Fechar carrinho" data-sfx="off" className="p-2 text-gray-500 hover:text-white hover:bg-white/10 rounded-full transition-colors">
                <X size={24} />
              </button>
            </div>

            {/* Items */}
            <div className="flex-1 space-y-4 overflow-y-auto p-4 custom-scrollbar sm:p-6">
              {cart.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-gray-500">
                  <ShoppingCart size={48} className="mb-4 opacity-20" />
                  <p className="text-sm font-bold">O lote está vazio</p>
                </div>
              ) : (
                cart.map((cartItem) => {
                  const { item, quantidade, alvoItemId, alvoItemNome, modo } = cartItem;
                  const cartKey = cartItemKey(cartItem);
                  return (
                  <div key={cartKey} className="loja-gaveta__item flex gap-4">
                    <div className="min-w-0 flex-1">
                      <div className="text-xs uppercase tracking-widest text-gray-500 mb-1">{rotuloCategoriaItem(item)}</div>
                      <h4 className="text-white font-bold mb-1">{item.nome}</h4>
                      {item.raridadeCompra ? (
                        <div className="mb-2 inline-block rounded-md border border-[#c7a44c]/25 bg-[#c7a44c]/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-widest text-[#dfc87f]">
                          {item.raridade}
                        </div>
                      ) : null}
                      {alvoItemNome && (
                        <div className="text-[10px] text-fuchsia-400 font-bold uppercase tracking-widest mb-2 border border-fuchsia-500/20 bg-fuchsia-900/20 px-2 py-0.5 rounded-md inline-block">
                          Para: {alvoItemNome}
                        </div>
                      )}
                      {modo === 'contratar' ? (
                        <div className="text-[10px] text-emerald-400 font-bold uppercase tracking-widest mb-2 border border-emerald-500/20 bg-emerald-900/20 px-2 py-0.5 rounded-md inline-block">
                          Contratação{item.mensalidade ? `: ${item.mensalidade.valorOriginal.toLocaleString('pt-BR')} ${getCurrencySymbol(item.mensalidade.moedaPreco)}/mês` : ''}
                        </div>
                      ) : item.categoria === 'Mercenários' ? (
                        <div className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mb-2 border border-white/10 bg-white/5 px-2 py-0.5 rounded-md inline-block">
                          Servo/escravo permanente
                        </div>
                      ) : null}
                      <div className="flex items-center gap-1 text-lg font-bold" style={{ color: COR_MOEDA[item.moedaPreco] ?? '#e5e7eb' }}>
                        {(item.valorOriginal * quantidade).toLocaleString('pt-BR')} <span className="text-xs">{getCurrencySymbol(item.moedaPreco)}</span>
                      </div>
                    </div>
                    
                    <div className="flex flex-col items-end justify-between">
                      <button onClick={() => onRemoveItem(cartKey)} disabled={isProcessing} aria-label={`Remover ${item.nome}`} className="text-gray-500 hover:text-red-400 transition-colors p-1 disabled:opacity-50">
                        <Trash2 size={16} />
                      </button>
                      <div className="flex items-center gap-3 bg-black/50 rounded-xl p-1 border border-white/10">
                        <button onClick={() => onUpdateQuantity(cartKey, -1)} disabled={isProcessing || !!alvoItemId} aria-label={`Diminuir quantidade de ${item.nome}`} className="w-6 h-6 flex items-center justify-center rounded-lg hover:bg-white/10 text-white disabled:opacity-50">
                          <Minus size={14} />
                        </button>
                        <span className="text-sm font-bold w-4 text-center text-white">{quantidade}</span>
                        <button onClick={() => onUpdateQuantity(cartKey, 1)} disabled={isProcessing || !!alvoItemId || quantidade >= Math.min(item.quantidadeDisponivel ?? MAX_SHOP_UNITS, MAX_SHOP_UNITS)} aria-label={`Aumentar quantidade de ${item.nome}`} className="w-6 h-6 flex items-center justify-center rounded-lg hover:bg-white/10 text-white disabled:opacity-50">
                          <Plus size={14} />
                        </button>
                      </div>
                    </div>
                  </div>
                  );
                })
              )}
            </div>

            {/* Footer */}
            {cart.length > 0 && (
              <div className="border-t border-white/10 bg-black/40 p-4 sm:p-6">
                <div className="flex justify-between items-end mb-6">
                  <div className="text-gray-400 uppercase tracking-widest text-xs font-bold">{isVenda ? 'Você recebe' : 'Total'}</div>
                  <div className="flex flex-col items-end gap-1 text-xl font-bold text-gray-200">
                    {totais.map((total) => (
                      <span key={total.moeda}>
                        {total.valor.toLocaleString('pt-BR')} <span className="text-sm">{getCurrencySymbol(total.moeda)}</span>
                      </span>
                    ))}
                  </div>
                </div>
                
                <button
                  onClick={onCheckout}
                  disabled={isProcessing}
                  data-sfx="confirm"
                  className="loja-botao w-full !min-h-[3.25rem] !text-sm"
                  style={{ cursor: isProcessing ? 'wait' : undefined }}
                >
                  <ShoppingCart size={20} />
                  {isProcessing ? 'Processando...' : (isVenda ? 'Vender o lote' : 'Fechar a compra')}
                </button>
              </div>
            )}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};
