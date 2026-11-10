/**
 * Reader for the DeviceSQL database rekordbox writes to USB/SD media:
 * `PIONEER/rekordbox/export.pdb`.
 *
 * Page layout follows the crate-digger rekordbox_pdb description:
 * fixed-size pages, row index growing backwards from the page end,
 * little-endian integers, DeviceSQL strings.
 */

import { LocalizedError } from "@/lib/i18n/error";

export type PdbTrack = {
  id: number;
  title: string;
  artist: string;
  album: string;
  key: string;
  bpm: string;
  durationMs: number;
  comment: string;
  /** Remix / mix name — Mixed In Key sometimes writes Energy here. */
  mixName: string;
  filePath: string;
  filename: string;
  /** Cover path on the stick, e.g. /PIONEER/Artwork/00001/a1.jpg */
  artworkPath: string;
  /** Star rating 0–5. 0 means rekordbox has no stars on this track. */
  rating?: number;
  /** Track color 0–8. 0 is no color. 1 Pink … 8 Purple, matching the colors table. */
  color?: number;
  /** Genre name from the genres table. Empty when the track has none. */
  genre?: string;
};

export type PdbPlaylist = {
  id: number;
  name: string;
  path: string;
  kind: "playlist" | "history";
  trackIds: number[];
};

export type PdbLibrary = {
  tracks: PdbTrack[];
  playlists: PdbPlaylist[];
};

const TABLE = {
  tracks: 0,
  genres: 1,
  artists: 2,
  albums: 3,
  keys: 5,
  artwork: 13,
  playlistTree: 7,
  playlistEntries: 8,
  historyPlaylists: 11,
  historyEntries: 12,
} as const;

const HEAP = 0x28;

export function parseRekordboxPdb(buffer: ArrayBuffer): PdbLibrary {
  if (buffer.byteLength < 64) {
    throw new LocalizedError(
      "exports.pdb.tooSmall",
      undefined,
      "Die Datei ist zu klein für eine rekordbox export.pdb.",
    );
  }
  const view = new DataView(buffer);
  const pageLen = view.getUint32(4, true);
  const tableCount = view.getUint32(8, true);
  if (
    pageLen < 512 ||
    pageLen > 65536 ||
    pageLen % 16 !== 0 ||
    tableCount < 1 ||
    tableCount > 64 ||
    buffer.byteLength < pageLen
  ) {
    throw new LocalizedError(
      "exports.pdb.notPdb",
      undefined,
      "Das ist keine rekordbox export.pdb. Auf dem Stick liegt sie unter PIONEER/rekordbox/export.pdb.",
    );
  }

  const tables = new Map<number, { first: number; last: number }>();
  for (let i = 0; i < tableCount; i++) {
    const at = 28 + i * 16;
    if (at + 16 > pageLen) break;
    tables.set(view.getUint32(at, true), {
      first: view.getUint32(at + 8, true),
      last: view.getUint32(at + 12, true),
    });
  }

  const genres = readNamedRows(view, pageLen, tables.get(TABLE.genres), readGenre);
  const artists = readNamedRows(view, pageLen, tables.get(TABLE.artists), readArtist);
  const albums = readNamedRows(view, pageLen, tables.get(TABLE.albums), readAlbum);
  const keys = readNamedRows(view, pageLen, tables.get(TABLE.keys), readKey);
  const artwork = readNamedRows(view, pageLen, tables.get(TABLE.artwork), readArtwork);
  const tracks = readTracks(
    view,
    pageLen,
    tables.get(TABLE.tracks),
    artists,
    albums,
    keys,
    artwork,
    genres,
  );
  const tree = readPlaylistTree(view, pageLen, tables.get(TABLE.playlistTree));
  const entries = readPlaylistEntries(view, pageLen, tables.get(TABLE.playlistEntries));
  const history = readHistoryPlaylists(view, pageLen, tables.get(TABLE.historyPlaylists));
  const historyEntries = readHistoryEntries(view, pageLen, tables.get(TABLE.historyEntries));

  const playlists = [
    ...assemblePlaylists(tree, entries),
    ...assembleHistory(history, historyEntries),
  ];

  if (!tracks.length && !playlists.length) {
    throw new LocalizedError(
      "exports.pdb.empty",
      undefined,
      "export.pdb gelesen, aber ohne Tracks oder Playlists.",
    );
  }

  return { tracks, playlists };
}

