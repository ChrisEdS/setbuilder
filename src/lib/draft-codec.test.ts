import assert from "node:assert/strict";
import test from "node:test";
import {
  DRAFT_SCHEMA_VERSION,
  decodeStoredDraft,
  encodeStoredDraft,
  normalizeStoredDraft,
  uniqueIncomingDraftTracks,
} from "./draft-codec.ts";

test("migrates an older draft, normalizes tracks and preserves user text", () => {
  const draft = normalizeStoredDraft({
    title: "  My set  ",
    vibe: "  keep spacing  ",
    venue: "Club",
    slot: "Late",
    audience: "Friends",
    gear: "CDJs",
    durationMinutes: 90,
    tracks: [
      {
        id: "t11",
        name: "One",
        artists: ["Ada"],
        note: "  my cue note  ",
        comment: "Energy 7",
      },
    ],
  });
  assert.ok(draft);
  assert.equal(draft.schemaVersion, DRAFT_SCHEMA_VERSION);
  assert.equal(draft.title, "  My set  ");
  assert.equal(draft.vibe, "  keep spacing  ");
  assert.equal(draft.tracks[0].note, "");
  assert.equal(draft.tracks[0].comment, "  my cue note  ");
  assert.equal(draft.tracks[0].energyLevel, 7);
  assert.equal(draft.tracks[0].energySource, "tag");
  assert.equal(draft.tracks[0].role, "groove");
});

test("drops generated notes and migrates a legacy rekordbox path", () => {
  const draft = normalizeStoredDraft({
    title: "Legacy",
    tracks: [
      {
        id: "generated",
        name: "Generated",
        note: "lift/groove · Übergang: long-blend · Nachbar-Key (±1)",
      },
      {
        id: "path",
        name: "Path",
        source: "rekordbox",
        note: "/Contents/Artist/Track.mp3",
      },
    ],
  });
  assert.ok(draft);
  assert.equal(draft.tracks[0].note, "");
  assert.equal(draft.tracks[0].comment, "");
  assert.equal(draft.tracks[1].note, "");
  assert.equal(draft.tracks[1].comment, "");
  assert.equal(draft.tracks[1].filePath, "/Contents/Artist/Track.mp3");
});

test("repairs duplicate and missing ids deterministically across both collections", () => {
  const old = {
    title: "IDs",
    tracks: [
      { id: "t11", name: "A" },
      { id: "t11", name: "B" },
      { id: "groove-t11", name: "C" },
      { name: "D" },
    ],
    sourcePool: [
      { id: "groove-t11", name: "Pool A" },
      { id: "t11", name: "Pool B" },
      { name: "Pool C" },
    ],
  };
  const first = normalizeStoredDraft(old);
  const second = normalizeStoredDraft(old);
  assert.ok(first && second);
  const ids = [
    ...first.tracks.map((track) => track.id),
    ...(first.sourcePool ?? []).map((track) => track.id),
  ];
  assert.deepEqual(ids, [
    "t11",
    "t11-2",
    "groove-t11",
    "track-4",
    "groove-t11-2",
    "t11-3",
    "pool-3",
  ]);
  assert.equal(new Set(ids).size, ids.length);
  assert.deepEqual(second, first);
});

test("codec rejects unsafe shapes and versions the same storage payload", () => {
  assert.equal(decodeStoredDraft("{bad"), null);
  assert.equal(normalizeStoredDraft({ title: "x", tracks: "no" }), null);
  assert.equal(normalizeStoredDraft({ title: "x", tracks: [{ id: "x" }] }), null);
  const draft = normalizeStoredDraft({ title: "Old", tracks: [] });
  assert.ok(draft);
  const encoded = encodeStoredDraft(draft);
  assert.equal(JSON.parse(encoded).schemaVersion, DRAFT_SCHEMA_VERSION);
  assert.equal(decodeStoredDraft(encoded)?.title, "Old");
});

test("bulk normalization adds accepted ids to seen while filtering", () => {
  const track = (id: string, name: string) => ({ id, name, artists: [] });
  const fresh = uniqueIncomingDraftTracks(
    ["already"],
    [
      track("already", "Existing"),
      track("t11", "First"),
      track("t11", "Duplicate in batch"),
      track("groove-t11", "Groove"),
      track("groove-t11", "Duplicate groove"),
    ],
  );
  assert.deepEqual(
    fresh.map((item) => [item.id, item.name]),
    [
      ["t11", "First"],
      ["groove-t11", "Groove"],
    ],
  );
});
