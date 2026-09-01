import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, ShoppingBag, CheckCircle, XCircle, LayoutGrid, Sword, Shield, ShieldHalf, FlaskConical, Users, Gem, Archive, Heart, Sparkles, Cpu, Wand2, Wrench, Apple, MapPin, Building2, Skull, Globe2, Compass, RotateCcw, CircleGauge, Store, ChevronRight, Backpack } from 'lucide-react';
import { aplicarRaridadeCompra, calcularValorRevenda, LojaItem, ItemCategoria, ItemRaridade, itemPermiteEscolherRaridade, lerRaridadeChave, nivelLojaParaRaridadeCompra, NOMES_LOCAIS_LOJA, getCurrencySymbol, itemCorrespondeBusca, itemCorrespondeProficiencia, itemCorrespondeSubfiltro, itemEhVeiculoCompleto, lerPrecoNativoLoja, mapearCatalogoLoja, RARIDADES_COMPRA_EQUIPAMENTO, RaridadeCompraEquipamento, rotuloRaridadeChave, somarPrecosNativos } from '../../services/lojaCatalogService';
import { ItemCard } from './components/ItemCard';
import { LojaItemModal } from './components/LojaItemModal';
import { CartDrawer, CartItem, cartItemKey } from './components/CartDrawer';
import { useCharacterStore } from '../../store/useCharacterStore';
import { useAuthStore } from '../../store/useAuthStore';
import { useWishlist } from '../../hooks/useWishlist';
import { listarRecompensas, reivindicarRecompensa, resolverRecompensa, Recompensa } from '../../services/bountiesApi';
import { api } from '../../services/apiClient';
import { CheckoutAttempt, createIdempotencyKey, hasVerifiableShopOrigin, lojaApi, MAX_SHOP_UNITS, prepareCheckoutAttempt } from '../../services/lojaApi';
import { useDialogAccessibility } from '../../hooks/useDialogAccessibility';
import { Select } from '../../components/ui/Select';
import { GuidedTour } from '../../components/ui/GuidedTour';
import { LOJA_TOUR_STEPS, lojaTourJaVisto, serializarLojaTourVisto } from './lojaTourConfig';
import { grupoLimiteItemEspecial, resumirLimiteItensEspeciais } from '../../services/itensEspeciaisService';
import { RARIDADES_EQUIPAMENTO } from '../../../data/regras/raridadesEquipamentos';
import './loja.css';

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
  'Armaduras': Shield,
  'Escudos': ShieldHalf,
  'Modificações': Wrench,
  'Consumíveis': FlaskConical,
  'Bens': Building2,
  'Implantes Cibernéticos': Cpu,
  'Artefatos Mágicos': Wand2,
  'Mercenários': Users,
  'Componentes': Gem,
  'Itens Comuns': Backpack,
  'Outros': Archive,
} as const;

const RARIDADES_CORES = {
  'Todas': 'hover:bg-white/10 text-gray-400',
  'Comum': 'hover:bg-gray-500/20 text-gray-300',
  'Incomum': 'hover:bg-emerald-500/20 text-emerald-400',
  'Raro': 'hover:bg-blue-500/20 text-blue-400',
  'Épico': 'hover:bg-purple-500/20 text-purple-400',
  'Lendário': 'hover:bg-amber-500/20 text-amber-400',
  'Mítico': 'hover:bg-red-500/20 text-red-400',
  'Relíquia da Criação': 'hover:bg-white/10 text-white',
  'Desconhecida': 'hover:bg-rose-500/20 text-rose-300',
} as const;

const SUBFILTROS_POR_CATEGORIA: Partial<Record<ItemCategoria, readonly string[]>> = {
  'Armas': ['Todos', 'Corpo a Corpo', 'À Distância', 'Mágicas'],
  'Modificações': ['Todos', 'Comuns', 'Marciais', 'Armas', 'Armaduras', 'Escudos', 'Itens gerais e mágicos'],
  'Bens': ['Todos', 'Propriedades', 'Veículos Completos', 'Peças e Módulos'],
  'Consumíveis': ['Todos', 'Poções', 'Selos', 'Rituais', 'Ferramentas'],
  'Mercenários': ['Todos', 'Guardas de local', 'Escoltas', 'Tripulação', 'Ofícios', 'Feras e Monstros', 'Marítimas', 'Espíritos', 'Golens', 'Vazio'],
  'Componentes': ['Todos', 'Componentes Químicos', 'Componentes Ritualísticos', 'Componentes Veiculares', 'Sucata', 'Mantimentos', 'Matéria-prima'],
  'Frutos do Éden': ['Todos', 'Sobrenatural', 'Mutação', 'Elemental'],
};

// Independente do subfiltro de Tipo acima (modo de combate) - dá pra
// combinar os dois, tipo Corpo a Corpo + Marcial ao mesmo tempo, porque cada
// um mexe num campo diferente do catálogo (modo x subtipo).
const PROFICIENCIAS_POR_CATEGORIA: Partial<Record<ItemCategoria, readonly string[]>> = {
  'Armas': ['Todos', 'Simples', 'Marcial'],
  'Armaduras': ['Todos', 'Simples', 'Marcial'],
  'Escudos': ['Todos', 'Simples', 'Marcial'],
};

