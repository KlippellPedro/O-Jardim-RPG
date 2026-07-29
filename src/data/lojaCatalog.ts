import type { LojaCatalogEntry } from '../services/lojaApi';

export type ItemCategoria = 'Relíquias da Criação' | 'Armas' | 'Armaduras e Escudos' | 'Consumíveis' | 'Veículos' | 'Mercenários' | 'Componentes' | 'Frutos do Éden' | 'Implantes Cibernéticos' | 'Artefatos Mágicos' | 'Outros';
export type ItemRaridade = 'Comum' | 'Incomum' | 'Raro' | 'Épico' | 'Lendário' | 'Relíquia' | 'Relíquia da Criação';
export type ItemRaridadeChave = 'comum' | 'incomum' | 'raro' | 'epico' | 'lendario' | 'reliquia' | 'reliquia da criacao';

export type MoedaTipo = 'Solares' | 'Lunaris' | 'Fragmentos de Estrela' | 'Créditos Sombrios';

export interface LojaItem {
  id: string;
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
}

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

const mapCategoria = (item: any): ItemCategoria => {
  if (item.conteudo?.subtipo === 'reliquia-criacao') return 'Relíquias da Criação';
  
  switch (item.tipo) {
    case 'arma': return 'Armas';
    case 'armadura': return 'Armaduras e Escudos';
    case 'equipamento': return 'Consumíveis';
    case 'consumivel': return 'Consumíveis';
    case 'veiculo': 
    case 'veiculo-completo': return 'Veículos';
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
  if (val === 'reliquia da criacao' || val === 'mitico' || val === 'mitica') {
    return 'reliquia da criacao';
  }
  return 'comum';
};

export const rotuloRaridadeChave = (raridade: unknown): ItemRaridade => {
  const rotulos: Record<ItemRaridadeChave, ItemRaridade> = {
    comum: 'Comum',
    incomum: 'Incomum',
    raro: 'Raro',
    epico: 'Épico',
    lendario: 'Lendário',
    reliquia: 'Relíquia',
    'reliquia da criacao': 'Relíquia da Criação',
  };
  return rotulos[normalizarRaridadeChave(raridade)];
};

const mapNivelLoja = (item: any, categoria: ItemCategoria, raridade: ItemRaridade, moeda: MoedaTipo): number => {
  if (item.conteudo?.nivelMinimoLoja !== undefined) {
    return Number(item.conteudo.nivelMinimoLoja);
  }
  
  if (raridade === 'Relíquia' || raridade === 'Relíquia da Criação') return 4;
  if (categoria === 'Frutos do Éden' || categoria === 'Artefatos Mágicos') return 4;
  
  if (categoria === 'Implantes Cibernéticos' || moeda === 'Créditos Sombrios') return 3;
  
  const desc = (item.conteudo?.descricao || '').toLowerCase();
  if (desc.includes('ilegal') || desc.includes('contrabando') || desc.includes('veneno') || desc.includes('mercado negro')) return 3;
  
  if (categoria === 'Veículos') return 2;
  if (raridade === 'Raro' || raridade === 'Épico') return 2;
  
  return 1;
};

export const mapearItemLoja = (entrada: LojaCatalogEntry): LojaItem => {
  const c = entrada.conteudo || {};
  const { moedaPreco, valorOriginal } = parsePrecoDetalhado(entrada.preco.moeda, entrada.preco.valor);
  const categoria = mapCategoria(entrada);
  const raridade = rotuloRaridadeChave(c.raridade);
  const nivelLoja = mapNivelLoja(entrada, categoria, raridade, moedaPreco);
  
  return {
    id: entrada.id,
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
  };
};

/** O catálogo exibido vem exclusivamente da lista publicada pelo backend. */
export const mapearCatalogoLoja = (entradas: readonly LojaCatalogEntry[]): LojaItem[] => entradas
  .filter((entrada) => Boolean(entrada?.id?.trim() && entrada?.tipo?.trim() && entrada?.titulo?.trim()))
  .map(mapearItemLoja);
