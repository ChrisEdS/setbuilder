/**
 * Maximize mix score / kill Camelot clashes across a whole performance.
 *
 * Models the set as a path TSP: edge cost = how far a transition sits from a
 * perfect Mixed In Key move (same / relative / ±1), plus energy and BPM.
 * Exact Held-Karp for small sets; multi-start nearest-neighbor + 2-opt/or-opt
 * beyond.
 *
 * Inspired by HarmonySet (Held-Karp), DJ.Studio Harmonize, Mixed In Key energy
 * boosts, and ISMIR playlist sequencing — tuned to SETBUILDER's transitionScore
 * so the Arc % climbs. When the Camelot graph has disconnected components,
 * a clash-free path is impossible; we still minimize clashes first, then cost.
 */

import {
  bpmDelta,
  harmonicRelation,
  normalizeCamelot,
  transitionScore,
  type HarmonicRelation,
} from "@/lib/harmonic";
import { energyStep } from "@/lib/energy";

export type PerfectSortable = {
  id: string;
  keyCamelot: string;
  bpm: string;
  energyLevel?: number;
  energy?: number;
};

export type PerfectHarmonyOptions = {
  /** Pin the first track (opener). */
  fixedStartId?: string | null;
  /** Pin the last track (closer). */
  fixedEndId?: string | null;
};

/** Exact DP is comfortable through 18 with a precomputed edge matrix. */
const HELD_KARP_MAX = 18;

function energyOf(track: PerfectSortable): number | null {
  if (track.energyLevel != null) return track.energyLevel;
  if (track.energy != null) return track.energy * 10;
  return null;
}

/** Lower is better. Clash is catastrophic so the search avoids it first. */
export function perfectEdgeCost(from: PerfectSortable, to: PerfectSortable): number {
  const relation = harmonicRelation(from.keyCamelot, to.keyCamelot);
  let cost = relationCost(relation);

  const eFrom = energyOf(from);
  const eTo = energyOf(to);
  if (eFrom != null && eTo != null) {
    const step = energyStep(eFrom, eTo);
    if (step === "jump") cost += 18;
    else if (step === "lift") cost += 5;
    else if (step === "smooth") cost += 0.4;
    // Prefer Mixed In Key one-step climb slightly over a drop.
    const delta = eTo - eFrom;
    if (delta === 1) cost -= 0.3;
    else if (delta === -1) cost += 0.15;
    // Reward energy-boost key moves that also lift energy (MIK technique).
    if (relation === "energyBoost" && delta > 0) cost -= 1.2;
  } else {
    cost += 1.5;
  }

  const bpm = bpmDelta(from.bpm, to.bpm);
  if (bpm != null) {
    const abs = Math.abs(bpm);
    if (abs <= 2) cost -= 0.4;
    else if (abs <= 4) cost -= 0.1;
    else if (abs <= 6) cost += 2 + (abs - 4);
    else cost += 8 + (abs - 6) * 1.2;
  } else {
    cost += 1;
  }

  // Soft tie-breaker aligned with the visible mix score.
  const scored = transitionScore(
    { keyCamelot: from.keyCamelot, bpm: from.bpm, energyLevel: eFrom ?? undefined },
    { keyCamelot: to.keyCamelot, bpm: to.bpm, energyLevel: eTo ?? undefined },
  );
  if (scored != null) cost += (1 - scored) * 6;

  return Math.max(0, cost);
}

function relationCost(relation: HarmonicRelation): number {
  switch (relation) {
    case "same":
      return 0;
    case "relative":
      return 0.8;
    case "adjacent":
      return 2.2;
    case "energyBoost":
      return 9;
    case "contrast":
      return 45;
    case "unknown":
      return 28;
    case "clash":
      // Dominates any finite chain of contrast/boost edges.
      return 10_000;
  }
}

function buildEdgeMatrix(tracks: PerfectSortable[]): Float64Array {
  const n = tracks.length;
  const edge = new Float64Array(n * n);
  for (let i = 0; i < n; i++) {
    for (let j = 0; j < n; j++) {
      edge[i * n + j] = i === j ? 0 : perfectEdgeCost(tracks[i], tracks[j]);
    }
  }
  return edge;
}

