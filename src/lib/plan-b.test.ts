import assert from "node:assert/strict";
import test from "node:test";
import { bestPhaseFor, planBFill, suggestPlanB } from "./plan-b.ts";
import { planBCount } from "./energy.ts";
import type { SetPhaseId, SetTrack } from "./set.ts";

const mk = (id: string, phase: SetPhaseId, role: string, key: string, bpm: string, energy?: number) =>
  ({
    id, name: id, artists: ["A"], album: "", durationMs: 300_000, uri: "", externalUrl: "",
    imageUrl: null, phase, role, transition: "unset", bpm, keyCamelot: key, note: "", why: "",
    safetyAlt: "", energyLevel: energy, source: "rekordbox",
  }) as unknown as SetTrack;

const tracks = [
  mk("p1", "peak", "anchor", "10A", "126", 9),
  mk("p2", "peak", "groove", "10A", "127", 8),
  mk("r1", "rise", "groove", "9A", "124", 7),
];

const row = (title: string, key: string, bpm: string, energy?: number) => ({
  artist: "X", title, key, bpm, energy,
});

test("Plan B picks library tracks in the phase band that blend with the phase", () => {
  const library = [
    row("Fits", "10A", "126", 9),
    row("Also fits", "11A", "127", 8),
    row("Too calm", "10A", "126", 4),
    row("Key clash", "4A", "126", 9),
    row("Too slow", "10A", "100", 9),
    row("No key", "", "126", 9),
  ];
  const picks = suggestPlanB(library, tracks, "peak", 5).map((item) => item.row.title);
  assert.deepEqual(picks.sort(), ["Also fits", "Fits"]);
});

test("tracks already in the set are never suggested", () => {
  const library = [{ artist: "A", title: "p1", key: "10A", bpm: "126", energy: 9 }, row("New", "10A", "126", 9)];
  const picks = suggestPlanB(library, tracks, "peak").map((item) => item.row.title);
  assert.deepEqual(picks, ["New"]);
});

test("a phase without performance tracks gets no suggestions", () => {
  assert.deepEqual(suggestPlanB([row("Any", "8A", "124", 4)], tracks, "open"), []);
});

test("adding a suggestion as Alternative covers the phase", () => {
  const added = [...tracks, mk("s1", "peak", "safety", "10A", "126", 9), mk("s2", "peak", "safety", "11A", "127", 8)];
  assert.equal(planBCount(tracks, "peak"), 0);
  assert.equal(planBCount(added, "peak"), 2);
});

test("an Alternative keeps its phase when the energy fits and moves when it does not", () => {
  const fits = mk("a", "peak", "safety", "10A", "126", 9);
  const calm = mk("b", "peak", "safety", "9A", "124", 7);
  assert.equal(bestPhaseFor(fits, tracks), "peak");
  assert.equal(bestPhaseFor(calm, tracks), "rise", "E7 fits rise, and rise has tracks");
});

test("filling the gaps never uses a library track twice and respects the 2 per phase", () => {
  const library = [
    row("P1", "10A", "126", 9),
    row("P2", "11A", "127", 8),
    row("P3", "10A", "127", 10),
    row("R1", "9A", "124", 7),
    row("R2", "10A", "125", 6),
  ];
  const picks = suggestPlanB(library, tracks, "peak", 5);
  assert.ok(picks.length >= 2);
  const fill = planBFill(library, tracks);
  const titles = fill.map((pick) => pick.row.title);
  assert.equal(new Set(titles).size, titles.length, "no duplicates");
  assert.equal(fill.filter((pick) => pick.phase === "peak").length, 2);
  assert.ok(fill.filter((pick) => pick.phase === "rise").length <= 2);
});

test("a track that fits two phases goes to the scarcer one when filling", () => {
  // E5 fits open (3-5) and lift (5-6); only it can cover lift, while open has more choices.
  const phased = [
    mk("o1", "open", "groove", "8A", "120", 3),
    mk("l1", "lift", "groove", "8A", "122", 5),
  ];
  const library = [
    row("Both", "8A", "121", 5),
    row("OpenOnly1", "8A", "120", 4),
    row("OpenOnly2", "8A", "120", 3),
    row("LiftOnly", "8A", "122", 6),
  ];
  const fill = planBFill(library, phased);
  const lift = fill.filter((pick) => pick.phase === "lift").map((pick) => pick.row.title).sort();
  assert.deepEqual(lift, ["Both", "LiftOnly"]);
});
