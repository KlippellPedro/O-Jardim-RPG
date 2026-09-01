import { create } from 'zustand';
import { ApiError } from '../services/apiClient';
import {
  AutosaveQueue,
  type AutosaveQueueState,
  type UpdatePathSegment,
  updateAtPath,
} from '../services/autosaveQueue';
import {
  personagensApi,
  type CarteiraPersonagemItem,
  type InventarioPersonagemItem,
  type PersonagemApiRecord,
} from '../services/personagensApi';
import {
  buildEconomyOperations,
  type EconomyStateSnapshot,
} from '../services/economyOperations';
import { useAuthStore } from './useAuthStore';
import type { ICharacter } from '../types/character';
import type { ICreateCharacterPayload, IUpdateCharacterPayload } from '../types/personagem';
import { ATRIBUTOS, calcularDerivadosComClasses } from '../services/calculoService';
import { CLASSES_CATALOGO, RACAS_CATALOGO } from '../services/catalogoService';
import { ajusteOrigem, chaveAjuste, totalAjustesManuais } from '../services/ajustesFichaService';
import { limparSelecoesHabilidadeInvalidas } from '../services/progressaoFichaService';

export type CharacterSaveDomain = 'sheet' | 'economy';
export type CharacterSavePhase = 'idle' | 'pending' | 'saving' | 'saved' | 'error' | 'conflict';
export type RemoteCharacterSyncResult = 'updated' | 'unchanged' | 'deferred' | 'retry' | 'error';

export interface CharacterDomainSaveState {
  phase: CharacterSavePhase;
  message?: string;
  savedAt?: number;
}

export interface CharacterPersistenceState {
  sheet: CharacterDomainSaveState;
  economy: CharacterDomainSaveState;
}

export interface CharacterEconomy {
  carteira: CarteiraPersonagemItem[];
  inventario: InventarioPersonagemItem[];
}

type EconomyUpdater = (current: CharacterEconomy) => CharacterEconomy;

interface CharacterStore {
  characters: ICharacter[];
  isLoading: boolean;
  error: string | null;
  persistence: Record<string, CharacterPersistenceState>;
  fetchCharacters: () => Promise<void>;
  loadCharacter: (id: string) => Promise<boolean>;
  refreshCharacter: (id: string) => Promise<boolean>;
  syncRemoteCharacter: (id: string, expectedVersion?: number) => Promise<RemoteCharacterSyncResult>;
  archiveCharacter: (id: string) => Promise<boolean>;
  createCharacter: (payload: ICreateCharacterPayload) => Promise<string | null>;
  patchCharacter: (id: string, path: readonly UpdatePathSegment[], value: unknown) => boolean;
  updateCharacter: (id: string, payload: IUpdateCharacterPayload) => Promise<boolean>;
  mutateEconomy: (id: string, updater: EconomyUpdater) => Promise<boolean>;
  flushCharacterSaves: (id: string) => Promise<boolean>;
  retryCharacterSave: (id: string, domain: CharacterSaveDomain) => Promise<boolean>;
  resolveCharacterConflict: (
    id: string,
    domain: CharacterSaveDomain,
    strategy: 'reload' | 'overwrite',
  ) => Promise<boolean>;
  hasPendingCharacterSaves: (id: string) => boolean;
}

interface SheetPatch {
  path: UpdatePathSegment[];
  value: unknown;
  revision: number;
}

interface SheetSnapshot {
  id: string;
  baseVersion: number;
  revision: number;
  nome: string;
  ficha: Record<string, any>;
}

interface EconomySnapshot extends CharacterEconomy {
  id: string;
  baseVersion: number;
  revision: number;
  serverBase: EconomyStateSnapshot;
}

interface EconomyRevision {
  current: number;
  saved: number;
}

interface StoredSheetDraft {
  version: 1;
  characterId: string;
  baseVersion: number;
  updatedAt: number;
  patches: SheetPatch[];
}

const AUTOSAVE_DELAY_MS = 900;
const AUTOSAVE_MAX_WAIT_MS = 5_000;
const SHEET_DRAFT_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1_000;
const SHEET_DRAFT_PREFIX = 'oj_rpg_sheet_draft_v1_';

const idleDomainState = (): CharacterDomainSaveState => ({ phase: 'idle' });
const emptyPersistenceState = (): CharacterPersistenceState => ({
  sheet: idleDomainState(),
  economy: idleDomainState(),
});

const sheetPatches = new Map<string, Map<string, SheetPatch>>();
const sheetBaseVersions = new Map<string, number>();
const sheetQueues = new Map<string, AutosaveQueue<SheetSnapshot>>();
const sheetConflicts = new Map<string, PersonagemApiRecord>();

const economyRevisions = new Map<string, EconomyRevision>();
const economyBaseVersions = new Map<string, number>();
const economyServerStates = new Map<string, EconomyStateSnapshot>();
const economyQueues = new Map<string, AutosaveQueue<EconomySnapshot>>();
const economyConflicts = new Map<string, PersonagemApiRecord>();

let nextSheetRevision = 0;
let fetchGeneration = 0;

class SaveConflictError extends Error {
  readonly domain: CharacterSaveDomain;

  constructor(domain: CharacterSaveDomain, message: string) {
    super(message);
    this.name = 'SaveConflictError';
    this.domain = domain;
  }
}

function isRecord(value: unknown): value is Record<string, any> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function positiveInteger(value: unknown): number {
  if (typeof value === 'number' && Number.isInteger(value) && value > 0) return value;
  throw new Error('Resposta inválida do servidor: versão ausente ou inválida.');
}

function jsonClone<T>(value: T): T {
  const serialized = JSON.stringify(value);
  if (serialized === undefined) {
    throw new TypeError('O valor editado precisa ser serializável em JSON.');
  }
  return JSON.parse(serialized) as T;
}