function pathCostFromMatrix(
  orderIdx: number[],
  edge: Float64Array,
  n: number,
): number {
  let total = 0;
  for (let i = 1; i < orderIdx.length; i++) {
    total += edge[orderIdx[i - 1] * n + orderIdx[i]];
  }
  return total;
}

function nearestNeighbor(
  tracks: PerfectSortable[],
  edge: Float64Array,
  startIndex: number,
  fixedEndIndex: number | null,
): number[] {
  const n = tracks.length;
  const used = new Array<boolean>(n).fill(false);
  const ordered: number[] = [];
  let current = startIndex;
  used[current] = true;
  ordered.push(current);

  while (ordered.length < n - (fixedEndIndex != null ? 1 : 0)) {
    let best = -1;
    let bestCost = Number.POSITIVE_INFINITY;
    for (let i = 0; i < n; i++) {
      if (used[i] || i === fixedEndIndex) continue;
      const cost = edge[current * n + i];
      if (cost < bestCost) {
        bestCost = cost;
        best = i;
      }
    }
    if (best < 0) break;
    used[best] = true;
    ordered.push(best);
    current = best;
  }

  if (fixedEndIndex != null && !used[fixedEndIndex]) {
    ordered.push(fixedEndIndex);
    used[fixedEndIndex] = true;
  }
  for (let i = 0; i < n; i++) {
    if (!used[i]) ordered.push(i);
  }
  return ordered;
}

/** 2-opt with full path cost — edges are directed (boost ≠ reverse). */
function twoOptIdx(
  order: number[],
  edge: Float64Array,
  n: number,
  lockStart: boolean,
  lockEnd: boolean,
): number[] {
  if (order.length < 4) return order;
  const path = [...order];
  const lo = lockStart ? 1 : 0;
  const hi = lockEnd ? path.length - 2 : path.length - 1;
  let improved = true;
  let guard = 0;
  while (improved && guard++ < 80) {
    improved = false;
    let bestCost = pathCostFromMatrix(path, edge, n);
    for (let i = lo; i < hi; i++) {
      for (let k = i + 1; k <= hi; k++) {
        const next = [...path];
        let left = i;
        let right = k;
        while (left < right) {
          const tmp = next[left];
          next[left] = next[right];
          next[right] = tmp;
          left += 1;
          right -= 1;
        }
        const cost = pathCostFromMatrix(next, edge, n);
        if (cost + 1e-9 < bestCost) {
          for (let p = 0; p < path.length; p++) path[p] = next[p];
          bestCost = cost;
          improved = true;
        }
      }
    }
  }
  return path;
}

/**
 * Or-opt: relocate a short segment (1–3 tracks). Helps when 2-opt can't
 * untangle directed Camelot asymmetries (energy boost vs reverse contrast).
 */
function orOptIdx(
  order: number[],
  edge: Float64Array,
  n: number,
  lockStart: boolean,
  lockEnd: boolean,
): number[] {
  if (order.length < 4) return order;
  const path = [...order];
  const start = lockStart ? 1 : 0;
  const end = lockEnd ? path.length - 1 : path.length;
  let improved = true;
  let guard = 0;
  while (improved && guard++ < 40) {
    improved = false;
    let bestCost = pathCostFromMatrix(path, edge, n);
    for (let len = 1; len <= 3; len++) {
      for (let i = start; i + len <= end; i++) {
        if (lockEnd && i + len === path.length) continue;
        const segment = path.slice(i, i + len);
        const rest = [...path.slice(0, i), ...path.slice(i + len)];
        const insertLo = lockStart ? 1 : 0;
        const insertHi = lockEnd ? rest.length - 1 : rest.length;
        for (let j = insertLo; j <= insertHi; j++) {
          // Skip no-op reinsert at the removal hole.
          if (j === i) continue;
          const next = [...rest.slice(0, j), ...segment, ...rest.slice(j)];
          const cost = pathCostFromMatrix(next, edge, n);
          if (cost + 1e-9 < bestCost) {
            for (let p = 0; p < path.length; p++) path[p] = next[p];
            bestCost = cost;
            improved = true;
          }
        }
      }
    }
  }
  return path;
}