function readNamedRows(
  view: DataView,
  pageLen: number,
  table: { first: number; last: number } | undefined,
  read: (view: DataView, row: number, pageEnd: number) => { id: number; name: string } | null,
): Map<number, string> {
  const map = new Map<number, string>();
  if (!table) return map;
  forEachRow(view, pageLen, table, (row, pageEnd) => {
    const item = read(view, row, pageEnd);
    if (item && item.id) map.set(item.id, item.name);
  });
  return map;
}

function readArtist(view: DataView, row: number, pageEnd: number) {
  if (row + 10 > pageEnd) return null;
  const subtype = view.getUint16(row, true);
  const id = view.getUint32(row + 4, true);
  const name = readOffsetString(view, row, pageEnd, subtype, 9, 0x0a);
  return { id, name };
}

function readAlbum(view: DataView, row: number, pageEnd: number) {
  if (row + 22 > pageEnd) return null;
  const subtype = view.getUint16(row, true);
  const id = view.getUint32(row + 12, true);
  const name = readOffsetString(view, row, pageEnd, subtype, 21, 0x16);
  return { id, name };
}

function readArtwork(view: DataView, row: number, pageEnd: number) {
  if (row + 6 > pageEnd) return null;
  const id = view.getUint32(row, true);
  return { id, name: readDeviceString(view, row + 4, pageEnd) };
}

function readGenre(view: DataView, row: number, pageEnd: number) {
  if (row + 6 > pageEnd) return null;
  const id = view.getUint32(row, true);
  return { id, name: readDeviceString(view, row + 4, pageEnd).trim() };
}

function readKey(view: DataView, row: number, pageEnd: number) {
  if (row + 8 > pageEnd) return null;
  const id = view.getUint32(row, true);
  return { id, name: readDeviceString(view, row + 8, pageEnd) };
}

/**
 * Star rating as an integer 0–5.
 * export.pdb stores 0–5 in one byte. Collection XML stores
 * 0, 51, 102, 153, 204, 255 (51 per star, 255 for five).
 */
export function rekordboxStars(raw: number): number {
  if (!Number.isFinite(raw) || raw <= 0) return 0;
  const stars = raw <= 5 ? raw : raw / 51;
  return Math.min(5, Math.max(0, Math.round(stars)));
}

/**
 * Track color 0–8. The colors table on this stick names them, in order:
 * 1 Pink, 2 Red, 3 Orange, 4 Yellow, 5 Green, 6 Aqua, 7 Blue, 8 Purple.
 * Anything else is no color.
 */
export function rekordboxColor(raw: number): number {
  if (!Number.isInteger(raw) || raw < 1 || raw > 8) return 0;
  return raw;
}

/** Swatch hues for those eight rekordbox colors. */
export const REKORDBOX_COLOR_HEX: Record<number, string> = {
  1: "#FF4D93",
  2: "#FF3B30",
  3: "#FF8A1F",
  4: "#F5C518",
  5: "#3DDC4A",
  6: "#2AD4D0",
  7: "#3D6BFF",
  8: "#9B4DFF",
};

/** XML Colour/Color: 0–8, or the hex values rekordbox writes. Unknown stays unset. */
const XML_COLORS: Record<string, number> = {
  "0": 0,
  "1": 1,
  "2": 2,
  "3": 3,
  "4": 4,
  "5": 5,
  "6": 6,
  "7": 7,
  "8": 8,
  "0x000000": 0,
  "0xffffff": 0,
  "0xff007f": 1,
  "0xff4d93": 1,
  "0xff0000": 2,
  "0xff3b30": 2,
  "0xff8a1f": 3,
  "0xff8c00": 3,
  "0xffa500": 3,
  "0xff5a00": 3,
  "0xffff00": 4,
  "0xf5c518": 4,
  "0x00ff00": 5,
  "0x00e000": 5,
  "0x3ddc4a": 5,
  "0x00ffff": 6,
  "0x25fde9": 6,
  "0x2ad4d0": 6,
  "0x0000ff": 7,
  "0x0040ff": 7,
  "0x3d6bff": 7,
  "0x8000ff": 8,
  "0x8f00ff": 8,
  "0x9900ff": 8,
  "0x9b4dff": 8,
  "0x6600ff": 8,
};

