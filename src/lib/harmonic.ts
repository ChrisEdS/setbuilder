/**
 * Camelot Wheel helpers for harmonic mixing, following Mixed In Key's rules.
 * Smooth moves: same key, ±1 number, A/B switch on the same number (8A ↔ 8B).
 * Energy Boost: +2 numbers, same letter (8A → 10A). Use sparingly.
 * Everything else only works with a short overlap, a break or EQ. Key is a
 * starting point for the melodic overlap, not a guarantee, and it matters less
 * than energy.
 */

import { tDe, type Translate } from "@/lib/i18n/core";
import { energyScore, energyStep, energyText } from "./energy";

export type CamelotCode = `${number}A` | `${number}B`;

export type HarmonicRelation =
  | "same"
  | "relative"
  | "adjacent"
  | "energyBoost"
  | "contrast"
  | "clash"
  | "unknown";

const CAMELOT_RE = /^([1-9]|1[0-2])([AaBb])$/;

export const CAMELOT_CODES: CamelotCode[] = Array.from({ length: 12 }, (_, i) => {
  const n = (i + 1) as number;
  return [`${n}A`, `${n}B`] as CamelotCode[];
}).flat();

/** Hue around the Camelot wheel — used for harmonic color chips */
const CAMELOT_HUES: Record<number, number> = {
  1: 8,
  2: 28,
  3: 48,
  4: 78,
  5: 125,
  6: 165,
  7: 190,
  8: 215,
  9: 245,
  10: 275,
  11: 310,
  12: 340,
};

export type CamelotColor = {
  bg: string;
  fg: string;
  border: string;
  solid: string;
};

export function camelotColor(input: string): CamelotColor | null {
  const code = normalizeCamelot(input);
  if (!code) return null;
  const num = Number(code.slice(0, -1));
  const mode = code.slice(-1);
  const hue = CAMELOT_HUES[num] ?? 160;
  const isMinor = mode === "A";
  // Minor = deeper ink on soft tint; Major = brighter wash
  const bg = isMinor
    ? `oklch(0.92 0.05 ${hue})`
    : `oklch(0.95 0.035 ${hue})`;
  const fg = `oklch(0.32 0.06 ${hue})`;
  const border = `oklch(0.78 0.07 ${hue})`;
  const solid = `oklch(0.62 0.14 ${hue})`;
  return { bg, fg, border, solid };
}

export function phaseAccent(phase: string): { bg: string; fg: string } {
  switch (phase) {
    case "open":
      return { bg: "color-mix(in oklab, var(--mint) 70%, white)", fg: "var(--slate)" };
    case "lift":
      return { bg: "color-mix(in oklab, var(--slate) 18%, white)", fg: "var(--espresso)" };
    case "rise":
      return { bg: "color-mix(in oklab, var(--mauve) 14%, white)", fg: "var(--mauve)" };
    case "peak":
      return { bg: "color-mix(in oklab, var(--mauve) 28%, white)", fg: "var(--espresso)" };
    case "release":
      return { bg: "color-mix(in oklab, var(--mint) 55%, var(--cream))", fg: "var(--slate)" };
    default:
      return { bg: "var(--paper)", fg: "var(--muted)" };
  }
}

export function roleAccent(role: string): { tint: string; bar: string } {
  switch (role) {
    case "anchor":
      return {
        tint: "color-mix(in oklab, var(--mauve) 10%, var(--cream))",
        bar: "var(--mauve)",
      };
    case "bridge":
      return {
        tint: "color-mix(in oklab, var(--slate) 12%, var(--cream))",
        bar: "var(--slate)",
      };
    case "groove":
      return {
        tint: "color-mix(in oklab, var(--mint) 45%, var(--cream))",
        bar: "color-mix(in oklab, var(--slate) 55%, var(--mint))",
      };
    case "safety":
      return {
        tint: "color-mix(in oklab, var(--cream) 85%, var(--espresso))",
        bar: "color-mix(in oklab, var(--espresso) 55%, var(--slate))",
      };
    default:
      return { tint: "var(--cream)", bar: "var(--accent)" };
  }
}

export function normalizeCamelot(input: string): CamelotCode | null {
  const trimmed = input.trim().toUpperCase().replace(/\s+/g, "");
  if (!trimmed) return null;

  // Accept "8a", "8A", "Am" style via simple map for majors/minors is out of scope —
  // we stick to Camelot codes for DJ prep.
  const match = trimmed.match(CAMELOT_RE);
  if (!match) return null;
  return `${Number(match[1])}${match[2]}` as CamelotCode;
}