function polishPath(
  order: number[],
  edge: Float64Array,
  n: number,
  lockStart: boolean,
  lockEnd: boolean,
): number[] {
  let path = twoOptIdx(order, edge, n, lockStart, lockEnd);
  path = orOptIdx(path, edge, n, lockStart, lockEnd);
  path = twoOptIdx(path, edge, n, lockStart, lockEnd);
  return path;
}

/**
 * Exact minimum-cost Hamiltonian path (Held-Karp).
 * startIndex null → any start; endIndex null → any end.
 */
function heldKarp(
  tracks: PerfectSortable[],
  edge: Float64Array,
  startIndex: number | null,
  endIndex: number | null,
): number[] {
  const n = tracks.length;
  const N = 1 << n;
  const INF = Number.POSITIVE_INFINITY;
  const dp = Array.from({ length: N }, () => new Float64Array(n).fill(INF));
  const parent = Array.from({ length: N }, () => new Int16Array(n).fill(-1));

  if (startIndex != null) {
    dp[1 << startIndex][startIndex] = 0;
  } else {
    for (let i = 0; i < n; i++) {
      if (endIndex != null && i === endIndex && n > 1) continue;
      dp[1 << i][i] = 0;
    }
  }

  for (let mask = 0; mask < N; mask++) {
    for (let j = 0; j < n; j++) {
      if (!(mask & (1 << j)) || !Number.isFinite(dp[mask][j])) continue;
      for (let k = 0; k < n; k++) {
        if (mask & (1 << k)) continue;
        const nextMask = mask | (1 << k);
        // Fixed end may only be entered as the last node.
        if (endIndex != null && k === endIndex && nextMask !== N - 1) continue;
        if (endIndex != null && k !== endIndex && nextMask === N - 1) continue;
        const cost = dp[mask][j] + edge[j * n + k];
        if (cost < dp[nextMask][k]) {
          dp[nextMask][k] = cost;
          parent[nextMask][k] = j;
        }
      }
    }
  }

  const full = N - 1;
  let bestEnd = endIndex ?? 0;
  let bestCost = INF;
  if (endIndex != null) {
    bestCost = dp[full][endIndex];
    bestEnd = endIndex;
  } else {
    for (let j = 0; j < n; j++) {
      if (dp[full][j] < bestCost) {
        bestCost = dp[full][j];
        bestEnd = j;
      }
    }
  }

  if (!Number.isFinite(bestCost)) {
    const fallbackStart = startIndex ?? 0;
    return nearestNeighbor(tracks, edge, fallbackStart, endIndex);
  }

  const orderIdx: number[] = [];
  let mask = full;
  let cur = bestEnd;
  while (cur >= 0) {
    orderIdx.push(cur);
    const prev = parent[mask][cur];
    mask ^= 1 << cur;
    cur = prev;
  }
  orderIdx.reverse();
  return orderIdx;
}

function pickStartIndices(tracks: PerfectSortable[], fixedStart: number | null): number[] {
  if (fixedStart != null) return [fixedStart];
  const keyed = tracks
    .map((track, index) => ({ index, keyed: Boolean(normalizeCamelot(track.keyCamelot)) }))
    .filter((item) => item.keyed)
    .map((item) => item.index);
  const pool = keyed.length ? keyed : tracks.map((_, i) => i);
  // Prefer Camelot-diverse seeds so NN covers disconnected components.
  if (pool.length <= 12) return pool;
  const byKey = new Map<string, number>();
  for (const index of pool) {
    const key = normalizeCamelot(tracks[index].keyCamelot) ?? `?${index}`;
    if (!byKey.has(key)) byKey.set(key, index);
  }
  const diverse = [...byKey.values()];
  if (diverse.length >= 8) return diverse.slice(0, 12);
  const step = Math.max(1, Math.floor(pool.length / 12));
  const picked = new Set(diverse);
  for (let i = 0; i < pool.length && picked.size < 12; i += step) {
    picked.add(pool[i]);
  }
  return [...picked];
}