export function rekordboxColorFromAttribute(raw: string | null | undefined): number | undefined {
  if (raw == null || raw.trim() === "") return undefined;
  const key = raw.trim().toLowerCase();
  if (key in XML_COLORS) return XML_COLORS[key];
  const value = Number(key);
  if (Number.isInteger(value) && value >= 0 && value <= 8) return value;
  return undefined;
}

/** XML `Rating` attribute. Missing or blank means the track has no rating. */
export function rekordboxStarsFromAttribute(raw: string | null | undefined): number | undefined {
  if (raw == null || raw.trim() === "") return undefined;
  const value = Number(raw);
  if (!Number.isFinite(value)) return undefined;
  return rekordboxStars(value);
}

function readTracks(
  view: DataView,
  pageLen: number,
  table: { first: number; last: number } | undefined,
  artists: Map<number, string>,
  albums: Map<number, string>,
  keys: Map<number, string>,
  artwork: Map<number, string>,
  genres: Map<number, string>,
): PdbTrack[] {
  const tracks: PdbTrack[] = [];
  if (!table) return tracks;
  forEachRow(view, pageLen, table, (row, pageEnd) => {
    if (row + 136 > pageEnd) return;
    const id = view.getUint32(row + 72, true);
    if (!id) return;
    const tempo = view.getUint32(row + 56, true);
    const duration = view.getUint16(row + 84, true);
    // Genre id at +60. Color uint8 at +88. Rating uint8 at +89. Strings from +94.
    const genreId = view.getUint32(row + 60, true);
    const color = rekordboxColor(view.getUint8(row + 88));
    const rating = rekordboxStars(view.getUint8(row + 89));
    const title = trackString(view, row, pageEnd, 17);
    const filename = trackString(view, row, pageEnd, 19);
    tracks.push({
      id,
      title: title || filename || "Ohne Titel",
      artist: artists.get(view.getUint32(row + 68, true)) || "",
      album: albums.get(view.getUint32(row + 64, true)) || "",
      key: keys.get(view.getUint32(row + 32, true)) || "",
      bpm: tempo ? String(Math.round(tempo / 100)) : "",
      durationMs: duration * 1000,
      comment: trackString(view, row, pageEnd, 16),
      mixName: trackString(view, row, pageEnd, 12),
      filePath: trackString(view, row, pageEnd, 20),
      filename,
      artworkPath: artwork.get(view.getUint32(row + 28, true)) || "",
      rating,
      color,
      genre: genres.get(genreId) || "",
    });
  });
  return tracks;
}

function trackString(view: DataView, row: number, pageEnd: number, index: number): string {
  const ofs = view.getUint16(row + 94 + index * 2, true);
  if (!ofs) return "";
  return readDeviceString(view, row + ofs, pageEnd);
}

type TreeRow = {
  id: number;
  parentId: number;
  sort: number;
  folder: boolean;
  name: string;
};

function readPlaylistTree(
  view: DataView,
  pageLen: number,
  table: { first: number; last: number } | undefined,
): TreeRow[] {
  const rows: TreeRow[] = [];
  if (!table) return rows;
  forEachRow(view, pageLen, table, (row, pageEnd) => {
    if (row + 20 > pageEnd) return;
    const id = view.getUint32(row + 12, true);
    if (!id) return;
    rows.push({
      id,
      parentId: view.getUint32(row, true),
      sort: view.getUint32(row + 8, true),
      folder: view.getUint32(row + 16, true) !== 0,
      name: readDeviceString(view, row + 20, pageEnd) || "Playlist",
    });
  });
  return dedupePlaylistTree(rows);
}

