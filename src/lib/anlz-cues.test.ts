import assert from "node:assert/strict";
import test from "node:test";
import {
  beatsFromBpm,
  cuesMatch,
  barJump,
  nearestDownbeat,
  anlzPathsMatch,
  readAnlzBeatGrid,
  readAnlzContentPath,
  readAnlzHotCues,
  readAnlzPhrases,
  shiftAnlzGrid,
  shiftBeatTimes,
  snapCueTime,
  structureCues,
  writeAnlzHotCues,
  type AnlzPhrase,
  type PhraseName,
} from "./anlz-cues.ts";

function ascii(value: string): Uint8Array {
  return Uint8Array.from(value, (char) => char.charCodeAt(0));
}

function concat(parts: Uint8Array[]): Uint8Array {
  const out = new Uint8Array(parts.reduce((sum, part) => sum + part.length, 0));
  let offset = 0;
  for (const part of parts) {
    out.set(part, offset);
    offset += part.length;
  }
  return out;
}

function emptyTag(kind: string, header: number, type: number): Uint8Array {
  const tag = new Uint8Array(header);
  const view = new DataView(tag.buffer);
  tag.set(ascii(kind), 0);
  view.setUint32(4, header, false);
  view.setUint32(8, header, false);
  view.setUint32(12, type, false);
  view.setUint32(16, 0, false);
  if (header >= 24) view.setUint32(20, 0xffffffff, false);
  return tag;
}

function pmai(tags: Uint8Array[]): Uint8Array {
  const body = concat(tags);
  const out = new Uint8Array(28 + body.length);
  const view = new DataView(out.buffer);
  out.set(ascii("PMAI"), 0);
  view.setUint32(4, 28, false);
  view.setUint32(8, out.length, false);
  out.set(body, 28);
  return out;
}

const capturedEntry = Uint8Array.from(
  "504350540000001c00000038000000020000000000010000ffffffff010003e8000001e5ffffffff00000000000000000000000000000000".match(
    /../g,
  )!.map((byte) => Number.parseInt(byte, 16)),
);

test("a captured hot cue is read at its millisecond", () => {
  const tag = new Uint8Array(24 + capturedEntry.length);
  const view = new DataView(tag.buffer);
  tag.set(ascii("PCOB"), 0);
  view.setUint32(4, 0x18, false);
  view.setUint32(8, tag.length, false);
  view.setUint32(12, 1, false);
  view.setUint32(16, 1, false);
  view.setUint32(20, 0xffffffff, false);
  tag.set(capturedEntry, 24);
  const cues = readAnlzHotCues(pmai([tag, emptyTag("PCOB", 24, 0)]));
  assert.deepEqual(cues, [{ slot: 1, timeMs: 485, name: "" }]);
});

test("hot cues round-trip at an exact millisecond and leave memory cues alone", () => {
  const original = pmai([
    emptyTag("PWAV", 20, 0),
    emptyTag("PCOB", 24, 1),
    emptyTag("PCOB", 24, 0),
    emptyTag("PCO2", 20, 1),
  ]);
  const memoryBefore = original.slice();
  const written = writeAnlzHotCues(original, [
    { slot: 0, timeMs: 125_000, name: "Drop" },
    { slot: 3, timeMs: 800, name: "Intro" },
  ]);
  assert.equal(written.wrote, true);
  const cues = readAnlzHotCues(written.bytes);
  assert.deepEqual(
    cues.map((cue) => [cue.slot, cue.timeMs, cue.name]),
    [
      [0, 125_000, "Drop"],
      [3, 800, "Intro"],
    ],
  );
  assert.equal(
    cuesMatch(cues, [
      { slot: 3, timeMs: 800, name: "" },
      { slot: 0, timeMs: 125_000, name: "" },
    ]),
    true,
  );
  const view = new DataView(written.bytes.buffer, written.bytes.byteOffset, written.bytes.byteLength);
  assert.equal(view.getUint32(8, false), written.bytes.length);
  const memoryOffset = 28 + 20 + (24 + 2 * 56);
  assert.equal(String.fromCharCode(...written.bytes.subarray(memoryOffset, memoryOffset + 4)), "PCOB");
  assert.equal(new DataView(written.bytes.buffer).getUint32(memoryOffset + 12, false), 0);
  assert.equal(memoryBefore[0], written.bytes[0]);
});

