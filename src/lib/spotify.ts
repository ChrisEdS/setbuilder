type SpotifyTokenResponse = {
  access_token: string;
  token_type: string;
  expires_in: number;
};

export type SpotifyTrack = {
  id: string;
  name: string;
  uri: string;
  durationMs: number;
  explicit: boolean;
  artists: string[];
  album: string;
  imageUrl: string | null;
  externalUrl: string;
  /** 0–100 from the Spotify catalog. Not an audio feature. */
  popularity?: number | null;
  isrc?: string | null;
  /** Filled from Tidal when Spotify audio-features are blocked. */
  catalogBpm?: string;
  catalogKey?: string;
  /** 0–1 from the Tidal catalog. */
  catalogPopularity?: number | null;
};

let cachedToken: { value: string; expiresAt: number } | null = null;

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing ${name}. Add it to .env.local`);
  }
  return value;
}

export async function getSpotifyAccessToken(): Promise<string> {
  const now = Date.now();
  if (cachedToken && cachedToken.expiresAt > now + 30_000) {
    return cachedToken.value;
  }

  const clientId = requireEnv("SPOTIFY_CLIENT_ID");
  const clientSecret = requireEnv("SPOTIFY_CLIENT_SECRET");
  const credentials = Buffer.from(`${clientId}:${clientSecret}`).toString(
    "base64",
  );

  const response = await fetch("https://accounts.spotify.com/api/token", {
    method: "POST",
    headers: {
      Authorization: `Basic ${credentials}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: "grant_type=client_credentials",
    cache: "no-store",
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Spotify token failed (${response.status}): ${body}`);
  }

  const data = (await response.json()) as SpotifyTokenResponse;
  cachedToken = {
    value: data.access_token,
    expiresAt: now + data.expires_in * 1000,
  };
  return data.access_token;
}

type SpotifySearchTrack = {
  id: string;
  name: string;
  uri: string;
  duration_ms: number;
  explicit: boolean;
  artists: { name: string }[];
  album: {
    name: string;
    images?: { url: string }[];
  };
  external_urls?: { spotify?: string };
};

function mapApiTrack(track: SpotifySearchTrack): SpotifyTrack {
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

export async function fetchTrackById(
  id: string,
  market = "DE",
): Promise<SpotifyTrack> {
  const token = await getSpotifyAccessToken();
  const response = await fetch(
    `https://api.spotify.com/v1/tracks/${id}?market=${encodeURIComponent(market)}`,
    {
      headers: { Authorization: `Bearer ${token}` },
      cache: "no-store",
    },
  );
  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Track laden fehlgeschlagen (${response.status}): ${body}`);
  }
  const track = (await response.json()) as SpotifySearchTrack;
  return mapApiTrack(track);
}

export async function fetchAlbumTracks(
  albumId: string,
  market = "DE",
): Promise<{ albumName: string; tracks: SpotifyTrack[] }> {
  const token = await getSpotifyAccessToken();
  const metaRes = await fetch(
    `https://api.spotify.com/v1/albums/${albumId}?market=${encodeURIComponent(market)}`,
    {
      headers: { Authorization: `Bearer ${token}` },
      cache: "no-store",
    },
  );
  if (!metaRes.ok) {
    const body = await metaRes.text();
    throw new Error(`Album laden fehlgeschlagen (${metaRes.status}): ${body}`);
  }
  const meta = (await metaRes.json()) as {
    name?: string;
    images?: { url: string }[];
    tracks?: { items?: SpotifySearchTrack[]; next?: string | null };
  };
  const albumRef = {
    name: meta.name || "Album",
    images: meta.images,
  };

  const tracks: SpotifyTrack[] = [];
  for (const item of meta.tracks?.items ?? []) {
    if (item?.id) {
      tracks.push(mapApiTrack({ ...item, album: albumRef }));
    }
  }

  let next = meta.tracks?.next ?? null;
  while (next) {
    const pageRes = await fetch(next, {
      headers: { Authorization: `Bearer ${token}` },
      cache: "no-store",
    });
    if (!pageRes.ok) break;
    const page = (await pageRes.json()) as {
      items?: SpotifySearchTrack[];
      next?: string | null;
    };
    for (const item of page.items ?? []) {
      if (item?.id) {
        tracks.push(mapApiTrack({ ...item, album: albumRef }));
      }
    }
    next = page.next ?? null;
  }

  return { albumName: meta.name || "Album", tracks };
}

export async function searchTracks(
  query: string,
  market = "DE",
): Promise<SpotifyTrack[]> {
  const token = await getSpotifyAccessToken();
  const params = new URLSearchParams({
    q: query,
    type: "track",
    limit: "10",
    market,
  });

  const response = await fetch(
    `https://api.spotify.com/v1/search?${params.toString()}`,
    {
      headers: { Authorization: `Bearer ${token}` },
      cache: "no-store",
    },
  );

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Spotify search failed (${response.status}): ${body}`);
  }

  const data = (await response.json()) as {
    tracks?: { items?: SpotifySearchTrack[] };
  };

  return (data.tracks?.items ?? []).map(mapApiTrack);
}
