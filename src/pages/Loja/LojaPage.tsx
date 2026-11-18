import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, ShoppingBag, CheckCircle, XCircle, Heart, Sparkles, Wrench, Compass, RotateCcw, CircleGauge, Store, ChevronRight, ChevronDown, Coins, Crosshair, Bell } from 'lucide-react';
import { aplicarRaridadeCompra, corDaRaridade, LojaItem, ItemCategoria, ItemRaridade, itemPermiteEscolherRaridade, lerRaridadeChave, nivelLojaParaRaridadeCompra, getCurrencySymbol, itemCorrespondeBusca, itemCorrespondeCategoria, itemCorrespondeProficiencia, itemCorrespondeSubfiltro, itemEhVeiculoCompleto, mapearCatalogoLoja, RARIDADES_COMPRA_EQUIPAMENTO, RaridadeCompraEquipamento, somarPrecosNativos } from '../../services/lojaCatalogService';
import { ItemCard, COR_MOEDA } from './components/ItemCard';
import { LojaItemModal } from './components/LojaItemModal';
import { CartDrawer, CartItem, cartItemKey } from './components/CartDrawer';
import { BalcaoDeVenda } from './components/BalcaoDeVenda';
import { QuadroDeCacadores } from './components/QuadroDeCacadores';
import { useCharacterStore } from '../../store/useCharacterStore';
import { avisar } from '../../components/avisos/avisos';
import { escolherItensParaEquipar } from '../../services/equiparAoComprar';
import { useAuthStore } from '../../store/useAuthStore';
import { useWishlist } from '../../hooks/useWishlist';
import { listarRecompensas, reivindicarRecompensa, resolverRecompensa, Recompensa } from '../../services/bountiesApi';
import { api } from '../../services/apiClient';
import { CheckoutAttempt, createIdempotencyKey, lojaApi, MAX_SHOP_UNITS, prepareCheckoutAttempt } from '../../services/lojaApi';
import { useDialogAccessibility } from '../../hooks/useDialogAccessibility';
import { Select } from '../../components/ui/Select';
import { GuidedTour } from '../../components/ui/GuidedTour';
import { guiasAutomaticosLigados } from '../../utils/guias';
import { LOJA_TOUR_STEPS, lojaTourJaVisto, serializarLojaTourVisto } from './lojaTourConfig';
import { resumirLimiteItensEspeciais } from '../../services/itensEspeciaisService';
import { RARIDADES_EQUIPAMENTO } from '../../../data/regras/raridadesEquipamentos';
import { CATEGORIAS_ICONES, LOCAIS_LOJA } from './lojaVisual';
import './loja.css';
import { proximosPendentes } from '../../components/loot/loot';

import { SimboloOculto } from '../../components/descobertas/SimboloOculto';

type ModoLoja = 'Comprar' | 'Vender' | 'Recompensas';

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

const RARIDADES_FILTRO: Array<ItemRaridade | 'Todas'> = ['Todas', 'Comum', 'Incomum', 'Raro', 'Épico', 'Lendário', 'Mítico', 'Relíquia da Criação', 'Desconhecida'];

const SUBFILTROS_POR_CATEGORIA: Partial<Record<ItemCategoria, readonly string[]>> = {
  'Armas': ['Todos', 'Corpo a Corpo', 'À Distância', 'Mágicas'],
  'Modificações': ['Todos', 'Comuns', 'Marciais', 'Armas', 'Armaduras', 'Escudos', 'Itens gerais e mágicos', 'Implantes'],
  'Bens': ['Todos', 'Propriedades', 'Veículos Completos', 'Peças e Módulos'],
  'Consumíveis': ['Todos', 'Poções', 'Comidas e Bebidas', 'Selos', 'Rituais', 'Ferramentas'],
  'Mercenários': ['Todos', 'Guardas de local', 'Escoltas', 'Tripulação', 'Ofícios', 'Feras e Monstros', 'Marítimas', 'Espíritos', 'Golens', 'Vazio'],
  'Componentes': ['Todos', 'Componentes Químicos', 'Componentes Ritualísticos', 'Componentes Veiculares', 'Sucata', 'Mantimentos', 'Matéria-prima'],
  'Frutos do Éden': ['Todos', 'Sobrenatural', 'Mutação', 'Elemental'],
};

// Independente do subfiltro de Tipo acima (modo de combate): dá para combinar
// os dois, tipo Corpo a Corpo + Marcial, porque cada um mexe num campo
// diferente do catálogo (modo x subtipo).
const PROFICIENCIAS_POR_CATEGORIA: Partial<Record<ItemCategoria, readonly string[]>> = {
  'Armas': ['Todos', 'Simples', 'Marcial'],
  'Armaduras': ['Todos', 'Simples', 'Marcial'],
  'Escudos': ['Todos', 'Simples', 'Marcial'],
};

