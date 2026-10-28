/**
 * Ways to reorder a set inside each phase. Roles stay as given;
 * only the played order in Open → Release changes.
 * Non-excluded Alternatives are promoted in reorderDraft before this runs.
 *
 * Techniques follow Mixed In Key / Camelot community practice:
 * harmonic path, one-step energy, energy arcs, BPM ramps and neighbor chains,
 * Camelot journey, and peak groove/impact waves.
 */

import {
  harmonicRelation,
  normalizeCamelot,
  orderByHarmonicPath,
  parseBpm,
} from "@/lib/harmonic";
import { orderByPerfectHarmony } from "@/lib/perfect-harmony";
import type { SetPhaseId } from "@/lib/set";

export const SET_SORTS = [
  "perfect",
  "harmonic",
  "gentle",
  "energy",
  "roller",
  "tempo",
  "pulse",
  "journey",
  "waves",
] as const;

export type SetSortTechnique = (typeof SET_SORTS)[number];

type Sortable = {
  id?: string;
  keyCamelot: string;
  bpm: string;
  energyLevel?: number;
  energy?: number;
  /** Used by Waves to alternate groove ↔ impact (anchor). */
  role?: string;
};

export function orderPhase<T extends Sortable>(
  tracks: T[],
  phase: SetPhaseId,
  technique: SetSortTechnique,
): T[] {
  const rise = phase !== "release";
  switch (technique) {
    case "perfect":
      // Global perfect mode is handled in reorderDraft; per-phase fallback.
      return orderByPerfectHarmony(
        tracks.map((track, index) => ({ ...track, id: track.id ?? `t${index}` })),
      );
    case "harmonic":
      return orderByHarmonicPath(tracks, rise);
    case "gentle":
      return orderByGentleEnergy(tracks, rise);
    case "energy":
      return orderByEnergy(tracks, rise);
    case "roller":
      return orderByEnergyRoller(tracks, phase);
    case "tempo":
      return orderByTempo(tracks, rise);
    case "pulse":
      return orderByTempoPulse(tracks, rise);
    case "journey":
      return orderByCamelotJourney(tracks);
    case "waves":
      return orderByWaves(tracks, phase);
  }
}

function energyValue(track: Sortable): number | null {
  if (track.energyLevel != null) return track.energyLevel;
  if (track.energy != null) return track.energy * 10;
  return null;
}

function cmpMissing(a: number | null, b: number | null): number | null {
  if (a == null && b == null) return 0;
  if (a == null) return 1;
  if (b == null) return -1;
  return null;
}

function camelotNumber(input: string): number | null {
  const code = normalizeCamelot(input);
  if (!code) return null;
  return Number(code.slice(0, -1));
}

function camelotMode(input: string): string | null {
  const code = normalizeCamelot(input);
  if (!code) return null;
  return code.slice(-1);
}

/** Clockwise steps on the Camelot wheel (0–11). */
function clockwise(from: number, to: number): number {
  return (to - from + 12) % 12;
}

/**
 * Energy primary; Camelot key clusters equal-energy ties; BPM last.
 * Matches the “Key is only the tie-breaker” sort hint.
 */
export function orderByEnergy<T extends Sortable>(tracks: T[], rise = true): T[] {
  return [...tracks].sort((a, b) => {
    const missing = cmpMissing(energyValue(a), energyValue(b));
    if (missing != null) return missing;
    const delta = (energyValue(a) as number) - (energyValue(b) as number);
    if (delta !== 0) return rise ? delta : -delta;

    const numA = camelotNumber(a.keyCamelot);
    const numB = camelotNumber(b.keyCamelot);
    const keyMissing = cmpMissing(numA, numB);
    if (keyMissing != null) return keyMissing;
    if (numA !== numB) return (numA as number) - (numB as number);
    const modeA = camelotMode(a.keyCamelot) ?? "";
    const modeB = camelotMode(b.keyCamelot) ?? "";
    if (modeA !== modeB) return modeA.localeCompare(modeB);

    const bpm = (parseBpm(a.bpm) ?? 0) - (parseBpm(b.bpm) ?? 0);
    return rise ? bpm : -bpm;
  });
}

