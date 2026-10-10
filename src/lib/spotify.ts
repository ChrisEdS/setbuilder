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

  return (data.tracks?.items ?? []).map((track) => ({
    id: track.id,
    name: track.name,
    uri: track.uri,
    durationMs: track.duration_ms,
    explicit: track.explicit,
    artists: track.artists.map((artist) => artist.name),
    album: track.album.name,
    imageUrl: track.album.images?.[0]?.url ?? null,
    externalUrl: track.external_urls?.spotify ?? `https://open.spotify.com/track/${track.id}`,
  }));
}
