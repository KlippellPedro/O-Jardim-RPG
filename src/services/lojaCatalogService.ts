import type { LojaCatalogEntry } from './lojaApi';

export type ItemCategoria = 'Relíquias da Criação' | 'Armas' | 'Armaduras e Escudos' | 'Modificações' | 'Consumíveis' | 'Bens' | 'Mercenários' | 'Componentes' | 'Frutos do Éden' | 'Implantes Cibernéticos' | 'Artefatos Mágicos' | 'Outros';
export type ItemRaridade = 'Comum' | 'Incomum' | 'Raro' | 'Épico' | 'Lendário' | 'Mítico' | 'Relíquia da Criação' | 'Desconhecida';
export type ItemRaridadeChave = 'comum' | 'incomum' | 'raro' | 'epico' | 'lendario' | 'reliquia' | 'reliquia da criacao';

export type MoedaTipo = 'Solares' | 'Lunaris' | 'Fragmentos de Estrela' | 'Créditos Sombrios';

export interface LojaItem {
  id: string;
  tipoOrigem: string;
  nome: string;
  categoria: ItemCategoria;
  raridade: ItemRaridade;
  moedaPreco: MoedaTipo;
  valorOriginal: number; // Valor na moedaPreco
  nivelLoja: number; // 1=Vila, 2=Metrópole, 3=Mercado Negro, 4=Banco Lunar
  descricao: string;
  propriedades?: string;
  requisitoNivel?: number;
  requisitoClasse?: string[];
  dadosBrutos?: any;
  quantidadeDisponivel?: number;
  precoAnterior?: number;
  promocao?: {
    rotulo: string;
    descontoPercentual: number;
  };
}

const RARIDADES_CONHECIDAS = new Set<ItemRaridadeChave>([
  'comum', 'incomum', 'raro', 'epico', 'lendario', 'reliquia', 'reliquia da criacao',
]);

export interface PrecoNativoLoja {
  moedaPreco: MoedaTipo;
  valorOriginal: number;
}

const parsePrecoDetalhado = (moeda: string, valor: number): PrecoNativoLoja => {
  const normalizada = moeda.trim().toLocaleLowerCase('pt-BR');
  if (normalizada === 'lunaris') return { moedaPreco: 'Lunaris', valorOriginal: valor };
  if (normalizada === 'fragmentos de estrela') return { moedaPreco: 'Fragmentos de Estrela', valorOriginal: valor };
  if (normalizada === 'créditos sombrios' || normalizada === 'creditos sombrios') {
    return { moedaPreco: 'Créditos Sombrios', valorOriginal: valor };
  }
  return { moedaPreco: 'Solares', valorOriginal: valor };
};

export function lerPrecoNativoLoja(rawPrice: unknown): PrecoNativoLoja | null {
  if (typeof rawPrice === 'number' && Number.isSafeInteger(rawPrice) && rawPrice > 0) {
    return { moedaPreco: 'Solares', valorOriginal: rawPrice };
  }
  if (!rawPrice || typeof rawPrice !== 'object' || Array.isArray(rawPrice)) return null;
  const entries = Object.entries(rawPrice as Record<string, unknown>);
  if (entries.length !== 1) return null;
  const [currency, value] = entries[0];
  if (typeof value !== 'number' || !Number.isSafeInteger(value) || value <= 0) return null;
  const parsed = parsePrecoDetalhado(currency, value);
  const normalized = currency.trim().toLocaleLowerCase('pt-BR');
  const knownCurrency = ['solares', 'lunaris', 'fragmentos de estrela', 'créditos sombrios', 'creditos sombrios'].includes(normalized);
  return knownCurrency ? { moedaPreco: parsed.moedaPreco, valorOriginal: parsed.valorOriginal } : null;
}

export function somarPrecosNativos(
  lines: readonly { item: Pick<LojaItem, 'moedaPreco' | 'valorOriginal'>; quantidade: number }[],
): Array<{ moeda: MoedaTipo; valor: number }> {
  const totals = new Map<MoedaTipo, number>();
  for (const { item, quantidade } of lines) {
    totals.set(item.moedaPreco, (totals.get(item.moedaPreco) ?? 0) + (item.valorOriginal * quantidade));
  }
  return Array.from(totals, ([moeda, valor]) => ({ moeda, valor }));
}