// Leftover tree rows repeat a live playlist id with parent 0 and sort 0, and
// then inherit that id's track list. Keep one row per id: the child whose
// parent exists in this tree. An id seen only once is kept, folders included.
function dedupePlaylistTree(rows: TreeRow[]): TreeRow[] {
  const ids = new Set(rows.map((row) => row.id));
  const groups = new Map<number, TreeRow[]>();
  for (const row of rows) {
    const group = groups.get(row.id);
    if (group) group.push(row);
    else groups.set(row.id, [row]);
  }

  const kept: TreeRow[] = [];
  for (const group of groups.values()) {
    if (group.length === 1) {
      kept.push(group[0]);
      continue;
    }
    const linked = group.filter((row) => ids.has(row.parentId));
    if (linked.length > 0) {
      kept.push(linked[0]);
      continue;
    }
    const rest = group.filter((row) => row.parentId !== 0 || row.sort !== 0);
    kept.push(rest[0] ?? group[0]);
  }
  return kept;
}

function readPlaylistEntries(
  view: DataView,
  pageLen: number,
  table: { first: number; last: number } | undefined,
): Array<{ playlistId: number; trackId: number; index: number }> {
  const rows: Array<{ playlistId: number; trackId: number; index: number }> = [];
  if (!table) return rows;
  forEachRow(view, pageLen, table, (row, pageEnd) => {
    if (row + 12 > pageEnd) return;
    rows.push({
      index: view.getUint32(row, true),
      trackId: view.getUint32(row + 4, true),
      playlistId: view.getUint32(row + 8, true),
    });
  });
  return rows;
}

function readHistoryPlaylists(
  view: DataView,
  pageLen: number,
  table: { first: number; last: number } | undefined,
): Array<{ id: number; name: string }> {
  const rows: Array<{ id: number; name: string }> = [];
  if (!table) return rows;
  forEachRow(view, pageLen, table, (row, pageEnd) => {
    if (row + 4 > pageEnd) return;
    const id = view.getUint32(row, true);
    if (!id) return;
    rows.push({
      id,
      name: readDeviceString(view, row + 4, pageEnd) || `HISTORY ${id}`,
    });
  });
  return rows;
}

function readHistoryEntries(
  view: DataView,
  pageLen: number,
  table: { first: number; last: number } | undefined,
): Array<{ playlistId: number; trackId: number; index: number }> {
  const rows: Array<{ playlistId: number; trackId: number; index: number }> = [];
  if (!table) return rows;
  forEachRow(view, pageLen, table, (row, pageEnd) => {
    if (row + 12 > pageEnd) return;
    rows.push({
      trackId: view.getUint32(row, true),
      playlistId: view.getUint32(row + 4, true),
      index: view.getUint32(row + 8, true),
    });
  });
  return rows;
}

function trackIdsByPlaylist(
  entries: Array<{ playlistId: number; trackId: number; index: number }>,
): Map<number, number[]> {
  const grouped = new Map<number, Array<{ trackId: number; index: number }>>();
  for (const entry of entries) {
    if (!entry.trackId) continue;
    const list = grouped.get(entry.playlistId);
    const item = { trackId: entry.trackId, index: entry.index };
    if (list) list.push(item);
    else grouped.set(entry.playlistId, [item]);
  }
  const ids = new Map<number, number[]>();
  for (const [playlistId, list] of grouped) {
    list.sort((a, b) => a.index - b.index);
    ids.set(
      playlistId,
      list.map((entry) => entry.trackId),
    );
  }
  return ids;
}

function assemblePlaylists(
  tree: TreeRow[],
  entries: Array<{ playlistId: number; trackId: number; index: number }>,
): PdbPlaylist[] {
  const byId = new Map(tree.map((row) => [row.id, row]));
  const trackIds = trackIdsByPlaylist(entries);
  return tree
    .filter((row) => !row.folder)
    .map((row) => ({
      sort: row.sort,
      playlist: {
        id: row.id,
        name: row.name,
        path: folderPath(row, byId),
        kind: "playlist" as const,
        trackIds: trackIds.get(row.id) ?? [],
      },
    }))
    .sort((a, b) => a.sort - b.sort || a.playlist.path.localeCompare(b.playlist.path))
    .map((row) => row.playlist);
}

function assembleHistory(
  playlists: Array<{ id: number; name: string }>,
  entries: Array<{ playlistId: number; trackId: number; index: number }>,
): PdbPlaylist[] {
  const trackIds = trackIdsByPlaylist(entries);
  return playlists.map((row) => ({
    id: row.id,
    name: row.name,
    path: `History / ${row.name}`,
    kind: "history" as const,
    trackIds: trackIds.get(row.id) ?? [],
  }));
}

