import type { PdbLibrary } from "@/lib/rekordbox-pdb";

export type NamedTrack = {
  name: string;
  artists: string[];
  filePath?: string;
};

export type StickCandidate = {
  id: number;
  title: string;
  artist: string;
  filePath: string;
  score: number;
};

export type StickSuggestion<T extends NamedTrack = NamedTrack> = {
  track: T;
  candidates: StickCandidate[];
};

function fold(value: string): string {
  return value
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function mixless(value: string): string {
  return fold(value)
    .replace(
      /\b(original mix|extended mix|radio edit|club mix|dvs edit|remix|edit|mix|feat|ft|featuring)\b/g,
      " ",
    )
    .replace(/\s+/g, " ")
    .trim();
}

function tokens(value: string): string[] {
  return mixless(value).split(" ").filter((part) => part.length > 1);
}

function dice(a: string[], b: string[]): number {
  if (!a.length || !b.length) return 0;
  const right = new Set(b);
  let hit = 0;
  for (const token of a) if (right.has(token)) hit += 1;
  return (2 * hit) / (a.length + b.length);
}

function artistClose(wanted: string[], have: string): boolean {
  const stick = mixless(have);
  if (!stick) return true;
  const names = wanted.filter((name) => name && name !== "Unknown").map(mixless);
  if (!names.length) return true;
  return names.some((name) => name === stick || name.includes(stick) || stick.includes(name));
}

function titleScore(wanted: string, have: string): number {
  const a = mixless(wanted);
  const b = mixless(have);
  if (!a || !b) return 0;
  if (a === b) return 1;
  if (a.includes(b) || b.includes(a)) return 0.9;
  return dice(tokens(wanted), tokens(have));
}

const SUGGEST_MIN = 0.78;

function candidateLabel(item: Pick<StickCandidate, "artist" | "title">): string {
  return `${mixless(item.artist)}\0${mixless(item.title)}`;
}

/** Keep one row per artist+title — sticks often list the same track more than once. */
function dedupeCandidates(ranked: StickCandidate[]): StickCandidate[] {
  const best = new Map<string, StickCandidate>();
  for (const item of ranked) {
    const key = candidateLabel(item);
    const prev = best.get(key);
    if (!prev || item.score > prev.score || (item.score === prev.score && item.id < prev.id)) {
      best.set(key, item);
    }
  }
  return [...best.values()].sort(
    (a, b) => b.score - a.score || a.title.localeCompare(b.title) || a.id - b.id,
  );
}

/** Near-matches for set tracks the exact matcher left out. One clear hit, or up to three. */
export function suggestStickMatches<T extends NamedTrack>(
  missing: T[],
  library: PdbLibrary,
): StickSuggestion<T>[] {
  const out: StickSuggestion<T>[] = [];
  for (const track of missing) {
    const ranked = library.tracks
      .map((stick) => ({
        id: stick.id,
        title: stick.title,
        artist: stick.artist,
        filePath: stick.filePath,
        score: artistClose(track.artists, stick.artist) ? titleScore(track.name, stick.title) : 0,
      }))
      .filter((item) => item.score >= SUGGEST_MIN)
      .sort((a, b) => b.score - a.score || a.title.localeCompare(b.title));
    const unique = dedupeCandidates(ranked);
    const top = unique[0];
    const close = unique.filter((item) => top && item.score >= top.score - 0.05).slice(0, 3);
    if (close.length) out.push({ track, candidates: close });
  }
  return out;
}
