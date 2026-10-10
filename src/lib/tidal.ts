import { parseKeyValue } from "@/lib/key-import";
import type { CamelotCode } from "@/lib/harmonic";
import type { SpotifyTrack } from "@/lib/spotify";

type TidalTokenResponse = {
  access_token: string;
  token_type: string;
  expires_in: number;
};

export type TidalKeyHit = {
  tidalId: string;
  title: string;
  artist: string;
  keyRaw: string;
  keyCamelot: CamelotCode | null;
  bpm: string;
  isrc?: string;
  /** Tidal catalog popularity, 0–1 when the API sends it. */
  popularity?: number | null;
  match: "isrc" | "search";
};

type TidalTrackAttributes = {
  title?: string;
  isrc?: string;
  bpm?: number | null;
  key?: string;
  keyScale?: string;
  popularity?: number | null;
};

type TidalResource = {
  id: string;
  type: string;
  attributes?: TidalTrackAttributes;
  relationships?: {
    artists?: {
      data?: Array<{ id: string; type: string }>;
    };
  };
};

type TidalArtistResource = {
  id: string;
  type: string;
  attributes?: { name?: string };
};

let cachedToken: { value: string; expiresAt: number } | null = null;

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing ${name}. Add it to .env.local`);
  }
  return value;
}

export function tidalConfigured(): boolean {
  return Boolean(
    process.env.TIDAL_CLIENT_ID && process.env.TIDAL_CLIENT_SECRET,
  );
}

export async function getTidalAccessToken(): Promise<string> {
  const now = Date.now();
  if (cachedToken && cachedToken.expiresAt > now + 30_000) {
    return cachedToken.value;
  }

  const clientId = requireEnv("TIDAL_CLIENT_ID");
  const clientSecret = requireEnv("TIDAL_CLIENT_SECRET");
  const credentials = Buffer.from(`${clientId}:${clientSecret}`).toString(
    "base64",
  );

  const response = await fetch("https://auth.tidal.com/v1/oauth2/token", {
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
    throw new Error(`Tidal token failed (${response.status}): ${body}`);
  }

  const data = (await response.json()) as TidalTokenResponse;
  cachedToken = {
    value: data.access_token,
    expiresAt: now + data.expires_in * 1000,
  };
  return cachedToken.value;
}

/** Map Tidal key + keyScale enums → Camelot */
export function tidalKeyToCamelot(
  key?: string | null,
  keyScale?: string | null,
): { raw: string; camelot: CamelotCode | null } {
  if (!key || key === "UNKNOWN") {
    return { raw: "", camelot: null };
  }

  const note = key
    .replace("Sharp", "#")
    .replace("CSharp", "C#")
    .replace("FSharp", "F#");

  const scale = (keyScale || "UNKNOWN").toUpperCase();
  const isMinor =
    scale === "MINOR" ||
    scale === "AEOLIAN" ||
    scale === "HARMONIC_MINOR" ||
    scale === "MELODIC_MINOR" ||
    scale === "PENTATONIC_MINOR" ||
    scale === "DORIAN" ||
    scale === "PHRYGIAN" ||
    scale === "LOCRIAN";

  // UNKNOWN scale → try major first via parseKeyValue(note)
  if (scale === "UNKNOWN") {
    return { raw: note, camelot: parseKeyValue(note) };
  }

  const musical = isMinor ? `${note}m` : note;
  return { raw: musical, camelot: parseKeyValue(musical) };
}

function artistNamesFromIncluded(
  track: TidalResource,
  included: TidalArtistResource[],
): string {
  const ids = new Set(
    (track.relationships?.artists?.data ?? []).map((item) => item.id),
  );
  const names = included
    .filter((item) => item.type === "artists" && ids.has(item.id))
    .map((item) => item.attributes?.name)
    .filter(Boolean) as string[];
  return names.join(", ");
}

function toHit(
  track: TidalResource,
  included: TidalArtistResource[],
  match: "isrc" | "search",
): TidalKeyHit | null {
  const attrs = track.attributes;
  if (!attrs?.title) return null;
  const mapped = tidalKeyToCamelot(attrs.key, attrs.keyScale);
  const bpm =
    attrs.bpm != null && Number.isFinite(attrs.bpm)
      ? String(Math.round(attrs.bpm))
      : "";
  const popularity =
    typeof attrs.popularity === "number" ? attrs.popularity : null;
  if (!mapped.camelot && !bpm && popularity == null) return null;
  return {
    tidalId: track.id,
    title: attrs.title,
    artist: artistNamesFromIncluded(track, included),
    keyRaw: mapped.raw,
    keyCamelot: mapped.camelot,
    bpm,
    isrc: attrs.isrc,
    popularity,
    match,
  };
}

async function tidalGet(path: string, token: string): Promise<Response> {
  return fetch(`https://openapi.tidal.com/v2${path}`, {
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/vnd.api+json",
      "Content-Type": "application/vnd.api+json",
    },
    cache: "no-store",
  });
}

