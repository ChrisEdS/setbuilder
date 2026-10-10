import type { SpotifyTrack } from "@/lib/spotify";
import { getUserAccessToken } from "@/lib/spotify-auth";

export type SpotifyPlaylist = {
  id: string;
  name: string;
  description: string;
  owner: string;
  ownerId: string;
  imageUrl: string | null;
  trackCount: number;
  externalUrl: string;
  tracks: SpotifyTrack[];
};

export type PlaylistSummary = {
  id: string;
  name: string;
  owner: string;
  ownerId: string;
  imageUrl: string | null;
  trackCount: number;
  collaborative: boolean;
  public: boolean | null;
  externalUrl: string;
  owned: boolean;
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

type PlaylistItemRow = {
  item?: RawTrack | null;
  track?: RawTrack | null;
};

type RawTrack = {
  id: string | null;
  name: string;
  uri: string;
  duration_ms: number;
  explicit: boolean;
  popularity?: number;
  external_ids?: { isrc?: string };
  artists: { name: string }[];
  album: { name: string; images?: { url: string }[] };
  external_urls?: { spotify?: string };
  type?: string;
};

function mapTrack(track: RawTrack | null | undefined): SpotifyTrack | null {
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
    popularity:
      typeof track.popularity === "number" ? track.popularity : null,
    isrc: track.external_ids?.isrc?.toUpperCase() ?? null,
  };
}

async function requireUserToken(): Promise<string> {
  const token = await getUserAccessToken();
  if (!token) throw new Error("SPOTIFY_AUTH_REQUIRED");
  return token;
}

export async function fetchCurrentUserId(): Promise<string> {
  const token = await requireUserToken();
  const response = await fetch("https://api.spotify.com/v1/me", {
    headers: { Authorization: `Bearer ${token}` },
    cache: "no-store",
  });
  if (!response.ok) {
    throw new Error(`Spotify /me failed (${response.status})`);
  }
  const me = (await response.json()) as { id: string };
  return me.id;
}

export async function listMyPlaylists(): Promise<PlaylistSummary[]> {
  const token = await requireUserToken();
  const userId = await fetchCurrentUserId();
  const playlists: PlaylistSummary[] = [];
  let url: string | null = "https://api.spotify.com/v1/me/playlists?limit=50";

  while (url) {
    const response: Response = await fetch(url, {
      headers: { Authorization: `Bearer ${token}` },
      cache: "no-store",
    });
    if (!response.ok) {
      throw new Error(
        `Eigene Playlists laden fehlgeschlagen (${response.status}): ${await response.text()}`,
      );
    }
    const page = (await response.json()) as {
      items?: Array<{
        id: string;
        name: string;
        collaborative?: boolean;
        public?: boolean | null;
        owner?: { id?: string; display_name?: string };
        images?: { url: string }[];
        external_urls?: { spotify?: string };
        items?: { total?: number };
        tracks?: { total?: number };
      } | null>;
      next?: string | null;
    };

    for (const playlist of page.items ?? []) {
      if (!playlist) continue;
      const ownerId = playlist.owner?.id || "";
      playlists.push({
        id: playlist.id,
        name: playlist.name,
        owner: playlist.owner?.display_name || ownerId || "Spotify",
        ownerId,
        imageUrl: playlist.images?.[0]?.url ?? null,
        trackCount: playlist.items?.total ?? playlist.tracks?.total ?? 0,
        collaborative: Boolean(playlist.collaborative),
        public: playlist.public ?? null,
        externalUrl:
          playlist.external_urls?.spotify ??
          `https://open.spotify.com/playlist/${playlist.id}`,
        owned: ownerId === userId || Boolean(playlist.collaborative),
      });
    }
    url = page.next ?? null;
  }

  // Prefer owned/collaborative first for the picker
  return playlists.sort((a, b) => Number(b.owned) - Number(a.owned));
}

