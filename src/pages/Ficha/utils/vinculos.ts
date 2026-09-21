export type TipoVinculo =
  | 'amizade'
  | 'familia'
  | 'amor'
  | 'mentor'
  | 'aliado'
  | 'contato'
  | 'divida'
  | 'rival'
  | 'inimigo';

export const TIPOS_VINCULO: { valor: TipoVinculo; rotulo: string }[] = [
  { valor: 'amizade', rotulo: 'Amizade' },
  { valor: 'familia', rotulo: 'Família' },
  { valor: 'amor', rotulo: 'Amor' },
  { valor: 'mentor', rotulo: 'Mentor' },
  { valor: 'aliado', rotulo: 'Aliado' },
  { valor: 'contato', rotulo: 'Contato' },
  { valor: 'divida', rotulo: 'Dívida' },
  { valor: 'rival', rotulo: 'Rival' },
  { valor: 'inimigo', rotulo: 'Inimigo' },
];

export const AFINIDADE_MIN = -5;
export const AFINIDADE_MAX = 5;
export const LIMITE_VINCULOS = 60;
export const LIMITE_HISTORICO = 30;
/** Retratos moram dentro da ficha (limite de 1 MB), então são miniaturas e poucos. */
export const LIMITE_FOTOS_VINCULO = 24;
export const RESOLUCAO_FOTO_VINCULO = 128;
export const TAMANHO_MAXIMO_FOTO_VINCULO = 20_000;
/** Quantos vínculos cabem na teia sem virar borrão. */
export const LIMITE_NOS_TEIA = 14;

const PREFIXOS_FOTO = ['data:image/webp;base64,', 'data:image/jpeg;base64,', 'data:image/png;base64,'];

export const fotoVinculoValida = (valor: unknown): valor is string =>
  typeof valor === 'string'
  && valor.length <= TAMANHO_MAXIMO_FOTO_VINCULO
  && PREFIXOS_FOTO.some((prefixo) => valor.startsWith(prefixo));

export interface IMudancaAfinidade {
  em: number;
  de: number;
  para: number;
  motivo: string;
}

export interface IVinculo {
  id: string;
  nome: string;
  tipo: TipoVinculo;
  afinidade: number;
  nota: string;
  fixado: boolean;
  /** Id do aliado da aba Aliados que originou o vínculo, quando houve. */
  aliadoId?: string;
  /** Miniatura em data URL. Ausente quando o vínculo usa só as iniciais. */
  foto?: string;
  criadoEm: number;
  atualizadoEm: number;
  historico: IMudancaAfinidade[];
}

const TIPOS_VALIDOS = new Set<string>(TIPOS_VINCULO.map((tipo) => tipo.valor));

export const limitarAfinidade = (valor: unknown): number => {
  const numero = typeof valor === 'number' && Number.isFinite(valor) ? Math.round(valor) : 0;
  return Math.max(AFINIDADE_MIN, Math.min(AFINIDADE_MAX, numero));
};

export const gerarIdVinculo = () =>
  `vinculo-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 7)}`;

const texto = (valor: unknown, limite: number) =>
  typeof valor === 'string' ? valor.trim().slice(0, limite) : '';

/** Aceita o que estiver salvo na ficha e devolve só vínculos utilizáveis. */
export function normalizarVinculos(bruto: unknown): IVinculo[] {
  if (!Array.isArray(bruto)) return [];
  const vistos = new Set<string>();
  const resultado: IVinculo[] = [];
  let fotos = 0;
  bruto.forEach((item) => {
    if (!item || typeof item !== 'object') return;
    const registro = item as Record<string, unknown>;
    const nome = texto(registro.nome, 80);
    const id = texto(registro.id, 80) || gerarIdVinculo();
    if (!nome || vistos.has(id) || resultado.length >= LIMITE_VINCULOS) return;
    vistos.add(id);
    const criadoEm = typeof registro.criadoEm === 'number' ? registro.criadoEm : 0;
    resultado.push({
      id,
      nome,
      tipo: TIPOS_VALIDOS.has(String(registro.tipo)) ? (registro.tipo as TipoVinculo) : 'contato',
      afinidade: limitarAfinidade(registro.afinidade),
      nota: texto(registro.nota, 1200),
      fixado: registro.fixado === true,
      aliadoId: texto(registro.aliadoId, 80) || undefined,
      foto: fotoVinculoValida(registro.foto) && fotos < LIMITE_FOTOS_VINCULO ? (fotos++, registro.foto) : undefined,
      criadoEm,
      atualizadoEm: typeof registro.atualizadoEm === 'number' ? registro.atualizadoEm : criadoEm,
      historico: Array.isArray(registro.historico)
        ? registro.historico
            .filter((mudanca): mudanca is Record<string, unknown> => !!mudanca && typeof mudanca === 'object')
            .map((mudanca) => ({
              em: typeof mudanca.em === 'number' ? mudanca.em : 0,
              de: limitarAfinidade(mudanca.de),
              para: limitarAfinidade(mudanca.para),
              motivo: texto(mudanca.motivo, 200),
            }))
            .slice(-LIMITE_HISTORICO)
        : [],
    });
  });
  return resultado;
}