function folderPath(row: TreeRow, byId: Map<number, TreeRow>): string {
  const names = [row.name];
  const seen = new Set<number>([row.id]);
  let parentId = row.parentId;
  while (parentId && !seen.has(parentId)) {
    seen.add(parentId);
    const parent = byId.get(parentId);
    if (!parent) break;
    if (parent.name && parent.name.toUpperCase() !== "ROOT") names.push(parent.name);
    parentId = parent.parentId;
  }
  return names.reverse().join(" / ");
}

function readOffsetString(
  view: DataView,
  row: number,
  pageEnd: number,
  subtype: number,
  nearAt: number,
  farAt: number,
): string {
  const far = (subtype & 0x04) === 0x04;
  if (far) {
    if (row + farAt + 2 > pageEnd) return "";
    const ofs = view.getUint16(row + farAt, true);
    return ofs ? readDeviceString(view, row + ofs, pageEnd) : "";
  }
  if (row + nearAt >= pageEnd) return "";
  const ofs = view.getUint8(row + nearAt);
  return ofs ? readDeviceString(view, row + ofs, pageEnd) : "";
}

const utf16le = new TextDecoder("utf-16le");
const latin1 = new TextDecoder("latin1");

function readDeviceString(view: DataView, pos: number, pageEnd: number): string {
  if (pos < 0 || pos >= pageEnd) return "";
  const kind = view.getUint8(pos);
  try {
    if (kind & 1) {
      const length = kind >> 1;
      const size = length - 1;
      if (size <= 0 || pos + 1 + size > pageEnd) return "";
      let text = "";
      for (let i = 0; i < size; i++) text += String.fromCharCode(view.getUint8(pos + 1 + i));
      return text.replace(/\u0000+$/g, "");
    }
    if (pos + 4 > pageEnd) return "";
    const length = view.getUint16(pos + 1, true);
    let size = length - 4;
    if (size <= 0 || pos + 4 + size > pageEnd) return "";
    if ((kind === 0x90 || (kind & 0x10) !== 0) && size % 2 === 1) size -= 1;
    const bytes = new Uint8Array(view.buffer, view.byteOffset + pos + 4, size);
    const encoding = kind === 0x90 || (kind & 0x10) !== 0 ? utf16le : latin1;
    return encoding.decode(bytes).replace(/\u0000+$/g, "");
  } catch {
    return "";
  }
}

function forEachRow(
  view: DataView,
  pageLen: number,
  table: { first: number; last: number },
  visit: (row: number, pageEnd: number) => void,
) {
  const seen = new Set<number>();
  let index = table.first;
  while (
    index > 0 &&
    index < 1_000_000 &&
    index * pageLen + pageLen <= view.byteLength &&
    !seen.has(index)
  ) {
    seen.add(index);
    const page = index * pageLen;
    const pageEnd = page + pageLen;
    const flags = view.getUint8(page + 27);
    const bitfield =
      view.getUint8(page + 24) |
      (view.getUint8(page + 25) << 8) |
      (view.getUint8(page + 26) << 16);
    const offsets = bitfield & 0x1fff;
    if ((flags & 0x40) === 0 && offsets > 0) {
      const groups = Math.min(64, Math.floor((offsets - 1) / 16) + 1);
      for (let group = 0; group < groups; group++) {
        const base = pageLen - group * 0x24;
        if (base < HEAP + 6) break;
        const present = view.getUint16(page + base - 4, true);
        const count = Math.min(16, offsets - group * 16);
        for (let i = 0; i < count; i++) {
          if (((present >> i) & 1) === 0) continue;
          const ofs = view.getUint16(page + base - 6 - 2 * i, true);
          const row = page + HEAP + ofs;
          if (row < page + HEAP || row >= pageEnd) continue;
          visit(row, pageEnd);
        }
      }
    }
    if (index === table.last) break;
    const next = view.getUint32(page + 12, true);
    const nextType = view.getUint32(page + 8, true);
    if (!next || next === index) break;
    if (next * pageLen + 12 <= view.byteLength) {
      const followedType = view.getUint32(next * pageLen + 8, true);
      if (followedType !== nextType) break;
    }
    index = next;
  }
}
