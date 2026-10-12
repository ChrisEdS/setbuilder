/**
 * Energy Level (1–10) as Mixed In Key rates it, plus the rules DJs use with it.
 *
 * Findings this follows (Mixed In Key guides on energy, Camelot and set planning):
 * - Energy Level describes intensity, not tempo: 1–2 ambient, 3–5 warm-up/groove,
 *   6–7 danceable, 8–10 peak.
 * - One step is the smooth move (same level or ±1). Skipping 5 → 7 sounds like
 *   another DJ; dropping 9 → 5 loses the floor unless it is a deliberate reset.
 * - A set is a wave: warm up at 3–5, rise level by level to 7–8, peak at 8–10,
 *   then dip two or three levels before the next build.
 * - Energy matters more than key; key only avoids melodic clashes.
 */

import { tDe, type Translate } from "@/lib/i18n/core";
import type { SetPhaseId } from "@/lib/set";

/** Where each phase should sit on the 1–10 scale. */
export const PHASE_ENERGY: Record<SetPhaseId, { min: number; max: number }> = {
  open: { min: 3, max: 5 },
  lift: { min: 5, max: 6 },
  rise: { min: 6, max: 8 },
  peak: { min: 8, max: 10 },
  release: { min: 4, max: 6 },
};

/**
 * Reads an Energy Level out of a tag text. Mixed In Key writes it into the
 * comment, for example "7A - Energy 6". Only an explicit "Energy n" counts, so
 * stray digits in notes are never mistaken for an energy value.
 */
export function parseEnergyLevel(text: string | undefined | null): number | undefined {
  if (!text) return undefined;
  const match = text.match(/\benergy(?:\s*level)?\s*[:=-]?\s*(10|[1-9])\b/i);
  if (!match) return undefined;
  return Number(match[1]);
}

export type EnergyStep = "same" | "smooth" | "lift" | "jump" | "unknown";

/** Classifies the move between two Energy Levels. */
export function energyStep(from?: number, to?: number): EnergyStep {
  if (from == null || to == null) return "unknown";
  const delta = Math.abs(to - from);
  if (delta === 0) return "same";
  if (delta === 1) return "smooth";
  if (delta === 2) return "lift";
  return "jump";
}

/** 0–1 fit of an energy move; unknown stays neutral. */
export function energyScore(from?: number, to?: number): number {
  switch (energyStep(from, to)) {
    case "same":
      return 1;
    case "smooth":
      return 0.9;
    case "lift":
      return 0.55;
    case "jump":
      return 0.15;
    default:
      return 0.5;
  }
}

export function energyText(from?: number, to?: number, t: Translate = tDe): string {
  if (from == null || to == null) return "";
  const delta = to - from;
  if (delta === 0) return t("analysis.energy.same");
  return t("analysis.energy.delta", { delta: `${delta > 0 ? "+" : ""}${delta}` });
}

/** Whether a level sits inside the target band of its phase. */
export function energyFitsPhase(level: number | undefined, phase: SetPhaseId): boolean | null {
  if (level == null) return null;
  const band = PHASE_ENERGY[phase];
  return level >= band.min && level <= band.max;
}

/** Minimum Alternativen per phase before the set counts as covered. */
export const PLAN_B_MIN = 2;

export type PlanBState = "fit" | "below" | "above" | "unknown";

/**
 * How an Alternative sits in the phase it was set for: its energy is inside the phase
 * band ("fit"), under or over it, or unknown (then the chosen phase simply counts).
 */
export function planBState(track: { phase: SetPhaseId; energyLevel?: number }): PlanBState {
  if (track.energyLevel == null) return "unknown";
  const band = PHASE_ENERGY[track.phase];
  if (track.energyLevel < band.min) return "below";
  if (track.energyLevel > band.max) return "above";
  return "fit";
}

/**
 * Plan B per phase: Alternativen set for the phase whose energy does not contradict it.
 * What you set is what counts; an energy outside the band is flagged and does not count.
 */
export function planBCount(
  tracks: { role: string; phase: SetPhaseId; energyLevel?: number }[],
  phase: SetPhaseId,
): number {
  return tracks.filter((track) => {
    if (track.role !== "safety" || track.phase !== phase) return false;
    const state = planBState(track);
    return state === "fit" || state === "unknown";
  }).length;
}
