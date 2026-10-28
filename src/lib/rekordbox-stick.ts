import { distributeRoles } from "@/lib/extract-set";
import { uniqueIncomingDraftTracks } from "@/lib/draft-codec";
import { stickArtworkUrl } from "@/lib/stick-audio";
import { energyFromRekordboxTags, hasKnownEnergy } from "@/lib/energy";
import { tDe, type Translate } from "@/lib/i18n/core";
import { LocalizedError } from "@/lib/i18n/error";
import { parseKeyValue } from "@/lib/key-import";
import { parseRekordboxPdb, type PdbLibrary, type PdbTrack } from "@/lib/rekordbox-pdb";
import {
  PHASES,
  type SetDraft,
  type SetPhaseId,
  type SetTrack,
  type SourcePoolTrack,
  type TrackRole,
} from "@/lib/set";

export type StickTrack = {
  id: string;
  title: string;
  artist: string;
  album: string;
  bpm: string;
  keyRaw: string;
  keyCamelot: string;
  durationMs: number;
  comment: string;
  /** Energy Level 1–10, read from a Mixed In Key comment such as "7A - Energy 6" */
  energyLevel?: number;
  filePath: string;
  /** Cover path from the stick's Artwork folder (export.pdb only) */
  artworkPath?: string;
};

export type RekordboxStickSet = {
  id: string;
  name: string;
  path: string;
  kind: "playlist" | "history";
  missing: number;
  tracks: StickTrack[];
};

export type RekordboxStickRead = {
  label: string;
  sets: RekordboxStickSet[];
  library: StickTrack[];
};

export async function readRekordboxStick(files: File[]): Promise<RekordboxStickRead> {
  const pdb =
    findFile(files, (path) => path.endsWith("pioneer/rekordbox/export.pdb")) ??
    findFile(files, (path) => path.endsWith("/export.pdb") || path === "export.pdb") ??
    findFile(files, (path) => path.endsWith(".pdb"));
  if (pdb) {
    const buffer = await pdb.arrayBuffer();
    await new Promise<void>((resolve) => setTimeout(resolve, 0));
    const library = parseRekordboxPdb(buffer);
    return {
      label: displayPath(pdb),
      sets: setsFromPdb(library),
      library: library.tracks.map(toStickTrack),
    };
  }

  const xml = findFile(
    files,
    (path) => path.endsWith(".xml") && (path.includes("rekordbox") || path.includes("playlist")),
  ) ?? findFile(files, (path) => path.endsWith(".xml"));
  if (xml) {
    const text = await xml.text();
    const sets = setsFromXml(text);
    if (!sets.length) {
      throw new LocalizedError(
        "exports.stick.noPlaylists",
        undefined,
        "Die XML enthält keine Playlists. Für Keys ohne Set-Reihenfolge die Collection laden.",
      );
    }
    const library = sets.flatMap((set) => set.tracks);
    return { label: displayPath(xml), sets, library };
  }

  throw new LocalizedError(
    "exports.stick.notFound",
    undefined,
    "Kein Rekordbox-Stick erkannt. Den Stick-Ordner wählen oder PIONEER/rekordbox/export.pdb.",
  );
}

export function applyStickSet(
  draft: SetDraft,
  set: RekordboxStickSet,
  t: Translate = tDe,
): SetDraft {
  const totalMs = set.tracks.reduce((sum, track) => sum + track.durationMs, 0);
  // The slot stays what the brief says; a longer set is trimmed with "Auf Slot kürzen".
  // Playlist load stores the full list as sourcePool so "Aus der Playlist" works
  // even after trim; history is not a playlist pool.
  const sourcePool =
    set.kind === "playlist" ? sourcePoolFromStickSet(set) : undefined;
  return distributeRoles({
    ...draft,
    title: set.name,
    tracks: set.tracks.map((track, index) => toSetTrack(track, set, index, totalMs, t)),
    sourcePool,
  });
}

export type StickSetLoadMode = "replace" | "merge";

/** Applies a stick playlist without allowing duplicate normalized track IDs. */
export function applyStickSetMode(
  draft: SetDraft,
  set: RekordboxStickSet,
  mode: StickSetLoadMode,
  t: Translate = tDe,
): SetDraft {
  const incoming = applyStickSet({ ...draft, tracks: [] }, set, t);
  if (mode === "replace") return incoming;
  const fresh = uniqueIncomingDraftTracks(
    draft.tracks.map((track) => track.id),
    incoming.tracks,
  );
  if (!fresh.length) return draft;
  const sourcePool =
    set.kind === "playlist"
      ? mergeSourcePools(draft.sourcePool, incoming.sourcePool)
      : draft.sourcePool;
  return {
    ...draft,
    tracks: [...draft.tracks, ...fresh],
    ...(sourcePool ? { sourcePool } : { sourcePool: undefined }),
  };
}

