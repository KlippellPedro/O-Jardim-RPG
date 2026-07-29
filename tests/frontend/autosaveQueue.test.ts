import test from 'node:test';
import assert from 'node:assert/strict';

import {
  AutosaveQueue,
  type AutosaveClock,
  type AutosaveQueueState,
  type AutosaveTimers,
  updateAtPath,
} from '../../src/services/autosaveQueue.ts';

interface TimerEntry {
  id: number;
  at: number;
  callback: () => void;
}

class FakeTime implements AutosaveClock, AutosaveTimers {
  private currentTime = 0;
  private nextId = 1;
  private readonly entries = new Map<number, TimerEntry>();

  now(): number {
    return this.currentTime;
  }

  setTimeout(callback: () => void, delayMs: number): number {
    const id = this.nextId++;
    this.entries.set(id, {
      id,
      at: this.currentTime + Math.max(0, delayMs),
      callback,
    });
    return id;
  }

  clearTimeout(handle: unknown): void {
    this.entries.delete(handle as number);
  }

  advanceBy(ms: number): void {
    const target = this.currentTime + ms;
    while (true) {
      const next = [...this.entries.values()]
        .filter((entry) => entry.at <= target)
        .sort((a, b) => a.at - b.at || a.id - b.id)[0];
      if (!next) break;

      this.currentTime = next.at;
      this.entries.delete(next.id);
      next.callback();
    }
    this.currentTime = target;
  }
}

async function settle(): Promise<void> {
  for (let index = 0; index < 8; index += 1) {
    await Promise.resolve();
  }
}

function deferred(): {
  promise: Promise<void>;
  resolve: () => void;
  reject: (error: unknown) => void;
} {
  let resolve!: () => void;
  let reject!: (error: unknown) => void;
  const promise = new Promise<void>((resolvePromise, rejectPromise) => {
    resolve = resolvePromise;
    reject = rejectPromise;
  });
  return { promise, resolve, reject };
}

test('debounce coalesces edits and captures only the latest snapshot', async () => {
  const time = new FakeTime();
  let draft = { value: 1 };
  const saves: Array<{ value: number }> = [];
  const queue = new AutosaveQueue({
    capture: () => ({ ...draft }),
    save: (snapshot) => { saves.push(snapshot); },
    delayMs: 100,
    maxWaitMs: 1_000,
    clock: time,
    timers: time,
  });

  queue.markDirty();
  time.advanceBy(40);
  draft = { value: 2 };
  queue.markDirty();
  time.advanceBy(40);
  draft = { value: 3 };
  queue.markDirty();

  time.advanceBy(99);
  await settle();
  assert.equal(saves.length, 0);

  time.advanceBy(1);
  await settle();
  assert.deepEqual(saves, [{ value: 3 }]);
  assert.equal(queue.hasPending(), false);
});

test('maxWaitMs is a real ceiling and is not reset by debounce', async () => {
  const time = new FakeTime();
  let value = 0;
  const saves: number[] = [];
  const queue = new AutosaveQueue({
    capture: () => value,
    save: (snapshot) => { saves.push(snapshot); },
    delayMs: 100,
    maxWaitMs: 250,
    clock: time,
    timers: time,
  });

  queue.markDirty();
  for (const nextValue of [1, 2, 3]) {
    time.advanceBy(80);
    value = nextValue;
    queue.markDirty();
  }

  time.advanceBy(9);
  await settle();
  assert.equal(saves.length, 0);

  time.advanceBy(1);
  await settle();
  assert.deepEqual(saves, [3]);
});

