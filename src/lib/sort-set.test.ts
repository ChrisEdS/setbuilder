import assert from "node:assert/strict";
import test from "node:test";
import { DEFAULT_SET } from "./set.ts";
import { alternativesPulledIntoPerformance, reorderDraft } from "./extract-set.ts";
import {
  orderByCamelotJourney,
  orderByEnergy,
  orderByEnergyRoller,
  orderByGentleEnergy,
  orderByTempo,
  orderByTempoPulse,
  orderByWaves,
  orderPinnedSlotsOnly,
} from "./sort-set.ts";

const t = (id: string, extra: Record<string, unknown> = {}) =>
  ({ id, keyCamelot: "8A", bpm: "124", energyLevel: 5, ...extra }) as {
    id: string;
    keyCamelot: string;
    bpm: string;
    energyLevel?: number;
    role?: string;
  };

test("energy sort climbs, then falls in the release direction", () => {
  const group = [t("hi", { energyLevel: 8 }), t("lo", { energyLevel: 3 }), t("mid", { energyLevel: 5 })];
  assert.deepEqual(orderByEnergy(group, true).map((x) => x.id), ["lo", "mid", "hi"]);
  assert.deepEqual(orderByEnergy(group, false).map((x) => x.id), ["hi", "mid", "lo"]);
});

test("energy sort uses Camelot key as tie-breaker before BPM", () => {
  const group = [
    t("bpmSlow", { energyLevel: 5, keyCamelot: "10A", bpm: "120" }),
    t("bpmFast", { energyLevel: 5, keyCamelot: "3A", bpm: "128" }),
    t("midKey", { energyLevel: 5, keyCamelot: "8A", bpm: "124" }),
  ];
  assert.deepEqual(orderByEnergy(group, true).map((x) => x.id), [
    "bpmFast",
    "midKey",
    "bpmSlow",
  ]);
});

test("tempo sort puts missing BPM last", () => {
  const group = [t("b", { bpm: "128" }), t("none", { bpm: "" }), t("a", { bpm: "122" })];
  assert.deepEqual(orderByTempo(group, true).map((x) => x.id), ["a", "b", "none"]);
});

test("Camelot journey prefers clockwise adjacent over stacking the same key", () => {
  const group = [
    t("start", { keyCamelot: "8A" }),
    t("same", { keyCamelot: "8A" }),
    t("next", { keyCamelot: "9A" }),
    t("far", { keyCamelot: "3A" }),
  ];
  assert.deepEqual(
    orderByCamelotJourney(group).map((x) => x.id),
    ["start", "next", "same", "far"],
  );
});

