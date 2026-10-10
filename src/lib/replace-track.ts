import {
  bpmDelta,
  harmonicRelation,
  relationLabel,
  relationScore,
} from "./harmonic";
import type { SetTrack } from "./set";

export type ReplacementOption = {
  id: string;
  title: string;
  artist: string;
  detail: string;
  score: number;
};

function sidePhrase(from: SetTrack | null, to: SetTrack, who: string): { text: string; score: number } | null {
  if (!from) return null;
  const relation = harmonicRelation(from.keyCamelot, to.keyCamelot);
  const delta = bpmDelta(from.bpm, to.bpm);
  const bpmText =
    delta == null ? "" : `, ${delta > 0 ? "+" : ""}${delta} BPM`;
  const relScore = relationScore(relation);
  const bpmScore = delta == null ? 0.55 : Math.max(0, 1 - Math.abs(delta) / 12);
  return {
    text: `${who}: ${relationLabel(relation)}${bpmText}`,
    score: relScore * 0.7 + bpmScore * 0.3,
  };
}

function neighbors(tracks: SetTrack[], index: number): { prev: SetTrack | null; next: SetTrack | null } {
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

export function rankReplacements(tracks: SetTrack[], targetId: string): ReplacementOption[] {
  const index = tracks.findIndex((track) => track.id === targetId);
  if (index < 0) return [];
  const target = tracks[index];
  if (target.role === "safety") return [];
  const { prev, next } = neighbors(tracks, index);
  return tracks
    .filter((track) => track.role === "safety" && track.id !== targetId)
    .map((track) => {
      const sides = [sidePhrase(prev, track, "davor"), sidePhrase(next, track, "danach")].filter(
        (side): side is { text: string; score: number } => Boolean(side),
      );
      const score = sides.length
        ? sides.reduce((sum, side) => sum + side.score, 0) / sides.length
        : 0.5;
      const key = track.keyCamelot || "Key offen";
      const bpm = track.bpm ? `${track.bpm} BPM` : "BPM offen";
      return {
        id: track.id,
        title: track.name,
        artist: track.artists.join(", "),
        detail: [`${key} · ${bpm}`, ...sides.map((side) => side.text)].join(" · "),
        score,
      };
    })
    .sort((a, b) => b.score - a.score);
}

export function swapIntoSlot(tracks: SetTrack[], targetId: string, replacementId: string): SetTrack[] {
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
    why: `Ersatz für ${target.name}`,
  };
  next[replacementIndex] = {
    ...target,
    role: "safety",
    why: `Ersetzt durch ${replacement.name}`,
  };
  return next;
}
