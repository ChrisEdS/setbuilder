import { LocalizedError } from "@/lib/i18n/error";
import type { SpotifyTrack } from "@/lib/spotify";
import { getTidalAccessToken } from "@/lib/tidal";
import { getTidalUserAccessToken } from "@/lib/tidal-auth";
import {
  tracksFromTidalPage,
  type TidalIncludedResource,
} from "@/lib/tidal-playlist-map";

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

async function tidalToken(): Promise<string> {
  return (await getTidalUserAccessToken()) || getTidalAccessToken();
}

export async function listMyTidalPlaylists(): Promise<
  Array<{ id: string; name: string; trackCount: number | null }>
> {
  const token = await getTidalUserAccessToken();
  if (!token) return [];
  const response = await fetch(
    "https://openapi.tidal.com/v2/playlists?countryCode=DE&filter[owners.id]=me",
    {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/vnd.api+json",
      },
      cache: "no-store",
    },
  );
  if (!response.ok) return [];
  const data = (await response.json()) as {
    data?: Array<{
      id: string;
      attributes?: { name?: string; numberOfItems?: number };
    }>;
  };
  return (data.data ?? []).map((playlist) => ({
    id: playlist.id,
    name: playlist.attributes?.name || "Playlist",
    trackCount:
      typeof playlist.attributes?.numberOfItems === "number"
        ? playlist.attributes.numberOfItems
        : null,
  }));
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
    `https://openapi.tidal.com/v2/playlists/${playlistId}?countryCode=DE`,
    { headers, cache: "no-store" },
  );
  if (!metaRes.ok) {
    throw metaRes.status === 401 || metaRes.status === 403
      ? new LocalizedError(
          "api.tidal.playlistUnreadable",
          undefined,
          "Tidal-Playlist nicht lesbar. Mit Tidal verbinden oder einen öffentlichen Playlist-Link nutzen.",
        )
      : new LocalizedError(
          "api.tidal.playlistFailed",
          { status: metaRes.status },
          `Tidal-Playlist fehlgeschlagen (${metaRes.status})`,
        );
  }
  const meta = (await metaRes.json()) as {
    data?: { id?: string; attributes?: { title?: string; name?: string } };
  };
  const name =
    meta.data?.attributes?.title ||
    meta.data?.attributes?.name ||
    "Tidal Playlist";
  const tracks = await fetchTidalPlaylistTracks(playlistId, headers);
  if (!tracks.length) {
    throw new LocalizedError(
      "api.tidal.playlistEmpty",
      undefined,
      "Tidal-Playlist enthält keine lesbaren Tracks.",
    );
  }
  return { id: meta.data?.id || playlistId, name, tracks };
}

async function fetchTidalPlaylistTracks(
  playlistId: string,
  headers: { Authorization: string; Accept: string },
): Promise<SpotifyTrack[]> {
  const tracks: SpotifyTrack[] = [];
  let url: string | null =
    `https://openapi.tidal.com/v2/playlists/${playlistId}/relationships/items?countryCode=DE&include=items.artists,items.albums&page[limit]=20`;
  for (let page = 0; page < 40 && url; page++) {
    const response = await fetchTidalPage(url, headers);
    if (!response) break;
    const body = (await response.json()) as {
      data?: Array<{ id?: string; type?: string }>;
      included?: TidalIncludedResource[];
      links?: { next?: string };
    };
    const pageTracks = tracksFromTidalPage(body.data ?? [], body.included ?? []);
    tracks.push(...pageTracks);
    const next = body.links?.next;
    if (!next || pageTracks.length === 0) break;
    url = next.startsWith("http") ? next : `https://openapi.tidal.com/v2${next}`;
    await new Promise((resolve) => setTimeout(resolve, 120));
  }
  return tracks;
}

async function fetchTidalPage(
  url: string,
  headers: { Authorization: string; Accept: string },
): Promise<Response | null> {
  let wait = 400;
  for (let attempt = 0; attempt < 4; attempt++) {
    const response = await fetch(url, { headers, cache: "no-store" });
    if (response.status !== 429) return response.ok ? response : null;
    await new Promise((resolve) => setTimeout(resolve, wait));
    wait *= 2;
  }
  return null;
}