export function calcularValorRevenda(valorOriginal: number): number {
  return Math.max(1, Math.floor(valorOriginal / 2));
}

export const getCurrencySymbol = (moedaExibicao: MoedaTipo): string => {
  switch (moedaExibicao) {
    case 'Solares': return 'SOL';
    case 'Lunaris': return 'LUN';
    case 'Fragmentos de Estrela': return 'FRG';
    case 'Créditos Sombrios': return 'CRD';
    default: return 'SOL';
  }
};

export interface CurrencyTheme {
  texto: string;
  borda: string;
  fundo: string;
}

/** Uma cor por moeda pra dar leitura rápida em listas com várias moedas
 * juntas (carteira, extrato) - Lunaris usa a cor primária do site por ser a
 * moeda-base; as demais têm identidade própria. */
export const getCurrencyTheme = (moedaExibicao: MoedaTipo | string): CurrencyTheme => {
  switch (moedaExibicao) {
    case 'Solares':
      return { texto: 'text-amber-400', borda: 'border-amber-500/30', fundo: 'bg-amber-500/10' };
    case 'Fragmentos de Estrela':
      return { texto: 'text-violet-400', borda: 'border-violet-500/30', fundo: 'bg-violet-500/10' };
    case 'Créditos Sombrios':
      return { texto: 'text-red-400', borda: 'border-red-500/30', fundo: 'bg-red-500/10' };
    case 'Lunaris':
    default:
      return { texto: 'text-primary', borda: 'border-primary/30', fundo: 'bg-primary/10' };
  }
};

const CATEGORIAS_LOJA = new Set<ItemCategoria>([
  'Relíquias da Criação', 'Armas', 'Armaduras e Escudos', 'Modificações',
  'Consumíveis', 'Bens', 'Mercenários', 'Componentes', 'Frutos do Éden',
  'Implantes Cibernéticos', 'Artefatos Mágicos', 'Outros',
]);

const normalizarTexto = (valor: unknown): string => String(valor ?? '')
  .normalize('NFD')
  .replace(/[\u0300-\u036f]/g, '')
  .trim()
  .toLocaleLowerCase('pt-BR');

const EQUIPAMENTOS_CONSUMIVEIS = new Set([
  'pomada-restauradora', 'racao-de-viagem', 'pingente-lunar',
  'flor-da-noite-eterna', 'semente-da-noite', 'pocao-cura-menor',
  'antidoto', 'pocao-cura-maior', 'pergaminho-teleporte',
]);

const mapCategoriaEquipamento = (item: any): ItemCategoria => {
  const declarada = String(item.conteudo?.categoria_loja ?? '').trim() as ItemCategoria;
  if (CATEGORIAS_LOJA.has(declarada)) return declarada;

  if (item.conteudo?.consumivel === true || EQUIPAMENTOS_CONSUMIVEIS.has(item.id)) {
    return 'Consumíveis';
  }

  const raridade = normalizarRaridadeChave(item.conteudo?.raridade);
  const textoMagico = normalizarTexto([
    item.titulo,
    item.conteudo?.material,
    item.conteudo?.descricao,
  ].filter(Boolean).join(' '));
  const marcadoresMagicos = [
    'arcano', 'magico', 'fluxo', 'sombr', 'eter', 'alma', 'espectral',
    'runa', 'element', 'golem', 'eclipse', 'ilus', 'telepat', 'encant',
  ];
  if (
    ['epico', 'lendario', 'reliquia', 'reliquia da criacao'].includes(raridade)
    || marcadoresMagicos.some((marcador) => textoMagico.includes(marcador))
  ) {
    return 'Artefatos Mágicos';
  }

  return 'Outros';
};

const mapCategoria = (item: any): ItemCategoria => {
  if (item.conteudo?.subtipo === 'reliquia-criacao') return 'Relíquias da Criação';
  
  switch (item.tipo) {
    case 'arma': return 'Armas';
    case 'armadura': return 'Armaduras e Escudos';
    case 'modificacao': return 'Modificações';
    case 'equipamento': return mapCategoriaEquipamento(item);
    case 'consumivel': return 'Consumíveis';
    case 'veiculo':
    case 'veiculo-completo':
    case 'propriedade': return 'Bens';
    case 'monstro': return 'Mercenários';
    case 'drop': return 'Componentes';
    case 'fruto-eden': return 'Frutos do Éden';
    case 'implante': return 'Implantes Cibernéticos';
    case 'artefato': return 'Artefatos Mágicos';
    default: return 'Outros';
  }
};

