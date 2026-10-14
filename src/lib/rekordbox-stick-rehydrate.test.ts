import assert from "node:assert/strict";
import test from "node:test";
import { rehydrateStickCovers, type StickTrack } from "./rekordbox-stick.ts";
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
