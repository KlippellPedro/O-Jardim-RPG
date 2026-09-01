import type { LojaCatalogEntry } from './lojaApi';
import { ehReliquiaCriacao } from './reliquiasCriacaoService';

export type ItemCategoria = 'Relíquias da Criação' | 'Armas' | 'Armaduras' | 'Escudos' | 'Modificações' | 'Consumíveis' | 'Bens' | 'Mercenários' | 'Componentes' | 'Frutos do Éden' | 'Implantes Cibernéticos' | 'Artefatos Mágicos' | 'Itens Comuns' | 'Outros';
export type ItemRaridade = 'Comum' | 'Incomum' | 'Raro' | 'Épico' | 'Lendário' | 'Mítico' | 'Relíquia da Criação' | 'Desconhecida';
export type ItemRaridadeChave = 'comum' | 'incomum' | 'raro' | 'epico' | 'lendario' | 'reliquia' | 'reliquia da criacao';
export type RaridadeCompraEquipamento = 'comum' | 'incomum' | 'raro' | 'epico' | 'lendario';

export type MoedaTipo = 'Solares' | 'Lunaris' | 'Fragmentos de Estrela' | 'Créditos Sombrios';

/** Nomes curtos dos mercados da loja, indexados por nivelLoja - 1 (fonte única para LojaPage e ItemCard). */
export const NOMES_LOCAIS_LOJA = ['Feira', 'Metrópole', 'Mercado Negro', 'Banco Lunar'] as const;

export interface LojaItem {
  id: string;
  tipoOrigem: string;
  nome: string;
  categoria: ItemCategoria;
  raridade: ItemRaridade;
  moedaPreco: MoedaTipo;
  valorOriginal: number; // Valor na moedaPreco
  nivelLoja: number; // 1=Vila, 2=Metrópole, 3=Mercado Negro, 4=Banco Lunar
  nivelLojaBase?: number;
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
  /** Só em Mercenários: preço para contratar (menor, gera mensalidade) e o
   * valor dessa mensalidade. `valorOriginal`/`moedaPreco` seguem sendo o
   * preço de COMPRA (vira servo/escravo permanente, sem mensalidade). */
  contratacao?: PrecoNativoLoja;
  mensalidade?: PrecoNativoLoja;
  precosRaridade?: Partial<Record<RaridadeCompraEquipamento, PrecoNativoLoja>>;
  precosAnterioresRaridade?: Partial<Record<RaridadeCompraEquipamento, PrecoNativoLoja>>;
  propriedadesRaridade?: Partial<Record<RaridadeCompraEquipamento, Record<string, unknown>>>;
  /** Presente somente na cópia colocada no carrinho. O id continua sendo o
   * id do catálogo; o servidor cria a variante estável no inventário. */
  raridadeCompra?: RaridadeCompraEquipamento;
  raridadeConfiguravel?: boolean;
}

export const RARIDADES_COMPRA_EQUIPAMENTO: ReadonlyArray<{
  value: RaridadeCompraEquipamento;
  label: ItemRaridade;
  nivelLoja: number;
}> = [
  { value: 'comum', label: 'Comum', nivelLoja: 1 },
  { value: 'incomum', label: 'Incomum', nivelLoja: 1 },
  { value: 'raro', label: 'Raro', nivelLoja: 2 },
  { value: 'epico', label: 'Épico', nivelLoja: 3 },
  { value: 'lendario', label: 'Lendário', nivelLoja: 4 },
];

const MULTIPLICADOR_PRECO_RARIDADE: Record<RaridadeCompraEquipamento, number> = {
  comum: 1,
  incomum: 3,
  raro: 8,
  epico: 20,
  lendario: 60,
};

const valorEmLunaris = (preco: PrecoNativoLoja): number | null => {
  if (preco.moedaPreco === 'Lunaris') return preco.valorOriginal;
  if (preco.moedaPreco === 'Solares') return preco.valorOriginal * 100;
  if (preco.moedaPreco === 'Fragmentos de Estrela') return preco.valorOriginal * 5_000;
  return null;
};

