export const WORLD_MODEL_CACHE_KEY = 'jardim_world_models_loaded_v1';

export interface ModelCacheStorage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

export function readLoadedWorldModels(
  storage: ModelCacheStorage | null,
  validModelIds: ReadonlySet<string>,
): Set<string> {
  if (!storage) return new Set();
  try {
    const parsed = JSON.parse(storage.getItem(WORLD_MODEL_CACHE_KEY) ?? '[]');
    if (!Array.isArray(parsed)) return new Set();
    return new Set(parsed.filter((id): id is string => (
      typeof id === 'string' && validModelIds.has(id)
    )));
  } catch {
    return new Set();
  }
}

export function rememberLoadedWorldModel(
  storage: ModelCacheStorage | null,
  loadedModelIds: Set<string>,
  modelId: string,
  validModelIds: ReadonlySet<string>,
): boolean {
  if (!validModelIds.has(modelId) || loadedModelIds.has(modelId)) return false;
  loadedModelIds.add(modelId);
  try {
    storage?.setItem(WORLD_MODEL_CACHE_KEY, JSON.stringify([...loadedModelIds].sort()));
  } catch {
    // O cache em memória ainda evita placeholders ao voltar para a rota nesta sessão.
  }
  return true;
}