export async function lookupTidalByIsrcs(
  isrcs: string[],
  countryCode = "DE",
): Promise<Map<string, TidalKeyHit>> {
  const token = await getTidalAccessToken();
  const unique = [...new Set(isrcs.map((item) => item.trim()).filter(Boolean))];
  const out = new Map<string, TidalKeyHit>();

  // API: multiple ISRCs → one track per ISRC
  for (let i = 0; i < unique.length; i += 20) {
    const chunk = unique.slice(i, i + 20);
    const params = new URLSearchParams({ countryCode });
    for (const isrc of chunk) params.append("filter[isrc]", isrc);
    params.append("include", "artists");

    const response = await tidalGet(`/tracks?${params.toString()}`, token);
    if (!response.ok) continue;

    const data = (await response.json()) as {
      data?: TidalResource[];
      included?: TidalArtistResource[];
    };
    const included = data.included ?? [];
    for (const track of data.data ?? []) {
      const hit = toHit(track, included, "isrc");
      if (hit?.isrc) out.set(hit.isrc.toUpperCase(), hit);
    }
  }

  return out;
}

export async function searchTidalTrack(
  artist: string,
  title: string,
  countryCode = "DE",
): Promise<TidalKeyHit | null> {
  const token = await getTidalAccessToken();
  const query = encodeURIComponent(`${artist} ${title}`.trim());
  if (!query) return null;

  const params = new URLSearchParams({
    countryCode,
    include: "tracks,artists",
  });
  const response = await tidalGet(
    `/searchResults/${query}?${params.toString()}`,
    token,
  );
  if (!response.ok) return null;

  const data = (await response.json()) as {
    included?: Array<TidalResource | TidalArtistResource>;
  };
  const included = data.included ?? [];
  const tracks = included.filter(
    (item): item is TidalResource => item.type === "tracks",
  );
  const artists = included.filter(
    (item): item is TidalArtistResource => item.type === "artists",
  );

  for (const track of tracks.slice(0, 5)) {
    const hit = toHit(track, artists, "search");
    if (hit) return hit;
  }
  return null;
}

/** Match Spotify tracks to the Tidal catalog via ISRC. */
export async function attachTidalCatalog(
  tracks: SpotifyTrack[],
): Promise<{ tracks: SpotifyTrack[]; matched: number; keyed: number }> {
  if (!tidalConfigured()) return { tracks, matched: 0, keyed: 0 };
  const isrcs = tracks
    .map((track) => track.isrc)
    .filter((isrc): isrc is string => Boolean(isrc));
  if (!isrcs.length) return { tracks, matched: 0, keyed: 0 };

  const byIsrc = await lookupTidalByIsrcs(isrcs);
  let matched = 0;
  let keyed = 0;
  const next = tracks.map((track) => {
    const hit = track.isrc ? byIsrc.get(track.isrc.toUpperCase()) : undefined;
    if (!hit) return track;
    matched += 1;
    if (hit.keyCamelot || hit.bpm) keyed += 1;
    return {
      ...track,
      catalogBpm: hit.bpm || track.catalogBpm,
      catalogKey: hit.keyCamelot || track.catalogKey,
      catalogPopularity: hit.popularity ?? track.catalogPopularity ?? null,
    };
  });
  return { tracks: next, matched, keyed };
}
