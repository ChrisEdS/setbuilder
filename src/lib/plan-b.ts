import { PHASE_ENERGY, PLAN_B_MIN, energyFitsPhase, planBCount, planBState } from "./energy";
import { bpmDelta } from "./harmonic";
import { parseKeyValue } from "./key-import";
import { sidePhrase } from "./replace-track";
import { PHASES, performanceTracks, type SetPhaseId, type SetTrack } from "./set";

export type PlanBRow = {
  artist: string;
  title: string;
  key: string;
  bpm: string;
  energy?: number;
  stick?: { energyLevel?: number };
};

export type PlanBSuggestion<R extends PlanBRow> = {
  row: R;
  phase: SetPhaseId;
  /** 0–1 fit against the phase's performance tracks. */
  score: number;
  energy?: number;
  keyCamelot: string;
};

function sameTrack(track: SetTrack, row: PlanBRow): boolean {
  return (
    track.name.toLowerCase() === row.title.toLowerCase() &&
    track.artists.join(",").toLowerCase() === row.artist.toLowerCase()
  );
}

/**
 * Library tracks that would make a good Plan B for one phase: the energy sits in the
 * phase band, and key, BPM and energy blend with the phase's performance tracks.
 * Key clashes and tracks already in the set never qualify.
 */
export function suggestPlanB<R extends PlanBRow>(
  library: R[],
  tracks: SetTrack[],
  phase: SetPhaseId,
  limit = 3,
): PlanBSuggestion<R>[] {
  const refs = performanceTracks(tracks).filter((track) => track.phase === phase && track.keyCamelot);
  if (!refs.length) return [];
  // A handful of evenly spread references is enough and keeps big phases cheap.
  const step = Math.max(1, Math.ceil(refs.length / 6));
  const sample = refs.filter((_, index) => index % step === 0);

  const out: PlanBSuggestion<R>[] = [];
  for (const row of library) {
    if (tracks.some((track) => sameTrack(track, row))) continue;
    const energy = row.energy ?? row.stick?.energyLevel;
    if (energy != null && energyFitsPhase(energy, phase) === false) continue;
    const keyCamelot = parseKeyValue(row.key) || "";
    if (!keyCamelot) continue;
    // Same limit as "Passt zu": a swap must stay within 6 BPM of a track in the phase.
    const deltas = sample.map((ref) => bpmDelta(ref.bpm, row.bpm));
    if (deltas.every((delta) => delta != null && Math.abs(delta) > 6)) continue;
    const scores = sample
      .map((ref) =>
        sidePhrase(
          { keyCamelot: ref.keyCamelot, bpm: ref.bpm, energyLevel: ref.energyLevel },
          { keyCamelot, bpm: row.bpm, energyLevel: energy },
          "danach",
        ),
      )
      .filter((side): side is { text: string; score: number } => Boolean(side));
    if (!scores.length) continue;
    const score = scores.reduce((sum, side) => sum + side.score, 0) / scores.length;
    if (score < 0.55) continue;
    out.push({ row, phase, score, energy, keyCamelot });
  }
  return out
    .sort((a, b) => b.score - a.score || Number(b.energy != null) - Number(a.energy != null))
    .slice(0, limit);
}

/**
 * Fills every thin phase from the library, best fits first, and never uses one library
 * track twice. Phases without performance tracks are skipped.
 */
export function planBFill<R extends PlanBRow>(library: R[], tracks: SetTrack[]): PlanBSuggestion<R>[] {
  const used = new Set<R>();
  const out: PlanBSuggestion<R>[] = [];
  // Scarce phases pick first, so a track that fits two phases goes where it is needed most.
  const options = new Map(
    PHASES.map((phase) => [phase.id, suggestPlanB(library, tracks, phase.id, Infinity).length]),
  );
  const order = [...PHASES].sort((a, b) => (options.get(a.id) ?? 0) - (options.get(b.id) ?? 0));
  for (const phase of order) {
    const need = PLAN_B_MIN - planBCount(tracks, phase.id);
    if (need <= 0) continue;
    const picks = suggestPlanB(
      library.filter((row) => !used.has(row)),
      tracks,
      phase.id,
      need,
    );
    for (const pick of picks) {
      used.add(pick.row);
      out.push(pick);
    }
  }
  return out;
}

/**
 * The phase an Alternative belongs to. Keeps the phase it already has when its energy
 * fits (or is unknown). Otherwise it takes the phase whose band fits, or, if none does,
 * the nearest band, preferring the phase it blends with best.
 */
export function bestPhaseFor(
  track: { phase: SetPhaseId; energyLevel?: number; keyCamelot: string; bpm: string },
  tracks: SetTrack[],
): SetPhaseId {
  const state = planBState(track);
  if (state === "fit" || state === "unknown") return track.phase;
  const level = track.energyLevel as number;
  const withTracks = PHASES.filter((phase) =>
    performanceTracks(tracks).some((item) => item.phase === phase.id),
  ).map((phase) => phase.id);
  const pool = withTracks.length ? withTracks : PHASES.map((phase) => phase.id);
  const gap = (phase: SetPhaseId) => {
    const band = PHASE_ENERGY[phase];
    return Math.max(0, band.min - level, level - band.max);
  };
  const fitting = pool.filter((phase) => gap(phase) === 0);
  const candidates = fitting.length
    ? fitting
    : pool.filter((phase) => gap(phase) === Math.min(...pool.map(gap)));
  if (candidates.length === 1) return candidates[0];
  const blend = (phase: SetPhaseId) => {
    const refs = performanceTracks(tracks).filter((item) => item.phase === phase && item.keyCamelot);
    const scores = refs
      .map((ref) =>
        sidePhrase(
          { keyCamelot: ref.keyCamelot, bpm: ref.bpm, energyLevel: ref.energyLevel },
          { keyCamelot: track.keyCamelot, bpm: track.bpm, energyLevel: track.energyLevel },
          "danach",
        ),
      )
      .filter((side): side is { text: string; score: number } => Boolean(side));
    return scores.length ? scores.reduce((sum, side) => sum + side.score, 0) / scores.length : 0;
  };
  return [...candidates].sort((a, b) => blend(b) - blend(a))[0];
}
