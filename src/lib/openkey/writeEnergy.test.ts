import assert from "node:assert/strict";
import test from "node:test";
import {
  applyEnergyToken,
  energyLevelFromId3,
  readEnergyFields,
  readId3,
  writeEnergy,
  writeTags,
} from "./writeEnergy.ts";

const audio = [0xff, 0xfb, 0x90, 0x64, 0x49, 0x44, 0x33, 0x11, 0x22];

function syncsafe(size: number): number[] {
  return [(size >> 21) & 0x7f, (size >> 14) & 0x7f, (size >> 7) & 0x7f, size & 0x7f];
}

function u32(size: number): number[] {
  return [(size >>> 24) & 0xff, (size >>> 16) & 0xff, (size >>> 8) & 0xff, size & 0xff];
}

function chars(text: string): number[] {
  return [...text].map((char) => char.charCodeAt(0));
}

function frame(version: number, id: string, body: number[]): number[] {
  const size = version === 4 ? syncsafe(body.length) : u32(body.length);
  return [...chars(id), ...size, 0, 0, ...body];
}

function buildTag(options: {
  version?: number;
  frames: number[][];
  padding?: number;
  unsync?: boolean;
  extended?: boolean;
  footer?: boolean;
  audio?: number[];
}): Uint8Array {
  const version = options.version ?? 3;
  let body: number[] = [];
  if (options.extended) {
    body = version === 3 ? [0, 0, 0, 6, 0, 0, 0, 0, 0, 0] : [...syncsafe(6), 1, 0];
  }
  for (const item of options.frames) body.push(...item);
  body.push(...new Array(options.padding ?? 64).fill(0));
  if (options.unsync) body = unsync(body);
  const flags =
    (options.unsync ? 0x80 : 0) | (options.extended ? 0x40 : 0) | (options.footer ? 0x10 : 0);
  const header = [0x49, 0x44, 0x33, version, 0, flags, ...syncsafe(body.length)];
  return Uint8Array.from([
    ...header,
    ...body,
    ...(options.footer ? header : []),
    ...(options.audio ?? audio),
  ]);
}

function unsync(data: number[]): number[] {
  const out: number[] = [];
  for (let i = 0; i < data.length; i++) {
    out.push(data[i]);
    if (data[i] === 0xff && i + 1 < data.length) {
      const next = data[i + 1];
      if (next === 0 || next >= 0xe0) out.push(0);
    }
  }
  return out;
}

function textFrame(version: number, id: string, text: string): number[] {
  return frame(version, id, [0, ...chars(text), 0]);
}

function energyFrame(version: number, value: string): number[] {
  return frame(version, "TXXX", [0, ...chars("EnergyLevel"), 0, ...chars(value), 0]);
}

function commentFrame(version: number, text: string): number[] {
  return frame(version, "COMM", [0, ...chars("eng"), 0, ...chars(text)]);
}

function frameBody(data: Uint8Array, id: string): Uint8Array {
  const found = readId3(data).frames.find((item) => item.id === id);
  if (!found) throw new Error(`missing ${id}`);
  return found.body;
}

test("applyEnergyToken replaces an existing token and appends when there is none", () => {
  assert.equal(applyEnergyToken("Intro | Energy 3", 7), "Intro | Energy 7");
  assert.equal(applyEnergyToken("Energy 3", 7), "Energy 7");
  assert.equal(applyEnergyToken("Live set", 7), "Live set | Energy 7");
  assert.equal(applyEnergyToken("   ", 4), "Energy 4");
});

const geob = [0, 255, 0, 255, 224, 9, 8, 7];
const apic = [0, 1, 2, 255, 0, 3, 4, 5];
const replay = frame(3, "TXXX", [
  0,
  ...chars("REPLAYGAIN_TRACK_GAIN"),
  0,
  ...chars("-6.5"),
  0,
]);
const norm = frame(3, "COMM", [0, ...chars("eng"), ...chars("iTunNORM"), 0, ...chars("abc")]);

function libraryTag(extra: Partial<Parameters<typeof buildTag>[0]> = {}): Uint8Array {
  return buildTag({
    padding: 256,
    frames: [
      textFrame(3, "TIT2", "Song"),
      textFrame(3, "TKEY", "8A"),
      energyFrame(3, "3"),
      commentFrame(3, "Intro | Energy 3"),
      replay,
      norm,
      frame(3, "GEOB", geob),
      frame(3, "APIC", apic),
    ],
    ...extra,
  });
}

test("energyLevelFromId3 reads TXXX and comment tokens", () => {
  assert.equal(energyLevelFromId3(writeEnergy(libraryTag(), 7)), 7);
  assert.equal(energyLevelFromId3(writeEnergy(Uint8Array.from(audio), 4)), 4);
  assert.equal(energyLevelFromId3(Uint8Array.from(audio)), undefined);
});