const precoComRaridade = (
  precoComum: PrecoNativoLoja,
  raridade: RaridadeCompraEquipamento,
): PrecoNativoLoja => {
  const baseLunaris = valorEmLunaris(precoComum);
  if (baseLunaris === null) return precoComum;
  const valorLunaris = Math.max(1, baseLunaris * MULTIPLICADOR_PRECO_RARIDADE[raridade]);
  if (raridade === 'epico' || raridade === 'lendario') {
    return { moedaPreco: 'Solares', valorOriginal: Math.max(1, Math.floor((valorLunaris / 100) + 0.5)) };
  }
  return { moedaPreco: 'Lunaris', valorOriginal: valorLunaris };
};

export const itemPermiteEscolherRaridade = (item: Pick<LojaItem, 'categoria' | 'tipoOrigem' | 'raridadeConfiguravel'>): boolean => (
  item.raridadeConfiguravel === true
  && (
    item.tipoOrigem === 'arma'
    || item.tipoOrigem === 'armadura'
    || item.categoria === 'Armas'
    || item.categoria === 'Armaduras'
    || item.categoria === 'Escudos'
  )
);

export const nivelLojaParaRaridadeCompra = (
  item: Pick<LojaItem, 'nivelLoja' | 'nivelLojaBase'>,
  raridade: RaridadeCompraEquipamento,
): number => Math.max(
  item.nivelLojaBase ?? item.nivelLoja,
  RARIDADES_COMPRA_EQUIPAMENTO.find((opcao) => opcao.value === raridade)?.nivelLoja ?? 1,
);

export function aplicarRaridadeCompra(
  item: LojaItem,
  raridade: RaridadeCompraEquipamento,
): LojaItem {
  if (!itemPermiteEscolherRaridade(item)) return item;
  const preco = item.precosRaridade?.[raridade] ?? precoComRaridade(item, raridade);
  const precoAnterior = item.precosAnterioresRaridade?.[raridade] ?? (item.precoAnterior
    ? precoComRaridade({ moedaPreco: item.moedaPreco, valorOriginal: item.precoAnterior }, raridade)
    : null);
  const rotulo = RARIDADES_COMPRA_EQUIPAMENTO.find((opcao) => opcao.value === raridade)?.label ?? 'Comum';
  const dadosBrutos = {
    ...(item.dadosBrutos || {}),
    ...(item.propriedadesRaridade?.[raridade] || {}),
    raridade,
  };
  return {
    ...item,
    raridade: rotulo,
    raridadeCompra: raridade,
    moedaPreco: preco.moedaPreco,
    valorOriginal: preco.valorOriginal,
    nivelLojaBase: item.nivelLojaBase ?? item.nivelLoja,
    nivelLoja: nivelLojaParaRaridadeCompra(item, raridade),
    dadosBrutos,
    propriedades: Array.isArray(dadosBrutos.atributos)
      ? dadosBrutos.atributos.map(String).join(' | ')
      : item.propriedades,
    precoAnterior: precoAnterior?.valorOriginal,
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
  'Relíquias da Criação', 'Armas', 'Armaduras', 'Escudos', 'Modificações',
  'Consumíveis', 'Bens', 'Mercenários', 'Componentes', 'Frutos do Éden',
  'Implantes Cibernéticos', 'Artefatos Mágicos', 'Itens Comuns', 'Outros',
]);

/** O que se contrata um ser para fazer. Vem de `conteudo.funcao` no catálogo,
 * vira subfiltro no balcão de Mercenários e vira o papel do Aliado que a compra
 * cria na ficha. Fera de combate não declara função. */
export const FUNCOES_MERCENARIO_ROTULOS = [
  'Guarda de local', 'Escolta', 'Tripulação', 'Ofício',
] as const;
export type FuncaoMercenario = typeof FUNCOES_MERCENARIO_ROTULOS[number];

const FUNCOES_MERCENARIO = new Set(['guarda de local', 'escolta', 'tripulacao', 'oficio']);

const SUBFILTRO_PARA_FUNCAO: Record<string, FuncaoMercenario> = {
  'Guardas de local': 'Guarda de local',
  'Escoltas': 'Escolta',
  'Tripulação': 'Tripulação',
  'Ofícios': 'Ofício',
};

