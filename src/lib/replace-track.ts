import {
  bpmDelta,
  harmonicRelation,
  relationLabel,
  relationScore,
} from "./harmonic";
import { energyScore, energyStep, energyText } from "./energy";
import { tDe, type Translate } from "@/lib/i18n/core";
import type { SetTrack } from "./set";

export type ReplacementOption = {
  id: string;
  title: string;
  artist: string;
  detail: string;
  score: number;
};

type KeyBpm = { keyCamelot: string; bpm: string; energyLevel?: number };

/**
 * One side of a transition as text, e.g. "davor: Nachbar-Key (±1), +1 BPM, Energie +1".
 * `who` is shown as given (pass `t("analysis.side.before")` / `t("analysis.side.after")`).
 */
export function sidePhrase(
  from: KeyBpm | null,
  to: KeyBpm,
  who: string,
  t: Translate = tDe,
): { text: string; score: number } | null {
  if (!from) return null;
  const relation = harmonicRelation(from.keyCamelot, to.keyCamelot);
  const delta = bpmDelta(from.bpm, to.bpm);
  const bpmText =
    delta == null ? "" : `, ${delta > 0 ? "+" : ""}${delta} BPM`;
  const relScore = relationScore(relation);
  const bpmScore = delta == null ? 0.55 : Math.max(0, 1 - Math.abs(delta) / 12);
  const hasEnergy = from.energyLevel != null && to.energyLevel != null;
  const step = energyStep(from.energyLevel, to.energyLevel);
  const energy = energyText(from.energyLevel, to.energyLevel, t);
  const energyPart = hasEnergy
    ? `, ${step === "jump" ? t("analysis.mix.energyJump", { energy }) : energy}`
    : "";
  // Energy first, then key, then BPM. Without energy data: key and BPM only.
  const raw = hasEnergy
    ? energyScore(from.energyLevel, to.energyLevel) * 0.4 + relScore * 0.35 + bpmScore * 0.25
    : relScore * 0.7 + bpmScore * 0.3;
  // A key clash must never be bought back by matching energy and BPM.
  const score = relation === "clash" ? Math.min(raw, 0.3) : raw;
  return {
    text: `${who}: ${relationLabel(relation, t)}${bpmText}${energyPart}`,
    score,
  };
}

export function neighbors(tracks: SetTrack[], index: number): { prev: SetTrack | null; next: SetTrack | null } {
  let prev: SetTrack | null = null;
  let next: SetTrack | null = null;
  for (let i = index - 1; i >= 0; i--) {
    if (tracks[i].role !== "safety") {
      prev = tracks[i];
      break;
    }
  }
  for (let i = index + 1; i < tracks.length; i++) {
    if (tracks[i].role !== "safety") {
      next = tracks[i];
      break;
    }
  }
  return { prev, next };
}

export function rankReplacements(
  tracks: SetTrack[],
  targetId: string,
  t: Translate = tDe,
): ReplacementOption[] {
  const index = tracks.findIndex((track) => track.id === targetId);
  if (index < 0) return [];
  const target = tracks[index];
  if (target.role === "safety") return [];
  const { prev, next } = neighbors(tracks, index);
  return tracks
    .filter((track) => track.role === "safety" && track.id !== targetId)
    .map((track) => {
      const sides = [
        sidePhrase(prev, track, t("analysis.side.before"), t),
        sidePhrase(next, track, t("analysis.side.after"), t),
      ].filter(
        (side): side is { text: string; score: number } => Boolean(side),
      );
      const score = sides.length
        ? sides.reduce((sum, side) => sum + side.score, 0) / sides.length
        : 0.5;
      const key = track.keyCamelot || t("analysis.key.open");
      const bpm = track.bpm ? `${track.bpm} BPM` : t("analysis.bpm.open");
      return {
        id: track.id,
        title: track.name,
        artist: track.artists.join(", "),
        detail: [`${key} · ${bpm}${track.energyLevel != null ? ` · E${track.energyLevel}` : ""}`, ...sides.map((side) => side.text)].join(" · "),
        score,
      };
    })
    .sort((a, b) => b.score - a.score);
}

export type LibraryReplacement<T> = {
  row: T;
  detail: string;
  score: number;
};

/**
 * Ranks tracks of the whole library as a replacement for one set slot,
 * by Key and BPM distance to the previous and next performance track.
 * Tracks that are already in the set are skipped.
 */
export function rankLibraryReplacements<
  T extends { artist: string; title: string; key: string; bpm: string; energy?: number },
>(
  tracks: SetTrack[],
  targetId: string,
  rows: T[],
  toKey: (raw: string) => string,
  limit = 8,
  t: Translate = tDe,
): LibraryReplacement<T>[] {
  const index = tracks.findIndex((track) => track.id === targetId);
  if (index < 0 || tracks[index].role === "safety") return [];
  const { prev, next } = neighbors(tracks, index);
  const inSet = new Set(
    tracks.map((track) => `${track.artists.join(",")}|${track.name}`.toLowerCase()),
  );
  const scored: LibraryReplacement<T>[] = [];
  for (const row of rows) {
    if (inSet.has(`${row.artist || "Unknown"}|${row.title}`.toLowerCase())) continue;
    const candidate = { keyCamelot: toKey(row.key), bpm: row.bpm, energyLevel: row.energy };
    const sides = [
      sidePhrase(prev, candidate, t("analysis.side.before"), t),
      sidePhrase(next, candidate, t("analysis.side.after"), t),
    ].filter(
      (side): side is { text: string; score: number } => Boolean(side),
    );
    const score = sides.length
      ? sides.reduce((sum, side) => sum + side.score, 0) / sides.length
      : 0.5;
    scored.push({
      row,
      score,
      detail: [
        `${candidate.keyCamelot || t("analysis.key.open")} · ${row.bpm ? `${row.bpm} BPM` : t("analysis.bpm.open")}${row.energy != null ? ` · E${row.energy}` : ""}`,
        ...sides.map((side) => side.text),
      ].join(" · "),
    });
  }
  return scored.sort((a, b) => b.score - a.score).slice(0, limit);
}

export function swapIntoSlot(
  tracks: SetTrack[],
  targetId: string,
  replacementId: string,
  t: Translate = tDe,
): SetTrack[] {
  const targetIndex = tracks.findIndex((track) => track.id === targetId);
  const replacementIndex = tracks.findIndex((track) => track.id === replacementId);
  if (targetIndex < 0 || replacementIndex < 0 || targetIndex === replacementIndex) return tracks;
  const target = tracks[targetIndex];
  const replacement = tracks[replacementIndex];
  const next = [...tracks];
  next[targetIndex] = {
    ...replacement,
    phase: target.phase,
    role: target.role,
    why: t("analysis.why.replacementFor", { name: target.name }),
  };
  next[replacementIndex] = {
    ...target,
    role: "safety",
    why: t("analysis.why.replacedBy", { name: replacement.name }),
  };
  return next;
}