function canonicalJson(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(canonicalJson);
  if (!isRecord(value)) return value;
  return Object.keys(value)
    .sort()
    .reduce<Record<string, unknown>>((result, key) => {
      result[key] = canonicalJson(value[key]);
      return result;
    }, {});
}

function jsonEquals(left: unknown, right: unknown): boolean {
  try {
    return JSON.stringify(canonicalJson(left)) === JSON.stringify(canonicalJson(right));
  } catch {
    return false;
  }
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : 'Falha desconhecida ao salvar.';
}

function draftKey(characterId: string): string {
  return `${SHEET_DRAFT_PREFIX}${characterId}`;
}

function removeStoredDraft(characterId: string): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.removeItem(draftKey(characterId));
  } catch {
    // O autosave em memória continua funcional quando o storage está indisponível.
  }
}

function persistStoredDraft(characterId: string): void {
  if (typeof window === 'undefined') return;
  const patches = sheetPatches.get(characterId);
  const baseVersion = sheetBaseVersions.get(characterId);
  if (!patches?.size || !baseVersion) {
    removeStoredDraft(characterId);
    return;
  }

  const draft: StoredSheetDraft = {
    version: 1,
    characterId,
    baseVersion,
    updatedAt: Date.now(),
    patches: Array.from(patches.values()),
  };

  try {
    window.localStorage.setItem(draftKey(characterId), JSON.stringify(draft));
  } catch {
    // beforeunload ainda alerta; uma falha de quota não pode quebrar a edição local.
  }
}

function readStoredDraft(characterId: string): StoredSheetDraft | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(draftKey(characterId));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<StoredSheetDraft>;
    if (
      parsed.version !== 1
      || parsed.characterId !== characterId
      || !Number.isInteger(parsed.baseVersion)
      || (parsed.baseVersion ?? 0) < 1
      || typeof parsed.updatedAt !== 'number'
      || Date.now() - parsed.updatedAt > SHEET_DRAFT_MAX_AGE_MS
      || !Array.isArray(parsed.patches)
    ) {
      removeStoredDraft(characterId);
      return null;
    }

    const patches = parsed.patches.map((patch) => {
      if (
        !isRecord(patch)
        || !Array.isArray(patch.path)
        || !patch.path.length
        || !Number.isInteger(patch.revision)
        || patch.revision < 1
      ) {
        throw new TypeError('Rascunho inválido.');
      }
      const path = patch.path as UpdatePathSegment[];
      // Também valida índices e bloqueia caminhos que permitiriam prototype pollution.
      updateAtPath({}, path, patch.value);
      return {
        path,
        value: patch.value,
        revision: patch.revision,
      } satisfies SheetPatch;
    });

    return {
      version: 1,
      characterId,
      baseVersion: parsed.baseVersion as number,
      updatedAt: parsed.updatedAt,
      patches,
    };
  } catch {
    removeStoredDraft(characterId);
    return null;
  }
}

function sheetValues(record: PersonagemApiRecord): Pick<SheetSnapshot, 'nome' | 'ficha'> {
  return {
    nome: typeof record.nome === 'string' ? record.nome : '',
    ficha: isRecord(record.ficha) ? record.ficha : {},
  };
}

function recalcularDerivadosSalvos(fichaOriginal: Record<string, any>): Record<string, any> {
  // Fichas afetadas pela antiga liberação precoce são saneadas ao carregar e
  // antes de cada salvamento. Assim, o Estilo escolhido no nível 8 some do
  // documento e não passa a bloquear todas as edições após a correção no servidor.
  const fichaNormalizada = limparSelecoesHabilidadeInvalidas(fichaOriginal);
  const atributos = isRecord(fichaNormalizada.atributosFinais)
    ? fichaNormalizada.atributosFinais
    : null;
  if (!atributos) return fichaNormalizada;

  const classes = Array.isArray(fichaNormalizada.classes) && fichaNormalizada.classes.length
    ? fichaNormalizada.classes
    : fichaNormalizada.classeId
      ? [{ classeId: fichaNormalizada.classeId, nivel: Number(fichaNormalizada.nivel) || 1 }]
      : [];
  if (!classes.length) return fichaNormalizada;

  const nivelTotal = classes.reduce(
    (total, classe) => total + Math.max(0, Math.trunc(Number(classe?.nivel) || 0)),
    0,
  );
  const atributosParaCalculo = Object.fromEntries(ATRIBUTOS.map((atributo) => [
    atributo,
    Number(atributos[atributo] ?? 10)
      + ajusteOrigem(fichaNormalizada, 'atributo', atributo)
      + totalAjustesManuais(fichaNormalizada, chaveAjuste('atributo', atributo)),
  ]));
  const raca = RACAS_CATALOGO.find((item) => item.id === fichaNormalizada.racaId) || null;
  const derivados = calcularDerivadosComClasses(
    atributosParaCalculo,
    raca,
    classes,
    CLASSES_CATALOGO,
    Math.max(1, nivelTotal),
    fichaNormalizada.escolhaRacial,
  );

  if (!derivados.recursosDefinidos) return fichaNormalizada;
  return {
    ...fichaNormalizada,
    derivados: {
      ...(isRecord(fichaNormalizada.derivados) ? fichaNormalizada.derivados : {}),
      ...derivados,
    },
  };
}

function economyValues(record: PersonagemApiRecord): CharacterEconomy {
  return {
    carteira: Array.isArray(record.carteira) ? record.carteira : [],
    inventario: Array.isArray(record.inventario_central) ? record.inventario_central : [],
  };
}