export async function fetchPlaylist(playlistId: string): Promise<SpotifyPlaylist> {
  const token = await requireUserToken();
  const userId = await fetchCurrentUserId();

  const metaRes = await fetch(
    `https://api.spotify.com/v1/playlists/${playlistId}?market=DE`,
    {
      headers: { Authorization: `Bearer ${token}` },
      cache: "no-store",
    },
  );

  if (!metaRes.ok) {
    const body = await metaRes.text();
    if (metaRes.status === 403 || metaRes.status === 404) {
      throw new Error(
        "PLAYLIST_FORBIDDEN: In Development Mode sind Tracklisten nur für Playlists lesbar, die du besitzt oder als Collaborator hast — nicht für fremde/editorial Playlists.",
      );
    }
    throw new Error(`Playlist laden fehlgeschlagen (${metaRes.status}): ${body}`);
  }

  const meta = (await metaRes.json()) as {
    id: string;
    name: string;
    description?: string;
    owner?: { id?: string; display_name?: string };
    images?: { url: string }[];
    external_urls?: { spotify?: string };
    collaborative?: boolean;
    items?: { total?: number; items?: PlaylistItemRow[] };
    tracks?: { total?: number };
  };

  const ownerId = meta.owner?.id || "";
  const canReadItems =
    ownerId === userId || Boolean(meta.collaborative);

  if (!canReadItems) {
    throw new Error(
      "PLAYLIST_FORBIDDEN: Diese Playlist gehört dir nicht. Wähle eine eigene Playlist aus der Liste oder mach sie collaborative.",
    );
  }

  const tracks: SpotifyTrack[] = [];
  let url: string | null =
    `https://api.spotify.com/v1/playlists/${playlistId}/items?limit=50&market=DE`;

  while (url) {
    const pageRes: Response = await fetch(url, {
      headers: { Authorization: `Bearer ${token}` },
      cache: "no-store",
    });
    if (!pageRes.ok) {
      const body = await pageRes.text();
      if (pageRes.status === 403 || pageRes.status === 404) {
        throw new Error(
          "PLAYLIST_FORBIDDEN: Trackliste nicht lesbar. Nur eigene oder collaborative Playlists funktionieren in Dev Mode.",
        );
      }
      throw new Error(`Playlist-Tracks fehlgeschlagen (${pageRes.status}): ${body}`);
    }
    const page = (await pageRes.json()) as {
      items?: PlaylistItemRow[];
      next?: string | null;
    };
    for (const row of page.items ?? []) {
      const mapped = mapTrack(row.item ?? row.track);
      if (mapped) tracks.push(mapped);
    }
    url = page.next ?? null;
  }

  const seen = new Set<string>();
  const unique = tracks.filter((track) => {
    if (seen.has(track.id)) return false;
    seen.add(track.id);
    return true;
  });
  const withIsrc = await hydrateIsrcs(unique, token);

  return {
    id: meta.id,
    name: meta.name,
    description: meta.description || "",
    owner: meta.owner?.display_name || "Spotify",
    ownerId,
    imageUrl: meta.images?.[0]?.url ?? null,
    trackCount: meta.items?.total ?? meta.tracks?.total ?? unique.length,
    externalUrl:
      meta.external_urls?.spotify ??
      `https://open.spotify.com/playlist/${meta.id}`,
    tracks: withIsrc,
  };
}

/** Playlist items often omit ISRC. The tracks endpoint has it. */
async function hydrateIsrcs(
  tracks: SpotifyTrack[],
  token: string,
): Promise<SpotifyTrack[]> {
  const byId = new Map(tracks.map((track) => [track.id, track]));
  for (let i = 0; i < tracks.length; i += 50) {
    const chunk = tracks.slice(i, i + 50).map((track) => track.id);
    const response = await fetch(
      `https://api.spotify.com/v1/tracks?ids=${chunk.join(",")}&market=DE`,
      {
        headers: { Authorization: `Bearer ${token}` },
        cache: "no-store",
      },
    );
    if (!response.ok) continue;
    const data = (await response.json()) as {
      tracks?: Array<{
        id?: string;
        popularity?: number;
        external_ids?: { isrc?: string };
      } | null>;
    };
    for (const row of data.tracks ?? []) {
      if (!row?.id) continue;
      const current = byId.get(row.id);
      if (!current) continue;
      byId.set(row.id, {
        ...current,
        popularity:
          typeof row.popularity === "number"
            ? row.popularity
            : current.popularity,
        isrc: row.external_ids?.isrc?.toUpperCase() ?? current.isrc ?? null,
      });
    }
  }
  return tracks.map((track) => byId.get(track.id) ?? track);
}
