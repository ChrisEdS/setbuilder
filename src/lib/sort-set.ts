/**
 * Ways to reorder a set inside each phase. Roles and Alternativen stay;
 * only the played order in Open → Release changes.
 */

import {
  harmonicRelation,
  normalizeCamelot,
  orderByHarmonicPath,
  parseBpm,
} from "@/lib/harmonic";
import type { SetPhaseId } from "@/lib/set";

export const SET_SORTS = [
  "harmonic",
  "energy",
  "tempo",
  "journey",
  "waves",
] as const;

export type SetSortTechnique = (typeof SET_SORTS)[number];

type Sortable = {
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
    case "harmonic":
      return orderByHarmonicPath(tracks, rise);
    case "energy":
      return orderByEnergy(tracks, rise);
    case "tempo":
      return orderByTempo(tracks, rise);
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