const CATEGORIA_DESCRICOES: Record<ItemCategoria | 'Todos', string> = {
  Todos: 'Tudo o que este mercado consegue oferecer agora.',
  'Relíquias da Criação': 'Objetos únicos que mexem com as leis da realidade.',
  Armas: 'Armas simples, marciais, tecnológicas e mágicas.',
  Armaduras: 'Proteção para o corpo inteiro: Defesa, Resistência e penalidade de peso.',
  Escudos: 'Equipamento de bloqueio, do broquel simples ao escudo de torre marcial.',
  Modificações: 'Melhorias instaladas num item que ainda tenha espaço pela raridade.',
  Consumíveis: 'Poções, selos, rituais e ferramentas gastas no uso.',
  Bens: 'Propriedades, veículos completos, peças e módulos.',
  Mercenários: 'Contratos, servos e criaturas com ficha própria de Aliado.',
  Componentes: 'Materiais de alquimia, rituais, forja, cozinha e manutenção.',
  'Frutos do Éden': 'Poder permanente, raro e preso a uma única criatura.',
  'Implantes Cibernéticos': 'Peças instaladas no corpo, negociadas no mercado clandestino.',
  'Artefatos Mágicos': 'Objetos sobrenaturais que dividem o limite de uso com itens de perícia.',
  'Itens Comuns': 'Acessórios, kits e ferramentas de todo dia, sem magia.',
  Outros: 'O que não cabe em nenhuma outra prateleira.',
};

const MODOS: Array<{ id: ModoLoja; rotulo: string; icone: typeof ShoppingBag }> = [
  { id: 'Comprar', rotulo: 'Comprar', icone: ShoppingBag },
  { id: 'Vender', rotulo: 'Vender', icone: Coins },
  { id: 'Recompensas', rotulo: 'Caçadores', icone: Crosshair },
];

const MOEDAS_BOLSA = [
  { chave: 'sol', rotulo: 'SOL', nome: 'Solares', cor: COR_MOEDA.Solares },
  { chave: 'lun', rotulo: 'LUN', nome: 'Lunaris', cor: COR_MOEDA.Lunaris },
  { chave: 'frag', rotulo: 'FRG', nome: 'Fragmentos de Estrela', cor: COR_MOEDA['Fragmentos de Estrela'] },
  { chave: 'cred', rotulo: 'CRD', nome: 'Créditos Sombrios', cor: COR_MOEDA['Créditos Sombrios'] },
] as const;

