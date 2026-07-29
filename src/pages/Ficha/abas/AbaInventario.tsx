import { useState } from 'react';
import { Search, Backpack, Coins, Shield, Sword, Box, Minus, Plus, Car, Trash2, Pencil, Sparkles, Wrench, Star, GripVertical } from 'lucide-react';
import { Reorder } from 'framer-motion';
import { useCharacterStore } from '../../../store/useCharacterStore';
import { useAuthStore } from '../../../store/useAuthStore';
import { createManualItemId } from '../../../services/economyOperations';
import { FichaModal } from '../components/FichaModal';
import { LabeledInput } from '../components/SharedFichaComponents';
import { Select } from '../../../components/ui/Select';
import { formatarCritico, normalizarCriticoBalanceado } from '../../../services/criticalService';
import { resumirEquipamentos } from '../../../services/equipamentoService';
import {
  getCurrencySymbol,
  getCurrencyTheme,
  ItemRaridadeChave,
  MoedaTipo,
  normalizarRaridadeChave,
  rotuloRaridadeChave,
} from '../../../data/lojaCatalog';

interface IModificacao {
  id: string;
  nome: string;
  efeito: string;
  tipo: 'comum' | 'especial';
}

interface IInventoryItem {
  id: string;
  nome: string;
  categoria: 'arma' | 'armadura' | 'consumivel' | 'veiculo' | 'geral';
  quantidade: number;
  espacos: number;
  localArmazenamento: string;
  descricao?: string;
  
  // Novos
  raridade: ItemRaridadeChave;
  equipado: boolean;
  favorito: boolean;
  durabilidadeAtual: number;
  durabilidadeMaxima: number;
  modificacoes: IModificacao[];

  // Específicos
  dano?: string;
  margemAmeaca?: number;
  multiplicadorCritico?: number;
  municaoAtual?: number;
  municaoMaxima?: number;
  defesa?: number;
  penalidade?: number;
  combustivelAtual?: number;
  combustivelMaximo?: number;
  efeito?: string;
  ordem: number;
  /** Metadados recebidos do backend que esta UI ainda não conhece. */
  _dadosOriginais: Record<string, unknown>;
}

const CATEGORY_COLORS: Record<string, string> = {
  arma: 'text-orange-400 border-orange-500/30 bg-orange-900/20',
  armadura: 'text-blue-400 border-blue-500/30 bg-blue-900/20',
  consumivel: 'text-emerald-400 border-emerald-500/30 bg-emerald-900/20',
  veiculo: 'text-amber-400 border-amber-500/30 bg-amber-900/20',
  geral: 'text-gray-400 border-white/10 bg-black/40',
};

const RARIDADES_CONFIG = {
  comum: { cor: 'text-gray-400', bg: 'bg-[#121118]', border: 'border-white/5', glow: '' },
  incomum: { cor: 'text-green-400', bg: 'bg-green-900/10', border: 'border-green-500/30', glow: 'shadow-[0_0_15px_rgba(74,222,128,0.05)]' },
  raro: { cor: 'text-blue-400', bg: 'bg-blue-900/10', border: 'border-blue-500/30', glow: 'shadow-[0_0_15px_rgba(96,165,250,0.1)]' },
  epico: { cor: 'text-purple-400', bg: 'bg-purple-900/10', border: 'border-purple-500/40', glow: 'shadow-[0_0_20px_rgba(192,132,252,0.15)]' },
  lendario: { cor: 'text-orange-400', bg: 'bg-orange-900/10', border: 'border-orange-500/50', glow: 'shadow-[0_0_25px_rgba(251,146,60,0.2)]' },
  reliquia: { cor: 'text-red-400', bg: 'bg-red-900/10', border: 'border-red-500/60', glow: 'shadow-[0_0_30px_rgba(239,68,68,0.3)]' },
  'reliquia da criacao': { cor: 'text-fuchsia-300', bg: 'bg-fuchsia-900/10', border: 'border-fuchsia-500/60', glow: 'shadow-[0_0_35px_rgba(232,121,249,0.35)]' },
};

const paraBackend = (item: IInventoryItem) => ({
  item_id: item.id,
  titulo: item.nome,
  quantidade: Math.max(1, item.quantidade || 1),
  dados: {
    ...item._dadosOriginais,
    categoria: item.categoria,
    espacos: item.espacos,
    localArmazenamento: item.localArmazenamento,
    descricao: item.descricao,
    
    raridade: item.raridade,
    equipado: item.equipado,
    favorito: item.favorito,
    durabilidadeAtual: item.durabilidadeAtual,
    durabilidadeMaxima: item.durabilidadeMaxima,
    modificacoes: item.modificacoes,

    dano: item.dano,
    margem_ameaca: item.margemAmeaca,
    multiplicador_critico: item.multiplicadorCritico,
    critico: item.categoria === 'arma'
      ? formatarCritico(item.margemAmeaca, item.multiplicadorCritico)
      : item._dadosOriginais.critico,
    municaoAtual: item.municaoAtual,
    municaoMaxima: item.municaoMaxima,
    defesa: item.defesa,
    penalidade: item.penalidade,
    combustivelAtual: item.combustivelAtual,
    combustivelMaximo: item.combustivelMaximo,
    efeito: item.efeito,
    ordem: item.ordem
  },
});

