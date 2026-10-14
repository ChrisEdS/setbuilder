import { distributeRoles } from "@/lib/extract-set";
import { stickAudioUrl } from "@/lib/stick-audio";
import { parseEnergyLevel } from "@/lib/energy";
import { tDe, type Translate } from "@/lib/i18n/core";
import { LocalizedError } from "@/lib/i18n/error";
import { parseKeyValue } from "@/lib/key-import";
import { parseRekordboxPdb, type PdbLibrary, type PdbTrack } from "@/lib/rekordbox-pdb";
import {
  PHASES,
  type SetDraft,
  type SetPhaseId,
  type SetTrack,
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
    const library = parseRekordboxPdb(await pdb.arrayBuffer());
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
  return distributeRoles({
    ...draft,
    title: set.name,
    tracks: set.tracks.map((track, index) => toSetTrack(track, set, index, totalMs, t)),
  });
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
    energyLevel: parseEnergyLevel(track.comment),
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
    if (imageUrl === track.imageUrl && (hit.filePath || "") === (track.filePath || "")) {
      return track;
    }
    changed = true;
    return { ...track, imageUrl, filePath: hit.filePath || track.filePath };
  });
  return changed ? { ...draft, tracks } : draft;
}

/** Blob URL for the cover file the browser still holds from the stick folder. */
function coverUrl(artworkPath: string | undefined): string | null {
  if (!artworkPath) return null;
  // Prefer the larger _m variant (a1_m.jpg), fall back to the 80px original.
  const large = artworkPath.replace(/(\.[a-z]+)$/i, "_m$1");
  return stickAudioUrl(large) || stickAudioUrl(artworkPath);
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
export function stickLibraryRows(library: StickTrack[]) {
  return library.map((track) => ({
    artist: track.artist,
    title: track.title,
    key: track.keyCamelot || track.keyRaw,
    bpm: track.bpm,
    energy: track.energyLevel,
    stick: track,
  }));
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
  return {
    id: `rekordbox:lib:${stick ? stick.id : slug}`,
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
    comment: stick?.comment || "",
    energyLevel: stick?.energyLevel ?? row.energy,
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
    comment: track.comment,
    energyLevel: track.energyLevel,
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
      energyLevel: parseEnergyLevel(node.getAttribute("Comments")),
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