export function parseBpm(input: string): number | null {
  const n = Number(String(input).replace(",", ".").trim());
  if (!Number.isFinite(n) || n < 60 || n > 200) return null;
  return n;
}

function wrap12(n: number): number {
  return ((n - 1 + 12) % 12) + 1;
}

export function harmonicRelation(from: string, to: string): HarmonicRelation {
  const a = normalizeCamelot(from);
  const b = normalizeCamelot(to);
  if (!a || !b) return "unknown";
  if (a === b) return "same";

  const aNum = Number(a.slice(0, -1));
  const bNum = Number(b.slice(0, -1));
  const aMode = a.slice(-1);
  const bMode = b.slice(-1);

  // Relative major/minor
  if (aNum === bNum && aMode !== bMode) return "relative";

  // Adjacent on wheel (±1) same mode
  if (aMode === bMode) {
    const diff = Math.min(
      Math.abs(aNum - bNum),
      12 - Math.abs(aNum - bNum),
    );
    if (diff === 1) return "adjacent";
    // Energy Boost: exactly +2 (8A -> 10A). -2 is a plain contrast.
    if (wrap12(aNum + 2) === bNum) return "energyBoost";
    if (diff === 2) return "contrast";
  }

  // Diagonal (A/B and ±1) is not one of the four safe moves: contrast.
  if (aMode !== bMode) {
    const diff = Math.min(
      Math.abs(aNum - bNum),
      12 - Math.abs(aNum - bNum),
    );
    if (diff === 1) return "contrast";
  }

  return "clash";
}

export function relationScore(relation: HarmonicRelation): number {
  switch (relation) {
    case "same":
      return 1;
    case "relative":
      return 0.95;
    case "adjacent":
      return 0.85;
    case "energyBoost":
      return 0.7;
    case "contrast":
      return 0.4;
    case "unknown":
      return 0.5;
    case "clash":
      return 0.1;
  }
}

export function relationLabel(relation: HarmonicRelation, t: Translate = tDe): string {
  switch (relation) {
    case "same":
      return t("analysis.relation.same");
    case "relative":
      return t("analysis.relation.relative");
    case "energyBoost":
      return t("analysis.relation.energyBoost");
    case "adjacent":
      return t("analysis.relation.adjacent");
    case "contrast":
      return t("analysis.relation.contrast");
    case "clash":
      return t("analysis.relation.clash");
    case "unknown":
      return t("analysis.relation.unknown");
  }
}

/** Compact badge on the Key path — full wording stays in the tooltip. */
export function relationShortLabel(
  relation: HarmonicRelation,
  t: Translate = tDe,
): string {
  switch (relation) {
    case "same":
      return t("analysis.relation.same.short");
    case "relative":
      return t("analysis.relation.relative.short");
    case "energyBoost":
      return t("analysis.relation.energyBoost.short");
    case "adjacent":
      return t("analysis.relation.adjacent.short");
    case "contrast":
      return t("analysis.relation.contrast.short");
    case "clash":
      return t("analysis.relation.clash.short");
    case "unknown":
      return t("analysis.relation.unknown.short");
  }
}

export function relationHint(relation: HarmonicRelation, t: Translate = tDe): string {
  return t(`analysis.relation.${relation}.hint`);
}

type MixSide = { keyCamelot: string; bpm: string; energyLevel?: number };

export function mixJoin(
  from: MixSide | null | undefined,
  to: MixSide,
  t: Translate = tDe,
): { relation: HarmonicRelation; label: string } | null {
  if (!from) return null;
  const relation = harmonicRelation(from.keyCamelot, to.keyCamelot);
  const delta = bpmDelta(from.bpm, to.bpm);
  const bpmText =
    delta == null ? "" : `${delta > 0 ? "+" : ""}${delta} BPM`;
  const jump = energyStep(from.energyLevel, to.energyLevel) === "jump";
  const energy = energyText(from.energyLevel, to.energyLevel, t);
  return {
    relation,
    label: [
      relationLabel(relation, t),
      bpmText,
      energy ? (jump ? t("analysis.mix.energyJump", { energy }) : energy) : "",
    ]
      .filter(Boolean)
      .join(" · "),
  };
}

