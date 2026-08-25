import catalogoData from '../../data/loja/catalogo.json';
import type { RaridadeCraftingId } from '../../data/regras/crafting';
import {
  MAX_UNIDADES_PADRAO_POR_LINHA,
  QUALIDADE_PADRAO,
  linhaRequisitoSatisfeita,
  type LinhaRequisito,
  type MaterialFicha,
  type ReceitaMaterial,
} from '../../data/regras/materiais';
import {
  FORMULAS_MATERIAIS_ALQUIMISTA,
  PROJETOS_MATERIAIS_ENGENHEIRO,
  RECEITAS_MATERIAIS_COZINHEIRO,
} from '../../data/regras/receitas-materiais';
import { RITUAIS } from '../../data/regras/rituais';
import { RECURSO_MATERIAL_POR_ID } from '../../data/regras/recursos-materiais';

interface EntradaMaterialCatalogo {
  tipo: string;
  id: string;
  titulo: string;
  conteudo: MaterialFicha & {
    preco?: Record<string, number>;
    nivelMinimoLoja?: number;
    especie?: string;
  };
}

export interface MaterialCatalogItem extends MaterialFicha {
  id: string;
  titulo: string;
  preco?: Record<string, number>;
  nivelMinimoLoja?: number;
  especie?: string;
}

export interface ReceitaCatalogItem extends ReceitaMaterial {
  chave: string;
  classeRotulo: string;
}

export interface CompatibilidadeMaterial {
  material: MaterialCatalogItem;
  unidades: number;
}

const CLASSES: Record<ReceitaMaterial['classe'], string> = {
  ritualista: 'Ritual',
  alquimista: 'Alquimia',
  engenheiro: 'Engenharia',
  cozinheiro: 'Cozinha',
  geral: 'Geral',
};

export const ROTULOS_RARIDADE: Record<RaridadeCraftingId, string> = {
  comum: 'Comum',
  incomum: 'Incomum',
  raro: 'Raro',
  epico: 'Épico',
  lendario: 'Lendário',
  reliquia: 'Relíquia',
  'reliquia da criacao': 'Relíquia da Criação',
};

export function normalizarBusca(valor: string): string {
  return valor.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase('pt-BR').trim();
}

export const MATERIAIS_CATALOGO: MaterialCatalogItem[] = (
  catalogoData.entradas as unknown as EntradaMaterialCatalogo[]
)
  .filter((entrada) => entrada.tipo === 'drop')
  .map(({ id, titulo, conteudo }) => ({ id, titulo, ...conteudo }))
  .sort((a, b) => a.titulo.localeCompare(b.titulo, 'pt-BR'));

export const RECEITAS_CATALOGO: ReceitaCatalogItem[] = [
  ...RITUAIS,
  ...FORMULAS_MATERIAIS_ALQUIMISTA,
  ...PROJETOS_MATERIAIS_ENGENHEIRO,
  ...RECEITAS_MATERIAIS_COZINHEIRO,
]
  .map((receita) => ({
    ...receita,
    chave: `${receita.classe}:${receita.id}`,
    classeRotulo: CLASSES[receita.classe],
  }))
  .sort((a, b) => a.titulo.localeCompare(b.titulo, 'pt-BR'));

const MATERIAIS_POR_ID = new Map(MATERIAIS_CATALOGO.map((material) => [material.id, material]));

export function materialPorId(id: string): MaterialCatalogItem | undefined {
  return MATERIAIS_POR_ID.get(id);
}

export function quantidadeNecessaria(
  linha: LinhaRequisito,
  material: MaterialCatalogItem,
): number | null {
  const teto = linha.maxUnidades ?? MAX_UNIDADES_PADRAO_POR_LINHA;
  for (let quantidade = linha.quantidade; quantidade <= teto; quantidade += 1) {
    const unidades = Array.from({ length: quantidade }, () => ({
      materialId: material.id,
      material,
      qualidade: QUALIDADE_PADRAO,
    }));
    if (linhaRequisitoSatisfeita(linha, unidades)) return quantidade;
  }
  return null;
}

export function materiaisCompativeis(linha: LinhaRequisito): CompatibilidadeMaterial[] {
  return MATERIAIS_CATALOGO.flatMap((material) => {
    const unidades = quantidadeNecessaria(linha, material);
    return unidades === null ? [] : [{ material, unidades }];
  });
}

export function descreverLinha(linha: LinhaRequisito): string {
  if (linha.materialId) {
    const nomes = [linha.materialId, ...(linha.materiaisAlternativos ?? [])]
      .map((id) => materialPorId(id)?.titulo ?? id)
      .join(' ou ');
    return `${linha.quantidade}× ${nomes}`;
  }

  const partes: string[] = [];
  if (linha.categoria) partes.push(`categoria ${linha.categoria}`);
  if (linha.propriedade) partes.push(`propriedade ${linha.propriedade.nome} · potência total ${linha.propriedade.valorMinimo}+`);
  if (linha.afinidade) partes.push(`afinidade ${linha.afinidade}`);
  if (linha.estadoMinimo) partes.push(`estado mínimo ${linha.estadoMinimo}`);
  if (linha.raridadeMinima) partes.push(`raridade mínima ${ROTULOS_RARIDADE[linha.raridadeMinima]}`);
  const unidade = linha.quantidade === 1 ? 'unidade' : 'unidades';
  return `Mínimo ${linha.quantidade} ${unidade} · ${partes.join(' · ') || 'material adequado'}`;
}

export function receitasParaMaterial(material: MaterialCatalogItem): Array<{
  receita: ReceitaCatalogItem;
  linhas: Array<{ linha: LinhaRequisito; unidades: number }>;
}> {
  return RECEITAS_CATALOGO.flatMap((receita) => {
    const linhas = receita.linhas.flatMap((linha) => {
      const unidades = quantidadeNecessaria(linha, material);
      return unidades === null ? [] : [{ linha, unidades }];
    });
    return linhas.length ? [{ receita, linhas }] : [];
  });
}

export function materialCorrespondeBusca(material: MaterialCatalogItem, busca: string): boolean {
  const alvo = normalizarBusca([
    material.titulo,
    material.descricao,
    material.categoria,
    material.origem,
    material.afinidade,
    material.estadoBase,
    material.parte,
    material.especie,
    ...material.propriedades,
    ...material.usos,
  ].filter(Boolean).join(' '));
  return normalizarBusca(busca).split(/\s+/).filter(Boolean).every((termo) => alvo.includes(termo));
}

export function receitaCorrespondeBusca(receita: ReceitaCatalogItem, busca: string): boolean {
  const requisitos = receita.linhas.map(descreverLinha).join(' ');
  const recurso = receita.custoRecurso ? RECURSO_MATERIAL_POR_ID.get(receita.custoRecurso.recurso)?.titulo : '';
  const alvo = normalizarBusca(`${receita.titulo} ${receita.classeRotulo} ${receita.efeito} ${requisitos} ${recurso}`);
  return normalizarBusca(busca).split(/\s+/).filter(Boolean).every((termo) => alvo.includes(termo));
}
