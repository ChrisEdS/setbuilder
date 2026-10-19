/**
 * One lane for heavy work (library read, energy measure, tag scan).
 * A second call waits. The UI stays clickable because nothing overlaps
 * and the runner yields between jobs.
 */

type Entry = {
  run: () => Promise<unknown>;
  resolve: (value: unknown) => void;
  reject: (error: unknown) => void;
};

const pending: Entry[] = [];
let pumping = false;

export function yieldToUi(): Promise<void> {
  const scheduler = (
    globalThis as { scheduler?: { yield?: () => Promise<void> } }
  ).scheduler;
  if (typeof scheduler?.yield === "function") return scheduler.yield();
  return new Promise((resolve) => {
    setTimeout(resolve, 0);
  });
}

/** Jobs already running or waiting. The next enqueue sits behind this many. */
export function workQueueDepth(): number {
  return pending.length + (pumping ? 1 : 0);
}

export function enqueueWork<T>(run: () => Promise<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    pending.push({
      run,
      resolve: (value) => resolve(value as T),
      reject,
    });
    void pump();
  });
}

async function pump() {
  if (pumping) return;
  pumping = true;
  try {
    while (pending.length) {
      const job = pending.shift()!;
      try {
        job.resolve(await job.run());
      } catch (error) {
        job.reject(error);
      }
      if (pending.length) await yieldToUi();
    }
  } finally {
    pumping = false;
    if (pending.length) void pump();
  }
}
