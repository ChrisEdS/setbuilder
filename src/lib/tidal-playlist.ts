import type { SpotifyTrack } from "@/lib/spotify";
import { getTidalAccessToken } from "@/lib/tidal";
import { getTidalUserAccessToken } from "@/lib/tidal-auth";
import { tidalKeyToCamelot } from "@/lib/tidal";

export function parseTidalPlaylistId(input: string): string | null {
  const trimmed = input.trim();
  try {
    const url = new URL(trimmed);
    const host = url.hostname.replace(/^www\./, "");
    if (!host.endsWith("tidal.com")) return null;
    const parts = url.pathname.split("/").filter(Boolean);
    const index = parts.lastIndexOf("playlist");
    if (index >= 0 && parts[index + 1]) return decodeURIComponent(parts[index + 1]);
  } catch {
    return null;
  }
  return null;
}

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

type TidalTrackAttrs = {
  title?: string;
  isrc?: string;
  duration?: string | number;
  explicit?: boolean;
  popularity?: number;
  bpm?: number;
  key?: string;
  keyScale?: string;
};

async function tidalToken(): Promise<string> {
  return (await getTidalUserAccessToken()) || getTidalAccessToken();
}

export async function fetchTidalPlaylist(playlistId: string): Promise<{
  id: string;
  name: string;
  tracks: SpotifyTrack[];
}> {
  const token = await tidalToken();
  const headers = {
    Authorization: `Bearer ${token}`,
    Accept: "application/vnd.api+json",
  };
  const metaRes = await fetch(
    `https://openapi.tidal.com/v2/playlists/${playlistId}?countryCode=DE&include=items`,
    { headers, cache: "no-store" },
  );
  if (!metaRes.ok) {
    throw new Error(
      metaRes.status === 401 || metaRes.status === 403
        ? "Tidal-Playlist nicht lesbar. Mit Tidal verbinden oder einen öffentlichen Playlist-Link nutzen."
        : `Tidal-Playlist fehlgeschlagen (${metaRes.status})`,
    );
  }
  const meta = (await metaRes.json()) as {
    data?: {
      id?: string;
      attributes?: { title?: string; name?: string };
      relationships?: { items?: { data?: Array<{ id: string; type: string }> } };
    };
    included?: Array<{
      id: string;
      type: string;
      attributes?: TidalTrackAttrs;
    }>;
  };
  const name =
    meta.data?.attributes?.title ||
    meta.data?.attributes?.name ||
    "Tidal Playlist";
  let included = meta.included ?? [];
  if (!included.some((item) => item.type === "tracks")) {
    const itemsRes = await fetch(
      `https://openapi.tidal.com/v2/playlists/${playlistId}/relationships/items?countryCode=DE&include=tracks`,
      { headers, cache: "no-store" },
    );
    if (itemsRes.ok) {
      const items = (await itemsRes.json()) as { included?: typeof included };
      included = items.included ?? included;
    }
  }
  const tracks: SpotifyTrack[] = [];
  for (const item of included) {
    if (item.type !== "tracks" || !item.attributes?.title) continue;
    const attrs = item.attributes;
    const key = tidalKeyToCamelot(attrs.key, attrs.keyScale);
    const bpm =
      typeof attrs.bpm === "number" && Number.isFinite(attrs.bpm)
        ? String(Math.round(attrs.bpm))
        : "";
    tracks.push({
      id: `tidal:${item.id}`,
      name: attrs.title,
      uri: `tidal:track:${item.id}`,
      durationMs: durationMs(attrs.duration),
      explicit: Boolean(attrs.explicit),
      artists: ["Tidal"],
      album: "Tidal",
      imageUrl: null,
      externalUrl: `https://tidal.com/browse/track/${item.id}`,
      popularity: null,
      isrc: attrs.isrc?.toUpperCase() ?? null,
      catalogBpm: bpm,
      catalogKey: key.camelot || "",
      catalogPopularity:
        typeof attrs.popularity === "number" ? attrs.popularity : null,
    });
  }
  if (!tracks.length) {
    throw new Error("Tidal-Playlist enthält keine lesbaren Tracks.");
  }
  return { id: meta.data?.id || playlistId, name, tracks };
}