test("energyLevelFromId3 also checks Grouping, Remixer, Label and Energy TXXX", () => {
  assert.equal(
    energyLevelFromId3(
      buildTag({
        padding: 64,
        frames: [textFrame(3, "TIT1", "7"), frame(3, "GEOB", geob)],
      }),
    ),
    7,
  );
  assert.equal(
    energyLevelFromId3(
      buildTag({
        padding: 64,
        frames: [textFrame(3, "TPE4", "E8"), frame(3, "GEOB", geob)],
      }),
    ),
    8,
  );
  assert.equal(
    energyLevelFromId3(
      buildTag({
        padding: 64,
        frames: [textFrame(3, "TPUB", "6"), frame(3, "GEOB", geob)],
      }),
    ),
    6,
  );
  assert.equal(
    energyLevelFromId3(
      buildTag({
        padding: 64,
        frames: [
          frame(3, "TXXX", [0, ...chars("Energy"), 0, ...chars("9"), 0]),
          frame(3, "GEOB", geob),
        ],
      }),
    ),
    9,
  );
  // ReplayGain must not be read as Energy.
  assert.equal(
    energyLevelFromId3(
      buildTag({
        padding: 64,
        frames: [replay, frame(3, "GEOB", geob)],
      }),
    ),
    undefined,
  );
  // Energy in a non-default comment description still counts.
  assert.equal(
    energyLevelFromId3(
      buildTag({
        padding: 64,
        frames: [
          frame(3, "COMM", [
            0,
            ...chars("eng"),
            ...chars("Mixed In Key"),
            0,
            ...chars("7A - Energy 5"),
          ]),
          frame(3, "GEOB", geob),
        ],
      }),
    ),
    5,
  );
});

test("writeEnergy updates energy and keeps every other frame and the audio", () => {
  const input = libraryTag();
  const output = writeEnergy(input, 7);
  const fields = readEnergyFields(output);
  assert.equal(fields.energyLevel, "7");
  assert.equal(fields.comment, "Intro | Energy 7");
  assert.deepEqual([...frameBody(output, "GEOB")], geob);
  assert.deepEqual([...frameBody(output, "APIC")], apic);
  assert.deepEqual([...frameBody(output, "TKEY")], [0, ...chars("8A"), 0]);
  assert.deepEqual([...frameBody(output, "TIT2")], [0, ...chars("Song"), 0]);
  assert.equal(readId3(output).frames.filter((item) => item.id === "TXXX").length, 2);
  assert.deepEqual([...readId3(output).audio], audio);
  assert.equal(output.length, input.length);
  assert.deepEqual([...input.slice(0, 3)], [0x49, 0x44, 0x33]);
});

test("writeEnergy replaces the energy fields again without growing the file", () => {
  const once = writeEnergy(libraryTag(), 7);
  const twice = writeEnergy(once, 8);
  assert.deepEqual(readEnergyFields(twice), {
    energyLevel: "8",
    comment: "Intro | Energy 8",
  });
  assert.equal(twice.length, once.length);
  assert.deepEqual([...frameBody(twice, "GEOB")], geob);
  assert.equal(readId3(twice).frames.filter((item) => item.id === "TXXX").length, 2);
});

test("writeEnergy prepends a tag when the file has none", () => {
  const bare = Uint8Array.from(audio);
  const output = writeEnergy(bare, 4);
  assert.deepEqual(readEnergyFields(output), { energyLevel: "4", comment: "Energy 4" });
  assert.deepEqual([...readId3(output).audio], audio);
  assert.deepEqual([...bare], audio);
});

test("writeEnergy grows the tag when padding cannot hold the new frames", () => {
  const input = buildTag({
    padding: 0,
    frames: [textFrame(3, "TIT2", "Song"), frame(3, "GEOB", geob)],
  });
  const output = writeEnergy(input, 6);
  assert.ok(output.length > input.length);
  assert.deepEqual([...readId3(output).audio], audio);
  assert.deepEqual([...frameBody(output, "GEOB")], geob);
  assert.equal(readEnergyFields(output).comment, "Energy 6");
});

test("writeEnergy reads an unsynchronised v2.3 tag and writes the marker bytes back", () => {
  const input = buildTag({
    unsync: true,
    padding: 256,
    frames: [textFrame(3, "TIT2", "Song"), frame(3, "GEOB", geob), commentFrame(3, "Live set")],
  });
  const output = writeEnergy(input, 5);
  assert.deepEqual([...frameBody(output, "GEOB")], geob);
  assert.deepEqual([...frameBody(output, "TIT2")], [0, ...chars("Song"), 0]);
  assert.equal(readEnergyFields(output).comment, "Live set | Energy 5");
  assert.deepEqual([...readId3(output).audio], audio);
});