export function rotuloAfinidade(afinidade: number): string {
  const valor = limitarAfinidade(afinidade);
  if (valor >= 5) return 'Confiança total';
  if (valor >= 3) return 'Próximo';
  if (valor >= 1) return 'Amigável';
  if (valor === 0) return 'Neutro';
  if (valor >= -2) return 'Desconfiado';
  if (valor >= -4) return 'Hostil';
  return 'Inimigo declarado';
}

/** Verde para quem quer bem, dourado para neutro, vermelho para quem quer mal. */
export function corAfinidade(afinidade: number): string {
  const valor = limitarAfinidade(afinidade);
  if (valor > 0) return valor >= 3 ? '#4ade80' : '#a3e635';
  if (valor < 0) return valor <= -3 ? '#f87171' : '#fb923c';
  return '#c7a44c';
}

/**
 * Registra a nova afinidade e guarda a mudança no histórico. Se nada mudou
 * de fato, devolve o mesmo vínculo para não sujar a ficha com salvamentos.
 */
export function aplicarAfinidade(
  vinculo: IVinculo,
  nova: number,
  motivo: string,
  agora = Date.now(),
): IVinculo {
  const para = limitarAfinidade(nova);
  if (para === vinculo.afinidade) return vinculo;
  return {
    ...vinculo,
    afinidade: para,
    atualizadoEm: agora,
    historico: [
      ...vinculo.historico,
      { em: agora, de: vinculo.afinidade, para, motivo: motivo.trim().slice(0, 200) },
    ].slice(-LIMITE_HISTORICO),
  };
}

/** Fixados primeiro, depois quem tem mais afinidade (em módulo), depois nome. */
export function ordenarVinculos(vinculos: IVinculo[]): IVinculo[] {
  return [...vinculos].sort((a, b) => {
    if (a.fixado !== b.fixado) return a.fixado ? -1 : 1;
    const forca = Math.abs(b.afinidade) - Math.abs(a.afinidade);
    if (forca !== 0) return forca;
    return a.nome.localeCompare(b.nome, 'pt-BR');
  });
}

export interface IPosicaoTeia {
  id: string;
  x: number;
  y: number;
}

const ORDEM_TIPO = new Map<string, number>(TIPOS_VINCULO.map((tipo, indice) => [tipo.valor, indice]));

/**
 * Distribui os vínculos em volta do personagem. Cada tipo de relação ocupa
 * um setor do círculo (amizades juntas, rivais juntos...) e, dentro do setor,
 * quanto maior a afinidade mais perto do centro. A ordem não depende da
 * afinidade, então a teia não muda de forma quando o valor de alguém muda.
 * Com muita gente, os nós alternam um pouco de raio para os nomes não colidirem.
 */
export function posicionarTeia(vinculos: IVinculo[], raioMax: number, raioMin = raioMax * 0.38): IPosicaoTeia[] {
  const total = vinculos.length;
  if (!total) return [];
  const estavel = [...vinculos].sort((a, b) => {
    const porTipo = (ORDEM_TIPO.get(a.tipo) ?? 99) - (ORDEM_TIPO.get(b.tipo) ?? 99);
    if (porTipo !== 0) return porTipo;
    return a.criadoEm - b.criadoEm || a.id.localeCompare(b.id);
  });
  return estavel.map((vinculo, indice) => {
    const angulo = -Math.PI / 2 + (indice / total) * Math.PI * 2;
    const proximidade = (limitarAfinidade(vinculo.afinidade) - AFINIDADE_MIN) / (AFINIDADE_MAX - AFINIDADE_MIN);
    const folga = total > 10 ? (indice % 2 === 0 ? -6 : 6) : 0;
    const raio = raioMax - proximidade * (raioMax - raioMin) + folga;
    return {
      id: vinculo.id,
      x: Math.cos(angulo) * raio,
      y: Math.sin(angulo) * raio,
    };
  });
}