test("the analysis path is the link to the track, not the database id", () => {
  const path = "/Contents/Bless You/Gotta Move/Bless You - Gotta Move.mp3";
  const encoded = new Uint8Array(path.length * 2);
  const view = new DataView(encoded.buffer);
  for (let index = 0; index < path.length; index += 1) view.setUint16(index * 2, path.charCodeAt(index), false);
  const tag = new Uint8Array(16 + encoded.length);
  const tagView = new DataView(tag.buffer);
  tag.set(ascii("PPTH"), 0);
  tagView.setUint32(4, 0x10, false);
  tagView.setUint32(8, tag.length, false);
  tagView.setUint32(12, encoded.length, false);
  tag.set(encoded, 16);
  assert.equal(readAnlzContentPath(pmai([tag])), path);
  assert.equal(anlzPathsMatch(`\\${path}`, path), true);
  assert.equal(anlzPathsMatch("/Contents/Other.mp3", path), false);
});

test("a real PQTZ grid keeps the first-beat offset instead of starting at zero", () => {
  const tag = new Uint8Array(24 + 32);
  const view = new DataView(tag.buffer);
  tag.set(ascii("PQTZ"), 0);
  view.setUint32(4, 0x18, false);
  view.setUint32(8, tag.length, false);
  view.setUint32(16, 0x00080000, false);
  view.setUint32(20, 4, false);
  const rows: Array<[number, number, number]> = [
    [3, 11100, 436],
    [4, 11100, 976],
    [1, 11100, 1517],
    [2, 11100, 2057],
  ];
  rows.forEach(([beat, tempo, time], index) => {
    const offset = 24 + index * 8;
    view.setUint16(offset, beat, false);
    view.setUint16(offset + 2, tempo, false);
    view.setUint32(offset + 4, time, false);
  });
  const beats = readAnlzBeatGrid(pmai([tag]));
  assert.deepEqual(beats?.[0], { timeMs: 436, beat: 3 });
  assert.deepEqual(beats?.[2], { timeMs: 1517, beat: 1 });
  assert.equal(nearestDownbeat(0, beats ?? []), 1517);
  assert.equal(barJump(500, 10_000, beats ?? [], 1), 1517);
});

test("a stored beat grid is read at its millisecond and beat 1 is the downbeat", () => {
  const beats = new Uint8Array(24 + 16);
  const view = new DataView(beats.buffer);
  beats.set(ascii("PQTZ"), 0);
  view.setUint32(4, 0x18, false);
  view.setUint32(8, beats.length, false);
  view.setUint32(16, 0x00800000, false);
  view.setUint32(20, 2, false);
  view.setUint16(24, 1, false);
  view.setUint16(26, 12_000, false);
  view.setUint32(28, 500, false);
  view.setUint16(32, 2, false);
  view.setUint16(34, 12_000, false);
  view.setUint32(36, 1000, false);
  assert.deepEqual(readAnlzBeatGrid(pmai([beats])), [
    { timeMs: 500, beat: 1 },
    { timeMs: 1000, beat: 2 },
  ]);
  assert.equal(readAnlzBeatGrid(pmai([emptyTag("PWAV", 20, 0)])), null);
});

test("a cue snaps to the nearest downbeat and ignores beats 2 to 4", () => {
  const grid = beatsFromBpm(120, 4000);
  assert.equal(nearestDownbeat(700, grid), 0);
  assert.equal(nearestDownbeat(1100, grid), 2000);
  assert.equal(nearestDownbeat(1500, grid), 2000);
});