test("Camelot journey walks clockwise then relative when useful", () => {
  const group = [
    t("start", { keyCamelot: "8A" }),
    t("far", { keyCamelot: "3A" }),
    t("rel", { keyCamelot: "8B" }),
    t("next", { keyCamelot: "9A" }),
  ];
  assert.deepEqual(
    orderByCamelotJourney(group).map((x) => x.keyCamelot),
    ["8A", "9A", "8B", "3A"],
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

test("peak waves alternate groove and impact when roles are set", () => {
  const group = [
    t("g1", { energyLevel: 4, role: "groove" }),
    t("a1", { energyLevel: 9, role: "anchor" }),
    t("g2", { energyLevel: 6, role: "groove" }),
    t("a2", { energyLevel: 8, role: "anchor" }),
  ];
  assert.deepEqual(
    orderByWaves(group, "peak").map((x) => x.role),
    ["groove", "anchor", "groove", "anchor"],
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

test("energy roller dips only in peak; rise climbs like open", () => {
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
  assert.deepEqual(
    orderByEnergyRoller(group, "rise").map((x) => x.energyLevel),
    [3, 5, 7, 9],
  );
});

test("reorderDraft pulls a fitting alternative into the phase and keeps the cue", () => {
  const draft = {
    ...DEFAULT_SET,
    tracks: [
      { ...t("p1"), name: "A", artists: ["X"], album: "", durationMs: 1, uri: "", externalUrl: "", imageUrl: null, phase: "peak" as const, role: "groove" as const, transition: "unset" as const, note: "", safetyAlt: "" },
      { ...t("s1", { energyLevel: 9 }), name: "B", artists: ["X"], album: "", durationMs: 1, uri: "", externalUrl: "", imageUrl: null, phase: "peak" as const, role: "safety" as const, transition: "unset" as const, note: "", why: "plan b", safetyAlt: "" },
      { ...t("p0", { energyLevel: 3 }), name: "C", artists: ["X"], album: "", durationMs: 1, uri: "", externalUrl: "", imageUrl: null, phase: "peak" as const, role: "anchor" as const, transition: "unset" as const, note: "Cue bei 2:10", safetyAlt: "" },
    ],
  };
  const next = reorderDraft(draft, "energy");
  const promoted = next.tracks.find((track) => track.id === "s1");
  // Peak energy 9 still fits, so the phase stays and energy can place it mid-phase.
  assert.equal(promoted?.role, "groove");
  assert.equal(promoted?.phase, "peak");
  assert.equal(promoted?.why, "");
  assert.equal(next.tracks.some((track) => track.role === "safety"), false);
  // Positional opener (p1) stays first even when energy would prefer p0.
  assert.deepEqual(
    next.tracks.filter((track) => track.role !== "safety").map((track) => track.id),
    ["p1", "s1", "p0"],
  );
  assert.notEqual(next.tracks[next.tracks.length - 1].id, "s1");
  // Sorting never writes a machine note; a hand-written cue survives.
  assert.deepEqual(
    next.tracks.map((track) => track.note),
    ["", "", "Cue bei 2:10"],
  );
  assert.equal(alternativesPulledIntoPerformance(draft, next), 1);
});

test("reorderDraft energy keeps positional opener and closer without pins", () => {
  const track = (
    id: string,
    phase: "open" | "peak" | "release",
    energyLevel: number,
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
      bpm: "124",
      keyCamelot: "8A",
      energyLevel,
      note: "",
      why: "",
      safetyAlt: "",
    });
  const draft = {
    ...DEFAULT_SET,
    openerId: null,
    closerId: null,
    tracks: [
      track("open-hi", "open", 8),
      track("open-lo", "open", 3),
      track("peak", "peak", 9),
      track("close-lo", "release", 2),
      track("close-hi", "release", 6),
    ],
  };
  const next = reorderDraft(draft, "energy");
  const performance = next.tracks.filter((item) => item.role !== "safety");
  assert.equal(performance[0].id, "open-hi");
  assert.equal(performance[performance.length - 1].id, "close-hi");
  assert.equal(next.openerId, null);
  assert.equal(next.closerId, null);
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

test("reorderDraft promotes a non-excluded alternative, keeps ends, and moves a mid pin", () => {
  const row = (
    id: string,
    energyLevel: number,
    role: "groove" | "safety" = "groove",
  ) =>
    ({
      id,
      name: id,
      artists: ["X"],
      album: "",
      durationMs: 8 * 60_000,
      uri: "",
      externalUrl: "",
      imageUrl: null,
      phase: "peak" as const,
      role,
      transition: "unset" as const,
      bpm: "124",
      keyCamelot: "8A",
      energyLevel,
      note: "",
      why: role === "safety" ? "trimmed" : "",
      safetyAlt: "",
    });
  const draft = {
    ...DEFAULT_SET,
    durationMinutes: 5,
    openerId: "a",
    closerId: "d",
    pinnedIds: ["b"],
    excludedIds: ["ban"],
    tracks: [
      row("a", 8),
      row("b", 9),
      row("c", 4),
      row("d", 2),
      row("alt", 6, "safety"),
      row("ban", 1, "safety"),
    ],
  };
  const next = reorderDraft(draft, "energy");
  const performance = next.tracks.filter((item) => item.role !== "safety").map((item) => item.id);
  // Energy would put a late and d first; the ends stay, the pin walks toward the closer.
  assert.deepEqual(performance, ["a", "c", "alt", "b", "d"]);
  assert.equal(next.tracks.find((item) => item.id === "alt")?.role, "groove");
  assert.equal(next.tracks.find((item) => item.id === "alt")?.phase, "peak");
  assert.equal(next.tracks.find((item) => item.id === "alt")?.why, "");
  assert.notEqual(performance[performance.length - 1], "alt");
  assert.equal(next.tracks.find((item) => item.id === "ban")?.role, "safety");
  assert.equal(next.tracks[next.tracks.length - 1].id, "ban");
  assert.equal(next.openerId, "a");
  assert.equal(next.closerId, "d");
  assert.deepEqual(next.pinnedIds, ["b"]);
  assert.deepEqual(next.excludedIds, ["ban"]);
  assert.equal(next.tracks.length, draft.tracks.length);
  assert.equal(alternativesPulledIntoPerformance(draft, next), 1);
});

test("reorderDraft leaves an unfit alternative phase and restores a stored role", () => {
  const row = (
    id: string,
    phase: "open" | "peak",
    energyLevel: number,
    role: "groove" | "safety" = "groove",
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
      role,
      transition: "unset" as const,
      bpm: "124",
      keyCamelot: "8A",
      energyLevel,
      note: "",
      why: "",
      safetyAlt: "",
    });
  const alt = {
    ...row("alt", "open", 9, "safety"),
    playedRole: "anchor" as const,
    why: "trimmed",
  };
  const draft = {
    ...DEFAULT_SET,
    openerId: "a",
    closerId: "c",
    tracks: [row("a", "peak", 4), row("b", "peak", 6), row("c", "peak", 5), alt],
  };
  const next = reorderDraft(draft, "energy");
  const promoted = next.tracks.find((item) => item.id === "alt");
  const performance = next.tracks.filter((item) => item.role !== "safety").map((item) => item.id);
  assert.equal(promoted?.role, "anchor");
  assert.equal(promoted?.phase, "open");
  assert.equal(promoted?.why, "");
  assert.deepEqual(performance, ["a", "alt", "b", "c"]);
  assert.equal(performance[0], "a");
  assert.equal(performance[performance.length - 1], "c");
});

test("orderPinnedSlotsOnly reorders pins among pin slots and leaves gaps", () => {
  // 9A then 8A: energy climb prefers 8A → 9A among the two pin slots.
  const lineup = [
    t("open", { keyCamelot: "1A", energyLevel: 3 }),
    t("pin9", { keyCamelot: "9A", energyLevel: 8 }),
    t("gap1", { keyCamelot: "5A", energyLevel: 5 }),
    t("pin8", { keyCamelot: "8A", energyLevel: 7 }),
    t("gap2", { keyCamelot: "2A", energyLevel: 4 }),
    t("close", { keyCamelot: "10A", energyLevel: 2 }),
  ];
  const next = orderPinnedSlotsOnly(lineup, ["pin9", "pin8"]);
  assert.deepEqual(
    next.map((item) => item.id),
    ["open", "pin8", "gap1", "pin9", "gap2", "close"],
  );
});

test("orderPinnedSlotsOnly is a no-op with fewer than two pins in the lineup", () => {
  const lineup = [t("a"), t("b"), t("c")];
  assert.deepEqual(
    orderPinnedSlotsOnly(lineup, ["b"]).map((item) => item.id),
    ["a", "b", "c"],
  );
  assert.deepEqual(
    orderPinnedSlotsOnly(lineup, []).map((item) => item.id),
    ["a", "b", "c"],
  );
});

test("reorderDraft perfectPins keeps non-pins, ends, alts and pin ids", () => {
  const row = (
    id: string,
    keyCamelot: string,
    energyLevel: number,
    role: "groove" | "safety" = "groove",
  ) =>
    ({
      id,
      name: id,
      artists: ["X"],
      album: "",
      durationMs: 180_000,
      uri: "",
      externalUrl: "",
      imageUrl: null,
      phase: "peak" as const,
      role,
      transition: "unset" as const,
      bpm: "124",
      keyCamelot,
      energyLevel,
      note: "",
      why: role === "safety" ? "parked" : "",
      safetyAlt: "",
    });
  // pin9 then pin8 is reverse of the preferred adjacent walk.
  const draft = {
    ...DEFAULT_SET,
    openerId: "open",
    closerId: "close",
    pinnedIds: ["pin9", "pin8"],
    excludedIds: ["ban"],
    tracks: [
      row("open", "1A", 3),
      row("pin9", "9A", 8),
      row("mid", "5A", 5),
      row("pin8", "8A", 7),
      row("close", "10A", 2),
      row("alt", "3A", 6, "safety"),
      row("ban", "11A", 1, "safety"),
    ],
  };
  const next = reorderDraft(draft, "perfectPins");
  const performance = next.tracks
    .filter((item) => item.role !== "safety")
    .map((item) => item.id);
  // Pin slots stay at indexes 1 and 3; mid stays between them.
  assert.deepEqual(performance, ["open", "pin8", "mid", "pin9", "close"]);
  assert.equal(next.tracks.find((item) => item.id === "alt")?.role, "safety");
  assert.equal(next.tracks.find((item) => item.id === "ban")?.role, "safety");
  assert.equal(alternativesPulledIntoPerformance(draft, next), 0);
  assert.equal(next.openerId, "open");
  assert.equal(next.closerId, "close");
  assert.deepEqual(next.pinnedIds, ["pin9", "pin8"]);
  assert.deepEqual(next.excludedIds, ["ban"]);
});

test("reorderDraft perfect pulls an alternative in without taking the closer", () => {
  const row = (
    id: string,
    phase: "open" | "peak" | "release",
    keyCamelot: string,
    energyLevel: number,
    role: "groove" | "safety" = "groove",
  ) =>
    ({
      id,
      name: id,
      artists: ["X"],
      album: "",
      durationMs: 180_000,
      uri: "",
      externalUrl: "",
      imageUrl: null,
      phase,
      role,
      transition: "unset" as const,
      bpm: "124",
      keyCamelot,
      energyLevel,
      note: "",
      why: "",
      safetyAlt: "",
    });
  const draft = {
    ...DEFAULT_SET,
    openerId: null,
    closerId: null,
    tracks: [
      row("a", "open", "1A", 4),
      row("b", "peak", "8A", 7),
      row("c", "release", "3A", 4),
      row("alt", "peak", "9A", 8, "safety"),
    ],
  };
  const next = reorderDraft(draft, "perfect");
  const performance = next.tracks.filter((item) => item.role !== "safety");
  assert.equal(performance[0].id, "a");
  assert.equal(performance[performance.length - 1].id, "c");
  assert.equal(next.tracks.find((item) => item.id === "alt")?.role, "groove");
  assert.ok(performance.some((item) => item.id === "alt"));
  assert.notEqual(performance[performance.length - 1].id, "alt");
  assert.equal(next.tracks.some((item) => item.role === "safety"), false);
  assert.equal(alternativesPulledIntoPerformance(draft, next), 1);
});
