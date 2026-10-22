import assert from "node:assert/strict";
import test from "node:test";
import { libraryTrackToSetTrack, rehydrateStickCovers, type StickTrack } from "./rekordbox-stick.ts";
import { rememberStickFiles } from "./stick-audio.ts";
import { DEFAULT_SET, type SetTrack } from "./set.ts";

function track(partial: Partial<SetTrack> & Pick<SetTrack, "id" | "name">): SetTrack {
  return {
    artists: ["Ada"],
    album: "",
    durationMs: 180_000,
    uri: "",
    externalUrl: "",
    imageUrl: null,
    phase: "lift",
    role: "groove",
    transition: "unset",
    bpm: "128",
    keyCamelot: "8A",
    note: "",
    comment: "",
    safetyAlt: "",
    source: "rekordbox",
    ...partial,
  };
}

function stick(partial: Partial<StickTrack> & Pick<StickTrack, "id" | "title">): StickTrack {
  return {
    artist: "Ada",
    album: "",
    bpm: "128",
    keyRaw: "8A",
    keyCamelot: "8A",
    durationMs: 180_000,
    comment: "",
    energyLevel: 6,
    filePath: "/Ada/Night Drive.mp3",
    artworkPath: "",
    ...partial,
  };
}

test("rehydrateStickCovers puts the file path back without changing order or roles", () => {
  const draft = {
    ...DEFAULT_SET,
    tracks: [
      track({ id: "a", name: "Night Drive", filePath: "/Ada/Night Drive.mp3", role: "anchor" }),
      track({ id: "b", name: "Spare", artists: ["Ada"], role: "safety" }),
    ],
  };
  const next = rehydrateStickCovers(draft, [
    stick({ id: "7", title: "Night Drive", filePath: "/Ada/Night Drive.mp3" }),
    stick({ id: "8", title: "Spare", filePath: "/Ada/Spare.mp3" }),
  ]);
  assert.equal(next.tracks[0].role, "anchor");
  assert.equal(next.tracks[1].role, "safety");
  assert.equal(next.tracks[1].filePath, "/Ada/Spare.mp3");
  assert.equal(next.tracks[0].id, "a");
  assert.equal(next.tracks[0].energyLevel, 6);
  assert.equal(next.tracks[0].energySource, "tag");
});

test("rehydrateStickCovers treats an anonymous Energy 1 as missing", () => {
  const draft = {
    ...DEFAULT_SET,
    tracks: [
      track({
        id: "a",
        name: "Night Drive",
        filePath: "/Ada/Night Drive.mp3",
        energyLevel: 1,
      }),
      track({
        id: "b",
        name: "Kept",
        filePath: "/Ada/Kept.mp3",
        energyLevel: 1,
        energySource: "manual",
      }),
    ],
  };
  const next = rehydrateStickCovers(draft, [
    stick({ id: "7", title: "Night Drive", filePath: "/Ada/Night Drive.mp3", energyLevel: 8 }),
    stick({ id: "8", title: "Kept", filePath: "/Ada/Kept.mp3", energyLevel: 4 }),
  ]);
  assert.equal(next.tracks[0].energyLevel, 8);
  assert.equal(next.tracks[0].energySource, "tag");
  assert.equal(next.tracks[1].energyLevel, 1);
  assert.equal(next.tracks[1].energySource, "manual");
});

test("rehydrateStickCovers uses Collection artwork files, not the MP3 path", () => {
  const jpeg = new File([new Uint8Array([0xff, 0xd8, 0xff])], "a1_m.jpg");
  try {
    Object.defineProperty(jpeg, "webkitRelativePath", {
      value: "PIONEER/Artwork/00001/a1_m.jpg",
      configurable: true,
    });
  } catch {
    /* ignore */
  }
  rememberStickFiles([jpeg]);
  const draft = {
    ...DEFAULT_SET,
    tracks: [
      track({
        id: "a",
        name: "Night Drive",
        filePath: "/Ada/Night Drive.mp3",
      }),
    ],
  };
  const next = rehydrateStickCovers(draft, [
    stick({
      id: "7",
      title: "Night Drive",
      artworkPath: "/PIONEER/Artwork/00001/a1.jpg",
    }),
  ]);
  assert.ok(next.tracks[0].imageUrl?.startsWith("blob:"));
  rememberStickFiles([]);
});

test("a library Energy Level is stored on the set track the row can read", () => {
  const picked = libraryTrackToSetTrack(
    { artist: "Adam Ten", title: "I Never Knew", key: "7A", bpm: "125", energy: 7 },
    "peak",
    "groove",
  );
  assert.equal(picked.energyLevel, 7);
  assert.equal(picked.energySource, "tag");
  const soft = libraryTrackToSetTrack(
    { artist: "Ada", title: "Prior", key: "8A", bpm: "123", energy: 0.62 },
    "peak",
    "groove",
  );
  assert.equal(soft.energyLevel, undefined);
  assert.equal(soft.energySource, undefined);
});

test("rehydrateStickCovers leaves unmatched tracks alone", () => {
  const draft = {
    ...DEFAULT_SET,
    tracks: [track({ id: "a", name: "Other Room", artists: ["Nobody"] })],
  };
  const next = rehydrateStickCovers(draft, [
    stick({ id: "7", title: "Night Drive" }),
  ]);
  assert.equal(next, draft);
});
