import assert from "node:assert/strict";
import test from "node:test";
import { probeStickAlive } from "./stick-alive.ts";
import { rememberStickFiles } from "./stick-audio.ts";

test("probeStickAlive is idle with no stick session", async () => {
  rememberStickFiles([]);
  assert.equal(await probeStickAlive(), "idle");
});

test("probeStickAlive is alive when a remembered File still reads", async () => {
  const file = new File([new Uint8Array([1, 2, 3])], "Night.mp3", {
    type: "audio/mpeg",
  });
  Object.defineProperty(file, "webkitRelativePath", {
    value: "Stick/Contents/Night.mp3",
    configurable: true,
  });
  rememberStickFiles([file]);
  assert.equal(await probeStickAlive("Contents/Night.mp3"), "alive");
  rememberStickFiles([]);
});

test("probeStickAlive is gone when a remembered File throws on read", async () => {
  const file = new File([new Uint8Array([1])], "Gone.mp3", { type: "audio/mpeg" });
  Object.defineProperty(file, "webkitRelativePath", {
    value: "Stick/Contents/Gone.mp3",
    configurable: true,
  });
  Object.defineProperty(file, "slice", {
    value() {
      return {
        arrayBuffer() {
          return Promise.reject(
            Object.assign(new Error("The requested file could not be read."), {
              name: "NotReadableError",
            }),
          );
        },
      };
    },
    configurable: true,
  });
  rememberStickFiles([file]);
  assert.equal(await probeStickAlive("Contents/Gone.mp3"), "gone");
  rememberStickFiles([]);
});