function normalizeCharacter(record: PersonagemApiRecord): ICharacter {
  const ficha = recalcularDerivadosSalvos(isRecord(record.ficha) ? record.ficha : {});
  return {
    id: record.id,
    nome: record.nome,
    donoUsuarioId: typeof record.dono_usuario_id === 'string' ? record.dono_usuario_id : null,
    somenteLeitura: record.somente_leitura === true,
    versao: positiveInteger(record.versao),
    ficha,
    nivel: typeof ficha.nivel === 'number' ? ficha.nivel : 1,
    criadoEm: typeof record.criado_em === 'string'
      ? record.criado_em
      : typeof ficha.criadoEm === 'string'
        ? ficha.criadoEm
        : new Date().toISOString(),
    atualizadoEm: typeof record.atualizado_em === 'string'
      ? record.atualizado_em
      : typeof ficha.atualizadoEm === 'string'
        ? ficha.atualizadoEm
        : new Date().toISOString(),
    racaId: ficha.racaId,
    classeId: ficha.classes?.[0]?.classeId ?? ficha.classeId,
    arvoreId: ficha.arvoreId,
    classes: Array.isArray(ficha.classes) ? ficha.classes : [],
    foto: ficha.foto ?? null,
    derivados: ficha.derivados ?? { vida: 0, mana: 0, movimento: 0 },
    atributosFinais: ficha.atributosFinais,
    economiaVersao: positiveInteger(record.economia_versao),
    carteira: Array.isArray(record.carteira) ? record.carteira : [],
    inventarioCentral: Array.isArray(record.inventario_central) ? record.inventario_central : [],
    aliadosCompartilhados: Array.isArray(record.aliados_compartilhados)
      ? record.aliados_compartilhados
      : [],
  };
}

function withSheetDomain(
  character: ICharacter,
  nome: string,
  ficha: Record<string, any>,
  version: number,
  updatedAt?: string,
): ICharacter {
  const fichaAtualizada = recalcularDerivadosSalvos(ficha);
  return {
    ...character,
    nome,
    ficha: fichaAtualizada,
    versao: version,
    nivel: typeof fichaAtualizada.nivel === 'number' ? fichaAtualizada.nivel : 1,
    racaId: fichaAtualizada.racaId,
    classeId: fichaAtualizada.classes?.[0]?.classeId ?? fichaAtualizada.classeId,
    arvoreId: fichaAtualizada.arvoreId,
    classes: Array.isArray(fichaAtualizada.classes) ? fichaAtualizada.classes : [],
    foto: fichaAtualizada.foto ?? null,
    derivados: fichaAtualizada.derivados ?? { vida: 0, mana: 0, movimento: 0 },
    atributosFinais: fichaAtualizada.atributosFinais,
    atualizadoEm: updatedAt ?? character.atualizadoEm,
  };
}

function applySheetPatch(character: ICharacter, path: readonly UpdatePathSegment[], value: unknown): ICharacter {
  if (path.length !== 1 && path[0] !== 'ficha') {
    throw new TypeError('Somente nome e campos dentro de ficha podem usar o autosave da ficha.');
  }
  if (path.length === 1 && path[0] !== 'nome' && path[0] !== 'ficha') {
    throw new TypeError('Campo de topo inválido para o autosave da ficha.');
  }

  const updated = updateAtPath(character, path, value);
  const ficha = isRecord(updated.ficha) ? updated.ficha : {};
  const nome = typeof updated.nome === 'string' ? updated.nome : character.nome;
  return withSheetDomain(updated, nome, ficha, positiveInteger(character.versao));
}

function setDomainPersistence(
  characterId: string,
  domain: CharacterSaveDomain,
  next: CharacterDomainSaveState,
): void {
  useCharacterStore.setState((state) => {
    const current = state.persistence[characterId] ?? emptyPersistenceState();
    return {
      persistence: {
        ...state.persistence,
        [characterId]: {
          ...current,
          [domain]: next,
        },
      },
    };
  });
}

function observeQueueState(
  characterId: string,
  domain: CharacterSaveDomain,
  state: AutosaveQueueState,
): void {
  if (state.status === 'disposed') return;
  if (state.error !== null) {
    setDomainPersistence(characterId, domain, {
      phase: state.error instanceof SaveConflictError ? 'conflict' : 'error',
      message: errorMessage(state.error),
    });
    return;
  }
  if (state.saving) {
    setDomainPersistence(characterId, domain, { phase: 'saving' });
    return;
  }
  if (state.dirty) {
    setDomainPersistence(characterId, domain, { phase: 'pending' });
    return;
  }
  if (state.savedRevision > 0) {
    setDomainPersistence(characterId, domain, { phase: 'saved', savedAt: Date.now() });
    return;
  }
  setDomainPersistence(characterId, domain, idleDomainState());
}

function getCharacter(characterId: string): ICharacter {
  const character = useCharacterStore.getState().characters.find((item) => item.id === characterId);
  if (!character) throw new Error('Personagem não encontrado.');
  return character;
}

function updateCharacterInStore(characterId: string, updater: (character: ICharacter) => ICharacter): void {
  useCharacterStore.setState((state) => ({
    characters: state.characters.map((character) => (
      character.id === characterId ? updater(character) : character
    )),
  }));
}

function sheetMatchesSnapshot(record: PersonagemApiRecord, snapshot: SheetSnapshot): boolean {
  const remote = sheetValues(record);
  return remote.nome === snapshot.nome && jsonEquals(remote.ficha, snapshot.ficha);
}

function economyMatchesSnapshot(record: PersonagemApiRecord, snapshot: EconomySnapshot): boolean {
  const remote = economyValues(record);
  return jsonEquals(remote.carteira, snapshot.carteira)
    && jsonEquals(remote.inventario, snapshot.inventario);
}

