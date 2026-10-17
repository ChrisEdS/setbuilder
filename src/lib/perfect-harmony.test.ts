import assert from "node:assert/strict";
import test from "node:test";
import { pathStats } from "./harmonic.ts";
import {
  orderByPerfectHarmony,
  perfectEdgeCost,
  perfectHarmonyStats,
} from "./perfect-harmony.ts";
import { reorderDraft } from "./extract-set.ts";
import { DEFAULT_SET } from "./set.ts";

const t = (
  id: string,
  keyCamelot: string,
  bpm: string,
  energyLevel: number,
) => ({ id, keyCamelot, bpm, energyLevel });

test("clash edges cost far more than adjacent Camelot moves", () => {
  const a = t("a", "1A", "124", 6);
  const adjacent = t("b", "2A", "124", 6);
  const clash = t("c", "8A", "124", 6);
  assert.ok(perfectEdgeCost(a, clash) > perfectEdgeCost(a, adjacent) * 10);
});

test("perfect harmony reaches zero clashes on a connected Camelot chain", () => {
  // One connected component: every key can reach the next via safe/contrast moves.
  const group = [
    t("a", "5A", "120", 5),
    t("b", "8A", "124", 7),
    t("c", "6A", "122", 6),
    t("d", "9A", "125", 8),
    t("e", "7A", "123", 7),
    t("f", "8B", "124", 6),
    t("g", "7B", "121", 6),
    t("h", "4A", "119", 5),
  ];
  const before = perfectHarmonyStats(group);
  const ordered = orderByPerfectHarmony(group);
  const after = perfectHarmonyStats(ordered);
  assert.ok(after.clashes < before.clashes, `clashes ${before.clashes} → ${after.clashes}`);
  assert.equal(after.clashes, 0);
  assert.ok((after.avgPct ?? 0) >= 80, `expected high mix score, got ${after.avgPct}`);
});

test("perfect harmony minimizes clashes when Camelot components are disconnected", () => {
  // Screenshot-style bag: 1A/1B/12A has no non-clash bridge to 4A–9A/7B.
  // Exact TSP can do at most one clash — zero is graph-impossible.
  const group = [
    t("a", "1A", "118", 7),
    t("b", "1B", "127", 6),
    t("c", "8A", "124", 5),
    t("d", "8A", "126", 5),
    t("e", "6A", "130", 6),
    t("f", "5A", "125", 6),
    t("g", "1A", "125", 7),
    t("h", "4A", "120", 6),
    t("i", "12A", "127", 7),
    t("j", "7B", "94", 7),
    t("k", "6A", "118", 7),
    t("l", "9A", "120", 8),
    t("m", "9A", "122", 7),
    t("n", "8A", "123", 7),
    t("o", "6A", "121", 6),
    t("p", "4A", "123", 6),
  ];
  const before = perfectHarmonyStats(group);
  const ordered = orderByPerfectHarmony(group);
  const after = perfectHarmonyStats(ordered);
  assert.ok(after.clashes < before.clashes, `clashes ${before.clashes} → ${after.clashes}`);
  assert.equal(after.clashes, 1, "one bridge clash is the Camelot minimum");
  assert.ok((after.avg ?? 0) > (before.avg ?? 0));
  assert.ok((after.avgPct ?? 0) >= 80, `expected high mix score, got ${after.avgPct}`);
});

test("perfect harmony keeps a pinned opener and closer", () => {
  // Opener/closer sit on a connected spine with the mids.
  const group = [
    t("open", "5A", "120", 4),
    t("mid1", "8A", "124", 7),
    t("mid2", "9A", "125", 7),
    t("mid3", "7A", "123", 6),
    t("close", "6A", "118", 5),
  ];
  const ordered = orderByPerfectHarmony(group, {
    fixedStartId: "open",
    fixedEndId: "close",
  });
  assert.equal(ordered[0].id, "open");
  assert.equal(ordered[ordered.length - 1].id, "close");
  assert.equal(perfectHarmonyStats(ordered).clashes, 0);
});

test("reorderDraft perfect reorders across phases and re-lays the arc", () => {
  const track = (
    id: string,
    phase: "open" | "peak" | "release",
    keyCamelot: string,
    energyLevel: number,
  ) => ({
    id,
    name: id,
    artists: ["X"],
    album: "",
    durationMs: 180_000,
    uri: "",
    externalUrl: "",
    imageUrl: null,
    phase,
    role: "groove" as const,
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
      track("a", "open", "1A", 4),
      track("b", "open", "8A", 5),
      track("c", "peak", "2A", 8),
      track("d", "peak", "9A", 9),
      track("e", "release", "1B", 5),
      track("f", "release", "3A", 4),
      {
        ...track("s", "peak", "12A", 9),
        role: "safety" as const,
      },
    ],
  };
  const before = pathStats(
    draft.tracks.filter((item) => item.role !== "safety"),
  );
  const next = reorderDraft(draft, "perfect");
  const performance = next.tracks.filter((item) => item.role !== "safety");
  const after = pathStats(performance);
  assert.equal(next.tracks[next.tracks.length - 1].role, "safety");
  // Without pins, current ends still stay (Perfect copy: opener/closer stay).
  assert.equal(performance[0].id, "a");
  assert.equal(performance[performance.length - 1].id, "f");
  assert.ok(after.clashes <= before.clashes);
  assert.ok((after.avg ?? 0) >= (before.avg ?? 0) - 0.01);
  assert.ok(performance.every((item) => item.phase));
});

test("reorderDraft perfect respects pinned opener over current first track", () => {
  const track = (
    id: string,
    phase: "open" | "peak" | "release",
    keyCamelot: string,
    energyLevel: number,
  ) => ({
    id,
    name: id,
    artists: ["X"],
    album: "",
    durationMs: 180_000,
    uri: "",
    externalUrl: "",
    imageUrl: null,
    phase,
    role: "groove" as const,
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
    openerId: "c",
    closerId: "a",
    tracks: [
      track("a", "open", "1A", 4),
      track("b", "open", "8A", 5),
      track("c", "peak", "2A", 8),
      track("d", "peak", "9A", 9),
      track("e", "release", "1B", 5),
      track("f", "release", "3A", 4),
    ],
  };
  const next = reorderDraft(draft, "perfect");
  const performance = next.tracks.filter((item) => item.role !== "safety");
  assert.equal(performance[0].id, "c");
  assert.equal(performance[performance.length - 1].id, "a");
  assert.equal(next.openerId, "c");
  assert.equal(next.closerId, "a");
});
