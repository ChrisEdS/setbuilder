import assert from "node:assert/strict";
import test from "node:test";
import { DEFAULT_SET, type SetDraft, type SetTrack } from "./set.ts";
import {
  applyStickSet,
  draftWithPlaylistPool,
  playlistPoolForDraft,
  sourcePoolFromStickSet,
  type RekordboxStickSet,
  type StickTrack,
} from "./rekordbox-stick.ts";
import { applyPlaylistLoad } from "./playlist-load.ts";
import { rankPoolReplacements } from "./replace-track.ts";

function stickTrack(id: string, title: string, over: Partial<StickTrack> = {}): StickTrack {
  return {
    id,
    title,
    artist: over.artist ?? "Artist",
    album: "",
    bpm: over.bpm ?? "124",
    keyRaw: over.keyCamelot ?? "8A",
    keyCamelot: over.keyCamelot ?? "8A",
    durationMs: over.durationMs ?? 180_000,
    comment: "",
    filePath: over.filePath ?? `/${title}.mp3`,
    energyLevel: over.energyLevel,
  };
}

function playlist(
  name: string,
  tracks: StickTrack[],
  id = `playlist:${name}`,
): RekordboxStickSet {
  return {
    id,
    name,
    path: name,
    kind: "playlist",
    missing: 0,
    tracks,
  };
}

function performanceTrack(id: string, name: string, over: Partial<SetTrack> = {}): SetTrack {
  return {
    id,
    name,
    artists: [over.artists?.[0] ?? "Artist"],
    album: "",
    durationMs: 180_000,
    uri: "",
    externalUrl: "",
    imageUrl: null,
    phase: "lift",
    role: over.role ?? "groove",
    transition: "unset",
    bpm: over.bpm ?? "124",
    keyCamelot: over.keyCamelot ?? "8A",
    energyLevel: over.energyLevel ?? 6,
    note: "",
    comment: "",
    filePath: over.filePath ?? `/${name}.mp3`,
    source: "rekordbox",
    why: "",
    safetyAlt: "",
    ...over,
  };
}

test("load-as-set attaches sourcePool for a stick playlist", () => {
  const set = playlist("Friday", [
    stickTrack("1", "One"),
    stickTrack("2", "Two"),
    stickTrack("3", "Three"),
  ]);
  const draft = applyStickSet(DEFAULT_SET, set);
  assert.equal(draft.sourcePool?.length, 3);
  assert.equal(draft.sourcePool?.[0].id, "rekordbox:playlist:Friday:1:0");
  assert.equal(draft.title, "Friday");
});

test("load-as-set does not attach sourcePool for history", () => {
  const set: RekordboxStickSet = {
    ...playlist("Session", [stickTrack("1", "One"), stickTrack("2", "Two")]),
    kind: "history",
    id: "history:1",
  };
  const draft = applyStickSet(DEFAULT_SET, set);
  assert.equal(draft.sourcePool, undefined);
});

test("playlist load replace keeps the playlist pool on the draft", () => {
  const set = playlist("Night", [
    stickTrack("a", "Alpha"),
    stickTrack("b", "Beta"),
    stickTrack("c", "Gamma"),
  ]);
  const result = applyPlaylistLoad(DEFAULT_SET, set, "replace");
  assert.equal(result.draft.sourcePool?.length, 3);
});

test("playlistPoolForDraft prefers the stored sourcePool", () => {
  const stored = sourcePoolFromStickSet(
    playlist("Stored", [stickTrack("1", "One"), stickTrack("2", "Two")]),
  );
  const live = playlist("Live", [
    stickTrack("9", "Nine"),
    stickTrack("8", "Eight"),
    stickTrack("7", "Seven"),
  ]);
  const draft: SetDraft = {
    ...DEFAULT_SET,
    title: "Live",
    sourcePool: stored,
    tracks: [performanceTrack("x", "One")],
  };
  const pool = playlistPoolForDraft(draft, [live]);
  assert.equal(pool.length, 2);
  assert.equal(pool[0].name, "One");
});

test("playlistPoolForDraft rebuilds from a live stick playlist by title", () => {
  const live = playlist("Warmup", [
    stickTrack("1", "One"),
    stickTrack("2", "Two"),
    stickTrack("3", "Three"),
  ]);
  const draft: SetDraft = {
    ...DEFAULT_SET,
    title: "Warmup",
    sourcePool: undefined,
    tracks: [
      performanceTrack("rekordbox:playlist:Warmup:1:0", "One", {
        filePath: "/One.mp3",
      }),
      performanceTrack("rekordbox:playlist:Warmup:2:1", "Two", {
        filePath: "/Two.mp3",
      }),
    ],
  };
  const pool = playlistPoolForDraft(draft, [live]);
  assert.equal(pool.length, 3);
  assert.deepEqual(
    pool.map((track) => track.name),
    ["One", "Two", "Three"],
  );
});

test("draftWithPlaylistPool attaches a live pool when none is stored", () => {
  const live = playlist("Peak", [
    stickTrack("1", "One"),
    stickTrack("2", "Two"),
  ]);
  const draft: SetDraft = {
    ...DEFAULT_SET,
    title: "Peak",
    sourcePool: undefined,
    tracks: [performanceTrack("a", "One", { filePath: "/One.mp3" })],
  };
  const next = draftWithPlaylistPool(draft, [live]);
  assert.equal(next.sourcePool?.length, 2);
  assert.equal(draft.sourcePool, undefined);
});

test("rankPoolReplacements skips performance tracks and keeps alternatives", () => {
  const tracks: SetTrack[] = [
    performanceTrack("p0", "Opener", { phase: "open", keyCamelot: "8A", bpm: "124" }),
    performanceTrack("p1", "Peak", { phase: "peak", keyCamelot: "8A", bpm: "125" }),
    performanceTrack("p2", "Closer", { phase: "release", keyCamelot: "9A", bpm: "124" }),
    performanceTrack("alt", "Spare", {
      role: "safety",
      keyCamelot: "8A",
      bpm: "124",
      energyLevel: 6,
    }),
  ];
  const pool = [
    {
      id: "alt",
      name: "Spare",
      artists: ["Artist"],
      album: "",
      durationMs: 180_000,
      uri: "",
      externalUrl: "",
      imageUrl: null,
      bpm: "124",
      keyCamelot: "8A",
      energyLevel: 6,
    },
    {
      id: "pool-new",
      name: "Fresh",
      artists: ["Artist"],
      album: "",
      durationMs: 180_000,
      uri: "",
      externalUrl: "",
      imageUrl: null,
      bpm: "124",
      keyCamelot: "8A",
      energyLevel: 6,
    },
    {
      id: "p0",
      name: "Opener",
      artists: ["Artist"],
      album: "",
      durationMs: 180_000,
      uri: "",
      externalUrl: "",
      imageUrl: null,
      bpm: "124",
      keyCamelot: "8A",
      energyLevel: 6,
    },
  ];
  const ranked = rankPoolReplacements(tracks, "p1", pool);
  assert.deepEqual(
    ranked.map((item) => item.track.id).sort(),
    ["alt", "pool-new"],
  );
});