test("arrow keys step one bar and land on downbeats", () => {
  const grid = beatsFromBpm(120, 4000);
  assert.equal(barJump(0, 4000, grid, 1), 2000);
  assert.equal(barJump(0, 4000, grid, -1), 0);
  assert.equal(barJump(700, 4000, grid, 1), 2000);
  assert.equal(barJump(700, 4000, grid, -1), 0);
  assert.equal(barJump(2000, 4000, grid, 1), 4000);
  assert.equal(barJump(2000, 4000, grid, -1), 0);
  assert.equal(barJump(4000, 4000, grid, 1), 4000);
  assert.equal(barJump(1500, 4000, [], 1), 1500);
});

test("a bpm fallback starts at zero and counts four beats to the bar", () => {
  const beats = beatsFromBpm(120, 2000);
  assert.deepEqual(beats.slice(0, 5), [
    { timeMs: 0, beat: 1 },
    { timeMs: 500, beat: 2 },
    { timeMs: 1000, beat: 3 },
    { timeMs: 1500, beat: 4 },
    { timeMs: 2000, beat: 1 },
  ]);
});

function phrase(name: PhraseName, timeMs: number, endMs: number): AnlzPhrase {
  return { beat: 1, endBeat: 2, timeMs, endMs, name };
}

test("structure cues follow the song places and skip a point in the same bar", () => {
  const beats = beatsFromBpm(120, 50_000);
  const song = [
    phrase("intro", 0, 4000),
    phrase("verse1", 8000, 16_000),
    phrase("chorus", 16_000, 24_000),
    phrase("down", 32_000, 40_000),
    phrase("chorus2", 40_000, 48_000),
    phrase("outro", 48_000, 50_000),
  ];
  assert.deepEqual(
    structureCues(song, beats, true).map((cue) => [cue.slot, cue.timeMs, cue.label]),
    [
      [0, 0, "start"],
      [1, 4000, "entry"],
      [2, 8000, "verse"],
      [3, 16_000, "drop"],
      [4, 24_000, "dropEnd"],
      [5, 40_000, "drop2"],
      [6, 32_000, "break"],
      [7, 48_000, "outro"],
    ],
  );
  const tight = [
    phrase("intro", 0, 4000),
    phrase("verse1", 4000, 8000),
    phrase("chorus", 16_000, 24_000),
  ];
  const collapsed = structureCues(tight, beats, true);
  assert.equal(collapsed.find((cue) => cue.label === "verse"), undefined);
  assert.equal(collapsed.find((cue) => cue.label === "entry")?.timeMs, 4000);
  const offGrid = [phrase("intro", 0, 4100), phrase("chorus", 16_100, 24_000)];
  const snapped = structureCues(offGrid, beats, true);
  assert.equal(snapped.find((cue) => cue.label === "entry")?.timeMs, 4000);
  assert.equal(snapped.find((cue) => cue.label === "drop")?.timeMs, 16_000);
  const faster = [
    ...beatsFromBpm(120, 8000),
    ...beatsFromBpm(160, 8000).map((beat) => ({ beat: beat.beat, timeMs: beat.timeMs + 8000 })),
  ];
  const late = [phrase("chorus", 8000, 9600), phrase("chorus2", 11_200, 14_000)];
  assert.equal(structureCues(late, faster, false).find((cue) => cue.label === "drop2")?.timeMs, 11_200);
  assert.deepEqual(structureCues([], beats, true), []);
  assert.deepEqual(structureCues(null, beats, true), []);
});

test("quantize off keeps the cue time and on snaps to the downbeat", () => {
  const grid = beatsFromBpm(120, 4000);
  assert.equal(snapCueTime(1100, grid, false), 1100);
  assert.equal(snapCueTime(1100, grid, true), 2000);
});

test("a grid shift adds the same delta and refuses a step before zero", () => {
  const grid = [
    { timeMs: 436, beat: 3 },
    { timeMs: 1517, beat: 1 },
  ];
  assert.deepEqual(shiftBeatTimes(grid, 5), [
    { timeMs: 441, beat: 3 },
    { timeMs: 1522, beat: 1 },
  ]);
  assert.equal(shiftBeatTimes(grid, -500), null);
  assert.equal(grid[0]?.timeMs, 436);
});