function finishSheetSave(snapshot: SheetSnapshot, record: PersonagemApiRecord, reconciled = false): void {
  const version = positiveInteger(record.versao);
  if (!reconciled && version <= snapshot.baseVersion) {
    throw new Error('Resposta inválida do servidor: a versão da ficha não avançou.');
  }
  if (reconciled && version < snapshot.baseVersion) {
    throw new Error('Resposta inválida do servidor: versão remota regressiva.');
  }

  const patches = sheetPatches.get(snapshot.id);
  if (patches) {
    for (const [key, patch] of patches) {
      if (patch.revision <= snapshot.revision) patches.delete(key);
    }
    if (!patches.size) sheetPatches.delete(snapshot.id);
  }

  sheetBaseVersions.set(snapshot.id, version);
  sheetConflicts.delete(snapshot.id);
  const hasNewerPatches = (sheetPatches.get(snapshot.id)?.size ?? 0) > 0;
  updateCharacterInStore(snapshot.id, (current) => {
    if (hasNewerPatches) return { ...current, versao: version };
    const remote = sheetValues(record);
    return withSheetDomain(
      current,
      remote.nome,
      remote.ficha,
      version,
      typeof record.atualizado_em === 'string' ? record.atualizado_em : undefined,
    );
  });
  persistStoredDraft(snapshot.id);
}

async function saveSheetSnapshot(snapshot: SheetSnapshot): Promise<void> {
  try {
    const response = await personagensApi.atualizar(snapshot.id, {
      versao_esperada: snapshot.baseVersion,
      nome: snapshot.nome,
      ficha: snapshot.ficha,
    });
    finishSheetSave(snapshot, response.personagem);
  } catch (error) {
    let remote: PersonagemApiRecord | null = null;
    try {
      remote = (await personagensApi.obter(snapshot.id)).personagem;
    } catch {
      // Mantém o erro original quando a reconciliação também falha.
    }

    if (remote && sheetMatchesSnapshot(remote, snapshot)) {
      finishSheetSave(snapshot, remote, true);
      return;
    }
    if (error instanceof ApiError && error.status === 409) {
      if (remote) sheetConflicts.set(snapshot.id, remote);
      throw new SaveConflictError(
        'sheet',
        'A ficha mudou no servidor. Escolha recarregar ou manter explicitamente sua versão.',
      );
    }
    throw error;
  }
}

function getSheetQueue(characterId: string): AutosaveQueue<SheetSnapshot> {
  const existing = sheetQueues.get(characterId);
  if (existing) return existing;

  const queue = new AutosaveQueue<SheetSnapshot>({
    delayMs: AUTOSAVE_DELAY_MS,
    maxWaitMs: AUTOSAVE_MAX_WAIT_MS,
    capture: () => {
      const character = getCharacter(characterId);
      const patches = sheetPatches.get(characterId);
      if (!patches?.size) throw new Error('Nenhuma alteração de ficha pendente.');
      return {
        id: characterId,
        baseVersion: sheetBaseVersions.get(characterId) ?? positiveInteger(character.versao),
        revision: Math.max(...Array.from(patches.values(), (patch) => patch.revision)),
        nome: character.nome,
        ficha: jsonClone(character.ficha ?? {}),
      };
    },
    save: saveSheetSnapshot,
    onState: (state) => observeQueueState(characterId, 'sheet', state),
  });
  sheetQueues.set(characterId, queue);
  return queue;
}

function finishEconomySave(
  snapshot: EconomySnapshot,
  authoritative: EconomyStateSnapshot,
  versionValue: unknown,
  reconciled = false,
): void {
  const version = positiveInteger(versionValue);
  if (!reconciled && version <= snapshot.baseVersion) {
    throw new Error('Resposta inválida do servidor: a versão econômica não avançou.');
  }
  if (reconciled && version < snapshot.baseVersion) {
    throw new Error('Resposta inválida do servidor: versão econômica regressiva.');
  }

  const revision = economyRevisions.get(snapshot.id) ?? { current: snapshot.revision, saved: 0 };
  revision.saved = Math.max(revision.saved, snapshot.revision);
  economyRevisions.set(snapshot.id, revision);
  economyBaseVersions.set(snapshot.id, version);
  economyServerStates.set(snapshot.id, jsonClone(authoritative));
  economyConflicts.delete(snapshot.id);
  const hasNewerChanges = revision.current > snapshot.revision;
  updateCharacterInStore(snapshot.id, (current) => hasNewerChanges
    ? { ...current, economiaVersao: version }
    : {
        ...current,
        economiaVersao: version,
        carteira: jsonClone(authoritative.carteira),
        inventarioCentral: jsonClone(authoritative.inventario),
      });
}

async function saveEconomySnapshot(snapshot: EconomySnapshot, keepalive = false): Promise<void> {
  try {
    const operations = buildEconomyOperations(snapshot.serverBase, {
      carteira: snapshot.carteira,
      inventario: snapshot.inventario,
    });
    if (!operations.length) {
      finishEconomySave(snapshot, snapshot.serverBase, snapshot.baseVersion, true);
      return;
    }

    const response = await personagensApi.aplicarOperacoesEconomia(
      snapshot.id,
      {
        versaoEsperada: snapshot.baseVersion,
        operacoes: operations,
      },
      keepalive,
    );
    if (!Array.isArray(response.carteira) || !Array.isArray(response.inventario)) {
      throw new Error('Resposta inválida do servidor: economia autoritativa ausente.');
    }
    finishEconomySave(
      snapshot,
      { carteira: response.carteira, inventario: response.inventario },
      response.economia_versao,
    );
  } catch (error) {
    let remote: PersonagemApiRecord | null = null;
    try {
      remote = (await personagensApi.obter(snapshot.id)).personagem;
    } catch {
      // Mantém o erro original quando a reconciliação também falha.
    }

    if (remote && economyMatchesSnapshot(remote, snapshot)) {
      finishEconomySave(snapshot, economyValues(remote), remote.economia_versao, true);
      return;
    }
    if (error instanceof ApiError && error.status === 409) {
      if (remote) economyConflicts.set(snapshot.id, remote);
      throw new SaveConflictError(
        'economy',
        'Carteira ou inventário mudaram no servidor. Recarregue antes de continuar.',
      );
    }
    throw error;
  }
}

