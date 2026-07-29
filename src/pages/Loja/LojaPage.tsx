import React, { useState, useEffect, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, ShoppingBag, CheckCircle, XCircle, LayoutGrid, Sword, Shield, FlaskConical, CarFront, Users, Gem, Archive, Heart, ArrowRightLeft, Sparkles, Cpu, Wand2, Apple, MapPin, Building2, Skull, Globe2 } from 'lucide-react';
import { calcularValorRevenda, LojaItem, ItemCategoria, ItemRaridade, getCurrencySymbol, lerPrecoNativoLoja, mapearCatalogoLoja, somarPrecosNativos } from '../../data/lojaCatalog';
import { ItemCard } from './components/ItemCard';
import { LojaItemModal } from './components/LojaItemModal';
import { CartDrawer, CartItem } from './components/CartDrawer';
import { useCharacterStore } from '../../store/useCharacterStore';
import { useAuthStore } from '../../store/useAuthStore';
import { useWishlist } from '../../hooks/useWishlist';
import { listarRecompensas, reivindicarRecompensa, resolverRecompensa, Recompensa } from '../../services/bountiesApi';
import { api } from '../../services/apiClient';
import { CheckoutAttempt, createIdempotencyKey, hasVerifiableShopOrigin, lojaApi, MAX_SHOP_UNITS, prepareCheckoutAttempt } from '../../services/lojaApi';

interface RecompensaAviso {
  id: string;
  campanha_id: string | null;
  categoria: string;
  mensagem: string;
  dados?: {
    tipo?: string;
    status?: string;
    cacador_personagem_id?: string;
    alvo_personagem_id?: string;
    alvo_discord_id?: string;
    valor_no_pedido?: number;
  };
}

function isAbortError(error: unknown): boolean {
  return error instanceof DOMException && error.name === 'AbortError';
}

async function listarAvisosRecompensa(campanhaId: string, signal?: AbortSignal): Promise<RecompensaAviso[]> {
  const response = await api<{ avisos: RecompensaAviso[] }>('/avisos?apenas_nao_lidos=true', { signal });
  return response.avisos.filter((aviso) => (
    aviso.campanha_id === campanhaId
    && aviso.categoria === 'economia'
    && aviso.dados?.tipo === 'claim_recompensa'
  ));
}

const CATEGORIAS_ICONES = {
  'Relíquias da Criação': Sparkles,
  'Frutos do Éden': Apple,
  'Todos': LayoutGrid,
  'Armas': Sword,
  'Armaduras e Escudos': Shield,
  'Consumíveis': FlaskConical,
  'Veículos': CarFront,
  'Implantes Cibernéticos': Cpu,
  'Artefatos Mágicos': Wand2,
  'Mercenários': Users,
  'Componentes': Gem,
  'Outros': Archive,
} as const;

const RARIDADES_CORES = {
  'Todas': 'hover:bg-white/10 text-gray-400',
  'Comum': 'hover:bg-gray-500/20 text-gray-300 border-gray-500/50',
  'Incomum': 'hover:bg-blue-500/20 text-blue-400 border-blue-500/50',
  'Raro': 'hover:bg-purple-500/20 text-purple-400 border-purple-500/50',
  'Épico': 'hover:bg-yellow-500/20 text-yellow-400 border-yellow-500/50',
  'Lendário': 'hover:bg-orange-500/20 text-orange-400 border-orange-500/50',
  'Relíquia': 'hover:bg-red-500/20 text-red-400 border-red-500/50',
  'Relíquia da Criação': 'hover:bg-fuchsia-500/20 text-fuchsia-400 border-fuchsia-500/50',
} as const;