test("shifting the file moves PQTZ and the PQT2 anchors and leaves the PQT2 body", () => {
  const pqtz = new Uint8Array(24 + 8);
  const grid = new DataView(pqtz.buffer);
  pqtz.set(ascii("PQTZ"), 0);
  grid.setUint32(4, 0x18, false);
  grid.setUint32(8, pqtz.length, false);
  grid.setUint32(20, 1, false);
  grid.setUint16(24, 1, false);
  grid.setUint16(26, 10_000, false);
  grid.setUint32(28, 1000, false);
  const pqt2 = new Uint8Array(60);
  const ext = new DataView(pqt2.buffer);
  pqt2.set(ascii("PQT2"), 0);
  ext.setUint32(4, 0x38, false);
  ext.setUint32(8, pqt2.length, false);
  ext.setUint16(24, 1, false);
  ext.setUint16(26, 10_000, false);
  ext.setUint32(28, 1000, false);
  ext.setUint16(32, 2, false);
  ext.setUint16(34, 10_000, false);
  ext.setUint32(36, 1500, false);
  pqt2.set([0x11, 0x22, 0x33, 0x44], 56);
  const dat = pmai([pqtz]);
  const extended = pmai([pqt2]);
  const shifted = shiftAnlzGrid(dat, extended, 5);
  assert.equal(readAnlzBeatGrid(shifted?.dat ?? dat)?.[0]?.timeMs, 1005);
  assert.equal(new DataView((shifted?.ext ?? extended).buffer).getUint32(28 + 28, false), 1005);
  assert.deepEqual([...(shifted?.ext ?? extended).subarray(28 + 56, 28 + 60)], [0x11, 0x22, 0x33, 0x44]);
  assert.equal(shiftAnlzGrid(dat, extended, -2000), null);
  assert.equal(readAnlzBeatGrid(dat)?.[0]?.timeMs, 1000);
});

function maskedPhrases(): Uint8Array {
  const tag = new Uint8Array(32 + 48);
  const view = new DataView(tag.buffer);
  tag.set(ascii("PSSI"), 0);
  view.setUint32(4, 0x20, false);
  view.setUint32(8, tag.length, false);
  view.setUint32(12, 24, false);
  view.setUint16(16, 2, false);
  view.setUint16(18, 1, false);
  view.setUint16(26, 4, false);
  view.setUint16(32, 1, false);
  view.setUint16(34, 1, false);
  view.setUint16(36, 1, false);
  tag[39] = 1;
  view.setUint16(56, 2, false);
  view.setUint16(58, 3, false);
  view.setUint16(60, 6, false);
  tag[63] = 1;
  const mask = [0xcb, 0xe1, 0xee, 0xfa, 0xe5, 0xee, 0xad, 0xee, 0xe9, 0xd2, 0xe9, 0xeb, 0xe1, 0xe9, 0xf3, 0xe8, 0xe9, 0xf4, 0xe1].map(
    (byte) => (byte + 2) & 0xff,
  );
  for (let index = 18; index < tag.length; index += 1) tag[index] = (tag[index] ?? 0) ^ (mask[(index - 18) % mask.length] ?? 0);
  return tag;
}

test("a masked phrase tag reads intro at the first grid beat and outro at the end", () => {
  const beats = beatsFromBpm(120, 2000);
  const phrases = readAnlzPhrases(pmai([maskedPhrases()]), beats);
  assert.equal(phrases?.[0]?.name, "intro1");
  assert.equal(phrases?.[0]?.beat, 1);
  assert.equal(phrases?.[0]?.timeMs, 0);
  assert.equal(phrases?.[1]?.name, "outro1");
  assert.equal(phrases?.[1]?.beat, 3);
  assert.equal(phrases?.[1]?.timeMs, 1000);
  assert.equal(phrases?.[1]?.endMs, 1500);
});

test("a file without a hot-cue tag is left unchanged", () => {
  const original = pmai([emptyTag("PCOB", 24, 0)]);
  const written = writeAnlzHotCues(original, [{ slot: 0, timeMs: 1000, name: "A" }]);
  assert.equal(written.wrote, false);
  assert.equal(written.bytes, original);
});
