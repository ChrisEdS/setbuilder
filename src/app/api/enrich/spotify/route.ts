import { NextResponse } from "next/server";
import { getSpotifyAccessToken } from "@/lib/spotify";
import { getUserAccessToken } from "@/lib/spotify-auth";

/**
 * Spotify Audio Features are blocked for Development Mode apps (403 since Nov 2024 / Feb 2026).
 * This route probes and returns a clear status so the UI can fall back to rekordbox/CSV.
 */
export async function POST(request: Request) {
  const body = (await request.json()) as { trackIds?: string[] };
  const trackIds = (body.trackIds ?? []).filter(Boolean).slice(0, 20);

  if (!trackIds.length) {
    return NextResponse.json(
      { error: "trackIds required", available: false },
      { status: 400 },
    );
  }

  const userToken = await getUserAccessToken();
  let token = userToken;
  if (!token) {
    try {
      token = await getSpotifyAccessToken();
    } catch {
      token = null;
    }
  }

  if (!token) {
    return NextResponse.json({
      available: false,
      reason: "AUTH_REQUIRED",
      message: "Spotify-Login nötig — Audio Features sind ohnehin in Dev Mode gesperrt.",
      features: [],
    });
  }

  const probed = trackIds[0];
  const response = await fetch(
    `https://api.spotify.com/v1/audio-features/${probed}`,
    {
      headers: { Authorization: `Bearer ${token}` },
      cache: "no-store",
    },
  );

  if (response.status === 403 || response.status === 404) {
    return NextResponse.json({
      available: false,
      reason: "SPOTIFY_BLOCKED",
      message:
        "Spotify Audio Features (Key/BPM) sind für Development Mode Apps gesperrt. Nutze rekordbox XML/DB oder Mixed In Key CSV.",
      features: [],
    });
  }

  if (!response.ok) {
    return NextResponse.json({
      available: false,
      reason: "SPOTIFY_ERROR",
      message: `Spotify Features fehlgeschlagen (${response.status})`,
      features: [],
    });
  }

  // Extended quota rare path — map tempo only (key as pitch class needs Camelot convert)
  const feature = (await response.json()) as {
    id?: string;
    tempo?: number;
    key?: number;
    mode?: number;
  };

  return NextResponse.json({
    available: true,
    reason: "OK",
    message: "Spotify Audio Features verfügbar.",
    features: [feature],
  });
}
