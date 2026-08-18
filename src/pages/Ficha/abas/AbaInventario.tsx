import { useDeferredValue, useMemo, useState } from 'react';
import { Search, Backpack, Coins, Shield, Sword, Box, Minus, Plus, Car, Trash2, Pencil, Wrench, Star, GripVertical, SlidersHorizontal, ListFilter, Cpu, Apple } from 'lucide-react';
import { Reorder } from 'framer-motion';
import { useCharacterStore } from '../../../store/useCharacterStore';
import { useAuthStore } from '../../../store/useAuthStore';
import { createManualItemId } from '../../../services/economyOperations';
import { FichaModal } from '../components/FichaModal';
import { LabeledInput } from '../components/SharedFichaComponents';
import { Select } from '../../../components/ui/Select';
import { formatarCritico, normalizarCriticoBalanceado } from '../../../services/criticalService';
import {
  normalizarEfeitosEquipamento,
  normalizarModificacoesEquipamento,
  resumirEquipamentos,
  type IEfeitoEquipamento,
  type IModificacaoEquipamento,
} from '../../../services/equipamentoService';
import { PERICIAS_CATALOGO } from '../../../services/catalogoService';
import { ModificacoesItemModal, RaridadeItemModal } from '../components/ItemEffectsModals';
import {
  getCurrencySymbol,
  getCurrencyTheme,
  classeTextoRaridade,
  ItemRaridadeChave,
  MoedaTipo,
  normalizarRaridadeChave,
  normalizarCategoriaInventarioLoja,
  rotuloRaridadeChave,
} from '../../../services/lojaCatalogService';
import { EFEITOS_POR_MODIFICACAO_MAXIMOS, obterRegraRaridade } from '../../../../data/regras/raridadesEquipamentos';
import { personagensApi } from '../../../services/personagensApi';

interface IInventoryItem {
  id: string;
  nome: string;
  categoria: 'arma' | 'armadura' | 'consumivel' | 'veiculo' | 'modulo-veicular' | 'implante' | 'propriedade' | 'geral';
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
  modificacoes: IModificacaoEquipamento[];
  efeitosRaridade: IEfeitoEquipamento[];

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
  
  // Novos veiculos
  resistencia?: number;
  deslocamentoMetros?: number;
  manobrabilidade?: number;
  coberturaOcupantes?: string;
  capacidade?: number;
  tripulacaoMinima?: number;
  sistemasAtivosMaximos?: number;
  espacosBase?: number;
  
  ordem: number;
  /** Metadados recebidos do backend que esta UI ainda não conhece. */
  _dadosOriginais: Record<string, unknown>;
}

const CATEGORY_COLORS: Record<string, string> = {
  arma: 'text-orange-400 border-orange-500/30 bg-orange-900/20',
  armadura: 'text-blue-400 border-blue-500/30 bg-blue-900/20',
  consumivel: 'text-emerald-400 border-emerald-500/30 bg-emerald-900/20',
  veiculo: 'text-amber-400 border-amber-500/30 bg-amber-900/20',
  'modulo-veicular': 'text-cyan-400 border-cyan-500/30 bg-cyan-900/20',
  geral: 'text-gray-400 border-white/10 bg-black/40',
};

const CATEGORY_ACCENTS: Record<IInventoryItem['categoria'], string> = {
  arma: 'before:bg-orange-400',
  armadura: 'before:bg-sky-400',
  consumivel: 'before:bg-emerald-400',
  veiculo: 'before:bg-amber-400',
  'modulo-veicular': 'before:bg-cyan-400',
  implante: 'before:bg-cyan-400',
  propriedade: 'before:bg-emerald-400',
  geral: 'before:bg-slate-400',
};

const CATEGORIAS_FILTRO: Array<{ value: 'todos' | IInventoryItem['categoria']; label: string }> = [
  { value: 'todos', label: 'Todos' },
  { value: 'arma', label: 'Armas' },
  { value: 'armadura', label: 'Armaduras' },
  { value: 'consumivel', label: 'Consumíveis' },
  { value: 'veiculo', label: 'Veículos' },
  { value: 'modulo-veicular', label: 'Peças e módulos' },
  { value: 'geral', label: 'Gerais' },
];

const RARIDADES_CONFIG = {
  comum: { cor: 'text-slate-300', bg: 'bg-[#121118]', border: 'border-slate-500/25', glow: '' },
  incomum: { cor: 'text-emerald-400', bg: 'bg-emerald-900/10', border: 'border-emerald-500/30', glow: 'shadow-[0_0_15px_rgba(52,211,153,0.08)]' },
  raro: { cor: 'text-blue-400', bg: 'bg-blue-900/10', border: 'border-blue-500/30', glow: 'shadow-[0_0_15px_rgba(96,165,250,0.1)]' },
  epico: { cor: 'text-purple-400', bg: 'bg-purple-900/10', border: 'border-purple-500/40', glow: 'shadow-[0_0_20px_rgba(192,132,252,0.15)]' },
  lendario: { cor: 'text-amber-400', bg: 'bg-amber-900/10', border: 'border-amber-500/50', glow: 'shadow-[0_0_25px_rgba(251,191,36,0.2)]' },
  reliquia: { cor: 'text-red-400', bg: 'bg-red-900/10', border: 'border-red-500/60', glow: 'shadow-[0_0_30px_rgba(239,68,68,0.3)]' },
  'reliquia da criacao': { cor: 'bg-gradient-to-r from-cyan-200 via-white to-fuchsia-200 bg-clip-text text-transparent', bg: 'bg-white/[0.04]', border: 'border-white/70', glow: 'shadow-[0_0_30px_rgba(255,255,255,0.22)]' },
};

