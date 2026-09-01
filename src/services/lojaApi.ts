import { api } from './apiClient';

export const MAX_SHOP_UNITS = 500;

export interface LojaCatalogEntry {
  id: string;
  tipo: string;
  titulo: string;
  conteudo: Record<string, unknown>;
  preco: {
    moeda: string;
    valor: number;
  };
  nivel_loja?: number;
}

export interface LojaCatalogDocument {
  id: string;
  tipo: string;
  titulo: string;
  conteudo: Record<string, unknown>;
  ativo: boolean;
}

export interface LojaCatalogEditorial {
  id: string;
  item_id: string;
  rascunho: LojaCatalogDocument;
  publicado: LojaCatalogDocument | null;
  versao: number;
  atualizado_em: string;
  publicado_em: string | null;
}

export interface LojaCatalogEditorEntry {
  item_id: string;
  origem: 'oficial' | 'campanha';
  base: LojaCatalogDocument | null;
  editorial: LojaCatalogEditorial | null;
}

export interface LojaCatalogDraftInput {
  campanha_id: string;
  item_id: string;
  tipo: string;
  titulo: string;
  conteudo: Record<string, unknown>;
  ativo: boolean;
  versao_esperada: number | null;
}

export interface LojaCatalogRevision {
  id: string;
  versao: number;
  dados: LojaCatalogDocument;
  criado_por: string | null;
  criado_em: string;
}

export interface LojaCommandItem {
  item_id: string;
  quantidade: number;
  alvo_item_id?: string;
  raridade?: 'comum' | 'incomum' | 'raro' | 'epico' | 'lendario';
  /** Só vale para Mercenários: 'contratar' cobra o preço reduzido e gera
   * mensalidade; ausente/'comprar' é o preço cheio (servo/escravo permanente). */
  modo?: 'comprar' | 'contratar';
}

export interface LojaCommandInput {
  campanha_id: string;
  personagem_id: string;
  economia_versao_esperada: number;
  idempotencia: string;
  localizacao_loja?: number;
  itens: LojaCommandItem[];
}

export interface LojaCommandBase {
  campanha_id: string;
  personagem_id: string;
  economia_versao_esperada: number;
  localizacao_loja?: number;
  itens: LojaCommandItem[];
}

export interface LojaBalanceDelta {
  moeda: string;
  valor: number;
  saldo: number;
}

export interface LojaCommandResult {
  operacao_id: string;
  repetida: boolean;
  economia_versao: number;
  itens: Array<{
    item_id: string;
    quantidade: number;
    titulo?: string;
  }>;
  debitos?: LojaBalanceDelta[];
  creditos?: LojaBalanceDelta[];
  /** Requisito de nível/classe que a compra ignorou - não bloqueia a compra,
   * mas o mestre já é notificado, então quem comprou também deveria ver. */
  infracoes?: Array<{ item_id: string; mensagem: string }>;
}

export interface CheckoutAttempt {
  signature: string;
  payload: LojaCommandInput;
}

export function hasVerifiableShopOrigin(item: { item_id: string; dados?: unknown }): boolean {
  if (!item.dados || typeof item.dados !== 'object' || Array.isArray(item.dados)) return false;
  const data = item.dados as Record<string, unknown>;
  const catalogItemId = typeof data.catalogo_item_id === 'string' ? data.catalogo_item_id.trim() : '';
  const inventoryItemId = typeof data.loja_item_id === 'string' ? data.loja_item_id.trim() : '';
  return data.origem === 'loja'
    && Boolean(catalogItemId)
    && (inventoryItemId ? inventoryItemId === item.item_id : catalogItemId === item.item_id);
}

type IdFactory = () => string;

function createRandomId(): string {
  if (typeof globalThis.crypto?.randomUUID === 'function') {
    return globalThis.crypto.randomUUID();
  }
  throw new Error('Este navegador não oferece geração segura de identificadores.');
}

