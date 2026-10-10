import type { SpotifyTrack } from "@/lib/spotify";
import { tidalKeyToCamelot } from "@/lib/tidal";

type JsonRef = { id?: string; type?: string };

export type TidalIncludedResource = {
  id: string;
  type: string;
  attributes?: {
    title?: string;
    name?: string;
    isrc?: string;
    duration?: string | number;
    explicit?: boolean;
    popularity?: number;
    bpm?: number;
    key?: string;
    keyScale?: string;
  };
  relationships?: {
    artists?: { data?: JsonRef[] };
    albums?: { data?: JsonRef[] };
  };
};

function durationMs(value: unknown): number {
  if (typeof value === "number") return Math.round(value * 1000);
  if (typeof value !== "string") return 0;
  const match = value.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+(?:\.\d+)?)S)?/);
  if (!match) return 0;
  const hours = Number(match[1] || 0);
  const minutes = Number(match[2] || 0);
  const seconds = Number(match[3] || 0);
  return Math.round((hours * 3600 + minutes * 60 + seconds) * 1000);
}

function namesFor(
  refs: JsonRef[] | undefined,
  byId: Map<string, string>,
): string[] {
  const names: string[] = [];
  for (const ref of refs ?? []) {
    if (!ref.id) continue;
    const name = byId.get(ref.id);
    if (name) names.push(name);
  }
  return names;
}

/** Playlist order follows `data`, names come from `included` artists and albums. */
export function tracksFromTidalPage(
  data: JsonRef[],
  included: TidalIncludedResource[],
): SpotifyTrack[] {
  const artists = new Map<string, string>();
  const albums = new Map<string, string>();
  const tracks = new Map<string, TidalIncludedResource>();
  for (const item of included) {
    if (item.type === "artists") {
      const name = item.attributes?.name?.trim();
      if (name) artists.set(item.id, name);
    } else if (item.type === "albums") {
      const name = item.attributes?.title?.trim() || item.attributes?.name?.trim();
      if (name) albums.set(item.id, name);
    } else if (item.type === "tracks") {
      tracks.set(item.id, item);
    }
  }

  const out: SpotifyTrack[] = [];
  const seen = new Set<string>();
  for (const ref of data) {
    if (ref.type !== "tracks" || !ref.id) continue;
    const item = tracks.get(ref.id);
    const attrs = item?.attributes;
    if (!attrs?.title) continue;
    let id = `tidal:${ref.id}`;
    if (seen.has(id)) id = `tidal:${ref.id}:${out.length}`;
    seen.add(id);
    const key = tidalKeyToCamelot(attrs.key, attrs.keyScale);
    const bpm =
      typeof attrs.bpm === "number" && Number.isFinite(attrs.bpm)
        ? String(Math.round(attrs.bpm))
        : "";
    const artistNames = namesFor(item?.relationships?.artists?.data, artists);
    const albumNames = namesFor(item?.relationships?.albums?.data, albums);
    out.push({
      id,
      name: attrs.title,
      uri: `tidal:track:${ref.id}`,
      durationMs: durationMs(attrs.duration),
      explicit: Boolean(attrs.explicit),
      artists: artistNames.length ? artistNames : ["Unknown"],
      album: albumNames[0] || "",
      imageUrl: null,
      externalUrl: `https://tidal.com/browse/track/${ref.id}`,
      popularity: null,
      isrc: attrs.isrc?.toUpperCase() ?? null,
      catalogBpm: bpm,
      catalogKey: key.camelot || "",
      catalogPopularity:
        typeof attrs.popularity === "number" ? attrs.popularity : null,
    });
  }
  return out;
}