function getEconomyQueue(characterId: string): AutosaveQueue<EconomySnapshot> {
  const existing = economyQueues.get(characterId);
  if (existing) return existing;

  const queue = new AutosaveQueue<EconomySnapshot>({
    delayMs: 0,
    maxWaitMs: 0,
    capture: () => {
      const character = getCharacter(characterId);
      const revision = economyRevisions.get(characterId);
      if (!revision || revision.current <= revision.saved) {
        throw new Error('Nenhuma alteração econômica pendente.');
      }
      return {
        id: characterId,
        baseVersion: economyBaseVersions.get(characterId)
          ?? positiveInteger(character.economiaVersao),
        revision: revision.current,
        serverBase: jsonClone(economyServerStates.get(characterId) ?? {
          carteira: character.carteira ?? [],
          inventario: character.inventarioCentral ?? [],
        }),
        carteira: jsonClone(character.carteira ?? []),
        inventario: jsonClone(character.inventarioCentral ?? []),
      };
    },
    save: (snapshot) => saveEconomySnapshot(snapshot),
    onState: (state) => observeQueueState(characterId, 'economy', state),
  });
  economyQueues.set(characterId, queue);
  return queue;
}

/**
 * Variante keepalive: usada no pagehide para garantir que o browser
 * não aborte o fetch ao fechar a aba. Retorna a promise de flush.
 */
export function flushEconomyWithKeepalive(characterId: string): Promise<void> {
  const queue = economyQueues.get(characterId);
  if (!queue?.hasPending()) return Promise.resolve();

  // Executa diretamente o save com keepalive=true sem passar pela fila
  // (que não tem como injetar o flag keepalive retroativamente).
  const character = useCharacterStore.getState().characters.find((c) => c.id === characterId);
  if (!character) return Promise.resolve();
  const revision = economyRevisions.get(characterId);
  if (!revision || revision.current <= revision.saved) return Promise.resolve();

  const snapshot: EconomySnapshot = {
    id: characterId,
    baseVersion: economyBaseVersions.get(characterId) ?? positiveInteger(character.economiaVersao),
    revision: revision.current,
    serverBase: jsonClone(economyServerStates.get(characterId) ?? {
      carteira: character.carteira ?? [],
      inventario: character.inventarioCentral ?? [],
    }),
    carteira: jsonClone(character.carteira ?? []),
    inventario: jsonClone(character.inventarioCentral ?? []),
  };
  return saveEconomySnapshot(snapshot, true).catch(() => {
    // Melhor esforço no pagehide; erros são ignorados intencionalmente.
  });
}

function hasSheetPending(characterId: string): boolean {
  return (sheetPatches.get(characterId)?.size ?? 0) > 0
    || Boolean(sheetQueues.get(characterId)?.hasPending());
}

function hasEconomyPending(characterId: string): boolean {
  const revision = economyRevisions.get(characterId);
  return Boolean(revision && revision.current > revision.saved)
    || Boolean(economyQueues.get(characterId)?.hasPending());
}

function disposeSheetQueue(characterId: string): void {
  sheetQueues.get(characterId)?.dispose();
  sheetQueues.delete(characterId);
}

function disposeEconomyQueue(characterId: string): void {
  economyQueues.get(characterId)?.dispose();
  economyQueues.delete(characterId);
}

function clearSheetCoordinator(characterId: string): void {
  disposeSheetQueue(characterId);
  sheetPatches.delete(characterId);
  sheetBaseVersions.delete(characterId);
  sheetConflicts.delete(characterId);
  removeStoredDraft(characterId);
}

function clearEconomyCoordinator(characterId: string): void {
  disposeEconomyQueue(characterId);
  economyRevisions.delete(characterId);
  economyBaseVersions.delete(characterId);
  economyServerStates.delete(characterId);
  economyConflicts.delete(characterId);
}

function restoreDraft(character: ICharacter, remote: PersonagemApiRecord): {
  character: ICharacter;
  shouldSchedule: boolean;
  hasConflict: boolean;
} {
  if (hasSheetPending(character.id)) {
    return { character, shouldSchedule: false, hasConflict: false };
  }

  const draft = readStoredDraft(character.id);
  if (!draft?.patches.length) {
    return { character, shouldSchedule: false, hasConflict: false };
  }

  const patchMap = new Map<string, SheetPatch>();
  let restored = character;
  for (const patch of draft.patches.sort((left, right) => left.revision - right.revision)) {
    restored = applySheetPatch(restored, patch.path, jsonClone(patch.value));
    const key = JSON.stringify(patch.path);
    patchMap.delete(key);
    patchMap.set(key, patch);
    nextSheetRevision = Math.max(nextSheetRevision, patch.revision);
  }
  sheetPatches.set(character.id, patchMap);
  sheetBaseVersions.set(character.id, draft.baseVersion);

  const hasConflict = draft.baseVersion !== positiveInteger(remote.versao);
  if (hasConflict) sheetConflicts.set(character.id, remote);
  return {
    character: restored,
    shouldSchedule: !hasConflict,
    hasConflict,
  };
}

