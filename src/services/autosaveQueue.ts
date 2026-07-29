export type AutosaveStatus = 'idle' | 'dirty' | 'saving' | 'error' | 'disposed';

export interface AutosaveQueueState {
  status: AutosaveStatus;
  dirty: boolean;
  saving: boolean;
  error: unknown | null;
  revision: number;
  savedRevision: number;
}

export interface AutosaveClock {
  now(): number;
}

export interface AutosaveTimers {
  setTimeout(callback: () => void, delayMs: number): unknown;
  clearTimeout(handle: unknown): void;
}

export interface AutosaveQueueOptions<T> {
  capture: () => T;
  save: (snapshot: T) => Promise<unknown> | unknown;
  onState?: (state: AutosaveQueueState) => void;
  delayMs?: number;
  maxWaitMs?: number;
  clock?: AutosaveClock;
  timers?: AutosaveTimers;
}

const DEFAULT_DELAY_MS = 400;
const DEFAULT_MAX_WAIT_MS = 2_000;

const systemClock: AutosaveClock = {
  now: () => Date.now(),
};

const systemTimers: AutosaveTimers = {
  setTimeout: (callback, delayMs) => globalThis.setTimeout(callback, delayMs),
  clearTimeout: (handle) => globalThis.clearTimeout(handle as ReturnType<typeof globalThis.setTimeout>),
};

function validDuration(value: number | undefined, fallback: number, name: string): number {
  const duration = value ?? fallback;
  if (!Number.isFinite(duration) || duration < 0) {
    throw new RangeError(`${name} must be a finite, non-negative number`);
  }
  return duration;
}

/**
 * Coalesces autosave requests while keeping at most one save in flight.
 *
 * `capture` is evaluated only when a batch actually starts. A failed batch
 * remains dirty, so `retry` always captures the newest available snapshot.
 */
export class AutosaveQueue<T> {
  private readonly capture: () => T;
  private readonly save: (snapshot: T) => Promise<unknown> | unknown;
  private readonly onState?: (state: AutosaveQueueState) => void;
  private readonly delayMs: number;
  private readonly maxWaitMs: number;
  private readonly clock: AutosaveClock;
  private readonly timers: AutosaveTimers;

  private revision = 0;
  private savedRevision = 0;
  private dirtySince: number | null = null;
  private debounceTimer: unknown | null = null;
  private maxWaitTimer: unknown | null = null;
  private drainPromise: Promise<void> | null = null;
  private saving = false;
  private disposed = false;
  private error: unknown | null = null;
  private lastState: AutosaveQueueState | null = null;

  constructor(options: AutosaveQueueOptions<T>) {
    this.capture = options.capture;
    this.save = options.save;
    this.onState = options.onState;
    this.delayMs = validDuration(options.delayMs, DEFAULT_DELAY_MS, 'delayMs');
    this.maxWaitMs = validDuration(options.maxWaitMs, DEFAULT_MAX_WAIT_MS, 'maxWaitMs');
    this.clock = options.clock ?? systemClock;
    this.timers = options.timers ?? systemTimers;
    this.emitState(true);
  }

  markDirty(): void {
    if (this.disposed) return;

    this.revision += 1;
    this.error = null;

    if (this.dirtySince === null) {
      this.dirtySince = this.clock.now();
    }

    this.scheduleDebounce();
    this.scheduleMaxWait();
    this.emitState();
  }

  flush(): Promise<void> {
    if (this.drainPromise) return this.drainPromise;
    if (this.disposed || !this.hasPending()) return Promise.resolve();

    this.clearScheduledTimers();
    this.dirtySince = null;

    const operation = this.drain();
    this.drainPromise = operation;
    operation.then(
      () => {
        if (this.drainPromise === operation) this.drainPromise = null;
      },
      () => {
        if (this.drainPromise === operation) this.drainPromise = null;
      },
    );
    return operation;
  }

  retry(): Promise<void> {
    if (this.disposed) return this.drainPromise ?? Promise.resolve();
    this.error = null;
    this.emitState();
    return this.flush();
  }

  hasPending(): boolean {
    return this.revision > this.savedRevision;
  }

  dispose(): void {
    if (this.disposed) return;
    this.disposed = true;
    this.clearScheduledTimers();
    this.dirtySince = null;
    this.emitState(true);
  }

  private scheduleDebounce(): void {
    if (this.debounceTimer !== null) {
      this.timers.clearTimeout(this.debounceTimer);
    }

    this.debounceTimer = this.timers.setTimeout(() => {
      this.debounceTimer = null;
      this.requestScheduledFlush();
    }, this.delayMs);
  }

