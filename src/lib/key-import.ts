import { normalizeCamelot, parseBpm, type CamelotCode } from "@/lib/harmonic";
import { parseEnergyLevel } from "@/lib/energy";
import type { SetDraft, SetTrack } from "@/lib/set";

export type KeyImportRow = {
  artist: string;
  title: string;
  keyRaw: string;
  keyCamelot: CamelotCode | null;
  bpm: string;
  /** Energy Level 1–10 (Mixed In Key), when the source has it */
  energyLevel?: number;
};

export type KeyImportResult = {
  matched: number;
  unmatched: number;
  rows: number;
  draft: SetDraft;
  samples: Array<{ track: string; key: string; bpm: string }>;
};

/** Classical / sharp-flat musical keys → Camelot */
const MUSICAL_TO_CAMELOT: Record<string, CamelotCode> = {
  // Major (B)
  c: "8B",
  g: "9B",
  d: "10B",
  a: "11B",
  e: "12B",
  b: "1B",
  "f#": "2B",
  gb: "2B",
  "c#": "3B",
  db: "3B",
  "g#": "4B",
  ab: "4B",
  "d#": "5B",
  eb: "5B",
  "a#": "6B",
  bb: "6B",
  f: "7B",
  // Minor (A)
  am: "8A",
  em: "9A",
  bm: "10A",
  "f#m": "11A",
  gbm: "11A",
  "c#m": "12A",
  dbm: "12A",
  "g#m": "1A",
  abm: "1A",
  "d#m": "2A",
  ebm: "2A",
  "a#m": "3A",
  bbm: "3A",
  fm: "4A",
  cm: "5A",
  gm: "6A",
  dm: "7A",
};

/** Open Key (Mixed In Key style): 1d/1m … 12d/12m */
function openKeyToCamelot(raw: string): CamelotCode | null {
  const match = raw.trim().toLowerCase().match(/^([1-9]|1[0-2])\s*([dm])$/);
  if (!match) return null;
  const n = Number(match[1]);
  // Open Key 1 = Camelot 8; major "d" → B, minor "m" → A
  const camelotNum = ((n + 7) % 12) || 12;
  return `${camelotNum}${match[2] === "d" ? "B" : "A"}` as CamelotCode;
}

export function parseKeyValue(raw: string): CamelotCode | null {
  const cleaned = raw
    .trim()
    .replace(/^key[:\s]*/i, "")
    .replace(/\s+/g, "");
  if (!cleaned) return null;

  const camelot = normalizeCamelot(cleaned);
  if (camelot) return camelot;

  const open = openKeyToCamelot(cleaned);
  if (open) return open;

  // Normalize musical: C#m, Csharp minor, A minor
  let musical = cleaned
    .toLowerCase()
    .replace(/major|maj/g, "")
    .replace(/minor|min/g, "m")
    .replace("sharp", "#")
    .replace("flat", "b")
    .replace("♯", "#")
    .replace("♭", "b");

  if (MUSICAL_TO_CAMELOT[musical]) return MUSICAL_TO_CAMELOT[musical];

  // "A minor" already handled via replace; try with space removed variants
  musical = musical.replace(/[^a-g#bm]/g, "");
  return MUSICAL_TO_CAMELOT[musical] ?? null;
}

function splitCsvLine(line: string): string[] {
  const cells: string[] = [];
  let current = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }
    if ((ch === "," || ch === ";" || ch === "\t") && !inQuotes) {
      cells.push(current.trim());
      current = "";
      continue;
    }
    current += ch;
  }
  cells.push(current.trim());
  return cells;
}

function looksLikeHeader(cells: string[]): boolean {
  const joined = cells.join(" ").toLowerCase();
  return (
    joined.includes("artist") ||
    joined.includes("title") ||
    joined.includes("track") ||
    joined.includes("song") ||
    joined.includes("camelot") ||
    joined.includes("bpm") ||
    joined.includes("key")
  );
}

function headerIndex(cells: string[], names: string[]): number {
  return cells.findIndex((cell) =>
    names.some((name) => cell.toLowerCase().includes(name)),
  );
}

