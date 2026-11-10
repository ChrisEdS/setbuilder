import { harmonicRelation, parseBpm } from "@/lib/harmonic";
import { parseKeyValue } from "@/lib/key-import";

export type LibraryFilter = {
  /** Camelot code. Rows in the same / relative / ±1 neighborhood stay. */
  key?: string;
  bpmMin?: number | null;
  bpmMax?: number | null;
  energyMin?: number | null;
  energyMax?: number | null;
  /** Minimum rekordbox stars, 1–5. 0 or unset leaves the rating open. */
  ratingMin?: number | null;
  /** 0 is no color. 1–8 is one rekordbox color. Unset leaves color open. */
  color?: number | null;
  /** Exact genre name from the loaded library. Empty leaves genre open. */
  genre?: string | null;
  /** Case-insensitive substring of the rekordbox comment. Empty leaves it open. */
  comment?: string | null;
};

const NEIGHBORHOOD = new Set(["same", "relative", "adjacent"]);

export function camelotCodeOf(raw: string): string {
  return parseKeyValue(raw) || "";
}

/** Same key, relative major/minor, or one step on the wheel. */
export function inCamelotNeighborhood(from: string, to: string): boolean {
  const a = camelotCodeOf(from);
  const b = camelotCodeOf(to);
  if (!a || !b) return false;
  return NEIGHBORHOOD.has(harmonicRelation(a, b));
}

function bpmOf(raw: string): number | null {
  return parseBpm(raw);
}

/** A bound the user typed. Empty stays open. Values outside 1–999 are ignored. */
export function boundOf(raw: string): number | null {
  const text = raw.trim();
  if (!text) return null;
  const n = Number(text.replace(",", "."));
  if (!Number.isFinite(n)) return null;
  return n;
}

export function matchesLibraryFilter(
  row: {
    key: string;
    bpm: string;
    energy?: number;
    rating?: number;
    color?: number;
    genre?: string;
    comment?: string;
  },
  filter: LibraryFilter,
): boolean {
  if (filter.key && !inCamelotNeighborhood(filter.key, row.key)) return false;
  const bpmMin = filter.bpmMin ?? null;
  const bpmMax = filter.bpmMax ?? null;
  if (bpmMin != null || bpmMax != null) {
    const bpm = bpmOf(row.bpm);
    if (bpm == null) return false;
    if (bpmMin != null && bpm < bpmMin) return false;
    if (bpmMax != null && bpm > bpmMax) return false;
  }
  const energyMin = filter.energyMin ?? null;
  const energyMax = filter.energyMax ?? null;
  if (energyMin != null || energyMax != null) {
    if (row.energy == null) return false;
    if (energyMin != null && row.energy < energyMin) return false;
    if (energyMax != null && row.energy > energyMax) return false;
  }
  const ratingMin = filter.ratingMin ?? null;
  if (ratingMin != null && ratingMin > 0) {
    if (row.rating == null || row.rating < ratingMin) return false;
  }
  if (filter.color != null) {
    if ((row.color ?? 0) !== filter.color) return false;
  }
  const genre = filter.genre?.trim();
  if (genre && (row.genre ?? "") !== genre) return false;
  const comment = filter.comment?.trim().toLowerCase();
  if (comment && !(row.comment ?? "").toLowerCase().includes(comment)) return false;
  return true;
}