export function createIdempotencyKey(scope: string): string {
  const normalizedScope = scope.trim().replace(/[^a-z0-9_-]+/gi, '-').toLowerCase();
  if (!normalizedScope) throw new TypeError('O escopo da idempotência é obrigatório.');
  return `${normalizedScope}:${createRandomId()}`;
}

function normalizeItems(items: readonly LojaCommandItem[]): LojaCommandItem[] {
  const quantities = new Map<string, { item_id: string; quantidade: number; alvo_item_id?: string; modo?: 'comprar' | 'contratar'; raridade?: LojaCommandItem['raridade'] }>();
  for (const item of items) {
    const itemId = item.item_id.trim();
    if (!itemId) throw new TypeError('O item da operação não possui identificador.');
    if (!Number.isSafeInteger(item.quantidade) || item.quantidade < 1 || item.quantidade > MAX_SHOP_UNITS) {
      throw new TypeError(`Quantidade inválida para o item ${itemId}.`);
    }
    // Contratar e comprar o mesmo item viram linhas distintas no lote, senão
    // uma agruparia silenciosamente na quantidade da outra.
    const key = [itemId, item.alvo_item_id, item.modo === 'contratar' ? 'contratar' : undefined, item.raridade]
      .filter(Boolean)
      .join('::');
    const current = quantities.get(key) ?? { item_id: itemId, quantidade: 0, alvo_item_id: item.alvo_item_id, modo: item.modo, raridade: item.raridade };
    quantities.set(key, { ...current, quantidade: current.quantidade + item.quantidade });
  }
  if (!quantities.size) throw new TypeError('A operação precisa conter ao menos um item.');
  const normalized = Array.from(quantities, ([_key, data]) => {
    return {
      item_id: data.item_id,
      quantidade: data.quantidade,
      alvo_item_id: data.alvo_item_id,
      ...(data.modo === 'contratar' ? { modo: data.modo } : {}),
      ...(data.raridade ? { raridade: data.raridade } : {}),
    };
  }).sort((left, right) => left.item_id.localeCompare(right.item_id));
  if (normalized.length > 50 || normalized.reduce((total, item) => total + item.quantidade, 0) > MAX_SHOP_UNITS) {
    throw new TypeError(`O lote não pode exceder ${MAX_SHOP_UNITS} unidades ou 50 itens diferentes.`);
  }
  return normalized;
}

/**
 * Reaproveita payload e idempotência enquanto a mesma tentativa é repetida.
 * Se personagem, versão ou itens mudarem, uma nova operação é criada.
 */
export function prepareCheckoutAttempt(
  previous: CheckoutAttempt | null,
  operation: 'compra' | 'venda',
  command: LojaCommandBase,
  createId: IdFactory = createRandomId,
): CheckoutAttempt {
  if (!Number.isSafeInteger(command.economia_versao_esperada) || command.economia_versao_esperada < 1) {
    throw new TypeError('A versão econômica do personagem é inválida.');
  }
  const normalized: LojaCommandBase = {
    campanha_id: command.campanha_id.trim(),
    personagem_id: command.personagem_id.trim(),
    economia_versao_esperada: command.economia_versao_esperada,
    ...(command.localizacao_loja === undefined ? {} : { localizacao_loja: command.localizacao_loja }),
    itens: normalizeItems(command.itens),
  };
  if (!normalized.campanha_id || !normalized.personagem_id) {
    throw new TypeError('Campanha e personagem são obrigatórios.');
  }
  if (normalized.localizacao_loja !== undefined && ![1, 2, 3, 4].includes(normalized.localizacao_loja)) {
    throw new TypeError('A localização da loja é inválida.');
  }
  const signature = `${operation}:${JSON.stringify(normalized)}`;
  if (previous?.signature === signature) return previous;
  return {
    signature,
    payload: {
      ...normalized,
      idempotencia: `loja-${operation}:${createId()}`,
    },
  };
}

