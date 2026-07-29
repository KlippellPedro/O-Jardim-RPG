import React from 'react';
import { motion } from 'framer-motion';
import { LojaItem, getCurrencySymbol } from '../../../data/lojaCatalog';
import { X, ShoppingCart, Info, Swords, Activity, Skull, Sparkles, AlertTriangle } from 'lucide-react';
import { ICharacter } from '../../../types/character';

interface LojaItemModalProps {
  item: LojaItem;
  onClose: () => void;
  onBuy: (item: LojaItem) => void;
  podeComprar: boolean;
  modoLoja?: 'Comprar' | 'Vender';
  compradorAtivo?: ICharacter;
}

export const LojaItemModal: React.FC<LojaItemModalProps> = ({ item, onClose, onBuy, podeComprar, modoLoja = 'Comprar', compradorAtivo }) => {
  const { dadosBrutos = {} } = item;
  
  // Validação de Requisitos
  const meetsNivel = !item.requisitoNivel || (compradorAtivo && compradorAtivo.nivel >= item.requisitoNivel);
  const meetsClasse = !item.requisitoClasse || item.requisitoClasse.length === 0 || (compradorAtivo && item.requisitoClasse.some(reqClasse => 
    (compradorAtivo.classes || []).some(c => c.id.toLowerCase() === reqClasse.toLowerCase()) || 
    (compradorAtivo.classeId && compradorAtivo.classeId.toLowerCase() === reqClasse.toLowerCase())
  ));
  
  const hasWarning = (!meetsNivel || !meetsClasse) && modoLoja === 'Comprar';


  // Renderização específica baseada na Categoria
  const renderDetails = () => {
    switch (item.categoria) {
      case 'Mercenários':
        return (
          <div className="flex flex-col gap-4 mt-6 border-t border-white/10 pt-6">
            <h4 className="text-sm uppercase tracking-widest text-gray-500 font-bold mb-2 flex items-center gap-2">
              <Activity size={16} /> Ficha de Combate
            </h4>
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-white/5 p-4 rounded-xl border border-white/10">
                <div className="text-xs text-gray-400 uppercase">Nível</div>
                <div className="text-2xl text-white font-bold">{dadosBrutos.nivel || '?'}</div>
              </div>
              <div className="bg-white/5 p-4 rounded-xl border border-white/10">
                <div className="text-xs text-gray-400 uppercase">Classe</div>
                <div className="text-xl text-yellow-400 font-bold">{dadosBrutos.classe || 'Criatura'}</div>
              </div>
            </div>
            {/* Se houver dados parseáveis de Vida/Dano no futuro, podem ser injetados aqui */}
            {item.propriedades && (
              <div className="bg-white/5 p-4 rounded-xl border border-white/10 mt-2">
                <div className="text-xs text-gray-400 uppercase mb-2">Atributos e Habilidades</div>
                <p className="text-gray-300 text-sm whitespace-pre-wrap">{item.propriedades}</p>
              </div>
            )}
          </div>
        );

      case 'Veículos':
        return (
          <div className="flex flex-col gap-4 mt-6 border-t border-white/10 pt-6">
            <h4 className="text-sm uppercase tracking-widest text-gray-500 font-bold mb-2 flex items-center gap-2">
              <Info size={16} /> Especificações do Sistema
            </h4>
            <div className="grid grid-cols-3 gap-3">
              <div className="bg-white/5 p-3 rounded-xl border border-white/10 flex flex-col items-center justify-center text-center">
                <div className="text-[10px] text-gray-400 uppercase tracking-widest">Sistema</div>
                <div className="text-sm text-white font-bold">{dadosBrutos.sistema || '-'}</div>
              </div>
              <div className="bg-white/5 p-3 rounded-xl border border-white/10 flex flex-col items-center justify-center text-center">
                <div className="text-[10px] text-gray-400 uppercase tracking-widest">Subtipo</div>
                <div className="text-sm text-blue-300 font-bold">{dadosBrutos.subtipo || '-'}</div>
              </div>
              <div className="bg-white/5 p-3 rounded-xl border border-white/10 flex flex-col items-center justify-center text-center">
                <div className="text-[10px] text-gray-400 uppercase tracking-widest">Tier</div>
                <div className="text-sm text-purple-300 font-bold">{dadosBrutos.tier || '-'}</div>
              </div>
            </div>
          </div>
        );

      case 'Armas':
      case 'Armaduras e Escudos':
        return (
          <div className="flex flex-col gap-4 mt-6 border-t border-white/10 pt-6">
            <h4 className="text-sm uppercase tracking-widest text-gray-500 font-bold mb-2 flex items-center gap-2">
              <Swords size={16} /> Atributos Táticos
            </h4>
            <div className="grid grid-cols-2 gap-4">
              {dadosBrutos.dano && (
                <div className={`p-4 rounded-xl border flex flex-col justify-center items-center text-center ${dadosBrutos.dano === 'Hit Kill' ? 'bg-red-900/20 border-red-500/50' : 'bg-white/5 border-white/10'}`}>
                  <div className="text-xs text-gray-400 uppercase mb-1">Dano</div>
                  {dadosBrutos.dano === 'Hit Kill' ? (
                    <span className="text-xl font-bold text-red-500 flex items-center gap-2 animate-pulse drop-shadow-[0_0_10px_rgba(239,68,68,0.8)] uppercase tracking-widest">
                      <Skull size={18} /> Hit Kill
                    </span>
                  ) : (
                    <span className={`font-bold text-red-400 break-words w-full ${dadosBrutos.dano.length > 15 ? 'text-sm leading-tight' : 'text-xl'}`}>
                      {dadosBrutos.dano}
                    </span>
                  )}
                </div>
              )}
              {dadosBrutos.critico && (
                <div className="bg-white/5 p-4 rounded-xl border border-white/10">
                  <div className="text-xs text-gray-400 uppercase">Crítico</div>
                  <div className="text-xl text-yellow-400 font-bold">{dadosBrutos.critico}</div>
                </div>
              )}
              {dadosBrutos.defesa && (
                <div className="bg-white/5 p-4 rounded-xl border border-white/10">
                  <div className="text-xs text-gray-400 uppercase">Defesa</div>
                  <div className="text-xl text-blue-400 font-bold">+{dadosBrutos.defesa}</div>
                </div>
              )}
              {dadosBrutos.alcance && (
                <div className="bg-white/5 p-4 rounded-xl border border-white/10">
                  <div className="text-xs text-gray-400 uppercase">Alcance</div>
                  <div className="text-xl text-white font-bold">{dadosBrutos.alcance}</div>
                </div>
              )}
            </div>
          </div>
        );
      
      default:
        // Consumíveis, Drops/Componentes e Outros
        if (!item.propriedades) return null;
        return (
          <div className="flex flex-col gap-4 mt-6 border-t border-white/10 pt-6">
            <h4 className="text-sm uppercase tracking-widest text-gray-500 font-bold mb-2 flex items-center gap-2">
              <Info size={16} /> Detalhes
            </h4>
            <div className="bg-white/5 p-4 rounded-xl border border-white/10">
              <p className="text-gray-300 text-sm whitespace-pre-wrap">{item.propriedades}</p>
            </div>
          </div>
        );
    }
  };

  // Cores de Raridade para o Modal
  let accentColor = '';
  switch (item.raridade) {
    case 'Comum': accentColor = 'text-gray-300 border-gray-500 shadow-[0_0_20px_rgba(107,114,128,0.2)] bg-gray-500/10'; break;
    case 'Incomum': accentColor = 'text-blue-400 border-blue-500 shadow-[0_0_20px_rgba(59,130,246,0.2)] bg-blue-500/10'; break;
    case 'Raro': accentColor = 'text-purple-400 border-purple-500 shadow-[0_0_20px_rgba(168,85,247,0.2)] bg-purple-500/10'; break;
    case 'Épico': accentColor = 'text-yellow-400 border-yellow-500 shadow-[0_0_20px_rgba(234,179,8,0.2)] bg-yellow-500/10'; break;
    case 'Lendário': accentColor = 'text-orange-400 border-orange-500 shadow-[0_0_20px_rgba(249,115,22,0.2)] bg-orange-500/10'; break;
    case 'Relíquia': accentColor = 'text-red-400 border-red-500 shadow-[0_0_30px_rgba(239,68,68,0.3)] bg-red-500/10'; break;
    default: accentColor = 'text-gray-400 border-white/20 bg-white/5'; break;
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-md p-4"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="loja-item-modal-title"
    >
      <motion.div
        initial={{ scale: 0.9, y: 30 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.9, y: 30 }}
        className="bg-[#0b0a12] border border-white/10 rounded-3xl max-w-2xl w-full shadow-2xl relative overflow-hidden flex flex-col max-h-[90vh]"
        onClick={e => e.stopPropagation()}
      >
        {/* CABEÇALHO DO MODAL */}
        <div className={`p-8 border-b ${accentColor.split(' ').slice(1).join(' ')} flex justify-between items-start`}>
          <div>
            <div className="flex items-center gap-3 mb-2">
              <span className={`text-[10px] uppercase tracking-widest font-bold px-2 py-1 rounded-md border ${accentColor.split(' ')[0]} border-current`}>
                {item.raridade}
              </span>
              <span className="text-[10px] uppercase tracking-widest font-bold px-2 py-1 rounded-md border border-white/20 text-gray-400 bg-white/5">
                {item.categoria}
              </span>
              {dadosBrutos.subtipo && (
                <span className="text-[10px] uppercase tracking-widest font-bold px-2 py-1 rounded-md border border-white/20 text-blue-300 bg-blue-900/20">
                  {dadosBrutos.subtipo}
                </span>
              )}
            </div>
            <h2 id="loja-item-modal-title" className="text-3xl font-bold text-white tracking-wide mt-2" style={{ fontFamily: 'Cinzel, serif' }}>
              {item.nome}
            </h2>
          </div>
          <button 
            onClick={onClose}
            aria-label="Fechar detalhes do item"
            className="p-2 rounded-full hover:bg-white/10 text-gray-400 hover:text-white transition-colors"
          >
            <X size={24} />
          </button>
        </div>

        {/* CORPO DO MODAL */}
        <div className="p-8 overflow-y-auto custom-scrollbar flex-1">
          {hasWarning && (
            <div className="mb-6 p-4 rounded-xl bg-red-900/30 border border-red-500/50 flex items-start gap-3">
              <AlertTriangle className="text-red-400 shrink-0 mt-0.5" size={20} />
              <div>
                <h4 className="text-red-400 font-bold tracking-wide uppercase text-sm mb-1">Aviso de Requisitos</h4>
                <p className="text-red-200/80 text-sm">
                  Seu personagem atual não atende aos requisitos para equipar/usar este item perfeitamente. 
                  {!meetsNivel && ` Exige Nível ${item.requisitoNivel}.`}
                  {!meetsClasse && ` Exige Classe: ${item.requisitoClasse?.join(', ')}.`}
                  <br/><span className="italic text-xs opacity-75">(Você ainda pode comprar para entregar a um aliado ou guardar).</span>
                </p>
              </div>
            </div>
          )}
          <p className="text-gray-300 text-lg leading-relaxed italic border-l-2 border-[#c7a44c]/50 pl-4">
            "{item.descricao}"
          </p>

          {renderDetails()}
        </div>

        {dadosBrutos.efeito && (
          <div className="px-6 pb-6">
            <div className="bg-fuchsia-900/20 border border-fuchsia-500/30 p-4 rounded-xl flex flex-col shadow-[0_0_15px_rgba(232,121,249,0.1)]">
              <span className="text-[10px] text-fuchsia-400 uppercase tracking-widest font-bold mb-2 flex items-center gap-2">
                <Sparkles size={14} /> Poder Primordial
              </span>
              <p className="text-fuchsia-100/90 text-sm leading-relaxed">{dadosBrutos.efeito}</p>
            </div>
          </div>
        )}

        {/* RODAPÉ E COMPRA */}
        <div className="p-6 border-t border-white/10 bg-black/40 flex justify-end items-center relative overflow-hidden">
          <div className="flex gap-6 items-center">
            <div className="flex flex-col items-end">
              <span className="text-[10px] uppercase tracking-widest text-gray-500 font-bold mb-1">Preço estimado</span>
              <div className="flex items-center gap-2">
                <span className={`text-2xl font-bold flex items-center gap-1 ${item.moedaPreco === 'Solares' ? 'text-yellow-400' : item.moedaPreco === 'Lunaris' ? 'text-gray-200' : item.moedaPreco === 'Fragmentos de Estrela' ? 'text-fuchsia-400' : 'text-indigo-400'}`}>
                  {item.valorOriginal.toLocaleString('pt-BR')} <span className="text-sm">{getCurrencySymbol(item.moedaPreco)}</span>
                </span>
              </div>
            </div>

            <button
              onClick={() => onBuy(item)}
              disabled={!podeComprar}
              className={`flex items-center gap-2 px-8 py-3 rounded-xl font-bold tracking-widest uppercase transition-all shadow-xl ${
                podeComprar
                  ? 'bg-[#c7a44c] hover:bg-yellow-400 text-black hover:scale-105'
                  : 'bg-gray-800 text-gray-500 cursor-not-allowed'
              }`}
            >
              <ShoppingCart size={20} />
              {podeComprar ? (modoLoja === 'Comprar' ? 'Adicionar ao carrinho' : 'Adicionar à venda') : 'Selecione um personagem'}
            </button>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
};
