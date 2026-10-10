export type MatchWanted = {
  name: string;
  artists: string[];
};

export type MatchCandidate = {
  name: string;
  artists: string[];
  externalUrl: string;
  imageUrl: string | null;
};

function fold(value: string): string {
  return value
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function artistHit(wanted: string[], found: string[]): boolean {
  const needles = wanted
    .map(fold)
    .filter((name) => name && name !== "unknown" && name !== "tidal");
  if (!needles.length) return true;
  const hay = found.map(fold).join(" ");
  return needles.some((name) => name.length > 1 && hay.includes(name));
}

/** 0–1. Titles must agree; artist overlap raises the score. */
export function matchScore(wanted: MatchWanted, found: MatchCandidate): number {
  const title = fold(wanted.name);
  const other = fold(found.name);
  if (!title || !other) return 0;
  const artist = artistHit(wanted.artists, found.artists);
  if (title === other && artist) return 1;
  if ((other.includes(title) || title.includes(other)) && artist) return 0.85;
  if (title === other) return 0.62;
  return 0;
}

export function pickStreamingMatch(
  wanted: MatchWanted,
  candidates: MatchCandidate[],
): MatchCandidate | null {
  let best: MatchCandidate | null = null;
  let bestScore = 0.6;
  for (const candidate of candidates) {
    const score = matchScore(wanted, candidate);
    if (score > bestScore) {
      best = candidate;
      bestScore = score;
    }
  }
  return best;
}
