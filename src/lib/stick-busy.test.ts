import assert from "node:assert/strict";
import test from "node:test";
import { LocalizedError } from "@/lib/i18n/error";
import {
  getStickFile,
  isResourceBusy,
  isStickReadBusy,
  readBlobBuffer,
  stickReadBusyError,
  withBusyRetry,
} from "./stick-busy.ts";

test("isResourceBusy matches Node EBUSY and Resource busy text", () => {
  assert.equal(
    isResourceBusy(Object.assign(new Error("EBUSY: resource busy or locked, open"), { code: "EBUSY" })),
    true,
  );
  assert.equal(isResourceBusy(new Error("Resource busy")), true);
  assert.equal(isResourceBusy(new Error("sharing violation")), true);
  assert.equal(isResourceBusy(new Error("no such file")), false);
  assert.equal(isResourceBusy(new Error("Permission denied")), false);
});

test("withBusyRetry succeeds after a short EBUSY, then maps leftover busy to readBusy", async () => {
  let hits = 0;
  const value = await withBusyRetry(
    async () => {
      hits += 1;
      if (hits < 3) {
        throw Object.assign(new Error("resource busy or locked"), { code: "EBUSY" });
      }
      return "ok";
    },
    { waitMs: 0 },
  );
  assert.equal(value, "ok");
  assert.equal(hits, 3);

  await assert.rejects(
    () =>
      withBusyRetry(
        async () => {
          throw Object.assign(new Error("resource busy or locked"), { code: "EBUSY" });
        },
        { attempts: 2, waitMs: 0 },
      ),
    (error: unknown) => isResourceBusy(error),
  );
});

test("withBusyRetry does not retry a permission error", async () => {
  let hits = 0;
  await assert.rejects(
    () =>
      withBusyRetry(async () => {
        hits += 1;
        throw new Error("Permission denied");
      }),
    /Permission denied/,
  );
  assert.equal(hits, 1);
});

test("getStickFile and readBlobBuffer become stickReadBusy after retries", async () => {
  const busy = Object.assign(new Error("resource busy or locked"), { code: "EBUSY" });
  await assert.rejects(
    () =>
      getStickFile({
        getFile: async () => {
          throw busy;
        },
      }),
    (error: unknown) => error instanceof LocalizedError && error.key === "exports.stick.readBusy",
  );
  await assert.rejects(
    () =>
      readBlobBuffer({
        arrayBuffer: async () => {
          throw busy;
        },
      }),
    (error: unknown) => isStickReadBusy(error),
  );
  assert.equal(stickReadBusyError().key, "exports.stick.readBusy");
});