/** Pool rows for a stick playlist, with the same ids as load-as-set tracks. */
export function sourcePoolFromStickSet(set: RekordboxStickSet): SourcePoolTrack[] {
  return set.tracks.map((track, index) => ({
    id: `rekordbox:${set.id}:${track.id}:${index}`,
    name: track.title,
    artists: [track.artist || "Unknown"],
    album: track.album || "rekordbox",
    durationMs: track.durationMs,
    uri: track.filePath || `rekordbox:${track.id}`,
    externalUrl: "",
    imageUrl: coverUrl(track.artworkPath),
    bpm: track.bpm,
    keyCamelot: track.keyCamelot,
    energyLevel: track.energyLevel,
    energySource: track.energyLevel != null ? ("tag" as const) : undefined,
    filePath: track.filePath,
    source: "rekordbox" as const,
    catalogBpm: track.bpm,
    catalogKey: track.keyCamelot,
  }));
}

function mergeSourcePools(
  existing: SourcePoolTrack[] | undefined,
  incoming: SourcePoolTrack[] | undefined,
): SourcePoolTrack[] | undefined {
  if (!incoming?.length) return existing;
  if (!existing?.length) return incoming;
  const seen = new Set(existing.map((track) => track.id));
  const extra = incoming.filter((track) => !seen.has(track.id));
  return extra.length ? [...existing, ...extra] : existing;
}

/**
 * Playlist pool for reshuffle / fill / exchange: prefer the stored extract or
 * load-as-set pool; otherwise rebuild from a live stick playlist that matches
 * this set (by title, then by track overlap).
 */
export function playlistPoolForDraft(
  draft: SetDraft,
  stickSets: ReadonlyArray<RekordboxStickSet> = [],
): SourcePoolTrack[] {
  const stored = draft.sourcePool ?? [];
  if (stored.length) return stored;
  return livePlaylistPoolForDraft(draft, stickSets);
}

/** Attach a live stick playlist as sourcePool when the draft has none stored. */
export function draftWithPlaylistPool(
  draft: SetDraft,
  stickSets: ReadonlyArray<RekordboxStickSet> = [],
): SetDraft {
  if (draft.sourcePool?.length) return draft;
  const pool = livePlaylistPoolForDraft(draft, stickSets);
  return pool.length ? { ...draft, sourcePool: pool } : draft;
}

function livePlaylistPoolForDraft(
  draft: SetDraft,
  stickSets: ReadonlyArray<RekordboxStickSet>,
): SourcePoolTrack[] {
  const playlists = stickSets.filter(
    (set) => set.kind === "playlist" && set.tracks.length >= 2,
  );
  if (!playlists.length) return [];

  const title = foldName(draft.title);
  const byTitle = playlists.filter(
    (set) => foldName(set.name) === title || foldName(set.path.split("/").pop() ?? "") === title,
  );
  if (byTitle.length === 1) return sourcePoolFromStickSet(byTitle[0]);
  if (byTitle.length > 1) {
    return sourcePoolFromStickSet(bestPlaylistOverlap(byTitle, draft) ?? byTitle[0]);
  }

  const match = bestPlaylistOverlap(playlists, draft);
  return match ? sourcePoolFromStickSet(match) : [];
}

function bestPlaylistOverlap(
  playlists: ReadonlyArray<RekordboxStickSet>,
  draft: SetDraft,
): RekordboxStickSet | null {
  const performance = draft.tracks.filter((track) => track.role !== "safety");
  if (!performance.length) return null;
  const paths = new Set(
    performance
      .map((track) => (track.filePath ? pathKey(track.filePath) : ""))
      .filter(Boolean),
  );
  const names = new Set(
    performance.map((track) => `${foldName(track.name)}|${foldName(track.artists[0] ?? "")}`),
  );
  let best: RekordboxStickSet | null = null;
  let bestScore = 0;
  for (const set of playlists) {
    let score = 0;
    for (const track of set.tracks) {
      if (track.filePath && paths.has(pathKey(track.filePath))) {
        score += 1;
        continue;
      }
      if (names.has(`${foldName(track.title)}|${foldName(track.artist)}`)) score += 1;
    }
    if (score > bestScore) {
      bestScore = score;
      best = set;
    }
  }
  const needed = Math.min(3, Math.max(2, Math.ceil(performance.length * 0.5)));
  return bestScore >= needed ? best : null;
}

