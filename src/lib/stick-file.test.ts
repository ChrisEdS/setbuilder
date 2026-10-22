import assert from "node:assert/strict";
import test from "node:test";
import {
  applyCoverUrls,
  applyEnergyLevels,
  applyMeasuredEnergy,
  applyRereadEnergyLevels,
  isWritableMp3,
  writeVerifiedStickFileBytes,
} from "./stick-file.ts";
import { DEFAULT_SET, type SetTrack } from "./set.ts";
import type { FileLike } from "./rekordbox-stick-write.ts";

class MemoryFile implements FileLike {
  name = "track.mp3";
  data: Uint8Array;
  commits = 0;
  mutateRead = false;
  failCommit = false;

  constructor(data: number[]) {
    this.data = new Uint8Array(data);
  }

  async getFile() {
    const copy = this.data.slice();
    if (this.mutateRead && this.commits === 1) copy[0] ^= 0xff;
    return { size: copy.length, arrayBuffer: async () => copy.buffer as ArrayBuffer };
  }

  async createWritable() {
    let pending: Uint8Array | null = null;
    return {
      write: async (data: ArrayBuffer | Uint8Array) => {
        pending = new Uint8Array(data).slice();
      },
      close: async () => {
        this.commits += 1;
        if (this.failCommit && this.commits === 1) {
          this.data = new Uint8Array([9, 9]);
          throw new Error("commit failed");
        }
        if (pending) this.data = pending;
      },
      abort: async () => undefined,
    };
  }
}

test("verified stick writes commit and verify exact bytes", async () => {
  const file = new MemoryFile([1, 2, 3]);
  await writeVerifiedStickFileBytes(file, new Uint8Array([4, 5, 6]));
  assert.deepEqual([...file.data], [4, 5, 6]);
  assert.equal(file.commits, 1);
});

test("verified stick writes restore after corrupted read-back", async () => {
  const file = new MemoryFile([1, 2, 3]);
  file.mutateRead = true;
  await assert.rejects(
    writeVerifiedStickFileBytes(file, new Uint8Array([4, 5, 6])),
    /did not match/,
  );
  assert.deepEqual([...file.data], [1, 2, 3]);
  assert.equal(file.commits, 2);
});

test("verified stick writes restore after a thrown commit", async () => {
  const file = new MemoryFile([1, 2, 3]);
  file.failCommit = true;
  await assert.rejects(
    writeVerifiedStickFileBytes(file, new Uint8Array([4, 5, 6])),
    /commit failed/,
  );
  assert.deepEqual([...file.data], [1, 2, 3]);
  assert.equal(file.commits, 2);
});

test("isWritableMp3 accepts mp3 names and MPEG types", () => {
  assert.equal(isWritableMp3(new File([], "track.mp3")), true);
  assert.equal(isWritableMp3(new File([], "TRACK.MP3")), true);
  assert.equal(isWritableMp3(new File([], "a.wav", { type: "audio/mpeg" })), true);
  assert.equal(isWritableMp3(new File([], "x"), "/Contents/Song.mp3"), true);
  assert.equal(isWritableMp3(new File([], "track.flac")), false);
  assert.equal(isWritableMp3(new File([], "track.aiff")), false);
});

function setTrack(partial: Partial<SetTrack> & Pick<SetTrack, "id">): SetTrack {
  return {
    name: "Night",
    artists: ["Ada"],
    album: "",
    durationMs: 1,
    uri: "",
    externalUrl: "",
    imageUrl: null,
    phase: "peak",
    role: "groove",
    transition: "unset",
    bpm: "",
    keyCamelot: "",
    note: "",
    safetyAlt: "",
    ...partial,
  };
}

