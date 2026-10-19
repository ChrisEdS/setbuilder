import assert from "node:assert/strict";
import test from "node:test";
import { ENERGY_WINDOW_SECONDS } from "./energy.ts";
import {
  buildPcmWav,
  id3v2Size,
  mp3WindowRange,
  parseWavLayout,
  pcmWindowRange,
  probeMp3,
} from "./decode-window.ts";

/** MPEG1 Layer III, 128 kbps, 44100 Hz, no padding. One frame is 417 bytes. */
function cbrFrame(): Uint8Array {
  const frame = new Uint8Array(417);
  frame[0] = 0xff;
  frame[1] = 0xfb;
  frame[2] = 0x90;
  frame[3] = 0x00;
  return frame;
}

function cbrFile(seconds: number): Uint8Array {
  const frame = cbrFrame();
  const count = Math.ceil(seconds / (1152 / 44100));
  const file = new Uint8Array(count * frame.length);
  for (let i = 0; i < count; i++) file.set(frame, i * frame.length);
  return file;
}

test("a long mp3 energy window is about 45s of the body, not the whole file", () => {
  const file = cbrFile(80);
  const probe = probeMp3(file.subarray(0, 8192), file.length, 0);
  assert.ok(probe);
  assert.ok(probe.durationSeconds > ENERGY_WINDOW_SECONDS);
  const range = mp3WindowRange(probe, file.length);
  assert.ok(range);
  assert.ok(range.start > frameBytes(probe), "window starts after the intro");
  assert.ok(range.end < file.length);
  const seconds = (range.end - range.start) / probe.avgBytesPerSecond;
  assert.ok(seconds > 44 && seconds < 47, `window was ${seconds}s of a ${probe.durationSeconds}s file`);
});

test("a short mp3 is already the energy window", () => {
  const file = cbrFile(20);
  const probe = probeMp3(file, file.length, 0);
  assert.ok(probe);
  assert.equal(mp3WindowRange(probe, file.length), null);
});

test("an id3 tag is not part of the mp3 audio the window is measured from", () => {
  const audio = cbrFile(80);
  const id3 = new Uint8Array(10 + 128);
  id3[0] = 0x49;
  id3[1] = 0x44;
  id3[2] = 0x33;
  id3[3] = 3;
  // Synchsafe size: 128 bytes of tag body after the 10-byte header.
  id3[8] = 0x01;
  const file = new Uint8Array(id3.length + audio.length);
  file.set(id3, 0);
  file.set(audio, id3.length);
  assert.equal(id3v2Size(file), id3.length);
  const probe = probeMp3(file.subarray(id3.length, id3.length + 8192), file.length, id3.length);
  assert.ok(probe);
  const range = mp3WindowRange(probe, file.length);
  assert.ok(range);
  assert.ok(range.start >= id3.length);
  assert.ok(range.end - range.start < audio.length);
});

test("a long wav energy window is 45s starting a fifth of the way in", () => {
  const rate = 8000;
  const pcm = new Uint8Array(rate * 100);
  pcm[20 * rate] = 77;
  const wav = buildPcmWav({
    channels: 1,
    sampleRate: rate,
    bitsPerSample: 8,
    pcm,
  });
  const layout = parseWavLayout(wav);
  assert.ok(layout);
  const range = pcmWindowRange(
    layout.dataOffset,
    layout.dataSize,
    layout.sampleRate,
    layout.blockAlign,
  );
  assert.ok(range);
  assert.equal(range.positioned, true);
  assert.equal(range.end - range.start, ENERGY_WINDOW_SECONDS * rate);
  assert.equal(wav[range.start], 77);
  assert.ok(range.end < wav.length);
});

function frameBytes(probe: { frameBytes: number }): number {
  return probe.frameBytes;
}