export const LojaPage: React.FC = () => {
  const { characters, fetchCharacters, flushCharacterSaves, patchCharacter, mutateEconomy } = useCharacterStore();
  const { campanhaAtiva, usuario } = useAuthStore();
  const config = campanhaAtiva?.configuracoes || {};
  const locaisOcultos = config.locais_ocultos || [3, 4];
  const raridadesOcultas = Array.isArray(config.raridades_ocultas) ? config.raridades_ocultas.map(String) : [];
  const podeGerenciarRecompensas = campanhaAtiva?.papel === 'mestre' || campanhaAtiva?.papel === 'assistente';
  const localizacaoDisponivel = (id: number) => !locaisOcultos.includes(id) || podeGerenciarRecompensas;
  const localizacaoStorageKey = campanhaAtiva ? `loja_localizacao_${campanhaAtiva.id}` : null;

  // Lembra a última localização escolhida (por campanha) e cai para a primeira disponível se ela sumir
  const [localizacaoAtual, setLocalizacaoAtualState] = useState<number>(() => {
    let armazenada = NaN;
    try {
      armazenada = localizacaoStorageKey ? Number(localStorage.getItem(localizacaoStorageKey)) : NaN;
    } catch {
      armazenada = NaN;
    }
    if ([1, 2, 3, 4].includes(armazenada) && localizacaoDisponivel(armazenada)) return armazenada;
    return [2, 1, 3, 4].find(localizacaoDisponivel) ?? 2;
  });

  const trocarLocalizacao = (id: number) => {
    setLocalizacaoAtualState(id);
    try {
      if (localizacaoStorageKey) localStorage.setItem(localizacaoStorageKey, String(id));
    } catch {
      // Sem armazenamento, a escolha vale só nesta visita.
    }
  };

  // Permite chegar na Loja já numa localização específica via link (ex.: o
  // botão "Ir para a Loja" do Banco Lunar na cena do Mundo usa
  // /loja?localizacao=4). Só some da URL depois de aplicado, senão volta a
  // forçar essa localização toda vez que o usuário troca de aba.
  const [searchParams, setSearchParams] = useSearchParams();
  const [modoLoja, setModoLoja] = useState<ModoLoja>('Comprar');
  useEffect(() => {
    const alvo = Number(searchParams.get('localizacao'));
    if ([1, 2, 3, 4].includes(alvo) && localizacaoDisponivel(alvo)) {
      trocarLocalizacao(alvo);
    }
    if (searchParams.get('aba') === 'cacadores') setModoLoja('Recompensas');
    if (searchParams.get('aba') === 'vender') setModoLoja('Vender');
    if (searchParams.has('localizacao') || searchParams.has('aba')) {
      const proximos = new URLSearchParams(searchParams);
      proximos.delete('localizacao');
      proximos.delete('aba');
      setSearchParams(proximos, { replace: true });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
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
  const [regrasAbertas, setRegrasAbertas] = useState(false);
  const [cartazesAbertos, setCartazesAbertos] = useState<number | null>(null);

  const [mostrarWishlist, setMostrarWishlist] = useState(false);
  const [tourAberto, setTourAberto] = useState(false);

  const [itemSelecionado, setItemSelecionado] = useState<LojaItem | null>(null);
  const [toast, setToast] = useState<{ message: string, type: 'success' | 'error' } | null>(null);
  const [catalogo, setCatalogo] = useState<LojaItem[]>([]);
  const [catalogoLoading, setCatalogoLoading] = useState(false);
  const [catalogoError, setCatalogoError] = useState<string | null>(null);

  // Recompensas entre jogadores (Banqueiro)
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
  const personagensDaCampanha = useMemo(
    () => characters.map((character) => ({ id: character.id, nome: character.nome })),
    [characters],
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
    if (!campanhaAtiva?.id || catalogoLoading || catalogoError || tourAberto || tourTentadoRef.current || !guiasAutomaticosLigados()) return undefined;
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
    // compra: a entrada do carrinho já nasce com o preço certo para somar e
    // exibir sem o resto da tela precisar saber de dois preços por item.
    const itemParaCarrinho = modo === 'contratar' && item.contratacao
      ? { ...item, valorOriginal: item.contratacao.valorOriginal, moedaPreco: item.contratacao.moedaPreco }
      : item;
    setCart(prev => {
      // Itens com alvo não se agrupam a menos que tenham o mesmo alvo.
      // Contratar e comprar o mesmo mercenário também não: são vínculos
      // diferentes. O alvo fixa quantidade em 1.
      const existingIdx = prev.findIndex(i => i.item.id === item.id && i.alvoItemId === alvoItemId && i.modo === modo && i.item.raridadeCompra === item.raridadeCompra);
      if (existingIdx !== -1) {
        const maximo = Math.min(item.quantidadeDisponivel ?? MAX_SHOP_UNITS, MAX_SHOP_UNITS);
        const newCart = [...prev];
        if (!alvoItemId) {
          newCart[existingIdx] = { ...newCart[existingIdx], quantidade: Math.min(maximo, newCart[existingIdx].quantidade + 1) };
        }
        return newCart;
      }
      return [...prev, { item: itemParaCarrinho, quantidade: 1, alvoItemId, alvoItemNome, modo }];
    });
    showToast(`${item.nome} foi para o lote.`, 'success');
  };

  /** Lote de venda: põe, troca ou tira (com zero) a quantidade de um item do inventário. */
  const definirQuantidadeVenda = useCallback((item: LojaItem, quantidade: number) => {
    setCart((prev) => {
      const maximo = Math.min(item.quantidadeDisponivel ?? MAX_SHOP_UNITS, MAX_SHOP_UNITS);
      const nova = Math.max(0, Math.min(maximo, Math.trunc(quantidade)));
      if (nova <= 0) return prev.filter((entrada) => entrada.item.id !== item.id);
      if (prev.some((entrada) => entrada.item.id === item.id)) {
        return prev.map((entrada) => (entrada.item.id === item.id ? { ...entrada, item, quantidade: nova } : entrada));
      }
      return [...prev, { item, quantidade: nova }];
    });
  }, []);

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

  const trocarModoLoja = (novoModo: ModoLoja) => {
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
      showToast('Pedido enviado. O Mestre confere e paga.', 'success');
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

  /** Arma, armadura ou escudo comprado que cabe numa vaga livre já sai equipado, com aviso e Desfazer. */
  const equiparPecasCompradas = async (personagemId: string, inventario: any[], catalogoIds: string[], proficiencias: unknown) => {
    const ids = escolherItensParaEquipar(inventario, catalogoIds, proficiencias);
    if (ids.length === 0) return;
    const alterar = (equipado: boolean) => mutateEconomy(personagemId, (current) => ({
      carteira: current.carteira,
      inventario: current.inventario.map((entrada) => (
        ids.includes(entrada.item_id) ? { ...entrada, dados: { ...entrada.dados, equipado } } : entrada
      )),
    }));
    if (!(await alterar(true))) return;
    const nomes = ids.map((id) => inventario.find((entrada) => entrada.item_id === id)?.titulo).filter(Boolean).join(', ');
    avisar.info(`${nomes} ${ids.length === 1 ? 'já está equipado' : 'já estão equipados'}, porque a vaga estava livre.`, {
      titulo: 'Equipado ao comprar',
      chave: `equipar-compra:${ids.join(',')}`,
      acao: { rotulo: 'Desfazer', aoClicar: () => { void alterar(false); } },
    });
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
      // Frota/Bens da campanha. Avisa aqui para isso não passar despercebido.
      const comprouAtivavel = operation === 'compra' && cart.some(({ item }) => itemEhVeiculoCompleto(item) || item.tipoOrigem === 'propriedade');
      checkoutAttemptRef.current = attempt;
      const resultado = operation === 'compra' ? await lojaApi.comprar(attempt.payload) : await lojaApi.vender(attempt.payload);
      await fetchCharacters();
      if (operation === 'compra') {
        // As cartas do que foi comprado esperam guardadas em ficha.lootPendente (autosave
        // normal) e viram quando a ficha de quem comprou for aberta, em qualquer aparelho.
        const personagemComFicha = useCharacterStore.getState().characters.find(
          (character) => character.id === personagemAtual.id,
        );
        const novosPendentes = proximosPendentes(personagemComFicha?.ficha?.lootPendente, cart.map(({ item, quantidade }) => ({
          nome: item.nome,
          raridade: item.raridadeCompra ?? item.raridade,
          categoria: item.categoria,
          quantidade,
        })));
        patchCharacter(personagemAtual.id, ['ficha', 'lootPendente'], novosPendentes);
        if (!resultado.infracoes?.length) {
          void equiparPecasCompradas(
            personagemAtual.id,
            personagemComFicha?.inventarioCentral ?? [],
            cart.filter(({ modo }) => modo !== 'contratar').map(({ item }) => item.id),
            personagemComFicha?.ficha?.proficiencias,
          );
        }
      }
      if (operation === 'compra' && resultado.infracoes?.length) {
        // Requisito de nível/classe não bloqueia a compra (o mestre já é avisado
        // por notificação), mas quem comprou precisa saber que ficou registrado.
        showToast(
          `Compra concluída, mas com pré-requisito ignorado: ${resultado.infracoes.map((inf) => inf.mensagem).join('; ')}. O mestre foi notificado.`,
          'error',
        );
      } else if (comprouAtivavel) {
        showToast('Compra concluída! Para usar o veículo ou a propriedade em jogo, ative em Frota & Bases da campanha.', 'success');
      } else {
        showToast(operation === 'compra' ? 'Compra feita! As cartas dos itens viram quando você abrir a ficha.' : 'Venda feita. As moedas já estão na bolsa.', 'success');
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

  // Quantos itens cada prateleira tem neste mercado (a Relíquia conta também na categoria de origem).
  const contagemPorCategoria = useMemo(() => {
    const contagem = new Map<string, number>();
    let total = 0;
    for (const item of catalogo) {
      if (item.nivelLoja > localizacaoAtual) continue;
      total += 1;
      contagem.set(item.categoria, (contagem.get(item.categoria) ?? 0) + 1);
      if (item.categoriaBase && item.categoriaBase !== item.categoria) {
        contagem.set(item.categoriaBase, (contagem.get(item.categoriaBase) ?? 0) + 1);
      }
    }
    contagem.set('Todos', total);
    return contagem;
  }, [catalogo, localizacaoAtual]);

  const filteredItems = useMemo(() => {
    if (modoLoja !== 'Comprar') return [];
    return catalogo.filter(item => {
      const matchSearch = itemCorrespondeBusca(item, searchTerm);
      const matchCat = itemCorrespondeCategoria(item, selectedCategoria);
      const raridadeFiltro = lerRaridadeChave(selectedRaridade);
      const raridadeEquipamentoDisponivel = itemPermiteEscolherRaridade(item)
        && raridadeFiltro !== null
        && RARIDADES_COMPRA_EQUIPAMENTO.some((opcao) => opcao.value === raridadeFiltro)
        && Boolean(item.precosRaridade?.[raridadeFiltro as RaridadeCompraEquipamento])
        && nivelLojaParaRaridadeCompra(item, raridadeFiltro as RaridadeCompraEquipamento) <= localizacaoAtual
        && !raridadesOcultas.some((raridade) => lerRaridadeChave(raridade) === raridadeFiltro);
      const matchRar = selectedRaridade === 'Todas' || item.raridade === selectedRaridade || raridadeEquipamentoDisponivel;
      // Cumulativo: cada localização mostra o que é dela mais tudo que já
      // apareceria nas anteriores. É o que o Banco Lunar promete ("acesso a
      // todos os artefatos da criação").
      const matchLocal = item.nivelLoja <= localizacaoAtual;

      if (mostrarWishlist && !wishlist.includes(item.id)) return false;

      const matchSub = itemCorrespondeSubfiltro(item, selectedCategoria, subfiltro);
      const matchProficiencia = itemCorrespondeProficiencia(item, selectedCategoria, proficiencia);

      return matchSearch && matchCat && matchRar && matchSub && matchProficiencia && matchLocal;
    });
  }, [searchTerm, selectedCategoria, selectedRaridade, subfiltro, proficiencia, catalogo, modoLoja, mostrarWishlist, wishlist, localizacaoAtual, raridadesOcultas]);

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
  const filtrosAtivos = Boolean(searchTerm.trim()) || selectedCategoria !== 'Todos' || selectedRaridade !== 'Todas' || subfiltro !== 'Todos' || proficiencia !== 'Todos' || mostrarWishlist;

  const limparFiltros = () => {
    setSearchTerm('');
    setSelectedCategoria('Todos');
    setSelectedRaridade('Todas');
    setSubfiltro('Todos');
    setProficiencia('Todos');
    setMostrarWishlist(false);
  };

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

  const contarCartazes = useCallback((abertos: number) => setCartazesAbertos(abertos), []);
  const recarregarEconomia = useCallback(() => { void fetchCharacters(); }, [fetchCharacters]);
  const locaisVisiveis = LOCAIS_LOJA.filter((local) => !locaisOcultos.includes(local.id) || podeGerenciarRecompensas);
  const categoriasVisiveis = (Object.keys(CATEGORIAS_ICONES) as Array<ItemCategoria | 'Todos'>)
    .filter((categoria) => categoria === 'Todos' || categoria === selectedCategoria || (contagemPorCategoria.get(categoria) ?? 0) > 0);
  const vendendo = modoLoja === 'Vender';

  return (
    <div role="main" className="loja-shell app-page mx-auto flex w-full max-w-[100rem] flex-col" style={{ '--loja-accent': localAtual.cor } as React.CSSProperties}>
      <header className="loja-letreiro">
        <div className="loja-letreiro__linha">
          <div className="loja-letreiro__texto">
            <span className="loja-eyebrow">Comércio entre as Árvores · Patamar {localAtual.id}, {localAtual.nivelRotulo}</span>
            <h1 data-descoberta="mercador_fantasma" data-cliques="5">{localAtual.titulo}</h1>
            <p>{localAtual.descricao}</p>
          </div>

          {personagensDoUsuario.length > 0 ? (
            <div className="loja-bolsa" data-tour="loja-comprador">
              <span className="loja-bolsa__retrato" aria-hidden="true">
                {compradorAtivo?.foto ? <img src={compradorAtivo.foto} alt="" /> : (compradorAtivo?.nome ?? '?').charAt(0).toUpperCase()}
              </span>
              <div className="loja-bolsa__quem">
                <small>Quem negocia</small>
                <Select value={compradorId} onChange={trocarComprador} options={personagensDoUsuario.map((personagem) => ({ value: personagem.id, label: personagem.nome }))} ariaLabel="Personagem que compra, vende ou caça" className="loja-bolsa__select" />
              </div>
              <div className="loja-moedas" aria-label="Moedas na bolsa">
                {MOEDAS_BOLSA.filter((moeda) => moeda.chave === 'lun' || saldos[moeda.chave] > 0).map((moeda) => (
                  <span key={moeda.chave} className="loja-moeda" style={{ '--moeda-cor': moeda.cor } as React.CSSProperties} title={moeda.nome}>
                    <b>{Number(saldos[moeda.chave]).toLocaleString('pt-BR')}</b>
                    <small>{moeda.rotulo}</small>
                  </span>
                ))}
              </div>
            </div>
          ) : null}
        </div>

        <nav className="loja-placas" aria-label="Mercados disponíveis" data-tour="loja-locais">
          {locaisVisiveis.map((local) => {
            const Icon = local.icone;
            const ativo = local.id === localizacaoAtual;
            const oculto = locaisOcultos.includes(local.id);
            return (
              <button key={local.id} type="button" onClick={() => trocarLocalizacao(local.id)} aria-current={ativo ? 'page' : undefined} className={`loja-placa ${ativo ? 'is-ativa' : ''}`} style={{ '--placa-cor': local.cor } as React.CSSProperties}>
                <span className="loja-placa__icone"><Icon size={15} /></span>
                <span className="loja-placa__texto">
                  <strong>{local.curto}</strong>
                  <small>{oculto ? 'fechado aos jogadores' : `patamar ${local.id}`}</small>
                </span>
              </button>
            );
          })}
        </nav>
      </header>

      <div className="loja-barra">
        <div role="tablist" className="loja-modos" aria-label="O que fazer no balcão" data-tour="loja-modos">
          {MODOS.map(({ id, rotulo, icone: Icone }) => {
            const ativo = modoLoja === id;
            return (
              <button key={id} type="button" role="tab" aria-selected={ativo} onClick={() => trocarModoLoja(id)} className={`loja-modo ${ativo ? 'is-ativo' : ''}`}>
                <Icone size={16} aria-hidden="true" />
                {rotulo}
                {id === 'Recompensas' && (cartazesAbertos ?? 0) + recompensas.length > 0 ? (
                  <span className="loja-modo__conta" aria-label={`${(cartazesAbertos ?? 0) + recompensas.length} procurados`}>{(cartazesAbertos ?? 0) + recompensas.length}</span>
                ) : null}
              </button>
            );
          })}
        </div>
        <div className="loja-barra__acoes">
          {podeGerenciarRecompensas && notificacoesGM.length > 0 ? (
            <button type="button" onClick={() => setShowGmPanel(true)} className="loja-botao loja-botao--fantasma loja-botao--alerta">
              <Bell size={15} /> {notificacoesGM.length} pedido(s) de recompensa
            </button>
          ) : null}
          <button type="button" onClick={() => setTourAberto(true)} className="loja-botao-icone" aria-label="Abrir o guia da Loja" title="Guia da Loja"><Compass size={17} /></button>
          {modoLoja !== 'Recompensas' ? (
            <button type="button" data-tour="loja-carrinho" onClick={() => setIsCartOpen(true)} aria-label={`Abrir carrinho com ${quantidadeCarrinho} ${quantidadeCarrinho === 1 ? 'item' : 'itens'}`} className="loja-botao loja-botao--fantasma">
              <ShoppingBag size={15} /> {vendendo ? 'Lote de venda' : 'Lote'}
              {quantidadeCarrinho > 0 ? <span className="loja-modo__conta">{quantidadeCarrinho}</span> : null}
            </button>
          ) : null}
        </div>
      </div>

      {modoLoja === 'Comprar' ? (
        <>
          <div className="loja-regras" data-tour="loja-regras">
            <span className="loja-regra"><CircleGauge size={14} /> Itens especiais: <strong>{limiteItensEspeciais.usados} de {limiteItensEspeciais.limite}</strong> em uso</span>
            <span className="loja-regra"><Wrench size={14} /> Armas, armaduras e escudos sob encomenda até Lendário</span>
            <span className="loja-regra"><Store size={14} /> Este balcão também vende o dos mercados abaixo dele</span>
            <button type="button" className="loja-regras__mais" onClick={() => setRegrasAbertas((aberto) => !aberto)} aria-expanded={regrasAbertas}>
              Regras do balcão <ChevronDown size={14} className={regrasAbertas ? 'rotate-180' : ''} />
            </button>
          </div>
          <AnimatePresence initial={false}>
            {regrasAbertas ? (
              <motion.div className="loja-regras__painel" initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }}>
                <div className="loja-regras__grade">
                  <article>
                    <h3><CircleGauge size={15} /> Uso de itens especiais</h3>
                    <p>Itens de perícia e artefatos dividem o mesmo limite: nível total dividido por 4, para baixo, no mínimo 1. Comprar não ocupa vaga; equipar ocupa. {compradorAtivo ? `${compradorAtivo.nome} está no nível ${limiteItensEspeciais.nivelTotal}.` : ''}</p>
                    <Link to="/regras?topico=raridades-modificacoes">Ler raridades e limites <ChevronRight size={13} /></Link>
                  </article>
                  <article>
                    <h3><Wrench size={15} /> Raridade sob encomenda</h3>
                    <p>Armas, armaduras e escudos chegam como Comuns. No detalhe do item dá para encomendar de Incomum a Lendário: preço, balcão exigido e espaços de modificação sobem juntos.</p>
                    <div className="loja-regras__raridades">{RARIDADES_EQUIPAMENTO.slice(0, 5).map((raridade) => <span key={raridade.id} style={{ color: corDaRaridade(raridade.id) }}>{raridade.titulo} · {raridade.modificacoesMaximas}</span>)}</div>
                    <Link to="/regras?topico=modificacoes-equipamentos">Abrir regra de modificações <ChevronRight size={13} /></Link>
                  </article>
                  <article>
                    <h3><Store size={15} /> Os quatro mercados</h3>
                    <p>Os mercados são cumulativos. O patamar {localizacaoAtual} ({localAtual.curto}) mostra o que é dele e tudo dos anteriores, respeitando o que a campanha esconde ou publica.</p>
                    <Link to="/regras?topico=loja">Entender os quatro mercados <ChevronRight size={13} /></Link>
                  </article>
                </div>
              </motion.div>
            ) : null}
          </AnimatePresence>

          {catalogoLoading ? (
            <div role="status" className="loja-alerta loja-alerta--calmo">Arrumando as prateleiras...</div>
          ) : null}
          {catalogoError ? (
            <div role="alert" className="loja-alerta">{catalogoError}</div>
          ) : null}

          {itensEmPromocao.length > 0 && !filtrosAtivos ? (
            <section className="loja-ofertas" aria-labelledby="ofertas-destaque-titulo">
              <div className="loja-secao-titulo">
                <span className="loja-eyebrow loja-eyebrow--oferta"><Sparkles size={13} aria-hidden="true" /> Preço baixo por pouco tempo</span>
                <h2 id="ofertas-destaque-titulo">Na vitrine</h2>
              </div>
              <div className="loja-grade loja-grade--ofertas">
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

          <div className="loja-vitrine">
            <nav className="loja-categorias" aria-label="Prateleiras" data-tour="loja-filtros">
              {categoriasVisiveis.map((categoria) => {
                const Icone = CATEGORIAS_ICONES[categoria];
                const ativa = selectedCategoria === categoria;
                return (
                  <button key={categoria} type="button" onClick={() => setSelectedCategoria(categoria)} aria-pressed={ativa} className={`loja-categoria ${ativa ? 'is-ativa' : ''}`}>
                    <Icone size={15} aria-hidden="true" />
                    <span>{categoria === 'Todos' ? 'Tudo' : categoria}</span>
                    <span className="loja-categoria__conta">{contagemPorCategoria.get(categoria) ?? 0}</span>
                  </button>
                );
              })}
            </nav>

            <section className="loja-prateleira" data-tour="loja-catalogo" aria-labelledby="loja-catalogo-titulo">
              <div className="loja-ferramentas">
                <label className="loja-busca">
                  <Search size={16} aria-hidden="true" />
                  <input type="search" aria-label="Buscar itens da loja" placeholder="Nome, efeito, material ou uso..." value={searchTerm} onChange={(event) => setSearchTerm(event.target.value)} />
                </label>
                <div className="loja-ferramentas__acoes">
                  {subfiltrosDisponiveis.length ? (
                    <Select value={subfiltro} onChange={setSubfiltro} options={subfiltrosDisponiveis.map((value) => ({ value, label: value === 'Todos' ? 'Qualquer tipo' : value }))} ariaLabel="Tipo" className="loja-select" />
                  ) : null}
                  {proficienciasDisponiveis.length ? (
                    <Select value={proficiencia} onChange={setProficiencia} options={proficienciasDisponiveis.map((value) => ({ value, label: value === 'Todos' ? 'Qualquer proficiência' : value }))} ariaLabel="Proficiência" className="loja-select" />
                  ) : null}
                  <button type="button" onClick={() => setMostrarWishlist((atual) => !atual)} aria-pressed={mostrarWishlist} aria-label="Desejos" title="Mostrar só a lista de desejos" className={`loja-botao-icone ${mostrarWishlist ? 'is-desejo' : ''}`}><Heart size={16} fill={mostrarWishlist ? 'currentColor' : 'none'} /></button>
                  {filtrosAtivos ? <button type="button" onClick={limparFiltros} aria-label="Limpar filtros" title="Limpar filtros" className="loja-botao-icone"><RotateCcw size={16} /></button> : null}
                </div>
              </div>
              <div className="loja-chips" role="group" aria-label="Filtrar por raridade">
                {RARIDADES_FILTRO.map((raridade) => (
                  <button key={raridade} type="button" aria-pressed={selectedRaridade === raridade} onClick={() => setSelectedRaridade(raridade)} className={`loja-chip ${selectedRaridade === raridade ? 'is-ativo' : ''}`} style={raridade === 'Todas' ? undefined : { '--chip-cor': corDaRaridade(raridade) } as React.CSSProperties}>
                    {raridade !== 'Todas' ? <i aria-hidden="true" /> : null}{raridade}
                  </button>
                ))}
              </div>

              <div className="loja-prateleira__titulo">
                <h2 id="loja-catalogo-titulo">{selectedCategoria === 'Todos' ? 'Tudo no balcão' : selectedCategoria}</h2>
                <p>{CATEGORIA_DESCRICOES[selectedCategoria]} <span>{filteredItems.length} {filteredItems.length === 1 ? 'item' : 'itens'}</span></p>
              </div>

              <div className="loja-grade">
                {visibleItems.map((item) => (
                  <ItemCard
                    key={item.id}
                    item={item}
                    onView={abrirDetalhesItem}
                    onBuy={handleAddToCart}
                    podeComprar={podeAdicionarItem(item)}
                    isWishlisted={wishlist.includes(item.id)}
                    onToggleWishlist={() => toggleWishlist(item.id)}
                  />
                ))}

                {filteredItems.length === 0 && !catalogoLoading && !catalogoError ? (
                  <div className="loja-vazio">
                    <ShoppingBag size={40} />
                    <strong>Nada nesta prateleira</strong>
                    <p>O mercador não tem nada com esses filtros.</p>
                    {filtrosAtivos ? <button type="button" className="loja-botao loja-botao--fantasma" onClick={limparFiltros}><RotateCcw size={14} /> Limpar filtros</button> : null}
                  </div>
                ) : null}
              </div>

              {itemsToShow < filteredItems.length ? (
                <div className="loja-mais">
                  <button type="button" onClick={() => setItemsToShow((prev) => prev + 24)} className="loja-botao loja-botao--fantasma">
                    Mostrar mais ({filteredItems.length - itemsToShow} na prateleira)
                  </button>
                </div>
              ) : null}
            </section>
          </div>
        </>
      ) : null}

      {modoLoja === 'Vender' && campanhaAtiva ? (
        <BalcaoDeVenda
          campanhaId={campanhaAtiva.id}
          personagem={compradorAtivo}
          cart={cart}
          onDefinirQuantidade={definirQuantidadeVenda}
          onAbrirLote={() => setIsCartOpen(true)}
        />
      ) : null}

      {modoLoja === 'Recompensas' && campanhaAtiva ? (
        <QuadroDeCacadores
          campanhaId={campanhaAtiva.id}
          gestor={podeGerenciarRecompensas}
          personagemAtivo={compradorAtivo ? { id: compradorAtivo.id, nome: compradorAtivo.nome } : undefined}
          personagensDaCampanha={personagensDaCampanha}
          recompensas={recompensas}
          onReivindicar={setReivindicacaoAlvo}
          onEconomiaMudou={recarregarEconomia}
          onContagem={contarCartazes}
        />
      ) : null}

      {/* Lote flutuante: aparece quando há algo no lote, para não precisar subir a página. */}
      <AnimatePresence>
        {quantidadeCarrinho > 0 && !isCartOpen && !showCheckoutModal && modoLoja !== 'Recompensas' ? (
          <motion.button
            type="button"
            className={`loja-lote-flutuante ${vendendo ? 'is-venda' : ''}`}
            onClick={() => setIsCartOpen(true)}
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 24 }}
            aria-label={`Revisar o lote com ${quantidadeCarrinho} ${quantidadeCarrinho === 1 ? 'item' : 'itens'}`}
          >
            <span className="loja-lote-flutuante__icone"><ShoppingBag size={17} /></span>
            <span className="loja-lote-flutuante__texto">
              <small>{vendendo ? 'Para vender' : 'No lote'} · {quantidadeCarrinho} {quantidadeCarrinho === 1 ? 'item' : 'itens'}</small>
              <strong>{cartTotals.map((total) => `${total.valor.toLocaleString('pt-BR')} ${getCurrencySymbol(total.moeda)}`).join(' + ')}</strong>
            </span>
            <ChevronRight size={17} aria-hidden="true" />
          </motion.button>
        ) : null}
      </AnimatePresence>

      {/* TOAST */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: 50, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.9 }}
            role={toast.type === 'error' ? 'alert' : 'status'}
            aria-live="polite"
            className={`app-toast fixed left-1/2 z-[130] flex w-[min(36rem,calc(100vw-1.5rem))] -translate-x-1/2 items-start gap-3 rounded-2xl border px-4 py-3 shadow-2xl sm:w-auto sm:items-center sm:rounded-full sm:px-6 sm:py-4 ${
              toast.type === 'success'
                ? 'bg-[#16130c]/95 border-[#c7a44c]/50 text-white'
                : 'bg-[#1a0c0e]/95 border-red-500/50 text-white'
            }`}
          >
            {toast.type === 'success' ? <CheckCircle className="text-[#c7a44c]" /> : <XCircle className="text-red-400" />}
            <span className="font-medium tracking-wide">{toast.message}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* CONFIRMAÇÃO DO LOTE */}
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
              initial={{ scale: 0.96, y: 12 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.96, y: 12 }}
              className="modal-surface loja-modal custom-scrollbar"
            >
              <span className="loja-eyebrow">{vendendo ? 'O mercador conta as moedas' : 'O mercador embrulha o lote'}</span>
              <h3 id="checkout-title" className="loja-modal__titulo">{modoLoja === 'Comprar' ? 'Fechar a compra' : 'Fechar a venda'}</h3>
              <p className="loja-modal__texto">
                {quantidadeCarrinho} {quantidadeCarrinho === 1 ? 'item' : 'itens'} {vendendo ? `saem da bolsa de ${compradorAtivo?.nome ?? 'quem vende'}` : `vão para ${compradorAtivo?.nome ?? 'quem compra'}`}.
              </p>
              <div className="loja-modal__totais">
                {cartTotals.map((total) => (
                  <strong key={total.moeda} style={{ color: COR_MOEDA[total.moeda] ?? '#fff' }}>
                    {vendendo ? '+' : '-'} {total.valor.toLocaleString('pt-BR')} {getCurrencySymbol(total.moeda)}
                  </strong>
                ))}
              </div>
              <p className="loja-modal__nota">O servidor confere preço, disponibilidade e saldo antes de mexer em qualquer coisa.</p>

              <div className="loja-modal__pe">
                <button type="button" onClick={() => setShowCheckoutModal(false)} disabled={checkoutInProgress} className="loja-botao loja-botao--fantasma">
                  Voltar
                </button>
                <button type="button" onClick={() => void executeCheckout()} disabled={checkoutInProgress} className="loja-botao">
                  {checkoutInProgress ? 'Processando...' : (modoLoja === 'Comprar' ? 'Confirmar compra' : 'Confirmar venda')}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* PEDIDOS DE RECOMPENSA (MESTRE) */}
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
              initial={{ scale: 0.96, y: 12 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.96, y: 12 }}
              className="modal-surface loja-modal custom-scrollbar"
            >
              <span className="loja-eyebrow">Banco Lunar</span>
              <h3 id="recompensas-gm-title" className="loja-modal__titulo">Pedidos de recompensa</h3>
              {notificacoesGM.length > 0 ? (
                <div className="mt-4 max-h-72 space-y-3 overflow-y-auto pr-1 custom-scrollbar">
                  {notificacoesGM.map(notif => (
                    <div key={notif.id} className="rounded-xl border border-white/10 bg-black/30 p-3">
                      <div className="mb-2 text-xs text-gray-300">
                        <span className="text-white">{notif.mensagem}</span>
                        {typeof notif.dados?.valor_no_pedido === 'number' && (
                          <strong className="mt-1 block text-orange-300">
                            Valor no pedido: {notif.dados.valor_no_pedido.toLocaleString('pt-BR')} LUN
                          </strong>
                        )}
                      </div>
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => handleResolverRecompensa(notif.id, true)}
                          disabled={resolvingClaimId === notif.id}
                          className="flex-1 rounded-lg border border-green-500/30 bg-green-600/20 py-1.5 text-xs font-bold text-green-300 transition-colors hover:bg-green-600/40 disabled:opacity-50"
                        >
                          Aprovar e pagar
                        </button>
                        <button
                          type="button"
                          onClick={() => handleResolverRecompensa(notif.id, false)}
                          disabled={resolvingClaimId === notif.id}
                          className="flex-1 rounded-lg border border-gray-500/30 bg-gray-600/20 py-1.5 text-xs font-bold text-gray-300 transition-colors hover:bg-gray-600/40 disabled:opacity-50"
                        >
                          Encerrar (NPC)
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="loja-modal__texto">Nenhum pedido esperando.</p>
              )}

              <div className="loja-modal__pe">
                <span />
                <button type="button" onClick={() => setShowGmPanel(false)} className="loja-botao">Fechar</button>
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
        isVenda={vendendo}
        isProcessing={checkoutInProgress}
      />

      {/* CONFIRMAÇÃO DE REIVINDICAÇÃO (recompensa entre jogadores) */}
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
              initial={{ scale: 0.96, y: 12 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.96, y: 12 }}
              className="modal-surface loja-modal custom-scrollbar"
            >
              <span className="loja-eyebrow">Guilda dos Caçadores</span>
              <h3 id="recompensa-claim-title" className="loja-modal__titulo">Reivindicar a recompensa</h3>
              {compradorAtivo ? (
                <p className="loja-modal__texto">
                  <strong>{compradorAtivo.nome}</strong> pede a recompensa por <strong>{reivindicacaoAlvo.personagem_nome}</strong>. Depois que o Mestre aprovar, <strong>{reivindicacaoAlvo.valor_total.toLocaleString('pt-BR')} Lunaris</strong> caem na bolsa.
                </p>
              ) : (
                <p className="loja-modal__texto">Escolha um personagem seu no topo da Loja para reivindicar.</p>
              )}
              <div className="loja-modal__pe">
                <button type="button" onClick={() => setReivindicacaoAlvo(null)} disabled={claimInProgress} className="loja-botao loja-botao--fantasma">
                  Voltar
                </button>
                <button type="button" onClick={handleReivindicar} disabled={claimInProgress || !compradorAtivo} className="loja-botao">
                  {claimInProgress ? 'Enviando...' : 'Reivindicar'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* DETALHE DO ITEM */}
      <AnimatePresence>
        {itemSelecionado && (
          <LojaItemModal
            item={itemSelecionado}
            onClose={() => setItemSelecionado(null)}
            onBuy={handleAddToCart}
            podeComprar={podeAdicionarItem(itemSelecionado)}
            modoLoja="Comprar"
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

      <div className="flex justify-end px-6 pb-24"><SimboloOculto chave="moeda_perdida" glifo="◎" cliques={4} /></div>
    </div>
  );
};
