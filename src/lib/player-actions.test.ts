import assert from "node:assert/strict";
import test from "node:test";
import { decodeStoredDraft, encodeStoredDraft, normalizeStoredDraft } from "./draft-codec.ts";
import { reorderDraft } from "./extract-set.ts";
import { playerNeighbors, playableQueue } from "./player-queue.ts";
import {
  deleteTrackFromSet,
  pinCloser,
  pinOpener,
  restoreExcludedTrack,
  toggleExclude,
  toggleKeepPin,
  toggleUnsort,
} from "./set-anchors.ts";
import { DEFAULT_SET, type SetTrack } from "./set.ts";

function track(
  id: string,
  energyLevel: number,
  over: Partial<SetTrack> = {},
): SetTrack {
  return {
    id,
    name: id,
    artists: ["X"],
    album: "",
    durationMs: 180_000,
    uri: "",
    externalUrl: "",
    imageUrl: null,
    phase: "peak",
    role: "groove",
    transition: "unset",
    bpm: "124",
    keyCamelot: "8A",
    energyLevel,
    note: "",
    why: "",
    safetyAlt: "",
    ...over,
  };
}

function performanceIds(draft: { tracks: SetTrack[] }): string[] {
  return draft.tracks.filter((item) => item.role !== "safety").map((item) => item.id);
}

test("excluded tracks are not chosen as the next playable track", () => {
  const tracks = [track("a", 3), track("b", 5), track("c", 4)];
  const queue = playableQueue(tracks, ["b"]);
  assert.deepEqual(
    queue.map((item) => item.id),
    ["a", "c"],
  );
  const fromA = playerNeighbors(tracks, ["b"], "a");
  assert.equal(fromA.next?.id, "c");
  assert.equal(fromA.prev, null);

  const parked = tracks.map((item) =>
    item.id === "b" ? { ...item, role: "safety" as const } : item,
  );
  const around = playerNeighbors(parked, ["b"], "b");
  assert.equal(around.prev?.id, "a");
  assert.equal(around.next?.id, "c");
  assert.ok(!around.queue.some((item) => item.id === "b"));
});

test("delete removes the track from the set and leaves no flag behind", () => {
  const draft = {
    ...DEFAULT_SET,
    openerId: "a",
    closerId: "c",
    pinnedIds: ["b"],
    excludedIds: ["x"],
    unsortedIds: ["b"],
    tracks: [track("a", 3), track("b", 6), track("c", 2), track("x", 1, { role: "safety" })],
  };
  const next = deleteTrackFromSet(draft, "b");
  assert.equal(next.tracks.some((item) => item.id === "b"), false);
  assert.equal(next.tracks.length, draft.tracks.length - 1);
  assert.equal(next.pinnedIds, undefined);
  assert.deepEqual(next.unsortedIds, undefined);
  assert.deepEqual(next.excludedIds, ["x"]);
  assert.equal(next.openerId, "a");
  assert.equal(performanceIds(next).includes("b"), false);
});

test("only one opener and one closer, and they stay at the ends when the middle moves", () => {
  const draft = {
    ...DEFAULT_SET,
    openerId: "a",
    closerId: "d",
    tracks: [track("a", 8), track("b", 3), track("c", 9), track("d", 2)],
  };
  const opened = pinOpener(draft, "c");
  assert.equal(opened.openerId, "c");
  assert.notEqual(opened.openerId, "a");
  assert.equal(performanceIds(opened)[0], "c");

  const closed = pinCloser(opened, "b");
  assert.equal(closed.closerId, "b");
  assert.notEqual(closed.openerId, "b");
  assert.equal(performanceIds(closed).at(-1), "b");
  assert.equal(performanceIds(closed)[0], "c");

  const sorted = reorderDraft(closed, "energy");
  const ids = performanceIds(sorted);
  assert.equal(ids[0], "c");
  assert.equal(ids.at(-1), "b");
  assert.equal(sorted.openerId, "c");
  assert.equal(sorted.closerId, "b");
});

test("an unsorted track stays in the set, leaves its old index, and is not pinned or excluded", () => {
  const draft = {
    ...DEFAULT_SET,
    openerId: "a",
    closerId: "d",
    pinnedIds: ["c"],
    excludedIds: ["ban"],
    tracks: [
      track("a", 3),
      track("b", 9),
      track("m", 5),
      track("c", 4),
      track("d", 2),
      track("ban", 1, { role: "safety" }),
    ],
  };
  const marked = toggleUnsort(draft, "b");
  assert.deepEqual(marked.unsortedIds, ["b"]);
  assert.equal(marked.pinnedIds?.includes("b"), false);
  assert.equal(marked.excludedIds?.includes("b"), false);
  assert.equal(marked.tracks.find((item) => item.id === "b")?.role, "groove");
  assert.equal(performanceIds(marked).indexOf("b"), 1);
  assert.equal(performanceIds(marked).indexOf("c"), 3);

  const sorted = reorderDraft(marked, "energy");
  const ids = performanceIds(sorted);
  assert.ok(ids.includes("b"));
  assert.notEqual(ids.indexOf("b"), 1);
  assert.equal(sorted.tracks.find((item) => item.id === "b")?.role, "groove");
  assert.equal(sorted.excludedIds?.includes("b") ?? false, false);
  assert.equal(sorted.pinnedIds?.includes("b") ?? false, false);
  assert.deepEqual(sorted.unsortedIds, ["b"]);
  assert.equal(ids[0], "a");
  assert.equal(ids.at(-1), "d");
  assert.equal(ids.indexOf("c"), 3);

  const kept = toggleUnsort(sorted, "b");
  assert.equal(kept.unsortedIds, undefined);
  assert.ok(performanceIds(kept).includes("b"));
});

test("pin, exclude and unsort cancel each other", () => {
  const draft = {
    ...DEFAULT_SET,
    tracks: [track("a", 3), track("b", 5)],
  };
  const pinned = toggleKeepPin(toggleUnsort(draft, "b"), "b");
  assert.deepEqual(pinned.pinnedIds, ["b"]);
  assert.equal(pinned.unsortedIds, undefined);

  const unsorted = toggleUnsort(pinned, "b");
  assert.deepEqual(unsorted.unsortedIds, ["b"]);
  assert.equal(unsorted.pinnedIds, undefined);

  const excluded = toggleExclude(unsorted, "b", "raus");
  assert.deepEqual(excluded.excludedIds, ["b"]);
  assert.equal(excluded.unsortedIds, undefined);
  assert.equal(excluded.tracks.find((item) => item.id === "b")?.role, "safety");

  const back = restoreExcludedTrack(excluded, "b");
  assert.equal(back.excludedIds, undefined);
  assert.equal(back.tracks.find((item) => item.id === "b")?.role, "groove");
});

test("unsorted ids round-trip and lose a slot that is already pinned or excluded", () => {
  const draft = normalizeStoredDraft({
    title: "Nachtlinie",
    tracks: [],
    openerId: "a",
    pinnedIds: ["b"],
    excludedIds: ["c"],
    unsortedIds: ["d", "b", "c", "a", "d", ""],
  });
  assert.deepEqual(draft?.unsortedIds, ["d"]);
  const round = decodeStoredDraft(encodeStoredDraft(draft!));
  assert.deepEqual(round?.unsortedIds, ["d"]);
});