const LOCAIS_LOJA = [
  { id: 1, curto: NOMES_LOCAIS_LOJA[0], titulo: 'Feira Local', descricao: 'Suprimentos, ferramentas e equipamentos cotidianos.', icone: MapPin, cor: '#d6a254', nivelRotulo: 'cotidiano' },
  { id: 2, curto: NOMES_LOCAIS_LOJA[1], titulo: 'Mercado da Metrópole', descricao: 'Arsenal marcial, tecnologia, propriedades e veículos.', icone: Building2, cor: '#60a5fa', nivelRotulo: 'especializado' },
  { id: 3, curto: NOMES_LOCAIS_LOJA[2], titulo: 'Mercado Negro', descricao: 'Contrabando, implantes, venenos e artefatos proibidos.', icone: Skull, cor: '#f87171', nivelRotulo: 'restrito' },
  { id: 4, curto: NOMES_LOCAIS_LOJA[3], titulo: 'Banco Lunar', descricao: 'Peças lendárias, relíquias e comércio multiversal.', icone: Globe2, cor: '#facc15', nivelRotulo: 'multiversal' },
] as const;

const CATEGORIA_DESCRICOES: Record<ItemCategoria | 'Todos', string> = {
  Todos: 'Tudo o que este mercado consegue oferecer no momento.',
  'Relíquias da Criação': 'Objetos únicos que interferem nas leis da realidade.',
  Armas: 'Armas simples, marciais, tecnológicas e mágicas.',
  Armaduras: 'Proteção pro corpo inteiro: Defesa, Resistência e penalidade de peso.',
  Escudos: 'Equipamento de bloqueio, do broquel simples ao escudo de torre marcial.',
  Modificações: 'Melhorias instaladas em um item que ainda tenha espaço pela raridade.',
  Consumíveis: 'Poções, selos, rituais e ferramentas gastas durante o uso.',
  Bens: 'Propriedades, veículos completos, peças e módulos.',
  Mercenários: 'Contratos, servos e criaturas com ficha própria de Aliado.',
  Componentes: 'Materiais usados em alquimia, rituais, forja, cozinha e manutenção.',
  'Frutos do Éden': 'Poder permanente, raro e vinculado a uma única criatura.',
  'Implantes Cibernéticos': 'Peças instaladas no corpo e negociadas no mercado clandestino.',
  'Artefatos Mágicos': 'Objetos sobrenaturais que dividem o limite de uso com itens de perícia.',
  'Itens Comuns': 'Acessórios, kits e ferramentas de uso cotidiano, sem magia envolvida.',
  Outros: 'O que não se encaixa em nenhuma outra categoria da Loja.',
};

const CATEGORIAS_OPCOES = (Object.keys(CATEGORIAS_ICONES) as Array<ItemCategoria | 'Todos'>)
  .map((value) => ({ value, label: value }));
const RARIDADES_OPCOES = (Object.keys(RARIDADES_CORES) as Array<ItemRaridade | 'Todas'>)
  .map((value) => ({ value, label: value }));