const RARIDADES_OPCOES = [
  { value: 'comum', label: 'Comum' },
  { value: 'incomum', label: 'Incomum' },
  { value: 'raro', label: 'Raro' },
  { value: 'epico', label: 'Épico' },
  { value: 'lendario', label: 'Lendário' },
  { value: 'reliquia', label: 'Mítico' },
  { value: 'reliquia da criacao', label: 'Relíquia da Criação' },
].map((opcao) => ({ ...opcao, labelClassName: classeTextoRaridade(opcao.value) }));

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
    efeitosRaridade: item.efeitosRaridade,

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
    
    resistencia: item.resistencia,
    deslocamentoMetros: item.deslocamentoMetros,
    manobrabilidade: item.manobrabilidade,
    coberturaOcupantes: item.coberturaOcupantes,
    capacidade: item.capacidade,
    tripulacaoMinima: item.tripulacaoMinima,
    sistemasAtivosMaximos: item.sistemasAtivosMaximos,
    espacosBase: item.espacosBase,
    
    ordem: item.ordem
  },
});

const paraUI = (item: any, index: number): IInventoryItem => ({
  id: item.item_id,
  nome: item.titulo,
  categoria: (item.dados?.tipo === 'implante' ? 'implante' : item.dados?.tipo === 'propriedade' ? 'propriedade' : normalizarCategoriaInventarioLoja(item.dados)) || item.dados?.categoria || 'geral',
  quantidade: item.quantidade,
  espacos: item.dados?.espacos ?? 1,
  localArmazenamento: item.dados?.localArmazenamento || (item.dados?.categoria === 'veiculo' ? 'Garagem' : 'Mochila'),
  descricao: item.dados?.descricao || '',
  
  raridade: normalizarRaridadeChave(item.dados?.raridade),
  equipado: item.dados?.equipado || false,
  favorito: item.dados?.favorito || false,
  durabilidadeAtual: item.dados?.durabilidadeAtual || 0,
  durabilidadeMaxima: item.dados?.durabilidadeMaxima || 0,
  modificacoes: normalizarModificacoesEquipamento(item.dados?.modificacoes),
  efeitosRaridade: normalizarEfeitosEquipamento(item.dados?.efeitosRaridade),

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
  
  resistencia: Number(item.dados?.resistencia) || 0,
  deslocamentoMetros: Number(item.dados?.deslocamentoMetros) || 0,
  manobrabilidade: Number(item.dados?.manobrabilidade) || 0,
  coberturaOcupantes: item.dados?.coberturaOcupantes || 'nenhuma',
  capacidade: Number(item.dados?.capacidade) || 0,
  tripulacaoMinima: Number(item.dados?.tripulacaoMinima) || 1,
  sistemasAtivosMaximos: Number(item.dados?.sistemasAtivosMaximos) || 1,
  espacosBase: Number(item.dados?.espacosBase) || 1,
  
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
  efeitosRaridade: [],
  margemAmeaca: 20,
  multiplicadorCritico: 2,
  
  resistencia: 0,
  deslocamentoMetros: 0,
  manobrabilidade: 0,
  coberturaOcupantes: 'nenhuma',
  capacidade: 0,
  tripulacaoMinima: 1,
  sistemasAtivosMaximos: 1,
  espacosBase: 1,
  
  ordem: 0,
  _dadosOriginais: {},
};

const itemEhManual = (item: IInventoryItem): boolean => (
  item.id.startsWith('manual:') || item._dadosOriginais.origem === 'manual'
);

interface AbaInventarioProps {
  character: any;
  onUpdate?: any;
  modo?: 'inventario' | 'veiculos';
}

export const AbaInventario = ({ character, modo = 'inventario' }: AbaInventarioProps) => {
  const modoVeiculos = modo === 'veiculos';
  const mutateEconomy = useCharacterStore((state) => state.mutateEconomy);
  const flushCharacterSaves = useCharacterStore((state) => state.flushCharacterSaves);
  const refreshCharacter = useCharacterStore((state) => state.refreshCharacter);
  const papelCampanha = useAuthStore((state) => state.campanhaAtiva?.papel);
  const podeGerenciarEconomia = papelCampanha === 'mestre'
    || papelCampanha === 'assistente';
  const [busca, setBusca] = useState('');
  const [filtroCategoria, setFiltroCategoria] = useState<'todos' | IInventoryItem['categoria']>('todos');
  const [moedasReveladas, setMoedasReveladas] = useState<string[]>([]);
  
  const [modalAberto, setModalAberto] = useState(false);
  const [editandoId, setEditandoId] = useState<string | null>(null);
  const [form, setForm] = useState<typeof ITEM_VAZIO>(ITEM_VAZIO);
  const [submodal, setSubmodal] = useState<'modificacoes' | 'raridade' | null>(null);
  const [itemModificacoesVisivel, setItemModificacoesVisivel] = useState<IInventoryItem | null>(null);
  const [frutoPendenteId, setFrutoPendenteId] = useState<string | null>(null);
  const [feedbackFruto, setFeedbackFruto] = useState<{ tipo: 'sucesso' | 'erro'; texto: string } | null>(null);

  const periciasDisponiveis = useMemo(() => [...new Map([
    ...PERICIAS_CATALOGO,
    ...((character.ficha?.periciasCustomizadas || []) as Array<{ id: string; titulo: string }>),
  ].map((pericia) => [pericia.id, { id: pericia.id, titulo: pericia.titulo }])).values()], [character.ficha?.periciasCustomizadas]);

  const inventario: IInventoryItem[] = useMemo(() => (character.inventarioCentral || [])
    .map(paraUI)
    .sort((a: IInventoryItem, b: IInventoryItem) => a.ordem - b.ordem), [character.inventarioCentral]);

  const consumirFruto = async (item: IInventoryItem) => {
    if (frutoPendenteId) return;
    const frutoAtual = character.ficha?.frutoEdenConsumido;
    const substituir = Boolean(frutoAtual?.itemId);
    const pergunta = substituir
      ? `Consumir ${item.nome} substituirá permanentemente ${frutoAtual.titulo || 'o Fruto do Éden atual'}. Continuar?`
      : `Consumir ${item.nome}? O fruto sairá do inventário e ficará vinculado permanentemente à ficha.`;
    if (!window.confirm(pergunta)) return;

    setFrutoPendenteId(item.id);
    setFeedbackFruto(null);
    try {
      if (!(await flushCharacterSaves(character.id))) {
        throw new Error('Não foi possível salvar as alterações pendentes antes do consumo.');
      }
      const latest = useCharacterStore.getState().characters.find((entry) => entry.id === character.id);
      if (!latest) throw new Error('O personagem não está mais carregado.');
      await personagensApi.consumirFrutoEden(character.id, item.id, {
        versaoFichaEsperada: Math.max(1, Number(latest.versao) || 1),
        economiaVersaoEsperada: Math.max(1, Number(latest.economiaVersao) || 1),
        substituir,
      });
      if (!(await refreshCharacter(character.id))) {
        throw new Error('O fruto foi consumido, mas a ficha precisa ser recarregada para mostrar o resultado.');
      }
      setFeedbackFruto({ tipo: 'sucesso', texto: `${item.nome} foi consumido e seus poderes foram vinculados à ficha.` });
    } catch (error: any) {
      setFeedbackFruto({ tipo: 'erro', texto: error?.message || 'Não foi possível consumir o fruto.' });
    } finally {
      setFrutoPendenteId(null);
    }
  };
  const resumoEquipamento = useMemo(
    () => resumirEquipamentos(character.inventarioCentral || [], character.ficha || {}),
    [character.inventarioCentral, character.ficha],
  );

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

  const itensDaAba = useMemo(
    () => inventario.filter((item) => modoVeiculos
      ? item.categoria === 'veiculo' || item.categoria === 'modulo-veicular'
      : item.categoria !== 'veiculo' && item.categoria !== 'modulo-veicular' && item.categoria !== 'implante' && item.categoria !== 'propriedade'),
    [inventario, modoVeiculos],
  );

  // Implantes vivem instalados no corpo, não numa mochila: seção própria em
  // vez de entrar na lista agrupada por local de armazenamento.
  const implantes = useMemo(
    () => inventario.filter((item) => item.categoria === 'implante'),
    [inventario],
  );

  const locaisUnicos = useMemo(
    () => Array.from(new Set(itensDaAba.map(i => i.localArmazenamento || (modoVeiculos ? 'Garagem' : 'Mochila')))).sort((a, b) => a.localeCompare(b)),
    [itensDaAba, modoVeiculos],
  );

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
    setForm(modoVeiculos
      ? { ...ITEM_VAZIO, categoria: 'veiculo', localArmazenamento: 'Garagem', espacos: 0 }
      : ITEM_VAZIO);
    setModalAberto(true);
  };

  const abrirEdicao = (item: IInventoryItem) => {
    setEditandoId(item.id);
    const { id, ...rest } = item;
    setForm({ ...ITEM_VAZIO, ...rest });
    setModalAberto(true);
  };

  const fecharModal = () => {
    setSubmodal(null);
    setModalAberto(false);
  };

  const handleSalvar = () => {
    if (!form.nome?.trim()) return;

    const regraRaridade = obterRegraRaridade(form.raridade);
    const efeitosConfigurados = [
      ...form.efeitosRaridade,
      ...form.modificacoes.flatMap((modificacao) => modificacao.efeitos),
    ];
    if (form.modificacoes.length > regraRaridade.modificacoesMaximas) {
      window.alert(`${regraRaridade.titulo} aceita no máximo ${regraRaridade.modificacoesMaximas} modificação(ões). Remova o excedente antes de salvar.`);
      return;
    }
    if (form.efeitosRaridade.length > regraRaridade.efeitosRaridadeMaximos) {
      window.alert(`${regraRaridade.titulo} aceita no máximo ${regraRaridade.efeitosRaridadeMaximos} efeito(s) próprios de raridade.`);
      return;
    }
    if (form.modificacoes.some((modificacao) => modificacao.efeitos.length > EFEITOS_POR_MODIFICACAO_MAXIMOS)) {
      window.alert('Cada modificação pode alterar no máximo um valor automático da ficha. Remova o efeito excedente antes de salvar.');
      return;
    }
    if (efeitosConfigurados.some((efeito) => Math.abs(efeito.valor) > regraRaridade.valorMaximoPorEfeito)) {
      window.alert(`Cada efeito de um item ${regraRaridade.titulo} deve ficar entre -${regraRaridade.valorMaximoPorEfeito} e +${regraRaridade.valorMaximoPorEfeito}.`);
      return;
    }

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
      categoria: modoVeiculos
        ? (form.categoria === 'modulo-veicular' ? 'modulo-veicular' : 'veiculo')
        : form.categoria,
      quantidade,
      espacos: Math.max(0, Number(form.espacos) || 0),
      localArmazenamento: form.localArmazenamento?.trim() || (modoVeiculos ? 'Garagem' : 'Mochila'),
      descricao: form.descricao?.trim() || '',
      
      raridade: form.raridade,
      equipado: form.equipado,
      favorito: form.favorito,
      durabilidadeAtual: Number(form.durabilidadeAtual) || 0,
      durabilidadeMaxima: Number(form.durabilidadeMaxima) || 0,
      modificacoes: form.modificacoes,
      efeitosRaridade: form.efeitosRaridade,

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

  const handleSetMoeda = (moeda: string, valor: number) => {
    if (!podeGerenciarEconomia) return;
    void mutateEconomy(character.id, (current) => {
      const carteiraAtual = current.carteira.length
        ? current.carteira
        : [{ moeda: 'Lunaris', saldo: 0 }];
      const atual = carteiraAtual.find((item) => item.moeda === moeda);
      const novoSaldo = Math.max(0, valor);
      const proximaCarteira = atual
        ? carteiraAtual.map((item) => (item.moeda === moeda ? { ...item, saldo: novoSaldo } : item))
        : [...carteiraAtual, { moeda, saldo: novoSaldo }];
      return { carteira: proximaCarteira, inventario: current.inventario };
    });
  };

  const getIconForType = (type: string) => {
    switch (type?.toLowerCase()) {
      case 'arma': return <Sword size={16} />;
      case 'armadura': return <Shield size={16} />;
      case 'consumivel': return <Box size={16} />;
      case 'veiculo': return <Car size={16} />;
      case 'modulo-veicular': return <Wrench size={16} />;
      default: return <Backpack size={16} />;
    }
  };

  const buscaAdiada = useDeferredValue(busca.trim().toLocaleLowerCase('pt-BR'));
  const inventarioVisivel = useMemo(() => itensDaAba.filter((item) => {
    const correspondeCategoria = filtroCategoria === 'todos' || item.categoria === filtroCategoria;
    const correspondeBusca = !buscaAdiada
      || item.nome?.toLocaleLowerCase('pt-BR').includes(buscaAdiada)
      || item.localArmazenamento?.toLocaleLowerCase('pt-BR').includes(buscaAdiada);
    return correspondeCategoria && correspondeBusca;
  }), [buscaAdiada, filtroCategoria, itensDaAba]);

  const inventarioAgrupadoPorLocal = useMemo(() => locaisUnicos.reduce((acc, local) => {
    acc[local] = inventarioVisivel.filter(i => i.localArmazenamento === local);
    return acc;
  }, {} as Record<string, IInventoryItem[]>), [inventarioVisivel, locaisUnicos]);

  const espacosUsados = itensDaAba.reduce(
    (soma, item) => soma + (item.espacos || 0) * (item.quantidade || 1),
    0
  );
  const formEhModuloVeicular = modoVeiculos && form.categoria === 'modulo-veicular';

  return (
    <div className="space-y-6">

      {/* HEADER E CARGA */}
      <div className={`grid grid-cols-1 ${modoVeiculos ? '' : 'md:grid-cols-5'} gap-6`}>
        <div className={`${modoVeiculos ? '' : 'md:col-span-3'} bg-[#0f0e15] border border-white/5 rounded-2xl p-6 flex flex-col justify-between`}>
          <div>
            <h2 className="text-2xl font-bold text-white mb-1" style={{ fontFamily: 'Cinzel, serif' }}>{modoVeiculos ? 'Veículos' : 'Inventário'}</h2>
            <p className="text-gray-400 text-sm">{modoVeiculos ? 'Gerencie veículos, peças instaladas, condição e localização.' : 'Gerencie seus equipamentos, consumíveis e carga pessoal.'}</p>
          </div>

          {!modoVeiculos && <div className="mt-6 flex justify-between text-sm">
            <span className="text-gray-400 font-bold uppercase tracking-widest">Carga Atual</span>
            <span className={`font-mono ${resumoEquipamento.sobrecarregado ? 'text-red-400' : 'text-white'}`}>{espacosUsados.toFixed(1)} / {resumoEquipamento.capacidade} <span className="text-gray-500 text-xs">ESPAÇOS</span></span>
          </div>}
          {!modoVeiculos && <div className="mt-3 grid grid-cols-2 gap-2 text-xs text-gray-400"><span>Defesa equipada: <strong className="text-sky-300">+{resumoEquipamento.defesaEquipamento}</strong></span><span>Penalidade: <strong className="text-orange-300">-{resumoEquipamento.penalidadeArmadura}</strong></span></div>}
          {!modoVeiculos && resumoEquipamento.sobrecarregado && <p className="mt-2 text-xs font-bold text-red-300">Sobrecarregado: movimento reduzido em 3 m e desvantagem em testes físicos.</p>}
          {!modoVeiculos && resumoEquipamento.conflitos.map((conflito) => <p key={conflito} className="mt-1 text-xs text-amber-300">{conflito}</p>)}
        </div>

        {!modoVeiculos && <div className="md:col-span-2 bg-[#0f0e15] border border-white/5 rounded-2xl p-4 flex flex-col gap-3">
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
                    {podeGerenciarEconomia ? (
                      <input
                        type="number"
                        value={m.saldo}
                        onChange={(e) => handleSetMoeda(m.moeda, parseInt(e.target.value) || 0)}
                        className={`w-16 text-center text-base font-mono font-bold bg-transparent border-none outline-none focus:ring-1 focus:ring-white/20 rounded ${tema.texto} [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none`}
                      />
                    ) : (
                      <span className={`w-14 text-center text-base font-mono font-bold ${tema.texto}`}>{m.saldo}</span>
                    )}
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
        </div>}
      </div>

      {/* FERRAMENTAS */}
      <div className="flex flex-col gap-3 xl:flex-row">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={18} />
          <input
            type="text"
            placeholder={modoVeiculos ? 'Buscar veículo ou localização...' : 'Buscar item ou local...'}
            value={busca}
            onChange={e => setBusca(e.target.value)}
            className="w-full bg-[#0f0e15] border border-white/5 rounded-xl py-3 pl-10 pr-4 text-white focus:border-[#c7a44c]/50 outline-none text-sm"
          />
        </div>
        <button
          onClick={abrirNovo}
          className="px-6 py-3 rounded-xl border border-[#c7a44c]/30 text-[#c7a44c] font-bold text-sm hover:bg-[#c7a44c]/10 transition-colors border-dashed"
        >
          + {modoVeiculos ? 'Adicionar Veículo' : 'Adicionar Item'}
        </button>
      </div>
      {!modoVeiculos && <div className="flex items-center gap-2 overflow-x-auto pb-1 custom-scrollbar" aria-label="Filtrar inventário por categoria">
        <ListFilter size={15} className="mr-1 shrink-0 text-gray-500" />
        {CATEGORIAS_FILTRO.filter((categoria) => categoria.value !== 'veiculo' && categoria.value !== 'modulo-veicular').map((categoria) => {
          const ativo = filtroCategoria === categoria.value;
          const cor = categoria.value === 'todos' ? 'text-[#c7a44c] border-[#c7a44c]/30 bg-[#c7a44c]/10' : CATEGORY_COLORS[categoria.value];
          return (
            <button
              key={categoria.value}
              type="button"
              aria-pressed={ativo}
              onClick={() => setFiltroCategoria(categoria.value)}
              className={`shrink-0 rounded-full border px-3 py-1.5 text-[10px] font-black uppercase tracking-widest transition-all ${cor} ${ativo ? 'ring-1 ring-current shadow-lg opacity-100' : 'opacity-55 hover:opacity-100'}`}
            >
              {categoria.label}
            </button>
          );
        })}
      </div>}

      {!modoVeiculos && feedbackFruto && (
        <div className={`rounded-xl border px-4 py-3 text-sm font-bold ${feedbackFruto.tipo === 'sucesso' ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300' : 'border-red-500/30 bg-red-500/10 text-red-300'}`} role="status">
          {feedbackFruto.texto}
        </div>
      )}

      {/* IMPLANTES CIBERNÉTICOS */}
      {!modoVeiculos && implantes.length > 0 && (
        <div className="relative overflow-hidden rounded-2xl border border-cyan-400/40 bg-gradient-to-br from-cyan-950/40 via-[#0a0912] to-fuchsia-950/20 p-6 shadow-[0_0_35px_rgba(34,211,238,0.12)]">
          <div className="mb-4 flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-full border border-cyan-400/50 bg-cyan-500/10 text-cyan-300">
              <Cpu size={20} />
            </div>
            <div>
              <h3 className="text-base font-bold uppercase tracking-widest text-cyan-300" style={{ fontFamily: 'Cinzel, serif' }}>
                Implantes Cibernéticos
              </h3>
              <p className="font-mono text-xs text-cyan-100/50">
                // {implantes.filter((item) => item.equipado).length} de {implantes.length} instalado(s)
              </p>
            </div>
          </div>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {implantes.map((item) => {
              const atributos: string[] = Array.isArray(item._dadosOriginais?.atributos)
                ? item._dadosOriginais.atributos as string[]
                : [];
              return (
                <div
                  key={item.id}
                  className={`content-auto-list-item rounded-xl border p-4 transition-colors ${item.equipado ? 'border-cyan-400/50 bg-cyan-500/5 shadow-[0_0_15px_rgba(34,211,238,0.15)]' : 'border-white/5 bg-black/30'}`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <h4 className="font-bold text-white">{item.nome}</h4>
                    <div className="flex shrink-0 gap-1">
                      <button onClick={() => abrirEdicao(item)} className="w-6 h-6 rounded bg-blue-500/10 border border-blue-500/20 text-blue-400 hover:bg-blue-500/20 flex items-center justify-center transition-colors">
                        <Pencil size={11} />
                      </button>
                      <button onClick={() => handleRemoveItem(item.id, item.nome)} className="w-6 h-6 rounded bg-red-500/10 border border-red-500/20 text-red-400 hover:bg-red-500/20 flex items-center justify-center transition-colors">
                        <Trash2 size={11} />
                      </button>
                    </div>
                  </div>
                  {item.descricao && <p className="mt-1 text-xs leading-relaxed text-gray-400">{item.descricao}</p>}
                  {atributos.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {atributos.map((atributo) => (
                        <span key={atributo} className="rounded border border-cyan-400/30 bg-cyan-500/10 px-2 py-0.5 font-mono text-[10px] font-bold uppercase tracking-wide text-cyan-300">
                          {atributo}
                        </span>
                      ))}
                    </div>
                  )}
                  <button
                    onClick={() => toggleEquipar(item.id)}
                    className={`mt-3 w-full rounded border py-1.5 font-mono text-[10px] font-bold uppercase tracking-widest transition-all ${
                      item.equipado
                        ? 'border-cyan-400/50 bg-cyan-500/20 text-cyan-300 shadow-[0_0_10px_rgba(34,211,238,0.2)]'
                        : 'border-white/10 bg-black/40 text-gray-500 hover:border-white/30 hover:text-gray-300'
                    }`}
                  >
                    {item.equipado ? '● Instalado' : '○ Removido'}
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* LISTAS POR LOCAL */}
      {locaisUnicos.map(local => {
        const itensDesteLocal = inventarioAgrupadoPorLocal[local];
        if (!itensDesteLocal || itensDesteLocal.length === 0) return null;

        const cargaLocal = itensDesteLocal.reduce((soma, item) => soma + (item.espacos || 0) * (item.quantidade || 1), 0);

        return (
          <div key={local} className="bg-[#0f0e15] border border-white/5 rounded-2xl overflow-hidden p-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-white font-bold uppercase tracking-widest text-sm flex items-center gap-2">
                {modoVeiculos ? <Car size={16} className="text-amber-400" /> : <Backpack size={16} className="text-gray-500" />} {local}
              </h3>
              {!modoVeiculos && <span className="text-xs text-gray-500 font-mono">{cargaLocal.toFixed(1)} espaços</span>}
            </div>
            
            <Reorder.Group axis="y" values={itensDesteLocal} onReorder={(novos) => handleReorder(local, novos)} className="flex flex-col gap-4">
              {itensDesteLocal.map((item) => {
                const conf = RARIDADES_CONFIG[item.raridade] || RARIDADES_CONFIG.comum;
                const catColor = CATEGORY_COLORS[item.categoria] || CATEGORY_COLORS.geral;
                const moduloVeicular = item.categoria === 'modulo-veicular';
                const frutoEden = item._dadosOriginais.tipo === 'fruto-eden';
                
                return (
                  <Reorder.Item
                    value={item}
                    key={item.id}
                    className={`content-auto-list-item relative ${conf.bg} border ${conf.border} ${conf.glow} overflow-hidden rounded-xl p-4 pl-5 flex flex-col gap-3 transition-colors duration-300 group before:absolute before:inset-y-0 before:left-0 before:w-1 ${CATEGORY_ACCENTS[item.categoria]}`}
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
                        <div className={`w-14 h-14 rounded-lg border flex items-center justify-center shadow-inner ${catColor}`}>
                          {getIconForType(item.categoria)}
                        </div>
                        <button
                          onClick={() => { if (!frutoEden) toggleEquipar(item.id); }}
                          disabled={frutoEden}
                          className={`w-full py-1 rounded text-[9px] font-bold uppercase tracking-wider transition-all duration-300 border ${
                            frutoEden
                              ? 'cursor-default border-amber-400/30 bg-amber-500/10 text-amber-300'
                              : item.equipado
                              ? 'bg-[#c7a44c]/20 border-[#c7a44c]/50 text-[#c7a44c] shadow-[0_0_10px_rgba(199,164,76,0.2)]' 
                              : 'bg-black/40 border-white/10 text-gray-500 hover:border-white/30 hover:text-gray-300'
                          }`}
                        >
                          {frutoEden
                            ? 'Não consumido'
                            : modoVeiculos
                            ? moduloVeicular
                              ? (item.equipado ? 'Instalado' : 'Guardado')
                              : (item.equipado ? 'Em uso' : 'Parado')
                            : (item.equipado ? 'Equipado' : 'Guardado')}
                        </button>
                      </div>
                      
                      {/* Lado Direito (Info) */}
                      <div className="flex-1 flex flex-col pt-1">
                        <div className="flex justify-between items-start mb-1 gap-2">
                          <div className="flex-1">
                            <h4 className="text-white font-bold text-base leading-tight mb-1">{item.nome}</h4>
                            <div className="flex gap-2 items-center flex-wrap">
                              <span className={`text-[9px] px-2 py-1 rounded border uppercase font-black tracking-wider ${conf.cor} ${conf.border} ${conf.bg}`}>
                                {rotuloRaridadeChave(item.raridade)}
                              </span>
                              <span className={`text-[9px] px-2 py-1 rounded border uppercase font-black tracking-wider ${catColor}`}>
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
                            {!modoVeiculos && <span className="text-[10px] text-gray-500 font-mono font-bold mr-1">{item.espacos} kg</span>}
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

                          {modoVeiculos && !moduloVeicular && item.combustivelMaximo ? (
                            <div className="flex items-center gap-2 text-xs bg-black/30 border border-white/5 px-2 py-1 rounded">
                              <span className="text-gray-400 uppercase font-bold tracking-wider text-[9px]">Combustível</span>
                              <div className="flex items-center gap-1 font-mono">
                                <button onClick={() => handleAjustarStatusInterno(item.id, 'combustivelAtual', 'combustivelMaximo', -1)} className="text-gray-500 hover:text-white"><Minus size={10}/></button>
                                <span className="text-gray-300">{item.combustivelAtual} / {item.combustivelMaximo}</span>
                                <button onClick={() => handleAjustarStatusInterno(item.id, 'combustivelAtual', 'combustivelMaximo', 1)} className="text-gray-500 hover:text-white"><Plus size={10}/></button>
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
                          {modoVeiculos && !moduloVeicular && item.deslocamentoMetros != null && item.deslocamentoMetros > 0 && <div className="text-xs text-gray-300 bg-black/30 border border-white/5 px-2 py-1 rounded">Desloc.: <span className="font-mono text-green-400">{item.deslocamentoMetros}m</span></div>}
                        </div>

                        {item.modificacoes.length > 0 ? (
                          <button
                            type="button"
                            onClick={() => setItemModificacoesVisivel(item)}
                            className="mt-3 flex w-fit items-center gap-2 rounded-lg border border-[#c7a44c]/20 bg-[#c7a44c]/5 px-3 py-2 text-xs font-bold text-[#c7a44c] transition-colors hover:bg-[#c7a44c]/10"
                          >
                            <SlidersHorizontal size={13} /> Ver modificações ({item.modificacoes.length})
                          </button>
                        ) : null}

                        {item.descricao && <p className="text-xs text-gray-500 italic mt-3 line-clamp-2">{item.descricao}</p>}

                        {frutoEden && (
                          <button
                            type="button"
                            onClick={() => void consumirFruto(item)}
                            disabled={frutoPendenteId !== null}
                            className="mt-3 flex w-fit items-center gap-2 rounded-lg border border-amber-400/40 bg-amber-500/10 px-4 py-2 text-xs font-black uppercase tracking-wider text-amber-200 transition-colors hover:bg-amber-500/20 disabled:cursor-wait disabled:opacity-50"
                          >
                            <Apple size={14} /> {frutoPendenteId === item.id ? 'Consumindo...' : 'Consumir fruto'}
                          </button>
                        )}

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
          {modoVeiculos ? <Car size={48} className="text-gray-700 mx-auto mb-4 opacity-50" /> : <Backpack size={48} className="text-gray-700 mx-auto mb-4 opacity-50" />}
          <p className="text-gray-500 font-bold uppercase tracking-widest">{modoVeiculos ? 'Nenhum veículo registrado' : 'Inventário Vazio'}</p>
        </div>
      )}

      {/* MODAL DE EDIÇÃO */}
      <FichaModal
        isOpen={modalAberto}
        onClose={fecharModal}
        title={editandoId
          ? (formEhModuloVeicular ? 'Editar Peça ou Módulo' : modoVeiculos ? 'Editar Veículo' : 'Editar Item')
          : (modoVeiculos ? 'Novo Veículo' : 'Novo Item')}
        size="lg"
      >
        <div className="flex flex-col gap-4">
          <LabeledInput label={formEhModuloVeicular ? 'Nome da Peça ou Módulo' : modoVeiculos ? 'Nome do Veículo' : 'Nome do Item'} value={form.nome} placeholder={formEhModuloVeicular ? 'Ex.: Núcleo Estável T2' : modoVeiculos ? 'Ex.: Rover Tatu' : 'Ex.: Espada Longa, Corda 10m'} onChange={(v: string) => setCampo('nome', v)} />

          <div className={`grid grid-cols-1 gap-3 ${modoVeiculos ? '' : 'sm:grid-cols-2'}`}>
            <div className="flex flex-col gap-1">
              <label className="text-[10px] uppercase tracking-widest text-gray-500 font-bold">Raridade</label>
              <Select
                value={form.raridade}
                onChange={(v) => setCampo('raridade', v)}
                className={`w-full uppercase tracking-widest font-bold ${RARIDADES_CONFIG[form.raridade as keyof typeof RARIDADES_CONFIG]?.cor || 'text-gray-400'}`}
                options={RARIDADES_OPCOES}
              />
            </div>
            {!modoVeiculos && <div className="flex flex-col gap-1">
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
                  { value: 'implante', label: 'Implante Cibernético' },
                  { value: 'geral', label: 'Geral' },
                ]}
              />
            </div>}
          </div>

          <div className={`grid grid-cols-1 gap-3 ${modoVeiculos ? 'sm:grid-cols-2' : 'sm:grid-cols-3'}`}>
            <LabeledInput label={modoVeiculos ? 'Garagem / Localização' : 'Local de Armazenamento'} value={form.localArmazenamento} placeholder={modoVeiculos ? 'Ex.: Hangar da base' : 'Ex.: Mochila, Mão Direita'} onChange={(v: string) => setCampo('localArmazenamento', v)} />
            <LabeledInput
              label="Quantidade"
              type="number"
              value={String(form.quantidade ?? '')}
              readOnly={quantidadeSomenteLeitura}
              onChange={(v: string) => setCampo('quantidade', v)}
            />
            {!modoVeiculos && <LabeledInput label="Peso (kg)" type="number" value={String(form.espacos ?? '')} onChange={(v: string) => setCampo('espacos', v)} />}
          </div>

          {!formEhModuloVeicular && <div className="mt-2 grid grid-cols-1 gap-3 border-t border-white/5 pt-4 sm:grid-cols-2">
            <LabeledInput label={modoVeiculos ? 'Vida Máxima' : 'Durabilidade Máxima (0 = infinito)'} type="number" value={String(form.durabilidadeMaxima ?? '')} onChange={(v: string) => setCampo('durabilidadeMaxima', v)} />
            <LabeledInput label={modoVeiculos ? 'Vida Atual' : 'Durabilidade Atual'} type="number" value={String(form.durabilidadeAtual ?? '')} onChange={(v: string) => setCampo('durabilidadeAtual', v)} />
          </div>}

          {modoVeiculos && !formEhModuloVeicular && (
            <div className="grid grid-cols-1 gap-3 border-t border-white/5 pt-4 sm:grid-cols-2 lg:grid-cols-3">
              <LabeledInput label="Combustível Máximo" type="number" value={String(form.combustivelMaximo ?? '')} onChange={(v: string) => setCampo('combustivelMaximo', v)} />
              <LabeledInput label="Combustível Atual" type="number" value={String(form.combustivelAtual ?? '')} onChange={(v: string) => setCampo('combustivelAtual', v)} />
              <LabeledInput label="Deslocamento (m)" type="number" value={String(form.deslocamentoMetros ?? '')} onChange={(v: string) => setCampo('deslocamentoMetros', v)} />
              <LabeledInput label="Defesa" type="number" value={String(form.defesa ?? '')} onChange={(v: string) => setCampo('defesa', v)} />
              <LabeledInput label="Resistência (RD)" type="number" value={String(form.resistencia ?? '')} onChange={(v: string) => setCampo('resistencia', v)} />
              <LabeledInput label="Manobrabilidade" type="number" value={String(form.manobrabilidade ?? '')} onChange={(v: string) => setCampo('manobrabilidade', v)} />
              <LabeledInput label="Capacidade" type="number" value={String(form.capacidade ?? '')} onChange={(v: string) => setCampo('capacidade', v)} />
              <LabeledInput label="Tripulação Mínima" type="number" value={String(form.tripulacaoMinima ?? '')} onChange={(v: string) => setCampo('tripulacaoMinima', v)} />
              <LabeledInput label="Sistemas Ativos" type="number" value={String(form.sistemasAtivosMaximos ?? '')} onChange={(v: string) => setCampo('sistemasAtivosMaximos', v)} />
              <LabeledInput label="Espaços de Base" type="number" value={String(form.espacosBase ?? '')} onChange={(v: string) => setCampo('espacosBase', v)} />
              <div className="flex flex-col gap-1">
                <label className="text-[10px] uppercase tracking-widest text-gray-500 font-bold">Cobertura</label>
                <Select
                  value={form.coberturaOcupantes || 'nenhuma'}
                  onChange={(v) => setCampo('coberturaOcupantes', v)}
                  className="w-full"
                  options={[
                    { value: 'nenhuma', label: 'Nenhuma' },
                    { value: 'parcial', label: 'Parcial' },
                    { value: 'total', label: 'Total' },
                  ]}
                />
              </div>
            </div>
          )}

          {/* CAMPOS ESPECÍFICOS */}
          {form.categoria === 'arma' && (
            <div className="grid grid-cols-1 gap-3 border-t border-white/5 pt-4 sm:grid-cols-2 lg:grid-cols-3">
              <LabeledInput label="Dano" value={form.dano || ''} placeholder="Ex.: 1d8+2" onChange={(v: string) => setCampo('dano', v)} />
              <LabeledInput label="Munição Atual" type="number" value={String(form.municaoAtual ?? '')} onChange={(v: string) => setCampo('municaoAtual', v)} />
              <LabeledInput label="Munição Máx." type="number" value={String(form.municaoMaxima ?? '')} onChange={(v: string) => setCampo('municaoMaxima', v)} />
              <LabeledInput label="Margem de ameaça" type="number" value={String(form.margemAmeaca ?? 20)} placeholder="Ex.: 18" onChange={(v: string) => setCampo('margemAmeaca', v)} />
              <LabeledInput label="Multiplicador crítico" type="number" value={String(form.multiplicadorCritico ?? 2)} placeholder="Ex.: 5" onChange={(v: string) => setCampo('multiplicadorCritico', v)} />
              <p className="self-end pb-2 text-xs text-gray-600">Aceita valores especiais definidos pelo Mestre.</p>
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

          <div className="grid grid-cols-1 gap-3 border-t border-white/5 pt-4 sm:grid-cols-2">
            <button type="button" onClick={() => setSubmodal('modificacoes')} className="flex items-center justify-between rounded-xl border border-white/5 bg-black/20 p-4 text-left transition-colors hover:border-[#c7a44c]/30">
              <span>
                <strong className="block text-sm text-white">Ver modificações</strong>
                <span className="mt-1 block text-xs text-gray-600">{form.modificacoes.length} configuradas</span>
              </span>
              <SlidersHorizontal size={18} className="text-[#c7a44c]" />
            </button>
            <button type="button" onClick={() => setSubmodal('raridade')} className="flex items-center justify-between rounded-xl border border-white/5 bg-black/20 p-4 text-left transition-colors hover:border-[#c7a44c]/30">
              <span>
                <strong className="block text-sm text-white">Raridade e vantagens</strong>
                <span className="mt-1 block text-xs text-gray-600">{form.efeitosRaridade.length} efeitos automáticos</span>
              </span>
              <Star size={18} className="text-[#c7a44c]" />
            </button>
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
              {editandoId ? 'Salvar Alterações' : (modoVeiculos ? 'Adicionar Veículo' : 'Adicionar Item')}
            </button>
          </div>
        </div>
      </FichaModal>

      <ModificacoesItemModal
        isOpen={submodal === 'modificacoes'}
        onClose={() => setSubmodal(null)}
        modificacoes={form.modificacoes}
        onChange={(modificacoes) => setForm((atual) => ({ ...atual, modificacoes }))}
        pericias={periciasDisponiveis}
        itemNome={form.nome || undefined}
        raridade={form.raridade}
      />

      <RaridadeItemModal
        isOpen={submodal === 'raridade'}
        onClose={() => setSubmodal(null)}
        raridade={form.raridade}
        efeitos={form.efeitosRaridade}
        onRaridadeChange={(raridade) => setForm((atual) => ({ ...atual, raridade: normalizarRaridadeChave(raridade) }))}
        onEfeitosChange={(efeitosRaridade) => setForm((atual) => ({ ...atual, efeitosRaridade }))}
        pericias={periciasDisponiveis}
        categoria={form.categoria === 'modulo-veicular' ? 'veiculo' : (form.categoria === 'implante' || form.categoria === 'propriedade') ? 'geral' : form.categoria}
      />

      <ModificacoesItemModal
        isOpen={itemModificacoesVisivel !== null}
        onClose={() => setItemModificacoesVisivel(null)}
        modificacoes={itemModificacoesVisivel?.modificacoes || []}
        pericias={periciasDisponiveis}
        itemNome={itemModificacoesVisivel?.nome}
        raridade={itemModificacoesVisivel?.raridade}
        readOnly
      />

    </div>
  );
};
