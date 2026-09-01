import { nivelTotalFicha } from './progressaoFichaService';

export type GrupoLimiteItemEspecial = 'item-pericia' | 'artefato';

type ItemInventarioLike = {
  id?: string;
  item_id?: string;
  quantidade?: number;
  categoria?: string;
  equipado?: boolean;
  efeitosRaridade?: unknown;
  modificacoes?: unknown;
  dados?: Record<string, unknown>;
  _dadosOriginais?: Record<string, unknown>;
};

export interface ResumoLimiteItensEspeciais {
  nivelTotal: number;
  limite: number;
  usados: number;
  disponiveis: number;
  equipados: ItemInventarioLike[];
  excedentes: ItemInventarioLike[];
  porGrupo: Record<GrupoLimiteItemEspecial, number>;
}

const normalizar = (valor: unknown): string => String(valor ?? '')
  .normalize('NFD')
  .replace(/[\u0300-\u036f]/g, '')
  .trim()
  .toLocaleLowerCase('pt-BR');

const efeitosDoItem = (item: ItemInventarioLike): unknown[] => {
  const dados = item.dados && typeof item.dados === 'object' ? item.dados : {};
  const efeitosRaridade = item.efeitosRaridade ?? dados.efeitosRaridade;
  const modificacoes = item.modificacoes ?? dados.modificacoes;
  return [
    ...(Array.isArray(efeitosRaridade) ? efeitosRaridade : []),
    ...(Array.isArray(modificacoes)
      ? modificacoes.flatMap((modificacao: any) => Array.isArray(modificacao?.efeitos) ? modificacao.efeitos : [])
      : []),
  ];
};

/**
 * Itens de perícia e artefatos dividem o mesmo orçamento de uso. A regra olha
 * apenas para itens equipados: possuir ou comprar uma peça não consome vaga.
 */
export function grupoLimiteItemEspecial(item: ItemInventarioLike | null | undefined): GrupoLimiteItemEspecial | null {
  if (!item) return null;
  const dados = item.dados && typeof item.dados === 'object' ? item.dados : {};
  const originais = item._dadosOriginais && typeof item._dadosOriginais === 'object' ? item._dadosOriginais : {};
  const grupoDeclarado = normalizar(dados.grupo_limite_uso ?? originais.grupo_limite_uso);
  if (grupoDeclarado === 'item-pericia') return 'item-pericia';
  if (grupoDeclarado === 'artefato') return 'artefato';

  const tipo = normalizar(dados.tipo ?? originais.tipo);
  if (tipo === 'artefato') return 'artefato';

  const id = normalizar(dados.catalogo_item_id ?? originais.catalogo_item_id ?? item.item_id ?? item.id);
  if (id === 'acessorio' || id.startsWith('acessorio-')) return 'item-pericia';

  const categoria = normalizar(item.categoria ?? dados.categoria ?? originais.categoria);
  const possuiEfeitoPericia = efeitosDoItem(item).some((efeito: any) => normalizar(efeito?.categoria) === 'pericia');
  return categoria === 'geral' && possuiEfeitoPericia ? 'item-pericia' : null;
}

/** 1 vaga inicial; depois, uma vaga a cada quatro níveis totais. */
export function limiteItensEspeciaisPorNivel(nivelTotal: unknown): number {
  const nivel = Math.max(1, Math.trunc(Number(nivelTotal) || 1));
  return Math.max(1, Math.floor(nivel / 4));
}

export function itemEspecialEstaEquipado(item: ItemInventarioLike): boolean {
  const dados = item.dados && typeof item.dados === 'object' ? item.dados : {};
  return (item.equipado ?? dados.equipado) === true && Math.max(0, Number(item.quantidade) || 1) > 0;
}

export function resumirLimiteItensEspeciais(
  inventario: readonly ItemInventarioLike[] | null | undefined,
  ficha: unknown,
): ResumoLimiteItensEspeciais {
  const nivelTotal = Math.max(1, nivelTotalFicha(ficha));
  const limite = limiteItensEspeciaisPorNivel(nivelTotal);
  const equipados = (Array.isArray(inventario) ? inventario : []).filter((item) => (
    itemEspecialEstaEquipado(item) && grupoLimiteItemEspecial(item) !== null
  ));
  const ativos = equipados.slice(0, limite);
  const porGrupo: Record<GrupoLimiteItemEspecial, number> = { 'item-pericia': 0, artefato: 0 };
  ativos.forEach((item) => {
    const grupo = grupoLimiteItemEspecial(item);
    if (grupo) porGrupo[grupo] += 1;
  });
  return {
    nivelTotal,
    limite,
    usados: equipados.length,
    disponiveis: Math.max(0, limite - equipados.length),
    equipados,
    excedentes: equipados.slice(limite),
    porGrupo,
  };
}

export function itemLojaContaComoEspecial(item: { id?: string; tipoOrigem?: string; dadosBrutos?: Record<string, unknown> }): GrupoLimiteItemEspecial | null {
  return grupoLimiteItemEspecial({
    item_id: item.id,
    dados: { ...(item.dadosBrutos || {}), tipo: item.tipoOrigem, catalogo_item_id: item.id },
  });
}
