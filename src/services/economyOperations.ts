import type {
  CarteiraPersonagemItem,
  InventarioPersonagemItem,
} from './personagensApi';

export interface EconomyStateSnapshot {
  carteira: CarteiraPersonagemItem[];
  inventario: InventarioPersonagemItem[];
}

export type EconomyOperation =
  | {
      tipo: 'ajustar_saldo';
      moeda: string;
      delta: number;
      motivo: string;
    }
  | {
      tipo: 'criar_manual';
      item_id: string;
      titulo: string;
      quantidade: number;
      dados: Record<string, unknown>;
    }
  | {
      tipo: 'editar_item';
      item_id: string;
      titulo: string;
      dados: Record<string, unknown>;
    }
  | {
      tipo: 'ajustar_quantidade';
      item_id: string;
      delta: number;
    }
  | {
      tipo: 'descartar_item';
      item_id: string;
    }
  | {
      tipo: 'reordenar';
      item_ids: string[];
    };

const MANUAL_ITEM_PATTERN = /^manual:[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function normalizedCurrency(value: string): string {
  return value.trim().replace(/\s+/g, ' ').toLocaleLowerCase('pt-BR');
}

function canonicalJson(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(canonicalJson);
  if (typeof value !== 'object' || value === null) return value;
  return Object.keys(value as Record<string, unknown>)
    .sort()
    .reduce<Record<string, unknown>>((result, key) => {
      result[key] = canonicalJson((value as Record<string, unknown>)[key]);
      return result;
    }, {});
}

function jsonEquals(left: unknown, right: unknown): boolean {
  return JSON.stringify(canonicalJson(left)) === JSON.stringify(canonicalJson(right));
}

function walletMap(items: readonly CarteiraPersonagemItem[]): Map<string, CarteiraPersonagemItem> {
  const result = new Map<string, CarteiraPersonagemItem>();
  for (const item of items) {
    const moeda = item.moeda.trim().replace(/\s+/g, ' ');
    if (!moeda || !Number.isSafeInteger(item.saldo)) {
      throw new TypeError('A carteira contém moeda ou saldo inválido.');
    }
    const key = normalizedCurrency(moeda);
    if (result.has(key)) throw new TypeError(`A carteira contém a moeda duplicada ${moeda}.`);
    result.set(key, { ...item, moeda });
  }
  return result;
}

function inventoryMap(items: readonly InventarioPersonagemItem[]): Map<string, InventarioPersonagemItem> {
  const result = new Map<string, InventarioPersonagemItem>();
  for (const item of items) {
    const itemId = item.item_id.trim();
    const title = item.titulo.trim();
    if (!itemId || !title || !Number.isSafeInteger(item.quantidade) || item.quantidade < 1) {
      throw new TypeError('O inventário contém um item inválido.');
    }
    if (!item.dados || typeof item.dados !== 'object' || Array.isArray(item.dados)) {
      throw new TypeError(`Os dados do item ${itemId} são inválidos.`);
    }
    if (result.has(itemId)) throw new TypeError(`O inventário contém o item duplicado ${itemId}.`);
    result.set(itemId, {
      ...item,
      item_id: itemId,
      titulo: title,
      dados: item.dados,
    });
  }
  return result;
}

function withoutOrder(data: Record<string, unknown>): Record<string, unknown> {
  const result = { ...data };
  delete result.ordem;
  return result;
}

function orderedItemIds(items: readonly InventarioPersonagemItem[]): string[] {
  return items
    .map((item, index) => ({
      id: item.item_id,
      order: typeof item.dados?.ordem === 'number' && Number.isFinite(item.dados.ordem)
        ? item.dados.ordem
        : index,
      index,
    }))
    .sort((left, right) => left.order - right.order || left.index - right.index)
    .map((item) => item.id);
}

export function createManualItemId(): string {
  if (typeof globalThis.crypto?.randomUUID !== 'function') {
    throw new Error('Este navegador não oferece geração segura de identificadores.');
  }
  return `manual:${globalThis.crypto.randomUUID()}`;
}

/**
 * Converte dois snapshots locais em intenções mínimas. O servidor continua
 * responsável por autorização, proveniência, limites e versão econômica.
 */
export function buildEconomyOperations(
  base: EconomyStateSnapshot,
  desired: EconomyStateSnapshot,
): EconomyOperation[] {
  const operations: EconomyOperation[] = [];
  const baseWallet = walletMap(base.carteira);
  const desiredWallet = walletMap(desired.carteira);
  const walletKeys = new Set([...baseWallet.keys(), ...desiredWallet.keys()]);

  for (const key of [...walletKeys].sort()) {
    const before = baseWallet.get(key);
    const after = desiredWallet.get(key);
    const delta = (after?.saldo ?? 0) - (before?.saldo ?? 0);
    if (!delta) continue;
    operations.push({
      tipo: 'ajustar_saldo',
      moeda: after?.moeda ?? before!.moeda,
      delta,
      motivo: 'Ajuste manual autorizado na ficha',
    });
  }

  const baseInventory = inventoryMap(base.inventario);
  const desiredInventory = inventoryMap(desired.inventario);

  for (const [itemId] of baseInventory) {
    if (!desiredInventory.has(itemId)) {
      operations.push({ tipo: 'descartar_item', item_id: itemId });
    }
  }

  for (const [itemId, after] of desiredInventory) {
    const before = baseInventory.get(itemId);
    if (!before) {
      if (!MANUAL_ITEM_PATTERN.test(itemId)) {
        throw new TypeError('Itens criados na ficha precisam de um identificador manual válido.');
      }
      operations.push({
        tipo: 'criar_manual',
        item_id: itemId,
        titulo: after.titulo,
        quantidade: after.quantidade,
        dados: after.dados,
      });
      continue;
    }

    if (
      before.titulo !== after.titulo
      || !jsonEquals(withoutOrder(before.dados), withoutOrder(after.dados))
    ) {
      operations.push({
        tipo: 'editar_item',
        item_id: itemId,
        titulo: after.titulo,
        dados: after.dados,
      });
    }
    const quantityDelta = after.quantidade - before.quantidade;
    if (quantityDelta) {
      operations.push({
        tipo: 'ajustar_quantidade',
        item_id: itemId,
        delta: quantityDelta,
      });
    }
  }

  const baseOrder = orderedItemIds(base.inventario).filter((itemId) => desiredInventory.has(itemId));
  const desiredOrder = orderedItemIds(desired.inventario);
  if (!jsonEquals(baseOrder, desiredOrder) && desiredOrder.length) {
    operations.push({ tipo: 'reordenar', item_ids: desiredOrder });
  }

  return operations;
}