export interface LojaGrantCommandItem {
  item_id: string;
  quantidade: number;
}

export interface LojaGrantCommandInput {
  campanha_id: string;
  personagem_id: string;
  idempotencia: string;
  itens: LojaGrantCommandItem[];
}

export interface LojaGrantResult {
  operacao_id: string;
  repetida: boolean;
  economia_versao: number;
  itens: Array<{
    item_id: string;
    titulo: string;
    quantidade: number;
    valor_referencia: { moeda: string; valor: number } | null;
  }>;
}

/**
 * Monta o payload de uma concessão do Mestre. Ao contrário da compra, não
 * carrega `economia_versao_esperada`: quem concede não está competindo com
 * outra escrita concorrente do próprio jogador em cima da carteira, então
 * não há corrida para detectar.
 */
export function prepareGrantAttempt(
  campanhaId: string,
  personagemId: string,
  itens: readonly LojaGrantCommandItem[],
  createId: IdFactory = createRandomId,
): LojaGrantCommandInput {
  const normalizedCampanha = campanhaId.trim();
  const normalizedPersonagem = personagemId.trim();
  if (!normalizedCampanha || !normalizedPersonagem) {
    throw new TypeError('Campanha e personagem são obrigatórios.');
  }
  const normalizedItens = normalizeItems(itens).map(({ item_id, quantidade }) => ({ item_id, quantidade }));
  return {
    campanha_id: normalizedCampanha,
    personagem_id: normalizedPersonagem,
    idempotencia: `loja-concessao:${createId()}`,
    itens: normalizedItens,
  };
}

export const lojaApi = {
  listarCatalogo(campanhaId: string, signal?: AbortSignal) {
    return api<{ itens: LojaCatalogEntry[] }>(
      `/loja/catalogo?campanha_id=${encodeURIComponent(campanhaId)}`,
      { signal },
    );
  },

  comprar(payload: LojaCommandInput) {
    return api<LojaCommandResult>('/loja/compras', { method: 'POST', body: payload });
  },

  vender(payload: LojaCommandInput) {
    return api<LojaCommandResult>('/loja/vendas', { method: 'POST', body: payload });
  },

  conceder(payload: LojaGrantCommandInput) {
    return api<LojaGrantResult>('/loja/concessoes', { method: 'POST', body: payload });
  },

  listarCatalogoEditor(campanhaId: string) {
    return api<{ itens: LojaCatalogEditorEntry[] }>(
      `/loja/editor/catalogo?campanha_id=${encodeURIComponent(campanhaId)}`,
    );
  },

  salvarRascunhoCatalogo(payload: LojaCatalogDraftInput) {
    return api<{ editorial: LojaCatalogEditorial }>('/loja/editor/rascunho', {
      method: 'PUT',
      body: payload,
    });
  },

  publicarItemCatalogo(editorialId: string, campanhaId: string, versaoEsperada: number) {
    return api<{ editorial: LojaCatalogEditorial }>(
      `/loja/editor/${encodeURIComponent(editorialId)}/publicar`,
      { method: 'POST', body: { campanha_id: campanhaId, versao_esperada: versaoEsperada } },
    );
  },

  listarRevisoesCatalogo(editorialId: string, campanhaId: string) {
    return api<{ revisoes: LojaCatalogRevision[] }>(
      `/loja/editor/${encodeURIComponent(editorialId)}/revisoes?campanha_id=${encodeURIComponent(campanhaId)}`,
    );
  },

  restaurarRevisaoCatalogo(editorialId: string, revisaoId: string, campanhaId: string, versaoEsperada: number) {
    return api<{ editorial: LojaCatalogEditorial }>(
      `/loja/editor/${encodeURIComponent(editorialId)}/revisoes/${encodeURIComponent(revisaoId)}/restaurar`,
      { method: 'POST', body: { campanha_id: campanhaId, versao_esperada: versaoEsperada } },
    );
  },
};