/**
 * One transition, 0–1. Energy counts as much as key (energy matters more than
 * key for how a room feels); BPM adds a small correction. Missing parts are
 * left out instead of guessed.
 */
export function transitionScore(from: MixSide, to: MixSide): number | null {
  const relation = harmonicRelation(from.keyCamelot, to.keyCamelot);
  const parts: number[] = [];
  if (relation !== "unknown") parts.push(relationScore(relation));
  if (from.energyLevel != null && to.energyLevel != null) {
    parts.push(energyScore(from.energyLevel, to.energyLevel));
  }
  if (!parts.length) return null;
  let score = parts.reduce((sum, value) => sum + value, 0) / parts.length;
  const delta = bpmDelta(from.bpm, to.bpm);
  if (delta != null) {
    if (Math.abs(delta) > 4) score -= 0.12;
    else if (Math.abs(delta) <= 2) score += 0.03;
  }
  return Math.max(0, Math.min(1, score));
}

export function bpmDelta(from: string, to: string): number | null {
  const a = parseBpm(from);
  const b = parseBpm(to);
  if (a == null || b == null) return null;
  return b - a;
}

export function bpmOk(from: string, to: string, maxJump = 4): boolean {
  const delta = bpmDelta(from, to);
  if (delta == null) return true;
  return Math.abs(delta) <= maxJump;
}

/** Greedy path: from seed, always pick highest harmonic score among remaining. */
export function orderByHarmonicPath<
  T extends { keyCamelot: string; bpm: string; energyLevel?: number },
>(
  tracks: T[],
  preferEnergyRise = true,
): T[] {
  if (tracks.length <= 1) return tracks;
  const remaining = [...tracks];
  // Keep the current first track (phase opener / set opener) as the seed.
  const ordered: T[] = [remaining.shift()!];

  while (remaining.length) {
    const prev = ordered[ordered.length - 1];
    let bestIdx = 0;
    let bestScore = -1;
    remaining.forEach((candidate, index) => {
      const relation = harmonicRelation(prev.keyCamelot, candidate.keyCamelot);
      let score = relationScore(relation);
      if (preferEnergyRise && relation === "energyBoost") score += 0.02;
      if (preferEnergyRise && relation === "contrast") score -= 0.1;
      // Energy: stay within one level, step in the phase direction.
      if (prev.energyLevel != null && candidate.energyLevel != null) {
        const step = candidate.energyLevel - prev.energyLevel;
        if (step === 0) score += 0.06;
        else if (Math.abs(step) === 1) {
          score += (step > 0) === preferEnergyRise ? 0.1 : 0.04;
        } else if (Math.abs(step) === 2) score -= 0.02;
        else score -= 0.25;
      }
      const delta = bpmDelta(prev.bpm, candidate.bpm);
      if (delta != null) {
        if (Math.abs(delta) <= 2) score += 0.08;
        else if (Math.abs(delta) <= 4) score += 0.03;
        else score -= 0.15;
        if (preferEnergyRise && delta > 0 && delta <= 4) score += 0.04;
      }
      if (score > bestScore) {
        bestScore = score;
        bestIdx = index;
      }
    });
    ordered.push(remaining.splice(bestIdx, 1)[0]);
  }
  return ordered;
}

export function pathStats(tracks: MixSide[]) {
  const relations: HarmonicRelation[] = [];
  const scores: number[] = [];
  let energyJumps = 0;
  for (let i = 1; i < tracks.length; i++) {
    relations.push(
      harmonicRelation(tracks[i - 1].keyCamelot, tracks[i].keyCamelot),
    );
    const score = transitionScore(tracks[i - 1], tracks[i]);
    if (score != null) scores.push(score);
    if (energyStep(tracks[i - 1].energyLevel, tracks[i].energyLevel) === "jump") {
      energyJumps += 1;
    }
  }
  const avg =
    scores.length === 0
      ? null
      : scores.reduce((sum, value) => sum + value, 0) / scores.length;
  const clashes = relations.filter((r) => r === "clash").length;
  const keyed = tracks.filter((t) => normalizeCamelot(t.keyCamelot)).length;
  const energized = tracks.filter((t) => t.energyLevel != null).length;
  return {
    relations,
    avg,
    clashes,
    keyed,
    energized,
    energyJumps,
    total: tracks.length,
  };
}