export const useCharacterStore = create<CharacterStore>((set, get) => ({
  characters: [],
  isLoading: false,
  error: null,
  persistence: {},

  fetchCharacters: async () => {
    const requestGeneration = ++fetchGeneration;
    const campaignId = useAuthStore.getState().campanhaAtiva?.id ?? null;
    set({ isLoading: true, error: null });

    if (!campaignId) {
      set({ characters: [], isLoading: false, error: 'Nenhuma campanha selecionada.' });
      return;
    }

    try {
      const response = await personagensApi.listar(campaignId, true);
      if (
        requestGeneration !== fetchGeneration
        || useAuthStore.getState().campanhaAtiva?.id !== campaignId
      ) return;

      const currentById = new Map(get().characters.map((character) => [character.id, character]));
      const recoveredToSchedule: string[] = [];
      const recoveredConflicts: string[] = [];

      const characters = (response.personagens ?? []).map((record) => {
        let normalized = normalizeCharacter(record);
        const current = currentById.get(normalized.id);

        if (current && (hasSheetPending(normalized.id)
          || positiveInteger(current.versao) > positiveInteger(normalized.versao))) {
          normalized = withSheetDomain(
            normalized,
            current.nome,
            current.ficha ?? {},
            positiveInteger(current.versao),
            current.atualizadoEm,
          );
        } else if (!current) {
          const restored = restoreDraft(normalized, record);
          normalized = restored.character;
          if (restored.shouldSchedule) recoveredToSchedule.push(normalized.id);
          if (restored.hasConflict) recoveredConflicts.push(normalized.id);
        }

        const preserveLocalEconomy = current && (hasEconomyPending(normalized.id)
          || positiveInteger(current.economiaVersao) > positiveInteger(normalized.economiaVersao));
        if (preserveLocalEconomy) {
          normalized = {
            ...normalized,
            economiaVersao: positiveInteger(current.economiaVersao),
            carteira: current.carteira ?? [],
            inventarioCentral: current.inventarioCentral ?? [],
          };
        } else {
          economyBaseVersions.set(normalized.id, positiveInteger(normalized.economiaVersao));
          economyServerStates.set(normalized.id, jsonClone({
            carteira: normalized.carteira ?? [],
            inventario: normalized.inventarioCentral ?? [],
          }));
        }
        return normalized;
      });

      characters.sort(
        (left, right) => new Date(left.criadoEm).getTime() - new Date(right.criadoEm).getTime(),
      );
      set({ characters, isLoading: false });

      for (const characterId of recoveredConflicts) {
        setDomainPersistence(characterId, 'sheet', {
          phase: 'conflict',
          message: 'Há um rascunho local baseado em uma versão antiga. Escolha qual ficha manter.',
        });
      }
      for (const characterId of recoveredToSchedule) getSheetQueue(characterId).markDirty();
    } catch (error) {
      if (
        requestGeneration !== fetchGeneration
        || useAuthStore.getState().campanhaAtiva?.id !== campaignId
      ) return;
      set({ error: errorMessage(error) || 'Falha ao carregar personagens.', isLoading: false });
    }
  },

  loadCharacter: async (id: string) => {
    if (get().characters.some((character) => character.id === id)) {
      set({ error: null });
      return true;
    }
    set({ isLoading: true, error: null });
    try {
      const remote = (await personagensApi.obter(id)).personagem;
      const normalized = normalizeCharacter(remote);
      if (!normalized.somenteLeitura) {
        economyBaseVersions.set(id, positiveInteger(normalized.economiaVersao));
        economyServerStates.set(id, jsonClone({
          carteira: normalized.carteira ?? [],
          inventario: normalized.inventarioCentral ?? [],
        }));
      }
      set((state) => ({
        characters: [...state.characters.filter((character) => character.id !== id), normalized],
        persistence: normalized.somenteLeitura
          ? state.persistence
          : { ...state.persistence, [id]: emptyPersistenceState() },
        isLoading: false,
        error: null,
      }));
      return true;
    } catch (error) {
      set({ error: errorMessage(error), isLoading: false });
      return false;
    }
  },

  refreshCharacter: async (id: string) => {
    try {
      const remote = (await personagensApi.obter(id)).personagem;
      const normalized = normalizeCharacter(remote);
      clearSheetCoordinator(id);
      clearEconomyCoordinator(id);
      economyBaseVersions.set(id, positiveInteger(normalized.economiaVersao));
      economyServerStates.set(id, jsonClone({
        carteira: normalized.carteira ?? [],
        inventario: normalized.inventarioCentral ?? [],
      }));
      set((state) => ({
        characters: state.characters.map((character) => character.id === id ? normalized : character),
        persistence: {
          ...state.persistence,
          [id]: emptyPersistenceState(),
        },
        error: null,
      }));
      return true;
    } catch (error) {
      set({ error: errorMessage(error) });
      return false;
    }
  },

  syncRemoteCharacter: async (id: string, expectedVersion = 0) => {
    const before = get().characters.find((character) => character.id === id);
    if (!before) return 'error';
    const expected = Math.max(0, Math.trunc(Number(expectedVersion) || 0));

    // O eco do SSE costuma chegar logo antes ou depois da resposta do próprio
    // PUT. A versão evita um GET desnecessário quando o store já incorporou a
    // mesma gravação.
    if (expected > 0 && positiveInteger(before.versao) >= expected) return 'unchanged';
    if (get().hasPendingCharacterSaves(id)) return 'deferred';

    try {
      const remote = (await personagensApi.obter(id)).personagem;
      const normalized = normalizeCharacter(remote);
      const current = get().characters.find((character) => character.id === id);
      if (!current) return 'error';

      // Uma edição pode começar enquanto o GET está em voo. Nesse caso a
      // resposta remota nunca substitui o rascunho que acabou de nascer.
      if (get().hasPendingCharacterSaves(id)) return 'deferred';

      const remoteSheetVersion = positiveInteger(normalized.versao);
      const localSheetVersion = positiveInteger(current.versao);
      const remoteEconomyVersion = positiveInteger(normalized.economiaVersao);
      const localEconomyVersion = positiveInteger(current.economiaVersao);
      if (expected > 0 && remoteSheetVersion < expected) return 'retry';

      const applySheet = remoteSheetVersion > localSheetVersion;
      const applyEconomy = remoteEconomyVersion > localEconomyVersion && !hasEconomyPending(id);
      if (!applySheet && !applyEconomy) return 'unchanged';

      if (applySheet) {
        sheetBaseVersions.set(id, remoteSheetVersion);
        sheetConflicts.delete(id);
        removeStoredDraft(id);
      }
      if (applyEconomy) {
        economyBaseVersions.set(id, remoteEconomyVersion);
        economyServerStates.set(id, jsonClone({
          carteira: normalized.carteira ?? [],
          inventario: normalized.inventarioCentral ?? [],
        }));
      }

      set((state) => ({
        characters: state.characters.map((character) => {
          if (character.id !== id) return character;
          let next = character;
          if (applySheet) {
            next = withSheetDomain(
              next,
              normalized.nome,
              normalized.ficha ?? {},
              remoteSheetVersion,
              normalized.atualizadoEm,
            );
          }
          if (applyEconomy) {
            next = {
              ...next,
              economiaVersao: remoteEconomyVersion,
              carteira: normalized.carteira ?? [],
              inventarioCentral: normalized.inventarioCentral ?? [],
            };
          }
          return {
            ...next,
            somenteLeitura: normalized.somenteLeitura,
            donoUsuarioId: normalized.donoUsuarioId,
            aliadosCompartilhados: normalized.aliadosCompartilhados,
          };
        }),
        error: null,
      }));

      return 'updated';
    } catch {
      return 'error';
    }
  },

  archiveCharacter: async (id: string) => {
    if (get().hasPendingCharacterSaves(id) && !(await get().flushCharacterSaves(id))) {
      set({ error: 'Não foi possível salvar as alterações antes de arquivar.' });
      return false;
    }
    try {
      await personagensApi.arquivar(id);
      clearSheetCoordinator(id);
      clearEconomyCoordinator(id);
      set((state) => {
        const persistence = { ...state.persistence };
        delete persistence[id];
        return {
          characters: state.characters.filter((character) => character.id !== id),
          persistence,
        };
      });
      return true;
    } catch (error) {
      set({ error: errorMessage(error) });
      return false;
    }
  },

  createCharacter: async (payload) => {
    try {
      const campaignId = useAuthStore.getState().campanhaAtiva?.id ?? null;
      if (!campaignId) throw new Error('Nenhuma campanha ativa.');
      const response = await personagensApi.criar(campaignId, payload);
      await get().fetchCharacters();
      return response.id;
    } catch (error) {
      set({ error: errorMessage(error) });
      return null;
    }
  },

  patchCharacter: (id, path, value) => {
    const current = get().characters.find((character) => character.id === id);
    if (!current) return false;

    try {
      const safeValue = jsonClone(value);
      const updated = applySheetPatch(current, path, safeValue);
      if (updated.nome === current.nome && jsonEquals(updated.ficha, current.ficha)) return true;

      const revision = ++nextSheetRevision;
      const patches = sheetPatches.get(id) ?? new Map<string, SheetPatch>();
      const key = JSON.stringify(path);
      patches.delete(key);
      patches.set(key, { path: Array.from(path), value: safeValue, revision });
      sheetPatches.set(id, patches);
      if (!sheetBaseVersions.has(id)) {
        sheetBaseVersions.set(id, positiveInteger(current.versao));
      }

      set((state) => ({
        characters: state.characters.map((character) => character.id === id ? updated : character),
      }));
      persistStoredDraft(id);

      if (get().persistence[id]?.sheet.phase === 'conflict') {
        setDomainPersistence(id, 'sheet', {
          phase: 'conflict',
          message: 'A edição foi mantida localmente; resolva o conflito antes de sincronizar.',
        });
      } else {
        getSheetQueue(id).markDirty();
      }
      return true;
    } catch (error) {
      setDomainPersistence(id, 'sheet', { phase: 'error', message: errorMessage(error) });
      return false;
    }
  },

  updateCharacter: async (id, payload) => {
    let changed = false;
    if (payload.nome !== undefined) {
      changed = get().patchCharacter(id, ['nome'], payload.nome) || changed;
    }
    if (payload.ficha !== undefined) {
      changed = get().patchCharacter(id, ['ficha'], payload.ficha) || changed;
    }
    if (!changed) return false;
    return get().flushCharacterSaves(id);
  },

  mutateEconomy: async (id, updater) => {
    const initialCharacter = get().characters.find((item) => item.id === id);
    if (!initialCharacter) return false;
    if (!economyServerStates.has(id)) {
      economyServerStates.set(id, jsonClone({
        carteira: initialCharacter.carteira ?? [],
        inventario: initialCharacter.inventarioCentral ?? [],
      }));
    }

    let changed = false;
    let updateError: unknown = null;
    set((state) => {
      const character = state.characters.find((item) => item.id === id);
      if (!character) return state;
      try {
        const current: CharacterEconomy = {
          carteira: jsonClone(character.carteira ?? []),
          inventario: jsonClone(character.inventarioCentral ?? []),
        };
        const next = updater(current);
        if (!next || !Array.isArray(next.carteira) || !Array.isArray(next.inventario)) {
          throw new TypeError('A atualização econômica deve retornar carteira e inventário completos.');
        }
        const safeNext = jsonClone(next);
        if (jsonEquals(current, safeNext)) return state;
        changed = true;
        return {
          characters: state.characters.map((item) => item.id === id
            ? {
                ...item,
                carteira: safeNext.carteira,
                inventarioCentral: safeNext.inventario,
              }
            : item),
        };
      } catch (error) {
        updateError = error;
        return state;
      }
    });

    if (updateError) {
      setDomainPersistence(id, 'economy', { phase: 'error', message: errorMessage(updateError) });
      return false;
    }
    if (!changed) return true;

    const character = get().characters.find((item) => item.id === id);
    if (!character) return false;
    const revision = economyRevisions.get(id) ?? { current: 0, saved: 0 };
    revision.current += 1;
    economyRevisions.set(id, revision);
    if (!economyBaseVersions.has(id)) {
      economyBaseVersions.set(id, positiveInteger(character.economiaVersao));
    }

    if (get().persistence[id]?.economy.phase === 'conflict') {
      setDomainPersistence(id, 'economy', {
        phase: 'conflict',
        message: 'A alteração está apenas local; recarregue a economia antes de continuar.',
      });
      return false;
    }

    const queue = getEconomyQueue(id);
    queue.markDirty();
    try {
      await queue.flush();
      return true;
    } catch (error) {
      console.error('Falha ao sincronizar economia do personagem:', error);
      return false;
    }
  },

  flushCharacterSaves: async (id) => {
    const queues = [sheetQueues.get(id), economyQueues.get(id)].filter(
      (queue): queue is AutosaveQueue<SheetSnapshot> | AutosaveQueue<EconomySnapshot> => Boolean(queue),
    );
    const results = await Promise.allSettled(queues.map((queue) => queue.flush()));
    return results.every((result) => result.status === 'fulfilled');
  },

  retryCharacterSave: async (id, domain) => {
    const state = get().persistence[id]?.[domain];
    if (state?.phase === 'conflict') return false;
    const queue = domain === 'sheet' ? sheetQueues.get(id) : economyQueues.get(id);
    if (!queue) return true;
    try {
      await queue.retry();
      return true;
    } catch {
      return false;
    }
  },

  resolveCharacterConflict: async (id, domain, strategy) => {
    if (strategy === 'overwrite' && domain !== 'sheet') {
      setDomainPersistence(id, domain, {
        phase: 'conflict',
        message: 'A economia só pode ser recarregada; sobrescritas integrais são bloqueadas.',
      });
      return false;
    }

    try {
      const remote = (await personagensApi.obter(id)).personagem;
      const current = get().characters.find((character) => character.id === id);
      if (!current) return false;

      if (domain === 'sheet' && strategy === 'overwrite') {
        disposeSheetQueue(id);
        sheetBaseVersions.set(id, positiveInteger(remote.versao));
        sheetConflicts.delete(id);
        updateCharacterInStore(id, (character) => ({
          ...character,
          versao: positiveInteger(remote.versao),
        }));
        persistStoredDraft(id);
        const queue = getSheetQueue(id);
        queue.markDirty();
        await queue.flush();
        return true;
      }

      if (domain === 'sheet') {
        clearSheetCoordinator(id);
        const values = sheetValues(remote);
        updateCharacterInStore(id, (character) => withSheetDomain(
          character,
          values.nome,
          values.ficha,
          positiveInteger(remote.versao),
          typeof remote.atualizado_em === 'string' ? remote.atualizado_em : undefined,
        ));
      } else {
        clearEconomyCoordinator(id);
        const values = economyValues(remote);
        economyServerStates.set(id, jsonClone(values));
        updateCharacterInStore(id, (character) => ({
          ...character,
          economiaVersao: positiveInteger(remote.economia_versao),
          carteira: values.carteira,
          inventarioCentral: values.inventario,
        }));
      }
      setDomainPersistence(id, domain, {
        phase: 'saved',
        message: 'Versão do servidor carregada.',
        savedAt: Date.now(),
      });
      return true;
    } catch (error) {
      const conflictIsStillOpen = get().persistence[id]?.[domain].phase === 'conflict';
      setDomainPersistence(id, domain, {
        phase: conflictIsStillOpen ? 'conflict' : 'error',
        message: conflictIsStillOpen
          ? `O conflito continua aberto: ${errorMessage(error)}`
          : errorMessage(error),
      });
      return false;
    }
  },

  hasPendingCharacterSaves: (id) => hasSheetPending(id) || hasEconomyPending(id),
}));

/**
 * Limpa todos os dados de personagens em memória e localStorage.
 * Deve ser chamado no logout para evitar que usuário B veja dados do usuário A.
 * Não importa useAuthStore (evita dependência circular).
 */
export function resetAllCharacterData(): void {
  // Descarta todas as filas de autosave antes de limpar os Maps
  for (const [, queue] of sheetQueues) queue.dispose();
  for (const [, queue] of economyQueues) queue.dispose();

  sheetPatches.clear();
  sheetBaseVersions.clear();
  sheetQueues.clear();
  sheetConflicts.clear();
  economyRevisions.clear();
  economyBaseVersions.clear();
  economyServerStates.clear();
  economyQueues.clear();
  economyConflicts.clear();

  // Remove rascunhos de ficha do localStorage
  if (typeof window !== 'undefined') {
    try {
      const keysToRemove: string[] = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key?.startsWith(SHEET_DRAFT_PREFIX)) keysToRemove.push(key);
      }
      for (const key of keysToRemove) localStorage.removeItem(key);
    } catch {
      // Storage indisponível: dados em memória já foram limpos acima.
    }
  }

  useCharacterStore.setState({ characters: [], isLoading: false, error: null, persistence: {} });
}