/** Parse paste/CSV/TSV into structured rows */
export function parseKeyImportText(text: string): KeyImportRow[] {
  const lines = text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line && !line.startsWith("#"));

  if (!lines.length) return [];

  const firstCells = splitCsvLine(lines[0]);
  const hasHeader = looksLikeHeader(firstCells);
  let artistIdx = 0;
  let titleIdx = 1;
  let keyIdx = 2;
  let bpmIdx = 3;
  let energyIdx = -1;
  let start = 0;

  if (hasHeader) {
    artistIdx = headerIndex(firstCells, ["artist", "performer"]);
    titleIdx = headerIndex(firstCells, ["title", "track", "song", "name"]);
    keyIdx = headerIndex(firstCells, ["camelot", "key", "tonart"]);
    bpmIdx = headerIndex(firstCells, ["bpm", "tempo"]);
    energyIdx = headerIndex(firstCells, ["energy"]);
    if (artistIdx < 0) artistIdx = 0;
    if (titleIdx < 0) titleIdx = 1;
    if (keyIdx < 0) keyIdx = 2;
    if (bpmIdx < 0) bpmIdx = 3;
    start = 1;
  }

  const rows: KeyImportRow[] = [];

  for (let i = start; i < lines.length; i++) {
    const line = lines[i];

    // Freeform: Artist - Title - 8A - 124   or   Artist – Title | 8A | 124
    const free = line.match(
      /^(.+?)\s+[-–—|]\s+(.+?)\s+[-–—|]\s+([^\s|,-]+)\s*(?:[-–—|,]\s*(\d{2,3}(?:[.,]\d+)?))?\s*$/,
    );
    if (free && !line.includes(",") && !line.includes(";")) {
      const keyCamelot = parseKeyValue(free[3]);
      const bpmNum = free[4] ? parseBpm(free[4]) : null;
      rows.push({
        artist: free[1].trim(),
        title: free[2].trim(),
        keyRaw: free[3].trim(),
        keyCamelot,
        bpm: bpmNum != null ? String(Math.round(bpmNum)) : "",
      });
      continue;
    }

    const cells = splitCsvLine(line);
    if (cells.length < 2) continue;

    const artist = cells[artistIdx] || cells[0] || "";
    const title = cells[titleIdx] || cells[1] || "";
    const keyRaw = cells[keyIdx] || cells[2] || "";
    const bpmRaw = cells[bpmIdx] || cells[3] || "";
    const keyCamelot = parseKeyValue(keyRaw);
    const bpmNum = parseBpm(bpmRaw);

    if (!artist && !title) continue;
    if (!keyCamelot && bpmNum == null) continue;

    const energyCell = energyIdx >= 0 ? cells[energyIdx] || "" : "";
    const energyLevel =
      parseEnergyLevel(`energy ${energyCell}`) ?? undefined;
    rows.push({
      artist: artist.trim(),
      title: title.trim(),
      keyRaw: keyRaw.trim(),
      keyCamelot,
      bpm: bpmNum != null ? String(Math.round(bpmNum)) : "",
      ...(energyLevel != null ? { energyLevel } : {}),
    });
  }

  return rows;
}

function normalizeMatchText(value: string): string {
  return value
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\(.*?\)/g, " ")
    .replace(/\[.*?\]/g, " ")
    .replace(/\b(feat|ft|with|vs|remix|mix|edit|extended|radio|original)\b\.?/g, " ")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function scoreMatch(track: SetTrack, row: KeyImportRow): number {
  const trackTitle = normalizeMatchText(track.name);
  const rowTitle = normalizeMatchText(row.title);
  const trackArtist = normalizeMatchText(track.artists.join(" "));
  const rowArtist = normalizeMatchText(row.artist);

  if (!trackTitle || !rowTitle) return 0;

  let score = 0;
  if (trackTitle === rowTitle) score += 6;
  else if (trackTitle.includes(rowTitle) || rowTitle.includes(trackTitle)) score += 4;
  else {
    const tWords = new Set(trackTitle.split(" ").filter(Boolean));
    const rWords = rowTitle.split(" ").filter(Boolean);
    const overlap = rWords.filter((word) => tWords.has(word)).length;
    if (overlap === 0) return 0;
    score += overlap;
  }

  if (trackArtist && rowArtist) {
    if (trackArtist === rowArtist) score += 4;
    else if (trackArtist.includes(rowArtist) || rowArtist.includes(trackArtist))
      score += 3;
    else {
      const overlap = rowArtist
        .split(" ")
        .filter((word) => trackArtist.includes(word)).length;
      score += Math.min(2, overlap);
    }
  }

  return score;
}

export function applyKeyImportRows(
  draft: SetDraft,
  rows: KeyImportRow[],
): KeyImportResult {
  if (!rows.length) {
    return {
      matched: 0,
      unmatched: 0,
      rows: 0,
      draft,
      samples: [],
    };
  }

  const usedRows = new Set<number>();
  let matched = 0;
  const samples: KeyImportResult["samples"] = [];

  const tracks = draft.tracks.map((track) => {
    let bestIdx = -1;
    let bestScore = 0;
    rows.forEach((row, index) => {
      if (usedRows.has(index)) return;
      const score = scoreMatch(track, row);
      if (score > bestScore) {
        bestScore = score;
        bestIdx = index;
      }
    });

    // Require a reasonable match
    if (bestIdx < 0 || bestScore < 5) return track;

    const row = rows[bestIdx];
    usedRows.add(bestIdx);
    matched += 1;
    if (samples.length < 5) {
      samples.push({
        track: `${track.artists.join(", ")} – ${track.name}`,
        key: row.keyCamelot || row.keyRaw,
        bpm: row.bpm,
      });
    }

    return {
      ...track,
      keyCamelot: row.keyCamelot || track.keyCamelot,
      bpm: row.bpm || track.bpm,
      energyLevel: row.energyLevel ?? track.energyLevel,
    };
  });

  return {
    matched,
    unmatched: rows.length - usedRows.size,
    rows: rows.length,
    draft: { ...draft, tracks },
    samples,
  };
}

export function applyKeyImport(
  draft: SetDraft,
  text: string,
): KeyImportResult {
  return applyKeyImportRows(draft, parseKeyImportText(text));
}
