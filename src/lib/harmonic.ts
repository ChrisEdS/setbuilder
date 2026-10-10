/**
 * Camelot Wheel helpers for harmonic mixing.
 * Compatible moves: same key, ±1 number, relative major/minor (e.g. 8A ↔ 8B).
 * Energy boost: +1 number into dominant (e.g. 8A → 9A) feels like lift.
 */

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
    if (diff === 1) {
      // Clockwise +1 often felt as energy boost
      const clockwise = wrap12(aNum + 1) === bNum;
      return clockwise ? "energyBoost" : "adjacent";
    }
    // Deliberate contrast: ±2 or opposite mode jump across wheel
    if (diff === 2) return "contrast";
  }

  // Relative then step (still usable)
  if (aMode !== bMode) {
    const diff = Math.min(
      Math.abs(aNum - bNum),
      12 - Math.abs(aNum - bNum),
    );
    if (diff === 1) return "adjacent";
  }

  return "clash";
}

export function relationScore(relation: HarmonicRelation): number {
  switch (relation) {
    case "same":
      return 1;
    case "relative":
      return 0.95;
    case "energyBoost":
      return 0.9;
    case "adjacent":
      return 0.85;
    case "contrast":
      return 0.45;
    case "unknown":
      return 0.5;
    case "clash":
      return 0.1;
  }
}

export function relationLabel(relation: HarmonicRelation): string {
  switch (relation) {
    case "same":
      return "gleiche Key";
    case "relative":
      return "Relative Dur/Moll";
    case "energyBoost":
      return "Energy boost (+1)";
    case "adjacent":
      return "Nachbar-Key";
    case "contrast":
      return "Key-Contrast";
    case "clash":
      return "Harmonic clash";
    case "unknown":
      return "Key offen";
  }
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
export function orderByHarmonicPath<T extends { keyCamelot: string; bpm: string }>(
  tracks: T[],
  preferEnergyRise = true,
): T[] {
  if (tracks.length <= 1) return tracks;
  const remaining = [...tracks];
  // Start with track that has a key, else first
  let startIdx = remaining.findIndex((t) => normalizeCamelot(t.keyCamelot));
  if (startIdx < 0) startIdx = 0;
  const ordered: T[] = [remaining.splice(startIdx, 1)[0]];

  while (remaining.length) {
    const prev = ordered[ordered.length - 1];
    let bestIdx = 0;
    let bestScore = -1;
    remaining.forEach((candidate, index) => {
      const relation = harmonicRelation(prev.keyCamelot, candidate.keyCamelot);
      let score = relationScore(relation);
      if (preferEnergyRise && relation === "energyBoost") score += 0.05;
      if (preferEnergyRise && relation === "contrast") score -= 0.1;
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

export function pathStats(tracks: { keyCamelot: string; bpm: string }[]) {
  const relations: HarmonicRelation[] = [];
  for (let i = 1; i < tracks.length; i++) {
    relations.push(
      harmonicRelation(tracks[i - 1].keyCamelot, tracks[i].keyCamelot),
    );
  }
  const known = relations.filter((r) => r !== "unknown");
  const avg =
    known.length === 0
      ? null
      : known.reduce((sum, r) => sum + relationScore(r), 0) / known.length;
  const clashes = relations.filter((r) => r === "clash").length;
  const keyed = tracks.filter((t) => normalizeCamelot(t.keyCamelot)).length;
  return { relations, avg, clashes, keyed, total: tracks.length };
}
