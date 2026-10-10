import type { SpotifyTrack } from "@/lib/spotify";
import { getUserAccessToken } from "@/lib/spotify-auth";

export type SpotifyPlaylist = {
  id: string;
  name: string;
  description: string;
  owner: string;
  imageUrl: string | null;
  trackCount: number;
  externalUrl: string;
  tracks: SpotifyTrack[];
};

export function parsePlaylistId(input: string): string | null {
  const trimmed = input.trim();
  if (!trimmed) return null;

  if (/^[a-zA-Z0-9]{22}$/.test(trimmed)) return trimmed;

  const uri = trimmed.match(/^spotify:playlist:([a-zA-Z0-9]{22})$/);
  if (uri) return uri[1];

  try {
    const url = new URL(trimmed);
    const host = url.hostname.replace(/^www\./, "");
    if (host === "open.spotify.com" || host === "spotify.link") {
      const parts = url.pathname.split("/").filter(Boolean);
      const idx = parts.indexOf("playlist");
      if (idx >= 0 && parts[idx + 1]) {
        return parts[idx + 1].slice(0, 22);
      }
    }
  } catch {
    // not a URL
  }

  return null;
}

type PlaylistTrackItem = {
  track: {
    id: string | null;
    name: string;
    uri: string;
    duration_ms: number;
    explicit: boolean;
    artists: { name: string }[];
    album: { name: string; images?: { url: string }[] };
    external_urls?: { spotify?: string };
    type?: string;
  } | null;
};

function mapTrack(track: NonNullable<PlaylistTrackItem["track"]>): SpotifyTrack | null {
  if (!track?.id || track.type === "episode") return null;
  return {
    id: track.id,
    name: track.name,
    uri: track.uri,
    durationMs: track.duration_ms,
    explicit: track.explicit,
    artists: track.artists.map((artist) => artist.name),
    album: track.album.name,
    imageUrl: track.album.images?.[0]?.url ?? null,
    externalUrl:
      track.external_urls?.spotify ??
      `https://open.spotify.com/track/${track.id}`,
  };
}

export async function fetchPlaylist(playlistId: string): Promise<SpotifyPlaylist> {
  const token = await getUserAccessToken();
  if (!token) {
    throw new Error("SPOTIFY_AUTH_REQUIRED");
  }

  const metaRes = await fetch(
    `https://api.spotify.com/v1/playlists/${playlistId}?market=DE`,
    {
      headers: { Authorization: `Bearer ${token}` },
      cache: "no-store",
    },
  );

  if (!metaRes.ok) {
    const body = await metaRes.text();
    throw new Error(`Playlist laden fehlgeschlagen (${metaRes.status}): ${body}`);
  }

  const meta = (await metaRes.json()) as {
    id: string;
    name: string;
    description?: string;
    owner?: { display_name?: string };
    images?: { url: string }[];
    external_urls?: { spotify?: string };
    tracks?: { total?: number };
  };

  const tracks: SpotifyTrack[] = [];
  let url: string | null =
    `https://api.spotify.com/v1/playlists/${playlistId}/tracks?limit=50&market=DE`;

  while (url) {
    const pageRes: Response = await fetch(url, {
      headers: { Authorization: `Bearer ${token}` },
      cache: "no-store",
    });
    if (!pageRes.ok) {
      const body = await pageRes.text();
      throw new Error(`Playlist-Tracks fehlgeschlagen (${pageRes.status}): ${body}`);
    }
    const page = (await pageRes.json()) as {
      items?: PlaylistTrackItem[];
      next?: string | null;
    };
    for (const item of page.items ?? []) {
      if (!item.track) continue;
      const mapped = mapTrack(item.track);
      if (mapped) tracks.push(mapped);
    }
    url = page.next ?? null;
  }

  // Deduplicate while keeping first occurrence order
  const seen = new Set<string>();
  const unique = tracks.filter((track) => {
    if (seen.has(track.id)) return false;
    seen.add(track.id);
    return true;
  });

  return {
    id: meta.id,
    name: meta.name,
    description: meta.description || "",
    owner: meta.owner?.display_name || "Spotify",
    imageUrl: meta.images?.[0]?.url ?? null,
    trackCount: meta.tracks?.total ?? unique.length,
    externalUrl:
      meta.external_urls?.spotify ??
      `https://open.spotify.com/playlist/${meta.id}`,
    tracks: unique,
  };
}