const paraUI = (item: any, index: number): IInventoryItem => ({
  id: item.item_id,
  nome: item.titulo,
  categoria: item.dados?.categoria || 'geral',
  quantidade: item.quantidade,
  espacos: item.dados?.espacos ?? 1,
  localArmazenamento: item.dados?.localArmazenamento || 'Mochila',
  descricao: item.dados?.descricao || '',
  
  raridade: normalizarRaridadeChave(item.dados?.raridade),
  equipado: item.dados?.equipado || false,
  favorito: item.dados?.favorito || false,
  durabilidadeAtual: item.dados?.durabilidadeAtual || 0,
  durabilidadeMaxima: item.dados?.durabilidadeMaxima || 0,
  modificacoes: item.dados?.modificacoes || [],

  dano: item.dados?.dano || '',
  margemAmeaca: Number(item.dados?.margem_ameaca ?? item.dados?.margemAmeaca ?? 20),
  multiplicadorCritico: Number(item.dados?.multiplicador_critico ?? item.dados?.multiplicadorCritico ?? 2),
  municaoAtual: Number(item.dados?.municaoAtual ?? item.dados?.municao_atual) || 0,
  municaoMaxima: Number(item.dados?.municaoMaxima ?? item.dados?.municao_maxima) || 0,
  defesa: Number(item.dados?.defesa ?? String(item.dados?.bonus || '').replace('+', '')) || 0,
  penalidade: Number(item.dados?.penalidade) || 0,
  combustivelAtual: item.dados?.combustivelAtual || 0,
  combustivelMaximo: item.dados?.combustivelMaximo || 0,
  efeito: item.dados?.efeito || '',
  ordem: item.dados?.ordem ?? index,
  _dadosOriginais: item.dados && typeof item.dados === 'object' && !Array.isArray(item.dados)
    ? { ...item.dados }
    : {},
});

const ITEM_VAZIO: Omit<IInventoryItem, 'id'> = {
  nome: '',
  categoria: 'geral',
  quantidade: 1,
  espacos: 1,
  localArmazenamento: 'Mochila',
  descricao: '',
  raridade: 'comum',
  equipado: false,
  favorito: false,
  durabilidadeAtual: 10,
  durabilidadeMaxima: 10,
  modificacoes: [],
  margemAmeaca: 20,
  multiplicadorCritico: 2,
  ordem: 0,
  _dadosOriginais: {},
};

const itemEhManual = (item: IInventoryItem): boolean => (
  item.id.startsWith('manual:') || item._dadosOriginais.origem === 'manual'
);

