import assert from "node:assert/strict";
import test from "node:test";
import { DEFAULT_SET } from "./set.ts";
import { reorderDraft } from "./extract-set.ts";
import {
  orderByCamelotJourney,
  orderByEnergy,
  orderByEnergyRoller,
  orderByGentleEnergy,
  orderByTempo,
  orderByTempoPulse,
  orderByWaves,
} from "./sort-set.ts";

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

test("gentle energy prefers one-step moves from the opener", () => {
  const group = [
    t("start", { energyLevel: 5 }),
    t("jump", { energyLevel: 9 }),
    t("next", { energyLevel: 6 }),
    t("flat", { energyLevel: 5 }),
  ];
  assert.deepEqual(
    orderByGentleEnergy(group, true).map((x) => x.id),
    ["start", "next", "flat", "jump"],
  );
});

test("tempo pulse keeps the opener and stays near BPM", () => {
  const group = [
    t("start", { bpm: "124" }),
    t("far", { bpm: "132" }),
    t("near", { bpm: "125" }),
    t("mid", { bpm: "128" }),
  ];
  assert.deepEqual(
    orderByTempoPulse(group, true).map((x) => x.id),
    ["start", "near", "mid", "far"],
  );
});

test("energy roller climbs, dips, then climbs again in peak", () => {
  const group = [
    t("a", { energyLevel: 3 }),
    t("b", { energyLevel: 5 }),
    t("c", { energyLevel: 7 }),
    t("d", { energyLevel: 9 }),
  ];
  assert.deepEqual(
    orderByEnergyRoller(group, "peak").map((x) => x.energyLevel),
    [3, 7, 5, 9],
  );
  assert.deepEqual(
    orderByEnergyRoller(group, "open").map((x) => x.energyLevel),
    [3, 5, 7, 9],
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

test("switching sort techniques can change order; repeating one does not", () => {
  const track = (
    id: string,
    phase: "open" | "peak",
    over: { keyCamelot?: string; bpm?: string; energyLevel?: number } = {},
  ) =>
    ({
      id,
      name: id,
      artists: ["X"],
      album: "",
      durationMs: 1,
      uri: "",
      externalUrl: "",
      imageUrl: null,
      phase,
      role: "groove" as const,
      transition: "unset" as const,
      bpm: over.bpm ?? "124",
      keyCamelot: over.keyCamelot ?? "8A",
      energyLevel: over.energyLevel,
      note: "",
      why: "",
      safetyAlt: "",
    });
  const draft = {
    ...DEFAULT_SET,
    tracks: [
      track("a", "peak", { keyCamelot: "8A", bpm: "120", energyLevel: 9 }),
      track("b", "peak", { keyCamelot: "3A", bpm: "128", energyLevel: 4 }),
      track("c", "peak", { keyCamelot: "9A", bpm: "124", energyLevel: 6 }),
      track("d", "open", { keyCamelot: "8A", bpm: "118", energyLevel: 3 }),
      track("e", "open", { keyCamelot: "10A", bpm: "122", energyLevel: 5 }),
    ],
  };
  const byEnergy = reorderDraft(draft, "energy");
  const byTempo = reorderDraft(byEnergy, "tempo");
  const energyAgain = reorderDraft(byEnergy, "energy");
  assert.notDeepEqual(
    byEnergy.tracks.map((item) => item.id),
    byTempo.tracks.map((item) => item.id),
  );
  assert.deepEqual(
    byEnergy.tracks.map((item) => item.id),
    energyAgain.tracks.map((item) => item.id),
  );
});
