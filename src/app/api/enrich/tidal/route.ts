import { NextResponse } from "next/server";
import { errorText } from "@/lib/i18n/error";
import { requestT } from "@/lib/i18n/server";
import { getSpotifyAccessToken } from "@/lib/spotify";
import { getUserAccessToken } from "@/lib/spotify-auth";
import {
  lookupTidalByIsrcs,
  searchTidalTrack,
  tidalConfigured,
  type TidalKeyHit,
} from "@/lib/tidal";

type IncomingTrack = {
  id: string;
  name: string;
  artists: string[];
};

type Enrichment = {
  spotifyId: string;
  keyCamelot: string;
  bpm: string;
  keyRaw: string;
  tidalId: string;
  match: "isrc" | "search";
  title: string;
};

async function getSpotifyToken(): Promise<string | null> {
  const user = await getUserAccessToken();
  if (user) return user;
  try {
    return await getSpotifyAccessToken();
  } catch {
    return null;
  }
}

async function fetchSpotifyIsrcs(
  ids: string[],
  token: string,
): Promise<Map<string, string>> {
  const out = new Map<string, string>();
  for (let i = 0; i < ids.length; i += 50) {
    const chunk = ids.slice(i, i + 50);
    const response = await fetch(
      `https://api.spotify.com/v1/tracks?ids=${chunk.join(",")}`,
      {
        headers: { Authorization: `Bearer ${token}` },
        cache: "no-store",
      },
    );
    if (!response.ok) continue;
    const data = (await response.json()) as {
      tracks?: Array<{
        id?: string;
        external_ids?: { isrc?: string };
      } | null>;
    };
    for (const track of data.tracks ?? []) {
      if (track?.id && track.external_ids?.isrc) {
        out.set(track.id, track.external_ids.isrc.toUpperCase());
      }
    }
  }
  return out;
}

export async function POST(request: Request) {
  const t = requestT(request);
  if (!tidalConfigured()) {
    return NextResponse.json({
      available: false,
      reason: "TIDAL_NOT_CONFIGURED",
      message: t("api.enrich.notConfigured"),
      enrichments: [] as Enrichment[],
      matched: 0,
      checked: 0,
    });
  }

  const body = (await request.json()) as { tracks?: IncomingTrack[] };
  const tracks = (body.tracks ?? [])
    .filter((track) => track?.id && track?.name)
    .slice(0, 40);

  if (!tracks.length) {
    return NextResponse.json(
      { error: "tracks required", available: false, enrichments: [] },
      { status: 400 },
    );
  }

  try {
    const spotifyToken = await getSpotifyToken();
    const isrcBySpotify = spotifyToken
      ? await fetchSpotifyIsrcs(
          tracks.map((track) => track.id),
          spotifyToken,
        )
      : new Map<string, string>();

    const isrcs = [...isrcBySpotify.values()];
    const byIsrc = isrcs.length
      ? await lookupTidalByIsrcs(isrcs)
      : new Map<string, TidalKeyHit>();

    const enrichments: Enrichment[] = [];
    let searchFallback = 0;

    for (const track of tracks) {
      const isrc = isrcBySpotify.get(track.id);
      let hit: TidalKeyHit | null | undefined = isrc
        ? byIsrc.get(isrc.toUpperCase())
        : undefined;

      if (!hit) {
        hit = await searchTidalTrack(
          track.artists?.[0] ?? "",
          track.name,
        );
        if (hit) searchFallback += 1;
      }

      if (!hit?.keyCamelot && !hit?.bpm) continue;

      enrichments.push({
        spotifyId: track.id,
        keyCamelot: hit.keyCamelot ?? "",
        bpm: hit.bpm,
        keyRaw: hit.keyRaw,
        tidalId: hit.tidalId,
        match: hit.match,
        title: hit.title,
      });
    }

    return NextResponse.json({
      available: true,
      reason: "OK",
      matched: enrichments.length,
      checked: tracks.length,
      isrcHits: [...byIsrc.keys()].length,
      searchFallback,
      message:
        enrichments.length > 0
          ? t(searchFallback ? "api.enrich.matchedSearch" : "api.enrich.matchedIsrc", {
              matched: enrichments.length,
              checked: tracks.length,
              search: searchFallback,
            })
          : t("api.enrich.noKeys"),
      enrichments,
    });
  } catch (error) {
    return NextResponse.json({
      available: false,
      reason: "TIDAL_ERROR",
      message: errorText(error, t, "api.enrich.failed"),
      enrichments: [] as Enrichment[],
      matched: 0,
      checked: tracks.length,
    });
  }
}

export async function GET(request: Request) {
  const t = requestT(request);
  return NextResponse.json({
    configured: tidalConfigured(),
    message: tidalConfigured()
      ? t("api.enrich.credentialsSet")
      : t("api.enrich.credentialsMissing"),
  });
}
