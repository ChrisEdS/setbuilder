import assert from "node:assert/strict";
import test from "node:test";
import {
  cancelWorkJob,
  enqueueWork,
  getWorkQueueSnapshot,
  subscribeWorkQueue,
  workQueueDepth,
} from "./work-queue.ts";

test("enqueueWork runs heavy jobs one after another", async () => {
  const order: string[] = [];
  const first = enqueueWork(async () => {
    order.push("a-start");
    assert.equal(workQueueDepth() >= 1, true);
    await new Promise((resolve) => setTimeout(resolve, 20));
    order.push("a-end");
  });
  const second = enqueueWork(async () => {
    order.push("b");
  });
  assert.equal(workQueueDepth() >= 2, true);
  await Promise.all([first, second]);
  assert.deepEqual(order, ["a-start", "a-end", "b"]);
  assert.equal(workQueueDepth(), 0);
});

test("named work is deduplicated and exposes live positions", async () => {
  let release!: () => void;
  let runs = 0;
  const changed: number[] = [];
  const unsubscribe = subscribeWorkQueue(() => {
    changed.push(getWorkQueueSnapshot().count);
  });
  const first = enqueueWork(
    async () => {
      runs += 1;
      await new Promise<void>((resolve) => {
        release = resolve;
      });
      return 7;
    },
    { operation: "energy", key: "track-a", label: "Measure energy", target: "A" },
  );
  const duplicate = enqueueWork(
    async () => 9,
    { operation: "energy", key: "track-a", label: "Measure energy", target: "A" },
  );
  const second = enqueueWork(
    async () => 11,
    { operation: "energy", key: "track-b", label: "Measure energy", target: "B" },
  );
  assert.equal(first, duplicate);
  assert.equal(getWorkQueueSnapshot().count, 2);
  assert.equal(
    getWorkQueueSnapshot().jobs.find((job) => job.key === "track-b")?.position,
    1,
  );
  release();
  assert.deepEqual(await Promise.all([first, duplicate, second]), [7, 7, 11]);
  assert.equal(runs, 1);
  assert.equal(getWorkQueueSnapshot().count, 0);
  assert.ok(changed.includes(2));
  unsubscribe();
});

test("a queued named job can be cancelled", async () => {
  let release!: () => void;
  const running = enqueueWork(
    () =>
      new Promise<void>((resolve) => {
        release = resolve;
      }),
    { operation: "stick", key: "first", label: "Read stick" },
  );
  const queued = enqueueWork(
    async () => undefined,
    { operation: "stick", key: "second", label: "Read stick" },
  );
  assert.equal(cancelWorkJob("stick", "second"), true);
  await assert.rejects(queued, /cancelled/);
  release();
  await running;
});