export const LojaPage: React.FC = () => {
  const { characters, fetchCharacters, flushCharacterSaves } = useCharacterStore();
  const { campanhaAtiva, usuario } = useAuthStore();
  const config = campanhaAtiva?.configuracoes || {};
  const locaisOcultos = config.locais_ocultos || [3, 4];
  const podeGerenciarRecompensas = campanhaAtiva?.papel === 'mestre' || campanhaAtiva?.papel === 'assistente';
  const localizacaoDisponivel = (id: number) => !locaisOcultos.includes(id) || podeGerenciarRecompensas;
  const localizacaoStorageKey = campanhaAtiva ? `loja_localizacao_${campanhaAtiva.id}` : null;

  // Lembra a última localização escolhida (por campanha) e cai para a primeira disponível se ela sumir
  const [localizacaoAtual, setLocalizacaoAtualState] = useState<number>(() => {
    const armazenada = localizacaoStorageKey ? Number(localStorage.getItem(localizacaoStorageKey)) : NaN;
    if ([1, 2, 3, 4].includes(armazenada) && localizacaoDisponivel(armazenada)) return armazenada;
    return [2, 1, 3, 4].find(localizacaoDisponivel) ?? 2;
  });

  const trocarLocalizacao = (id: number) => {
    setLocalizacaoAtualState(id);
    if (localizacaoStorageKey) localStorage.setItem(localizacaoStorageKey, String(id));
  };
  const [modoLoja, setModoLoja] = useState<'Comprar' | 'Vender' | 'Recompensas'>('Comprar');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategoria, setSelectedCategoria] = useState<ItemCategoria | 'Todos'>('Todos');
  const [selectedRaridade, setSelectedRaridade] = useState<ItemRaridade | 'Todas'>('Todas');
  const [subfiltro, setSubfiltro] = useState<string>('Todos');
  const [itemsToShow, setItemsToShow] = useState(24);
  const [compradorId, setCompradorId] = useState<string>('');
  
  const [mostrarWishlist, setMostrarWishlist] = useState(false);

  const [itemSelecionado, setItemSelecionado] = useState<LojaItem | null>(null);
  const [toast, setToast] = useState<{ message: string, type: 'success' | 'error' } | null>(null);
  const [catalogo, setCatalogo] = useState<LojaItem[]>([]);
  const [catalogoLoading, setCatalogoLoading] = useState(false);
  const [catalogoError, setCatalogoError] = useState<string | null>(null);

  // Recompensas State
  const [recompensas, setRecompensas] = useState<Recompensa[]>([]);
  const [reivindicacaoAlvo, setReivindicacaoAlvo] = useState<Recompensa | null>(null);
  const [notificacoesGM, setNotificacoesGM] = useState<RecompensaAviso[]>([]);

  // GM State
  const [showGmPanel, setShowGmPanel] = useState(false);

  // Cart State
  const [cart, setCart] = useState<CartItem[]>([]);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [showCheckoutModal, setShowCheckoutModal] = useState(false);
  const [checkoutInProgress, setCheckoutInProgress] = useState(false);
  const [claimInProgress, setClaimInProgress] = useState(false);
  const [resolvingClaimId, setResolvingClaimId] = useState<string | null>(null);

  const toastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const checkoutAttemptRef = useRef<CheckoutAttempt | null>(null);
  const checkoutInFlightRef = useRef(false);
  const claimAttemptRef = useRef<{ signature: string; idempotencia: string } | null>(null);
  const claimInFlightRef = useRef(false);
  const resolveAttemptsRef = useRef(new Map<string, string>());
  const resolvingClaimsRef = useRef(new Set<string>());

  const { wishlist, toggleWishlist } = useWishlist(compradorId);

  const personagensDoUsuario = useMemo(
    () => characters.filter((character) => Boolean(usuario?.id) && character.donoUsuarioId === usuario?.id),
    [characters, usuario?.id],
  );

  // Carrega personagens ao abrir a loja
  useEffect(() => {
    void fetchCharacters();
  }, [fetchCharacters]);

  // O backend devolve somente itens ativos e publicados para a campanha.
  useEffect(() => {
    const campanhaId = campanhaAtiva?.id;
    if (!campanhaId) {
      setCatalogo([]);
      setCatalogoError(null);
      return;
    }
    const controller = new AbortController();
    setCatalogoLoading(true);
    setCatalogoError(null);
    lojaApi.listarCatalogo(campanhaId, controller.signal)
      .then((response) => setCatalogo(mapearCatalogoLoja(response.itens)))
      .catch((error: unknown) => {
        if (!isAbortError(error)) {
          setCatalogo([]);
          setCatalogoError(error instanceof Error ? error.message : 'Não foi possível carregar o catálogo publicado.');
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) setCatalogoLoading(false);
      });
    return () => controller.abort();
  }, [campanhaAtiva?.id]);

  // Carrega recompensas e avisos do mestre
  useEffect(() => {
    const campanhaId = campanhaAtiva?.id;
    if (!campanhaId) {
      setRecompensas([]);
      setNotificacoesGM([]);
      return;
    }
    const controller = new AbortController();
    listarRecompensas(campanhaId, controller.signal)
        .then(res => setRecompensas(res))
        .catch((error: unknown) => {
          if (!isAbortError(error)) console.error('Erro ao carregar recompensas:', error);
        });

    if (podeGerenciarRecompensas) {
      listarAvisosRecompensa(campanhaId, controller.signal)
        .then(setNotificacoesGM)
        .catch((error: unknown) => {
          if (!isAbortError(error)) console.error('Erro ao carregar reivindicações:', error);
        });
    } else {
      setNotificacoesGM([]);
    }
    return () => controller.abort();
  }, [campanhaAtiva?.id, podeGerenciarRecompensas]);

  useEffect(() => () => {
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
  }, []);

  // Seleciona o primeiro personagem por padrão
  useEffect(() => {
    if (!personagensDoUsuario.some((character) => character.id === compradorId)) {
      setCompradorId(personagensDoUsuario[0]?.id ?? '');
    }
  }, [personagensDoUsuario, compradorId]);

  // Se o mestre ocultar o mercado que está sendo exibido, migra para o primeiro disponível
  useEffect(() => {
    if (localizacaoDisponivel(localizacaoAtual)) return;
    const fallback = [2, 1, 3, 4].find(localizacaoDisponivel);
    if (fallback !== undefined) trocarLocalizacao(fallback);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [locaisOcultos.join(','), podeGerenciarRecompensas]);

  const compradorAtivo = useMemo(() => 
    personagensDoUsuario.find(c => c.id === compradorId),
  [personagensDoUsuario, compradorId]);

  const saldos = useMemo(() => {
    let sol = 0, lun = 0, frag = 0, cred = 0;
    if (!compradorAtivo || !compradorAtivo.carteira) return { sol, lun, frag, cred };
    
    compradorAtivo.carteira.forEach(moeda => {
      const nomeMoeda = moeda.moeda.toLowerCase();
      if (nomeMoeda.includes('solar') || nomeMoeda === 'sol') sol += moeda.saldo;
      else if (nomeMoeda.includes('lunaris') || nomeMoeda === 'lun') lun += moeda.saldo;
      else if (nomeMoeda.includes('fragmento')) frag += moeda.saldo;
      else if (nomeMoeda.includes('sombrio')) cred += moeda.saldo;
    });
    return { sol, lun, frag, cred };
  }, [compradorAtivo]);

  const showToast = (message: string, type: 'success' | 'error') => {
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    setToast({ message, type });
    toastTimerRef.current = setTimeout(() => {
      setToast(null);
      toastTimerRef.current = null;
    }, 3000);
  };

  const handleAddToCart = (item: LojaItem) => {
    if (!compradorAtivo) {
      showToast('Selecione um comprador primeiro.', 'error');
      return;
    }
    setCart(prev => {
      const existing = prev.find(i => i.item.id === item.id);
      if (existing) {
        const maximo = Math.min(item.quantidadeDisponivel ?? MAX_SHOP_UNITS, MAX_SHOP_UNITS);
        return prev.map(i => i.item.id === item.id ? { ...i, quantidade: Math.min(maximo, i.quantidade + 1) } : i);
      }
      return [...prev, { item, quantidade: 1 }];
    });
    showToast(`${item.nome} adicionado ao lote!`, 'success');
  };

  const updateCartQuantity = (itemId: string, delta: number) => {
    setCart(prev => prev.map(i => {
      if (i.item.id === itemId) {
        const novaQtd = Math.min(i.item.quantidadeDisponivel ?? MAX_SHOP_UNITS, MAX_SHOP_UNITS, Math.max(1, i.quantidade + delta));
        return { ...i, quantidade: novaQtd };
      }
      return i;
    }));
  };

  const removeCartItem = (itemId: string) => {
    setCart(prev => prev.filter(i => i.item.id !== itemId));
  };

  const trocarModoLoja = (novoModo: 'Comprar' | 'Vender' | 'Recompensas') => {
    if (novoModo !== modoLoja) {
      setCart([]);
      checkoutAttemptRef.current = null;
      setIsCartOpen(false);
      setShowCheckoutModal(false);
      setItemSelecionado(null);
    }
    setModoLoja(novoModo);
  };

  const trocarComprador = (personagemId: string) => {
    if (personagemId !== compradorId) {
      setCart([]);
      checkoutAttemptRef.current = null;
      setIsCartOpen(false);
      setShowCheckoutModal(false);
    }
    setCompradorId(personagemId);
  };

  const cartTotals = somarPrecosNativos(cart);

  const handleReivindicar = async () => {
    if (!compradorAtivo || !reivindicacaoAlvo || !campanhaAtiva || claimInFlightRef.current) return;
    claimInFlightRef.current = true;
    setClaimInProgress(true);
    try {
      const signature = `${campanhaAtiva.id}:${compradorAtivo.id}:${reivindicacaoAlvo.personagem_id}`;
      if (claimAttemptRef.current?.signature !== signature) {
        claimAttemptRef.current = {
          signature,
          idempotencia: createIdempotencyKey('recompensa-claim'),
        };
      }
      await reivindicarRecompensa(campanhaAtiva.id, {
        cacador_personagem_id: compradorAtivo.id,
        alvo_personagem_id: reivindicacaoAlvo.personagem_id,
        idempotencia: claimAttemptRef.current.idempotencia,
      });
      setRecompensas(await listarRecompensas(campanhaAtiva.id));
      showToast('Reivindicação enviada para o Mestre da Guilda/Banco Lunar!', 'success');
      setReivindicacaoAlvo(null);
      claimAttemptRef.current = null;
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'Erro ao reivindicar recompensa.', 'error');
    } finally {
      claimInFlightRef.current = false;
      setClaimInProgress(false);
    }
  };

  const handleResolverRecompensa = async (claimId: string, aprovado: boolean) => {
    if (!campanhaAtiva || resolvingClaimsRef.current.size > 0) return;
    const signature = `${claimId}:${aprovado}`;
    resolvingClaimsRef.current.add(signature);
    setResolvingClaimId(claimId);
    try {
      const idempotencia = resolveAttemptsRef.current.get(signature) ?? createIdempotencyKey('recompensa-resolver');
      resolveAttemptsRef.current.set(signature, idempotencia);
      await resolverRecompensa(campanhaAtiva.id, {
        claim_id: claimId,
        aprovado,
        idempotencia,
      });
      const [novasRecompensas, novosAvisos] = await Promise.all([
        listarRecompensas(campanhaAtiva.id),
        listarAvisosRecompensa(campanhaAtiva.id),
        fetchCharacters(),
      ]);
      setRecompensas(novasRecompensas);
      setNotificacoesGM(novosAvisos);
      showToast(aprovado ? 'Recompensa aprovada e paga!' : 'Recompensa encerrada (NPC/Evento).', 'success');
      resolveAttemptsRef.current.delete(signature);
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'Erro ao processar recompensa.', 'error');
    } finally {
      resolvingClaimsRef.current.delete(signature);
      setResolvingClaimId(null);
    }
  };

  const executeCheckout = async () => {
    if (!compradorAtivo || !campanhaAtiva || cart.length === 0 || modoLoja === 'Recompensas' || checkoutInFlightRef.current) return;
    checkoutInFlightRef.current = true;
    setCheckoutInProgress(true);
    try {
      if (!(await flushCharacterSaves(compradorAtivo.id))) {
        throw new Error('Existem alterações pendentes na ficha. Resolva a sincronização antes de usar a loja.');
      }
      const personagemAtual = useCharacterStore.getState().characters.find((character) => character.id === compradorAtivo.id);
      if (typeof personagemAtual?.economiaVersao !== 'number') {
        throw new Error('A versão econômica do personagem não foi carregada. Atualize a página e tente novamente.');
      }
      const operation = modoLoja === 'Comprar' ? 'compra' : 'venda';
      const attempt = prepareCheckoutAttempt(checkoutAttemptRef.current, operation, {
        campanha_id: campanhaAtiva.id,
        personagem_id: personagemAtual.id,
        economia_versao_esperada: personagemAtual.economiaVersao,
        itens: cart.map(({ item, quantidade }) => ({ item_id: item.id, quantidade })),
      });
      checkoutAttemptRef.current = attempt;
      if (operation === 'compra') await lojaApi.comprar(attempt.payload);
      else await lojaApi.vender(attempt.payload);
      await fetchCharacters();
      showToast(operation === 'compra' ? 'Compra do lote finalizada com sucesso!' : 'Lote vendido com sucesso!', 'success');
      setCart([]);
      checkoutAttemptRef.current = null;
      setShowCheckoutModal(false);
      setIsCartOpen(false);
      setItemSelecionado(null);
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'Erro ao processar lote.', 'error');
    } finally {
      checkoutInFlightRef.current = false;
      setCheckoutInProgress(false);
    }
  };

  const itensVenda = useMemo(() => {
    if (!compradorAtivo || !compradorAtivo.inventarioCentral) return [];
    return compradorAtivo.inventarioCentral
      .filter(hasVerifiableShopOrigin)
      .flatMap(invItem => {
      const original = catalogo.find(c => c.id === invItem.item_id);
      const precoOriginal = original
        ? { moedaPreco: original.moedaPreco, valorOriginal: original.valorOriginal }
        : lerPrecoNativoLoja(invItem.dados?.preco);
      if (!precoOriginal) return [];
      const valorRevenda = calcularValorRevenda(precoOriginal.valorOriginal);
      
      return [{
        id: invItem.item_id,
        nome: invItem.titulo,
        categoria: original?.categoria ?? 'Outros',
        raridade: (invItem.dados?.raridade as ItemRaridade) || 'Comum',
        moedaPreco: precoOriginal.moedaPreco,
        valorOriginal: valorRevenda,
        nivelLoja: original?.nivelLoja ?? 1,
        descricao: invItem.dados?.descricao || '',
        propriedades: invItem.dados?.efeito || '',
        quantidadeDisponivel: invItem.quantidade,
        dadosBrutos: invItem.dados,
      } satisfies LojaItem];
    });
  }, [compradorAtivo, catalogo]);

  const filteredItems = useMemo(() => {
    let source = modoLoja === 'Comprar' ? catalogo : modoLoja === 'Vender' ? itensVenda : [];

    let items = source.filter(item => {
      const matchSearch = item.nome.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          item.descricao.toLowerCase().includes(searchTerm.toLowerCase());
      const matchCat = selectedCategoria === 'Todos' || item.categoria === selectedCategoria;
      const matchRar = selectedRaridade === 'Todas' || item.raridade === selectedRaridade;
      const matchLocal = modoLoja !== 'Comprar' || item.nivelLoja === localizacaoAtual;

      if (mostrarWishlist && modoLoja === 'Comprar' && !wishlist.includes(item.id)) return false;
      
      let matchSub = true;
      if (subfiltro !== 'Todos' && modoLoja === 'Comprar') {
        const d = item.dadosBrutos || {};
        const modo = d.modo?.toLowerCase() || '';
        const desc = item.descricao.toLowerCase();
        
        if (selectedCategoria === 'Armas') {
          if (subfiltro === 'Corpo a Corpo' && modo !== 'corpo a corpo') matchSub = false;
          if (subfiltro === 'À Distância' && modo !== 'à distância') matchSub = false;
          if (subfiltro === 'Mágicas' && !desc.includes('mágica') && !desc.includes('magia') && !desc.includes('runa')) matchSub = false;
        } else if (selectedCategoria === 'Armaduras e Escudos') {
          const isEscudo = d.subtipo === 'escudo' || desc.includes('escudo');
          if (subfiltro === 'Escudos' && !isEscudo) matchSub = false;
          if (subfiltro === 'Armaduras' && isEscudo) matchSub = false;
        } else if (selectedCategoria === 'Veículos') {
          const isCompleto = d.sistema === 'Chassi' || desc.includes('completo') || desc.includes('montado');
          if (subfiltro === 'Veículos Completos' && !isCompleto) matchSub = false;
          if (subfiltro === 'Peças e Módulos' && isCompleto) matchSub = false;
        } else if (selectedCategoria === 'Consumíveis') {
          const isPocao = desc.includes('poção') || desc.includes('elixir') || desc.includes('frasco') || desc.includes('cura');
          const isRitual = desc.includes('ritual') || desc.includes('pergaminho') || desc.includes('selo');
          if (subfiltro === 'Poções' && !isPocao) matchSub = false;
          if (subfiltro === 'Rituais' && !isRitual) matchSub = false;
          if (subfiltro === 'Ferramentas' && (isPocao || isRitual)) matchSub = false;
        }
      }

      return matchSearch && matchCat && matchRar && matchSub && matchLocal;
    });

    return items;
  }, [searchTerm, selectedCategoria, selectedRaridade, subfiltro, catalogo, itensVenda, modoLoja, mostrarWishlist, wishlist, localizacaoAtual]);

  const visibleItems = filteredItems.slice(0, itemsToShow);
  
  const getSubfiltros = () => {
    switch (selectedCategoria) {
      case 'Armas': return ['Todos', 'Corpo a Corpo', 'À Distância', 'Mágicas'];
      case 'Armaduras e Escudos': return ['Todos', 'Armaduras', 'Escudos'];
      case 'Veículos': return ['Todos', 'Veículos Completos', 'Peças e Módulos'];
      case 'Consumíveis': return ['Todos', 'Poções', 'Rituais', 'Ferramentas'];
      case 'Frutos do Éden': return ['Todos', 'Sobrenatural', 'Mutação', 'Elemental'];
      default: return [];
    }
  };
  const subfiltrosDisponiveis = getSubfiltros();

  useEffect(() => {
    setSubfiltro('Todos');
    setItemsToShow(24);
  }, [selectedCategoria]);

  useEffect(() => {
    setItemsToShow(24);
  }, [searchTerm, selectedRaridade, subfiltro, modoLoja, mostrarWishlist, localizacaoAtual]);

  return (
    <div className="pl-32 pr-12 pt-12 pb-24 relative z-10 w-full min-h-screen flex flex-col max-w-[1600px] mx-auto">
      
      {/* HEADER DA LOJA & LOCALIZAÇÃO */}
      <div className={`flex flex-col xl:flex-row justify-between items-start xl:items-end mb-12 gap-6 border-b pb-8 transition-colors duration-500 rounded-3xl p-8 backdrop-blur-md shadow-2xl ${
        localizacaoAtual === 1 ? 'bg-amber-900/20 border-amber-800/30' :
        localizacaoAtual === 2 ? 'bg-blue-900/20 border-blue-500/30 shadow-[0_0_30px_rgba(59,130,246,0.1)]' :
        localizacaoAtual === 3 ? 'bg-purple-900/20 border-red-500/30 shadow-[0_0_30px_rgba(239,68,68,0.1)]' :
        'bg-yellow-500/10 border-yellow-400/40 shadow-[0_0_40px_rgba(250,204,21,0.2)]'
      }`}>
        <div className="flex-1 w-full">
          {/* SELETOR DE LOCALIZAÇÃO */}
          <div className="flex flex-wrap gap-2 mb-6">
            {(!locaisOcultos.includes(1) || podeGerenciarRecompensas) && <button onClick={() => trocarLocalizacao(1)} className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-widest border transition-all ${localizacaoAtual === 1 ? 'bg-amber-800 text-amber-100 border-amber-600 shadow-lg' : 'bg-black/40 text-gray-500 border-white/5 hover:bg-white/10'}`}><MapPin size={14}/> Feira de Vila</button>}
            {(!locaisOcultos.includes(2) || podeGerenciarRecompensas) && <button onClick={() => trocarLocalizacao(2)} className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-widest border transition-all ${localizacaoAtual === 2 ? 'bg-blue-600 text-blue-100 border-blue-400 shadow-[0_0_15px_rgba(59,130,246,0.5)]' : 'bg-black/40 text-gray-500 border-white/5 hover:bg-white/10'}`}><Building2 size={14}/> Metrópole</button>}
            {(!locaisOcultos.includes(3) || podeGerenciarRecompensas) && <button onClick={() => trocarLocalizacao(3)} className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-widest border transition-all ${localizacaoAtual === 3 ? 'bg-purple-900 text-red-300 border-red-500 shadow-[0_0_15px_rgba(239,68,68,0.5)]' : 'bg-black/40 text-gray-500 border-white/5 hover:bg-white/10'}`}><Skull size={14}/> Mercado Negro</button>}
            {(!locaisOcultos.includes(4) || podeGerenciarRecompensas) && <button onClick={() => trocarLocalizacao(4)} className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-widest border transition-all ${localizacaoAtual === 4 ? 'bg-yellow-600/30 text-yellow-300 border-yellow-400 shadow-[0_0_20px_rgba(250,204,21,0.6)]' : 'bg-black/40 text-gray-500 border-white/5 hover:bg-white/10'}`}><Globe2 size={14}/> Banco Lunar</button>}
          </div>

          <h2 className={`text-4xl md:text-5xl font-bold tracking-wider mb-4 flex items-center gap-4 transition-colors ${
            localizacaoAtual === 1 ? 'text-amber-500' :
            localizacaoAtual === 2 ? 'text-blue-400' :
            localizacaoAtual === 3 ? 'text-red-500' :
            'text-yellow-400'
          }`} style={{fontFamily: 'Cinzel, serif'}}>
            {localizacaoAtual === 4 && <Shield size={40} className="text-gray-300 drop-shadow-[0_0_10px_rgba(255,255,255,0.5)]"/>}
            {localizacaoAtual !== 4 && (modoLoja === 'Comprar' ? <ShoppingBag size={40} /> : <ArrowRightLeft size={40} />)}
            {localizacaoAtual === 1 ? 'Feira Local' :
             localizacaoAtual === 2 ? 'Mercado da Metrópole' :
             localizacaoAtual === 3 ? 'Mercado Negro do Umbral' :
             'Banco Lunar Central'}
          </h2>
          
          <p className="text-gray-300 text-lg max-w-2xl font-medium">
            {localizacaoAtual === 1 ? 'Uma feira pacata vendendo suprimentos básicos, alimentos e ferramentas.' :
             localizacaoAtual === 2 ? 'O centro de comércio tecnológico. Armas avançadas, blindagens e veículos disponíveis.' :
             localizacaoAtual === 3 ? 'Onde a lei não alcança. Implantes ilegais, venenos e negociações sombrias.' :
             'Conexão Multiversal Ativa • Cofre Sincronizado com o Discord. Acesso irrestrito a todos os artefatos da criação.'}
          </p>
        </div>

        <div className="flex flex-col items-end gap-4">
          {/* BOTOES CARRINHO E MODO */}
          <div className="flex gap-4 items-center">
            <button
              onClick={() => setIsCartOpen(true)}
              className="relative px-4 py-2 bg-black/40 border border-white/10 rounded-xl hover:bg-white/10 transition-colors flex items-center justify-center text-gray-300"
            >
              <ShoppingBag size={20} />
              {cart.length > 0 && (
                <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs font-bold w-5 h-5 flex items-center justify-center rounded-full shadow-lg">
                  {cart.reduce((acc, c) => acc + c.quantidade, 0)}
                </span>
              )}
            </button>

            <div className="flex bg-[#0b0a12]/80 backdrop-blur-md rounded-2xl border border-white/10 p-1 shadow-lg">
              <button 
                onClick={() => trocarModoLoja('Comprar')}
                className={`px-6 py-2 rounded-xl font-bold tracking-widest text-sm uppercase transition-all ${
                  modoLoja === 'Comprar' ? 'bg-[#c7a44c] text-black shadow-lg' : 'text-gray-500 hover:text-white'
                }`}
              >
                Comprar
              </button>
              <button 
                onClick={() => trocarModoLoja('Vender')}
                className={`px-6 py-2 rounded-xl font-bold tracking-widest text-sm uppercase transition-all ${
                  modoLoja === 'Vender' ? 'bg-red-500 text-white shadow-lg' : 'text-gray-500 hover:text-white'
                }`}
              >
                Vender
              </button>
              <button 
                onClick={() => trocarModoLoja('Recompensas')}
                className={`px-6 py-2 rounded-xl font-bold tracking-widest text-sm uppercase transition-all ${
                  modoLoja === 'Recompensas' ? 'bg-orange-500 text-white shadow-lg' : 'text-gray-500 hover:text-white'
                }`}
              >
                Caçadores
              </button>
            </div>
          </div>

          {/* SELETOR DE COMPRADOR E CARTEIRA (GLASSMORPHISM) */}
          {personagensDoUsuario.length > 0 && (
            <div className="flex flex-col items-end gap-2 bg-[#0b0a12]/80 backdrop-blur-md p-4 rounded-3xl border border-white/10 shadow-[0_8px_32px_rgba(0,0,0,0.5)]">
              
              <div className="flex items-center gap-4 w-full">
                <div className="text-[10px] text-gray-500 uppercase tracking-widest font-bold">Comprador</div>
                <select
                  value={compradorId}
                  onChange={(e) => trocarComprador(e.target.value)}
                  className="bg-black/60 border border-white/10 rounded-xl p-2 text-white outline-none focus:border-[#c7a44c] transition-colors cursor-pointer w-48 text-sm font-bold"
                >
                  {personagensDoUsuario.map(c => (
                    <option key={c.id} value={c.id}>{c.nome}</option>
                  ))}
                </select>
              </div>

              <div className="h-px w-full bg-gradient-to-r from-transparent via-white/10 to-transparent my-1"></div>

              <div className="flex gap-3 justify-between w-full">
                <div className="flex flex-col items-center p-2 rounded-xl border bg-black/40 border-white/5">
                  <span className="text-[9px] uppercase tracking-wider text-gray-400">Solares</span>
                  <span className="text-sm font-bold text-yellow-400">{saldos.sol} SOL</span>
                </div>
                <div className="flex flex-col items-center p-2 rounded-xl border bg-black/40 border-white/5">
                  <span className="text-[9px] uppercase tracking-wider text-gray-400">Lunaris</span>
                  <span className="text-sm font-bold text-gray-300">{saldos.lun} LUN</span>
                </div>
                <div className="flex flex-col items-center p-2 rounded-xl border bg-black/40 border-white/5">
                  <span className="text-[9px] uppercase tracking-wider text-gray-400">Estrelas</span>
                  <span className="text-sm font-bold text-fuchsia-400">{saldos.frag} FRG</span>
                </div>
                <div className="flex flex-col items-center p-2 rounded-xl border bg-black/40 border-white/5">
                  <span className="text-[9px] uppercase tracking-wider text-gray-400">Sombrios</span>
                  <span className="text-sm font-bold text-indigo-400">{saldos.cred} CRD</span>
                </div>
              </div>

            </div>
          )}

          {/* GM BUTTON */}
          {podeGerenciarRecompensas && (
            <button
              onClick={() => setShowGmPanel(true)}
              className="mt-2 w-full py-2 rounded-xl text-xs font-bold tracking-widest uppercase bg-purple-900/40 border border-purple-500/50 text-purple-300 hover:bg-purple-800/60 hover:text-white transition-all shadow-[0_0_15px_rgba(168,85,247,0.2)] relative"
            >
              Recompensas da Campanha
              {notificacoesGM.length > 0 && (
                <span className="absolute -top-2 -right-2 bg-red-500 text-white text-[10px] w-5 h-5 flex items-center justify-center rounded-full animate-bounce">
                  {notificacoesGM.length}
                </span>
              )}
            </button>
          )}

        </div>
      </div>

      {modoLoja === 'Comprar' && catalogoLoading && (
        <div role="status" className="mb-8 rounded-2xl border border-white/10 bg-black/30 px-5 py-4 text-gray-300">
          Carregando itens publicados pela campanha...
        </div>
      )}
      {modoLoja === 'Comprar' && catalogoError && (
        <div role="alert" className="mb-8 rounded-2xl border border-red-500/40 bg-red-950/30 px-5 py-4 text-red-200">
          {catalogoError}
        </div>
      )}

      {/* FILTROS DE INTERFACE (PILLS) */}
      <div className="flex flex-col gap-6 mb-12 bg-[#0b0a12]/50 backdrop-blur-md p-6 rounded-3xl border border-white/5 shadow-xl">
        
        {/* BUSCA, ORDENAÇÃO E TOGGLES RÁPIDOS */}
        <div className="flex flex-col lg:flex-row gap-4 w-full">
          <div className="relative flex-1">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" size={20} />
            <input 
              type="search" 
              placeholder="Buscar por nome ou descrição..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-black/40 border border-white/10 rounded-2xl py-3 pl-12 pr-4 text-white placeholder-gray-600 focus:outline-none focus:border-[#c7a44c]/50 transition-all text-sm"
            />
          </div>
          
          <div className="flex gap-4">
            {modoLoja === 'Comprar' && (
              <>
                <button
                  onClick={() => setMostrarWishlist(!mostrarWishlist)}
                  className={`flex items-center gap-2 px-4 py-3 rounded-2xl border text-sm font-bold tracking-widest uppercase transition-all ${
                    mostrarWishlist ? 'bg-red-500/20 text-red-400 border-red-500/50' : 'bg-black/40 text-gray-400 border-white/10 hover:text-white'
                  }`}
                >
                  <Heart size={16} fill={mostrarWishlist ? 'currentColor' : 'none'} /> Desejos
                </button>
              </>
            )}

          </div>
        </div>
        
        <div className="flex flex-col xl:flex-row gap-6 justify-between">
          
          {/* CATEGORIAS PILLS */}
          <div className="flex-1">
            <div className="text-[10px] text-gray-500 uppercase tracking-widest font-bold mb-3 pl-1">Categorias</div>
            <div className="flex flex-wrap gap-2">
              {(Object.keys(CATEGORIAS_ICONES) as Array<ItemCategoria | 'Todos'>).map(cat => {
                const Icon = CATEGORIAS_ICONES[cat];
                const isSelected = selectedCategoria === cat;
                return (
                  <motion.button
                    key={cat}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => setSelectedCategoria(cat)}
                    className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold border transition-all ${
                      isSelected 
                        ? (cat === 'Relíquias da Criação' ? 'bg-fuchsia-500/20 border-fuchsia-400 text-fuchsia-400 shadow-[0_0_20px_rgba(232,121,249,0.4)]' : 'bg-[#c7a44c]/20 border-[#c7a44c]/50 text-[#c7a44c] shadow-[0_0_15px_rgba(199,164,76,0.2)]')
                        : (cat === 'Relíquias da Criação' ? 'bg-black/40 border-fuchsia-500/30 text-fuchsia-500/70 hover:border-fuchsia-400 hover:text-fuchsia-400' : 'bg-black/40 border-white/5 text-gray-400 hover:border-white/20 hover:text-white')
                    }`}
                  >
                    <Icon size={16} />
                    {cat}
                  </motion.button>
                );
              })}
            </div>
            
            {/* SUBFILTROS DINÂMICOS */}
            <AnimatePresence mode="wait">
              {subfiltrosDisponiveis.length > 0 && modoLoja === 'Comprar' && (
                <motion.div 
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="mt-4 flex flex-wrap gap-2 border-t border-white/5 pt-4"
                >
                  {subfiltrosDisponiveis.map(sub => (
                    <button
                      key={sub}
                      onClick={() => setSubfiltro(sub)}
                      className={`text-xs px-3 py-1.5 rounded-lg border transition-all font-bold tracking-wider ${
                        subfiltro === sub
                          ? 'bg-white/10 border-white/30 text-white'
                          : 'bg-transparent border-transparent text-gray-500 hover:text-gray-300 hover:bg-white/5'
                      }`}
                    >
                      {sub}
                    </button>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* RARIDADES PILLS */}
          <div>
            <div className="text-[10px] text-gray-500 uppercase tracking-widest font-bold mb-3 pl-1">Raridade</div>
            <div className="flex flex-wrap gap-2">
              {(Object.keys(RARIDADES_CORES) as Array<ItemRaridade | 'Todas'>).map(rar => {
                const colorClasses = RARIDADES_CORES[rar];
                const isSelected = selectedRaridade === rar;
                let activeClass = '';
                if (isSelected) {
                  switch (rar) {
                    case 'Comum': activeClass = 'bg-gray-500/20 border-gray-500 text-white shadow-[0_0_15px_rgba(107,114,128,0.3)]'; break;
                    case 'Incomum': activeClass = 'bg-blue-500/20 border-blue-500 text-blue-300 shadow-[0_0_15px_rgba(59,130,246,0.3)]'; break;
                    case 'Raro': activeClass = 'bg-purple-500/20 border-purple-500 text-purple-300 shadow-[0_0_15px_rgba(168,85,247,0.3)]'; break;
                    case 'Épico': activeClass = 'bg-yellow-500/20 border-yellow-500 text-yellow-300 shadow-[0_0_15px_rgba(234,179,8,0.3)]'; break;
                    case 'Lendário': activeClass = 'bg-orange-500/20 border-orange-500 text-orange-300 shadow-[0_0_15px_rgba(249,115,22,0.3)]'; break;
                    case 'Relíquia': activeClass = 'bg-red-500/20 border-red-500 text-red-300 shadow-[0_0_15px_rgba(239,68,68,0.3)]'; break;
                    case 'Relíquia da Criação': activeClass = 'bg-fuchsia-500/20 border-fuchsia-500 text-fuchsia-300 shadow-[0_0_20px_rgba(232,121,249,0.5)]'; break;
                    default: activeClass = 'bg-white/10 border-white/30 text-white shadow-[0_0_15px_rgba(255,255,255,0.1)]'; break;
                  }
                }

                return (
                  <motion.button
                    key={rar}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => setSelectedRaridade(rar)}
                    className={`px-4 py-2 rounded-xl text-sm font-bold border transition-all ${
                      isSelected 
                        ? activeClass
                        : `bg-black/40 border-white/5 ${colorClasses}`
                    }`}
                  >
                    {rar}
                  </motion.button>
                );
              })}
            </div>
          </div>
          
        </div>
      </div>

      {/* GRID DE ITENS */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8">
        <AnimatePresence>
          {visibleItems.map((item) => (
            <ItemCard 
              key={item.id} 
              item={item} 
              onView={(it) => setItemSelecionado(it)}
              onBuy={handleAddToCart} 
              podeComprar={Boolean(compradorAtivo)}
              isWishlisted={modoLoja === 'Comprar' ? wishlist.includes(item.id) : undefined}
              onToggleWishlist={modoLoja === 'Comprar' ? () => toggleWishlist(item.id) : undefined}
            />
          ))}
        </AnimatePresence>
        
        {modoLoja !== 'Recompensas' && filteredItems.length === 0 && (modoLoja !== 'Comprar' || (!catalogoLoading && !catalogoError)) && (
          <div className="col-span-full py-20 flex flex-col items-center justify-center text-center">
            {modoLoja === 'Comprar' ? (
              <>
                <ShoppingBag size={64} className="text-gray-700 mx-auto mb-4 opacity-50" />
                <div className="text-gray-500 text-xl font-bold uppercase tracking-widest">Nenhum item encontrado</div>
                <p className="text-gray-600 mt-2">O mercador não possui nenhum item com esses filtros.</p>
              </>
            ) : (
              <>
                <Archive size={64} className="text-gray-700 mx-auto mb-4 opacity-50" />
                <div className="text-gray-500 text-xl font-bold uppercase tracking-widest">Inventário Vazio</div>
                <p className="text-gray-600 mt-2">Você não tem itens para vender com estes filtros.</p>
              </>
            )}
          </div>
        )}

        {/* BOTAO CARREGAR MAIS */}
        {modoLoja !== 'Recompensas' && itemsToShow < filteredItems.length && (
          <div className="col-span-full flex justify-center mt-12">
            <button
              onClick={() => setItemsToShow(prev => prev + 24)}
              className="px-8 py-3 bg-black/60 border border-white/10 rounded-2xl text-gray-300 hover:text-white hover:border-[#c7a44c]/50 transition-all font-bold tracking-widest text-sm uppercase shadow-[0_0_15px_rgba(0,0,0,0.5)]"
            >
              Carregar Mais ({filteredItems.length - itemsToShow} restantes)
            </button>
          </div>
        )}
      </div>

      {/* VIEW DE RECOMPENSAS */}
      {modoLoja === 'Recompensas' && (
        <div className="grid grid-cols-1 md:grid-cols-3 xl:grid-cols-4 gap-8">
          <AnimatePresence>
            {recompensas.map(recompensa => (
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                key={recompensa.personagem_id}
                className="relative bg-[#0b0a12] border border-orange-900/50 rounded-lg p-6 flex flex-col items-center justify-between shadow-[0_0_30px_rgba(154,52,18,0.2)] overflow-hidden"
                style={{ backgroundImage: 'url("https://www.transparenttextures.com/patterns/aged-paper.png")' }}
              >
                <div className="absolute inset-0 bg-orange-950/20 mix-blend-multiply pointer-events-none"></div>
                <div className="relative z-10 w-full text-center border-b border-orange-900/30 pb-4 mb-4">
                  <h3 className="text-3xl font-black text-orange-200 uppercase tracking-widest" style={{ fontFamily: 'Cinzel, serif' }}>Procurado</h3>
                  <div className="text-xs text-orange-400 uppercase tracking-[0.2em] font-bold mt-1">
                    {recompensa.origem_sistema ? 'Inadimplência no Banco Lunar' : 'Marcado por Caçadores'}
                  </div>
                </div>
                
                <div className="relative z-10 w-24 h-24 bg-black/50 border-2 border-orange-900 rounded-full mb-4 flex items-center justify-center shadow-inner">
                  <Skull size={40} className="text-orange-700/50" />
                </div>
                
                <div className="relative z-10 text-center mb-6">
                  <h4 className="text-xl font-bold text-white mb-2">{recompensa.personagem_nome}</h4>
                  <div className="text-2xl font-black text-orange-400 drop-shadow-[0_0_8px_rgba(251,146,60,0.5)]">
                    {recompensa.valor_total.toLocaleString()} LUN
                  </div>
                </div>
                
                <button
                  onClick={() => setReivindicacaoAlvo(recompensa)}
                  className="relative z-10 w-full py-3 bg-red-600 hover:bg-red-500 text-white font-bold tracking-widest uppercase rounded-md shadow-lg transition-all border border-red-400/50"
                >
                  Reivindicar
                </button>
              </motion.div>
            ))}
          </AnimatePresence>

          {recompensas.length === 0 && (
            <div className="col-span-full py-20 flex flex-col items-center justify-center text-center">
              <Skull size={64} className="text-gray-700 mx-auto mb-4 opacity-50" />
              <div className="text-gray-500 text-xl font-bold uppercase tracking-widest">Nenhuma recompensa ativa</div>
              <p className="text-gray-600 mt-2">Nenhum alvo na lista de procurados da região.</p>
            </div>
          )}
        </div>
      )}

      {/* TOAST SYSTEM */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: 50, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.9 }}
            role={toast.type === 'error' ? 'alert' : 'status'}
            aria-live="polite"
            className={`fixed bottom-10 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 px-6 py-4 rounded-full backdrop-blur-xl border shadow-2xl ${
              toast.type === 'success' 
                ? 'bg-[#c7a44c]/20 border-[#c7a44c]/50 text-white shadow-[0_0_30px_rgba(199,164,76,0.3)]' 
                : 'bg-red-500/20 border-red-500/50 text-white shadow-[0_0_30px_rgba(239,68,68,0.3)]'
            }`}
          >
            {toast.type === 'success' ? <CheckCircle className="text-[#c7a44c]" /> : <XCircle className="text-red-400" />}
            <span className="font-medium tracking-wide">{toast.message}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* MODAL DE CHECKOUT DE LOTE */}
      <AnimatePresence>
        {showCheckoutModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[110] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4"
            role="dialog"
            aria-modal="true"
            aria-labelledby="checkout-title"
          >
            <motion.div
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              className="bg-[#0b0a12] border border-[#c7a44c]/30 rounded-2xl p-6 max-w-md w-full shadow-[0_0_40px_rgba(199,164,76,0.15)] relative overflow-hidden"
            >
              <h3 id="checkout-title" className={`text-2xl font-bold tracking-wider mb-2 ${modoLoja === 'Comprar' ? 'text-[#c7a44c]' : 'text-red-400'}`} style={{fontFamily: 'Cinzel, serif'}}>
                {modoLoja === 'Comprar' ? 'Finalizar Compra do Lote' : 'Vender Lote'}
              </h3>
              <div className="text-gray-300 mb-6">
                Você tem <strong>{cart.reduce((a,c) => a + c.quantidade, 0)} itens</strong> no carrinho. 
                <div className="mt-3 flex flex-wrap gap-2">
                  {cartTotals.map((total) => (
                    <strong key={total.moeda} className="rounded-lg bg-white/5 px-3 py-1 text-white">
                      {total.valor.toLocaleString('pt-BR')} {getCurrencySymbol(total.moeda)}
                    </strong>
                  ))}
                </div>
                <p className="mt-3 text-sm text-gray-400">O servidor confirmará preços, disponibilidade e saldo antes de efetivar a operação.</p>
              </div>
              
              <div className="flex justify-end gap-4">
                <button 
                  onClick={() => setShowCheckoutModal(false)}
                  disabled={checkoutInProgress}
                  className="px-4 py-2 rounded-xl text-gray-400 hover:text-white bg-white/5 hover:bg-white/10 transition-colors"
                >
                  Cancelar
                </button>

                <button 
                  onClick={() => void executeCheckout()}
                  disabled={checkoutInProgress}
                  className={`px-6 py-2 rounded-xl text-black font-bold tracking-wide transition-colors disabled:cursor-wait disabled:opacity-60 ${modoLoja === 'Comprar' ? 'bg-[#c7a44c] hover:bg-yellow-400' : 'bg-red-500 hover:bg-red-400'}`}
                >
                  {checkoutInProgress ? 'Processando...' : (modoLoja === 'Comprar' ? 'Confirmar' : 'Vender')}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* MODAL DO MESTRE (GM PANEL) */}
      <AnimatePresence>
        {showGmPanel && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[120] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4"
            role="dialog"
            aria-modal="true"
            aria-labelledby="recompensas-gm-title"
          >
            <motion.div
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              className="bg-[#0b0a12] border border-purple-500/50 rounded-2xl p-6 max-w-md w-full shadow-[0_0_40px_rgba(168,85,247,0.2)]"
            >
              <h3 id="recompensas-gm-title" className="text-2xl font-bold tracking-wider mb-4 text-purple-400" style={{fontFamily: 'Cinzel, serif'}}>
                Recompensas Pendentes
              </h3>

              {/* RECOMPENSAS PENDENTES */}
              {notificacoesGM.length > 0 && (
                <div className="mb-6 border-t border-purple-500/30 pt-4">
                  <h4 className="text-sm uppercase tracking-widest text-purple-300 font-bold mb-3">Recompensas Reivindicadas</h4>
                  <div className="max-h-48 overflow-y-auto pr-2 space-y-3 custom-scrollbar">
                    {notificacoesGM.map(notif => (
                      <div key={notif.id} className="bg-black/40 border border-white/10 rounded-lg p-3">
                        <div className="text-xs text-gray-300 mb-2">
                          <span className="text-white">{notif.mensagem}</span>
                          {typeof notif.dados?.valor_no_pedido === 'number' && (
                            <strong className="mt-1 block text-orange-300">
                              Valor no pedido: {notif.dados.valor_no_pedido.toLocaleString('pt-BR')} LUN
                            </strong>
                          )}
                        </div>
                        <div className="flex gap-2">
                          <button 
                            onClick={() => handleResolverRecompensa(notif.id, true)}
                            disabled={resolvingClaimId === notif.id}
                            className="flex-1 py-1 bg-green-600/20 text-green-400 hover:bg-green-600/40 border border-green-500/30 rounded text-xs font-bold transition-colors disabled:opacity-50"
                          >
                            Aprovar (Pagar)
                          </button>
                          <button 
                            onClick={() => handleResolverRecompensa(notif.id, false)}
                            disabled={resolvingClaimId === notif.id}
                            className="flex-1 py-1 bg-gray-600/20 text-gray-400 hover:bg-gray-600/40 border border-gray-500/30 rounded text-xs font-bold transition-colors disabled:opacity-50"
                          >
                            Encerrar (NPC)
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex justify-end gap-4 mt-8">
                <button 
                  onClick={() => setShowGmPanel(false)}
                  className="px-6 py-2 rounded-xl text-white font-bold tracking-wide transition-colors bg-purple-600 hover:bg-purple-500"
                >
                  Fechar
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <CartDrawer
        isOpen={isCartOpen}
        onClose={() => setIsCartOpen(false)}
        cart={cart}
        onUpdateQuantity={updateCartQuantity}
        onRemoveItem={removeCartItem}
        onCheckout={() => setShowCheckoutModal(true)}
        isVenda={modoLoja === 'Vender'}
        isProcessing={checkoutInProgress}
      />

      {/* MODAL DE CONFIRMACAO DE REIVINDICACAO */}
      <AnimatePresence>
        {reivindicacaoAlvo && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[110] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4"
            role="dialog"
            aria-modal="true"
            aria-labelledby="recompensa-claim-title"
          >
            <motion.div
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              className="bg-[#0b0a12] border border-red-500/50 rounded-2xl p-6 max-w-md w-full shadow-[0_0_40px_rgba(239,68,68,0.2)]"
            >
              <h3 id="recompensa-claim-title" className="text-2xl font-bold tracking-wider mb-2 text-red-500" style={{fontFamily: 'Cinzel, serif'}}>
                Confirmar Caçada
              </h3>
              <p className="text-gray-300 mb-6">
                Você, <strong>{compradorAtivo?.nome}</strong>, deseja reivindicar a recompensa por <strong>{reivindicacaoAlvo.personagem_nome}</strong>?
                <br /><br />
                O valor de <strong>{reivindicacaoAlvo.valor_total.toLocaleString()} LUN</strong> será depositado em sua conta após aprovação.
              </p>
              <div className="flex justify-end gap-4">
                <button 
                  onClick={() => setReivindicacaoAlvo(null)}
                  disabled={claimInProgress}
                  className="px-4 py-2 rounded-xl text-gray-400 hover:text-white bg-white/5 hover:bg-white/10 transition-colors"
                >
                  Cancelar
                </button>
                <button 
                  onClick={handleReivindicar}
                  disabled={claimInProgress}
                  className="px-6 py-2 rounded-xl text-white font-bold tracking-wide transition-colors bg-red-600 hover:bg-red-500 shadow-[0_0_15px_rgba(220,38,38,0.4)] disabled:cursor-wait disabled:opacity-60"
                >
                  {claimInProgress ? 'Enviando...' : 'Confirmar'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* MODAL DE DETALHES DO ITEM */}
      <AnimatePresence>
        {itemSelecionado && (
          <LojaItemModal
            item={itemSelecionado}
            onClose={() => setItemSelecionado(null)}
            onBuy={handleAddToCart}
            podeComprar={Boolean(compradorAtivo)}
            modoLoja={modoLoja as 'Comprar' | 'Vender'}
            compradorAtivo={compradorAtivo}
          />
        )}
      </AnimatePresence>

    </div>
  );
};
