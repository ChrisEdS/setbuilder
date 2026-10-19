/**
 * One lane for heavy work (library read, energy measure, tag scan).
 * A second call waits. The UI stays clickable because nothing overlaps
 * and the runner yields between jobs.
 */

export type WorkJobStatus =
  | "queued"
  | "running"
  | "succeeded"
  | "failed"
  | "cancelled";

export type WorkJob = {
  operation: string;
  key: string;
  label: string;
  target?: string;
};

export type WorkJobSnapshot = WorkJob & {
  id: string;
  status: WorkJobStatus;
  /** One-based position among waiting jobs. Running and completed jobs are zero. */
  position: number;
  error?: string;
};

export type WorkQueueSnapshot = {
  count: number;
  jobs: readonly WorkJobSnapshot[];
};

type Entry = {
  id: string;
  job: WorkJob;
  run: () => Promise<unknown>;
  resolve: (value: unknown) => void;
  reject: (error: unknown) => void;
  promise: Promise<unknown>;
};

const pending: Entry[] = [];
const activeByKey = new Map<string, Entry>();
const history: WorkJobSnapshot[] = [];
const listeners = new Set<() => void>();
let running: Entry | null = null;
let nextId = 1;
let snapshot: WorkQueueSnapshot = { count: 0, jobs: [] };

function identity(job: Pick<WorkJob, "operation" | "key">): string {
  return `${job.operation}\u0000${job.key}`;
}

function publish(): void {
  const live: WorkJobSnapshot[] = [
    ...(running
      ? [{ ...running.job, id: running.id, status: "running" as const, position: 0 }]
      : []),
    ...pending.map((entry, index) => ({
      ...entry.job,
      id: entry.id,
      status: "queued" as const,
      position: index + 1,
    })),
  ];
  snapshot = { count: live.length, jobs: [...live, ...history] };
  for (const listener of listeners) listener();
}

function remember(entry: Entry, status: WorkJobStatus, error?: unknown): void {
  history.unshift({
    ...entry.job,
    id: entry.id,
    status,
    position: 0,
    ...(error == null
      ? {}
      : { error: error instanceof Error ? error.message : String(error) }),
  });
  if (history.length > 24) history.length = 24;
}

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
  return pending.length + (running ? 1 : 0);
}

export function getWorkQueueSnapshot(): WorkQueueSnapshot {
  return snapshot;
}

export function subscribeWorkQueue(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function enqueueWork<T>(
  run: () => Promise<T>,
  named?: WorkJob,
): Promise<T> {
  const job: WorkJob = named ?? {
    operation: "legacy",
    key: `job-${nextId}`,
    label: "Background work",
  };
  const duplicate = activeByKey.get(identity(job));
  if (duplicate) return duplicate.promise as Promise<T>;

  let resolveEntry!: (value: unknown) => void;
  let rejectEntry!: (error: unknown) => void;
  const promise = new Promise<unknown>((resolve, reject) => {
    resolveEntry = resolve;
    rejectEntry = reject;
  });
  const entry: Entry = {
    id: `work-${nextId++}`,
    job,
    run,
    resolve: resolveEntry,
    reject: rejectEntry,
    promise,
  };
  pending.push(entry);
  activeByKey.set(identity(job), entry);
  publish();
  void pump();
  return promise as Promise<T>;
}

/** Cancels a waiting named job. Running work is deliberately not interrupted. */
export function cancelWorkJob(operation: string, key: string): boolean {
  const entry = activeByKey.get(identity({ operation, key }));
  if (!entry || entry === running) return false;
  const index = pending.indexOf(entry);
  if (index < 0) return false;
  pending.splice(index, 1);
  activeByKey.delete(identity(entry.job));
  const error = new Error("Work cancelled");
  remember(entry, "cancelled", error);
  entry.reject(error);
  publish();
  return true;
}

async function pump() {
  if (running) return;
  try {
    while (pending.length) {
      const job = pending.shift()!;
      running = job;
      publish();
      try {
        job.resolve(await job.run());
        remember(job, "succeeded");
      } catch (error) {
        remember(job, "failed", error);
        job.reject(error);
      } finally {
        activeByKey.delete(identity(job.job));
        running = null;
        publish();
      }
      if (pending.length) await yieldToUi();
    }
  } finally {
    running = null;
    publish();
    if (pending.length) void pump();
  }
}