test("applyEnergyLevels fills a missing level and an anonymous 1 from the tag", () => {
  const draft = {
    ...DEFAULT_SET,
    tracks: [
      setTrack({ id: "bare" }),
      setTrack({ id: "placeholder", energyLevel: 1 }),
      setTrack({ id: "hand", energyLevel: 1, energySource: "manual" }),
      setTrack({ id: "kept", energyLevel: 6 }),
    ],
  };
  const next = applyEnergyLevels(
    draft,
    new Map([
      ["bare", 4],
      ["placeholder", 9],
      ["hand", 2],
      ["kept", 3],
    ]),
  );
  assert.equal(next.tracks[0].energyLevel, 4);
  assert.equal(next.tracks[0].energySource, "tag");
  assert.equal(next.tracks[1].energyLevel, 9);
  assert.equal(next.tracks[1].energySource, "tag");
  assert.equal(next.tracks[2].energyLevel, 1);
  assert.equal(next.tracks[2].energySource, "manual");
  assert.equal(next.tracks[3].energyLevel, 6);
  assert.equal(next.tracks[3].energySource, undefined);
});

test("applyCoverUrls fills only tracks that still have no image", () => {
  const draft = {
    ...DEFAULT_SET,
    tracks: [
      setTrack({ id: "bare" }),
      setTrack({ id: "kept", imageUrl: "https://i.scdn.co/ok.jpg" }),
    ],
    sourcePool: [setTrack({ id: "pool" })],
  };
  const next = applyCoverUrls(
    draft,
    new Map([
      ["bare", "blob:cover-a"],
      ["kept", "blob:cover-b"],
      ["pool", "blob:cover-c"],
    ]),
  );
  assert.equal(next.tracks[0].imageUrl, "blob:cover-a");
  assert.equal(next.tracks[1].imageUrl, "https://i.scdn.co/ok.jpg");
  assert.equal(next.sourcePool?.[0].imageUrl, "blob:cover-c");
});

test("a finished OpenKey reading lands on the track and survives as a known level", () => {
  const draft = {
    ...DEFAULT_SET,
    tracks: [
      setTrack({ id: "a", filePath: "/Ada/Never Knew.mp3" }),
      setTrack({ id: "b", filePath: "/Ada/Anchor.mp3", energyLevel: 4, energySource: "manual" }),
      setTrack({ id: "c" }),
    ],
    sourcePool: [setTrack({ id: "pool", filePath: "/Ada/Never Knew.mp3" })],
  };
  const levels = new Map([
    ["a", { energy: 7, source: "measured" as const, filePath: "/Ada/Never Knew.mp3" }],
    ["missing", { energy: 1, source: "measured" as const, filePath: "/nope.mp3" }],
  ]);
  const filled = applyMeasuredEnergy(draft, levels, "fill");
  assert.equal(filled.tracks[0].energyLevel, 7);
  assert.equal(filled.tracks[0].energySource, "measured");
  assert.equal(filled.tracks[1].energyLevel, 4);
  assert.equal(filled.tracks[1].energySource, "manual");
  assert.equal(filled.sourcePool?.[0].energyLevel, 7);
  assert.equal(filled.sourcePool?.[0].energySource, "measured");
  const replaced = applyMeasuredEnergy(
    filled,
    new Map([["b", { energy: 9, source: "measured" as const, filePath: "/Ada/Anchor.mp3" }]]),
    "replace",
  );
  assert.equal(replaced.tracks[1].energyLevel, 9);
  assert.equal(replaced.tracks[1].energySource, "measured");
  const bogus = applyMeasuredEnergy(
    draft,
    new Map([["c", { energy: 0, source: "measured" as const, filePath: "" }]]),
  );
  assert.equal(bogus, draft);
});

test("applyRereadEnergyLevels replaces a known level with the tag", () => {
  const draft = {
    ...DEFAULT_SET,
    tracks: [
      setTrack({ id: "measured", energyLevel: 8, energySource: "measured" }),
      setTrack({ id: "untagged", energyLevel: 4, energySource: "manual" }),
    ],
  };
  const next = applyRereadEnergyLevels(draft, new Map([["measured", 5]]));
  assert.equal(next.tracks[0].energyLevel, 5);
  assert.equal(next.tracks[0].energySource, "tag");
  assert.equal(next.tracks[1].energyLevel, 4);
  assert.equal(next.tracks[1].energySource, "manual");
});
