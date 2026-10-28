import assert from "node:assert/strict";
import test from "node:test";
import { applyPlaylistLoad, undoPlaylistLoad } from "./playlist-load.ts";
import { DEFAULT_SET, type SetDraft } from "./set.ts";
import type { RekordboxStickSet } from "./rekordbox-stick.ts";

const current: SetDraft = {
  ...DEFAULT_SET,
  title: "Current",
  tracks: [
    {
      id: "old",
      name: "Old",
      artists: ["Ada"],
      album: "",
      durationMs: 120_000,
      uri: "",
      externalUrl: "",
      imageUrl: null,
      phase: "open",
      role: "groove",
      transition: "unset",
      bpm: "",
      keyCamelot: "",
      note: "",
      comment: "",
      source: "rekordbox",
    },
  ],
};

const incoming: RekordboxStickSet = {
  id: "playlist:1",
  name: "Incoming",
  path: "Incoming",
  kind: "playlist",
  missing: 0,
  tracks: [
    {
      id: "new",
      title: "New",
      artist: "Bea",
      album: "",
      durationMs: 180_000,
      bpm: "124",
      keyRaw: "Am",
      keyCamelot: "8A",
      comment: "",
      filePath: "/New.mp3",
    },
  ],
};

test("replace captures the previous draft and undo restores it", () => {
  const result = applyPlaylistLoad(current, incoming, "replace");
  assert.equal(result.draft.title, "Incoming");
  assert.equal(result.undo, current);
  assert.equal(undoPlaylistLoad(result.draft, result.undo), current);
});

test("replace from a stick playlist stores sourcePool on the draft", () => {
  const set: RekordboxStickSet = {
    ...incoming,
    tracks: [
      ...incoming.tracks,
      {
        id: "extra",
        title: "Extra",
        artist: "Cee",
        album: "",
        durationMs: 200_000,
        bpm: "125",
        keyRaw: "Em",
        keyCamelot: "9A",
        comment: "",
        filePath: "/Extra.mp3",
      },
    ],
  };
  const result = applyPlaylistLoad(current, set, "replace");
  assert.equal(result.draft.sourcePool?.length, 2);
  assert.ok(result.draft.sourcePool?.every((track) => track.source === "rekordbox"));
});

test("merge keeps the current brief and does not offer replace undo", () => {
  const result = applyPlaylistLoad(current, incoming, "merge");
  assert.equal(result.draft.title, "Current");
  assert.deepEqual(result.draft.tracks.map((track) => track.name), ["Old", "New"]);
  assert.equal(result.undo, null);
  assert.equal(undoPlaylistLoad(current, null), current);
});