export function orderByTempo<T extends Sortable>(tracks: T[], rise = true): T[] {
  return [...tracks].sort((a, b) => {
    const missing = cmpMissing(parseBpm(a.bpm), parseBpm(b.bpm));
    if (missing != null) return missing;
    const delta = (parseBpm(a.bpm) as number) - (parseBpm(b.bpm) as number);
    if (delta !== 0) return rise ? delta : -delta;
    return (energyValue(a) ?? 0) - (energyValue(b) ?? 0);
  });
}

/**
 * Mixed In Key: move energy one level at a time. Keeps the opener, then greedily
 * picks the remaining track with the smallest |Δenergy|, preferring a +1/−1
 * step in the phase direction over flat or larger jumps.
 */
export function orderByGentleEnergy<T extends Sortable>(
  tracks: T[],
  rise = true,
): T[] {
  if (tracks.length <= 1) return tracks;
  const remaining = [...tracks];
  const ordered: T[] = [remaining.shift()!];

  while (remaining.length) {
    const prev = ordered[ordered.length - 1];
    const prevE = energyValue(prev);
    let bestIdx = 0;
    let best = Number.POSITIVE_INFINITY;

    remaining.forEach((candidate, index) => {
      const nextE = energyValue(candidate);
      let cost: number;
      if (prevE == null || nextE == null) {
        cost = 40;
      } else {
        const step = nextE - prevE;
        const abs = Math.abs(step);
        if (abs === 0) cost = 1.2;
        else if (abs === 1) cost = (step > 0) === rise ? 0 : 0.55;
        else if (abs === 2) cost = (step > 0) === rise ? 6 : 8;
        else cost = 20 + abs * 3;
      }
      const bpmDelta =
        Math.abs((parseBpm(candidate.bpm) ?? 0) - (parseBpm(prev.bpm) ?? 0)) *
        0.02;
      cost += bpmDelta;
      // Prefer mixable keys when energy cost ties.
      const relation = harmonicRelation(prev.keyCamelot, candidate.keyCamelot);
      if (relation === "clash") cost += 2.5;
      else if (relation === "contrast") cost += 1.2;
      else if (relation === "same" || relation === "relative") cost -= 0.15;
      else if (relation === "adjacent") cost -= 0.08;
      if (cost < best) {
        best = cost;
        bestIdx = index;
      }
    });
    ordered.push(remaining.splice(bestIdx, 1)[0]);
  }
  return ordered;
}

/**
 * BPM neighbor chain (±2–4 preferred). Keeps the opener, then picks the closest
 * BPM that still leans with the phase — classic “stay in the pocket” mixing.
 */
export function orderByTempoPulse<T extends Sortable>(
  tracks: T[],
  rise = true,
): T[] {
  if (tracks.length <= 1) return tracks;
  const remaining = [...tracks];
  const ordered: T[] = [remaining.shift()!];

  while (remaining.length) {
    const prev = ordered[ordered.length - 1];
    const prevBpm = parseBpm(prev.bpm);
    let bestIdx = 0;
    let best = Number.POSITIVE_INFINITY;

    remaining.forEach((candidate, index) => {
      const nextBpm = parseBpm(candidate.bpm);
      let cost: number;
      if (prevBpm == null || nextBpm == null) {
        cost = 50;
      } else {
        const delta = nextBpm - prevBpm;
        const abs = Math.abs(delta);
        cost = abs;
        if (abs <= 2) cost -= 0.4;
        else if (abs <= 4) cost -= 0.15;
        else if (abs > 6) cost += abs * 0.25;
        if (delta !== 0 && (delta > 0) === rise) cost -= 0.35;
        else if (delta !== 0) cost += 0.2;
      }
      const ePrev = energyValue(prev);
      const eNext = energyValue(candidate);
      if (ePrev != null && eNext != null) {
        cost += Math.abs(eNext - ePrev) * 0.05;
      }
      if (cost < best) {
        best = cost;
        bestIdx = index;
      }
    });
    ordered.push(remaining.splice(bestIdx, 1)[0]);
  }
  return ordered;
}

/**
 * Mixed In Key energy arc: climb, dip about two levels, climb again to the
 * high point. Only Peak gets the dip; Open/Lift/Rise climb, Release falls.
 */
