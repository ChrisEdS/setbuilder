import assert from "node:assert/strict";
import test from "node:test";
import { enqueueWork, workQueueDepth } from "./work-queue.ts";

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
