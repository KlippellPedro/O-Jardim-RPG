export interface ModuloSlot {
  id: string;
  nome: string;
  espacos: number;
  ativo: boolean;
}

export interface SugestaoModulo {
  nome: string;
  espacos: number;
  /** Peça real do inventário. Sem id, é só um atalho do catálogo. */
  id?: string;
}

// Atalhos para os módulos de utilidade publicados no catálogo.
export const MODULOS_UTILIDADE_SUGERIDOS: SugestaoModulo[] = [
  { nome: 'Beliche (dormitório)', espacos: 1 },
  { nome: 'Geladeira', espacos: 1 },
  { nome: 'Filtro de água', espacos: 1 },
  { nome: 'Enfermaria', espacos: 1 },
  { nome: 'Armazém extra', espacos: 1 },
  { nome: 'Blindagem extra', espacos: 2 },
];

export interface ResumoSlots {
  usados: number;
  livres: number;
  maximos: number;
  ativos: number;
  estourou: boolean;
}

export const resumirSlots = (modulos: ModuloSlot[], espacosMaximos: number): ResumoSlots => {
  const maximos = Math.max(0, Math.trunc(Number(espacosMaximos) || 0));
  const usados = modulos.reduce((total, m) => total + Math.max(0, Number(m.espacos) || 0), 0);
  return {
    usados,
    livres: Math.max(0, maximos - usados),
    maximos,
    ativos: modulos.filter((m) => m.ativo).length,
    estourou: usados > maximos,
  };
};

/** Sugestões que ainda cabem nas vagas livres. Atalho do catálogo não repete nome
 * já instalado; peça real do inventário sempre pode entrar, mesmo com nome igual. */
export const sugestoesQueCabem = (
  modulos: ModuloSlot[],
  livres: number,
  sugestoes: SugestaoModulo[] = MODULOS_UTILIDADE_SUGERIDOS,
): SugestaoModulo[] => {
  const instalados = new Set(modulos.map((m) => m.nome.trim().toLowerCase()));
  return sugestoes.filter((s) => s.espacos <= livres && (s.id !== undefined || !instalados.has(s.nome.toLowerCase())));
};

/** O sistema ativo é o limite de módulos ligados ao mesmo tempo. */
export const podeLigarMais = (ativos: number, sistemasAtivosMaximos: number) => ativos < Math.max(0, sistemasAtivosMaximos);

export interface ItemGaragem {
  id: string;
  nome: string;
  categoria: string;
  instaladoEm?: string;
  vagasModulo?: number;
  ligado?: boolean;
}

export interface VeiculoNaGaragem<T extends ItemGaragem> {
  veiculo: T;
  modulos: Array<ModuloSlot & { item: T }>;
}

export const vagasDaPeca = (peca: ItemGaragem) => Math.max(1, Math.trunc(Number(peca.vagasModulo) || 1));

/** Junta cada peça ao veículo em que está instalada. Peça apontando para um
 * veículo que não existe mais (foi vendido ou apagado) volta a ser peça guardada,
 * então nunca fica presa num limbo. */
export const montarGaragem = <T extends ItemGaragem>(itens: T[]): { veiculos: VeiculoNaGaragem<T>[]; guardadas: T[] } => {
  const veiculos = itens.filter((i) => i.categoria === 'veiculo');
  const ids = new Set(veiculos.map((v) => v.id));
  const pecas = itens.filter((i) => i.categoria === 'modulo-veicular');
  const guardadas = pecas.filter((p) => !p.instaladoEm || !ids.has(p.instaladoEm));
  return {
    veiculos: veiculos.map((veiculo) => ({
      veiculo,
      modulos: pecas
        .filter((p) => p.instaladoEm === veiculo.id)
        .map((item) => ({ id: item.id, nome: item.nome, espacos: vagasDaPeca(item), ativo: item.ligado !== false, item })),
    })),
    guardadas,
  };
};