export const LojaPage: React.FC = () => {
  const { characters, fetchCharacters, flushCharacterSaves } = useCharacterStore();
  const { campanhaAtiva, usuario } = useAuthStore();
  const config = campanhaAtiva?.configuracoes || {};
  const locaisOcultos = config.locais_ocultos || [3, 4];
  const raridadesOcultas = Array.isArray(config.raridades_ocultas) ? config.raridades_ocultas.map(String) : [];
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

  // Permite chegar na Loja já numa localização específica via link (ex.: o
  // botão "Ir para a Loja" do Banco Lunar na cena do Mundo usa
  // /loja?localizacao=4). Só some da URL depois de aplicado, senão volta a
  // forçar essa localização toda vez que o usuário troca de aba.
  const [searchParams, setSearchParams] = useSearchParams();
  useEffect(() => {
    const alvo = Number(searchParams.get('localizacao'));
    if ([1, 2, 3, 4].includes(alvo) && localizacaoDisponivel(alvo)) {
      trocarLocalizacao(alvo);
    }
    if (searchParams.has('localizacao')) {
      const proximos = new URLSearchParams(searchParams);
      proximos.delete('localizacao');
      setSearchParams(proximos, { replace: true });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const [modoLoja, setModoLoja] = useState<'Comprar' | 'Vender' | 'Recompensas'>('Comprar');
  const [searchTerm, setSearchTerm] = useState(() => searchParams.get('busca') ?? '');
  const [selectedCategoria, setSelectedCategoria] = useState<ItemCategoria | 'Todos'>(() => {
    const categoria = searchParams.get('categoria');
    return categoria && categoria !== 'Todos' && Object.prototype.hasOwnProperty.call(CATEGORIAS_ICONES, categoria)
      ? categoria as ItemCategoria
      : 'Todos';
  });
  const [selectedRaridade, setSelectedRaridade] = useState<ItemRaridade | 'Todas'>('Todas');
  const [subfiltro, setSubfiltro] = useState<string>('Todos');
  const [proficiencia, setProficiencia] = useState<string>('Todos');
  const [itemsToShow, setItemsToShow] = useState(24);
  const [compradorId, setCompradorId] = useState<string>('');
  
  const [mostrarWishlist, setMostrarWishlist] = useState(false);
  const [tourAberto, setTourAberto] = useState(false);

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
  const quantidadeCarrinho = cart.reduce((total, item) => total + item.quantidade, 0);
  const chaveTour = `jardim:loja-tour:v1:${usuario?.id || 'local'}`;

  const toastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const checkoutAttemptRef = useRef<CheckoutAttempt | null>(null);
  const tourTentadoRef = useRef(false);
  const checkoutInFlightRef = useRef(false);
  const claimAttemptRef = useRef<{ signature: string; idempotencia: string } | null>(null);
  const claimInFlightRef = useRef(false);
  const resolveAttemptsRef = useRef(new Map<string, string>());
  const resolvingClaimsRef = useRef(new Set<string>());
  const checkoutDialogRef = useRef<HTMLDivElement>(null);
  const gmDialogRef = useRef<HTMLDivElement>(null);
  const claimDialogRef = useRef<HTMLDivElement>(null);

  useDialogAccessibility({
    open: showCheckoutModal,
    dialogRef: checkoutDialogRef,
    onClose: () => { if (!checkoutInProgress) setShowCheckoutModal(false); },
  });
  useDialogAccessibility({ open: showGmPanel, dialogRef: gmDialogRef, onClose: () => setShowGmPanel(false) });
  useDialogAccessibility({
    open: Boolean(reivindicacaoAlvo),
    dialogRef: claimDialogRef,
    onClose: () => { if (!claimInProgress) setReivindicacaoAlvo(null); },
  });

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

  useEffect(() => {
    if (!campanhaAtiva?.id || catalogoLoading || catalogoError || tourAberto || tourTentadoRef.current) return undefined;
    try {
      if (lojaTourJaVisto(localStorage.getItem(chaveTour))) return undefined;
    } catch {
      // Sem armazenamento, o guia ainda abre uma vez nesta montagem.
    }
    const timer = window.setTimeout(() => {
      tourTentadoRef.current = true;
      setTourAberto(true);
    }, 750);
    return () => window.clearTimeout(timer);
  }, [campanhaAtiva?.id, catalogoError, catalogoLoading, chaveTour, tourAberto]);

  const encerrarTour = () => {
    try {
      localStorage.setItem(chaveTour, serializarLojaTourVisto());
    } catch {
      // O botão manual continua disponível mesmo se o navegador bloquear o armazenamento.
    }
    setTourAberto(false);
  };

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
  const limiteItensEspeciais = useMemo(
    () => resumirLimiteItensEspeciais(compradorAtivo?.inventarioCentral || [], compradorAtivo?.ficha || {}),
    [compradorAtivo?.ficha, compradorAtivo?.inventarioCentral],
  );
  const localAtual = LOCAIS_LOJA.find((local) => local.id === localizacaoAtual) || LOCAIS_LOJA[1];

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

  const handleAddToCart = (item: LojaItem, alvoItemId?: string, alvoItemNome?: string, modo?: 'comprar' | 'contratar') => {
    if (!compradorAtivo) {
      showToast('Selecione um comprador primeiro.', 'error');
      return;
    }
    // Contratar cobra o preço reduzido de item.contratacao em vez do preço de
    // compra - a entrada do carrinho já nasce com o preço certo pra somar e
    // exibir sem o resto da tela precisar saber de dois preços por item.
    const itemParaCarrinho = modo === 'contratar' && item.contratacao
      ? { ...item, valorOriginal: item.contratacao.valorOriginal, moedaPreco: item.contratacao.moedaPreco }
      : item;
    setCart(prev => {
      // Itens com alvo não devem ser agrupados a menos que tenham o mesmo alvo.
      // Contratar e comprar o mesmo mercenário também não se agrupam - são
      // vínculos diferentes. Como o alvo fixa quantidade em 1 por via das
      // regras, tratamos sempre como entrada única ou agrupada pelo alvo.
      const existingIdx = prev.findIndex(i => i.item.id === item.id && i.alvoItemId === alvoItemId && i.modo === modo && i.item.raridadeCompra === item.raridadeCompra);
      if (existingIdx !== -1) {
        const maximo = Math.min(item.quantidadeDisponivel ?? MAX_SHOP_UNITS, MAX_SHOP_UNITS);
        const newCart = [...prev];
        // Se tiver alvo, não deixa aumentar a qtd, pois o item alvo só recebe 1
        if (!alvoItemId) {
          newCart[existingIdx].quantidade = Math.min(maximo, newCart[existingIdx].quantidade + 1);
        }
        return newCart;
      }
      return [...prev, { item: itemParaCarrinho, quantidade: 1, alvoItemId, alvoItemNome, modo }];
    });
    showToast(`${item.nome} adicionado ao lote!`, 'success');
  };

  const abrirDetalhesItem = (item: LojaItem) => {
    const raridadeFiltro = lerRaridadeChave(selectedRaridade);
    const raridadeSelecionavel = raridadeFiltro && RARIDADES_COMPRA_EQUIPAMENTO.some((opcao) => opcao.value === raridadeFiltro)
      ? raridadeFiltro as RaridadeCompraEquipamento
      : null;
    setItemSelecionado(
      modoLoja === 'Comprar' && raridadeSelecionavel && itemPermiteEscolherRaridade(item)
        ? aplicarRaridadeCompra(item, raridadeSelecionavel)
        : item,
    );
  };

  const podeAdicionarItem = (_item?: LojaItem) => Boolean(compradorAtivo);

  const updateCartQuantity = (cartKey: string, delta: number) => {
    setCart(prev => prev.map(i => {
      const key = cartItemKey(i);
      if (key === cartKey) {
        const novaQtd = Math.min(i.item.quantidadeDisponivel ?? MAX_SHOP_UNITS, MAX_SHOP_UNITS, Math.max(1, i.quantidade + delta));
        return { ...i, quantidade: novaQtd };
      }
      return i;
    }));
  };

  const removeCartItem = (cartKey: string) => {
    setCart(prev => prev.filter(i => {
      const key = cartItemKey(i);
      return key !== cartKey;
    }));
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
        ...(operation === 'compra' ? { localizacao_loja: localizacaoAtual } : {}),
        itens: cart.map(({ item, quantidade, alvoItemId, modo }) => ({
          item_id: item.id,
          quantidade,
          alvo_item_id: alvoItemId,
          ...(operation === 'compra' && modo === 'contratar' ? { modo } : {}),
          ...(operation === 'compra' && item.raridadeCompra ? { raridade: item.raridadeCompra } : {}),
        })),
      });
      // Veículo completo e propriedade não viram entidade jogável (PV, combustível,
      // instalações...) só por serem comprados: ainda precisam da migração em
      // Frota/Bens da campanha. Avisa aqui pra isso não passar despercebido.
      const comprouAtivavel = operation === 'compra' && cart.some(({ item }) => itemEhVeiculoCompleto(item) || item.tipoOrigem === 'propriedade');
      checkoutAttemptRef.current = attempt;
      const resultado = operation === 'compra' ? await lojaApi.comprar(attempt.payload) : await lojaApi.vender(attempt.payload);
      await fetchCharacters();
      if (operation === 'compra' && resultado.infracoes?.length) {
        // Requisito de nível/classe não bloqueia a compra (o mestre já é avisado
        // por notificação), mas quem comprou precisa saber que ficou registrado.
        showToast(
          `Compra concluída, mas com pré-requisito ignorado: ${resultado.infracoes.map((inf) => inf.mensagem).join('; ')}. O mestre foi notificado.`,
          'error',
        );
      } else if (comprouAtivavel) {
        showToast('Compra concluída! Para usar o veículo/propriedade em jogo, ative-o em Frota & Bases da campanha.', 'success');
      } else {
        showToast(operation === 'compra' ? 'Compra do lote finalizada com sucesso!' : 'Lote vendido com sucesso!', 'success');
      }
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
      const catalogoItemId = String(invItem.dados?.catalogo_item_id || invItem.item_id);
      const original = catalogo.find(c => c.id === catalogoItemId);
      const raridadeInventario = lerRaridadeChave(invItem.dados?.raridade);
      const raridadeCompra = raridadeInventario && RARIDADES_COMPRA_EQUIPAMENTO.some((opcao) => opcao.value === raridadeInventario)
        ? raridadeInventario as RaridadeCompraEquipamento
        : null;
      const originalNaRaridade = original && raridadeCompra && itemPermiteEscolherRaridade(original)
        ? aplicarRaridadeCompra(original, raridadeCompra)
        : original;
      const precoOriginal = originalNaRaridade
        ? { moedaPreco: originalNaRaridade.moedaPreco, valorOriginal: originalNaRaridade.valorOriginal }
        : lerPrecoNativoLoja(invItem.dados?.preco);
      if (!precoOriginal) return [];
      const valorRevenda = calcularValorRevenda(precoOriginal.valorOriginal);
      
      return [{
        id: invItem.item_id,
        tipoOrigem: originalNaRaridade?.tipoOrigem ?? 'inventario',
        nome: invItem.titulo,
        categoria: originalNaRaridade?.categoria ?? 'Outros',
        raridade: rotuloRaridadeChave(invItem.dados?.raridade),
        moedaPreco: precoOriginal.moedaPreco,
        valorOriginal: valorRevenda,
        nivelLoja: originalNaRaridade?.nivelLoja ?? 1,
        descricao: invItem.dados?.descricao || '',
        propriedades: invItem.dados?.efeito || '',
        quantidadeDisponivel: invItem.quantidade,
        dadosBrutos: invItem.dados,
      } satisfies LojaItem];
    });
  }, [compradorAtivo, catalogo]);

  const filteredItems = useMemo(() => {
    const source: LojaItem[] = modoLoja === 'Comprar' ? catalogo : modoLoja === 'Vender' ? itensVenda : [];

    return source.filter(item => {
      const matchSearch = itemCorrespondeBusca(item, searchTerm);
      const matchCat = selectedCategoria === 'Todos' || item.categoria === selectedCategoria;
      const raridadeFiltro = lerRaridadeChave(selectedRaridade);
      const raridadeEquipamentoDisponivel = modoLoja === 'Comprar'
        && itemPermiteEscolherRaridade(item)
        && raridadeFiltro !== null
        && RARIDADES_COMPRA_EQUIPAMENTO.some((opcao) => opcao.value === raridadeFiltro)
        && Boolean(item.precosRaridade?.[raridadeFiltro as RaridadeCompraEquipamento])
        && nivelLojaParaRaridadeCompra(item, raridadeFiltro as RaridadeCompraEquipamento) <= localizacaoAtual
        && !raridadesOcultas.some((raridade) => lerRaridadeChave(raridade) === raridadeFiltro);
      const matchRar = selectedRaridade === 'Todas' || item.raridade === selectedRaridade || raridadeEquipamentoDisponivel;
      // Cumulativo: cada localização mostra o que é dela mais tudo que já
      // apareceria nas anteriores - é o que o texto "Acesso irrestrito a
      // todos os artefatos da criação" do Banco Lunar promete. Com `===`
      // (comparação antiga) cada local só mostrava os itens exatamente
      // daquele nível, então o Banco Lunar (nível 4, onde caem relíquias e
      // artefatos) escondia tudo que não fosse raríssimo.
      const matchLocal = modoLoja !== 'Comprar' || item.nivelLoja <= localizacaoAtual;

      if (mostrarWishlist && modoLoja === 'Comprar' && !wishlist.includes(item.id)) return false;
      
      const matchSub = modoLoja !== 'Comprar' || itemCorrespondeSubfiltro(item, selectedCategoria, subfiltro);
      const matchProficiencia = modoLoja !== 'Comprar' || itemCorrespondeProficiencia(item, selectedCategoria, proficiencia);

      return matchSearch && matchCat && matchRar && matchSub && matchProficiencia && matchLocal;
    });
  }, [searchTerm, selectedCategoria, selectedRaridade, subfiltro, proficiencia, catalogo, itensVenda, modoLoja, mostrarWishlist, wishlist, localizacaoAtual, raridadesOcultas]);

  const itensEmPromocao = useMemo(
    () => catalogo.filter((item) => item.promocao && item.nivelLoja <= localizacaoAtual).slice(0, 3),
    [catalogo, localizacaoAtual],
  );

  const visibleItems = filteredItems.slice(0, itemsToShow);
  
  const subfiltrosDisponiveis = selectedCategoria === 'Todos'
    ? []
    : SUBFILTROS_POR_CATEGORIA[selectedCategoria] ?? [];
  const proficienciasDisponiveis = selectedCategoria === 'Todos'
    ? []
    : PROFICIENCIAS_POR_CATEGORIA[selectedCategoria] ?? [];

  useEffect(() => {
    setSubfiltro('Todos');
    setProficiencia('Todos');
    setItemsToShow(24);
  }, [selectedCategoria]);

  useEffect(() => {
    setItemsToShow(24);
  }, [searchTerm, selectedRaridade, subfiltro, proficiencia, modoLoja, mostrarWishlist, localizacaoAtual]);

  useEffect(() => {
    if (!showCheckoutModal && !showGmPanel && !reivindicacaoAlvo && !itemSelecionado && !isCartOpen) return undefined;
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      if (itemSelecionado) setItemSelecionado(null);
      else if (reivindicacaoAlvo) setReivindicacaoAlvo(null);
      else if (showGmPanel) setShowGmPanel(false);
      else if (showCheckoutModal && !checkoutInProgress) setShowCheckoutModal(false);
      else if (isCartOpen && !checkoutInProgress) setIsCartOpen(false);
    };
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [checkoutInProgress, isCartOpen, itemSelecionado, reivindicacaoAlvo, showCheckoutModal, showGmPanel]);

  return (
    <div role="main" className="loja-shell app-page mx-auto flex max-w-[100rem] flex-col" style={{ '--loja-accent': localAtual.cor } as React.CSSProperties}>
      <header className="loja-hero mb-8 overflow-hidden rounded-[2rem] border border-white/10">
        <div className="loja-hero__line" aria-hidden="true" />
        <div className="relative p-4 sm:p-6 lg:p-8">
          <div className="mb-7 flex flex-col gap-4 border-b border-white/[0.08] pb-6 xl:flex-row xl:items-start xl:justify-between">
            <div className="max-w-3xl">
              <span className="text-[10px] font-black uppercase tracking-[0.32em] text-[var(--loja-accent)]">Comércio entre as Árvores</span>
              <h1 className="mt-3 font-serif text-[clamp(2rem,6vw,3.6rem)] font-bold leading-[1.05] text-[#f2ead7]">{localAtual.titulo}</h1>
              <p className="mt-4 max-w-2xl text-sm leading-7 text-gray-300/80 sm:text-base">{localAtual.descricao} O que aparece depende do local aberto pela campanha e da publicação atual do catálogo.</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <button type="button" onClick={() => setTourAberto(true)} className="loja-action-button"><Compass size={16} /> Guia da Loja</button>
              <button type="button" data-tour="loja-carrinho" onClick={() => setIsCartOpen(true)} aria-label={`Abrir carrinho com ${quantidadeCarrinho} ${quantidadeCarrinho === 1 ? 'item' : 'itens'}`} className="loja-action-button relative">
                <ShoppingBag size={17} /> Lote
                {quantidadeCarrinho > 0 ? <span className="rounded-full bg-[var(--loja-accent)] px-1.5 py-0.5 text-[10px] font-black text-black">{quantidadeCarrinho}</span> : null}
              </button>
            </div>
          </div>

          <nav className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4" aria-label="Mercados disponíveis" data-tour="loja-locais">
            {LOCAIS_LOJA.filter((local) => !locaisOcultos.includes(local.id) || podeGerenciarRecompensas).map((local) => {
              const Icon = local.icone;
              const ativo = local.id === localizacaoAtual;
              return (
                <button key={local.id} type="button" onClick={() => trocarLocalizacao(local.id)} aria-current={ativo ? 'page' : undefined} className={`loja-location ${ativo ? 'is-active' : ''}`} style={{ '--location-color': local.cor } as React.CSSProperties}>
                  <span className="loja-location__icon"><Icon size={17} /></span>
                  <span className="min-w-0 text-left"><strong className="block text-sm text-gray-100">{local.curto}</strong><span className="mt-0.5 block truncate text-[11px] text-gray-500">Patamar {local.id} · {local.nivelRotulo}</span></span>
                </button>
              );
            })}
          </nav>

          <div className="mt-5 grid gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(25rem,auto)]">
            <div className="grid grid-cols-3 rounded-2xl border border-white/10 bg-black/25 p-1.5" data-tour="loja-modos">
              {(['Comprar', 'Vender', 'Recompensas'] as const).map((modo) => (
                <button key={modo} type="button" onClick={() => trocarModoLoja(modo)} className={`rounded-xl px-2 py-3 text-[10px] font-black uppercase tracking-[0.12em] transition sm:text-xs ${modoLoja === modo ? 'bg-[var(--loja-accent)] text-black shadow-lg' : 'text-gray-500 hover:bg-white/5 hover:text-gray-200'}`}>
                  {modo === 'Recompensas' ? 'Caçadores' : modo}
                </button>
              ))}
            </div>

            {personagensDoUsuario.length > 0 ? (
              <div className="rounded-2xl border border-white/10 bg-black/25 p-3" data-tour="loja-comprador">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                  <label className="min-w-0 flex-1"><span className="mb-1.5 block text-[9px] font-black uppercase tracking-[0.18em] text-gray-500">Personagem da operação</span><Select value={compradorId} onChange={trocarComprador} options={personagensDoUsuario.map((personagem) => ({ value: personagem.id, label: personagem.nome }))} className="w-full sm:min-w-48" /></label>
                  <div className="grid grid-cols-4 gap-1.5">
                    {[['SOL', saldos.sol, 'text-yellow-400'], ['LUN', saldos.lun, 'text-gray-200'], ['FRG', saldos.frag, 'text-fuchsia-400'], ['CRD', saldos.cred, 'text-indigo-300']].map(([rotulo, saldo, cor]) => (
                      <div key={String(rotulo)} className="min-w-14 rounded-xl border border-white/[0.07] bg-black/25 px-2 py-2 text-center"><span className="block text-[8px] font-bold text-gray-600">{rotulo}</span><strong className={`mt-0.5 block text-xs ${cor}`}>{Number(saldo).toLocaleString('pt-BR')}</strong></div>
                    ))}
                  </div>
                </div>
              </div>
            ) : null}
          </div>

          {podeGerenciarRecompensas ? <button type="button" onClick={() => setShowGmPanel(true)} className="relative mt-3 text-xs font-bold text-purple-300 hover:text-purple-200">Recompensas pendentes da campanha{notificacoesGM.length > 0 ? ` (${notificacoesGM.length})` : ''}</button> : null}
        </div>
      </header>

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

      <section className="mb-8 grid gap-3 lg:grid-cols-3" aria-labelledby="loja-regras-titulo" data-tour="loja-regras">
        <h2 id="loja-regras-titulo" className="sr-only">Regras rápidas da Loja</h2>
        <article className="loja-rule-card">
          <div className="loja-rule-card__icon"><CircleGauge size={18} /></div>
          <div className="min-w-0 flex-1">
            <span className="loja-rule-card__eyebrow">Uso de itens especiais</span>
            <strong className="loja-rule-card__title">{limiteItensEspeciais.usados} de {limiteItensEspeciais.limite} em uso</strong>
            <p>Itens de perícia e artefatos dividem o mesmo limite: nível total ÷ 4, arredondado para baixo, mínimo 1. Comprar não ocupa vaga; equipar ocupa.</p>
            <div className="mt-2 flex flex-wrap gap-2 text-[10px] font-bold text-gray-500"><span>{limiteItensEspeciais.equipados.filter((item) => grupoLimiteItemEspecial(item) === 'item-pericia').length} de perícia</span><span>·</span><span>{limiteItensEspeciais.equipados.filter((item) => grupoLimiteItemEspecial(item) === 'artefato').length} artefato(s)</span><span>·</span><span>Nível {limiteItensEspeciais.nivelTotal}</span></div>
            <Link to="/regras?topico=raridades-modificacoes" className="loja-rule-link">Ler raridades e limites <ChevronRight size={13} /></Link>
          </div>
        </article>
        <article className="loja-rule-card">
          <div className="loja-rule-card__icon"><Wrench size={18} /></div>
          <div className="min-w-0 flex-1">
            <span className="loja-rule-card__eyebrow">Capacidade de modificação</span>
            <strong className="loja-rule-card__title">Escolha a raridade do equipamento</strong>
            <p>Armas, armaduras e escudos partem de Comum. No detalhe você pode encomendar de Incomum a Lendário: o preço e o balcão exigido sobem junto com os espaços.</p>
            <div className="mt-2 flex flex-wrap gap-1.5">{RARIDADES_EQUIPAMENTO.slice(0, 5).map((raridade) => <span key={raridade.id} className="rounded-md border border-white/[0.07] bg-black/20 px-2 py-1 text-[9px] font-bold text-gray-500">{raridade.titulo} {raridade.modificacoesMaximas}</span>)}</div>
            <Link to="/regras?topico=modificacoes-equipamentos" className="loja-rule-link">Abrir regra de modificações <ChevronRight size={13} /></Link>
          </div>
        </article>
        <article className="loja-rule-card">
          <div className="loja-rule-card__icon"><Store size={18} /></div>
          <div className="min-w-0 flex-1">
            <span className="loja-rule-card__eyebrow">Disponibilidade</span>
            <strong className="loja-rule-card__title">Patamar {localizacaoAtual}: {localAtual.curto}</strong>
            <p>Os mercados são cumulativos. Este balcão mostra itens de patamar {localizacaoAtual} e todos os anteriores, respeitando ocultações e publicações da campanha.</p>
            <Link to="/regras?topico=loja" className="loja-rule-link">Entender os quatro mercados <ChevronRight size={13} /></Link>
          </div>
        </article>
      </section>

      {modoLoja === 'Comprar' && itensEmPromocao.length > 0 ? (
        <section className="mb-12" aria-labelledby="ofertas-destaque-titulo">
          <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
            <div>
              <div className="mb-2 flex items-center gap-2 text-xs font-bold uppercase tracking-[0.24em] text-rose-400">
                <Sparkles size={16} aria-hidden="true" /> Preços temporariamente reduzidos
              </div>
              <h2 id="ofertas-destaque-titulo" className="text-3xl font-bold text-white" style={{ fontFamily: 'Cinzel, serif' }}>
                Ofertas em destaque
              </h2>
            </div>
            <span className="rounded-full border border-rose-500/30 bg-rose-500/10 px-4 py-2 text-xs font-bold uppercase tracking-widest text-rose-300">
              {itensEmPromocao.length} {itensEmPromocao.length === 1 ? 'item' : 'itens'}
            </span>
          </div>
          <div className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,22rem),1fr))] gap-5 sm:gap-8">
            {itensEmPromocao.map((item) => (
              <ItemCard
                key={`promocao:${item.id}`}
                item={item}
                onView={abrirDetalhesItem}
                onBuy={handleAddToCart}
                podeComprar={podeAdicionarItem(item)}
                isWishlisted={wishlist.includes(item.id)}
                onToggleWishlist={() => toggleWishlist(item.id)}
              />
            ))}
          </div>
        </section>
      ) : null}

      <section className="mb-8 rounded-3xl border border-white/[0.08] bg-[#0b0a12]/75 p-4 shadow-xl backdrop-blur-md sm:p-5" aria-label="Filtros do catálogo" data-tour="loja-filtros">
        <div className="grid gap-3 xl:grid-cols-[minmax(18rem,1.6fr)_minmax(12rem,.8fr)_minmax(12rem,.8fr)_minmax(12rem,.8fr)_minmax(12rem,.8fr)_auto] xl:items-end">
          <label className="relative block"><span className="mb-1.5 block text-[9px] font-black uppercase tracking-[0.18em] text-gray-500">Buscar no balcão</span><Search className="absolute bottom-3 left-3 text-gray-600" size={17} /><input type="search" aria-label="Buscar itens da loja" placeholder="Nome, efeito, material ou uso..." value={searchTerm} onChange={(event) => setSearchTerm(event.target.value)} className="h-11 w-full rounded-xl border border-white/10 bg-black/35 py-2 pl-10 pr-3 text-sm text-white outline-none transition placeholder:text-gray-600 focus:border-[var(--loja-accent)]" /></label>
          <label className="min-w-0"><span className="mb-1.5 block text-[9px] font-black uppercase tracking-[0.18em] text-gray-500">Categoria</span><Select value={selectedCategoria} onChange={(valor) => setSelectedCategoria(valor as ItemCategoria | 'Todos')} options={CATEGORIAS_OPCOES} className="w-full" /></label>
          <label className="min-w-0"><span className="mb-1.5 block text-[9px] font-black uppercase tracking-[0.18em] text-gray-500">Tipo</span><Select value={subfiltro} onChange={setSubfiltro} disabled={modoLoja !== 'Comprar' || subfiltrosDisponiveis.length === 0} options={(subfiltrosDisponiveis.length ? subfiltrosDisponiveis : ['Todos']).map((value) => ({ value, label: value }))} className="w-full" /></label>
          <label className="min-w-0"><span className="mb-1.5 block text-[9px] font-black uppercase tracking-[0.18em] text-gray-500">Proficiência</span><Select value={proficiencia} onChange={setProficiencia} disabled={modoLoja !== 'Comprar' || proficienciasDisponiveis.length === 0} options={(proficienciasDisponiveis.length ? proficienciasDisponiveis : ['Todos']).map((value) => ({ value, label: value }))} className="w-full" /></label>
          <label className="min-w-0"><span className="mb-1.5 block text-[9px] font-black uppercase tracking-[0.18em] text-gray-500">Raridade</span><Select value={selectedRaridade} onChange={(valor) => setSelectedRaridade(valor as ItemRaridade | 'Todas')} options={RARIDADES_OPCOES} className="w-full" /></label>
          <div className="flex gap-2">
            {modoLoja === 'Comprar' ? <button type="button" onClick={() => setMostrarWishlist((atual) => !atual)} aria-pressed={mostrarWishlist} aria-label="Desejos" className={`flex h-11 items-center gap-2 rounded-xl border px-3 text-xs font-bold ${mostrarWishlist ? 'border-rose-400/40 bg-rose-500/10 text-rose-300' : 'border-white/10 bg-black/25 text-gray-500 hover:text-gray-200'}`}><Heart size={15} fill={mostrarWishlist ? 'currentColor' : 'none'} /><span className="hidden 2xl:inline">Desejos</span></button> : null}
            <button type="button" onClick={() => { setSearchTerm(''); setSelectedCategoria('Todos'); setSelectedRaridade('Todas'); setSubfiltro('Todos'); setProficiencia('Todos'); setMostrarWishlist(false); }} aria-label="Limpar filtros" className="flex h-11 items-center gap-2 rounded-xl border border-white/10 bg-black/25 px-3 text-xs font-bold text-gray-500 hover:text-gray-200"><RotateCcw size={15} /><span className="hidden 2xl:inline">Limpar</span></button>
          </div>
        </div>
        <div className="mt-4 flex flex-col gap-2 border-t border-white/[0.06] pt-4 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-gray-400"><strong className="text-gray-200">{selectedCategoria}</strong> · {CATEGORIA_DESCRICOES[selectedCategoria]}</p>
          <span className="shrink-0 text-[10px] font-black uppercase tracking-[0.15em] text-[var(--loja-accent)]">{filteredItems.length} resultado(s)</span>
        </div>
      </section>

      <section data-tour="loja-catalogo" aria-labelledby="loja-catalogo-titulo">
        <div className="mb-5 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div><span className="text-[9px] font-black uppercase tracking-[0.22em] text-[var(--loja-accent)]">Prateleira atual</span><h2 id="loja-catalogo-titulo" className="mt-1 font-serif text-2xl font-bold text-[#f2ead7]">{modoLoja === 'Vender' ? 'Itens disponíveis para venda' : modoLoja === 'Recompensas' ? 'Mural de contratos' : selectedCategoria}</h2></div>
          {modoLoja !== 'Recompensas' ? <p className="max-w-xl text-sm leading-6 text-gray-500">Abra os detalhes para ler a regra completa do item antes de colocar no lote.</p> : null}
        </div>
        <div className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,19rem),1fr))] gap-4 sm:gap-5">
        <AnimatePresence>
          {visibleItems.map((item) => (
            <ItemCard 
              key={item.id} 
              item={item} 
              onView={abrirDetalhesItem}
              onBuy={handleAddToCart} 
              podeComprar={podeAdicionarItem(item)}
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
      </section>

      {/* VIEW DE RECOMPENSAS */}
      {modoLoja === 'Recompensas' && (
        <div className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,16rem),1fr))] gap-5 sm:gap-8" data-tour="loja-recompensas">
          <AnimatePresence>
            {recompensas.map(recompensa => (
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                key={recompensa.personagem_id}
                className="aged-paper-texture content-auto-list-item relative bg-[#0b0a12] border border-orange-900/50 rounded-lg p-6 flex flex-col items-center justify-between shadow-[0_0_30px_rgba(154,52,18,0.2)] overflow-hidden"
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
            className={`app-toast fixed left-1/2 z-[130] flex w-[min(36rem,calc(100vw-1.5rem))] -translate-x-1/2 items-start gap-3 rounded-2xl border px-4 py-3 shadow-2xl backdrop-blur-xl sm:w-auto sm:items-center sm:rounded-full sm:px-6 sm:py-4 ${
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
            ref={checkoutDialogRef}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="modal-viewport fixed inset-0 z-[110] flex items-center justify-center bg-black/80 backdrop-blur-sm"
            role="dialog"
            aria-modal="true"
            aria-labelledby="checkout-title"
          >
            <motion.div
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              className="modal-surface relative w-full max-w-md overflow-y-auto rounded-2xl border border-[#c7a44c]/30 bg-[#0b0a12] p-4 shadow-[0_0_40px_rgba(199,164,76,0.15)] custom-scrollbar sm:p-6"
            >
              <h3 id="checkout-title" className={`text-2xl font-bold tracking-wider mb-2 ${modoLoja === 'Comprar' ? 'text-[#c7a44c]' : 'text-red-400'}`} style={{fontFamily: 'Cinzel, serif'}}>
                {modoLoja === 'Comprar' ? 'Finalizar Compra do Lote' : 'Vender Lote'}
              </h3>
              <div className="text-gray-300 mb-6">
                Você tem <strong>{quantidadeCarrinho} {quantidadeCarrinho === 1 ? 'item' : 'itens'}</strong> no carrinho.
                <div className="mt-3 flex flex-wrap gap-2">
                  {cartTotals.map((total) => (
                    <strong key={total.moeda} className="rounded-lg bg-white/5 px-3 py-1 text-white">
                      {total.valor.toLocaleString('pt-BR')} {getCurrencySymbol(total.moeda)}
                    </strong>
                  ))}
                </div>
                <p className="mt-3 text-sm text-gray-400">O servidor confirmará preços, disponibilidade e saldo antes de efetivar a operação.</p>
              </div>
              
              <div className="responsive-action-row flex justify-end gap-3 sm:gap-4">
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
            ref={gmDialogRef}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="modal-viewport fixed inset-0 z-[120] flex items-center justify-center bg-black/80 backdrop-blur-sm"
            role="dialog"
            aria-modal="true"
            aria-labelledby="recompensas-gm-title"
          >
            <motion.div
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              className="modal-surface w-full max-w-md overflow-y-auto rounded-2xl border border-purple-500/50 bg-[#0b0a12] p-4 shadow-[0_0_40px_rgba(168,85,247,0.2)] custom-scrollbar sm:p-6"
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
            ref={claimDialogRef}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="modal-viewport fixed inset-0 z-[110] flex items-center justify-center bg-black/80 backdrop-blur-sm"
            role="dialog"
            aria-modal="true"
            aria-labelledby="recompensa-claim-title"
          >
            <motion.div
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              className="modal-surface w-full max-w-md overflow-y-auto rounded-2xl border border-red-500/50 bg-[#0b0a12] p-4 shadow-[0_0_40px_rgba(239,68,68,0.2)] custom-scrollbar sm:p-6"
            >
              <h3 id="recompensa-claim-title" className="text-2xl font-bold tracking-wider mb-2 text-red-500" style={{fontFamily: 'Cinzel, serif'}}>
                Confirmar Caçada
              </h3>
              <p className="text-gray-300 mb-6">
                Você, <strong>{compradorAtivo?.nome}</strong>, deseja reivindicar a recompensa por <strong>{reivindicacaoAlvo.personagem_nome}</strong>?
                <br /><br />
                O valor de <strong>{reivindicacaoAlvo.valor_total.toLocaleString()} LUN</strong> será depositado em sua conta após aprovação.
              </p>
              <div className="responsive-action-row flex justify-end gap-3 sm:gap-4">
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
            podeComprar={podeAdicionarItem(itemSelecionado)}
            modoLoja={modoLoja as 'Comprar' | 'Vender'}
            compradorAtivo={compradorAtivo}
            localizacaoAtual={localizacaoAtual}
            raridadesOcultas={raridadesOcultas}
          />
        )}
      </AnimatePresence>

      {tourAberto ? (
        <GuidedTour
          passos={LOJA_TOUR_STEPS}
          accent={localAtual.cor}
          nomeGuia="Guia da Loja"
          rootSelector=".loja-shell"
          onClose={encerrarTour}
          onFinish={encerrarTour}
        />
      ) : null}

    </div>
  );
};