export const AbaInventario = ({ character }: { character: any; onUpdate?: any }) => {
  const mutateEconomy = useCharacterStore((state) => state.mutateEconomy);
  const papelCampanha = useAuthStore((state) => state.campanhaAtiva?.papel);
  const podeGerenciarEconomia = papelCampanha === 'mestre'
    || papelCampanha === 'assistente';
  const [busca, setBusca] = useState('');
  const [moedasReveladas, setMoedasReveladas] = useState<string[]>([]);
  
  const [modalAberto, setModalAberto] = useState(false);
  const [editandoId, setEditandoId] = useState<string | null>(null);
  const [form, setForm] = useState<typeof ITEM_VAZIO>(ITEM_VAZIO);

  const inventario: IInventoryItem[] = (character.inventarioCentral || [])
    .map(paraUI)
    .sort((a: IInventoryItem, b: IInventoryItem) => a.ordem - b.ordem);
  const resumoEquipamento = resumirEquipamentos(character.inventarioCentral || [], character.ficha || {});

  const carteiraSalva: { moeda: string; saldo: number; simbolo?: string }[] =
    character.carteira?.length ? character.carteira : [{ moeda: 'Lunaris', saldo: 0 }];

  // Moedas reveladas pelo "+ MOEDA" mas ainda sem saldo != 0: mantidas só no
  // estado local. Um delta 0 nunca vira operação de economia (nem faria
  // sentido virar: não há saldo pra ajustar), então persistir isso exigiria
  // uma chamada à parte só pra criar a linha. Assim que o saldo muda de fato,
  // o ajuste normal cria a linha no servidor e ela passa a vir por aqui.
  const carteira: { moeda: string; saldo: number; simbolo?: string }[] = [
    ...carteiraSalva,
    ...moedasReveladas
      .filter((moeda) => !carteiraSalva.some((item) => item.moeda === moeda))
      .map((moeda) => ({ moeda, saldo: 0 })),
  ];

  const moedasDisponiveis = ['Lunaris', 'Solares', 'Fragmentos de Estrela', 'Créditos Sombrios'];
  const moedasNaCarteira = carteira.map(m => m.moeda);
  const moedasFaltantes = moedasDisponiveis.filter(m => !moedasNaCarteira.includes(m));

  const quantidadeSomenteLeitura = Boolean(
    editandoId
    && !podeGerenciarEconomia
    && inventario.some((item) => item.id === editandoId && !itemEhManual(item)),
  );

  const locaisUnicos = Array.from(new Set(inventario.map(i => i.localArmazenamento || 'Mochila'))).sort((a, b) => a.localeCompare(b));

  const mutarInventario = (updater: (atual: IInventoryItem[]) => IInventoryItem[]) => {
    void mutateEconomy(character.id, (current) => {
      const atual = current.inventario
        .map(paraUI)
        .sort((a: IInventoryItem, b: IInventoryItem) => a.ordem - b.ordem);
      const comOrdem = updater(atual).map((item, idx) => ({ ...item, ordem: idx }));
      return {
        inventario: comOrdem.map(paraBackend),
        carteira: current.carteira.length ? current.carteira : [{ moeda: 'Lunaris', saldo: 0 }],
      };
    });
  };

  const setCampo = (campo: keyof typeof ITEM_VAZIO, valor: any) => {
    setForm((prev) => ({ ...prev, [campo]: valor }));
  };

  const abrirNovo = () => {
    setEditandoId(null);
    setForm(ITEM_VAZIO);
    setModalAberto(true);
  };

  const abrirEdicao = (item: IInventoryItem) => {
    setEditandoId(item.id);
    const { id, ...rest } = item;
    setForm({ ...ITEM_VAZIO, ...rest });
    setModalAberto(true);
  };

  const fecharModal = () => setModalAberto(false);

  const handleSalvar = () => {
    if (!form.nome?.trim()) return;

    const itemAtual = editandoId
      ? inventario.find((item) => item.id === editandoId)
      : undefined;
    const quantidadeInformada = Math.max(1, Math.trunc(Number(form.quantidade) || 1));
    const quantidade = itemAtual && !podeGerenciarEconomia && !itemEhManual(itemAtual)
      ? itemAtual.quantidade
      : quantidadeInformada;

    const critico = normalizarCriticoBalanceado(form.margemAmeaca, form.multiplicadorCritico);
    const normalizado: IInventoryItem = {
      id: editandoId || createManualItemId(),
      nome: form.nome.trim(),
      categoria: form.categoria,
      quantidade,
      espacos: Math.max(0, Number(form.espacos) || 0),
      localArmazenamento: form.localArmazenamento?.trim() || 'Mochila',
      descricao: form.descricao?.trim() || '',
      
      raridade: form.raridade,
      equipado: form.equipado,
      favorito: form.favorito,
      durabilidadeAtual: Number(form.durabilidadeAtual) || 0,
      durabilidadeMaxima: Number(form.durabilidadeMaxima) || 0,
      modificacoes: form.modificacoes,

      dano: form.dano,
      margemAmeaca: critico.margemAmeaca,
      multiplicadorCritico: critico.multiplicadorCritico,
      municaoAtual: Number(form.municaoAtual) || 0,
      municaoMaxima: Number(form.municaoMaxima) || 0,
      defesa: Number(form.defesa) || 0,
      penalidade: Number(form.penalidade) || 0,
      combustivelAtual: Number(form.combustivelAtual) || 0,
      combustivelMaximo: Number(form.combustivelMaximo) || 0,
      efeito: form.efeito,
      ordem: form.ordem ?? 0,
      _dadosOriginais: { ...form._dadosOriginais },
    };

    if (editandoId) {
      mutarInventario((atual) => atual.map((item) => (
        item.id === editandoId
          ? { ...normalizado, _dadosOriginais: { ...item._dadosOriginais } }
          : item
      )));
    } else {
      mutarInventario((atual) => [...atual, normalizado]);
    }
    setModalAberto(false);
  };

  const handleRemoveItem = (id: string, nome: string) => {
    if (window.confirm(`Remover o item "${nome}"?`)) {
      mutarInventario((atual) => atual.filter((item) => item.id !== id));
    }
  };

  const handleAjustarQtd = (id: string, delta: number) => {
    const item = inventario.find((candidate) => candidate.id === id);
    if (!item || (delta > 0 && !podeGerenciarEconomia && !itemEhManual(item))) return;
    mutarInventario((atual) => atual.map((item) => (
      item.id === id ? { ...item, quantidade: Math.max(1, item.quantidade + delta) } : item
    )));
  };

  const handleAjustarStatusInterno = (id: string, field: 'municaoAtual' | 'combustivelAtual' | 'durabilidadeAtual', maxField: 'municaoMaxima' | 'combustivelMaximo' | 'durabilidadeMaxima', delta: number) => {
    mutarInventario((atual) => atual.map((item) => {
      if (item.id !== id) return item;
      const maxima = item[maxField] || 1;
      const nova = Math.max(0, Math.min(maxima, (item[field] || 0) + delta));
      return { ...item, [field]: nova };
    }));
  };

  const toggleEquipar = (id: string) => {
    mutarInventario((atual) => atual.map((item) => (
      item.id === id ? { ...item, equipado: !item.equipado } : item
    )));
  };

  const toggleFavorito = (id: string) => {
    mutarInventario((atual) => {
      // Altera e joga pro topo do array automaticamente
      let modificado = atual.map((item) => (
        item.id === id ? { ...item, favorito: !item.favorito } : item
      ));
      const itemTarget = modificado.find((item) => item.id === id);
      if (itemTarget?.favorito) {
        modificado = [itemTarget, ...modificado.filter((item) => item.id !== id)];
      }
      return modificado;
    });
  };

  const handleReorder = (local: string, reorderedGroup: IInventoryItem[]) => {
    const idsReordenados = reorderedGroup.map((item) => item.id);
    mutarInventario((atual) => {
      const porId = new Map(atual.map((item) => [item.id, item]));
      const vistos = new Set(idsReordenados);
      const grupoAtualizado = idsReordenados.flatMap((id) => {
        const item = porId.get(id);
        return item?.localArmazenamento === local ? [item] : [];
      });
      const restantesDoLocal = atual.filter((item) => (
        item.localArmazenamento === local && !vistos.has(item.id)
      ));
      const outrosLocais = atual.filter((item) => item.localArmazenamento !== local);
      return [...grupoAtualizado, ...restantesDoLocal, ...outrosLocais];
    });
  };

  const handleAjustarMoeda = (moeda: string, delta: number) => {
    if (!podeGerenciarEconomia) return;
    void mutateEconomy(character.id, (current) => {
      const carteiraAtual = current.carteira.length
        ? current.carteira
        : [{ moeda: 'Lunaris', saldo: 0 }];
      const atual = carteiraAtual.find((item) => item.moeda === moeda);
      const novoSaldo = Math.max(0, (atual?.saldo || 0) + delta);
      const proximaCarteira = atual
        ? carteiraAtual.map((item) => (item.moeda === moeda ? { ...item, saldo: novoSaldo } : item))
        : [...carteiraAtual, { moeda, saldo: novoSaldo }];
      return { carteira: proximaCarteira, inventario: current.inventario };
    });
  };

  const addModificacao = () => {
    setForm(prev => ({
      ...prev,
      modificacoes: [...prev.modificacoes, { id: Date.now().toString(), nome: '', efeito: '', tipo: 'comum' }]
    }));
  };

  const removeModificacao = (id: string) => {
    setForm(prev => ({
      ...prev,
      modificacoes: prev.modificacoes.filter(m => m.id !== id)
    }));
  };

  const updateModificacao = (id: string, field: keyof IModificacao, value: any) => {
    setForm(prev => ({
      ...prev,
      modificacoes: prev.modificacoes.map(m => m.id === id ? { ...m, [field]: value } : m)
    }));
  };

  const getIconForType = (type: string) => {
    switch (type?.toLowerCase()) {
      case 'arma': return <Sword size={16} />;
      case 'armadura': return <Shield size={16} />;
      case 'consumivel': return <Box size={16} />;
      case 'veiculo': return <Car size={16} />;
      default: return <Backpack size={16} />;
    }
  };

  const inventarioVisivel = inventario.filter((item) =>
    !busca || item.nome?.toLowerCase().includes(busca.toLowerCase()) || item.localArmazenamento?.toLowerCase().includes(busca.toLowerCase())
  );

  const inventarioAgrupadoPorLocal = locaisUnicos.reduce((acc, local) => {
    acc[local] = inventarioVisivel.filter(i => i.localArmazenamento === local);
    return acc;
  }, {} as Record<string, IInventoryItem[]>);

  const espacosUsados = inventario.reduce(
    (soma, item) => soma + (item.espacos || 0) * (item.quantidade || 1),
    0
  );

  return (
    <div className="space-y-6">

      {/* HEADER E CARGA */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-6">
        <div className="md:col-span-3 bg-[#0f0e15] border border-white/5 rounded-2xl p-6 flex flex-col justify-between">
          <div>
            <h2 className="text-2xl font-bold text-white mb-1" style={{ fontFamily: 'Cinzel, serif' }}>Inventário</h2>
            <p className="text-gray-400 text-sm">Gerencie seus equipamentos, consumíveis, veículos e carga.</p>
          </div>

          <div className="mt-6 flex justify-between text-sm">
            <span className="text-gray-400 font-bold uppercase tracking-widest">Carga Atual</span>
            <span className={`font-mono ${resumoEquipamento.sobrecarregado ? 'text-red-400' : 'text-white'}`}>{espacosUsados.toFixed(1)} / {resumoEquipamento.capacidade} <span className="text-gray-500 text-xs">ESPAÇOS</span></span>
          </div>
          <div className="mt-3 grid grid-cols-2 gap-2 text-xs text-gray-400"><span>Defesa equipada: <strong className="text-sky-300">+{resumoEquipamento.defesaEquipamento}</strong></span><span>Penalidade: <strong className="text-orange-300">-{resumoEquipamento.penalidadeArmadura}</strong></span></div>
          {resumoEquipamento.sobrecarregado && <p className="mt-2 text-xs font-bold text-red-300">Sobrecarregado: movimento reduzido em 3 m e desvantagem em testes físicos.</p>}
          {resumoEquipamento.conflitos.map((conflito) => <p key={conflito} className="mt-1 text-xs text-amber-300">{conflito}</p>)}
        </div>

        <div className="md:col-span-2 bg-[#0f0e15] border border-white/5 rounded-2xl p-4 flex flex-col gap-3">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <Coins size={18} className="text-primary" />
              <h3 className="text-white font-bold tracking-widest uppercase text-xs">Carteira</h3>
            </div>
            {podeGerenciarEconomia && moedasFaltantes.length > 0 && (
              <Select
                value=""
                onChange={(moeda) => setMoedasReveladas((prev) => [...prev, moeda])}
                placeholder="+ Moeda"
                options={moedasFaltantes.map((m) => ({ value: m, label: m }))}
                className="w-32 !py-1.5 text-xs"
              />
            )}
          </div>
          <div className="flex flex-col gap-2">
            {carteira.map((m) => {
              const tema = getCurrencyTheme(m.moeda);
              return (
                <div
                  key={m.moeda}
                  className={`flex items-center justify-between gap-2 rounded-xl border ${tema.borda} ${tema.fundo} px-3 py-2`}
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <span className={`text-[9px] font-black tracking-wider px-1.5 py-1 rounded bg-black/40 shrink-0 ${tema.texto}`}>
                      {getCurrencySymbol(m.moeda as MoedaTipo)}
                    </span>
                    <span className="text-xs text-gray-300 truncate">{m.moeda}</span>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    {podeGerenciarEconomia && (
                      <button
                        onClick={() => handleAjustarMoeda(m.moeda, -1)}
                        aria-label={`Reduzir saldo de ${m.moeda}`}
                        className="w-6 h-6 rounded bg-black/40 border border-white/10 text-gray-400 hover:text-white flex items-center justify-center transition-colors"
                      >
                        <Minus size={11} />
                      </button>
                    )}
                    <span className={`w-14 text-center text-base font-mono font-bold ${tema.texto}`}>{m.saldo}</span>
                    {podeGerenciarEconomia && (
                      <button
                        onClick={() => handleAjustarMoeda(m.moeda, 1)}
                        aria-label={`Aumentar saldo de ${m.moeda}`}
                        className="w-6 h-6 rounded bg-black/40 border border-white/10 text-gray-400 hover:text-white flex items-center justify-center transition-colors"
                      >
                        <Plus size={11} />
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* FERRAMENTAS */}
      <div className="flex gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={18} />
          <input
            type="text"
            placeholder="Buscar item ou local..."
            value={busca}
            onChange={e => setBusca(e.target.value)}
            className="w-full bg-[#0f0e15] border border-white/5 rounded-xl py-3 pl-10 pr-4 text-white focus:border-[#c7a44c]/50 outline-none text-sm"
          />
        </div>
        <button
          onClick={abrirNovo}
          className="px-6 py-3 rounded-xl border border-[#c7a44c]/30 text-[#c7a44c] font-bold text-sm hover:bg-[#c7a44c]/10 transition-colors border-dashed"
        >
          + Adicionar Item
        </button>
      </div>

      {/* LISTAS POR LOCAL */}
      {locaisUnicos.map(local => {
        const itensDesteLocal = inventarioAgrupadoPorLocal[local];
        if (!itensDesteLocal || itensDesteLocal.length === 0) return null;

        const cargaLocal = itensDesteLocal.reduce((soma, item) => soma + (item.espacos || 0) * (item.quantidade || 1), 0);

        return (
          <div key={local} className="bg-[#0f0e15] border border-white/5 rounded-2xl overflow-hidden p-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-white font-bold uppercase tracking-widest text-sm flex items-center gap-2">
                <Backpack size={16} className="text-gray-500" /> {local}
              </h3>
              <span className="text-xs text-gray-500 font-mono">{cargaLocal.toFixed(1)} espaços</span>
            </div>
            
            <Reorder.Group axis="y" values={itensDesteLocal} onReorder={(novos) => handleReorder(local, novos)} className="flex flex-col gap-4">
              {itensDesteLocal.map((item) => {
                const conf = RARIDADES_CONFIG[item.raridade] || RARIDADES_CONFIG.comum;
                const catColor = CATEGORY_COLORS[item.categoria] || CATEGORY_COLORS.geral;
                
                return (
                  <Reorder.Item
                    value={item}
                    key={item.id}
                    className={`${conf.bg} border ${conf.border} ${conf.glow} rounded-xl p-4 flex flex-col gap-3 transition-colors duration-300 group`}
                  >
                    <div className="flex gap-4">
                      {/* Área de Ícone, Favorito e Arraste */}
                      <div className="flex flex-col gap-2 items-center">
                        <div className="flex gap-1 mb-1">
                          <button onClick={() => toggleFavorito(item.id)} className={`transition-colors ${item.favorito ? 'text-yellow-400 drop-shadow-[0_0_8px_rgba(250,204,21,0.5)]' : 'text-gray-600 hover:text-gray-400'}`}>
                            <Star size={16} fill={item.favorito ? 'currentColor' : 'none'} />
                          </button>
                          <div className="cursor-grab active:cursor-grabbing text-gray-600 hover:text-gray-400 p-0.5">
                            <GripVertical size={16} />
                          </div>
                        </div>
                        <div className={`w-14 h-14 rounded-lg bg-black/40 border ${conf.border} flex items-center justify-center ${conf.cor} shadow-inner`}>
                          {getIconForType(item.categoria)}
                        </div>
                        <button 
                          onClick={() => toggleEquipar(item.id)}
                          className={`w-full py-1 rounded text-[9px] font-bold uppercase tracking-wider transition-all duration-300 border ${
                            item.equipado 
                              ? 'bg-[#c7a44c]/20 border-[#c7a44c]/50 text-[#c7a44c] shadow-[0_0_10px_rgba(199,164,76,0.2)]' 
                              : 'bg-black/40 border-white/10 text-gray-500 hover:border-white/30 hover:text-gray-300'
                          }`}
                        >
                          {item.equipado ? 'Equipado' : 'Guardado'}
                        </button>
                      </div>
                      
                      {/* Lado Direito (Info) */}
                      <div className="flex-1 flex flex-col pt-1">
                        <div className="flex justify-between items-start mb-1 gap-2">
                          <div className="flex-1">
                            <h4 className="text-white font-bold text-base leading-tight mb-1">{item.nome}</h4>
                            <div className="flex gap-2 items-center flex-wrap">
                              <span className={`text-[9px] px-1.5 py-0.5 bg-black/40 rounded border border-white/5 uppercase font-bold tracking-wider ${conf.cor}`}>
                                {rotuloRaridadeChave(item.raridade)}
                              </span>
                              <span className={`text-[9px] px-1.5 py-0.5 rounded border uppercase font-bold tracking-wider ${catColor}`}>
                                {item.categoria}
                              </span>
                            </div>
                          </div>
                          
                          <div className="text-right flex flex-col items-end gap-1.5">
                            <div className="flex gap-2 items-center">
                              <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                                <button onClick={() => abrirEdicao(item)} className="w-6 h-6 rounded bg-blue-500/10 border border-blue-500/20 text-blue-400 hover:bg-blue-500/20 flex items-center justify-center transition-colors">
                                  <Pencil size={11} />
                                </button>
                                <button onClick={() => handleRemoveItem(item.id, item.nome)} className="w-6 h-6 rounded bg-red-500/10 border border-red-500/20 text-red-400 hover:bg-red-500/20 flex items-center justify-center transition-colors">
                                  <Trash2 size={11} />
                                </button>
                              </div>
                              <div className="flex items-center gap-1 bg-black/40 rounded border border-white/10 p-0.5">
                                <button onClick={() => handleAjustarQtd(item.id, -1)} className="w-5 h-5 flex items-center justify-center text-gray-500 hover:text-white transition-colors"><Minus size={10}/></button>
                                <span className="w-6 text-center text-sm font-bold text-gray-200 font-mono">{item.quantidade}</span>
                                <button
                                  onClick={() => handleAjustarQtd(item.id, 1)}
                                  disabled={!podeGerenciarEconomia && !itemEhManual(item)}
                                  title={!podeGerenciarEconomia && !itemEhManual(item) ? 'A quantidade adquirida é validada pelo servidor.' : undefined}
                                  className="w-5 h-5 flex items-center justify-center text-gray-500 hover:text-white transition-colors disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:text-gray-500"
                                >
                                  <Plus size={10}/>
                                </button>
                              </div>
                            </div>
                            <span className="text-[10px] text-gray-500 font-mono font-bold mr-1">{item.espacos} kg</span>
                          </div>
                        </div>

                        {/* Status Específicos e Durabilidade */}
                        <div className="mt-3 flex flex-wrap gap-2">
                          {item.durabilidadeMaxima > 0 && (
                            <div className="flex items-center gap-2 text-xs bg-black/30 border border-white/5 px-2 py-1 rounded">
                              <Wrench size={12} className={item.durabilidadeAtual < item.durabilidadeMaxima / 3 ? 'text-red-400' : 'text-gray-400'} />
                              <div className="flex items-center gap-1 font-mono">
                                <button onClick={() => handleAjustarStatusInterno(item.id, 'durabilidadeAtual', 'durabilidadeMaxima', -1)} className="text-gray-500 hover:text-white"><Minus size={10}/></button>
                                <span className={item.durabilidadeAtual < item.durabilidadeMaxima / 3 ? 'text-red-400 font-bold' : 'text-gray-300'}>{item.durabilidadeAtual} / {item.durabilidadeMaxima}</span>
                                <button onClick={() => handleAjustarStatusInterno(item.id, 'durabilidadeAtual', 'durabilidadeMaxima', 1)} className="text-gray-500 hover:text-white"><Plus size={10}/></button>
                              </div>
                            </div>
                          )}

                          {item.categoria === 'arma' && item.municaoMaxima ? (
                            <div className="flex items-center gap-2 text-xs bg-black/30 border border-white/5 px-2 py-1 rounded">
                              <span className="text-gray-400 uppercase font-bold tracking-wider text-[9px]">Munição</span>
                              <div className="flex items-center gap-1 font-mono">
                                <button onClick={() => handleAjustarStatusInterno(item.id, 'municaoAtual', 'municaoMaxima', -1)} className="text-gray-500 hover:text-white"><Minus size={10}/></button>
                                <span className="text-gray-300">{item.municaoAtual} / {item.municaoMaxima}</span>
                                <button onClick={() => handleAjustarStatusInterno(item.id, 'municaoAtual', 'municaoMaxima', 1)} className="text-gray-500 hover:text-white"><Plus size={10}/></button>
                              </div>
                            </div>
                          ) : null}

                          {item.dano && <div className="text-xs text-gray-300 bg-black/30 border border-white/5 px-2 py-1 rounded">Dano: <span className="font-mono text-[#c7a44c]">{item.dano}</span></div>}
                          {item.categoria === 'arma' && (
                            <div className="text-xs text-gray-300 bg-black/30 border border-yellow-500/20 px-2 py-1 rounded">
                              Crítico: <span className="font-mono text-yellow-400">{formatarCritico(item.margemAmeaca, item.multiplicadorCritico)}</span>
                            </div>
                          )}
                          {item.defesa != null && item.defesa > 0 && <div className="text-xs text-gray-300 bg-black/30 border border-white/5 px-2 py-1 rounded">Defesa: <span className="font-mono text-blue-400">+{item.defesa}</span></div>}
                        </div>

                        {/* Modificações */}
                        {item.modificacoes && item.modificacoes.length > 0 && (
                          <div className="mt-3 flex flex-col gap-1.5">
                            {item.modificacoes.map(mod => (
                              <div key={mod.id} className={`flex items-start gap-2 text-xs p-1.5 rounded bg-black/20 border ${mod.tipo === 'especial' ? 'border-[#c7a44c]/30' : 'border-white/5'}`}>
                                {mod.tipo === 'especial' ? <Sparkles size={12} className="text-[#c7a44c] mt-0.5 shrink-0" /> : <Wrench size={12} className="text-gray-500 mt-0.5 shrink-0" />}
                                <div>
                                  <span className={`font-bold mr-1 ${mod.tipo === 'especial' ? 'text-[#c7a44c]' : 'text-gray-300'}`}>{mod.nome}:</span>
                                  <span className="text-gray-400">{mod.efeito}</span>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}

                        {item.descricao && <p className="text-xs text-gray-500 italic mt-3 line-clamp-2">{item.descricao}</p>}

                      </div>
                    </div>
                  </Reorder.Item>
                );
              })}
            </Reorder.Group>
          </div>
        );
      })}
      
      {inventarioVisivel.length === 0 && (
        <div className="bg-[#0f0e15] border border-white/5 rounded-2xl overflow-hidden py-12 text-center">
          <Backpack size={48} className="text-gray-700 mx-auto mb-4 opacity-50" />
          <p className="text-gray-500 font-bold uppercase tracking-widest">Inventário Vazio</p>
        </div>
      )}

      {/* MODAL DE EDIÇÃO */}
      <FichaModal
        isOpen={modalAberto}
        onClose={fecharModal}
        title={editandoId ? 'Editar Item' : 'Novo Item'}
      >
        <div className="flex flex-col gap-4">
          <LabeledInput label="Nome do Item" value={form.nome} placeholder="Ex.: Espada Longa, Corda 10m" onChange={(v: string) => setCampo('nome', v)} />

          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1">
              <label className="text-[10px] uppercase tracking-widest text-gray-500 font-bold">Raridade</label>
              <Select
                value={form.raridade}
                onChange={(v) => setCampo('raridade', v)}
                className={`w-full uppercase tracking-widest font-bold ${RARIDADES_CONFIG[form.raridade as keyof typeof RARIDADES_CONFIG]?.cor || 'text-gray-400'}`}
                options={[
                  { value: 'comum', label: 'Comum' },
                  { value: 'incomum', label: 'Incomum' },
                  { value: 'raro', label: 'Raro' },
                  { value: 'epico', label: 'Épico' },
                  { value: 'lendario', label: 'Lendário' },
                  { value: 'reliquia', label: 'Relíquia' },
                  { value: 'reliquia da criacao', label: 'Relíquia da Criação' },
                ]}
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-[10px] uppercase tracking-widest text-gray-500 font-bold">Categoria</label>
              <Select
                value={form.categoria}
                onChange={(v) => setCampo('categoria', v)}
                className="w-full"
                options={[
                  { value: 'arma', label: 'Arma' },
                  { value: 'armadura', label: 'Armadura' },
                  { value: 'consumivel', label: 'Consumível' },
                  { value: 'veiculo', label: 'Veículo' },
                  { value: 'geral', label: 'Geral' },
                ]}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <LabeledInput label="Local de Armazenamento" value={form.localArmazenamento} placeholder="Ex.: Mochila, Mão Direita" onChange={(v: string) => setCampo('localArmazenamento', v)} />
            <div className="flex gap-2">
              <LabeledInput
                label="Quantidade"
                value={String(form.quantidade ?? '')}
                readOnly={quantidadeSomenteLeitura}
                onChange={(v: string) => setCampo('quantidade', v)}
              />
              <LabeledInput label="Peso (Kg)" value={String(form.espacos ?? '')} onChange={(v: string) => setCampo('espacos', v)} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 border-t border-white/5 pt-4 mt-2">
            <LabeledInput label="Durabilidade Máxima (0 = infinito)" value={String(form.durabilidadeMaxima ?? '')} onChange={(v: string) => setCampo('durabilidadeMaxima', v)} />
            <LabeledInput label="Durabilidade Atual" value={String(form.durabilidadeAtual ?? '')} onChange={(v: string) => setCampo('durabilidadeAtual', v)} />
          </div>

          {/* CAMPOS ESPECÍFICOS */}
          {form.categoria === 'arma' && (
            <div className="border-t border-white/5 pt-4 grid grid-cols-2 md:grid-cols-5 gap-3">
              <LabeledInput label="Dano" value={form.dano || ''} placeholder="Ex.: 1d8+2" onChange={(v: string) => setCampo('dano', v)} />
              <LabeledInput label="Munição Atual" value={String(form.municaoAtual ?? '')} onChange={(v: string) => setCampo('municaoAtual', v)} />
              <LabeledInput label="Munição Máx." value={String(form.municaoMaxima ?? '')} onChange={(v: string) => setCampo('municaoMaxima', v)} />
              <div>
                <label className="text-[10px] uppercase tracking-widest text-gray-500 font-bold mb-1 block">Margem</label>
                <Select
                  value={String(form.margemAmeaca ?? 20)}
                  onChange={(v) => setForm((prev) => ({
                    ...prev,
                    margemAmeaca: Number(v),
                    multiplicadorCritico: v === '20' ? prev.multiplicadorCritico : 2,
                  }))}
                  options={['20', '19', '18'].map((value) => ({ value, label: value === '20' ? '20' : `${value}-20` }))}
                />
              </div>
              <div>
                <label className="text-[10px] uppercase tracking-widest text-gray-500 font-bold mb-1 block">Crítico</label>
                <Select
                  value={String(form.multiplicadorCritico ?? 2)}
                  onChange={(v) => setForm((prev) => ({
                    ...prev,
                    multiplicadorCritico: Number(v),
                    margemAmeaca: v === '2' ? prev.margemAmeaca : 20,
                  }))}
                  options={['2', '3', '4'].map((value) => ({ value, label: `x${value}` }))}
                />
              </div>
            </div>
          )}

          {form.categoria === 'armadura' && (
            <div className="border-t border-white/5 pt-4 grid grid-cols-2 gap-3">
              <LabeledInput label="Defesa" value={String(form.defesa ?? '')} onChange={(v: string) => setCampo('defesa', v)} />
              <LabeledInput label="Penalidade" value={String(form.penalidade ?? '')} onChange={(v: string) => setCampo('penalidade', v)} />
            </div>
          )}

          {form.categoria === 'consumivel' && (
            <div className="border-t border-white/5 pt-4">
              <LabeledInput label="Efeito" value={form.efeito || ''} placeholder="Ex.: Cura 2d4+2 PV" onChange={(v: string) => setCampo('efeito', v)} />
            </div>
          )}

          {/* MODIFICAÇÕES */}
          <div className="border-t border-white/5 pt-4">
            <div className="flex justify-between items-center mb-3">
              <label className="text-[10px] uppercase tracking-widest text-gray-500 font-bold">Modificações ({form.modificacoes.length})</label>
              <button onClick={addModificacao} className="text-xs font-bold text-[#c7a44c] hover:text-white transition-colors flex items-center gap-1">
                <Plus size={12} /> Adicionar
              </button>
            </div>
            
            <div className="flex flex-col gap-3">
              {form.modificacoes.map((mod) => (
                <div key={mod.id} className="bg-black/30 border border-white/5 rounded-lg p-3 flex gap-3 items-start">
                  <div className="flex-1 flex flex-col gap-2">
                    <div className="flex gap-2">
                      <div className="flex-1">
                         <LabeledInput label="Nome do Mod" value={mod.nome} placeholder="Ex: Cano Longo" onChange={(v: string) => updateModificacao(mod.id, 'nome', v)} />
                      </div>
                      <div className="w-32">
                        <label className="text-[10px] uppercase tracking-widest text-gray-500 font-bold mb-1 block">Tipo</label>
                        <Select
                          value={mod.tipo}
                          onChange={(v) => updateModificacao(mod.id, 'tipo', v)}
                          className="w-full text-xs"
                          options={[
                            { value: 'comum', label: 'Comum' },
                            { value: 'especial', label: 'Especial' },
                          ]}
                        />
                      </div>
                    </div>
                    <LabeledInput label="Efeito Descritivo" value={mod.efeito} placeholder="Ex: +1 dado de dano de fogo" onChange={(v: string) => updateModificacao(mod.id, 'efeito', v)} />
                  </div>
                  <button onClick={() => removeModificacao(mod.id)} className="w-7 h-7 rounded bg-red-500/10 border border-red-500/20 text-red-400 hover:bg-red-500/20 flex items-center justify-center shrink-0 mt-[22px]">
                    <Trash2 size={14} />
                  </button>
                </div>
              ))}
              {form.modificacoes.length === 0 && (
                <div className="text-center text-gray-600 text-xs py-4 border border-dashed border-white/5 rounded-lg">
                  Nenhuma modificação neste item.
                </div>
              )}
            </div>
          </div>

          <div className="flex flex-col gap-1 border-t border-white/5 pt-4">
            <label className="text-[10px] uppercase tracking-widest text-gray-500 font-bold">Descrição / Lore</label>
            <textarea
              value={form.descricao || ''}
              onChange={e => setCampo('descricao', e.target.value)}
              placeholder="História do item, regras específicas..."
              rows={3}
              className="bg-[#121118] border border-white/5 rounded-md px-3 py-2.5 text-sm text-gray-300 focus:outline-none focus:border-[#c7a44c]/50 transition-colors placeholder:text-gray-700 resize-none"
            />
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-white/5 mt-2">
            <button
              onClick={fecharModal}
              className="px-5 py-2.5 rounded-lg border border-white/10 text-gray-400 hover:text-white hover:border-white/30 text-sm font-bold transition-colors"
            >
              Cancelar
            </button>
            <button
              onClick={handleSalvar}
              disabled={!form.nome?.trim()}
              className="px-5 py-2.5 rounded-lg bg-[#c7a44c]/10 border border-[#c7a44c]/30 text-[#c7a44c] hover:bg-[#c7a44c]/20 text-sm font-bold transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {editandoId ? 'Salvar Alterações' : 'Adicionar Item'}
            </button>
          </div>
        </div>
      </FichaModal>

    </div>
  );
};
