/**
 * Ways to reorder a set inside each phase. Roles and Alternativen stay;
 * only the played order in Open → Release changes.
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

export function orderByEnergy<T extends Sortable>(tracks: T[], rise = true): T[] {
  return [...tracks].sort((a, b) => {
    const missing = cmpMissing(energyValue(a), energyValue(b));
    if (missing != null) return missing;
    const delta = (energyValue(a) as number) - (energyValue(b) as number);
    if (delta !== 0) return rise ? delta : -delta;
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
        else if (abs === 2) cost = (step > 0) === rise ? 2.2 : 2.8;
        else cost = 8 + abs;
      }
      const bpmDelta =
        Math.abs((parseBpm(candidate.bpm) ?? 0) - (parseBpm(prev.bpm) ?? 0)) *
        0.02;
      cost += bpmDelta;
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
 * high point. Open/lift stay a single climb; release a single fall.
 */
export function orderByEnergyRoller<T extends Sortable>(
  tracks: T[],
  phase: SetPhaseId,
): T[] {
  if (phase === "release") return orderByEnergy(tracks, false);
  if (phase === "open" || phase === "lift") return orderByEnergy(tracks, true);

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

function camelotNumber(input: string): number | null {
  const code = normalizeCamelot(input);
  if (!code) return null;
  return Number(code.slice(0, -1));
}

function clockwise(from: number, to: number): number {
  return (to - from + 12) % 12;
}

/** Walk the Camelot wheel clockwise instead of clustering the same key. */
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
        if (relation === "same") score = 0;
        else if (relation === "relative") score = 0.4;
        else if (relation === "adjacent" && spin === 1) score = 1;
        else if (relation === "energyBoost") score = 2;
        else score = spin + (relation === "adjacent" ? 0.2 : 0.6);
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

/** Peak: groove and impact alternate. Other phases follow the energy of the slot. */
export function orderByWaves<T extends Sortable>(tracks: T[], phase: SetPhaseId): T[] {
  if (phase === "release") return orderByEnergy(tracks, false);
  if (phase !== "peak") return orderByEnergy(tracks, true);
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