test("writeEnergy keeps a title that follows an extended header", () => {
  for (const version of [3, 4] as const) {
    const input = buildTag({
      version,
      extended: true,
      padding: 128,
      frames: [textFrame(version, "TIT2", "Song"), frame(version, "GEOB", geob)],
    });
    const output = writeEnergy(input, 2);
    assert.deepEqual([...frameBody(output, "TIT2")], [0, ...chars("Song"), 0]);
    assert.deepEqual([...frameBody(output, "GEOB")], geob);
    assert.deepEqual([...readId3(output).audio], audio);
  }
});

test("writeEnergy keeps audio that sits after a v2.4 footer", () => {
  const input = buildTag({
    version: 4,
    footer: true,
    padding: 128,
    frames: [textFrame(4, "TIT2", "Song"), frame(4, "GEOB", geob)],
  });
  const output = writeEnergy(input, 9);
  assert.deepEqual([...readId3(output).audio], audio);
  assert.deepEqual([...frameBody(output, "GEOB")], geob);
  assert.equal(readEnergyFields(output).energyLevel, "9");
});

test("writeEnergy preserves a unicode comment", () => {
  const unicode = frame(3, "COMM", [
    1,
    ...chars("eng"),
    0xff,
    0xfe,
    0x00,
    0x00,
    0xff,
    0xfe,
    0x71,
    0x67,
    0xac,
    0x4e,
  ]);
  const output = writeEnergy(
    buildTag({ padding: 256, frames: [unicode, frame(3, "GEOB", geob)] }),
    7,
  );
  assert.equal(readEnergyFields(output).comment, "東京 | Energy 7");
  assert.deepEqual([...frameBody(output, "GEOB")], geob);
});

test("writeEnergy refuses ID3v2.2 without changing the file", () => {
  const input = Uint8Array.from([0x49, 0x44, 0x33, 2, 0, 0, 0, 0, 0, 0, 0xff, 0xfb]);
  const copy = input.slice();
  assert.throws(() => writeEnergy(input, 5), /ID3v2\.2/);
  assert.deepEqual([...input], [...copy]);
});

test("writeEnergy refuses a compressed comment", () => {
  const comm = frame(3, "COMM", [0, ...chars("eng"), 0, ...chars("Hello")]);
  comm[9] = 0x80;
  const input = buildTag({ padding: 64, frames: [comm] });
  assert.throws(() => writeEnergy(input, 5), /unchanged/);
});

function latinText(body: Uint8Array): string {
  const end = body.indexOf(0, 1);
  return String.fromCharCode(...body.subarray(1, end === -1 ? body.length : end));
}

function taggedLibrary(): Uint8Array {
  return buildTag({
    padding: 256,
    frames: [
      textFrame(3, "TIT2", "Song"),
      textFrame(3, "TKEY", "11B"),
      textFrame(3, "TBPM", "100"),
      energyFrame(3, "4"),
      commentFrame(3, "Intro | Energy 4"),
      frame(3, "GEOB", geob),
    ],
  });
}

test("writeTags writes the musical key into TKEY and leaves energy alone", () => {
  const output = writeTags(taggedLibrary(), { keyLabel: "A minor" });
  assert.equal(latinText(frameBody(output, "TKEY")), "Am");
  assert.deepEqual(readEnergyFields(output), {
    energyLevel: "4",
    comment: "Intro | Energy 4",
  });
  assert.equal(latinText(frameBody(output, "TBPM")), "100");
  assert.deepEqual([...frameBody(output, "GEOB")], geob);
  assert.deepEqual([...readId3(output).audio], audio);
});

test("writeTags writes the Open Key code into TKEY", () => {
  const output = writeTags(taggedLibrary(), { openKey: "8A" });
  assert.equal(latinText(frameBody(output, "TKEY")), "8A");
  assert.equal(readEnergyFields(output).energyLevel, "4");
});

test("writeTags keeps both key names when Open Key and the musical key are selected", () => {
  const output = writeTags(taggedLibrary(), { openKey: "8A", keyLabel: "A minor" });
  assert.equal(latinText(frameBody(output, "TKEY")), "8A");
  const musical = readId3(output).frames.find(
    (item) => item.id === "TXXX" && latinText(item.body) === "MusicalKey",
  );
  assert.ok(musical);
  assert.equal(String.fromCharCode(...musical!.body.subarray(1)), "MusicalKey\0A minor\0");
});

test("writeTags writes BPM and leaves the key tag alone", () => {
  const output = writeTags(taggedLibrary(), { bpm: 128 });
  assert.equal(latinText(frameBody(output, "TBPM")), "128");
  assert.equal(latinText(frameBody(output, "TKEY")), "11B");
  assert.equal(readEnergyFields(output).comment, "Intro | Energy 4");
});

test("writeTags writes a decimal BPM the same way it is shown", () => {
  const output = writeTags(taggedLibrary(), { bpm: 89.14 });
  assert.equal(latinText(frameBody(output, "TBPM")), "89.1");
});

test("writeTags refuses an empty selection", () => {
  assert.throws(() => writeTags(taggedLibrary(), {}), /at least one/);
});