  private scheduleMaxWait(): void {
    if (this.maxWaitTimer !== null || this.dirtySince === null) return;

    const elapsed = Math.max(0, this.clock.now() - this.dirtySince);
    const remaining = Math.max(0, this.maxWaitMs - elapsed);
    this.maxWaitTimer = this.timers.setTimeout(() => {
      this.maxWaitTimer = null;
      if (this.debounceTimer !== null) {
        this.timers.clearTimeout(this.debounceTimer);
        this.debounceTimer = null;
      }
      this.requestScheduledFlush();
    }, remaining);
  }

  private requestScheduledFlush(): void {
    void this.flush().catch(() => {
      // Scheduled saves expose failures through onState and remain retryable.
    });
  }

  private clearScheduledTimers(): void {
    if (this.debounceTimer !== null) {
      this.timers.clearTimeout(this.debounceTimer);
      this.debounceTimer = null;
    }
    if (this.maxWaitTimer !== null) {
      this.timers.clearTimeout(this.maxWaitTimer);
      this.maxWaitTimer = null;
    }
  }

  private async drain(): Promise<void> {
    while (!this.disposed && this.hasPending()) {
      this.clearScheduledTimers();
      this.dirtySince = null;

      const batchRevision = this.revision;
      let snapshot: T;
      try {
        snapshot = this.capture();
      } catch (error) {
        this.error = error;
        this.emitState();
        throw error;
      }

      this.saving = true;
      this.error = null;
      this.emitState();

      try {
        await this.save(snapshot);
      } catch (error) {
        this.saving = false;
        this.error = error;
        this.clearScheduledTimers();
        this.dirtySince = null;
        this.emitState();
        throw error;
      }

      this.savedRevision = Math.max(this.savedRevision, batchRevision);
      this.saving = false;
      this.error = null;
      this.emitState();
      // If markDirty ran during save, the loop captures a fresh second batch.
    }
  }

  private emitState(force = false): void {
    const dirty = this.hasPending();
    const status: AutosaveStatus = this.disposed
      ? 'disposed'
      : this.error !== null
        ? 'error'
        : this.saving
          ? 'saving'
          : dirty
            ? 'dirty'
            : 'idle';

    const state: AutosaveQueueState = {
      status,
      dirty,
      saving: this.saving,
      error: this.error,
      revision: this.revision,
      savedRevision: this.savedRevision,
    };

    if (!force && this.lastState
      && this.lastState.status === state.status
      && this.lastState.dirty === state.dirty
      && this.lastState.saving === state.saving
      && this.lastState.error === state.error
      && this.lastState.revision === state.revision
      && this.lastState.savedRevision === state.savedRevision) {
      return;
    }

    this.lastState = state;
    if (!this.onState) return;
    try {
      this.onState(state);
    } catch {
      // State observers must not be able to interrupt persistence.
    }
  }
}

export type UpdatePathSegment = string | number;

const UNSAFE_PATH_SEGMENTS = new Set(['__proto__', 'prototype', 'constructor']);

function assertSafeSegment(segment: UpdatePathSegment): void {
  if (typeof segment === 'number') {
    if (!Number.isInteger(segment) || segment < 0) {
      throw new TypeError('Numeric path segments must be non-negative integers');
    }
    return;
  }
  if (!segment || UNSAFE_PATH_SEGMENTS.has(segment)) {
    throw new TypeError(`Unsafe path segment: ${segment}`);
  }
}

function isArrayIndex(segment: UpdatePathSegment): boolean {
  return typeof segment === 'number' || /^(0|[1-9]\d*)$/.test(segment);
}

function isObject(value: unknown): value is Record<string | number, unknown> {
  return typeof value === 'object' && value !== null;
}

/**
 * Returns a structurally shared copy with `value` assigned at `path`.
 * The helper accepts JSON-like objects/arrays and rejects prototype-polluting
 * path segments. An empty path replaces the root value.
 */
export function updateAtPath<T>(source: T, path: readonly UpdatePathSegment[], value: unknown): T {
  for (const segment of path) assertSafeSegment(segment);
  if (path.length === 0) return value as T;

  const updateNode = (current: unknown, index: number): unknown => {
    if (index === path.length) return value;

    const segment = path[index];
    const nextSegment = path[index + 1];
    const clone: Record<string | number, unknown> | unknown[] = Array.isArray(current)
      ? current.slice()
      : isObject(current)
        ? { ...current }
        : isArrayIndex(nextSegment)
          ? []
          : {};

    const existing = isObject(current) && Object.prototype.hasOwnProperty.call(current, segment)
      ? current[segment]
      : undefined;
    Reflect.set(clone, segment, updateNode(existing, index + 1));
    return clone;
  };

  return updateNode(source, 0) as T;
}