const SUBFILTRO_PARA_FAMILIA_CRIATURA: Record<string, string> = {
  'Marítimas': 'Marítima',
  'Espíritos': 'Espírito',
  'Golens': 'Golem',
  'Vazio': 'Vazio',
};

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

  // Sem categoria declarada, sem marca de consumível e sem indício de magia:
  // é equipamento de uso cotidiano (acessório, kit, mochila e afins). "Outros"
  // fica reservado para o que de fato não se encaixa em nenhuma categoria.
  return 'Itens Comuns';
};

const mapCategoria = (item: any): ItemCategoria => {
  if (ehReliquiaCriacao({ ...item.conteudo, tipo: item.tipo })) return 'Relíquias da Criação';
  
  switch (item.tipo) {
    case 'arma': return 'Armas';
    case 'armadura': return item.conteudo?.categoria_protecao === 'escudo' ? 'Escudos' : 'Armaduras';
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
    dados.funcao,
    ...(Array.isArray(dados.atributos) ? dados.atributos : []),
    dados.categoria,
    dados.origem,
    dados.afinidade,
    dados.estadoBase,
    ...(Array.isArray(dados.propriedades) ? dados.propriedades : []),
    ...(Array.isArray(dados.usos) ? dados.usos : []),
  ].filter(Boolean).join(' '));

  return busca.split(/\s+/).filter(Boolean).every((termoBusca) => {
    if (alvo.includes(termoBusca)) return true;
    const singular = termoBusca.endsWith('s') && termoBusca.length > 3 ? termoBusca.slice(0, -1) : termoBusca;
    return singular !== termoBusca && alvo.includes(singular);
  });
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

/** Filtro de Simples/Marcial - independente do subfiltro de Tipo (modo de
 * combate), pra dar pra combinar os dois ao mesmo tempo (ex.: Corpo a Corpo
 * + Marcial). Vale pra armas, armaduras e escudos, que usam o mesmo campo
 * `subtipo` do catálogo pra essa distinção. */
