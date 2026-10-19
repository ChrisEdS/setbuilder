"use client";

import { useMemo, useSyncExternalStore } from "react";
import type { Translate } from "@/lib/i18n";
import {
  getWorkQueueSnapshot,
  subscribeWorkQueue,
  type WorkJobSnapshot,
  type WorkQueueSnapshot,
} from "@/lib/work-queue";

export type LiveWorkQueue = {
  snapshot: WorkQueueSnapshot;
  jobs: readonly WorkJobSnapshot[];
  energyPendingIds: ReadonlySet<string>;
  energyBusy: boolean;
};

export function deriveLiveWorkQueue(snapshot: WorkQueueSnapshot): Omit<LiveWorkQueue, "snapshot"> {
  const jobs = snapshot.jobs.filter(
    (job) => job.status === "queued" || job.status === "running",
  );
  return {
    jobs,
    energyPendingIds: new Set(
      jobs.filter((job) => job.operation === "energy-track").map((job) => job.key),
    ),
    energyBusy: jobs.some((job) => job.operation.startsWith("energy")),
  };
}

export function workQueueStatus(jobs: readonly WorkJobSnapshot[], t: Translate): string | null {
  const queued = jobs.find((job) => job.status === "queued");
  if (queued) {
    return t("builder.work.queuedNamed", {
      label: queued.label,
      target: queued.target ? ` · ${queued.target}` : "",
      position: queued.position,
    });
  }
  const running = jobs.find((job) => job.status === "running");
  return running
    ? t("builder.work.runningNamed", {
        label: running.label,
        target: running.target ? ` · ${running.target}` : "",
      })
    : null;
}

/** React adapter for the process-wide heavy-work queue. */
export function useLiveWorkQueue(): LiveWorkQueue {
  const snapshot = useSyncExternalStore(
    subscribeWorkQueue,
    getWorkQueueSnapshot,
    getWorkQueueSnapshot,
  );
  const derived = useMemo(() => deriveLiveWorkQueue(snapshot), [snapshot]);
  return { snapshot, ...derived };
}
