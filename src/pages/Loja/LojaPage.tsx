import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, ShoppingBag, CheckCircle, XCircle } from 'lucide-react';
import { LOJA_CATALOGO, LojaItem, ItemCategoria, ItemRaridade } from '../../data/lojaCatalog';
import { ItemCard } from './components/ItemCard';
import { useCharacterStore } from '../../store/useCharacterStore';

export const LojaPage: React.FC = () => {
  const { characters, fetchCharacters, syncEconomy } = useCharacterStore();
  
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategoria, setSelectedCategoria] = useState<ItemCategoria | 'Todos'>('Todos');
  const [selectedRaridade, setSelectedRaridade] = useState<ItemRaridade | 'Todas'>('Todas');
  const [compradorId, setCompradorId] = useState<string>('');
  
  const [toast, setToast] = useState<{ message: string, type: 'success' | 'error' } | null>(null);

  // Carrega personagens ao abrir a loja
  useEffect(() => {
    fetchCharacters();
  }, [fetchCharacters]);

  // Seleciona o primeiro personagem por padrão
  useEffect(() => {
    if (characters.length > 0 && !compradorId) {
      setCompradorId(characters[0].id);
    }
  }, [characters, compradorId]);

  const compradorAtivo = useMemo(() => 
    characters.find(c => c.id === compradorId), 
  [characters, compradorId]);

  // Calcula o total em PO do comprador atual
  // Supondo: "Ouro" e "Prata". 1 PO = 1 PO, 10 PP = 1 PO.
  const saldoTotalPO = useMemo(() => {
    if (!compradorAtivo || !compradorAtivo.carteira) return 0;
    
    let total = 0;
    compradorAtivo.carteira.forEach(moeda => {
      const nomeMoeda = moeda.moeda.toLowerCase();
      if (nomeMoeda.includes('ouro') || nomeMoeda === 'po') {
        total += moeda.saldo;
      } else if (nomeMoeda.includes('prata') || nomeMoeda === 'pp') {
        total += (moeda.saldo / 10);
      }
    });
    return total;
  }, [compradorAtivo]);

  const showToast = (message: string, type: 'success' | 'error') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  const handleBuy = async (item: LojaItem) => {
    if (!compradorAtivo) {
      showToast('Selecione um comprador primeiro.', 'error');
      return;
    }

    if (saldoTotalPO < item.precoPO) {
      showToast('Saldo insuficiente.', 'error');
      return;
    }

    // Processa o pagamento (Tenta deduzir primeiro Ouro, depois Prata se necessário)
    // Para simplificar a demonstração, subtrairemos em PO e converteremos pra carteira
    // O ideal: Deduzir Ouro. Se faltar inteiro, deduz Prata. Se for quebrado (ex 1.5 PO), deduz 1 Ouro e 5 Prata.
    
    const novaCarteira = [...(compradorAtivo.carteira || [])];
    
    let custoPO = item.precoPO;
    let ouroIndex = novaCarteira.findIndex(m => m.moeda.toLowerCase().includes('ouro') || m.moeda === 'po');
    let prataIndex = novaCarteira.findIndex(m => m.moeda.toLowerCase().includes('prata') || m.moeda === 'pp');

    // Se não existem, cria as instâncias
    if (ouroIndex === -1) {
      novaCarteira.push({ moeda: 'Ouro', saldo: 0, simbolo: 'PO' });
      ouroIndex = novaCarteira.length - 1;
    }
    if (prataIndex === -1) {
      novaCarteira.push({ moeda: 'Prata', saldo: 0, simbolo: 'PP' });
      prataIndex = novaCarteira.length - 1;
    }

    const custoPrataTotal = custoPO * 10; // Custo todo em prata
    const saldoOuroEmPrata = novaCarteira[ouroIndex].saldo * 10;
    const saldoPrata = novaCarteira[prataIndex].saldo;

    if (saldoOuroEmPrata + saldoPrata >= custoPrataTotal) {
      let faltante = custoPrataTotal;
      
      // Tenta tirar da prata primeiro (troco)
      if (novaCarteira[prataIndex].saldo >= faltante) {
        novaCarteira[prataIndex].saldo -= faltante;
        faltante = 0;
      } else {
        faltante -= novaCarteira[prataIndex].saldo;
        novaCarteira[prataIndex].saldo = 0;
      }

      // Se ainda faltar, tira do ouro. Mas como ouro vale 10, pode dar troco em prata
      if (faltante > 0) {
        const ouroGasto = Math.ceil(faltante / 10);
        novaCarteira[ouroIndex].saldo -= ouroGasto;
        const trocoPrata = (ouroGasto * 10) - faltante;
        novaCarteira[prataIndex].saldo += trocoPrata;
      }
    }

    // Adiciona o item ao inventário
    const novoInventario = [...(compradorAtivo.inventarioCentral || [])];
    novoInventario.push({
      item_id: crypto.randomUUID(),
      titulo: item.nome,
      quantidade: 1,
      dados: {
        descricao: item.descricao,
        propriedades: item.propriedades,
        raridade: item.raridade
      }
    });

    // Chama o serviço do backend/Zustand
    const sucesso = await syncEconomy(compradorAtivo.id, {
      carteira: novaCarteira,
      inventario: novoInventario
    });

    if (sucesso) {
      showToast(`Você comprou: ${item.nome}!`, 'success');
      // Recarrega personagens para atualizar a carteira refletida na UI
      fetchCharacters();
    } else {
      showToast('Erro ao processar compra.', 'error');
    }
  };

  const filteredItems = LOJA_CATALOGO.filter(item => {
    const matchSearch = item.nome.toLowerCase().includes(searchTerm.toLowerCase()) || 
                        item.descricao.toLowerCase().includes(searchTerm.toLowerCase());
    const matchCat = selectedCategoria === 'Todos' || item.categoria === selectedCategoria;
    const matchRar = selectedRaridade === 'Todas' || item.raridade === selectedRaridade;
    return matchSearch && matchCat && matchRar;
  });

  return (
    <div className="pl-32 pr-12 pt-12 pb-24 relative z-10 w-full min-h-screen flex flex-col max-w-[1600px] mx-auto">
      
      {/* HEADER DA LOJA */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-12 gap-6">
        <div>
          <h2 className="text-5xl text-primary font-bold tracking-wider mb-2 flex items-center gap-4" style={{fontFamily: 'Cinzel, serif'}}>
            <ShoppingBag size={48} />
            Mercado do Jardim
          </h2>
          <p className="text-gray-400 text-lg max-w-xl">
            Adquira armamentos, poções e relíquias para a sua jornada.
          </p>
        </div>

        {/* SELETOR DE COMPRADOR */}
        {characters.length > 0 && (
          <div className="flex items-center bg-[#0b0a12]/80 backdrop-blur-md p-3 rounded-2xl border border-primary/30 shadow-[0_0_20px_rgba(var(--color-primary),0.1)]">
            <div className="mr-4 text-right">
              <div className="text-xs text-primary uppercase tracking-widest font-bold mb-1">Comprador Ativo</div>
              <div className="text-lg font-bold text-yellow-400">
                {saldoTotalPO} <span className="text-sm">PO</span>
              </div>
            </div>
            <select
              value={compradorId}
              onChange={(e) => setCompradorId(e.target.value)}
              className="bg-black/60 border border-white/10 rounded-xl p-2 text-white outline-none focus:border-primary transition-colors cursor-pointer"
            >
              {characters.map(c => (
                <option key={c.id} value={c.id}>{c.nome}</option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* FILTROS E BUSCA */}
      <div className="flex flex-col md:flex-row gap-6 mb-12 items-center bg-[#0b0a12]/50 backdrop-blur-md p-4 rounded-3xl border border-white/5 shadow-xl">
        <div className="relative flex-1 w-full">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" size={20} />
          <input 
            type="search" 
            placeholder="Buscar poções, armaduras, armas..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-black/40 border border-white/10 rounded-2xl py-3 pl-12 pr-4 text-white placeholder-gray-600 focus:outline-none focus:border-primary/50 transition-all"
          />
        </div>
        
        <div className="flex gap-4 w-full md:w-auto">
          <select 
            value={selectedCategoria}
            onChange={(e) => setSelectedCategoria(e.target.value as ItemCategoria | 'Todos')}
            className="bg-black/40 border border-white/10 rounded-2xl py-3 px-4 text-white outline-none cursor-pointer hover:border-white/30"
          >
            <option value="Todos">Todas as Categorias</option>
            <option value="Armas">Armas</option>
            <option value="Armaduras">Armaduras</option>
            <option value="Consumíveis">Consumíveis</option>
            <option value="Itens Mágicos">Itens Mágicos</option>
          </select>
          
          <select 
            value={selectedRaridade}
            onChange={(e) => setSelectedRaridade(e.target.value as ItemRaridade | 'Todas')}
            className="bg-black/40 border border-white/10 rounded-2xl py-3 px-4 text-white outline-none cursor-pointer hover:border-white/30"
          >
            <option value="Todas">Qualquer Raridade</option>
            <option value="Comum">Comum</option>
            <option value="Incomum">Incomum</option>
            <option value="Raro">Raro</option>
            <option value="Épico">Épico</option>
          </select>
        </div>
      </div>

      {/* GRID DE ITENS */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8">
        <AnimatePresence>
          {filteredItems.map((item) => (
            <ItemCard 
              key={item.id} 
              item={item} 
              onBuy={handleBuy} 
              podeComprar={saldoTotalPO >= item.precoPO} 
            />
          ))}
        </AnimatePresence>
        
        {filteredItems.length === 0 && (
          <div className="col-span-full py-20 text-center text-gray-500 text-xl font-serif">
            Nenhum item encontrado no mercador com esses filtros...
          </div>
        )}
      </div>

      {/* TOAST SYSTEM GLASSMORPHISM */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: 50, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.9 }}
            className={`fixed bottom-10 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 px-6 py-4 rounded-full backdrop-blur-xl border shadow-2xl ${
              toast.type === 'success' 
                ? 'bg-primary/20 border-primary/50 text-white shadow-[0_0_30px_rgba(var(--color-primary),0.3)]' 
                : 'bg-red-500/20 border-red-500/50 text-white shadow-[0_0_30px_rgba(239,68,68,0.3)]'
            }`}
          >
            {toast.type === 'success' ? <CheckCircle className="text-primary" /> : <XCircle className="text-red-400" />}
            <span className="font-medium tracking-wide">{toast.message}</span>
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
};