export function orderByEnergyRoller<T extends Sortable>(
  tracks: T[],
  phase: SetPhaseId,
): T[] {
  if (phase === "release") return orderByEnergy(tracks, false);
  if (phase !== "peak") return orderByEnergy(tracks, true);

  const ranked = orderByEnergy(tracks, true);
  const n = ranked.length;
  if (n < 4) return ranked;

  const valleyCount = Math.min(2, Math.max(1, Math.floor(n / 4)));
  const valleyIdx = Math.min(
    Math.floor(n * 0.3),
    n - valleyCount - 1,
  );
  const valley = ranked.slice(valleyIdx, valleyIdx + valleyCount);
  const withoutValley = [
    ...ranked.slice(0, valleyIdx),
    ...ranked.slice(valleyIdx + valleyCount),
  ];
  const mid = Math.ceil(withoutValley.length / 2);
  return [
    ...withoutValley.slice(0, mid),
    ...valley,
    ...withoutValley.slice(mid),
  ];
}

/**
 * Walk the Camelot wheel clockwise instead of clustering the same key.
 * Same-key stacking is penalized; +1 adjacent is preferred.
 */
export function orderByCamelotJourney<T extends Sortable>(tracks: T[]): T[] {
  if (tracks.length <= 1) return tracks;
  const remaining = [...tracks];
  const ordered: T[] = [remaining.shift()!];

  while (remaining.length) {
    const prev = ordered[ordered.length - 1];
    const prevNum = camelotNumber(prev.keyCamelot);
    let bestIdx = 0;
    let best = Number.POSITIVE_INFINITY;
    remaining.forEach((candidate, index) => {
      const relation = harmonicRelation(prev.keyCamelot, candidate.keyCamelot);
      const num = camelotNumber(candidate.keyCamelot);
      let score = 80;
      if (prevNum != null && num != null) {
        const spin = clockwise(prevNum, num);
        if (relation === "adjacent" && spin === 1) score = 0;
        else if (relation === "relative") score = 0.5;
        else if (relation === "energyBoost" && spin === 1) score = 1.2;
        else if (relation === "adjacent" && spin === 11) score = 2.2;
        else if (relation === "same") score = 3.5;
        else if (relation === "energyBoost") score = 2.5 + spin * 0.15;
        else if (relation === "contrast") score = 12 + spin;
        else if (relation === "clash") score = 40 + spin;
        else score = spin + 0.6;
      }
      if (score < best) {
        best = score;
        bestIdx = index;
      }
    });
    ordered.push(remaining.splice(bestIdx, 1)[0]);
  }
  return ordered;
}

/**
 * Peak: groove and impact (anchor) alternate when roles are set;
 * otherwise low/high energy interleave. Other phases follow energy of the slot.
 */
export function orderByWaves<T extends Sortable>(tracks: T[], phase: SetPhaseId): T[] {
  if (phase === "release") return orderByEnergy(tracks, false);
  if (phase !== "peak") return orderByEnergy(tracks, true);

  const grooves = tracks.filter((track) => track.role === "groove");
  const impacts = tracks.filter((track) => track.role === "anchor");
  const others = tracks.filter(
    (track) => track.role !== "groove" && track.role !== "anchor",
  );

  if (grooves.length > 0 && impacts.length > 0) {
    const g = orderByEnergy(grooves, true);
    const i = orderByEnergy(impacts, true);
    const o = orderByEnergy(others, true);
    const out: T[] = [];
    let gi = 0;
    let ii = 0;
    let takeImpact = false;
    while (gi < g.length || ii < i.length) {
      if (takeImpact && ii < i.length) out.push(i[ii++]);
      else if (!takeImpact && gi < g.length) out.push(g[gi++]);
      else if (ii < i.length) out.push(i[ii++]);
      else out.push(g[gi++]);
      takeImpact = !takeImpact;
    }
    // Sprinkle remaining roles into the middle by energy order.
    for (const track of o) {
      const mid = Math.min(out.length, Math.max(1, Math.floor(out.length / 2)));
      out.splice(mid, 0, track);
    }
    return out;
  }

  const ranked = orderByEnergy(tracks, true);
  const out: T[] = [];
  let low = 0;
  let high = ranked.length - 1;
  let takeHigh = false;
  while (low <= high) {
    out.push(ranked[takeHigh ? high-- : low++]);
    takeHigh = !takeHigh;
  }
  return out;
}