function materialize<T extends PerfectSortable>(tracks: T[], orderIdx: number[]): T[] {
  return orderIdx.map((i) => tracks[i]);
}

function enforcePins(
  orderIdx: number[],
  startIndex: number | null,
  endIndex: number | null,
): number[] {
  let path = [...orderIdx];
  if (startIndex != null) {
    path = [startIndex, ...path.filter((i) => i !== startIndex)];
  }
  if (endIndex != null) {
    path = [...path.filter((i) => i !== endIndex), endIndex];
  }
  if (startIndex != null && endIndex != null) {
    path = [
      startIndex,
      ...path.filter((i) => i !== startIndex && i !== endIndex),
      endIndex,
    ];
  }
  return path;
}

/**
 * Reorder tracks for the highest practical mix score and fewest clashes.
 * Pins opener/closer when ids are provided.
 */
export function orderByPerfectHarmony<T extends PerfectSortable>(
  tracks: T[],
  options: PerfectHarmonyOptions = {},
): T[] {
  if (tracks.length <= 1) return tracks;

  const startId = options.fixedStartId?.trim() || null;
  const endId = options.fixedEndId?.trim() || null;
  let startIndex = startId ? tracks.findIndex((t) => t.id === startId) : -1;
  let endIndex = endId && endId !== startId ? tracks.findIndex((t) => t.id === endId) : -1;
  if (startIndex < 0) startIndex = -1;
  if (endIndex < 0) endIndex = -1;
  if (startIndex >= 0 && startIndex === endIndex) endIndex = -1;

  const edge = buildEdgeMatrix(tracks);
  const n = tracks.length;
  const lockStart = startIndex >= 0;
  const lockEnd = endIndex >= 0;
  const start = lockStart ? startIndex : null;
  const end = lockEnd ? endIndex : null;

  if (n <= HELD_KARP_MAX) {
    const exact = heldKarp(tracks, edge, start, end);
    // Local polish is free insurance against reconstruction edge cases and
    // keeps pinned ends if Held-Karp was called with them.
    const polished = polishPath(
      enforcePins(exact, start, end),
      edge,
      n,
      lockStart,
      lockEnd,
    );
    return materialize(tracks, enforcePins(polished, start, end));
  }

  let best: number[] | null = null;
  let bestCost = Number.POSITIVE_INFINITY;
  for (const s of pickStartIndices(tracks, start)) {
    let path = nearestNeighbor(tracks, edge, s, end);
    path = enforcePins(path, start, end);
    path = polishPath(path, edge, n, lockStart, lockEnd);
    path = enforcePins(path, start, end);
    const cost = pathCostFromMatrix(path, edge, n);
    if (cost < bestCost) {
      bestCost = cost;
      best = path;
    }
  }
  return materialize(tracks, best ?? tracks.map((_, i) => i));
}

/** Clash count + average transition score for tests / UI. */
export function perfectHarmonyStats(tracks: PerfectSortable[]) {
  let clashes = 0;
  const scores: number[] = [];
  for (let i = 1; i < tracks.length; i++) {
    const relation = harmonicRelation(tracks[i - 1].keyCamelot, tracks[i].keyCamelot);
    if (relation === "clash") clashes += 1;
    const score = transitionScore(
      {
        keyCamelot: tracks[i - 1].keyCamelot,
        bpm: tracks[i - 1].bpm,
        energyLevel: energyOf(tracks[i - 1]) ?? undefined,
      },
      {
        keyCamelot: tracks[i].keyCamelot,
        bpm: tracks[i].bpm,
        energyLevel: energyOf(tracks[i]) ?? undefined,
      },
    );
    if (score != null) scores.push(score);
  }
  const avg =
    scores.length === 0
      ? null
      : scores.reduce((sum, value) => sum + value, 0) / scores.length;
  return {
    clashes,
    avg,
    avgPct: avg == null ? null : Math.round(avg * 100),
  };
}