export function itemCorrespondeProficiencia(
  item: LojaItem,
  categoria: ItemCategoria | 'Todos',
  proficiencia: string,
): boolean {
  if (proficiencia === 'Todos') return true;
  if (categoria !== 'Armas' && categoria !== 'Armaduras' && categoria !== 'Escudos') return true;
  const subtipo = normalizarMarcador(item.dadosBrutos?.subtipo);
  return subtipo === normalizarMarcador(proficiencia);
}

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

  if (categoria === 'Mercenários') {
    // Quem é contratável declara `funcao` no catálogo; quem não declara é fera,
    // servo ou invocação que se compra pelo que faz em combate.
    const funcao = normalizarMarcador(dados.funcao);
    if (subfiltro === 'Feras e Monstros') return !FUNCOES_MERCENARIO.has(funcao);
    const familia = SUBFILTRO_PARA_FAMILIA_CRIATURA[subfiltro];
    if (familia) return normalizarMarcador(dados.subtipo) === normalizarMarcador(familia);
    return funcao === normalizarMarcador(SUBFILTRO_PARA_FUNCAO[subfiltro] ?? subfiltro);
  }

  if (categoria === 'Frutos do Éden') {
    return marcadores.has(normalizarMarcador(subfiltro));
  }

  if (categoria === 'Componentes') {
    const usoPorEstoque: Record<string, string> = {
      'Componentes Químicos': 'alquimia',
      'Componentes Ritualísticos': 'ritual',
      'Componentes Veiculares': 'veiculos',
      Sucata: 'engenharia',
      Mantimentos: 'cozinha',
      'Matéria-prima': 'forja',
    };
    const uso = normalizarMarcador(usoPorEstoque[subfiltro] ?? subfiltro);
    return Array.isArray(dados.usos) && dados.usos.some((item: unknown) => normalizarMarcador(item) === uso);
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
  const estoquePorUso: Record<string, string> = {
    alquimia: 'Componente Químico',
    ritual: 'Componente Ritualístico',
    veiculos: 'Componente Veicular',
    engenharia: 'Sucata',
    cozinha: 'Mantimento',
    forja: 'Matéria-prima',
  };
  const conversoesMaterial = entrada.tipo === 'drop' && Array.isArray(c.usos)
    ? [...new Set(c.usos.map((uso: unknown) => estoquePorUso[String(uso)]).filter(Boolean))]
    : [];
  const mapearPrecosRaridade = (raw: unknown): Partial<Record<RaridadeCompraEquipamento, PrecoNativoLoja>> | undefined => {
    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return undefined;
    const mapped: Partial<Record<RaridadeCompraEquipamento, PrecoNativoLoja>> = {};
    for (const opcao of RARIDADES_COMPRA_EQUIPAMENTO) {
      const preco = lerPrecoNativoLoja((raw as Record<string, unknown>)[opcao.value]);
      if (preco) mapped[opcao.value] = preco;
    }
    return Object.keys(mapped).length ? mapped : undefined;
  };
  const mapearPropriedadesRaridade = (raw: unknown): Partial<Record<RaridadeCompraEquipamento, Record<string, unknown>>> | undefined => {
    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return undefined;
    const mapped: Partial<Record<RaridadeCompraEquipamento, Record<string, unknown>>> = {};
    for (const opcao of RARIDADES_COMPRA_EQUIPAMENTO) {
      const value = (raw as Record<string, unknown>)[opcao.value];
      if (value && typeof value === 'object' && !Array.isArray(value)) {
        mapped[opcao.value] = value as Record<string, unknown>;
      }
    }
    return Object.keys(mapped).length ? mapped : undefined;
  };
  const descricaoCatalogo = entrada.tipo === 'fruto-eden'
    ? [
        typeof c.lore === 'string' ? c.lore.trim() : '',
        c.passivo ? `Vínculo: ${String(c.passivo).trim()}` : '',
        c.tecnica ? `Técnica: ${String(c.tecnica).trim()}` : '',
        c.passivoDespertado ? `Vínculo despertado: ${String(c.passivoDespertado).trim()}` : '',
        c.tecnicaDespertada ? `Técnica despertada: ${String(c.tecnicaDespertada).trim()}` : '',
        c.despertar ? `Manifestação final: ${String(c.despertar).trim()}` : '',
        c.fraqueza ? `Limite: ${String(c.fraqueza).trim()}` : '',
      ].filter(Boolean).join('\n\n')
    : [
        typeof c.lore === 'string' ? c.lore.trim() : '',
        typeof c.descricao === 'string' ? c.descricao.trim() : '',
      ].filter(Boolean).join('\n\n');
  
  return {
    id: entrada.id,
    tipoOrigem: entrada.tipo,
    nome: entrada.titulo || 'Item Desconhecido',
    categoria,
    raridade,
    moedaPreco,
    valorOriginal,
    nivelLoja,
    descricao: descricaoCatalogo || 'Um item peculiar de utilidade questionável.',
    propriedades: conversoesMaterial.length
      ? `Pode virar: ${conversoesMaterial.join(' | ')}`
      : Array.isArray(c.atributos)
      ? c.atributos.join(' | ')
      : typeof c.atributos === 'string'
        ? c.atributos
        : Array.isArray(c.propriedades)
          ? c.propriedades.join(' | ')
          : '',
    requisitoNivel: c.requisitoNivel ? Number(c.requisitoNivel) : undefined,
    requisitoClasse: Array.isArray(c.requisitoClasse)
      ? c.requisitoClasse.map(String)
      : typeof c.requisitoClasse === 'string'
        ? [c.requisitoClasse]
        : undefined,
    dadosBrutos: c,
    precoAnterior: promocaoValida ? precoAnteriorLido.valorOriginal : undefined,
    contratacao: categoria === 'Mercenários' ? lerPrecoNativoLoja(c.preco_contratacao) ?? undefined : undefined,
    mensalidade: categoria === 'Mercenários' ? lerPrecoNativoLoja(c.contrato_mensal) ?? undefined : undefined,
    precosRaridade: mapearPrecosRaridade(c.precos_por_raridade),
    precosAnterioresRaridade: mapearPrecosRaridade(c.precos_originais_por_raridade),
    propriedadesRaridade: mapearPropriedadesRaridade(c.propriedades_por_raridade),
    raridadeConfiguravel: Boolean(mapearPrecosRaridade(c.precos_por_raridade)),
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
