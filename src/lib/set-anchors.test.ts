import assert from "node:assert/strict";
import test from "node:test";
import { DEFAULT_SET, type SetTrack } from "./set.ts";
import {
  applySetAnchors,
  pinCloser,
  pinOpener,
  suggestCloserId,
  suggestOpenerId,
  withSuggestedAnchors,
} from "./set-anchors.ts";
import { reorderDraft } from "./extract-set.ts";

function track(
  id: string,
  over: Partial<SetTrack> & { phase?: SetTrack["phase"] } = {},
): SetTrack {
  return {
    id,
    name: id,
    artists: ["X"],
    album: "",
    durationMs: 1,
    uri: "",
    externalUrl: "",
    imageUrl: null,
    phase: over.phase ?? "peak",
    role: over.role ?? "groove",
    transition: "unset",
    bpm: over.bpm ?? "124",
    keyCamelot: over.keyCamelot ?? "8A",
    energyLevel: over.energyLevel,
    note: "",
    why: "",
    safetyAlt: "",
    ...over,
  };
}

test("suggestOpenerId prefers open-phase low energy with a key", () => {
  const tracks = [
    track("loud", { phase: "open", energyLevel: 8, keyCamelot: "8A" }),
    track("warm", { phase: "open", energyLevel: 3, keyCamelot: "9A" }),
    track("peakish", { phase: "peak", energyLevel: 2, keyCamelot: "8A" }),
  ];
  assert.equal(suggestOpenerId(tracks), "warm");
});

test("suggestCloserId prefers release-phase lower energy", () => {
  const tracks = [
    track("a", { phase: "peak", energyLevel: 8 }),
    track("soft", { phase: "release", energyLevel: 4 }),
    track("hard", { phase: "release", energyLevel: 7 }),
  ];
  assert.equal(suggestCloserId(tracks), "soft");
});

test("pinOpener moves track to front and sets phase open", () => {
  const draft = {
    ...DEFAULT_SET,
    tracks: [
      track("a", { phase: "open", energyLevel: 3 }),
      track("b", { phase: "peak", energyLevel: 7 }),
      track("c", { phase: "release", energyLevel: 4 }),
    ],
  };
  const next = pinOpener(draft, "b");
  assert.equal(next.openerId, "b");
  assert.equal(next.tracks[0].id, "b");
  assert.equal(next.tracks[0].phase, "open");
});

test("pinCloser moves track to end of performance and keeps safeties last", () => {
  const draft = {
    ...DEFAULT_SET,
    tracks: [
      track("a", { phase: "open", energyLevel: 3 }),
      track("b", { phase: "peak", energyLevel: 7 }),
      track("c", { phase: "release", energyLevel: 4 }),
      track("alt", { role: "safety", phase: "peak", energyLevel: 5 }),
    ],
  };
  const next = pinCloser(draft, "a");
  const performance = next.tracks.filter((item) => item.role !== "safety");
  assert.equal(next.closerId, "a");
  assert.equal(performance[performance.length - 1].id, "a");
  assert.equal(performance[performance.length - 1].phase, "release");
  assert.equal(next.tracks[next.tracks.length - 1].id, "alt");
});

test("pinning the same track as opener clears a conflicting closer", () => {
  const draft = {
    ...DEFAULT_SET,
    openerId: null,
    closerId: "b",
    tracks: [
      track("a", { phase: "open" }),
      track("b", { phase: "peak" }),
      track("c", { phase: "release" }),
    ],
  };
  const next = pinOpener(draft, "b");
  assert.equal(next.openerId, "b");
  assert.equal(next.closerId, null);
  assert.equal(next.tracks[0].id, "b");
});

test("reorderDraft keeps pinned opener and closer at the ends", () => {
  const draft = {
    ...DEFAULT_SET,
    openerId: "mid",
    closerId: "first",
    tracks: [
      track("first", { phase: "open", energyLevel: 2, keyCamelot: "8A" }),
      track("mid", { phase: "peak", energyLevel: 9, keyCamelot: "3A" }),
      track("last", { phase: "release", energyLevel: 5, keyCamelot: "9A" }),
    ],
  };
  const next = reorderDraft(draft, "energy");
  const performance = next.tracks.filter((item) => item.role !== "safety");
  assert.equal(performance[0].id, "mid");
  assert.equal(performance[performance.length - 1].id, "first");
});

test("applySetAnchors drops pins that no longer exist in performance", () => {
  const draft = {
    ...DEFAULT_SET,
    openerId: "gone",
    closerId: "still",
    tracks: [track("still", { phase: "peak" }), track("other", { phase: "peak" })],
  };
  const next = applySetAnchors(draft);
  assert.equal(next.openerId, null);
  assert.equal(next.closerId, "still");
  assert.equal(next.tracks[next.tracks.length - 1].id, "still");
});

test("withSuggestedAnchors fills missing pins from the pool", () => {
  const draft = {
    ...DEFAULT_SET,
    tracks: [
      track("warm", { phase: "open", energyLevel: 3, keyCamelot: "8A" }),
      track("peak", { phase: "peak", energyLevel: 8, keyCamelot: "9A" }),
      track("out", { phase: "release", energyLevel: 4, keyCamelot: "10A" }),
    ],
  };
  const next = withSuggestedAnchors(draft);
  assert.equal(next.openerId, "warm");
  assert.equal(next.closerId, "out");
  assert.equal(next.tracks[0].id, "warm");
  assert.equal(
    next.tracks.filter((item) => item.role !== "safety").at(-1)?.id,
    "out",
  );
});

test("applySetAnchors never duplicates a one-track set as opener and closer", () => {
  const draft = {
    ...DEFAULT_SET,
    openerId: "solo",
    closerId: "solo",
    tracks: [track("solo", { phase: "peak", energyLevel: 5 })],
  };
  const next = applySetAnchors(draft);
  assert.equal(next.tracks.length, 1);
  assert.equal(next.tracks[0].id, "solo");
  assert.equal(next.openerId, "solo");
  assert.equal(next.closerId, "solo");
});
