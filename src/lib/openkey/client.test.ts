import assert from "node:assert/strict";
import test from "node:test";
import { decodeEnergyWindow } from "./client.ts";
import { buildPcmWav } from "./decode-window.ts";

test("decoder failures surface a clear error and never return audio", async () => {
  const previous = globalThis.AudioContext;
  class FailingAudioContext {
    decodeAudioData(): Promise<AudioBuffer> {
      return Promise.reject(new Error("corrupt sample data"));
    }

    close(): Promise<void> {
      return Promise.resolve();
    }
  }
  Object.assign(globalThis, { AudioContext: FailingAudioContext });
  try {
    const wav = buildPcmWav({
      channels: 1,
      sampleRate: 8000,
      bitsPerSample: 16,
      pcm: new Uint8Array(8000 * 2),
    });
    const file = new File([wav], "corrupt.wav", { type: "audio/wav" });
    await assert.rejects(
      decodeEnergyWindow(file),
      /Audio decoder failed: corrupt sample data/,
    );
  } finally {
    Object.assign(globalThis, { AudioContext: previous });
  }
});