export const normalizarRaridadeChave = (raridade: unknown): ItemRaridadeChave => {
  const val = String(raridade ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .toLowerCase();
  if (val === 'incomum' || val === 'raro' || val === 'epico' || val === 'lendario' || val === 'reliquia') {
    return val;
  }
  if (val === 'mitico' || val === 'mitica') return 'reliquia';
  if (val === 'reliquia da criacao') {
    return 'reliquia da criacao';
  }
  return 'comum';
};

export const lerRaridadeChave = (raridade: unknown): ItemRaridadeChave | null => {
  const val = String(raridade ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .toLowerCase();
  const compatibilidade = val === 'mitico' || val === 'mitica' ? 'reliquia' : val;
  return RARIDADES_CONHECIDAS.has(compatibilidade as ItemRaridadeChave)
    ? compatibilidade as ItemRaridadeChave
    : null;
};

export const rotuloRaridadeChave = (raridade: unknown): ItemRaridade => {
  const rotulos: Record<ItemRaridadeChave, ItemRaridade> = {
    comum: 'Comum',
    incomum: 'Incomum',
    raro: 'Raro',
    epico: 'Épico',
    lendario: 'Lendário',
    reliquia: 'Mítico',
    'reliquia da criacao': 'Relíquia da Criação',
  };
  const chave = lerRaridadeChave(raridade);
  return chave ? rotulos[chave] : 'Desconhecida';
};

export const classeTextoRaridade = (raridade: unknown): string => {
  switch (lerRaridadeChave(raridade)) {
    case 'incomum': return '!text-emerald-400';
    case 'raro': return '!text-blue-400';
    case 'epico': return '!text-purple-400';
    case 'lendario': return '!text-amber-400';
    case 'reliquia': return '!text-red-400';
    case 'reliquia da criacao': return 'bg-gradient-to-r from-cyan-200 via-white to-fuchsia-200 bg-clip-text !text-transparent drop-shadow-[0_0_6px_rgba(255,255,255,0.45)]';
    case 'comum': return '!text-slate-300';
    default: return '!text-rose-300';
  }
};

export const itemEhVeiculoCompleto = (item: Pick<LojaItem, 'tipoOrigem' | 'dadosBrutos'>): boolean => (
  item.tipoOrigem === 'veiculo-completo'
  || normalizarMarcador(item.dadosBrutos?.subtipo) === 'completo'
);

export const normalizarCategoriaInventarioLoja = (dados: Record<string, unknown> | null | undefined): 'veiculo' | 'modulo-veicular' | null => {
  const tipo = normalizarMarcador(dados?.tipo);
  if (tipo === 'veiculo-completo') return 'veiculo';
  if (tipo === 'veiculo') return 'modulo-veicular';
  const categoria = normalizarMarcador(dados?.categoria);
  if (categoria === 'veiculo') return 'veiculo';
  if (categoria === 'modulo-veicular') return 'modulo-veicular';
  return null;
};

export const obterBonusDefesaCatalogo = (dados: Record<string, unknown>): unknown => (
  dados.bonus ?? dados.defesa
);

export const personagemAtendeRequisitosLoja = (
  item: Pick<LojaItem, 'requisitoNivel' | 'requisitoClasse'>,
  personagem?: { nivel?: number; classes?: Array<{ id?: string; classeId?: string }>; classeId?: string },
): boolean => {
  if (!personagem) return false;
  if (item.requisitoNivel && Number(personagem.nivel ?? 0) < item.requisitoNivel) return false;
  if (!item.requisitoClasse?.length) return true;
  const classes = new Set([
    personagem.classeId,
    ...(personagem.classes ?? []).map((classe) => classe.id ?? classe.classeId),
  ].map(normalizarMarcador).filter(Boolean));
  return item.requisitoClasse.some((classe) => classes.has(normalizarMarcador(classe)));
};

export const personagemPodeAdquirirItemLoja = (
  item: Pick<LojaItem, 'requisitoNivel' | 'requisitoClasse' | 'dadosBrutos'>,
  personagem: Parameters<typeof personagemAtendeRequisitosLoja>[1],
  podeGerenciarConteudo: boolean,
): boolean => personagemAtendeRequisitosLoja(item, personagem)
  && (item.dadosBrutos?.requer_autorizacao_mestre !== true || podeGerenciarConteudo);

const mapNivelLoja = (item: any, categoria: ItemCategoria, raridade: ItemRaridade, moeda: MoedaTipo): number => {
  if (Number.isSafeInteger(item.nivel_loja) && item.nivel_loja >= 1 && item.nivel_loja <= 4) {
    return item.nivel_loja;
  }
  if (item.conteudo?.nivelMinimoLoja !== undefined) {
    return Number(item.conteudo.nivelMinimoLoja);
  }
  
  if (raridade === 'Lendário' || raridade === 'Mítico' || raridade === 'Relíquia da Criação' || raridade === 'Desconhecida') return 4;
  if (categoria === 'Frutos do Éden') return 4;
  
  if (raridade === 'Épico') return 3;
  if (categoria === 'Implantes Cibernéticos' || categoria === 'Artefatos Mágicos' || moeda === 'Créditos Sombrios') return 3;
  
  const desc = (item.conteudo?.descricao || '').toLowerCase();
  if (desc.includes('ilegal') || desc.includes('contrabando') || desc.includes('veneno') || desc.includes('mercado negro')) return 3;
  
  if (categoria === 'Bens') return 2;
  if (raridade === 'Raro') return 2;
  if (item.tipo === 'arma' && normalizarMarcador(item.conteudo?.subtipo) === 'marcial') return 2;
  if (item.tipo === 'consumivel' && normalizarMarcador(item.conteudo?.subtipo) === 'selo') return 2;
  
  return 1;
};

const normalizarMarcador = (valor: unknown): string => String(valor ?? '')
  .normalize('NFD')
  .replace(/[\u0300-\u036f]/g, '')
  .trim()
  .toLocaleLowerCase('pt-BR');

export function itemCorrespondeBusca(item: LojaItem, termo: string): boolean {
  const busca = normalizarMarcador(termo);
  if (!busca) return true;

  const dados = item.dadosBrutos || {};
  const alvo = normalizarMarcador([
    item.nome,
    item.descricao,
    item.categoria,
    dados.subtipo,
    ...(Array.isArray(dados.atributos) ? dados.atributos : []),
  ].filter(Boolean).join(' '));

  if (alvo.includes(busca)) return true;
  const singular = busca.endsWith('s') && busca.length > 3 ? busca.slice(0, -1) : busca;
  return singular !== busca && alvo.includes(singular);
}

const marcadoresDoItem = (item: LojaItem): Set<string> => {
  const dados = item.dadosBrutos || {};
  const atributos = Array.isArray(dados.atributos) ? dados.atributos : [];
  return new Set([
    item.tipoOrigem,
    dados.subtipo,
    dados.natureza,
    dados.sistema,
    ...atributos,
  ].map(normalizarMarcador).filter(Boolean));
};

export function itemCorrespondeSubfiltro(
  item: LojaItem,
  categoria: ItemCategoria | 'Todos',
  subfiltro: string,
): boolean {
  if (subfiltro === 'Todos') return true;

  const dados = item.dadosBrutos || {};
  const descricao = normalizarMarcador(item.descricao);
  const modo = normalizarMarcador(dados.modo);
  const marcadores = marcadoresDoItem(item);

  if (categoria === 'Armas') {
    if (subfiltro === 'Corpo a Corpo') return modo === 'corpo a corpo' || modo === 'hibrida';
    if (subfiltro === 'À Distância') return modo === 'a distancia' || modo === 'hibrida';
    if (subfiltro === 'Mágicas') return ['magica', 'magia', 'runa'].some((termo) => descricao.includes(termo));
  }

  if (categoria === 'Armaduras e Escudos') {
    const escudo = marcadores.has('escudo') || descricao.includes('escudo');
    if (subfiltro === 'Escudos') return escudo;
    if (subfiltro === 'Armaduras') return !escudo;
  }

  if (categoria === 'Modificações') {
    // "Comum" e "Marcial" filtram pelo nível da modificação; o resto filtra pelo
    // tipo de equipamento que a recebe.
    if (subfiltro === 'Comuns') return normalizarMarcador(dados.nivel_modificacao) === 'comum';
    if (subfiltro === 'Marciais') return normalizarMarcador(dados.nivel_modificacao) === 'marcial';
    return normalizarMarcador(dados.aplicacao) === normalizarMarcador(subfiltro);
  }

  if (categoria === 'Bens') {
    const propriedade = item.tipoOrigem === 'propriedade';
    const completo = !propriedade && itemEhVeiculoCompleto(item);
    if (subfiltro === 'Propriedades') return propriedade;
    if (subfiltro === 'Veículos Completos') return completo;
    if (subfiltro === 'Peças e Módulos') return !completo && !propriedade;
  }

  if (categoria === 'Consumíveis') {
    const pocao = ['pocao', 'elixir', 'frasco', 'cura'].some((termo) => descricao.includes(termo));
    const selo = marcadores.has('selo');
    const ritual = !selo && ['ritual', 'pergaminho'].some((termo) => descricao.includes(termo));
    if (subfiltro === 'Poções') return pocao;
    if (subfiltro === 'Selos') return selo;
    if (subfiltro === 'Rituais') return ritual;
    if (subfiltro === 'Ferramentas') return !pocao && !selo && !ritual;
  }

  if (categoria === 'Frutos do Éden') {
    return marcadores.has(normalizarMarcador(subfiltro));
  }

  return true;
}

export const mapearItemLoja = (entrada: LojaCatalogEntry): LojaItem => {
  const c = entrada.conteudo || {};
  const { moedaPreco, valorOriginal } = parsePrecoDetalhado(entrada.preco.moeda, entrada.preco.valor);
  const categoria = mapCategoria(entrada);
  const raridade = rotuloRaridadeChave(c.raridade);
  const nivelLoja = mapNivelLoja(entrada, categoria, raridade, moedaPreco);
  const promocaoBruta = c.promocao && typeof c.promocao === 'object' && !Array.isArray(c.promocao)
    ? c.promocao as Record<string, unknown>
    : null;
  const precoAnteriorLido = lerPrecoNativoLoja(c.preco_original);
  const promocaoValida = promocaoBruta?.ativa === true
    && precoAnteriorLido?.moedaPreco === moedaPreco
    && precoAnteriorLido.valorOriginal > valorOriginal;
  const descontoPercentual = promocaoValida
    ? Math.round((1 - (valorOriginal / precoAnteriorLido.valorOriginal)) * 100)
    : 0;
  
  return {
    id: entrada.id,
    tipoOrigem: entrada.tipo,
    nome: entrada.titulo || 'Item Desconhecido',
    categoria,
    raridade,
    moedaPreco,
    valorOriginal,
    nivelLoja,
    descricao: typeof c.descricao === 'string' ? c.descricao : 'Um item peculiar de utilidade questionável.',
    propriedades: Array.isArray(c.atributos) ? c.atributos.join(' | ') : (typeof c.atributos === 'string' ? c.atributos : ''),
    requisitoNivel: c.requisitoNivel ? Number(c.requisitoNivel) : undefined,
    requisitoClasse: Array.isArray(c.requisitoClasse)
      ? c.requisitoClasse.map(String)
      : typeof c.requisitoClasse === 'string'
        ? [c.requisitoClasse]
        : undefined,
    dadosBrutos: c,
    precoAnterior: promocaoValida ? precoAnteriorLido.valorOriginal : undefined,
    promocao: promocaoValida ? {
      rotulo: typeof promocaoBruta.rotulo === 'string' && promocaoBruta.rotulo.trim()
        ? promocaoBruta.rotulo.trim().slice(0, 40)
        : 'Oferta especial',
      descontoPercentual,
    } : undefined,
  };
};

/** O catálogo exibido vem exclusivamente da lista publicada pelo backend. */
export const mapearCatalogoLoja = (entradas: readonly LojaCatalogEntry[]): LojaItem[] => entradas
  .filter((entrada) => Boolean(entrada?.id?.trim() && entrada?.tipo?.trim() && entrada?.titulo?.trim()))
  .map(mapearItemLoja);
