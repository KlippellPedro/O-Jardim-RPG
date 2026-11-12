/**
 * Implantes cobram Sanidade máxima (pedido do Pedro, 2026-11-12).
 *
 * Cada peça instalada tira um pedaço da Sanidade máxima enquanto estiver no
 * corpo: quanto mais forte a peça, maior o pedaço, e o que mexe no sistema
 * nervoso cobra mais. A Sanidade máxima mais baixa empurra a personagem para
 * as faixas de baixo da tabela de Sanidade (Abalado, Enlouquecendo, Ruptura),
 * de onde ela não sai enquanto os implantes ficarem.
 *
 * O custo mora no catálogo (`conteudo.custoSanidade`, ajustado por
 * tools/normalizar-implantes.mjs). Peça comprada antes do campo existir, ou
 * reescrita pela Loja da campanha sem ele, cai na conta pela raridade.
 */

export type SistemaImplante = 'neural' | 'sentidos' | 'membros' | 'orgaos' | 'pele-e-esqueleto';

export const ROTULO_SISTEMA_IMPLANTE: Record<SistemaImplante, string> = {
  neural: 'Neural',
  sentidos: 'Sentidos',
  membros: 'Membros',
  orgaos: 'Órgãos',
  'pele-e-esqueleto': 'Pele e esqueleto',
};

/** Sanidade máxima que cada raridade cobra enquanto a peça está instalada. */
export const CUSTO_SANIDADE_POR_RARIDADE: Record<string, number> = {
  comum: 2,
  incomum: 4,
  raro: 7,
  epico: 12,
  lendario: 18,
  'reliquia da criacao': 25,
};

/** Peça que mexe no cérebro ou nos nervos cobra a mais. */
export const CUSTO_SANIDADE_EXTRA_NEURAL = 3;

/** Raças de corpo construído pagam metade (arredondada para cima): a máquina já é delas. */
export const RACAS_DE_CORPO_CONSTRUIDO = ['automato'];

/** Faixas da tabela de Sanidade (tópico Condições), de cima para baixo. */
export const FAIXAS_DE_SANIDADE = [
  { minimo: 76, nome: 'Estável' },
  { minimo: 51, nome: 'Abalado' },
  { minimo: 26, nome: 'Enlouquecendo' },
  { minimo: 1, nome: 'Ruptura' },
  { minimo: 0, nome: 'Quebra' },
] as const;

export const faixaDaSanidade = (valor: number) => (
  FAIXAS_DE_SANIDADE.find((faixa) => valor >= faixa.minimo)?.nome ?? 'Quebra'
);

const semAcento = (texto: unknown) => String(texto ?? '')
  .normalize('NFD')
  .replace(/[̀-ͯ]/g, '')
  .toLowerCase()
  .trim();

const dadosDoItem = (item: any) => ({
  ...(item?._dadosOriginais && typeof item._dadosOriginais === 'object' ? item._dadosOriginais : {}),
  ...(item?.dados && typeof item.dados === 'object' ? item.dados : {}),
});

export function ehImplante(item: any): boolean {
  const dados = dadosDoItem(item);
  return dados.tipo === 'implante' || dados.categoria === 'implante' || item?.categoria === 'implante';
}

export const implanteInstalado = (item: any) => ehImplante(item) && Boolean(item?.dados?.equipado ?? item?.equipado);

/** Custo de tabela de uma peça, antes de raça e de âncora. */
export function custoSanidadeDoImplante(dadosOuItem: any): number {
  const dados = dadosOuItem?.dados || dadosOuItem?._dadosOriginais ? dadosDoItem(dadosOuItem) : (dadosOuItem || {});
  const declarado = Number(dados.custoSanidade);
  if (Number.isFinite(declarado) && declarado >= 0) return Math.round(declarado);
  const raridade = semAcento(dados.raridade_catalogo_original || dados.raridade) || 'raro';
  const base = CUSTO_SANIDADE_POR_RARIDADE[raridade] ?? CUSTO_SANIDADE_POR_RARIDADE.raro;
  return base + (dados.sistema === 'neural' ? CUSTO_SANIDADE_EXTRA_NEURAL : 0);
}

/** Modificações de implante que baixam o custo da própria peça (pelo id da Loja ou pelo nome). */
export const ALIVIO_POR_MODIFICACAO: Record<string, number> = {
  'mod-amortecedor-neural': 3,
  'amortecedor neural': 3,
};

const alivioDasModificacoes = (item: any): number => {
  const modificacoes = dadosDoItem(item).modificacoes;
  if (!Array.isArray(modificacoes)) return 0;
  return modificacoes.reduce((soma: number, modificacao: any) => soma + (
    ALIVIO_POR_MODIFICACAO[String(modificacao?.catalogo_item_id || '')]
    ?? ALIVIO_POR_MODIFICACAO[semAcento(modificacao?.nome)]
    ?? 0
  ), 0);
};

/** Custo da peça com as modificações dela (Amortecedor Neural), antes de raça e âncora. */
export function custoProprioDoImplante(item: any): number {
  const tabela = custoSanidadeDoImplante(item);
  const alivio = alivioDasModificacoes(item);
  return alivio > 0 ? Math.max(1, tabela - alivio) : tabela;
}

export interface ICustoDeImplante {
  itemId: string;
  nome: string;
  /** Custo da tabela. */
  tabela: number;
  /** O que a ficha cobra de fato, depois de raça e âncora. */
  cobrado: number;
}

export interface IResumoSanidadeDosImplantes {
  implantes: ICustoDeImplante[];
  total: number;
  /** Quanto cada outro implante deixa de cobrar por causa de uma âncora instalada. */
  alivio: number;
  corpoConstruido: boolean;
}

/** O que os implantes instalados cobram da Sanidade máxima desta ficha. */
export function resumirSanidadeDosImplantes(inventario: any[], ficha: any): IResumoSanidadeDosImplantes {
  const instalados = (Array.isArray(inventario) ? inventario : []).filter(implanteInstalado);
  const corpoConstruido = RACAS_DE_CORPO_CONSTRUIDO.includes(String(ficha?.racaId || ''));
  const alivioDe = (item: any) => Math.max(0, Number(dadosDoItem(item).aliviaSanidade) || 0);
  const implantes = instalados.map((item) => {
    const tabela = custoSanidadeDoImplante(item);
    const proprio = custoProprioDoImplante(item);
    // A âncora alivia as outras peças, nunca a si mesma; duas âncoras não somam.
    const alivio = instalados.filter((outro) => outro !== item).reduce((maior, outro) => Math.max(maior, alivioDe(outro)), 0);
    const aliviado = alivio > 0 ? Math.max(1, proprio - alivio) : proprio;
    const cobrado = corpoConstruido ? Math.ceil(aliviado / 2) : aliviado;
    return {
      itemId: String(item?.item_id || item?.id || ''),
      nome: String(item?.titulo || item?.nome || 'Implante'),
      tabela,
      cobrado,
    };
  });
  return {
    implantes,
    total: implantes.reduce((soma, item) => soma + item.cobrado, 0),
    alivio: instalados.reduce((maior, item) => Math.max(maior, alivioDe(item)), 0),
    corpoConstruido,
  };
}