function setsFromPdb(library: PdbLibrary): RekordboxStickSet[] {
  const byId = new Map(library.tracks.map((track) => [track.id, track]));
  return library.playlists.map((playlist) => {
    let missing = 0;
    const tracks: StickTrack[] = [];
    for (const id of playlist.trackIds) {
      const track = byId.get(id);
      if (!track) {
        missing += 1;
        continue;
      }
      tracks.push(toStickTrack(track));
    }
    return {
      id: `${playlist.kind}:${playlist.id}`,
      name: playlist.name,
      path: playlist.path,
      kind: playlist.kind,
      missing,
      tracks,
    };
  });
}

function toStickTrack(track: PdbTrack): StickTrack {
  const keyCamelot = parseKeyValue(track.key);
  return {
    id: String(track.id),
    title: track.title,
    artist: track.artist,
    album: track.album,
    bpm: track.bpm,
    keyRaw: track.key,
    keyCamelot: keyCamelot || "",
    durationMs: track.durationMs,
    comment: track.comment,
    energyLevel: energyFromRekordboxTags({
      comment: track.comment,
      grouping: track.mixName,
    }),
    filePath: track.filePath,
    artworkPath: track.artworkPath,
  };
}

function foldName(value: string): string {
  return value
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function pathKey(path: string): string {
  return path.replaceAll("\\", "/").toLowerCase();
}

/**
 * After the stick folder is chosen again, put covers and file paths back onto
 * the tracks that are already in the set. Does not change order or roles.
 */
export function rehydrateStickCovers(draft: SetDraft, library: StickTrack[]): SetDraft {
  if (!library.length) return draft;
  const byPath = new Map<string, StickTrack>();
  const byName = new Map<string, StickTrack[]>();
  for (const stick of library) {
    if (stick.filePath) byPath.set(pathKey(stick.filePath), stick);
    const key = `${foldName(stick.title)}|${foldName(stick.artist)}`;
    byName.set(key, [...(byName.get(key) ?? []), stick]);
  }
  let changed = false;
  const tracks = draft.tracks.map((track) => {
    let hit = track.filePath ? byPath.get(pathKey(track.filePath)) : undefined;
    if (!hit) {
      const artists = track.artists.filter((name) => name && name !== "Unknown");
      const found = new Set<StickTrack>();
      for (const artist of artists.length ? artists : [""]) {
        for (const item of byName.get(`${foldName(track.name)}|${foldName(artist)}`) ?? []) {
          found.add(item);
        }
      }
      if (found.size === 1) hit = [...found][0];
    }
    if (!hit) return track;
    const imageUrl = coverUrl(hit.artworkPath) ?? track.imageUrl;
    const known = hasKnownEnergy(track);
    const energyLevel = known ? track.energyLevel : hit.energyLevel;
    const energySource = known
      ? track.energySource ?? (hit.energyLevel === track.energyLevel ? "tag" : undefined)
      : hit.energyLevel != null
        ? "tag"
        : undefined;
    const bpm = track.bpm || hit.bpm;
    const keyCamelot = track.keyCamelot || hit.keyCamelot;
    if (
      imageUrl === track.imageUrl &&
      (hit.filePath || "") === (track.filePath || "") &&
      energyLevel === track.energyLevel &&
      energySource === track.energySource &&
      bpm === track.bpm &&
      keyCamelot === track.keyCamelot
    ) {
      return track;
    }
    changed = true;
    return {
      ...track,
      imageUrl,
      filePath: hit.filePath || track.filePath,
      energyLevel,
      energySource,
      bpm,
      keyCamelot,
    };
  });
  return changed ? { ...draft, tracks } : draft;
}

/** Blob URL for the cover file the browser still holds from the stick folder. */
function coverUrl(artworkPath: string | undefined): string | null {
  if (!artworkPath) return null;
  // Prefer the larger _m variant (a1_m.jpg), fall back to the 80px original.
  const large = artworkPath.replace(/(\.[a-z]+)$/i, "_m$1");
  return stickArtworkUrl(large) || stickArtworkUrl(artworkPath);
}

/** Audio and artwork paths the current set still needs from the stick. */
export function mediaPathsForDraft(draft: SetDraft, library: StickTrack[]): string[] {
  const paths = new Set<string>();
  for (const track of draft.tracks) {
    if (track.filePath) paths.add(track.filePath);
  }
  for (const stick of library) {
    const inSet = draft.tracks.some((track) => {
      if (track.filePath && pathKey(track.filePath) === pathKey(stick.filePath)) return true;
      return foldName(track.name) === foldName(stick.title);
    });
    if (!inSet) continue;
    if (stick.filePath) paths.add(stick.filePath);
    if (stick.artworkPath) {
      paths.add(stick.artworkPath);
      paths.add(stick.artworkPath.replace(/(\.[a-z]+)$/i, "_m$1"));
    }
  }
  return [...paths];
}

/** Library panel rows from a stick that was just chosen again. */
export function stickLibraryRows(
  library: StickTrack[],
  sets: RekordboxStickSet[] = [],
) {
  const playlistsByTrackId = new Map<string, string[]>();
  for (const set of sets) {
    // Name + folder path so “Sets / Freitag” and “Freitag” both match.
    const labels = [set.name, set.path]
      .map((value) => value.trim())
      .filter(Boolean);
    for (const track of set.tracks) {
      const list = playlistsByTrackId.get(track.id) ?? [];
      for (const label of labels) {
        if (!list.includes(label)) list.push(label);
      }
      playlistsByTrackId.set(track.id, list);
    }
  }
  return library.map((track) => ({
    artist: track.artist,
    title: track.title,
    key: track.keyCamelot || track.keyRaw,
    bpm: track.bpm,
    energy: track.energyLevel,
    playlists: playlistsByTrackId.get(track.id) ?? [],
    stick: track,
  }));
}

type StickLibraryRow = {
  artist: string;
  title: string;
  key: string;
  bpm: string;
  energy?: number;
  stick?: StickTrack;
};

/**
 * Pool for “Different songs” from the stick library already loaded in the app.
 * Reuses a set-track id when the file is already in the performance, so opener
 * and closer pins still find their track.
 */
export function sourcePoolFromStickLibrary(
  rows: StickLibraryRow[],
  performance: SetTrack[] = [],
): SourcePoolTrack[] {
  const seen = new Set<string>();
  const pool: SourcePoolTrack[] = [];
  for (const row of rows) {
    const stick = row.stick;
    if (!stick || !row.title.trim()) continue;
    if (seen.has(stick.id)) continue;
    seen.add(stick.id);
    const existing = performance.find(
      (track) =>
        (track.filePath && stick.filePath && track.filePath === stick.filePath) ||
        track.id.includes(`:${stick.id}:`),
    );
    const key = stick.keyCamelot || parseKeyValue(row.key) || "";
    const fromSet = existing && hasKnownEnergy(existing) ? existing : null;
    const imported = stick.energyLevel ?? row.energy;
    pool.push({
      id: existing?.id ?? `rekordbox:lib:${stick.id}`,
      name: row.title,
      artists: [row.artist || "Unknown"],
      album: stick.album || "rekordbox",
      durationMs: stick.durationMs,
      uri: stick.filePath || `rekordbox:${stick.id}`,
      externalUrl: "",
      imageUrl: coverUrl(stick.artworkPath),
      bpm: stick.bpm || row.bpm,
      keyCamelot: key,
      energyLevel: fromSet ? fromSet.energyLevel : imported,
      energySource: fromSet
        ? fromSet.energySource
        : imported != null
          ? "tag"
          : undefined,
      filePath: stick.filePath,
      source: "rekordbox",
      catalogBpm: stick.bpm || row.bpm,
      catalogKey: key,
    });
  }
  return pool;
}

/** How many distinct stick tracks a reshuffle pool would contain. Does not build the pool. */
export function stickLibraryPoolCount(
  rows: Array<{ title: string; stick?: { id: string } }>,
): number {
  const seen = new Set<string>();
  let count = 0;
  for (const row of rows) {
    const id = row.stick?.id;
    if (!id || !row.title.trim()) continue;
    if (seen.has(id)) continue;
    seen.add(id);
    count += 1;
  }
  return count;
}

/** Distinct history tracks. Same identity rule as stickLibraryPoolCount. */
export function historyPoolCount(
  sets: ReadonlyArray<{ kind: string; tracks: ReadonlyArray<{ id: string; title: string }> }>,
): number {
  const seen = new Set<string>();
  let count = 0;
  for (const set of sets) {
    if (set.kind !== "history") continue;
    for (const track of set.tracks) {
      if (!track.id || !track.title.trim()) continue;
      if (seen.has(track.id)) continue;
      seen.add(track.id);
      count += 1;
    }
  }
  return count;
}

/** Stored extract pool wins. Otherwise the stick library, when it is larger than the set. */
export function reshufflePoolForDraft(
  draft: SetDraft,
  library: StickLibraryRow[],
): { pool: SourcePoolTrack[]; fromStick: boolean } | null {
  const performance = draft.tracks.filter((track) => track.role !== "safety");
  const stored = draft.sourcePool ?? [];
  if (stored.length >= 2 && stored.length > performance.length) {
    return { pool: stored, fromStick: false };
  }
  const stick = sourcePoolFromStickLibrary(library, performance);
  if (stick.length >= 2 && stick.length > performance.length) {
    return { pool: stick, fromStick: true };
  }
  return null;
}

/** Stable id for a library row, shared by preview and the replace-list play button. */
export function libraryRowTrackId(row: {
  artist: string;
  title: string;
  stick?: { id: string };
}): string {
  const slug = `${row.artist}-${row.title}`.toLowerCase().replace(/[^a-z0-9]+/g, "-");
  return `rekordbox:lib:${row.stick ? row.stick.id : slug}`;
}

/** A track picked from the stick library, placed into a chosen phase and role. */
export function libraryTrackToSetTrack(
  row: {
    artist: string;
    title: string;
    key: string;
    bpm: string;
    energy?: number;
    stick?: StickTrack;
  },
  phase: SetPhaseId,
  role: TrackRole,
  t: Translate = tDe,
): SetTrack {
  const stick = row.stick;
  const slug = `${row.artist}-${row.title}`.toLowerCase().replace(/[^a-z0-9]+/g, "-");
  const fromTags = energyFromRekordboxTags({ comment: stick?.comment });
  const candidate = stick?.energyLevel ?? fromTags ?? row.energy;
  const energyLevel =
    candidate != null && hasKnownEnergy({ energyLevel: candidate, energySource: "tag" })
      ? candidate
      : undefined;
  return {
    id: libraryRowTrackId(row),
    name: row.title,
    artists: [row.artist || "Unknown"],
    album: stick?.album || "rekordbox",
    durationMs: stick?.durationMs ?? 0,
    uri: stick?.filePath || `rekordbox:${slug}`,
    externalUrl: "",
    imageUrl: coverUrl(stick?.artworkPath),
    phase,
    role,
    transition: "unset",
    bpm: stick?.bpm || row.bpm,
    keyCamelot: stick?.keyCamelot || parseKeyValue(row.key) || "",
    note: "",
    // Set-Notiz stays empty — stick/MP3 comments only feed energyLevel.
    comment: "",
    energyLevel,
    energySource: energyLevel != null ? "tag" : undefined,
    filePath: stick?.filePath || "",
    source: "rekordbox",
    why: t("exports.stick.whyLibrary"),
    safetyAlt: "",
  };
}

function toSetTrack(
  track: StickTrack,
  set: RekordboxStickSet,
  index: number,
  totalMs: number,
  t: Translate,
): SetTrack {
  return {
    id: `rekordbox:${set.id}:${track.id}:${index}`,
    name: track.title,
    artists: [track.artist || "Unknown"],
    album: track.album || "rekordbox",
    durationMs: track.durationMs,
    uri: track.filePath || `rekordbox:${track.id}`,
    externalUrl: "",
    imageUrl: coverUrl(track.artworkPath),
    phase: phaseForTrack(index, set.tracks, totalMs),
    role: "groove",
    transition: "unset",
    bpm: track.bpm,
    keyCamelot: track.keyCamelot,
    note: "",
    // Set-Notiz is set-only; MP3/rekordbox Comments are not copied here.
    comment: "",
    energyLevel: track.energyLevel,
    energySource: track.energyLevel != null ? "tag" : undefined,
    filePath: track.filePath,
    source: "rekordbox",
    why:
      set.kind === "history"
        ? t("exports.stick.whyHistory")
        : t("exports.stick.whyPlaylist"),
    safetyAlt: "",
  };
}

function phaseForTrack(index: number, tracks: StickTrack[], totalMs: number): SetPhaseId {
  const useDuration = totalMs > 0 && tracks.some((track) => track.durationMs > 0);
  let cursor = 0;
  const boundaries = PHASES.map((phase) => {
    cursor += phase.share;
    return { id: phase.id, until: cursor };
  });
  let acc = 0;
  const total = useDuration ? totalMs : tracks.length || 1;
  for (let i = 0; i <= index && i < tracks.length; i++) {
    const span = useDuration ? tracks[i].durationMs || 0 : 1;
    if (i === index) {
      const midpoint = (acc + span / 2) / total;
      return boundaries.find((boundary) => midpoint <= boundary.until)?.id ?? "release";
    }
    acc += span;
  }
  return "open";
}

function setsFromXml(xml: string): RekordboxStickSet[] {
  const doc = new DOMParser().parseFromString(xml, "application/xml");
  if (doc.querySelector("parsererror")) {
    throw new LocalizedError("exports.stick.invalidXml", undefined, "Ungültiges XML.");
  }
  const collection = new Map<string, StickTrack>();
  for (const node of doc.querySelectorAll("COLLECTION TRACK, COLLECTION Track")) {
    const id = node.getAttribute("TrackID") || node.getAttribute("TrackId") || "";
    const title = node.getAttribute("Name") || "";
    if (!id || !title) continue;
    const keyRaw = node.getAttribute("Tonality") || "";
    const bpmRaw = node.getAttribute("AverageBpm") || node.getAttribute("Bpm") || "";
    const bpmNum = Number(bpmRaw);
    const seconds = Number(node.getAttribute("TotalTime") || 0);
    collection.set(id, {
      id,
      title,
      artist: node.getAttribute("Artist") || "",
      album: node.getAttribute("Album") || "",
      bpm: bpmRaw && Number.isFinite(bpmNum) ? String(Math.round(bpmNum)) : "",
      keyRaw,
      keyCamelot: parseKeyValue(keyRaw) || "",
      durationMs: Number.isFinite(seconds) ? seconds * 1000 : 0,
      comment: node.getAttribute("Comments") || "",
      energyLevel: energyFromRekordboxTags({
        comment: node.getAttribute("Comments"),
        grouping: node.getAttribute("Grouping"),
        label: node.getAttribute("Label"),
        remixer: node.getAttribute("Remixer"),
      }),
      filePath: decodeXmlLocation(node.getAttribute("Location") || ""),
    });
  }

  const sets: RekordboxStickSet[] = [];
  const root = doc.querySelector("PLAYLISTS > NODE, PLAYLISTS > Node");
  if (root) walkPlaylist(root, "", collection, sets);
  return sets;
}

function walkPlaylist(
  node: Element,
  folder: string,
  collection: Map<string, StickTrack>,
  sets: RekordboxStickSet[],
) {
  const type = node.getAttribute("Type");
  const name = node.getAttribute("Name") || "Playlist";
  if (type === "0") {
    const next =
      name && name.toUpperCase() !== "ROOT"
        ? folder
          ? `${folder} / ${name}`
          : name
        : folder;
    for (const child of node.children) {
      if (child.tagName.toUpperCase() === "NODE") walkPlaylist(child, next, collection, sets);
    }
    return;
  }
  if (type !== "1") return;
  let missing = 0;
  const tracks: StickTrack[] = [];
  for (const child of node.children) {
    if (child.tagName.toUpperCase() !== "TRACK") continue;
    const key = child.getAttribute("Key") || "";
    const track = collection.get(key);
    if (!track) {
      missing += 1;
      continue;
    }
    tracks.push(track);
  }
  sets.push({
    id: `xml:${sets.length}:${name}`,
    name,
    path: folder ? `${folder} / ${name}` : name,
    kind: "playlist",
    missing,
    tracks,
  });
}

function decodeXmlLocation(location: string): string {
  if (!location) return "";
  try {
    const url = new URL(location);
    return decodeURIComponent(url.pathname);
  } catch {
    return location;
  }
}

function findFile(files: File[], match: (path: string) => boolean): File | null {
  for (const file of files) {
    const path = (file.webkitRelativePath || file.name).replaceAll("\\", "/").toLowerCase();
    if (match(path)) return file;
  }
  return null;
}

function displayPath(file: File): string {
  return (file.webkitRelativePath || file.name).replaceAll("\\", "/");
}
