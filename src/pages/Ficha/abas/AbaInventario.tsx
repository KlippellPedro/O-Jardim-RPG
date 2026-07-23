import { useState } from 'react';
import { Search, Backpack, Coins, Shield, Sword, Box, Minus, Plus } from 'lucide-react';
import { motion } from 'framer-motion';
import { useCharacterStore } from '../../../store/useCharacterStore';

interface IInventoryItem {
  id: string;
  nome: string;
  categoria: string;
  quantidade: number;
  espacos: number;
}

const paraBackend = (item: IInventoryItem) => ({
  item_id: item.id,
  titulo: item.nome,
  quantidade: Math.max(1, item.quantidade || 1),
  dados: { categoria: item.categoria, espacos: item.espacos },
});

const paraUI = (item: any): IInventoryItem => ({
  id: item.item_id,
  nome: item.titulo,
  categoria: item.dados?.categoria || 'geral',
  quantidade: item.quantidade,
  espacos: item.dados?.espacos ?? 1,
});

// BUG-FIX: itens e moedas vivem em tabelas próprias no backend
// (personagem.inventarioCentral / personagem.carteira), nunca em
// ficha.inventario — a API descarta esse campo antes de gravar
// (_sheet_without_central_fields), então os itens desapareciam ao recarregar
// a página. A sincronização agora usa PUT /personagens/{id}/economia.
export const AbaInventario = ({ character }: { character: any; onUpdate?: any }) => {
  const syncEconomy = useCharacterStore((s) => s.syncEconomy);
  const [busca, setBusca] = useState('');

  const inventario: IInventoryItem[] = (character.inventarioCentral || []).map(paraUI);
  const carteira: { moeda: string; saldo: number; simbolo?: string }[] =
    character.carteira?.length ? character.carteira : [{ moeda: 'Lunaris', saldo: 0 }];

  const commit = (proximoInventario: IInventoryItem[], proximaCarteira = carteira) => {
    syncEconomy(character.id, {
      inventario: proximoInventario.map(paraBackend),
      carteira: proximaCarteira,
    });
  };

  const handleAddItem = () => {
    const novoItem: IInventoryItem = {
      id: `item-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 7)}`,
      nome: 'Novo Item ' + (inventario.length + 1),
      categoria: 'geral',
      quantidade: 1,
      espacos: 1,
    };
    commit([...inventario, novoItem]);
  };

  const handleRemoveItem = (id: string) => {
    commit(inventario.filter((i) => i.id !== id));
  };

  const handleChangeItem = (id: string, field: string, value: any) => {
    commit(inventario.map((i) => (i.id === id ? { ...i, [field]: value } : i)));
  };

  const handleAjustarMoeda = (moeda: string, delta: number) => {
    const atual = carteira.find((m) => m.moeda === moeda);
    const novoSaldo = Math.max(0, (atual?.saldo || 0) + delta);
    const proximaCarteira = atual
      ? carteira.map((m) => (m.moeda === moeda ? { ...m, saldo: novoSaldo } : m))
      : [...carteira, { moeda, saldo: novoSaldo }];
    commit(inventario, proximaCarteira);
  };

  const getIconForType = (type: string) => {
    switch (type?.toLowerCase()) {
      case 'arma': return <Sword size={16} />;
      case 'armadura': return <Shield size={16} />;
      case 'consumivel': return <Box size={16} />;
      default: return <Backpack size={16} />;
    }
  };

  const inventarioVisivel = inventario.filter((item) =>
    !busca || item.nome?.toLowerCase().includes(busca.toLowerCase())
  );

  const espacosUsados = inventario.reduce(
    (soma, item) => soma + (item.espacos || 0) * (item.quantidade || 1),
    0
  );

  return (
    <div className="space-y-6">

      {/* HEADER E CARGA */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-2 bg-[#0f0e15] border border-white/5 rounded-2xl p-6 flex flex-col justify-between">
          <div>
            <h2 className="text-2xl font-bold text-white mb-1" style={{ fontFamily: 'Cinzel, serif' }}>Inventário</h2>
            <p className="text-gray-400 text-sm">Gerencie seus equipamentos, consumíveis e carga.</p>
          </div>

          <div className="mt-6 flex justify-between text-sm">
            <span className="text-gray-400 font-bold uppercase tracking-widest">Carga Atual</span>
            <span className="text-white font-mono">{espacosUsados} <span className="text-gray-500 text-xs">ESPAÇOS USADOS</span></span>
          </div>
        </div>

        <div className="bg-[#0f0e15] border border-white/5 rounded-2xl p-4 flex flex-col gap-2">
          <div className="flex items-center gap-2 mb-1">
            <Coins size={18} className="text-yellow-600" />
            <h3 className="text-white font-bold tracking-widest uppercase text-xs">Carteira</h3>
          </div>
          {carteira.map((m) => (
            <div key={m.moeda} className="flex items-center justify-between gap-2">
              <span className="text-xs text-gray-400 truncate">{m.moeda}</span>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => handleAjustarMoeda(m.moeda, -1)}
                  className="w-6 h-6 rounded bg-black/40 border border-white/5 text-gray-400 hover:text-white flex items-center justify-center"
                >
                  <Minus size={10} />
                </button>
                <span className="w-10 text-center text-sm font-mono text-yellow-600 font-bold">{m.saldo}</span>
                <button
                  onClick={() => handleAjustarMoeda(m.moeda, 1)}
                  className="w-6 h-6 rounded bg-black/40 border border-white/5 text-gray-400 hover:text-white flex items-center justify-center"
                >
                  <Plus size={10} />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* FERRAMENTAS */}
      <div className="flex gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={18} />
          <input
            type="text"
            placeholder="Buscar item no inventário..."
            value={busca}
            onChange={e => setBusca(e.target.value)}
            className="w-full bg-[#0f0e15] border border-white/5 rounded-xl py-3 pl-10 pr-4 text-white focus:border-yellow-600/50 outline-none text-sm"
          />
        </div>
        <button
          onClick={handleAddItem}
          className="px-6 py-3 rounded-xl border border-yellow-600/30 text-yellow-600 font-bold text-sm hover:bg-yellow-600/10 transition-colors border-dashed"
        >
          + Novo Item
        </button>
      </div>

      {/* LISTA DE ITENS */}
      <div className="bg-[#0f0e15] border border-white/5 rounded-2xl overflow-hidden p-4">
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {inventarioVisivel.map((item) => (
            <ItemCard key={item.id} item={item} onChange={handleChangeItem} onRemove={handleRemoveItem} getIconForType={getIconForType} />
          ))}
          {inventarioVisivel.length === 0 && (
            <div className="col-span-full py-12 text-center">
              <Backpack size={48} className="text-gray-700 mx-auto mb-4 opacity-50" />
              <p className="text-gray-500 font-bold uppercase tracking-widest">Inventário Vazio</p>
            </div>
          )}
        </div>
      </div>

    </div>
  );
};

const ItemCard = ({ item, onChange, onRemove, getIconForType }: any) => {
  const [localItem, setLocalItem] = useState(item);

  const handleLocalChange = (field: string, value: any) => {
    setLocalItem((prev: any) => ({ ...prev, [field]: value }));
  };

  const handleBlur = (field: string) => {
    if (localItem[field] !== item[field]) {
      onChange(item.id, field, localItem[field]);
    }
  };

  return (
    <motion.div
      layout
      initial={{ opacity: 0 }} animate={{ opacity: 1 }}
      className="bg-[#121118] border border-white/5 rounded-xl p-4 flex flex-col gap-3 hover:border-yellow-600/30 transition-colors group relative"
    >
      <div className="flex gap-3">
        <div className="w-12 h-12 rounded-lg bg-black/50 border border-white/5 flex items-center justify-center text-gray-500">
          {getIconForType(localItem.categoria)}
        </div>

        <div className="flex-1 flex flex-col justify-center">
          <input
            type="text"
            value={localItem.nome || ''}
            onChange={e => handleLocalChange('nome', e.target.value)}
            onBlur={() => handleBlur('nome')}
            className="bg-transparent text-white font-bold text-sm leading-tight mb-1 outline-none focus:border-b focus:border-yellow-600/50 w-full placeholder-gray-600"
            placeholder="Nome do item"
          />
          <div>
            <select
              value={localItem.categoria || 'geral'}
              onChange={e => {
                handleLocalChange('categoria', e.target.value);
                onChange(item.id, 'categoria', e.target.value);
              }}
              className="text-[10px] px-1 py-0.5 bg-black/40 rounded border border-white/5 text-gray-400 capitalize outline-none"
            >
              <option value="arma">Arma</option>
              <option value="armadura">Armadura</option>
              <option value="consumivel">Consumível</option>
              <option value="geral">Geral</option>
            </select>
          </div>
        </div>

        <div className="text-right flex flex-col items-end justify-center">
          <div className="flex items-center gap-1 mb-1">
            <span className="text-gray-500 text-xs mr-1">x</span>
            <input
              type="number"
              value={localItem.quantidade || 1}
              onChange={e => handleLocalChange('quantidade', parseInt(e.target.value) || 0)}
              onBlur={() => handleBlur('quantidade')}
              className="w-12 bg-transparent text-lg font-bold text-yellow-600 font-mono text-right outline-none focus:border-b focus:border-yellow-600/50"
              min="1"
            />
          </div>
          <div className="flex items-center gap-1">
            <input
              type="number"
              value={localItem.espacos || 1}
              onChange={e => handleLocalChange('espacos', parseInt(e.target.value) || 0)}
              onBlur={() => handleBlur('espacos')}
              className="w-8 bg-transparent text-[10px] text-gray-500 uppercase text-right outline-none focus:border-b focus:border-yellow-600/50"
              min="0"
            />
            <span className="text-[10px] text-gray-500 uppercase">Esp.</span>
          </div>
        </div>
      </div>
      <button
        onClick={() => onRemove(item.id)}
        className="absolute top-2 right-2 text-red-500 opacity-0 group-hover:opacity-50 hover:!opacity-100 transition-opacity"
      >
        ×
      </button>
    </motion.div>
  );
};