export interface IFiltroVinculos {
  busca: string;
  tipo: TipoVinculo | 'todos';
  faixa: 'todos' | 'proximos' | 'neutros' | 'hostis' | 'fixados';
}

const semAcento = (valor: string) =>
  valor.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase('pt-BR');

export function filtrarVinculos(vinculos: IVinculo[], filtro: IFiltroVinculos): IVinculo[] {
  const termo = semAcento(filtro.busca.trim());
  return vinculos.filter((vinculo) => {
    if (filtro.tipo !== 'todos' && vinculo.tipo !== filtro.tipo) return false;
    if (filtro.faixa === 'proximos' && vinculo.afinidade <= 0) return false;
    if (filtro.faixa === 'neutros' && vinculo.afinidade !== 0) return false;
    if (filtro.faixa === 'hostis' && vinculo.afinidade >= 0) return false;
    if (filtro.faixa === 'fixados' && !vinculo.fixado) return false;
    return !termo || semAcento(`${vinculo.nome} ${vinculo.nota}`).includes(termo);
  });
}

export interface IGrupoVinculos {
  tipo: TipoVinculo;
  rotulo: string;
  itens: IVinculo[];
}

/** Grupos na ordem dos tipos; tipos sem ninguém não aparecem. */
export function agruparPorTipo(vinculos: IVinculo[]): IGrupoVinculos[] {
  return TIPOS_VINCULO
    .map((tipo) => ({ tipo: tipo.valor, rotulo: tipo.rotulo, itens: vinculos.filter((vinculo) => vinculo.tipo === tipo.valor) }))
    .filter((grupo) => grupo.itens.length > 0);
}

/**
 * Escolhe quem aparece na teia quando há gente demais: o vínculo selecionado
 * e os fixados primeiro, depois os de afinidade mais forte (para o bem ou
 * para o mal). `ocultos` diz quantos ficaram de fora.
 */
export function selecionarParaTeia(
  vinculos: IVinculo[],
  maximo = LIMITE_NOS_TEIA,
  selecionadoId: string | null = null,
): { visiveis: IVinculo[]; ocultos: number } {
  if (vinculos.length <= maximo) return { visiveis: vinculos, ocultos: 0 };
  const prioridade = [...vinculos].sort((a, b) => {
    const peso = (vinculo: IVinculo) => (vinculo.id === selecionadoId ? 2 : vinculo.fixado ? 1 : 0);
    const porPeso = peso(b) - peso(a);
    if (porPeso !== 0) return porPeso;
    const forca = Math.abs(b.afinidade) - Math.abs(a.afinidade);
    if (forca !== 0) return forca;
    return b.atualizadoEm - a.atualizadoEm || a.nome.localeCompare(b.nome, 'pt-BR');
  });
  const escolhidos = new Set(prioridade.slice(0, maximo).map((vinculo) => vinculo.id));
  return {
    visiveis: vinculos.filter((vinculo) => escolhidos.has(vinculo.id)),
    ocultos: vinculos.length - maximo,
  };
}

export interface IAliadoBasico {
  id?: unknown;
  nome?: unknown;
  nomeExibicao?: unknown;
}

/** Aliados da aba Aliados que ainda não viraram vínculo, para sugerir. */
export function aliadosSemVinculo(aliados: IAliadoBasico[], vinculos: IVinculo[]): { id: string; nome: string }[] {
  const ligados = new Set(vinculos.map((vinculo) => vinculo.aliadoId).filter(Boolean));
  const nomes = new Set(vinculos.map((vinculo) => vinculo.nome.toLocaleLowerCase('pt-BR')));
  return aliados
    .map((aliado) => ({
      id: typeof aliado.id === 'string' ? aliado.id : '',
      nome: typeof aliado.nome === 'string' ? aliado.nome.trim() : '',
    }))
    .filter((aliado) => aliado.id && aliado.nome && !ligados.has(aliado.id) && !nomes.has(aliado.nome.toLocaleLowerCase('pt-BR')));
}
