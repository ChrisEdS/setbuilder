import assert from "node:assert/strict";
import test from "node:test";
import { tEn } from "./i18n/core.ts";
import { deriveLiveWorkQueue, workQueueStatus } from "./work-queue-react.ts";
import type { WorkQueueSnapshot } from "./work-queue.ts";

const snapshot: WorkQueueSnapshot = {
  count: 3,
  jobs: [
    {
      id: "running",
      operation: "energy-track",
      key: "track-a",
      label: "Measure energy",
      target: "A",
      status: "running",
      position: 0,
    },
    {
      id: "queued",
      operation: "stick-read",
      key: "stick",
      label: "Read stick",
      status: "queued",
      position: 1,
    },
    {
      id: "done",
      operation: "energy-track",
      key: "track-b",
      label: "Measure energy",
      status: "succeeded",
      position: 0,
    },
  ],
};

test("derives live and energy queue state without completed history", () => {
  const view = deriveLiveWorkQueue(snapshot);
  assert.deepEqual(view.jobs.map((job) => job.id), ["running", "queued"]);
  assert.deepEqual([...view.energyPendingIds], ["track-a"]);
  assert.equal(view.energyBusy, true);
});

test("queue status prioritizes the next waiting job", () => {
  const view = deriveLiveWorkQueue(snapshot);
  assert.match(workQueueStatus(view.jobs, tEn) ?? "", /Read stick/);
  assert.equal(workQueueStatus([], tEn), null);
});
