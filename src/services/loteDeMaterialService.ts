import {
  RECURSO_POR_USO,
  normalizarRaridadeRecurso,
  type RaridadeRecursoMaterial,
  type RecursoMaterialId,
} from '../../data/regras/recursos-materiais';
import type { RaridadeCraftingId } from '../../data/regras/crafting';
import type { UsoMaterial } from '../../data/regras/materiais';
import { estoqueDoRecurso, type EstoquesMateriais } from './preparoDescansoService';

/** Para quais estoques um material pode virar lote, sem repetir e na ordem do catálogo. */
export function destinosDoMaterial(usos: UsoMaterial[]): RecursoMaterialId[] {
  return [...new Set(usos.map((uso) => RECURSO_POR_USO[uso]).filter(Boolean))];
}

/** A raridade do lote é a do próprio material (Relíquia entra como Lendário). */
export function raridadeDoLote(raridade: RaridadeCraftingId): RaridadeRecursoMaterial {
  return normalizarRaridadeRecurso(raridade);
}

export interface IConversao {
  estoques: EstoquesMateriais;
  /** Quanto sobra do item no Inventário depois (0 = some da mochila). */
  sobra: number;
}

/** 1 unidade do material vira 1 lote da mesma raridade no estoque escolhido.
 * Nunca converte mais unidades do que a pessoa tem e nunca altera o estoque original. */
export function converterMaterialEmLote(
  estoques: EstoquesMateriais | undefined,
  quantidadeNoInventario: number,
  destino: RecursoMaterialId,
  raridade: RaridadeRecursoMaterial,
  quantidade: number,
): IConversao | null {
  const disponivel = Math.max(0, Math.trunc(Number(quantidadeNoInventario) || 0));
  const converter = Math.trunc(Number(quantidade) || 0);
  if (converter < 1 || converter > disponivel) return null;
  const estoque = estoqueDoRecurso(estoques, destino);
  const atual = Math.max(0, Number(estoque[raridade]) || 0);
  return {
    estoques: {
      ...(estoques ?? {}),
      [destino]: { ...estoque, [raridade]: Math.min(999, atual + converter) },
    },
    sobra: disponivel - converter,
  };
}