test('serializes saves and creates a second batch for edits made in flight', async () => {
  let draft = { value: 1 };
  const snapshots: Array<{ value: number }> = [];
  const gates: ReturnType<typeof deferred>[] = [];
  let active = 0;
  let maxActive = 0;

  const queue = new AutosaveQueue({
    capture: () => ({ ...draft }),
    save: async (snapshot) => {
      snapshots.push(snapshot);
      active += 1;
      maxActive = Math.max(maxActive, active);
      const gate = deferred();
      gates.push(gate);
      try {
        await gate.promise;
      } finally {
        active -= 1;
      }
    },
  });

  queue.markDirty();
  const flushing = queue.flush();
  await settle();
  assert.deepEqual(snapshots, [{ value: 1 }]);

  draft = { value: 2 };
  queue.markDirty();
  await settle();
  assert.equal(snapshots.length, 1);

  gates[0].resolve();
  await settle();
  assert.deepEqual(snapshots, [{ value: 1 }, { value: 2 }]);
  assert.equal(maxActive, 1);

  gates[1].resolve();
  await flushing;
  assert.equal(queue.hasPending(), false);
  assert.equal(maxActive, 1);
});

test('failure stays dirty and retry captures the newest snapshot', async () => {
  let draft = { value: 1 };
  let shouldFail = true;
  const snapshots: Array<{ value: number }> = [];
  const states: AutosaveQueueState[] = [];
  const queue = new AutosaveQueue({
    capture: () => ({ ...draft }),
    save: async (snapshot) => {
      snapshots.push(snapshot);
      if (shouldFail) throw new Error('offline');
    },
    onState: (state) => states.push(state),
  });

  queue.markDirty();
  await assert.rejects(queue.flush(), /offline/);
  assert.equal(queue.hasPending(), true);
  assert.equal(states.at(-1)?.status, 'error');

  draft = { value: 2 };
  queue.markDirty();
  shouldFail = false;
  await queue.retry();

  assert.deepEqual(snapshots, [{ value: 1 }, { value: 2 }]);
  assert.equal(queue.hasPending(), false);
  assert.equal(states.at(-1)?.status, 'idle');
});

test('flush saves immediately and cancels scheduled duplicate work', async () => {
  const time = new FakeTime();
  const saves: number[] = [];
  const queue = new AutosaveQueue({
    capture: () => 42,
    save: (snapshot) => { saves.push(snapshot); },
    delayMs: 500,
    maxWaitMs: 2_000,
    clock: time,
    timers: time,
  });

  queue.markDirty();
  await queue.flush();
  assert.deepEqual(saves, [42]);

  time.advanceBy(5_000);
  await settle();
  assert.deepEqual(saves, [42]);
});

test('dispose cancels timers without pretending dirty data was saved', async () => {
  const time = new FakeTime();
  const saves: number[] = [];
  const queue = new AutosaveQueue({
    capture: () => 7,
    save: (snapshot) => { saves.push(snapshot); },
    delayMs: 100,
    maxWaitMs: 200,
    clock: time,
    timers: time,
  });

  queue.markDirty();
  queue.dispose();
  time.advanceBy(1_000);
  await settle();

  assert.deepEqual(saves, []);
  assert.equal(queue.hasPending(), true);
});

test('updateAtPath clones only the modified branch', () => {
  const original = {
    ficha: {
      status: { vida: 10, mana: 8 },
      notas: [{ titulo: 'A' }, { titulo: 'B' }],
    },
    stable: { id: 'same-reference' },
  };

  const updated = updateAtPath(original, ['ficha', 'status', 'vida'], 7);

  assert.notEqual(updated, original);
  assert.notEqual(updated.ficha, original.ficha);
  assert.notEqual(updated.ficha.status, original.ficha.status);
  assert.equal(updated.ficha.notas, original.ficha.notas);
  assert.equal(updated.stable, original.stable);
  assert.equal(updated.ficha.status.vida, 7);
  assert.equal(original.ficha.status.vida, 10);
});

test('updateAtPath safely updates arrays and blocks prototype pollution', () => {
  const original = { items: [{ nome: 'A' }, { nome: 'B' }] };
  const updated = updateAtPath(original, ['items', 1, 'nome'], 'C');

  assert.notEqual(updated.items, original.items);
  assert.equal(updated.items[0], original.items[0]);
  assert.notEqual(updated.items[1], original.items[1]);
  assert.equal(updated.items[1].nome, 'C');
  assert.equal(original.items[1].nome, 'B');

  assert.throws(
    () => updateAtPath(original, ['__proto__', 'polluted'], true),
    /Unsafe path segment/,
  );
  assert.equal(({} as { polluted?: boolean }).polluted, undefined);
});
