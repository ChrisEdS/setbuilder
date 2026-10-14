import assert from "node:assert/strict";
import test from "node:test";
import { DEFAULT_SET } from "./set.ts";
import { reorderDraft } from "./extract-set.ts";
import { orderByCamelotJourney, orderByEnergy, orderByTempo, orderByWaves } from "./sort-set.ts";

const t = (id: string, extra: Record<string, unknown> = {}) =>
  ({ id, keyCamelot: "8A", bpm: "124", energyLevel: 5, ...extra }) as {
    id: string;
    keyCamelot: string;
    bpm: string;
    energyLevel?: number;
  };

test("energy sort climbs, then falls in the release direction", () => {
  const group = [t("hi", { energyLevel: 8 }), t("lo", { energyLevel: 3 }), t("mid", { energyLevel: 5 })];
  assert.deepEqual(orderByEnergy(group, true).map((x) => x.id), ["lo", "mid", "hi"]);
  assert.deepEqual(orderByEnergy(group, false).map((x) => x.id), ["hi", "mid", "lo"]);
});

test("tempo sort puts missing BPM last", () => {
  const group = [t("b", { bpm: "128" }), t("none", { bpm: "" }), t("a", { bpm: "122" })];
  assert.deepEqual(orderByTempo(group, true).map((x) => x.id), ["a", "b", "none"]);
});

test("Camelot journey keeps the opener and then walks clockwise", () => {
  const group = [
    t("start", { keyCamelot: "8A" }),
    t("far", { keyCamelot: "3A" }),
    t("rel", { keyCamelot: "8B" }),
    t("next", { keyCamelot: "9A" }),
  ];
  assert.deepEqual(
    orderByCamelotJourney(group).map((x) => x.keyCamelot),
    ["8A", "8B", "9A", "3A"],
  );
});

test("peak waves interleave low and high energy", () => {
  const group = [
    t("a", { energyLevel: 5 }),
    t("b", { energyLevel: 9 }),
    t("c", { energyLevel: 6 }),
    t("d", { energyLevel: 10 }),
  ];
  assert.deepEqual(
    orderByWaves(group, "peak").map((x) => x.energyLevel),
    [5, 10, 6, 9],
  );
});

test("reorderDraft keeps alternatives at the end and phases intact", () => {
  const draft = {
    ...DEFAULT_SET,
    tracks: [
      { ...t("p1"), name: "A", artists: ["X"], album: "", durationMs: 1, uri: "", externalUrl: "", imageUrl: null, phase: "peak" as const, role: "groove" as const, transition: "unset" as const, note: "", safetyAlt: "" },
      { ...t("s1", { energyLevel: 9 }), name: "B", artists: ["X"], album: "", durationMs: 1, uri: "", externalUrl: "", imageUrl: null, phase: "peak" as const, role: "safety" as const, transition: "unset" as const, note: "", safetyAlt: "" },
      { ...t("p0", { energyLevel: 3 }), name: "C", artists: ["X"], album: "", durationMs: 1, uri: "", externalUrl: "", imageUrl: null, phase: "peak" as const, role: "anchor" as const, transition: "unset" as const, note: "Cue bei 2:10", safetyAlt: "" },
    ],
  };
  const next = reorderDraft(draft, "energy");
  assert.equal(next.tracks[next.tracks.length - 1].role, "safety");
  assert.deepEqual(
    next.tracks.filter((track) => track.role !== "safety").map((track) => track.id),
    ["p0", "p1"],
  );
  // Sorting never writes a machine note; a hand-written cue survives.
  assert.deepEqual(
    next.tracks.filter((track) => track.role !== "safety").map((track) => track.note),
    ["Cue bei 2:10", ""],
  );
});
